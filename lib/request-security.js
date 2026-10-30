/**
 * Reject browser cross-origin mutations that could otherwise ride an ambient
 * session cookie. Requests without an Origin header remain usable by trusted
 * server-to-server clients; browser POST requests normally include Origin.
 */
export function isSameOriginMutation(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function rejectCrossOriginMutation(request, NextResponse) {
  if (isSameOriginMutation(request)) return null;
  return NextResponse.json(
    { error: "This request could not be verified. Refresh the page and try again." },
    { status: 403 }
  );
}
