import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { pool } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/session";
import { getWorkspaceForUser } from "../../../../lib/workspace-context";
import { isSameOriginMutation } from "../../../../lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RECORDS = 10000;
const MAX_BYTES = 15 * 1024 * 1024;
const COLLECTIONS = ["projects", "tasks", "notes", "task_comments", "activity", "billing_payments"];

function validId(value) {
  return (typeof value === "string" && value.length > 0 && value.length <= 128) ||
    (typeof value === "number" && Number.isSafeInteger(value));
}

function checkList(value, key) {
  if (value !== undefined && (!Array.isArray(value) || value.length > MAX_RECORDS)) {
    const error = new Error("The " + key.replaceAll("_", " ") + " section is invalid or too large.");
    error.status = 400;
    throw error;
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
    if (declaredLength > MAX_BYTES) return NextResponse.json({ error: "Backup file exceeds the 15 MB limit." }, { status: 413 });
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BYTES) return NextResponse.json({ error: "Backup file exceeds the 15 MB limit." }, { status: 413 });
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Backup file is not valid JSON." }, { status: 400 });
    }
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
    const sourceMembers = checkList(body.format === "DailyManager workspace export" ? body.members : source.members, "members");
    totalRecords += sourceMembers.length;
    if (totalRecords > MAX_RECORDS) return NextResponse.json({ error: "This backup contains too many records for one recovery review." }, { status: 413 });

    const referenceProblems = [];
    const duplicateSourceIds = {};
    for (const key of COLLECTIONS) {
      if (collections[key].some(item => !item || typeof item !== "object" || Array.isArray(item))) {
        referenceProblems.push("The " + key.replaceAll("_", " ") + " section contains an invalid record.");
      }
    }
    for (const key of ["projects", "tasks", "notes", "task_comments"]) {
      const ids = collections[key].map(item => item?.id).filter(validId).map(String);
      duplicateSourceIds[key] = ids.length - new Set(ids).size;
      if (duplicateSourceIds[key] > 0) referenceProblems.push("The backup contains duplicate " + key.replaceAll("_", " ") + " IDs.");
    }
    const projectIds = new Set(collections.projects.map(item => String(item?.id)));
    const taskIds = new Set(collections.tasks.map(item => String(item?.id)));
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
      const [projects, tasks, notes, comments, currentMembers] = await Promise.all([
        client.query("SELECT id FROM projects WHERE workspace_id = $1", [workspace.id]),
        client.query("SELECT id FROM tasks WHERE workspace_id = $1", [workspace.id]),
        client.query("SELECT id FROM workspace_notes WHERE workspace_id = $1", [workspace.id]),
        client.query("SELECT id FROM task_comments WHERE workspace_id = $1", [workspace.id]),
        client.query("SELECT wm.user_id, LOWER(u.email) AS email FROM workspace_members wm JOIN app_users u ON u.id = wm.user_id WHERE wm.workspace_id = $1", [workspace.id]),
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

      const currentByEmail = new Map(currentMembers.rows.map(row => [row.email, String(row.user_id)]));
      const sourceById = new Map(sourceMembers.map(member => [String(member?.user_id ?? member?.id ?? ""), String(member?.email || "").trim().toLowerCase()]));
      const mappedSourceMembers = [...sourceById.values()].filter(email => email && currentByEmail.has(email));
      const unmatchedMembers = [...sourceById.values()].filter(email => !email || !currentByEmail.has(email)).map(email => email || "Unknown email").slice(0, 30);
      const referencedAssignees = new Set(collections.tasks.map(task => String(task?.assigned_to || task?.assignee_user_id || "")).filter(Boolean));
      const sourceUserIds = new Set(sourceById.keys());
      const unmappedAssigneeIds = [...referencedAssignees].filter(id => !sourceUserIds.has(id));

      return NextResponse.json({
        ok: true,
        preview_only: true,
        writes_performed: false,
        workspace: { id: String(workspace.id), name: workspace.name },
        source_format: body.format,
        backup_sha256: createHash("sha256").update(rawBody).digest("hex"),
        source_exported_at: body.exported_at || null,
        total_records: totalRecords,
        record_counts: Object.fromEntries(COLLECTIONS.map(key => [key, collections[key].length])),
        existing_id_conflicts: conflicts,
        duplicate_source_ids: duplicateSourceIds,
        member_mapping: { source_members: sourceMembers.length, matched_by_email: mappedSourceMembers.length, unmatched_members: unmatchedMembers },
        tasks_with_unmapped_assignees: unmappedAssigneeIds.length,
        reference_problem_count: referenceProblems.length,
        reference_problems: referenceProblems,
        pending_offline_changes: Array.isArray(body.pending_offline_changes) ? body.pending_offline_changes.length : 0,
        recovery_scope: { append_only: true, maps_members_by_email: true, billing_history: false, subscriptions: false, historical_activity: false },
        recommendation: "No data was changed. A future append-only restore can generate new record IDs, map member identities by email, and leave unmatched assignees unassigned. Billing history, subscriptions, and historical activity are excluded from recovery writes.",
      }, { headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("DailyManager recovery preview failed:", error);
    const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
    return NextResponse.json({ error: status < 500 ? (error.message || "The backup could not be validated.") : "The workspace recovery check is temporarily unavailable." }, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
  }
}
