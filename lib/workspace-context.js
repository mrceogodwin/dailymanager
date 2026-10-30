import { cookies } from "next/headers";
import { query } from "./db";

const ACTIVE_WORKSPACE_COOKIE = "dm_active_workspace";

export async function getWorkspaceForUser(userId) {
  const jar = await cookies();
  const selectedId = jar.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  if (selectedId && /^\d+$/.test(selectedId)) {
    const selected = await query(
      `SELECT w.id, w.name, w.plan, w.trial_ends_at, w.owner_user_id
         FROM workspaces w
         JOIN workspace_members m ON m.workspace_id = w.id
        WHERE m.user_id = $1 AND w.id = $2
        LIMIT 1`,
      [userId, selectedId]
    );
    if (selected.rowCount) return selected.rows[0];
  }

  const fallback = await query(
    `SELECT w.id, w.name, w.plan, w.trial_ends_at, w.owner_user_id
       FROM workspaces w
       JOIN workspace_members m ON m.workspace_id = w.id
      WHERE m.user_id = $1
      ORDER BY w.created_at ASC, w.id ASC
      LIMIT 1`,
    [userId]
  );
  const workspace = fallback.rows[0] || null;
  if (workspace) {
    jar.set(ACTIVE_WORKSPACE_COOKIE, String(workspace.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  } else {
    jar.set(ACTIVE_WORKSPACE_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
  }
  return workspace;
}

export async function setActiveWorkspaceForUser(userId, workspaceId) {
  if (!/^\d+$/.test(String(workspaceId || ""))) {
    throw Object.assign(new Error("Choose a valid workspace."), { status: 400 });
  }
  const membership = await query(
    "SELECT w.id FROM workspaces w JOIN workspace_members m ON m.workspace_id = w.id WHERE m.user_id = $1 AND w.id = $2 LIMIT 1",
    [userId, String(workspaceId)]
  );
  if (!membership.rowCount) {
    throw Object.assign(new Error("You are not a member of that workspace."), { status: 403 });
  }
  const jar = await cookies();
  jar.set(ACTIVE_WORKSPACE_COOKIE, String(membership.rows[0].id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return true;
}
