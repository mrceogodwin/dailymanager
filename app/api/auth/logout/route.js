import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DailyManager logout failed", error);
    return NextResponse.json({ error: "Could not end this session. Please try again." }, { status: error.status || 500 });
  }
}
