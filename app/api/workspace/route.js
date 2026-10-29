import { NextResponse } from "next/server";
import { query } from "../../../lib/db";
import { getSessionUser } from "../../../lib/session";

export const runtime = "nodejs";

async function ensureTaskAssignmentColumn() {
  await query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to TEXT");
}
async function validateTaskAssignee(assigneeId, workspaceId) {
  if (!assigneeId) return null;
  const member = await query("SELECT user_id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2", [workspaceId, assigneeId]);
  if (!member.rowCount) throw Object.assign(new Error("Choose a member of this workspace."), { status: 400 });
  return String(assigneeId);
}

async function ensureActivityTable() {
  await query(`CREATE TABLE IF NOT EXISTS workspace_activity (
    id BIGSERIAL PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    actor_id TEXT,
    actor_name TEXT NOT NULL DEFAULT 'Workspace member',
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    summary TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await query(`DO $
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'workspace_activity'
          AND column_name = 'workspace_id'
          AND data_type <> 'text'
      ) THEN
        ALTER TABLE workspace_activity ALTER COLUMN workspace_id TYPE TEXT USING workspace_id::text;
      END IF;
    END $`);
  await query("CREATE INDEX IF NOT EXISTS workspace_activity_workspace_created_idx ON workspace_activity (workspace_id, created_at DESC, id DESC)");
}
async function recordActivity({ workspaceId, user, action, entityType, entityId, summary }) {
  try {
    await ensureActivityTable();
    await query(
      `INSERT INTO workspace_activity (workspace_id, actor_id, actor_name, action, entity_type, entity_id, summary)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [workspaceId, String(user.id), user.name || user.email || "Workspace member", action, entityType, entityId == null ? null : String(entityId), summary]
    );
  } catch (error) {
    console.error("DailyManager activity log write failed:", error.message);
  }
}

async function getWorkspace(userId) {
  const result = await query(
    `SELECT w.id FROM workspaces w
       JOIN workspace_members m ON m.workspace_id = w.id
      WHERE m.user_id = $1 ORDER BY w.created_at ASC LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.id ?? null;
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
    const workspaceId = await getWorkspace(user.id);
    if (!workspaceId) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    await ensureActivityTable();
    const result = await query(
      `SELECT id, actor_id, actor_name, action, entity_type, entity_id, summary, created_at
       FROM workspace_activity WHERE workspace_id = $1
       ORDER BY created_at DESC, id DESC LIMIT 100`,
      [workspaceId]
    );
    return NextResponse.json({ activity: result.rows });
  } catch (error) {
    console.error("DailyManager activity GET error:", error);
    return NextResponse.json({ error: error.message || "Could not load workspace activity." }, { status: error.status || 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Please submit valid JSON." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
    }
    const workspaceId = await getWorkspace(user.id);
    await ensureTaskAssignmentColumn();
    if (!workspaceId) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    const membership = await query("SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2", [workspaceId, user.id]);
    if (membership.rows[0]?.role === "viewer") return NextResponse.json({ error: "Your workspace role is view-only. Ask the workspace owner for edit access." }, { status: 403 });

    if (body.kind === "task") {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const priority = ["low", "medium", "high", "urgent"].includes(body.priority) ? body.priority : "medium";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const dueAt = body.due_at ? new Date(body.due_at) : null;
      if (!title || title.length > 500) return NextResponse.json({ error: "Task name is required and must be under 500 characters." }, { status: 400 });
      if (description.length > 4000) return NextResponse.json({ error: "Task description must be under 4,000 characters." }, { status: 400 });
      if (dueAt && Number.isNaN(dueAt.getTime())) return NextResponse.json({ error: "Choose a valid due date." }, { status: 400 });
      const assignedTo = await validateTaskAssignee(body.assigned_to, workspaceId);
      let projectId = body.project_id || null;
      if (projectId) {
        const project = await query("SELECT id FROM projects WHERE id = $1 AND workspace_id = $2", [projectId, workspaceId]);
        if (!project.rowCount) return NextResponse.json({ error: "Selected project was not found." }, { status: 400 });
      }
      const result = await query(
        "INSERT INTO tasks (workspace_id, project_id, title, description, priority, due_at, created_by, assigned_to) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
        [workspaceId, projectId, title, description, priority, dueAt ? dueAt.toISOString() : null, user.id, assignedTo]
      );
      await recordActivity({ workspaceId, user, action: "created", entityType: "task", entityId: result.rows[0].id, summary: `Created task “${title}”.` });
      return NextResponse.json({ ok: true, id: result.rows[0].id }, { status: 201 });
    }

    if (body.kind === "task_update") {
      if (!body.id) return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const priority = ["low", "medium", "high", "urgent"].includes(body.priority) ? body.priority : null;
      const dueAt = body.due_at ? new Date(body.due_at) : null;
      if (!title || title.length > 500) return NextResponse.json({ error: "Task name is required and must be under 500 characters." }, { status: 400 });
      if (description.length > 4000) return NextResponse.json({ error: "Task description must be under 4,000 characters." }, { status: 400 });
      if (!priority) return NextResponse.json({ error: "Choose a valid task priority." }, { status: 400 });
      if (dueAt && Number.isNaN(dueAt.getTime())) return NextResponse.json({ error: "Choose a valid due date." }, { status: 400 });
      const assignedTo = await validateTaskAssignee(body.assigned_to, workspaceId);
      const projectId = body.project_id || null;
      if (projectId) {
        const project = await query("SELECT id FROM projects WHERE id = $1 AND workspace_id = $2", [projectId, workspaceId]);
        if (!project.rowCount) return NextResponse.json({ error: "Selected project was not found." }, { status: 400 });
      }
      const result = await query(
        "UPDATE tasks SET title = $1, description = $2, due_at = $3, project_id = $4, priority = $5, assigned_to = $6, updated_at = NOW() WHERE id = $7 AND workspace_id = $8 RETURNING id",
        [title, description, dueAt ? dueAt.toISOString() : null, projectId, priority, assignedTo, body.id, workspaceId]
      );
      if (!result.rowCount) return NextResponse.json({ error: "Task not found." }, { status: 404 });
      await recordActivity({ workspaceId, user, action: "updated", entityType: "task", entityId: body.id, summary: `Updated task “${title}”${assignedTo ? " and assigned it to a team member" : " and cleared its assignee"}.` });
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "task_delete") {
      if (!body.id) return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
      const result = await query("DELETE FROM tasks WHERE id = $1 AND workspace_id = $2 RETURNING title", [body.id, workspaceId]);
      if (!result.rowCount) return NextResponse.json({ error: "Task not found." }, { status: 404 });
      await recordActivity({ workspaceId, user, action: "deleted", entityType: "task", entityId: body.id, summary: `Deleted task “${result.rows[0].title}”.` });
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "task_status") {
      if (!body.id || !["todo", "in_progress", "done", "cancelled"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid task status update." }, { status: 400 });
      }
      const result = await query(
        "UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 AND workspace_id = $3 RETURNING id",
        [body.status, body.id, workspaceId]
      );
      if (!result.rowCount) return NextResponse.json({ error: "Task not found." }, { status: 404 });
      const statusTask = await query("SELECT title FROM tasks WHERE id = $1 AND workspace_id = $2", [body.id, workspaceId]);
      await recordActivity({ workspaceId, user, action: "status_changed", entityType: "task", entityId: body.id, summary: `Changed task “${statusTask.rows[0]?.title || "Task"}” to ${body.status.replace("_"," ")}.` });
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "note_update") {
      if (!body.id) return NextResponse.json({ error: "Note ID is required." }, { status: 400 });
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const noteBody = typeof body.body === "string" ? body.body : "";
      if (!title || title.length > 200 || noteBody.length > 20000) return NextResponse.json({ error: "Note title or body is invalid." }, { status: 400 });
      const result = await query(
        "UPDATE workspace_notes SET title = $1, body = $2, updated_at = NOW() WHERE id = $3 AND workspace_id = $4 RETURNING id",
        [title, noteBody, body.id, workspaceId]
      );
      if (!result.rowCount) return NextResponse.json({ error: "Note not found." }, { status: 404 });
      await recordActivity({ workspaceId, user, action: "updated", entityType: "note", entityId: body.id, summary: `Updated note “${title}”.` });
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "note_delete") {
      if (!body.id) return NextResponse.json({ error: "Note ID is required." }, { status: 400 });
      const note = await query("DELETE FROM workspace_notes WHERE id = $1 AND workspace_id = $2 RETURNING title", [body.id, workspaceId]);
      if (!note.rowCount) return NextResponse.json({ error: "Note not found." }, { status: 404 });
      await recordActivity({ workspaceId, user, action: "deleted", entityType: "note", entityId: body.id, summary: `Deleted note “${note.rows[0].title}”.` });
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "project_update") {
      if (!body.id) return NextResponse.json({ error: "Project ID is required." }, { status: 400 });
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      if (!name || name.length > 160 || description.length > 2000) return NextResponse.json({ error: "Project name or description is invalid." }, { status: 400 });
      const result = await query("UPDATE projects SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 AND workspace_id = $4 RETURNING id", [name, description, body.id, workspaceId]);
      if (!result.rowCount) return NextResponse.json({ error: "Project not found." }, { status: 404 });
      await recordActivity({ workspaceId, user, action: "updated", entityType: "project", entityId: body.id, summary: `Updated project “${name}”.` });
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "project_delete") {
      if (!body.id) return NextResponse.json({ error: "Project ID is required." }, { status: 400 });
      const linkedTasks = await query("SELECT id FROM tasks WHERE project_id = $1 AND workspace_id = $2 LIMIT 1", [body.id, workspaceId]);
      if (linkedTasks.rowCount) return NextResponse.json({ error: "Move or unassign this project’s tasks before deleting the project." }, { status: 409 });
      const result = await query("DELETE FROM projects WHERE id = $1 AND workspace_id = $2 RETURNING name", [body.id, workspaceId]);
      if (!result.rowCount) return NextResponse.json({ error: "Project not found." }, { status: 404 });
      await recordActivity({ workspaceId, user, action: "deleted", entityType: "project", entityId: body.id, summary: `Deleted project “${result.rows[0].name}”.` });
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "project") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      if (!name || name.length > 160 || description.length > 2000) return NextResponse.json({ error: "Project name or description is invalid." }, { status: 400 });
      const result = await query(
        "INSERT INTO projects (workspace_id, name, description, created_by) VALUES ($1, $2, $3, $4) RETURNING id",
        [workspaceId, name, description, user.id]
      );
      await recordActivity({ workspaceId, user, action: "created", entityType: "project", entityId: result.rows[0].id, summary: `Created project “${name}”.` });
      return NextResponse.json({ ok: true, id: result.rows[0].id }, { status: 201 });
    }

    if (body.kind === "note") {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const noteBody = typeof body.body === "string" ? body.body : "";
      if (!title || title.length > 200 || noteBody.length > 20000) return NextResponse.json({ error: "Note title or body is invalid." }, { status: 400 });
      const result = await query(
        "INSERT INTO workspace_notes (workspace_id, title, body, created_by) VALUES ($1, $2, $3, $4) RETURNING id",
        [workspaceId, title, noteBody, user.id]
      );
      await recordActivity({ workspaceId, user, action: "created", entityType: "note", entityId: result.rows[0].id, summary: `Created note “${title}”.` });
      return NextResponse.json({ ok: true, id: result.rows[0].id }, { status: 201 });
    }

    if (["member_add", "member_role", "member_remove"].includes(body.kind)) {
      const workspaceResult = await query("SELECT owner_user_id FROM workspaces WHERE id = $1", [workspaceId]);
      if (String(workspaceResult.rows[0]?.owner_user_id) !== String(user.id)) return NextResponse.json({ error: "Only the workspace owner can manage members." }, { status: 403 });

      if (body.kind === "member_add") {
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const role = ["admin", "member", "viewer"].includes(body.role) ? body.role : "member";
        if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid account email." }, { status: 400 });
        const account = await query("SELECT id, name, email FROM app_users WHERE LOWER(email) = $1 LIMIT 1", [email]);
        if (!account.rowCount) return NextResponse.json({ error: "That email does not have a DailyManager account yet." }, { status: 404 });
        if (String(account.rows[0].id) === String(user.id)) return NextResponse.json({ error: "You are already the workspace owner." }, { status: 409 });
        const result = await query("INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (workspace_id, user_id) DO NOTHING RETURNING user_id", [workspaceId, account.rows[0].id, role]);
        if (!result.rowCount) return NextResponse.json({ error: "That account is already a workspace member." }, { status: 409 });
        await recordActivity({ workspaceId, user, action: "member_added", entityType: "member", entityId: account.rows[0].id, summary: `Added ${account.rows[0].name || account.rows[0].email} as ${role}.` });
        return NextResponse.json({ ok: true }, { status: 201 });
      }

      if (!body.user_id || String(body.user_id) === String(user.id)) return NextResponse.json({ error: "Choose another workspace member." }, { status: 400 });
      const member = await query("SELECT m.user_id, u.name, u.email FROM workspace_members m JOIN app_users u ON u.id = m.user_id WHERE m.workspace_id = $1 AND m.user_id = $2", [workspaceId, body.user_id]);
      if (!member.rowCount) return NextResponse.json({ error: "Workspace member not found." }, { status: 404 });
      if (body.kind === "member_role") {
        const role = ["admin", "member", "viewer"].includes(body.role) ? body.role : "";
        if (!role) return NextResponse.json({ error: "Choose admin, member, or viewer." }, { status: 400 });
        await query("UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND user_id = $3", [role, workspaceId, body.user_id]);
        await recordActivity({ workspaceId, user, action: "member_role_changed", entityType: "member", entityId: body.user_id, summary: `Changed ${member.rows[0].name || member.rows[0].email} role to ${role}.` });
        return NextResponse.json({ ok: true });
      }
      await query("DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2", [workspaceId, body.user_id]);
      await recordActivity({ workspaceId, user, action: "member_removed", entityType: "member", entityId: body.user_id, summary: `Removed ${member.rows[0].name || member.rows[0].email} from the workspace.` });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported workspace action." }, { status: 400 });
  } catch (error) {
    console.error("DailyManager workspace action failed", error);
    return NextResponse.json({ error: error.status === 503 ? error.message : "Could not save your changes. Please try again." }, { status: error.status || 500 });
  }
}
