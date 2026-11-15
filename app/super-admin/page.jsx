"use client";

import { useEffect, useState } from "react";

const field = { width: "100%", padding: "11px 12px", border: "1px solid #343b40", borderRadius: 10, background: "#101416", color: "#f5f7f7", marginTop: 6 };
const label = { display: "block", color: "#d7dddd", fontSize: 13, marginBottom: 14 };

export default function SuperAdminPage() {
  const [provider, setProvider] = useState("paystack");
  const [mode, setMode] = useState("test");
  const [values, setValues] = useState({});
  const [saved, setSaved] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError(""); setNotice("");
    try {
      const response = await fetch(`/api/super-admin/payment-config?provider=${provider}`, { credentials: "same-origin", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load settings.");
      setSaved(data.configs || {});
      setValues({});
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [provider]);

  function update(key, value) { setValues(current => ({ ...current, [key]: value })); }

  async function save(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/super-admin/payment-config", {
        method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, mode, ...values })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save settings.");
      setNotice(`${provider === "bachs" ? "Bachs" : "Paystack"} ${mode} credentials saved securely.`);
      setValues({});
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const keys = provider === "paystack"
    ? [
      ["secret_key","Secret key","password"],["webhook_secret","Webhook signing secret (optional if same as secret key)","password"],
      ["public_key","Public key (optional)","text"],["monthly_plan_code","Monthly plan code","text"],["annual_plan_code","Annual plan code","text"],
      ["monthly_amount","Monthly amount (kobo)","text"],["annual_amount","Annual amount (kobo)","text"],["currency","Currency (NGN or USD)","text"]
    ]
    : [
      ["secret_key","Bachs API secret key","password"],["webhook_secret","Bachs webhook signing secret","password"],
      ["monthly_product_id","Monthly recurring product ID","text"],["annual_product_id","Annual recurring product ID","text"],
      ["monthly_amount","Monthly amount (USD)","text"],["annual_amount","Annual amount (USD)","text"],["currency","Subscription currency (USD currently)","text"]
    ];

  const status = saved[mode] || {};
  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/billing/bachs/webhook` : "/api/billing/bachs/webhook";

  return <main style={{ minHeight: "100vh", background: "#0b0e10", color: "#f4f6f6", padding: "32px 18px", fontFamily: "Inter,system-ui,sans-serif" }}>
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <a href="/" style={{ color: "#aab4b7", textDecoration: "none", fontSize: 13 }}>← Back to DailyManager</a>
      <header style={{ margin: "24px 0" }}><p style={{ color: "#ff9b73", fontSize: 11, letterSpacing: 2, fontWeight: 800 }}>PLATFORM CONTROL</p><h1 style={{ fontSize: 30, margin: "6px 0" }}>Super Admin Console</h1><p style={{ color: "#9da8ab", lineHeight: 1.6 }}>Manage payment providers for every DailyManager workspace. Credentials are encrypted before being stored.</p></header>
      <section style={{ border: "1px solid #283034", background: "#121719", borderRadius: 16, padding: 18, marginBottom: 18 }}>
        <h2 style={{ fontSize: 17, marginTop: 0 }}>Payment provider configuration</h2>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 18 }}>
          <button onClick={() => setProvider("paystack")} style={{ ...field, width: "auto", margin: 0, borderColor: provider === "paystack" ? "#ff9b73" : "#343b40" }}>Paystack</button>
          <button onClick={() => setProvider("bachs")} style={{ ...field, width: "auto", margin: 0, borderColor: provider === "bachs" ? "#ff9b73" : "#343b40" }}>Bachs.io</button>
          <select value={mode} onChange={e => setMode(e.target.value)} style={{ ...field, width: "auto", margin: 0 }}><option value="test">Sandbox / Test</option><option value="live">Live</option></select>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", color: "#9da8ab", fontSize: 12, marginBottom: 16 }}>
          <span>API key: {status.configured ? "Saved" : "Not configured"}</span>
          <span>Webhook secret: {status.webhook_configured ? "Saved" : "Not configured"}</span>
          <span>Monthly product/plan: {status.monthly_product_configured ? "Saved" : "Missing"}</span>
          <span>Annual product/plan: {status.annual_product_configured ? "Saved" : "Missing"}</span>
        </div>
        <form onSubmit={save}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "0 14px" }}>
            {keys.map(([key,title,type]) => <label key={key} style={label}>{title}
              <input style={field} type={type} autoComplete="new-password" value={values[key] || ""} onChange={e => update(key,e.target.value)} placeholder={key.includes("secret") || key === "secret_key" ? (status.configured ? "Saved securely — enter only to replace" : "Paste credential") : (status[key] || (key === "currency" ? (provider === "bachs" ? "USD" : "NGN") : ""))} />
            </label>)}
          </div>
          {provider === "bachs" && <p style={{ color: "#b4bec0", fontSize: 12, lineHeight: 1.6 }}>Bachs recurring products must be created in your Bachs dashboard first. Subscriptions currently support USD cards; NGN recurring billing requires Bachs to enable it on your account.</p>}
          <button disabled={busy} style={{ border: 0, borderRadius: 10, padding: "12px 18px", background: "#ff9b73", color: "#21110b", fontWeight: 800, cursor: busy ? "wait" : "pointer" }}>{busy ? "Saving…" : "Save provider settings"}</button>
        </form>
        {error && <p role="alert" style={{ color: "#ff9a9a" }}>{error}</p>}
        {notice && <p role="status" style={{ color: "#8fe0b0" }}>{notice}</p>}
      </section>
      <section style={{ border: "1px solid #283034", background: "#121719", borderRadius: 16, padding: 18 }}>
        <h2 style={{ fontSize: 17, marginTop: 0 }}>Webhook endpoints</h2>
        <p style={{ color: "#9da8ab", fontSize: 12 }}>Register the matching URL in each provider dashboard. Use separate sandbox and live signing secrets.</p>
        <p style={{ fontSize: 13, overflowWrap: "anywhere" }}>Paystack: <code>{typeof window !== "undefined" ? window.location.origin : ""}/api/billing/webhook</code></p>
        <p style={{ fontSize: 13, overflowWrap: "anywhere" }}>Bachs: <code>{webhookUrl}</code></p>
        <p style={{ color: "#9da8ab", fontSize: 12, lineHeight: 1.6 }}>Never paste secrets into chat or source code. Existing secrets are never sent back to this page. Add them here over HTTPS after Super Admin access has been enabled.</p>
      </section>
    </div>
  </main>;
}
