import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Bachs } from "@bachs/sdk";
import { pool, query } from "../../../../../lib/db";
import { getSessionUser } from "../../../../../lib/session";
import { getWorkspaceForUser } from "../../../../../lib/workspace-context";
import { isSameOriginMutation } from "../../../../../lib/request-security";
import { decryptProviderPayload, getProviderMode } from "../../../../../lib/provider-secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getConfig(mode) {
  const result = await query("SELECT encrypted_payload FROM platform_payment_configs WHERE provider='bachs' AND mode=$1", [mode]);
  if (!result.rowCount) throw Object.assign(new Error("Bachs is not configured for this environment yet."), { status: 503 });
  return decryptProviderPayload(result.rows[0].encrypted_payload);
}

function toMinorUnits(value) {
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]{1,2}))?$/.exec(String(value || "").trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
}

export async function POST(request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const interval = body?.interval === "annual" ? "annual" : body?.interval === "monthly" ? "monthly" : null;
  const mode = getProviderMode();
  const client = await pool.connect();
  try {
    const workspace = await getWorkspaceForUser(user.id);
    if (!workspace) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (String(workspace.owner_user_id) !== String(user.id)) return NextResponse.json({ error: "Only the workspace owner can manage billing." }, { status: 403 });
    if (!interval) return NextResponse.json({ error: "Choose a valid billing interval." }, { status: 400 });
    const config = await getConfig(mode);
    const productId = config[interval === "annual" ? "annual_product_id" : "monthly_product_id"];
    const amountMinor = toMinorUnits(config[interval === "annual" ? "annual_amount" : "monthly_amount"]);
    if (!config.secret_key || !productId || !amountMinor) return NextResponse.json({ error: "Bachs product IDs and exact USD amounts are incomplete in Super Admin." }, { status: 503 });
    if ((config.currency || "USD").toUpperCase() !== "USD") return NextResponse.json({ error: "Bachs recurring subscriptions currently require USD unless your merchant account has NGN recurring billing enabled." }, { status: 400 });

    const reference = `dm_bachs_${Date.now()}_${randomUUID().replaceAll("-", "")}`;
    const bachs = new Bachs({ apiKey: config.secret_key });
    const checkout = await bachs.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: user.email, name: user.name || user.email },
      success_url: new URL(`/billing/return?provider=bachs&reference=${encodeURIComponent(reference)}`, request.url).toString(),
      cancel_url: new URL(`/billing/return?cancelled=1&provider=bachs&reference=${encodeURIComponent(reference)}`, request.url).toString(),
      reference,
      metadata: { workspace_id: String(workspace.id), user_id: String(user.id), plan_interval: interval, local_reference: reference, product: "DailyManager" }
    }, { idempotencyKey: reference });

    if (!checkout?.checkout_url) return NextResponse.json({ error: "Bachs did not return a valid checkout session." }, { status: 502 });
    await client.query(
      `INSERT INTO billing_payments (workspace_id,provider,provider_reference,amount_minor,currency,status,plan_code,raw_response)
       VALUES ($1,'bachs',$2,$3,'USD','initialized',$4,$5::jsonb)`,
      [workspace.id, reference, amountMinor, interval, JSON.stringify({ checkout_id: checkout.checkout_id || checkout.id || checkout.checkout_session_id || null })]
    );
    return NextResponse.json({ checkout_url: checkout.checkout_url, reference });
  } catch (error) {
    console.error("DailyManager Bachs checkout failed", error);
    return NextResponse.json({ error: error.message || "Could not start Bachs checkout." }, { status: error.statusCode || error.status || 502 });
  } finally { client.release(); }
}
