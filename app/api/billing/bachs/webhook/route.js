import { NextResponse } from "next/server";
import { Bachs, webhooks, BachsWebhookError } from "@bachs/sdk";
import { pool, query } from "../../../../../lib/db";
import { decryptProviderPayload, getProviderMode } from "../../../../../lib/provider-secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toMinorUnits(value) {
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]{1,2}))?$/.exec(String(value ?? "").trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
}

export async function POST(request) {
  const raw = await request.text();
  const mode = getProviderMode();
  try {
    const configResult = await query("SELECT encrypted_payload FROM platform_payment_configs WHERE provider='bachs' AND mode=$1", [mode]);
    if (!configResult.rowCount) return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
    const config = decryptProviderPayload(configResult.rows[0].encrypted_payload);
    if (!config.webhook_secret) return NextResponse.json({ error: "Bachs webhook signing secret is not configured." }, { status: 503 });

    let event;
    try {
      event = webhooks.constructEvent(raw, request.headers, config.webhook_secret);
    } catch (error) {
      if (error instanceof BachsWebhookError) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
      throw error;
    }

    const eventId = typeof event?.id === "string" ? event.id : "";
    const type = typeof (event?.type || event?.event_type) === "string" ? (event.type || event.event_type) : "unknown";
    if (!eventId) return NextResponse.json({ error: "Missing event id." }, { status: 400 });
    const data = event.data || {};
    const reference = data.metadata?.local_reference || data.reference || data.checkout_id || null;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO billing_webhook_events (provider,provider_event_id,event_type,event_reference,payload,processing_status)
         VALUES ('bachs',$1,$2,$3,$4::jsonb,'processing')
         ON CONFLICT (provider,provider_event_id) DO NOTHING RETURNING id`,
        [eventId, type, reference || data.checkout_id || null, JSON.stringify(event)]
      );
      if (!inserted.rowCount) {
        await client.query("COMMIT");
        return NextResponse.json({ received: true, duplicate: true });
      }

      if (type === "collection.succeeded") {
        // Bachs also emits this event for accepted/overpaid collections and synthetic
        // test events. Only a real, fully succeeded charge may activate a subscription.
        if (String(data.status || "").toUpperCase() !== "SUCCEEDED" || !data.charge_id) {
          await client.query(
            "UPDATE billing_webhook_events SET processing_status='ignored',processed_at=NOW() WHERE id=$1",
            [inserted.rows[0].id]
          );
          await client.query("COMMIT");
          return NextResponse.json({ received: true, ignored: true });
        }
        const payment = await client.query(
          "SELECT id,workspace_id,amount_minor,currency,plan_code FROM billing_payments WHERE provider='bachs' AND (provider_reference=$1 OR raw_response->>'checkout_id'=$1) FOR UPDATE",
          [reference]
        );
        if (!payment.rowCount) throw new Error("Payment reference is not persisted yet; retry delivery.");
        const amountMinor = toMinorUnits(data.amount);
        if (amountMinor !== Number(payment.rows[0].amount_minor) ||
            String(data.currency || "").toUpperCase() !== String(payment.rows[0].currency).toUpperCase()) {
          throw new Error("Bachs payment status, amount, or currency did not match the stored checkout.");
        }
        await client.query(
          "UPDATE billing_payments SET status='success',provider_transaction_id=$2,paid_at=NOW(),raw_response=$3::jsonb,updated_at=NOW() WHERE id=$1",
          [payment.rows[0].id, String(data.charge_id), JSON.stringify({ event_id: eventId, checkout_id: data.checkout_id || null })]
        );
        const interval = payment.rows[0].plan_code === "annual" ? "annual" : "monthly";
        await client.query(
          `INSERT INTO billing_customers (workspace_id,provider,provider_customer_id,provider_subscription_id,status,plan_code,amount_minor,currency,billing_interval,current_period_start,current_period_end,updated_at)
           VALUES ($1,'bachs',$2,$3,'active',$4,$5,'USD',$6,NOW(),NOW()+CASE WHEN $6='annual' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END,NOW())
           ON CONFLICT (workspace_id) DO UPDATE SET provider='bachs',provider_customer_id=EXCLUDED.provider_customer_id,
           provider_subscription_id=COALESCE(EXCLUDED.provider_subscription_id,billing_customers.provider_subscription_id),
           status='active',plan_code=EXCLUDED.plan_code,amount_minor=EXCLUDED.amount_minor,currency='USD',
           billing_interval=EXCLUDED.billing_interval,current_period_start=EXCLUDED.current_period_start,
           current_period_end=EXCLUDED.current_period_end,cancelled_at=NULL,cancel_at_period_end=FALSE,updated_at=NOW()`,
          [payment.rows[0].workspace_id, data.customer?.id || null, data.subscription?.id || null,
            payment.rows[0].plan_code, payment.rows[0].amount_minor, interval]
        );
        await client.query("UPDATE workspaces SET plan='team',updated_at=NOW() WHERE id=$1", [payment.rows[0].workspace_id]);
      }

      if (["customer.subscription.created", "customer.subscription.updated"].includes(type)) {
        const subscriptionId = data.id || data.subscription_id || data.subscription?.id || data.subscription?.subscription_id;
        if (!subscriptionId) throw new Error("Bachs subscription event did not include a subscription ID.");
        // Fetch the canonical provider record instead of trusting partial webhook fields.
        const bachs = new Bachs({ apiKey: config.secret_key });
        const fetched = await bachs.subscriptions.get(subscriptionId);
        const subscription = fetched?.data || fetched;
        const customerId = subscription.customer?.id || subscription.customer_id || data.customer?.id || null;
        const localReference = subscription.metadata?.local_reference || data.metadata?.local_reference || null;
        const paymentMatch = await client.query(
          `SELECT p.workspace_id, p.plan_code
             FROM billing_payments p
             LEFT JOIN billing_customers bc ON bc.workspace_id=p.workspace_id
            WHERE p.provider='bachs'
              AND (($1::text IS NOT NULL AND p.provider_reference=$1)
                OR ($2::text IS NOT NULL AND bc.provider_customer_id=$2)
                OR ($3::text IS NOT NULL AND bc.provider_subscription_id=$3))
            ORDER BY p.created_at DESC LIMIT 1 FOR UPDATE OF p`,
          [localReference, customerId, String(subscriptionId)]
        );
        if (!paymentMatch.rowCount) throw new Error("Bachs subscription could not be linked to a DailyManager workspace yet.");
        const workspaceId = paymentMatch.rows[0].workspace_id;
        const providerStatus = String(subscription.status || "").toLowerCase();
        const statusMap = {
          trialing: "trialing",
          active: "active",
          past_due: "past_due",
          canceled: "cancelled",
          unpaid: "expired",
          paused: "past_due",
        };
        const status = statusMap[providerStatus];
        if (!status) throw new Error(`Unsupported Bachs subscription status: ${providerStatus || "missing"}`);
        const currency = String(subscription.currency || "").toUpperCase();
        if (currency !== "USD") throw new Error("Bachs recurring subscription currency did not match the supported USD billing configuration.");
        const amountMinor = toMinorUnits(subscription.amount);
        const cycle = subscription.billing_cycle?.interval || paymentMatch.rows[0].plan_code || "monthly";
        const interval = String(cycle).includes("year") || String(cycle).includes("annual") ? "annual" : "monthly";
        await client.query(
          `INSERT INTO billing_customers
             (workspace_id,provider,provider_customer_id,provider_subscription_id,status,plan_code,amount_minor,currency,billing_interval,current_period_start,current_period_end,cancel_at_period_end,cancelled_at,updated_at)
           VALUES ($1,'bachs',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
           ON CONFLICT (workspace_id) DO UPDATE SET provider='bachs',
             provider_customer_id=COALESCE(EXCLUDED.provider_customer_id,billing_customers.provider_customer_id),
             provider_subscription_id=EXCLUDED.provider_subscription_id,status=EXCLUDED.status,
             plan_code=COALESCE(EXCLUDED.plan_code,billing_customers.plan_code),
             amount_minor=COALESCE(EXCLUDED.amount_minor,billing_customers.amount_minor),
             currency=EXCLUDED.currency,billing_interval=EXCLUDED.billing_interval,
             current_period_start=COALESCE(EXCLUDED.current_period_start,billing_customers.current_period_start),
             current_period_end=COALESCE(EXCLUDED.current_period_end,billing_customers.current_period_end),
             cancel_at_period_end=EXCLUDED.cancel_at_period_end,cancelled_at=EXCLUDED.cancelled_at,updated_at=NOW()`,
          [workspaceId, customerId, String(subscriptionId), status, paymentMatch.rows[0].plan_code,
            amountMinor, currency, interval,
            subscription.current_period_start || null, subscription.current_period_end || null,
            Boolean(subscription.cancel_at_period_end), subscription.canceled_at || null]
        );
        if (["active", "trialing", "past_due"].includes(status)) {
          await client.query("UPDATE workspaces SET plan='team',updated_at=NOW() WHERE id=$1", [workspaceId]);
        } else {
          await client.query("UPDATE workspaces SET plan='free',updated_at=NOW() WHERE id=$1", [workspaceId]);
        }
      }

      if (type === "customer.subscription.deleted") {
        const subscriptionId = data.id || data.subscription_id || data.subscription?.id || data.subscription?.subscription_id;
        if (!subscriptionId) throw new Error("Bachs cancellation event did not include a subscription ID.");
        const result = await client.query(
          `UPDATE billing_customers SET status='cancelled',cancel_at_period_end=FALSE,
             cancelled_at=COALESCE($2::timestamptz,NOW()),updated_at=NOW()
           WHERE provider='bachs' AND provider_subscription_id=$1 RETURNING workspace_id`,
          [String(subscriptionId), data.canceled_at || data.cancelled_at || null]
        );
        if (!result.rowCount) throw new Error("Bachs cancellation could not be linked to a workspace.");
        await client.query("UPDATE workspaces SET plan='free',updated_at=NOW() WHERE id=$1", [result.rows[0].workspace_id]);
      }

      if (type === "invoice.paid") {
        const subscriptionId = data.subscription?.subscription_id || data.subscription?.id || data.subscription_id;
        const amountMinor = toMinorUnits(data.amount_paid);
        if (!subscriptionId || !amountMinor || String(data.status || "").toLowerCase() !== "paid") {
          throw new Error("Bachs paid invoice is missing a valid subscription, amount, or paid status.");
        }
        const result = await client.query(
          `UPDATE billing_customers SET status='active',amount_minor=$2,currency=$3,
             current_period_start=COALESCE($4::timestamptz,current_period_start),
             current_period_end=COALESCE($5::timestamptz,current_period_end),
             updated_at=NOW()
           WHERE provider='bachs' AND provider_subscription_id=$1
           RETURNING workspace_id,plan_code`,
          [String(subscriptionId), amountMinor, String(data.currency || "USD").toUpperCase(),
            data.period_start || null, data.period_end || null]
        );
        if (!result.rowCount) throw new Error("Bachs paid invoice could not be linked to a workspace subscription.");
        if (data.invoice_id) {
          await client.query(
            `INSERT INTO billing_payments (workspace_id,provider,provider_reference,provider_transaction_id,amount_minor,currency,status,plan_code,paid_at,raw_response)
             VALUES ($1,'bachs',$2,$3,$4,$5,'success',$6,NOW(),$7::jsonb)
             ON CONFLICT (provider_reference) DO NOTHING`,
            [result.rows[0].workspace_id, String(data.invoice_id),
              data.charge?.charge_id || data.charge?.id || null, amountMinor,
              String(data.currency || "USD").toUpperCase(), result.rows[0].plan_code, JSON.stringify({ event_id: eventId, invoice_id: data.invoice_id })]
          );
        }
        await client.query("UPDATE workspaces SET plan='team',updated_at=NOW() WHERE id=$1", [result.rows[0].workspace_id]);
      }

      if (type === "invoice.payment_failed") {
        const subscriptionId = data.subscription?.subscription_id || data.subscription?.id || data.subscription_id;
        if (!subscriptionId) throw new Error("Bachs failed invoice did not include a subscription ID.");
        const result = await client.query(
          "UPDATE billing_customers SET status='past_due',updated_at=NOW() WHERE provider='bachs' AND provider_subscription_id=$1 RETURNING workspace_id",
          [String(subscriptionId)]
        );
        if (!result.rowCount) throw new Error("Bachs failed invoice could not be linked to a workspace subscription.");
        // Bachs retries failed renewals; keep access while its subscription is past_due.
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
    return NextResponse.json({ error: "Webhook unavailable." }, { status: 503 });
  }
}
