const RESEND_ENDPOINT = "https://api.resend.com/emails";

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DAILYMANAGER_FROM_EMAIL;
  const appUrl = process.env.DAILYMANAGER_APP_URL;
  if (!apiKey || !from || !appUrl) {
    throw Object.assign(new Error("Account email is not configured. Set RESEND_API_KEY, DAILYMANAGER_FROM_EMAIL, and DAILYMANAGER_APP_URL."), { status: 503 });
  }
  let base;
  try { base = new URL(appUrl); } catch {
    throw Object.assign(new Error("DAILYMANAGER_APP_URL must be a valid HTTPS URL."), { status: 503 });
  }
  if (base.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw Object.assign(new Error("DAILYMANAGER_APP_URL must use HTTPS in production."), { status: 503 });
  }
  return { apiKey, from, baseUrl: base.origin };
}

export async function sendAccountActionEmail({ to, name, purpose, token }) {
  const { apiKey, from, baseUrl } = getEmailConfig();
  const isReset = purpose === "password_reset";
  const path = isReset ? "/reset-password" : "/verify-email";
  const url = new URL(path, baseUrl);
  url.searchParams.set("token", token);
  const action = isReset ? "Reset your password" : "Verify your email";
  const expiry = isReset ? "30 minutes" : "24 hours";
  const greeting = String(name || "there").replace(/[<>]/g, "");
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `DailyManager: ${action.toLowerCase()}`,
      text: `Hello ${greeting},\n\nUse this secure link to ${action.toLowerCase()}:\n${url.toString()}\n\nThis link expires in ${expiry}. If you did not request this, you can ignore this email.\n\nDailyManager`,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("DailyManager email provider rejected a message", response.status, detail.slice(0, 500));
    throw Object.assign(new Error("We could not send the account email. Please try again later."), { status: 502 });
  }
  return true;
}
