import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not configured; DailyManager database routes will return a setup error.");
}

const globalForPool = globalThis;
export const pool = globalForPool.__dailyManagerPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 8_000,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : undefined,
});

if (process.env.NODE_ENV !== "production") globalForPool.__dailyManagerPool = pool;

export async function query(text, values = []) {
  if (!process.env.DATABASE_URL) {
    const error = new Error("Database is not configured. Add DATABASE_URL to the Vercel project environment variables.");
    error.status = 503;
    throw error;
  }
  return pool.query(text, values);
}
