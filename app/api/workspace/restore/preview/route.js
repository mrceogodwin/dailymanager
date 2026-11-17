import { NextResponse } from "next/server";
import { pool } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/session";
import { getWorkspaceForUser } from "../../../../lib/workspace-context";
import { isSameOriginMutation } from "../../../../lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RECORDS = 10000;
const COLLECTIONS = ["projects", "tasks", "notes", "task_comments", "activity", "billing_payments"];

function validId(value) {
  return (typeof value === "string" && value.length > 0 && value.length <= 128) ||
    (typeof value === "number" && Number.isSafeInteger(value));
}

function checkList(value, key) {
  if (value !== undefined && (!Array.isArray(value) || value.length > MAX_RECORDS)) {
    throw new Error("The " + key.replaceAll("_", " ") + " section is invalid or too large.");
  }
  return Array.isArray(value) ? value : [];
}

export async function POST(request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "This request could not be verified. Refresh and try again." }, { status: 403 });
  }
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
    const workspace = await getWorkspaceForUser(user.id);
    if (!workspace) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (String(workspace.owner_user_id) !== String(user.id)) {
      return NextResponse.json({ error: "Only the workspace owner can run a recovery conflict check." }, { status: 403 });
    }
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > 15 * 1024 * 1024) return NextResponse.json({ error: "Backup file exceeds the 15 MB limit." }, { status: 413 });
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Submit a valid backup object." }, { status: 400 });
    if (body.version !== 1 || !["DailyManager workspace export", "DailyManager on-device backup"].includes(body.format)) {
      return NextResponse.json({ error: "This backup format or version is not supported." }, { status: 400 });
    }

    const sourceWorkspace = body.format === "DailyManager workspace export" ? body.workspace : body.snapshot?.workspace;
    const sourceWorkspaceId = body.format === "DailyManager workspace export" ? sourceWorkspace?.id : (body.workspace_id || sourceWorkspace?.id);
    if (!sourceWorkspace || !validId(sourceWorkspaceId)) return NextResponse.json({ error: "The backup has no valid workspace identity." }, { status: 400 });
    if (String(sourceWorkspaceId) !== String(workspace.id)) {
      return NextResponse.json({ error: "This backup belongs to a different workspace. Switch to its original workspace before running a conflict check." }, { status: 409 });
    }

    const source = body.format === "DailyManager workspace export" ? body : body.snapshot;
    const collections = {};
    let totalRecords = 0;
    for (const key of COLLECTIONS) {
      collections[key] = checkList(source[key], key);
      totalRecords += collections[key].length;
    }
    if (body.format === "DailyManager workspace export") {
      const members = checkList(body.members, "members");
      totalRecords += members.length;
    }
    if (totalRecords > MAX_RECORDS) return NextResponse.json({ error: "This backup contains too many records for one recovery review." }, { status: 413 });

    const projectIds = new Set(collections.projects.map(item => String(item?.id)));
    const taskIds = new Set(collections.tasks.map(item => String(item?.id)));
    const referenceProblems = [];
    for (const project of collections.projects) if (!validId(project?.id)) referenceProblems.push("A project is missing its record ID.");
    for (const task of collections.tasks) {
      if (!validId(task?.id)) referenceProblems.push("A task is missing its record ID.");
      if (task?.project_id && !projectIds.has(String(task.project_id))) referenceProblems.push("A task refers to a project that is not included in the backup.");
    }
    for (const comment of collections.task_comments) {
      if (!validId(comment?.id)) referenceProblems.push("A task comment is missing its record ID.");
      if (!taskIds.has(String(comment?.task_id))) referenceProblems.push("A task comment refers to a task that is not included in the backup.");
    }
    for (const note of collections.notes) if (!validId(note?.id)) referenceProblems.push("A note is missing its record ID.");
    if (referenceProblems.length > 30) referenceProblems.length = 30;

    const client = await pool.connect();
    try {
      const [projects, tasks, notes, comments] = await Promise.all([
        client.query("SELECT id FROM projects WHERE workspace_id = $1", [workspace.id]),
        client.query("SELECT id FROM tasks WHERE workspace_id = $1", [workspace.id]),
        client.query("SELECT id FROM workspace_notes WHERE workspace_id = $1", [workspace.id]),
        client.query("SELECT id FROM task_comments WHERE workspace_id = $1", [workspace.id]),
      ]);
      const existing = {
        projects: new Set(projects.rows.map(row => String(row.id))),
        tasks: new Set(tasks.rows.map(row => String(row.id))),
        notes: new Set(notes.rows.map(row => String(row.id))),
        task_comments: new Set(comments.rows.map(row => String(row.id))),
      };
      const conflicts = {};
      for (const key of Object.keys(existing)) {
        conflicts[key] = collections[key].filter(item => validId(item?.id) && existing[key].has(String(item.id))).length;
      }
      return NextResponse.json({
        ok: true,
        preview_only: true,
        writes_performed: false,
        workspace: { id: String(workspace.id), name: workspace.name },
        source_format: body.format,
        source_exported_at: body.exported_at || null,
        total_records: totalRecords,
        record_counts: Object.fromEntries(COLLECTIONS.map(key => [key, collections[key].length])),
        existing_id_conflicts: conflicts,
        reference_problem_count: referenceProblems.length,
        reference_problems: referenceProblems,
        pending_offline_changes: Array.isArray(body.pending_offline_changes) ? body.pending_offline_changes.length : 0,
        recommendation: "No data was changed. Resolve duplicate IDs and broken references before designing a restore. Recovery writes are not enabled.",
      }, { headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("DailyManager recovery preview failed:", error);
    return NextResponse.json({ error: error.message || "Could not inspect this backup against the current workspace." }, { status: 400, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }
}
