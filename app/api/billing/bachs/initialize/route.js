import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { pool, query } from "../../../../../lib/db";
import { getSessionUser } from "../../../../../lib/session";
import { getWorkspaceForUser } from "../../../../../lib/workspace-context";
import { isSameOriginMutation } from "../../../../../lib/request-security";
import { decryptProviderPayload } from "../../../../../lib/provider-secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getConfig(mode) {
  const result = await query("SELECT encrypted_payload FROM platform_payment_configs WHERE provider = 'bachs' AND mode = $1", [mode]);
  if (!result.rowCount) throw Object.assign(new Error("Bachs is not configured for this environment yet."), { status: 503 });
  return decryptProviderPayload(result.rows[0].encrypted_payload);
}

export async function POST(request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const interval = body?.interval === "annual" ? "annual" : body?.interval === "monthly" ? "monthly" : null;
  const mode = process.env.NODE_ENV === "production" ? "live" : "test";
  const client = await pool.connect();
  try {
    const workspace = await getWorkspaceForUser(user.id);
    if (!workspace) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (String(workspace.owner_user_id) !== String(user.id)) return NextResponse.json({ error: "Only the workspace owner can manage billing." }, { status: 403 });
    if (!interval) return NextResponse.json({ error: "Choose a valid billing interval." }, { status: 400 });
    const config = await getConfig(mode);
    if (!config.secret_key || !config[interval === "annual" ? "annual_product_id" : "monthly_product_id"]) {
      return NextResponse.json({ error: "Bachs product configuration is incomplete." }, { status: 503 });
    }
    if ((config.currency || "USD").toUpperCase() !== "USD") {
      return NextResponse.json({ error: "Bachs recurring subscriptions currently require USD unless NGN recurring billing is enabled on your Bachs account." }, { status: 400 });
    }
    const reference = `dm_bachs_${Date.now()}_${randomBytes(10).toString("hex")}`;
    const baseUrl = mode === "live" ? "https://api.bachs.io" : "https://sandbox-api.bachs.io";
    const response = await fetch(`${baseUrl}/v1/checkout-sessions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.secret_key}`, "Content-Type": "application/json", "Idempotency-Key": reference },
      body: JSON.stringify({
        product_cart: [{ product_id: interval === "annual" ? config.annual_product_id : config.monthly_product_id, quantity: 1 }],
        customer: { email: user.email, name: user.name || user.email },
        billing_currency: "USD",
        reference,
        success_url: new URL("/billing/return?provider=bachs", request.url).toString(),
        cancel_url: new URL("/billing/return?cancelled=1&provider=bachs", request.url).toString(),
        metadata: { workspace_id: String(workspace.id), user_id: String(user.id), plan_interval: interval, local_reference: reference, product: "DailyManager" }
      }),
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.checkout_url || !result.checkout_id) {
      return NextResponse.json({ error: result.message || result.error || "Bachs could not create checkout." }, { status: response.status >= 400 && response.status < 500 ? 400 : 502 });
    }
    const amount = Number(config[interval === "annual" ? "annual_amount" : "monthly_amount"]);
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Set the matching plan amount in Super Admin before enabling checkout." }, { status: 503 });
    await client.query(
      `INSERT INTO billing_payments (workspace_id, provider, provider_reference, amount_minor, currency, status, plan_code, raw_response)
       VALUES ($1,'bachs',$2,$3,'USD','initialized',$4,$5::jsonb)`,
      [workspace.id, reference, Math.round(amount * 100), interval, JSON.stringify({ checkout_id: result.checkout_id })]
    );
    return NextResponse.json({ checkout_url: result.checkout_url, reference });
  } catch (error) {
    console.error("DailyManager Bachs checkout failed", error);
    return NextResponse.json({ error: error.message || "Could not start Bachs checkout." }, { status: error.status || 500 });
  } finally { client.release(); }
}
