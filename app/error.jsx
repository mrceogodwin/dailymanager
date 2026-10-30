"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("DailyManager route error:", error);
  }, [error]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#0d0e12", color: "#f4f4f7", fontFamily: "Arial, sans-serif" }}>
      <section style={{ width: "100%", maxWidth: 440, padding: 28, border: "1px solid #34343d", borderRadius: 18, background: "#17181f", textAlign: "center", boxShadow: "0 24px 80px #0007" }}>
        <div style={{ width: 48, height: 48, margin: "0 auto 16px", display: "grid", placeItems: "center", borderRadius: 14, background: "#382522", color: "#ffad91" }}>
          <AlertTriangle size={23} />
        </div>
        <h1 style={{ margin: "0 0 9px", fontSize: 21 }}>This page hit a problem</h1>
        <p style={{ margin: "0 auto 22px", maxWidth: 340, color: "#a9abb6", fontSize: 13, lineHeight: 1.65 }}>
          Your work is still saved. Try loading this page again. If the problem continues, return to your workspace and try another section.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => reset()} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: 0, borderRadius: 10, padding: "11px 15px", background: "linear-gradient(135deg,#ffc09d,#ff754a)", color: "#291109", fontWeight: 700, cursor: "pointer" }}>
            <RefreshCw size={15} /> Try again
          </button>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", border: "1px solid #41424c", borderRadius: 10, padding: "11px 15px", color: "#eeeef2", textDecoration: "none", fontSize: 13 }}>
            Back to workspace
          </a>
        </div>
      </section>
    </main>
  );
}
