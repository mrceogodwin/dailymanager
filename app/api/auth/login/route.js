import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "../../../../lib/db";
import { createSession } from "../../../../lib/session";
import { checkAuthRateLimit } from "../../../../lib/rate-limit";
import { isSameOriginMutation } from "../../../../lib/request-security";

export const runtime = "nodejs";

export async function POST(request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "This request could not be verified. Refresh the page and try again." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Please submit valid login details." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!password || password.length > 128) return NextResponse.json({ error: "Enter your password (maximum 128 characters)." }, { status: 400 });

  try {
    const limit = await checkAuthRateLimit(request, "login", email);
    if (!limit.allowed) return NextResponse.json({ error: "Too many login attempts. Please wait before trying again." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    const result = await query("SELECT id, name, email, password_hash FROM app_users WHERE email = $1 LIMIT 1", [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("DailyManager login failed", error);
    return NextResponse.json({ error: error.status === 503 ? error.message : "Login is temporarily unavailable. Please try again." }, { status: error.status || 500 });
  }
}
