import { getSessionUser } from "./session";
import { query } from "./db";

export async function requirePlatformAdmin() {
  const user = await getSessionUser();
  if (!user) throw Object.assign(new Error("Please sign in."), { status: 401 });
  const access = await query(
    "SELECT user_id FROM platform_admin_users WHERE user_id = $1 LIMIT 1",
    [user.id]
  );
  if (!access.rowCount) {
    throw Object.assign(new Error("Super Admin access is required."), { status: 403 });
  }
  return user;
}
