import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { query } from "../../../../lib/db";
import { hashToken } from "../../../../lib/session";
import { checkAuthRateLimit } from "../../../../lib/rate-limit";
import { sendAccountActionEmail } from "../../../../lib/account-email";
import { isSameOriginMutation } from "../../../../lib/request-security";

export const runtime = "nodejs";
const GENERIC = "If an account exists for that email, password reset instructions will be sent shortly.";

export async function POST(request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "This request could not be verified. Refresh the page and try again." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Submit a valid email address." }, { status: 400 }); }
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  try {
    const limit = await checkAuthRateLimit(request, "password_reset", email);
    if (!limit.allowed) return NextResponse.json({ error: GENERIC }, { status: 200 });
    const result = await query("SELECT id, name, email FROM app_users WHERE email=$1 LIMIT 1", [email]);
    const user = result.rows[0];
    if (user) {
      const token = randomBytes(32).toString("base64url");
      await query("UPDATE account_action_tokens SET consumed_at=NOW() WHERE user_id=$1 AND purpose='password_reset' AND consumed_at IS NULL", [user.id]);
      await query("INSERT INTO account_action_tokens (user_id, token_hash, purpose, expires_at) VALUES ($1,$2,'password_reset',NOW()+INTERVAL '30 minutes')", [user.id, hashToken(token)]);
      try { await sendAccountActionEmail({ to: user.email, name: user.name, purpose: "password_reset", token }); }
      catch (error) { console.error("DailyManager password reset email could not be delivered", error); }
    }
    return NextResponse.json({ message: GENERIC });
  } catch (error) {
    console.error("DailyManager password reset request failed", error);
    return NextResponse.json({ error: "Password recovery is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
