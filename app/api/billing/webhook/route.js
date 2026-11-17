import { NextResponse } from "next/server";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { pool, query } from "../../../../lib/db";
import { decryptProviderPayload } from "../../../../lib/provider-secrets";
import { getProviderMode } from "../../../../lib/provider-secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const rawBody = await request.text();
  let event;
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid event payload." }, { status: 400 }); }
  const mode = getProviderMode();
  let valid = false;
  let providerConfig;
  try {
    const stored = await query("SELECT encrypted_payload FROM platform_payment_configs WHERE provider='paystack' AND mode=$1", [mode]);
    if (!stored.rowCount) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
    providerConfig = decryptProviderPayload(stored.rows[0].encrypted_payload);
    const secret = providerConfig.webhook_secret || providerConfig.secret_key;
    const signature = request.headers.get("x-paystack-signature") || "";
    const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected, "hex"), b = Buffer.from(signature, "hex");
    valid = a.length === b.length && a.length > 0 && timingSafeEqual(a,b);
  } catch (error) {
    console.error("DailyManager Paystack webhook configuration error", error.message);
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }
  if (!valid) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });

  const type = typeof event?.event === "string" ? event.event : "unknown";
  const data = event?.data || {};
  const reference = typeof data.reference === "string" ? data.reference : null;
  const eventId = `${type}:${data.id || data.invoice_code || reference || createHash("sha256").update(rawBody).digest("hex")}`;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO billing_webhook_events (provider, provider_event_id, event_type, event_reference, payload, processing_status)
       VALUES ('paystack',$1,$2,$3,$4::jsonb,'processing')
       ON CONFLICT (provider,provider_event_id) DO NOTHING RETURNING id`,
      [eventId, type, reference, JSON.stringify(event)]
    );
    if (!inserted.rowCount) { await client.query("COMMIT"); return NextResponse.json({ received: true, duplicate: true }); }
    if (type === "charge.success" && reference) {
      let payment = await client.query("SELECT id,workspace_id,amount_minor,currency,plan_code FROM billing_payments WHERE provider='paystack' AND provider_reference=$1 FOR UPDATE", [reference]);
      if (!payment.rowCount) {
        // Subsequent subscription charges have new transaction references that were
        // not created by our checkout initializer. Link them only through a saved
        // Paystack customer/subscription identity and the exact saved plan/amount.
        const customerCode = data.customer?.customer_code || null;
        const subscriptionCode = data.subscription?.subscription_code || data.subscription_code || null;
        if (!customerCode && !subscriptionCode) throw new Error("Unknown Paystack charge has no saved subscription identity; retry required.");
        const saved = await client.query(
          "SELECT workspace_id,amount_minor,currency,plan_code,billing_interval FROM billing_customers WHERE provider='paystack' AND (($1::text IS NOT NULL AND provider_subscription_id=$1) OR ($2::text IS NOT NULL AND provider_customer_id=$2)) FOR UPDATE",
          [subscriptionCode, customerCode]
        );
        if (!saved.rowCount) throw new Error("Paystack renewal does not match a saved subscription; retry required.");
        const subscription = saved.rows[0];
        const eventPlanCode = typeof data.plan === "string" ? data.plan : data.plan?.plan_code || data.plan?.plan_code;
        if (!subscription.plan_code || (eventPlanCode && eventPlanCode !== subscription.plan_code)) throw new Error("Paystack renewal plan does not match the saved subscription.");
        if (Number(data.amount) !== Number(subscription.amount_minor) || String(data.currency).toUpperCase() !== String(subscription.currency).toUpperCase()) {
          throw new Error("Paystack renewal amount or currency mismatch.");
        }
        const insertedPayment = await client.query(
          `INSERT INTO billing_payments (workspace_id,provider,provider_reference,provider_transaction_id,amount_minor,currency,status,plan_code,paid_at,raw_response)
           VALUES ($1,'paystack',$2,$3,$4,$5,'success',$6,COALESCE($7,NOW()),$8::jsonb)
           ON CONFLICT (provider_reference) DO NOTHING RETURNING id,workspace_id,amount_minor,currency,plan_code`,
          [subscription.workspace_id,reference,String(data.id || ""),subscription.amount_minor,subscription.currency,subscription.plan_code,data.paid_at || null,JSON.stringify(event)]
        );
        if (insertedPayment.rowCount) payment = insertedPayment;
        else payment = await client.query("SELECT id,workspace_id,amount_minor,currency,plan_code FROM billing_payments WHERE provider='paystack' AND provider_reference=$1 FOR UPDATE", [reference]);
      }
      if (!payment.rowCount) throw new Error("Paystack charge could not be recorded.");
      if (Number(data.amount) !== Number(payment.rows[0].amount_minor) || String(data.currency).toUpperCase() !== String(payment.rows[0].currency).toUpperCase()) {
        throw new Error("Paystack webhook amount or currency mismatch.");
      }
      const interval = payment.rows[0].plan_code === providerConfig.annual_plan_code ? "annual"
        : payment.rows[0].plan_code === providerConfig.monthly_plan_code ? "monthly"
        : data.plan?.interval === "annually" ? "annual"
        : data.plan?.interval === "monthly" ? "monthly" : null;
      if (!interval) throw new Error("Paystack webhook plan could not be matched to a configured billing interval.");
      await client.query("UPDATE billing_payments SET status='success',provider_transaction_id=$2,paid_at=COALESCE($3,NOW()),raw_response=$4::jsonb,updated_at=NOW() WHERE id=$1",
        [payment.rows[0].id,String(data.id || ""),data.paid_at || null,JSON.stringify(event)]);
      await client.query(
        `INSERT INTO billing_customers (workspace_id,provider,provider_customer_id,provider_subscription_id,status,plan_code,amount_minor,currency,billing_interval,current_period_start,current_period_end,updated_at)
         VALUES ($1,'paystack',$2,$3,'active',$4,$5,$7,$6,NOW(),NOW()+CASE WHEN $6='annual' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END,NOW())
         ON CONFLICT (workspace_id) DO UPDATE SET provider='paystack',provider_customer_id=COALESCE(EXCLUDED.provider_customer_id,billing_customers.provider_customer_id),provider_subscription_id=COALESCE(EXCLUDED.provider_subscription_id,billing_customers.provider_subscription_id),status=CASE WHEN billing_customers.cancel_at_period_end THEN 'non_renewing' ELSE 'active' END,plan_code=EXCLUDED.plan_code,amount_minor=EXCLUDED.amount_minor,currency=EXCLUDED.currency,billing_interval=EXCLUDED.billing_interval,current_period_start=CASE WHEN billing_customers.cancel_at_period_end THEN billing_customers.current_period_start ELSE EXCLUDED.current_period_start END,current_period_end=CASE WHEN billing_customers.cancel_at_period_end THEN billing_customers.current_period_end ELSE EXCLUDED.current_period_end END,updated_at=NOW()`,
        [payment.rows[0].workspace_id,data.customer?.customer_code || null,data.subscription?.subscription_code || null,payment.rows[0].plan_code,payment.rows[0].amount_minor,interval,payment.rows[0].currency]);
      await client.query("UPDATE workspaces SET plan='team',updated_at=NOW() WHERE id=$1",[payment.rows[0].workspace_id]);
    }
    await client.query("UPDATE billing_webhook_events SET processing_status='processed',processed_at=NOW() WHERE id=$1",[inserted.rows[0].id]);
    const subscriptionCode = data.subscription?.subscription_code || data.subscription_code || null;
    const customerCode = data.customer?.customer_code || data.customer_code || null;
    const hasSubscriptionIdentity = Boolean(subscriptionCode || customerCode);
    const identityColumn = subscriptionCode ? "provider_subscription_id" : "provider_customer_id";
    const identityValue = subscriptionCode || customerCode;
    async function updateMatchedSubscription(sql, extraParams = []) {
      if (!hasSubscriptionIdentity) throw new Error("Paystack " + type + " event is missing subscription/customer identity.");
      const result = await client.query(sql.replace("/*IDENTITY*/", identityColumn + "=$1"), [identityValue, ...extraParams]);
      if (!result.rowCount) throw new Error("Paystack " + type + " event did not match a saved subscription; retry required.");
      return result;
    }
    if (type === "subscription.create") {
      if (!hasSubscriptionIdentity) throw new Error("Paystack subscription.create event is missing subscription/customer identity.");
      const linked = await client.query("UPDATE billing_customers SET provider_subscription_id=COALESCE($1,provider_subscription_id),provider_customer_id=COALESCE($2,provider_customer_id),updated_at=NOW() WHERE provider='paystack' AND (($1::text IS NOT NULL AND provider_subscription_id=$1) OR ($2::text IS NOT NULL AND provider_customer_id=$2))", [subscriptionCode, customerCode]);
      if (!linked.rowCount) throw new Error("Paystack subscription.create event did not match a saved customer; retry required.");
    }
    if (type === "invoice.payment_failed") {
      await updateMatchedSubscription("UPDATE billing_customers SET status='past_due',updated_at=NOW() WHERE provider='paystack' AND /*IDENTITY*/");
    }
    if (type === "subscription.not_renew") {
      await updateMatchedSubscription("UPDATE billing_customers SET status='non_renewing',cancel_at_period_end=TRUE,updated_at=NOW() WHERE provider='paystack' AND /*IDENTITY*/");
    }
    if (type === "subscription.disable") {
      const result = await updateMatchedSubscription("UPDATE billing_customers SET status=CASE WHEN LOWER(COALESCE($2,''))='complete' THEN 'completed' ELSE 'cancelled' END,cancel_at_period_end=FALSE,cancelled_at=NOW(),updated_at=NOW() WHERE provider='paystack' AND /*IDENTITY*/ RETURNING workspace_id", [data.status || ""]);
      for (const row of result.rows) await client.query("UPDATE workspaces SET plan='free',updated_at=NOW() WHERE id=$1", [row.workspace_id]);
    }
    if (type === "invoice.update" && String(data.status || "").toLowerCase() === "success") {
      const periodStart = typeof data.period_start === "string" && !Number.isNaN(Date.parse(data.period_start)) ? new Date(data.period_start).toISOString() : null;
      const periodEnd = typeof data.period_end === "string" && !Number.isNaN(Date.parse(data.period_end)) ? new Date(data.period_end).toISOString() : null;
      const result = await updateMatchedSubscription("UPDATE billing_customers SET status=CASE WHEN cancel_at_period_end THEN 'non_renewing' ELSE 'active' END,current_period_start=COALESCE($2::timestamptz,current_period_start),current_period_end=COALESCE($3::timestamptz,current_period_end),updated_at=NOW() WHERE provider='paystack' AND /*IDENTITY*/ RETURNING workspace_id", [periodStart, periodEnd]);
      for (const row of result.rows) await client.query("UPDATE workspaces SET plan='team',updated_at=NOW() WHERE id=$1", [row.workspace_id]);
    }
    await client.query("COMMIT");
    return NextResponse.json({ received:true });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("DailyManager Paystack webhook processing failed",error);
    return NextResponse.json({ error:"Webhook processing failed; retry delivery." },{ status:500 });
  } finally { client.release(); }
}
