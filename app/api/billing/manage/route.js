import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/session";
import { getWorkspaceForUser } from "../../../../lib/workspace-context";
import { isSameOriginMutation } from "../../../../lib/request-security";
import { decryptProviderPayload, getProviderMode } from "../../../../lib/provider-secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
    const workspace = await getWorkspaceForUser(user.id);
    if (!workspace) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (String(workspace.owner_user_id) !== String(user.id)) return NextResponse.json({ error: "Only the workspace owner can manage billing." }, { status: 403 });

    const subscription = await query(
      "SELECT provider_subscription_id,status FROM billing_customers WHERE workspace_id=$1 AND provider='paystack' LIMIT 1",
      [workspace.id]
    );
    const subscriptionCode = subscription.rows[0]?.provider_subscription_id;
    if (!subscriptionCode) return NextResponse.json({ error: "There is no active Paystack subscription to manage yet." }, { status: 409 });
    if (["cancelled", "completed"].includes(String(subscription.rows[0].status || "").toLowerCase())) {
      return NextResponse.json({ error: "This subscription has already ended." }, { status: 409 });
    }

    const stored = await query(
      "SELECT encrypted_payload FROM platform_payment_configs WHERE provider='paystack' AND mode=$1",
      [getProviderMode()]
    );
    if (!stored.rowCount) return NextResponse.json({ error: "Paystack is not configured for this environment." }, { status: 503 });
    const config = decryptProviderPayload(stored.rows[0].encrypted_payload);
    if (!config.secret_key) return NextResponse.json({ error: "Paystack credentials are incomplete." }, { status: 503 });

    const response = await fetch(`https://api.paystack.co/subscription/${encodeURIComponent(subscriptionCode)}/manage/link`, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.secret_key}` },
      cache: "no-store"
    });
    const payload = await response.json().catch(() => ({}));
    const link = payload?.data?.link;
    let validLink = false;
    try { validLink = new URL(link).hostname === "paystack.com" || new URL(link).hostname.endsWith(".paystack.com"); } catch {}
    if (!response.ok || payload.status !== true || !validLink) {
      console.error("DailyManager Paystack subscription management link failed", payload.message || response.status);
      return NextResponse.json({ error: "Paystack could not create a secure subscription management link. Please try again." }, { status: 502 });
    }
    return NextResponse.json({ url: link });
  } catch (error) {
    console.error("DailyManager subscription management failed", error);
    return NextResponse.json({ error: "Could not open subscription management." }, { status: error.status || 500 });
  }
}
