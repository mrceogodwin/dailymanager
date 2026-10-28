import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Please submit valid login details." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

  try {
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
