import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getSessionUser, hashToken } from "../../../../../lib/session";
import { query } from "../../../../../lib/db";
import { sendAccountActionEmail } from "../../../../../lib/account-email";
import { checkAuthRateLimit } from "../../../../../lib/rate-limit";
import { isSameOriginMutation } from "../../../../../lib/request-security";

export const runtime = "nodejs";

export async function POST(request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const status = await query("SELECT email_verified_at FROM app_users WHERE id=$1", [user.id]);
    if (status.rows[0]?.email_verified_at) return NextResponse.json({ ok: true, verified: true, message: "Your email is already verified." });
    const limit = await checkAuthRateLimit(request, "email_verification", user.email);
    if (!limit.allowed) return NextResponse.json({ error: "Please wait before requesting another verification email." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    const token = randomBytes(32).toString("base64url");
    await query("UPDATE account_action_tokens SET consumed_at=NOW() WHERE user_id=$1 AND purpose='email_verification' AND consumed_at IS NULL", [user.id]);
    await query("INSERT INTO account_action_tokens (user_id,token_hash,purpose,expires_at) VALUES ($1,$2,'email_verification',NOW()+INTERVAL '24 hours')", [user.id, hashToken(token)]);
    await sendAccountActionEmail({ to: user.email, name: user.name, purpose: "email_verification", token });
    return NextResponse.json({ ok: true, message: "Verification email sent. Check your inbox." });
  } catch (error) {
    console.error("DailyManager verification email request failed", error);
    return NextResponse.json({ error: error.status === 503 ? error.message : "We could not send the verification email. Please try again." }, { status: error.status || 500 });
  }
}
