import { NextResponse } from "next/server";
import { pool, query } from "../../../lib/db";
import { getSessionUser } from "../../../lib/session";
import { getWorkspaceForUser, setActiveWorkspaceForUser } from "../../../lib/workspace-context";
import { isSameOriginMutation } from "../../../lib/request-security";

export const runtime = "nodejs";

function parseTaskDueDate(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return date;
}

async function ensureTaskAssignmentColumn() {
  await query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to TEXT");
}
async function validateTaskAssignee(assigneeId, workspaceId) {
  if (!assigneeId) return null;
  const member = await query("SELECT user_id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2", [workspaceId, assigneeId]);
  if (!member.rowCount) throw Object.assign(new Error("Choose a member of this workspace."), { status: 400 });
  return String(assigneeId);
}

async function ensureWorkspaceNotificationsTable() {
  await query(`CREATE TABLE IF NOT EXISTS workspace_notifications (
    id BIGSERIAL PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    actor_id TEXT,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await query("CREATE INDEX IF NOT EXISTS workspace_notifications_user_created_idx ON workspace_notifications (workspace_id, user_id, created_at DESC, id DESC)");
}
async function createWorkspaceNotification({ workspaceId, userId, actorId, kind, title, body, entityType, entityId }) {
  if (!userId || String(userId) === String(actorId)) return;
  await ensureWorkspaceNotificationsTable();
  await query(`INSERT INTO workspace_notifications (workspace_id, user_id, actor_id, kind, title, body, entity_type, entity_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [workspaceId, String(userId), String(actorId), kind, title, body, entityType || null, entityId == null ? null : String(entityId)]);
}

async function ensureTaskCommentsTable() {
  await query(`CREATE TABLE IF NOT EXISTS task_comments (
    id BIGSERIAL PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await query("CREATE INDEX IF NOT EXISTS task_comments_task_created_idx ON task_comments (workspace_id, task_id, created_at ASC, id ASC)");
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
  await query(`DO $dm$
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
    END;
  $dm$`);
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

export async function GET(request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
    const activeWorkspace = await getWorkspaceForUser(user.id);
    const workspaceId = activeWorkspace?.id;
    if (!workspaceId) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    const params = new URL(request.url).searchParams;
    if (params.get("notifications") === "1") {
      await ensureWorkspaceNotificationsTable();
      const result = await query(`SELECT id, actor_id, kind, title, body, entity_type, entity_id, read_at, created_at
        FROM workspace_notifications WHERE workspace_id = $1 AND user_id = $2
        ORDER BY created_at DESC, id DESC LIMIT 50`, [workspaceId, String(user.id)]);
      return NextResponse.json({ notifications: result.rows, unread_count: result.rows.filter(item => !item.read_at).length });
    }
    const taskId = params.get("task_id");
    if (taskId) {
      await ensureTaskCommentsTable();
      const task = await query("SELECT id FROM tasks WHERE id = $1 AND workspace_id = $2", [taskId, workspaceId]);
      if (!task.rowCount) return NextResponse.json({ error: "Task not found." }, { status: 404 });
      const comments = await query(`SELECT c.id, c.task_id, c.user_id, c.body, c.created_at, c.updated_at, u.name AS author_name, u.email AS author_email
        FROM task_comments c LEFT JOIN app_users u ON u.id::text = c.user_id
        WHERE c.workspace_id = $1 AND c.task_id = $2 ORDER BY c.created_at ASC, c.id ASC LIMIT 200`, [workspaceId, taskId]);
      await ensureActivityTable();
      const history = await query(`SELECT id, actor_name, action, summary, created_at
        FROM workspace_activity
        WHERE workspace_id = $1 AND entity_type = 'task' AND entity_id = $2
        ORDER BY created_at DESC, id DESC LIMIT 100`, [workspaceId, String(taskId)]);
      return NextResponse.json({ comments: comments.rows, history: history.rows });
    }
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
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "This request could not be verified. Refresh the page and try again." }, { status: 403 });
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
    if (body.kind === "workspace_create") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 2 || name.length > 100) {
        return NextResponse.json({ error: "Workspace name must be between 2 and 100 characters." }, { status: 400 });
      }
      const createClient = await pool.connect();
      let createdWorkspaceId;
      try {
        await createClient.query("BEGIN");
        const created = await createClient.query(
          "INSERT INTO workspaces (name, owner_user_id) VALUES ($1, $2) RETURNING id",
          [name, user.id]
        );
        createdWorkspaceId = created.rows[0].id;
        await createClient.query(
          "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
          [createdWorkspaceId, user.id]
        );
        await createClient.query("COMMIT");
      } catch (error) {
        try { await createClient.query("ROLLBACK"); } catch {}
        throw error;
      } finally {
        createClient.release();
      }
      await setActiveWorkspaceForUser(user.id, createdWorkspaceId);
      return NextResponse.json({ ok: true, workspace_id: createdWorkspaceId }, { status: 201 });
    }
    if (body.kind === "workspace_switch") {
      await setActiveWorkspaceForUser(user.id, body.workspace_id);
      return NextResponse.json({ ok: true });
    }
    const activeWorkspace = await getWorkspaceForUser(user.id);
    const workspaceId = activeWorkspace?.id;
    await ensureTaskAssignmentColumn();
    if (!workspaceId) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    const membership = await query("SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2", [workspaceId, user.id]);
    const role = membership.rows[0]?.role || "member";
    const ownerResult = await query("SELECT owner_user_id FROM workspaces WHERE id = $1", [workspaceId]);
    const isOwner = String(ownerResult.rows[0]?.owner_user_id) === String(user.id);
    const canManageWorkspace = isOwner || role === "admin";
    if (role === "viewer" && !isOwner && body.kind !== "notification_read") return NextResponse.json({ error: "Your workspace role is view-only. Ask the workspace owner for edit access." }, { status: 403 });
    if (body.kind === "workspace_delete") {
      if (!isOwner) return NextResponse.json({ error: "Only the workspace owner can delete this workspace." }, { status: 403 });
      const confirmation = typeof body.confirmation === "string" ? body.confirmation.trim() : "";
      const workspaceName = String(activeWorkspace?.name || "");
      if (confirmation !== workspaceName) {
        return NextResponse.json({ error: "Type the exact workspace name to confirm deletion." }, { status: 400 });
      }
      const otherWorkspace = await query(
        "SELECT w.id FROM workspaces w JOIN workspace_members m ON m.workspace_id = w.id WHERE m.user_id = $1 AND w.id <> $2 ORDER BY w.created_at ASC LIMIT 1",
        [user.id, workspaceId]
      );
      if (!otherWorkspace.rowCount) {
        return NextResponse.json({ error: "Create or join another workspace before deleting your only workspace." }, { status: 409 });
      }
      await ensureTaskCommentsTable();
      await ensureWorkspaceNotificationsTable();
      await ensureActivityTable();
      const deleteClient = await pool.connect();
      try {
        await deleteClient.query("BEGIN");
        const locked = await deleteClient.query(
          "SELECT id, name FROM workspaces WHERE id = $1 AND owner_user_id = $2 FOR UPDATE",
          [workspaceId, user.id]
        );
        if (!locked.rowCount) {
          await deleteClient.query("ROLLBACK");
          return NextResponse.json({ error: "Workspace ownership could not be verified." }, { status: 403 });
        }
        const otherMembership = await deleteClient.query(
          "SELECT 1 FROM workspace_members WHERE user_id = $1 AND workspace_id <> $2 LIMIT 1",
          [user.id, workspaceId]
        );
        if (!otherMembership.rowCount) {
          await deleteClient.query("ROLLBACK");
          return NextResponse.json({ error: "Create or join another workspace before deleting your only workspace." }, { status: 409 });
        }
        await deleteClient.query("DELETE FROM task_comments WHERE workspace_id = $1", [String(workspaceId)]);
        await deleteClient.query("DELETE FROM workspace_notifications WHERE workspace_id = $1", [String(workspaceId)]);
        await deleteClient.query("DELETE FROM workspace_activity WHERE workspace_id = $1", [String(workspaceId)]);
        const deleted = await deleteClient.query("DELETE FROM workspaces WHERE id = $1 AND owner_user_id = $2 RETURNING id", [workspaceId, user.id]);
        if (!deleted.rowCount) {
          await deleteClient.query("ROLLBACK");
          return NextResponse.json({ error: "Workspace could not be deleted." }, { status: 409 });
        }
        await deleteClient.query("COMMIT");
      } catch (error) {
        try { await deleteClient.query("ROLLBACK"); } catch {}
        throw error;
      } finally {
        deleteClient.release();
      }
      return NextResponse.json({ ok: true, deleted_workspace_id: workspaceId });
    }
    if (body.kind === "workspace_rename") {
      if (!isOwner) return NextResponse.json({ error: "Only the workspace owner can rename this workspace." }, { status: 403 });
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 2 || name.length > 100) {
        return NextResponse.json({ error: "Workspace name must be between 2 and 100 characters." }, { status: 400 });
      }
      await query("UPDATE workspaces SET name = $1, updated_at = NOW() WHERE id = $2 AND owner_user_id = $3", [name, workspaceId, user.id]);
      return NextResponse.json({ ok: true, name });
    }
    if (body.kind === "notification_read") {
      await ensureWorkspaceNotificationsTable();
      if (body.id === "all") {
        await query("UPDATE workspace_notifications SET read_at = NOW() WHERE workspace_id = $1 AND user_id = $2 AND read_at IS NULL", [workspaceId, String(user.id)]);
      } else if (body.id) {
        await query("UPDATE workspace_notifications SET read_at = NOW() WHERE id = $1 AND workspace_id = $2 AND user_id = $3", [body.id, workspaceId, String(user.id)]);
      } else {
        return NextResponse.json({ error: "Notification ID is required." }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }
    const requireTaskAccess = async (taskId) => {
      const task = await query("SELECT created_by, assigned_to FROM tasks WHERE id = $1 AND workspace_id = $2", [taskId, workspaceId]);
      if (!task.rowCount) return { error: NextResponse.json({ error: "Task not found." }, { status: 404 }) };
      if (!canManageWorkspace && String(task.rows[0].created_by) !== String(user.id) && String(task.rows[0].assigned_to || "") !== String(user.id)) {
        return { error: NextResponse.json({ error: "You can only change tasks you created or that are assigned to you." }, { status: 403 }) };
      }
      return { task: task.rows[0] };
    };
    const requireProjectManagement = () => canManageWorkspace ? null : NextResponse.json({ error: "Only workspace owners and admins can manage projects." }, { status: 403 });

    const requireNoteAccess = async (noteId) => {
      const note = await query("SELECT id, created_by FROM workspace_notes WHERE id = $1 AND workspace_id = $2", [noteId, workspaceId]);
      if (!note.rowCount) return { error: NextResponse.json({ error: "Note not found." }, { status: 404 }) };
      if (!canManageWorkspace && String(note.rows[0].created_by) !== String(user.id)) {
        return { error: NextResponse.json({ error: "You can only edit or delete notes you created." }, { status: 403 }) };
      }
      return { note: note.rows[0] };
    };

    if (body.kind === "task_comment") {
      const taskId = body.task_id;
      const comment = typeof body.body === "string" ? body.body.trim() : "";
      if (!taskId) return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
      if (!comment || comment.length > 5000) return NextResponse.json({ error: "Comment must contain 1–5,000 characters." }, { status: 400 });
      const task = await query("SELECT id, title FROM tasks WHERE id = $1 AND workspace_id = $2", [taskId, workspaceId]);
      if (!task.rowCount) return NextResponse.json({ error: "Task not found." }, { status: 404 });
      if (role === "viewer" && !isOwner) return NextResponse.json({ error: "Viewers cannot post comments." }, { status: 403 });
      await ensureTaskCommentsTable();
      const saved = await query("INSERT INTO task_comments (workspace_id, task_id, user_id, body) VALUES ($1, $2, $3, $4) RETURNING id, task_id, user_id, body, created_at, updated_at", [workspaceId, String(user.id), comment]);
      await recordActivity({ workspaceId, user, action: "commented", entityType: "task", entityId: taskId, summary: `Commented on task “${task.rows[0].title}”.` });
      return NextResponse.json({ ok: true, comment: { ...saved.rows[0], author_name: user.name || user.email, author_email: user.email } }, { status: 201 });
    }

    if (body.kind === "task") {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const priority = ["low", "medium", "high", "urgent"].includes(body.priority) ? body.priority : "medium";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const dueAt = parseTaskDueDate(body.due_at);
      if (!title || title.length > 500) return NextResponse.json({ error: "Task name is required and must be under 500 characters." }, { status: 400 });
      if (description.length > 4000) return NextResponse.json({ error: "Task description must be under 4,000 characters." }, { status: 400 });
      if (dueAt === undefined) return NextResponse.json({ error: "Choose a valid due date." }, { status: 400 });
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
      if (assignedTo && String(assignedTo) !== String(user.id)) await createWorkspaceNotification({ workspaceId, userId: assignedTo, actorId: user.id, kind: "task_assigned", title: "New task assigned", body: `You were assigned “${title}”.`, entityType: "task", entityId: result.rows[0].id });
      return NextResponse.json({ ok: true, id: result.rows[0].id }, { status: 201 });
    }

    if (body.kind === "task_update") {
      if (!body.id) return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
      const access = await requireTaskAccess(body.id);
      if (access.error) return access.error;
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const priority = ["low", "medium", "high", "urgent"].includes(body.priority) ? body.priority : null;
      const dueAt = parseTaskDueDate(body.due_at);
      if (!title || title.length > 500) return NextResponse.json({ error: "Task name is required and must be under 500 characters." }, { status: 400 });
      if (description.length > 4000) return NextResponse.json({ error: "Task description must be under 4,000 characters." }, { status: 400 });
      if (!priority) return NextResponse.json({ error: "Choose a valid task priority." }, { status: 400 });
      if (dueAt === undefined) return NextResponse.json({ error: "Choose a valid due date." }, { status: 400 });
      const assignedTo = await validateTaskAssignee(body.assigned_to, workspaceId);
      const previousAssignee = access.task.assigned_to == null ? null : String(access.task.assigned_to);
      const assigneeResult = assignedTo ? await query("SELECT name, email FROM app_users WHERE id::text = $1 LIMIT 1", [assignedTo]) : null;
      const assigneeLabel = assigneeResult?.rows[0]?.name || assigneeResult?.rows[0]?.email || null;
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
      const assignmentChanged = String(assignedTo || "") !== String(previousAssignee || "");
      const assignmentSummary = assignmentChanged ? (assignedTo ? ` and assigned it to ${assigneeLabel || "a team member"}` : " and removed its assignee") : "";
      await recordActivity({ workspaceId, user, action: "updated", entityType: "task", entityId: body.id, summary: `Updated task “${title}”${assignmentSummary}.` });
      if (assignedTo && String(assignedTo) !== String(user.id) && String(assignedTo) !== String(previousAssignee || "")) await createWorkspaceNotification({ workspaceId, userId: assignedTo, actorId: user.id, kind: "task_assigned", title: "Task assigned to you", body: `You were assigned “${title}”.`, entityType: "task", entityId: body.id });
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "task_delete") {
      if (!body.id) return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
      const access = await requireTaskAccess(body.id);
      if (access.error) return access.error;
      await ensureTaskCommentsTable();
      const client = await pool.connect();
      let deletedTitle;
      try {
        await client.query("BEGIN");
        const result = await client.query("DELETE FROM tasks WHERE id = $1 AND workspace_id = $2 RETURNING title", [body.id, workspaceId]);
        if (!result.rowCount) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Task not found." }, { status: 404 });
        }
        deletedTitle = result.rows[0].title;
        await client.query("DELETE FROM task_comments WHERE workspace_id = $1 AND task_id = $2", [workspaceId, String(body.id)]);
        await client.query("COMMIT");
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch {}
        throw error;
      } finally {
        client.release();
      }
      await recordActivity({ workspaceId, user, action: "deleted", entityType: "task", entityId: body.id, summary: `Deleted task “${deletedTitle}”.` });
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "task_status") {
      if (!body.id || !["todo", "in_progress", "done", "cancelled"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid task status update." }, { status: 400 });
      }
      const access = await requireTaskAccess(body.id);
      if (access.error) return access.error;
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
      const access = await requireNoteAccess(body.id);
      if (access.error) return access.error;
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
      const access = await requireNoteAccess(body.id);
      if (access.error) return access.error;
      const note = await query("DELETE FROM workspace_notes WHERE id = $1 AND workspace_id = $2 RETURNING title", [body.id, workspaceId]);
      if (!note.rowCount) return NextResponse.json({ error: "Note not found." }, { status: 404 });
      await recordActivity({ workspaceId, user, action: "deleted", entityType: "note", entityId: body.id, summary: `Deleted note “${note.rows[0].title}”.` });
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "project_update") {
      const permissionError = requireProjectManagement();
      if (permissionError) return permissionError;
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
      const permissionError = requireProjectManagement();
      if (permissionError) return permissionError;
      if (!body.id) return NextResponse.json({ error: "Project ID is required." }, { status: 400 });
      const linkedTasks = await query("SELECT id FROM tasks WHERE project_id = $1 AND workspace_id = $2 LIMIT 1", [body.id, workspaceId]);
      if (linkedTasks.rowCount) return NextResponse.json({ error: "Move or unassign this project’s tasks before deleting the project." }, { status: 409 });
      const result = await query("DELETE FROM projects WHERE id = $1 AND workspace_id = $2 RETURNING name", [body.id, workspaceId]);
      if (!result.rowCount) return NextResponse.json({ error: "Project not found." }, { status: 404 });
      await recordActivity({ workspaceId, user, action: "deleted", entityType: "project", entityId: body.id, summary: `Deleted project “${result.rows[0].name}”.` });
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "project") {
      const permissionError = requireProjectManagement();
      if (permissionError) return permissionError;
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
      const removalClient = await pool.connect();
      let unassignedCount = 0;
      try {
        await removalClient.query("BEGIN");
        const unassigned = await removalClient.query(
          "UPDATE tasks SET assigned_to = NULL, updated_at = NOW() WHERE workspace_id = $1 AND assigned_to = $2 RETURNING id",
          [workspaceId, String(body.user_id)]
        );
        const removed = await removalClient.query(
          "DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 RETURNING user_id",
          [workspaceId, body.user_id]
        );
        if (!removed.rowCount) {
          await removalClient.query("ROLLBACK");
          return NextResponse.json({ error: "Workspace member not found." }, { status: 404 });
        }
        unassignedCount = unassigned.rowCount;
        await removalClient.query("COMMIT");
      } catch (error) {
        try { await removalClient.query("ROLLBACK"); } catch {}
        throw error;
      } finally {
        removalClient.release();
      }
      const unassigned = { rowCount: unassignedCount };
      const removedName = member.rows[0].name || member.rows[0].email;
      await recordActivity({ workspaceId, user, action: "member_removed", entityType: "member", entityId: body.user_id, summary: `Removed ${removedName} from the workspace.` });
      if (unassigned.rowCount) await recordActivity({ workspaceId, user, action: "assignees_cleared", entityType: "member", entityId: body.user_id, summary: `Cleared ${unassigned.rowCount} task assignment${unassigned.rowCount === 1 ? "" : "s"} previously assigned to ${removedName}.` });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported workspace action." }, { status: 400 });
  } catch (error) {
    console.error("DailyManager workspace action failed", error);
    return NextResponse.json({ error: error.status === 503 ? error.message : "Could not save your changes. Please try again." }, { status: error.status || 500 });
  }
}
