import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { requirePlatformAdmin } from "../../../../lib/platform-admin";
import { encryptProviderPayload, decryptProviderPayload } from "../../../../lib/provider-secrets";
import { isSameOriginMutation } from "../../../../lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeConfig(payload) {
  return {
    configured: Boolean(payload.secret_key),
    webhook_configured: Boolean(payload.webhook_secret),
    monthly_product_configured: Boolean(payload.monthly_product_id || payload.monthly_plan_code),
    annual_product_configured: Boolean(payload.annual_product_id || payload.annual_plan_code),
    currency: payload.currency || "USD",
    monthly_amount: payload.monthly_amount || "",
    annual_amount: payload.annual_amount || "",
    public_key: payload.public_key || "",
  };
}

export async function GET(request) {
  try {
    await requirePlatformAdmin();
    const provider = new URL(request.url).searchParams.get("provider") || "paystack";
    if (!["paystack","bachs"].includes(provider)) return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
    const result = await query("SELECT mode, encrypted_payload, updated_at FROM platform_payment_configs WHERE provider = $1 ORDER BY mode", [provider]);
    const configs = {};
    for (const row of result.rows) {
      try { configs[row.mode] = { ...safeConfig(decryptProviderPayload(row.encrypted_payload)), updated_at: row.updated_at }; }
      catch { configs[row.mode] = { configured: false, error: "Could not decrypt this saved configuration." }; }
    }
    return NextResponse.json({ provider, configs });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Could not load provider settings." }, { status: error.status || 500 });
  }
}

export async function PUT(request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  try {
    const admin = await requirePlatformAdmin();
    const body = await request.json();
    const provider = body?.provider;
    const mode = body?.mode;
    if (!["paystack","bachs"].includes(provider) || !["test","live"].includes(mode)) {
      return NextResponse.json({ error: "Choose a valid provider and environment." }, { status: 400 });
    }
    const fields = provider === "paystack"
      ? ["secret_key","webhook_secret","monthly_plan_code","annual_plan_code","monthly_amount","annual_amount","public_key","currency"]
      : ["secret_key","webhook_secret","monthly_product_id","annual_product_id","monthly_amount","annual_amount","currency"];
    const existing = await query("SELECT encrypted_payload FROM platform_payment_configs WHERE provider = $1 AND mode = $2", [provider, mode]);
    let payload = existing.rowCount ? decryptProviderPayload(existing.rows[0].encrypted_payload) : {};
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        const value = typeof body[field] === "string" ? body[field].trim() : "";
        if (value) payload[field] = value;
      }
    }
    if (!payload.secret_key) return NextResponse.json({ error: "A secret API key is required." }, { status: 400 });
    if (!payload.currency) payload.currency = provider === "bachs" ? "USD" : "NGN";
    if (!["NGN","USD"].includes(payload.currency.toUpperCase())) return NextResponse.json({ error: "Currency must be NGN or USD." }, { status: 400 });
    if (provider === "bachs" && (!payload.monthly_product_id || !payload.annual_product_id)) {
      return NextResponse.json({ error: "Add both Bachs recurring product IDs before saving." }, { status: 400 });
    }
    if (provider === "paystack" && (!payload.monthly_plan_code || !payload.annual_plan_code)) {
      return NextResponse.json({ error: "Add both Paystack plan codes before saving." }, { status: 400 });
    }
    const encrypted = encryptProviderPayload(payload);
    await query(
      `INSERT INTO platform_payment_configs (provider, mode, encrypted_payload, updated_by, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (provider, mode) DO UPDATE SET encrypted_payload = EXCLUDED.encrypted_payload, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [provider, mode, encrypted, admin.id]
    );
    return NextResponse.json({ ok: true, provider, mode, config: safeConfig(payload) });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Could not save provider settings." }, { status: error.status || 500 });
  }
}
