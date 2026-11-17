import { NextResponse } from "next/server";
import { pool } from "../../../../../lib/db";
import { hashToken } from "../../../../../lib/session";
import { isSameOriginMutation } from "../../../../../lib/request-security";

export const runtime = "nodejs";

export async function POST(request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid verification request." }, { status: 400 }); }
  const token = typeof body?.token === "string" ? body.token : "";
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return NextResponse.json({ error: "This verification link is invalid or expired." }, { status: 400 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(
      "SELECT id,user_id FROM account_action_tokens WHERE token_hash=$1 AND purpose='email_verification' AND consumed_at IS NULL AND expires_at>NOW() FOR UPDATE",
      [hashToken(token)]
    );
    if (!found.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "This verification link is invalid or expired." }, { status: 400 });
    }
    const userId = found.rows[0].user_id;
    await client.query("UPDATE app_users SET email_verified_at=COALESCE(email_verified_at,NOW()) WHERE id=$1", [userId]);
    await client.query("UPDATE account_action_tokens SET consumed_at=NOW() WHERE user_id=$1 AND purpose='email_verification' AND consumed_at IS NULL", [userId]);
    await client.query("COMMIT");
    return NextResponse.json({ ok: true, message: "Your email address has been verified." });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("DailyManager email verification failed", error);
    return NextResponse.json({ error: "We could not verify your email. Please try again." }, { status: 500 });
  } finally { client.release(); }
}
