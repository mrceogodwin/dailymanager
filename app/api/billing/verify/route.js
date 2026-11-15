import { NextResponse } from "next/server";
import { pool } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/session";
import { getWorkspaceForUser } from "../../../../lib/workspace-context";
import { isSameOriginMutation } from "../../../../lib/request-security";
import { paystackRequest } from "../../../../lib/paystack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const reference = typeof body?.reference === "string" ? body.reference.trim() : "";
  if (!/^dm_[0-9]{10,}_([a-f0-9]{24})$/.test(reference)) return NextResponse.json({ error: "Invalid payment reference." }, { status: 400 });
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (String(workspace.owner_user_id) !== String(user.id)) return NextResponse.json({ error: "Only the workspace owner can verify billing." }, { status: 403 });

  const client = await pool.connect();
  try {
    const payment = await client.query(
      "SELECT id, workspace_id, amount_minor, currency, status, plan_code FROM billing_payments WHERE provider_reference = $1 AND workspace_id = $2 LIMIT 1",
      [reference, workspace.id]
    );
    if (!payment.rowCount) return NextResponse.json({ error: "Payment reference not found for this workspace." }, { status: 404 });
    if (payment.rows[0].status === "success") return NextResponse.json({ ok: true, status: "success" });

    const verified = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (verified.reference !== reference || verified.status !== "success" ||
        Number(verified.amount) !== Number(payment.rows[0].amount_minor) ||
        String(verified.currency).toUpperCase() !== String(payment.rows[0].currency).toUpperCase()) {
      await client.query(
        "UPDATE billing_payments SET status = CASE WHEN $2 = 'success' THEN status ELSE 'failed' END, raw_response = $3::jsonb, updated_at = NOW() WHERE id = $1",
        [payment.rows[0].id, verified.status, JSON.stringify({ status: verified.status, gateway_response: verified.gateway_response || null })]
      );
      return NextResponse.json({ error: "Paystack could not confirm this payment." }, { status: 402 });
    }

    await client.query("BEGIN");
    await client.query(
      "UPDATE billing_payments SET status = 'success', provider_transaction_id = $2, paid_at = COALESCE($3, NOW()), raw_response = $4::jsonb, updated_at = NOW() WHERE id = $1",
      [payment.rows[0].id, String(verified.id), verified.paid_at || null, JSON.stringify({ channel: verified.channel || null, gateway_response: verified.gateway_response || null })]
    );
    await client.query(
      `INSERT INTO billing_customers (workspace_id, provider, provider_customer_id, provider_subscription_id, status, plan_code, amount_minor, currency, billing_interval, current_period_start, current_period_end, updated_at)
       VALUES ($1, 'paystack', $2, $3, 'active', $4, $5, 'NGN', $6, NOW(), NOW() + CASE WHEN $6 = 'annual' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END, NOW())
       ON CONFLICT (workspace_id) DO UPDATE SET provider = 'paystack', provider_customer_id = EXCLUDED.provider_customer_id,
       provider_subscription_id = COALESCE(EXCLUDED.provider_subscription_id, billing_customers.provider_subscription_id),
       status = 'active', plan_code = EXCLUDED.plan_code, amount_minor = EXCLUDED.amount_minor,
       currency = 'NGN', billing_interval = EXCLUDED.billing_interval, current_period_start = EXCLUDED.current_period_start,
       current_period_end = EXCLUDED.current_period_end, cancelled_at = NULL, cancel_at_period_end = FALSE, updated_at = NOW()`,
      [workspace.id, verified.customer?.customer_code || null, verified.subscription?.subscription_code || null, payment.rows[0].plan_code, payment.rows[0].amount_minor, verified.plan_object?.interval === "annually" ? "annual" : "monthly"]
    );
    await client.query("UPDATE workspaces SET plan = 'team', updated_at = NOW() WHERE id = $1", [workspace.id]);
    await client.query("COMMIT");
    return NextResponse.json({ ok: true, status: "success" });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("DailyManager Paystack verification failed", error);
    return NextResponse.json({ error: error.message || "Could not verify payment." }, { status: error.status || 500 });
  } finally { client.release(); }
}
