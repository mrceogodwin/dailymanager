import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool, query } from "@/lib/db";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Please submit valid form details." }, { status: 400 }); }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "Name must be between 2 and 120 characters." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 10 || password.length > 128) return NextResponse.json({ error: "Password must be between 10 and 128 characters." }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database is not configured yet. Add DATABASE_URL in Vercel project settings." }, { status: 503 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT id FROM app_users WHERE email = $1 LIMIT 1", [email]);
    if (existing.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "An account with this email already exists. Please log in." }, { status: 409 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await client.query(
      "INSERT INTO app_users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, passwordHash]
    );
    const user = userResult.rows[0];
    const workspaceResult = await client.query(
      "INSERT INTO workspaces (name, owner_user_id) VALUES ($1, $2) RETURNING id",
      [`${name.split(" ")[0]}'s workspace`, user.id]
    );
    await client.query(
      "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
      [workspaceResult.rows[0].id, user.id]
    );
    await client.query("COMMIT");
    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("DailyManager registration failed", error);
    if (error.code === "23505") return NextResponse.json({ error: "An account with this email already exists. Please log in." }, { status: 409 });
    return NextResponse.json({ error: "We couldn't create your account. Please try again." }, { status: 500 });
  } finally {
    client.release();
  }
}
