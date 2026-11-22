import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/session";
import { getWorkspaceForUser } from "../../../../lib/workspace-context";
import { decryptProviderPayload, getProviderMode } from "../../../../lib/provider-secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({error:"Please log in to continue."},{status:401});
    const workspace = await getWorkspaceForUser(user.id);
    if (!workspace) return NextResponse.json({error:"Workspace not found."},{status:404});
    if (String(workspace.owner_user_id)!==String(user.id)) return NextResponse.json({error:"Only the workspace owner can view billing details."},{status:403});
    const [customer,payments,providers] = await Promise.all([
      query("SELECT status,provider_subscription_id,plan_code,amount_minor,currency,billing_interval,current_period_start,current_period_end,cancel_at_period_end,cancelled_at FROM billing_customers WHERE workspace_id=$1",[workspace.id]),
      query("SELECT provider,provider_reference,amount_minor,currency,status,paid_at,created_at FROM billing_payments WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 20",[workspace.id]),
      query("SELECT provider,encrypted_payload FROM platform_payment_configs WHERE mode=$1",[getProviderMode()])
    ]);
    const configured = new Set();
    for (const row of providers.rows) {
      try {
        const config = decryptProviderPayload(row.encrypted_payload);
        if (row.provider === "paystack" && config.secret_key && config.monthly_plan_code &&
            Number.isSafeInteger(Number(config.monthly_amount)) && Number(config.monthly_amount) > 0) configured.add("paystack");
        if (row.provider === "bachs" && config.secret_key && config.webhook_secret && config.monthly_product_id &&
            Number.isFinite(Number(config.monthly_amount)) && Number(config.monthly_amount) > 0 && String(config.currency || "").toUpperCase() === "USD") configured.add("bachs");
      } catch (error) {
        console.error("DailyManager provider status could not validate stored configuration", row.provider, error.message);
      }
    }
    return NextResponse.json({
      workspace:{id:workspace.id,name:workspace.name,plan:workspace.plan,trial_started_at:workspace.trial_started_at || null,trial_ends_at:workspace.trial_ends_at},
      subscription:customer.rows[0] ? { ...customer.rows[0], can_manage_subscription: Boolean(customer.rows[0].provider_subscription_id) && !["cancelled"].includes(String(customer.rows[0].status || "").toLowerCase()), provider_subscription_id: undefined } : null,
      payments:payments.rows,
      checkout_configured:{paystack:configured.has("paystack"),bachs:configured.has("bachs")}
    });
  } catch(error) {
    console.error("DailyManager billing status failed",error);
    return NextResponse.json({error:error.message || "Could not load billing status."},{status:error.status || 500});
  }
}
