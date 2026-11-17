import { cookies } from "next/headers";
import { query } from "./db";
import { withWorkspaceEntitlements } from "./entitlements";

const ACTIVE_WORKSPACE_COOKIE = "dm_active_workspace";

// The baseline schema stores workspaces.id as BIGINT. Validate the decimal
// representation without converting it to Number (which would lose precision
// for valid PostgreSQL BIGINT values).
function isValidWorkspaceId(value) {
  const id = String(value ?? "");
  if (!/^[1-9]\\d{0,18}$/.test(id)) return false;
  try {
    return BigInt(id) <= 9223372036854775807n;
  } catch {
    return false;
  }
}

async function refreshWorkspaceEntitlement(workspace) {
  if (!workspace?.id) return workspace;
  const expired = await query(
    `UPDATE workspaces w
        SET plan='free', updated_at=NOW()
      WHERE w.id=$1 AND (
        (w.plan='free_trial' AND w.trial_ends_at IS NOT NULL AND w.trial_ends_at <= NOW())
        OR (
          w.plan='team' AND EXISTS (
            SELECT 1 FROM billing_customers bc
             WHERE bc.workspace_id=w.id
               AND bc.status IN ('past_due','non_renewing','cancelled','completed','expired')
               AND bc.current_period_end IS NOT NULL
               AND bc.current_period_end <= NOW()
          )
        )
      )
      RETURNING plan, trial_ends_at, updated_at`,
    [workspace.id]
  );
  if (expired.rowCount) {
    workspace.plan = expired.rows[0].plan;
    workspace.trial_ends_at = expired.rows[0].trial_ends_at;
  }
  return withWorkspaceEntitlements(workspace);
}

export async function getWorkspaceForUser(userId) {
  const jar = await cookies();
  const selectedId = jar.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  if (isValidWorkspaceId(selectedId)) {
    const selected = await query(
      `SELECT w.id, w.name, w.plan, w.trial_started_at, w.trial_ends_at, w.owner_user_id
         FROM workspaces w
         JOIN workspace_members m ON m.workspace_id = w.id
        WHERE m.user_id = $1 AND w.id = $2
        LIMIT 1`,
      [userId, selectedId]
    );
    if (selected.rowCount) return refreshWorkspaceEntitlement(selected.rows[0]);
  }

  const fallback = await query(
    `SELECT w.id, w.name, w.plan, w.trial_started_at, w.trial_ends_at, w.owner_user_id
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
  return refreshWorkspaceEntitlement(workspace);
}

export async function setActiveWorkspaceForUser(userId, workspaceId) {
  if (!isValidWorkspaceId(workspaceId)) {
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
