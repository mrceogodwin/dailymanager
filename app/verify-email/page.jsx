"use client";

import { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("Checking your verification link…");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("token") || ""); }, []);
  async function verify() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/verification/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await response.json(); setMessage(data.message || data.error || "Something went wrong.");
    } catch { setMessage("Network error. Please try again."); }
    finally { setBusy(false); }
  }

  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#101312",color:"#f4f5f2",fontFamily:"Arial,sans-serif"}}><section style={{width:"100%",maxWidth:430,padding:30,border:"1px solid #303a35",borderRadius:20,background:"#171d19"}}><a href="/" style={{color:"#9be3b0",textDecoration:"none",fontWeight:700}}>daily manager</a><h1 style={{fontSize:27,margin:"28px 0 8px"}}>Verify your email</h1><p role="status" style={{color:"#c6d4ca",lineHeight:1.6}}>{busy?"Verifying…":message}</p>{token&&<button onClick={verify} disabled={busy} style={{padding:13,border:0,borderRadius:9,background:"#9be3b0",color:"#102017",fontWeight:700,cursor:"pointer"}}>{busy?"Verifying…":"Verify email address"}</button>}<a href="/" style={{display:"inline-block",marginTop:20,color:"#9be3b0"}}>Continue to DailyManager</a></section></main>;
}
