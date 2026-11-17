import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { pool } from "../../../../lib/db";
import { hashToken } from "../../../../lib/session";
import { isSameOriginMutation } from "../../../../lib/request-security";

export const runtime = "nodejs";

export async function POST(request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "This request could not be verified. Refresh the page and try again." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Submit a valid password reset request." }, { status: 400 }); }
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return NextResponse.json({ error: "This password reset link is invalid or expired." }, { status: 400 });
  if (password.length < 10 || password.length > 128) return NextResponse.json({ error: "Password must be between 10 and 128 characters." }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(
      "SELECT id,user_id FROM account_action_tokens WHERE token_hash=$1 AND purpose='password_reset' AND consumed_at IS NULL AND expires_at>NOW() FOR UPDATE",
      [hashToken(token)]
    );
    if (!found.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "This password reset link is invalid or expired." }, { status: 400 });
    }
    const tokenRow = found.rows[0];
    const passwordHash = await bcrypt.hash(password, 12);
    await client.query("UPDATE app_users SET password_hash=$1 WHERE id=$2", [passwordHash, tokenRow.user_id]);
    await client.query("UPDATE account_action_tokens SET consumed_at=NOW() WHERE user_id=$1 AND purpose='password_reset' AND consumed_at IS NULL", [tokenRow.user_id]);
    await client.query("DELETE FROM app_sessions WHERE user_id=$1", [tokenRow.user_id]);
    await client.query("COMMIT");
    return NextResponse.json({ ok: true, message: "Your password has been updated. Please sign in again." });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("DailyManager password reset failed", error);
    return NextResponse.json({ error: "We could not update your password. Please try again." }, { status: 500 });
  } finally { client.release(); }
}
