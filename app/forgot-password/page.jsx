"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json(); setMessage(data.message || data.error || "Something went wrong.");
    } catch { setMessage("Network error. Please try again."); }
    finally { setBusy(false); }
  }
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#101312",color:"#f4f5f2",fontFamily:"Arial,sans-serif"}}><section style={{width:"100%",maxWidth:430,padding:30,border:"1px solid #303a35",borderRadius:20,background:"#171d19"}}><a href="/" style={{color:"#9be3b0",textDecoration:"none",fontWeight:700}}>daily manager</a><h1 style={{fontSize:27,margin:"28px 0 8px"}}>Reset your password</h1><p style={{color:"#aab5ad",lineHeight:1.6}}>Enter your account email. If an account exists, we’ll send a secure reset link.</p><form onSubmit={submit} style={{display:"grid",gap:14}}><label style={{display:"grid",gap:7}}>Email address<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} style={{padding:13,borderRadius:9,border:"1px solid #46534a",background:"#101512",color:"white"}}/></label><button disabled={busy} style={{padding:13,border:0,borderRadius:9,background:"#9be3b0",color:"#102017",fontWeight:700,cursor:"pointer"}}>{busy?"Sending…":"Send reset link"}</button></form>{message&&<p role="status" style={{marginTop:16,color:"#c6d4ca",lineHeight:1.5}}>{message}</p>}<p style={{marginTop:24}}><a href="/" style={{color:"#9be3b0"}}>Return to sign in</a></p></section></main>;
}
