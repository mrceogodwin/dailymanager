"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const COLLECTIONS = ["members", "projects", "tasks", "notes", "task_comments", "activity", "billing_payments"];

function validateBackup(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The selected file is not a valid DailyManager backup.");
  if (value.version !== 1) throw new Error("This backup version is not supported. Only version 1 can be previewed.");
  if (value.format === "DailyManager workspace export") {
    if (!value.workspace || typeof value.workspace !== "object" || !value.workspace.id) throw new Error("The workspace export is missing its workspace identity.");
    const counts = {};
    for (const key of COLLECTIONS) {
      if (value[key] !== undefined && !Array.isArray(value[key])) throw new Error("The " + key.replaceAll("_", " ") + " section must be a list.");
      counts[key] = Array.isArray(value[key]) ? value[key].length : 0;
    }
    return { kind: "Workspace export", workspaceName: value.workspace.name || "Unnamed workspace", workspaceId: String(value.workspace.id), timestamp: value.exported_at, counts, pending: 0, warning: "This file may contain historical workspace records and billing history. Preview only: nothing has been imported or changed." };
  }
  if (value.format === "DailyManager on-device backup") {
    const snapshot = value.snapshot;
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) throw new Error("The device backup is missing its saved workspace snapshot.");
    if (!snapshot.workspace || !snapshot.workspace.id) throw new Error("The saved snapshot has no workspace identity.");
    const counts = {
      members: Array.isArray(snapshot.members) ? snapshot.members.length : 0,
      projects: Array.isArray(snapshot.projects) ? snapshot.projects.length : 0,
      tasks: Array.isArray(snapshot.tasks) ? snapshot.tasks.length : 0,
      notes: Array.isArray(snapshot.notes) ? snapshot.notes.length : 0,
      task_comments: 0,
      activity: 0,
      billing_payments: 0
    };
    const pending = Array.isArray(value.pending_offline_changes) ? value.pending_offline_changes.length : 0;
    if (value.pending_offline_changes !== undefined && !Array.isArray(value.pending_offline_changes)) throw new Error("Pending offline changes must be a list.");
    return { kind: "On-device backup", workspaceName: snapshot.workspace.name || "Unnamed workspace", workspaceId: String(value.workspace_id || snapshot.workspace.id), timestamp: value.exported_at || value.saved_at, counts, pending, warning: pending ? "This backup contains queued offline changes. They are not replayed by this preview and must be reconciled carefully before any restore." : "This device snapshot is a local copy of workspace data. Preview only: nothing has been imported or changed." };
  }
  throw new Error("Unrecognized backup format. Choose a DailyManager workspace export or on-device backup.");
}

export default function RestorePreviewPage() {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [backupPayload, setBackupPayload] = useState(null);
  const [serverPreview, setServerPreview] = useState(null);
  const [checking, setChecking] = useState(false);

  async function inspectFile(event) {
    const file = event.target.files?.[0];
    setPreview(null);
    setError("");
    setFileName(file?.name || "");
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("This file is larger than 15 MB. Choose a smaller backup file.");
      return;
    }
    setReading(true);
    try {
      const parsed = JSON.parse(await file.text());
      setPreview(validateBackup(parsed));
    } catch (reason) {
      setError(reason instanceof SyntaxError ? "The file is not valid JSON. It may be damaged or incomplete." : reason.message || "Could not inspect this backup.");
    } finally {
      setReading(false);
    }
  }


  async function checkAgainstWorkspace() {
    if (!backupPayload || checking) return;
    setChecking(true);
    setError("");
    setServerPreview(null);
    try {
      const response = await fetch("/api/workspace/restore/preview", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupPayload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not check this backup against the workspace.");
      setServerPreview(result);
    } catch (reason) {
      setError(reason.message || "Could not run the conflict check.");
    } finally {
      setChecking(false);
    }
  }

  const totalRecords = useMemo(() => preview ? Object.values(preview.counts).reduce((sum, count) => sum + count, 0) : 0, [preview]);

  return (
    <main style={{minHeight:"100vh",background:"#0b0d0e",color:"#f4f2ef",padding:"clamp(20px,5vw,56px)",fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        <Link href="/" style={{color:"#f0a77f",textDecoration:"none",fontSize:13}}>← Back to DailyManager</Link>
        <p style={{marginTop:36,fontSize:11,letterSpacing:2,color:"#f0a77f",fontWeight:800}}>WORKSPACE SAFETY</p>
        <h1 style={{fontSize:"clamp(30px,6vw,46px)",letterSpacing:-1.5,margin:"8px 0 12px"}}>Inspect a backup</h1>
        <p style={{color:"#aeb5b7",lineHeight:1.7,maxWidth:620}}>Choose a DailyManager backup to check its format, workspace identity and record counts before any recovery decision.</p>

        <section style={{marginTop:28,padding:22,border:"1px solid #343a3d",borderRadius:18,background:"#141819"}}>
          <label htmlFor="backup-file" style={{display:"block",fontSize:13,fontWeight:700,marginBottom:12}}>Select backup file (.json)</label>
          <input id="backup-file" type="file" accept=".json,application/json" onChange={inspectFile} style={{display:"block",width:"100%",padding:14,border:"1px dashed #596164",borderRadius:12,background:"#0d1112",color:"#e9eded"}} />
          <p style={{fontSize:11,color:"#879194",lineHeight:1.6,marginBottom:0}}>Maximum file size: 15 MB. The file is read in this browser for inspection; it is not uploaded.</p>
        </section>

        {reading && <p role="status" style={{marginTop:18,color:"#f0c49e"}}>Inspecting backup…</p>}
        {error && <p role="alert" style={{marginTop:18,padding:14,borderRadius:10,border:"1px solid #75443d",background:"#2a1715",color:"#ffb5a6"}}>{error}</p>}

        {preview && <section aria-live="polite" style={{marginTop:20,padding:22,border:"1px solid #3b5148",borderRadius:18,background:"#121a17"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:11,letterSpacing:1.2,color:"#9fe0b7",fontWeight:800}}>BACKUP VALIDATION PASSED</span>
            <span style={{fontSize:11,color:"#aab4b0"}}>{preview.kind}</span>
          </div>
          <h2 style={{fontSize:23,margin:"14px 0 4px"}}>{preview.workspaceName}</h2>
          <p style={{fontSize:11,color:"#aab4b0",overflowWrap:"anywhere",marginTop:4}}>Workspace ID: {preview.workspaceId}</p>
          <p style={{fontSize:12,color:"#aab4b0"}}>File: {fileName}{preview.timestamp ? " · Exported: " + new Date(preview.timestamp).toLocaleString() : ""}</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(135px,1fr))",gap:9,marginTop:20}}>
            {Object.entries(preview.counts).filter(([,count])=>count>0).map(([key,count])=><div key={key} style={{padding:13,borderRadius:11,background:"#1b2420",border:"1px solid #34443c"}}><div style={{fontSize:22,fontWeight:800}}>{count}</div><div style={{fontSize:11,color:"#b3c1b9",marginTop:4,textTransform:"capitalize"}}>{key.replaceAll("_"," ")}</div></div>)}
            <div style={{padding:13,borderRadius:11,background:"#1b2420",border:"1px solid #34443c"}}><div style={{fontSize:22,fontWeight:800}}>{totalRecords}</div><div style={{fontSize:11,color:"#b3c1b9",marginTop:4}}>Total listed records</div></div>
            {preview.pending>0&&<div style={{padding:13,borderRadius:11,background:"#2b2417",border:"1px solid #6b5730"}}><div style={{fontSize:22,fontWeight:800,color:"#f1cf8c"}}>{preview.pending}</div><div style={{fontSize:11,color:"#d8c69e",marginTop:4}}>Pending offline changes</div></div>}
          </div>
          <p style={{fontSize:12,lineHeight:1.65,color:"#d4ddd7",marginTop:18}}>{preview.warning}</p>
          <button type="button" onClick={checkAgainstWorkspace} disabled={checking} style={{marginTop:10,padding:"12px 15px",border:0,borderRadius:10,background:"#ffc09d",color:"#291109",fontWeight:800,cursor:checking?"wait":"pointer"}}>{checking?"Checking workspace…":"Check against my workspace"}</button>
          <p style={{fontSize:11,color:"#aab4b0",lineHeight:1.6}}>This sends the selected backup to a private, owner-only server check. It performs read-only comparisons and makes no database changes.</p>
        </section>}


        {serverPreview && <section aria-live="polite" style={{marginTop:18,padding:20,border:"1px solid #435b4d",borderRadius:14,background:"#111a15"}}>
          <b style={{fontSize:13,color:"#a7e0b8"}}>Read-only workspace conflict check complete</b>
          <p style={{fontSize:12,color:"#c9d5cd",lineHeight:1.6}}>Current workspace: {serverPreview.workspace?.name || "Workspace"} · {serverPreview.total_records} backup records inspected.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(125px,1fr))",gap:8}}>
            {Object.entries(serverPreview.existing_id_conflicts || {}).map(([key,count])=><div key={key} style={{padding:11,borderRadius:9,background:"#1b2420"}}><b style={{fontSize:19}}>{count}</b><div style={{fontSize:10,color:"#aab4b0",textTransform:"capitalize"}}>{key.replaceAll("_"," ")} ID conflicts</div></div>)}
          </div>
          <p style={{fontSize:12,color:serverPreview.reference_problem_count?"#f0c49e":"#a7e0b8",lineHeight:1.6,marginBottom:4}}>{serverPreview.reference_problem_count} broken or missing reference issue(s) detected.</p>
          {(serverPreview.reference_problems || []).length>0 && <ul style={{fontSize:11,color:"#d8c7ad",lineHeight:1.6,paddingLeft:18}}>{serverPreview.reference_problems.map((problem,index)=><li key={index}>{problem}</li>)}</ul>}
          <p style={{fontSize:11,color:"#aab4b0",lineHeight:1.6,marginBottom:0}}>No records were inserted, updated or deleted. {serverPreview.recommendation}</p>
        </section>}

        <section style={{marginTop:20,padding:18,border:"1px solid #5c4b31",borderRadius:14,background:"#211d16"}}>
          <b style={{fontSize:13,color:"#f0d09b"}}>Recovery writes are not enabled yet</b>
          <p style={{fontSize:12,color:"#c9bda7",lineHeight:1.7,marginBottom:0}}>This screen validates a file and can compare it with your current workspace. It does not import, replay offline changes, overwrite records or modify your Neon database. A future restore operation must resolve identity mapping and references, then require your explicit confirmation before writing anything.</p>
        </section>
      </div>
    </main>
  );
}
