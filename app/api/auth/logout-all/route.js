import { NextResponse } from "next/server";
import { getSessionUser, destroyAllUserSessions } from "../../../../lib/session";
import { isSameOriginMutation } from "../../../../lib/request-security";

export const runtime = "nodejs";

export async function POST(request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "This request could not be verified. Refresh the page and try again." }, { status: 403 });
  }

  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
    }
    await destroyAllUserSessions(user.id);
    return NextResponse.json({ ok: true, revoked: "all" });
  } catch (error) {
    console.error("DailyManager all-session revocation failed", error);
    return NextResponse.json({ error: "Could not revoke all sessions. Please try again." }, { status: 500 });
  }
}
