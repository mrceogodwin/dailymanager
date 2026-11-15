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
    if (String(workspace.owner_user_id) !== String(user.id)) {
      return NextResponse.json({ error: "Only the workspace owner can export all workspace data." }, { status: 403 });
    }
    const workspaceId = workspace.id;
    const [members, projects, tasks, notes, comments, activity, payments, subscription] = await Promise.all([
      query("SELECT m.user_id, u.name, u.email, m.role, m.created_at FROM workspace_members m JOIN app_users u ON u.id = m.user_id WHERE m.workspace_id = $1 ORDER BY m.created_at", [workspaceId]),
      query("SELECT id, name, description, status, color, created_by, created_at, updated_at FROM projects WHERE workspace_id = $1 ORDER BY created_at", [workspaceId]),
      query("SELECT id, project_id, title, description, status, priority, due_at, assignee_user_id, assigned_to, created_by, completed_at, created_at, updated_at FROM tasks WHERE workspace_id = $1 ORDER BY created_at", [workspaceId]),
      query("SELECT id, title, body, created_at, updated_at FROM workspace_notes WHERE workspace_id = $1 ORDER BY created_at", [workspaceId]),
      query("SELECT id, task_id, user_id, body, created_at, updated_at FROM task_comments WHERE workspace_id = $1 ORDER BY created_at", [workspaceId]),
      query("SELECT id, actor_id, actor_name, action, entity_type, entity_id, summary, created_at FROM workspace_activity WHERE workspace_id = $1 ORDER BY created_at", [workspaceId]),
      query("SELECT provider_reference, provider_transaction_id, amount_minor, currency, status, plan_code, paid_at, created_at FROM billing_payments WHERE workspace_id = $1 ORDER BY created_at", [workspaceId]),
      query("SELECT provider, provider_customer_id, provider_subscription_id, status, plan_code, amount_minor, currency, billing_interval, current_period_start, current_period_end, cancel_at_period_end, cancelled_at, created_at, updated_at FROM billing_customers WHERE workspace_id = $1", [workspaceId]),
    ]);
    const exportedAt = new Date().toISOString();
    const payload = {
      format: "DailyManager workspace export",
      version: 1,
      exported_at: exportedAt,
      workspace,
      members: members.rows,
      projects: projects.rows,
      tasks: tasks.rows,
      notes: notes.rows,
      task_comments: comments.rows,
      activity: activity.rows,
      billing_payments: payments.rows,
      subscription: subscription.rows[0] || null,
    };
    const filename = `dailymanager-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("DailyManager workspace export failed", error);
    return NextResponse.json({ error: "Workspace export is temporarily unavailable." }, { status: 500 });
  }
}
