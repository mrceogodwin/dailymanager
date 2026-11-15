import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey() {
  const raw = process.env.DAILYMANAGER_CREDENTIAL_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(raw)) {
    throw Object.assign(new Error("Payment credential encryption is not configured. Add a 32-byte hex DAILYMANAGER_CREDENTIAL_ENCRYPTION_KEY in Vercel."), { status: 503 });
  }
  return Buffer.from(raw, "hex");
}

export function encryptProviderPayload(payload) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptProviderPayload(value) {
  const [ivText, tagText, dataText] = String(value || "").split(".");
  if (!ivText || !tagText || !dataText) throw new Error("Stored provider configuration is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(dataText, "base64")), decipher.final()]).toString("utf8"));
}

export function getProviderMode() {
  // Vercel Preview builds also have NODE_ENV=production; only the Production
  // deployment is allowed to use live payment credentials.
  return process.env.VERCEL_ENV === "production" ? "live" : "test";
}
