"use client";

import { useEffect, useState } from "react";

export default function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch(error => {
        console.warn("DailyManager offline app shell could not be registered.", error);
      });
    }

    setInstalled(window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;
  return (
    <div role="status" aria-live="polite" style={{ position: "fixed", zIndex: 200, left: 12, right: 12, bottom: "max(12px, env(safe-area-inset-bottom))", padding: "11px 14px", borderRadius: 12, background: "#3b2c12", border: "1px solid #8b6b32", color: "#ffe2a1", fontSize: 13, boxShadow: "0 8px 28px #0006" }}>
      You're offline{installed ? " · App mode" : ""}. Showing the latest workspace data saved on this device. New changes will need to sync when you're online.
    </div>
  );
}
