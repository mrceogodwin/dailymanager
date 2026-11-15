"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function BillingReturnPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("Confirming your payment securely…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const reference = params.get("reference") || params.get("trxref");
    if (!reference) {
      setFailed(true);
      setMessage("No payment reference was returned. Open Settings to check your billing status.");
      return;
    }
    (async () => {
      try {
        const response = await fetch("/api/billing/verify", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "We could not verify this payment.");
        if (!cancelled) {
          setMessage("Payment confirmed. Your workspace subscription is active.");
          setTimeout(() => router.replace("/"), 1800);
        }
      } catch (error) {
        if (!cancelled) {
          setFailed(true);
          setMessage(error.message || "Payment verification failed. Please contact support if you were charged.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [params, router]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#101313", color: "#f5f7f6", fontFamily: "Arial, sans-serif" }}>
      <section style={{ width: "min(100%, 480px)", padding: 32, border: "1px solid #303a37", borderRadius: 20, background: "#171d1b", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, margin: "0 auto 18px", borderRadius: 16, display: "grid", placeItems: "center", background: failed ? "#492b2b" : "#233b31", color: failed ? "#ffb5b5" : "#a8edc4", fontSize: 24 }}>{failed ? "!" : "✓"}</div>
        <h1 style={{ fontSize: 22, margin: "0 0 10px" }}>DailyManager billing</h1>
        <p style={{ color: "#bdc8c2", lineHeight: 1.6, margin: 0 }}>{message}</p>
        {failed && <button onClick={() => router.replace("/")} style={{ marginTop: 22, padding: "11px 18px", border: 0, borderRadius: 10, background: "#b9edce", color: "#102219", fontWeight: 700 }}>Return to DailyManager</button>}
      </section>
    </main>
  );
}
