import { NextResponse } from "next/server";
import { destroySession } from "../../../../lib/session";
import { isSameOriginMutation } from "../../../../lib/request-security";

export const runtime = "nodejs";

export async function POST(request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "This request could not be verified. Refresh the page and try again." }, { status: 403 });
  try {
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DailyManager logout failed", error);
    return NextResponse.json({ error: "Could not end this session. Please try again." }, { status: error.status || 500 });
  }
}
