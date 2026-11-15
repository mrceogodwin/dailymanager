import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { pool, query } from "../../../../../lib/db";
import { decryptProviderPayload } from "../../../../../lib/provider-secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSignature(raw, headers, secret) {
  const v2 = headers.get("x-bachs-signature-v2");
  const timestampHeader = headers.get("x-bachs-timestamp");
  let timestamp = timestampHeader;
  let signatures = [];
  if (v2) {
    for (const part of v2.split(",")) {
      const [key, value] = part.trim().split("=", 2);
      if (key === "t") timestamp = value;
      if (key === "v1" && value) signatures.push(value);
    }
  } else {
    const legacy = headers.get("x-bachs-signature");
    if (legacy) signatures = [legacy];
  }
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300 || !signatures.length) return false;
  const expected = createHmac("sha256", secret).update(`${seconds}.${raw}`, "utf8").digest("hex");
  return signatures.some(signature => {
    const a = Buffer.from(expected, "hex"), b = Buffer.from(signature, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export async function POST(request) {
  const raw = await request.text();
  let event;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid event." }, { status: 400 }); }
  const mode = process.env.NODE_ENV === "production" ? "live" : "test";
  try {
    const configResult = await query("SELECT encrypted_payload FROM platform_payment_configs WHERE provider='bachs' AND mode=$1", [mode]);
    if (!configResult.rowCount) return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
    const config = decryptProviderPayload(configResult.rows[0].encrypted_payload);
    if (!config.webhook_secret || !validSignature(raw, request.headers, config.webhook_secret)) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }
    const eventId = typeof event.id === "string" ? event.id : "";
    const type = typeof event.type === "string" ? event.type : "unknown";
    if (!eventId) return NextResponse.json({ error: "Missing event id." }, { status: 400 });
    const data = event.data || {};
    const reference = data.metadata?.local_reference || data.reference || null;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO billing_webhook_events (provider, provider_event_id, event_type, event_reference, payload, processing_status)
         VALUES ('bachs',$1,$2,$3,$4::jsonb,'processing')
         ON CONFLICT (provider,provider_event_id) DO NOTHING RETURNING id`,
        [eventId, type, reference || data.checkout_id || null, JSON.stringify(event)]
      );
      if (!inserted.rowCount) { await client.query("COMMIT"); return NextResponse.json({ received: true, duplicate: true }); }
      if (type === "collection.succeeded") {
        const payment = await client.query("SELECT id,workspace_id,amount_minor,currency,plan_code FROM billing_payments WHERE provider='bachs' AND provider_reference=$1 FOR UPDATE", [reference]);
        if (!payment.rowCount) throw new Error("Payment record is not ready; webhook retry required.");
        const amountMinor = Math.round(Number(data.amount) * 100);
        if (String(data.status).toUpperCase() !== "SUCCEEDED" || amountMinor !== Number(payment.rows[0].amount_minor) || String(data.currency).toUpperCase() !== "USD") {
          throw new Error("Bachs webhook payment amount, status, or currency did not match the stored checkout.");
        }
        await client.query("UPDATE billing_payments SET status='success',provider_transaction_id=$2,paid_at=NOW(),raw_response=$3::jsonb,updated_at=NOW() WHERE id=$1",
          [payment.rows[0].id, String(data.charge_id || data.checkout_id || eventId), JSON.stringify({ event_id: eventId, checkout_id: data.checkout_id || null })]);
        const interval = payment.rows[0].plan_code === "annual" ? "annual" : "monthly";
        await client.query(
          `INSERT INTO billing_customers (workspace_id,provider,provider_customer_id,provider_subscription_id,status,plan_code,amount_minor,currency,billing_interval,current_period_start,current_period_end,updated_at)
           VALUES ($1,'bachs',$2,$3,'active',$4,$5,'USD',$6,NOW(),NOW()+CASE WHEN $6='annual' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END,NOW())
           ON CONFLICT (workspace_id) DO UPDATE SET provider='bachs',provider_customer_id=EXCLUDED.provider_customer_id,provider_subscription_id=COALESCE(EXCLUDED.provider_subscription_id,billing_customers.provider_subscription_id),status='active',plan_code=EXCLUDED.plan_code,amount_minor=EXCLUDED.amount_minor,currency='USD',billing_interval=EXCLUDED.billing_interval,current_period_start=EXCLUDED.current_period_start,current_period_end=EXCLUDED.current_period_end,cancelled_at=NULL,cancel_at_period_end=FALSE,updated_at=NOW()`,
          [payment.rows[0].workspace_id, data.customer?.id || null, data.subscription?.id || null, payment.rows[0].plan_code, payment.rows[0].amount_minor, interval]
        );
        await client.query("UPDATE workspaces SET plan='team',updated_at=NOW() WHERE id=$1", [payment.rows[0].workspace_id]);
      }
      await client.query("UPDATE billing_webhook_events SET processing_status='processed',processed_at=NOW() WHERE id=$1", [inserted.rows[0].id]);
      await client.query("COMMIT");
      return NextResponse.json({ received: true });
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      console.error("DailyManager Bachs webhook processing failed", error);
      return NextResponse.json({ error: "Webhook processing failed; retry delivery." }, { status: 500 });
    } finally { client.release(); }
  } catch (error) {
    console.error("DailyManager Bachs webhook configuration failed", error);
    return NextResponse.json({ error: error.message || "Webhook unavailable." }, { status: error.status || 503 });
  }
}
