import { createHash } from "node:crypto";
import { query } from "./db";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 8;

function hashKey(value) {
  return createHash("sha256").update(value).digest("hex");
}

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return candidate.slice(0, 128);
}

/**
 * Persistent, database-backed rate limiting. The stored key is hashed so raw
 * email addresses and IP addresses are not written to the rate-limit table.
 */
export async function checkAuthRateLimit(request, action, email) {
  const keyHash = hashKey(`${action}:${String(email).trim().toLowerCase()}:${getClientIp(request)}`);
  const result = await query(
    `INSERT INTO auth_rate_limits (key_hash, attempts, window_started_at, updated_at)
     VALUES ($1, 1, NOW(), NOW())
     ON CONFLICT (key_hash) DO UPDATE SET
       attempts = CASE
         WHEN auth_rate_limits.window_started_at < NOW() - INTERVAL '${WINDOW_MINUTES} minutes' THEN 1
         ELSE auth_rate_limits.attempts + 1
       END,
       window_started_at = CASE
         WHEN auth_rate_limits.window_started_at < NOW() - INTERVAL '${WINDOW_MINUTES} minutes' THEN NOW()
         ELSE auth_rate_limits.window_started_at
       END,
       updated_at = NOW()
     RETURNING attempts, window_started_at + INTERVAL '${WINDOW_MINUTES} minutes' AS reset_at`,
    [keyHash]
  );
  const row = result.rows[0];
  return {
    allowed: Number(row.attempts) <= MAX_ATTEMPTS,
    retryAfterSeconds: Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000)),
  };
}
