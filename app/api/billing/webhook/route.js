import { NextResponse } from "next/server";
import { pool } from "../../../../../lib/db";
import { verifyPaystackSignature } from "../../../../../lib/paystack";

export const runtime = "nodejs";

export async function POST(request) {
  const rawBody = await request.text();
  let valid = false;
  try { valid = verifyPaystackSignature(rawBody, request.headers.get("x-paystack-signature")); }
  catch (error) {
    console.error("DailyManager Paystack webhook configuration error", error.message);
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }
  if (!valid) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });

  let event;
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid event payload." }, { status: 400 }); }
  const type = typeof event?.event === "string" ? event.event : "unknown";
  const data = event?.data || {};
  const reference = typeof data.reference === "string" ? data.reference : null;
  const eventId = `${type}:${reference || data.id || "no-reference"}`;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO billing_webhook_events (provider, provider_event_id, event_type, event_reference, payload, processing_status)
       VALUES ('paystack', $1, $2, $3, $4::jsonb, 'processing')
       ON CONFLICT (provider, provider_event_id) DO NOTHING RETURNING id`,
      [eventId, type, reference, JSON.stringify(event)]
    );
    if (!inserted.rowCount) {
      await client.query("COMMIT");
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (type === "charge.success" && reference) {
      const payment = await client.query(
        "SELECT id, workspace_id, amount_minor, currency, plan_code FROM billing_payments WHERE provider_reference = $1 FOR UPDATE",
        [reference]
      );
      if (payment.rowCount && Number(data.amount) === Number(payment.rows[0].amount_minor) &&
          String(data.currency).toUpperCase() === String(payment.rows[0].currency).toUpperCase()) {
        const interval = data.plan?.interval === "annually" ? "annual" : "monthly";
        await client.query(
          "UPDATE billing_payments SET status = 'success', provider_transaction_id = $2, paid_at = COALESCE($3, NOW()), raw_response = $4::jsonb, updated_at = NOW() WHERE id = $1",
          [payment.rows[0].id, String(data.id || ""), data.paid_at || null, JSON.stringify({ webhook_event: type, channel: data.channel || null })]
        );
        await client.query(
          `INSERT INTO billing_customers (workspace_id, provider, provider_customer_id, provider_subscription_id, status, plan_code, amount_minor, currency, billing_interval, current_period_start, current_period_end, updated_at)
           VALUES ($1, 'paystack', $2, $3, 'active', $4, $5, 'NGN', $6, NOW(), NOW() + CASE WHEN $6 = 'annual' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END, NOW())
           ON CONFLICT (workspace_id) DO UPDATE SET provider = 'paystack', provider_customer_id = EXCLUDED.provider_customer_id,
           provider_subscription_id = COALESCE(EXCLUDED.provider_subscription_id, billing_customers.provider_subscription_id),
           status = 'active', plan_code = EXCLUDED.plan_code, amount_minor = EXCLUDED.amount_minor, currency = 'NGN',
           billing_interval = EXCLUDED.billing_interval, current_period_start = EXCLUDED.current_period_start,
           current_period_end = EXCLUDED.current_period_end, cancelled_at = NULL, cancel_at_period_end = FALSE, updated_at = NOW()`,
          [payment.rows[0].workspace_id, data.customer?.customer_code || null, data.subscription?.subscription_code || null, payment.rows[0].plan_code, payment.rows[0].amount_minor, interval]
        );
        await client.query("UPDATE workspaces SET plan = 'team', updated_at = NOW() WHERE id = $1", [payment.rows[0].workspace_id]);
      }
    }

    await client.query(
      "UPDATE billing_webhook_events SET processing_status = 'processed', processed_at = NOW() WHERE id = $1",
      [inserted.rows[0].id]
    );
    await client.query("COMMIT");
    return NextResponse.json({ received: true });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("DailyManager Paystack webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  } finally { client.release(); }
}
