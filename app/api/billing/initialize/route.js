import { NextResponse } from "next/server";
import { pool, query } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/session";
import { getWorkspaceForUser } from "../../../../lib/workspace-context";
import { isSameOriginMutation } from "../../../../lib/request-security";
import { newBillingReference } from "../../../../lib/paystack";
import { getProviderMode } from "../../../../lib/provider-secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const interval = body?.interval === "annual" ? "annual" : body?.interval === "monthly" ? "monthly" : null;
  if (!interval) return NextResponse.json({ error: "Choose a valid billing interval." }, { status: 400 });
  const mode = getProviderMode();
  const client = await pool.connect();
  try {
    const workspace = await getWorkspaceForUser(user.id);
    if (!workspace) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (String(workspace.owner_user_id) !== String(user.id)) return NextResponse.json({ error: "Only the workspace owner can manage billing." }, { status: 403 });
    const stored = await query("SELECT encrypted_payload FROM platform_payment_configs WHERE provider='paystack' AND mode=$1", [mode]);
    if (!stored.rowCount) return NextResponse.json({ error: "Paystack is not configured in Super Admin for this environment." }, { status: 503 });
    const config = decryptProviderPayload(stored.rows[0].encrypted_payload);
    const code = config[interval === "annual" ? "annual_plan_code" : "monthly_plan_code"];
    const amount = Number(config[interval === "annual" ? "annual_amount" : "monthly_amount"]);
    if (!config.secret_key || !code || !Number.isSafeInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "Paystack plan codes and exact amounts are incomplete in Super Admin." }, { status: 503 });
    }
    const reference = newBillingReference();
    const callbackUrl = new URL("/billing/return?provider=paystack", request.url).toString();
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.secret_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, amount, plan: code, reference, callback_url: callbackUrl,
        metadata: { workspace_id: workspace.id, user_id: user.id, plan_interval: interval, product: "DailyManager" } }),
      cache: "no-store"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.status !== true || !payload.data?.authorization_url) {
      return NextResponse.json({ error: payload.message || "Paystack could not start checkout." }, { status: response.status >= 400 && response.status < 500 ? 400 : 502 });
    }
    await client.query(
      `INSERT INTO billing_payments (workspace_id, provider, provider_reference, amount_minor, currency, status, plan_code, raw_response)
       VALUES ($1,'paystack',$2,$3,'NGN','initialized',$4,$5::jsonb)`,
      [workspace.id, reference, amount, code, JSON.stringify({ authorization_url: payload.data.authorization_url, access_code: payload.data.access_code })]
    );
    return NextResponse.json({ authorization_url: payload.data.authorization_url, reference });
  } catch (error) {
    console.error("DailyManager Paystack initialization failed", error);
    return NextResponse.json({ error: error.message || "Could not start checkout." }, { status: error.status || 500 });
  } finally { client.release(); }
}
