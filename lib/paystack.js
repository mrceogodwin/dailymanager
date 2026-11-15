import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function getPaystackSecret() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw Object.assign(new Error("Paystack is not configured yet."), { status: 503 });
  return secret;
}

export function getBillingPlan(key) {
  const normalized = key === "annual" ? "annual" : key === "monthly" ? "monthly" : null;
  if (!normalized) throw Object.assign(new Error("Choose a valid billing interval."), { status: 400 });
  const code = process.env[`PAYSTACK_PLAN_${normalized.toUpperCase()}`];
  const amount = Number(process.env[`DAILYMANAGER_PLAN_${normalized.toUpperCase()}_AMOUNT_KOBO`]);
  if (!code || !Number.isSafeInteger(amount) || amount <= 0) {
    throw Object.assign(new Error("The selected subscription plan is not configured yet."), { status: 503 });
  }
  return { key: normalized, code, amount };
}

export async function paystackRequest(path, options = {}) {
  const secret = getPaystackSecret();
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status === false) {
    const error = new Error(payload.message || "Paystack request failed.");
    error.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw error;
  }
  return payload.data;
}

export function verifyPaystackSignature(rawBody, signature) {
  const secret = getPaystackSecret();
  if (!signature || typeof signature !== "string") return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function newBillingReference() {
  return `dm_${Date.now()}_${randomBytes(12).toString("hex")}`;
}
