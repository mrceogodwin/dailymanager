import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/session";
import { getWorkspaceForUser } from "../../../../lib/workspace-context";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
    const workspace = await getWorkspaceForUser(user.id);
    if (!workspace) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (String(workspace.owner_user_id) !== String(user.id)) return NextResponse.json({ error: "Only the workspace owner can view billing details." }, { status: 403 });
    const [customer, payments] = await Promise.all([
      query("SELECT status, plan_code, amount_minor, currency, billing_interval, current_period_start, current_period_end, cancel_at_period_end, cancelled_at FROM billing_customers WHERE workspace_id = $1", [workspace.id]),
      query("SELECT provider_reference, amount_minor, currency, status, paid_at, created_at FROM billing_payments WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 20", [workspace.id]),
    ]);
    return NextResponse.json({
      workspace: { id: workspace.id, name: workspace.name, plan: workspace.plan, trial_started_at: workspace.trial_started_at || null, trial_ends_at: workspace.trial_ends_at },
      subscription: customer.rows[0] || null,
      payments: payments.rows,
      checkout_configured: Boolean(process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_PLAN_MONTHLY && process.env.PAYSTACK_PLAN_ANNUAL &&
        process.env.DAILYMANAGER_PLAN_MONTHLY_AMOUNT_KOBO && process.env.DAILYMANAGER_PLAN_ANNUAL_AMOUNT_KOBO),
    });
  } catch (error) {
    console.error("DailyManager billing status failed", error);
    return NextResponse.json({ error: error.message || "Could not load billing status." }, { status: error.status || 500 });
  }
}
