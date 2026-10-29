import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    const workspaceResult = await query(
      `SELECT w.id, w.name, w.plan, w.trial_ends_at, w.owner_user_id
         FROM workspaces w
         JOIN workspace_members m ON m.workspace_id = w.id
        WHERE m.user_id = $1
        ORDER BY w.created_at ASC LIMIT 1`,
      [user.id]
    );
    const workspace = workspaceResult.rows[0];
    if (!workspace) return NextResponse.json({ error: "No workspace is linked to this account." }, { status: 409 });

    const [projectsResult, tasksResult, notesResult, membersResult] = await Promise.all([
      query("SELECT id, name, description, status, color FROM projects WHERE workspace_id = $1 ORDER BY updated_at DESC", [workspace.id]),
      query(
        `SELECT t.id, t.title, t.description, t.status, t.priority, t.project_id, t.due_at,
                p.name AS project_name
           FROM tasks t LEFT JOIN projects p ON p.id = t.project_id
          WHERE t.workspace_id = $1 ORDER BY t.created_at DESC LIMIT 500`,
        [workspace.id]
      ),
      query("SELECT id, title, body, created_at, updated_at FROM workspace_notes WHERE workspace_id = $1 ORDER BY updated_at DESC LIMIT 200", [workspace.id]),
      query("SELECT m.user_id AS id, u.name, u.email, m.role, m.created_at FROM workspace_members m JOIN app_users u ON u.id = m.user_id WHERE m.workspace_id = $1 ORDER BY CASE WHEN m.user_id = $2 THEN 0 ELSE 1 END, m.created_at ASC", [workspace.id, user.id]),
    ]);
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      workspace,
      projects: projectsResult.rows,
      tasks: tasksResult.rows,
      notes: notesResult.rows,
      members: membersResult.rows,
    });
  } catch (error) {
    console.error("DailyManager workspace load failed", error);
    return NextResponse.json({ error: error.status === 503 ? error.message : "Workspace is temporarily unavailable." }, { status: error.status || 500 });
  }
}
