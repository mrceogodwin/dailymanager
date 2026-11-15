import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { requirePlatformAdmin } from "../../../../lib/platform-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const [totals, workspaces, payments] = await Promise.all([
      query(`SELECT
        (SELECT COUNT(*)::int FROM app_users) AS users,
        (SELECT COUNT(*)::int FROM workspaces) AS workspaces,
        (SELECT COUNT(*)::int FROM billing_payments WHERE status='success') AS successful_payments,
        (SELECT COUNT(*)::int FROM billing_payments WHERE status IN ('initialized','pending')) AS pending_payments,
        (SELECT COALESCE(SUM(amount_minor),0)::text FROM billing_payments WHERE status='success') AS collected_minor`),
      query(`SELECT w.id,w.name,w.plan,w.created_at,w.trial_ends_at,u.email AS owner_email,
        (SELECT COUNT(*)::int FROM workspace_members m WHERE m.workspace_id=w.id) AS member_count
        FROM workspaces w LEFT JOIN app_users u ON u.id=w.owner_user_id
        ORDER BY w.created_at DESC LIMIT 50`),
      query(`SELECT p.provider,p.provider_reference,p.amount_minor,p.currency,p.status,p.created_at,w.name AS workspace_name
        FROM billing_payments p JOIN workspaces w ON w.id=p.workspace_id
        ORDER BY p.created_at DESC LIMIT 30`)
    ]);
    return NextResponse.json({ totals: totals.rows[0], workspaces: workspaces.rows, payments: payments.rows });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Could not load platform overview." }, { status: error.status || 500 });
  }
}
