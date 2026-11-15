import { NextResponse } from "next/server";
import { pool } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/session";
import { getWorkspaceForUser } from "../../../../lib/workspace-context";
import { isSameOriginMutation } from "../../../../lib/request-security";
import { getBillingPlan, newBillingReference, paystackRequest } from "../../../../lib/paystack";

export const runtime = "nodejs";

export async function POST(request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const client = await pool.connect();
  try {
    const workspace = await getWorkspaceForUser(user.id);
    if (!workspace) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (String(workspace.owner_user_id) !== String(user.id)) return NextResponse.json({ error: "Only the workspace owner can manage billing." }, { status: 403 });
    const plan = getBillingPlan(body?.interval);
    const reference = newBillingReference();
    const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || new URL("/billing/return", request.url).toString();
    const result = await paystackRequest("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        amount: plan.amount,
        plan: plan.code,
        reference,
        callback_url: callbackUrl,
        metadata: { workspace_id: workspace.id, user_id: user.id, plan_interval: plan.key, product: "DailyManager" },
      }),
    });
    await client.query(
      `INSERT INTO billing_payments
       (workspace_id, provider, provider_reference, amount_minor, currency, status, plan_code, raw_response)
       VALUES ($1, 'paystack', $2, $3, 'NGN', 'initialized', $4, $5::jsonb)`,
      [workspace.id, reference, plan.amount, plan.code, JSON.stringify({ authorization_url: result.authorization_url, access_code: result.access_code })]
    );
    return NextResponse.json({ authorization_url: result.authorization_url, reference });
  } catch (error) {
    console.error("DailyManager Paystack initialization failed", error);
    return NextResponse.json({ error: error.message || "Could not start checkout." }, { status: error.status || 500 });
  } finally { client.release(); }
}
