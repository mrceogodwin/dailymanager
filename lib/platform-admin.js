import { getSessionUser } from "./session";

export async function requirePlatformAdmin() {
  const user = await getSessionUser();
  if (!user) throw Object.assign(new Error("Please sign in."), { status: 401 });
  const allowed = (process.env.DAILYMANAGER_SUPER_ADMIN_EMAILS || process.env.DAILYMANAGER_SUPER_ADMIN_EMAIL || "")
    .split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length || !allowed.includes(String(user.email || "").trim().toLowerCase())) {
    throw Object.assign(new Error("Super Admin access is required."), { status: 403 });
  }
  return user;
}
