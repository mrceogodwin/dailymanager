"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, Bell, CalendarDays, Check, ChevronDown, CircleHelp,
  FileText, FolderKanban, LayoutDashboard, ListTodo, LogOut, Plus, Search,
  Settings2, Sparkles, Target, X
} from "lucide-react";

const NAV = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "My tasks", icon: ListTodo },
  { label: "Projects", icon: FolderKanban },
  { label: "Planner", icon: CalendarDays },
  { label: "Notes", icon: FileText },
  { label: "Goals & insights", icon: Target },
  { label: "Tool library", icon: Activity },
  { label: "Settings", icon: Settings2 },
];

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

const inputStyle = { width: "100%", padding: "12px 13px", borderRadius: 11, border: "1px solid var(--line, #303538)", background: "#101213", color: "var(--text, #f4f2ef)", outline: "none" };
const buttonStyle = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid #ff9b73", borderRadius: 11, padding: "11px 15px", background: "linear-gradient(135deg,#ffc09d,#ff754a)", color: "#291109", fontWeight: 800, cursor: "pointer" };

export default function Home() {
  const [authMode, setAuthMode] = useState("signup");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [notes, setNotes] = useState([]);
  const [active, setActive] = useState("Overview");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState("");
  const [draft, setDraft] = useState({ title: "", body: "", description: "", due_at: "", project_id: "", priority: "medium" });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await api("/api/auth/me");
    setUser(data.user);
    setWorkspace(data.workspace);
    setTasks(data.tasks || []);
    setProjects(data.projects || []);
    setNotes(data.notes || []);
  }, []);

  useEffect(() => {
    refresh().catch(() => {}).finally(() => setLoading(false));
  }, [refresh]);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const q = search.trim().toLowerCase();
    return !q || task.title.toLowerCase().includes(q) || (task.project_name || "").toLowerCase().includes(q);
  }), [tasks, search]);
  const filteredProjects = useMemo(() => projects.filter((project) => !search.trim() || project.name.toLowerCase().includes(search.trim().toLowerCase())), [projects, search]);
  const completed = tasks.filter((task) => task.status === "done").length;
  const openTasks = tasks.length - completed;

  async function submitAuth(event) {
    event.preventDefault(); setAuthError(""); setBusy(true);
    try {
      const endpoint = authMode === "signup" ? "/api/auth/register" : "/api/auth/login";
      const payload = authMode === "signup" ? authForm : { email: authForm.email, password: authForm.password };
      await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
      await refresh();
      setNotice(authMode === "signup" ? "Your workspace is ready." : "Welcome back.");
    } catch (error) {
      setAuthError(error.message);
    } finally { setBusy(false); }
  }

  async function logout() {
    try { await api("/api/auth/logout", { method: "POST", body: "{}" }); } catch {}
    setUser(null); setWorkspace(null); setTasks([]); setProjects([]); setNotes([]); setAuthMode("login");
  }

  async function saveItem(event) {
    event.preventDefault();
    const kind = modal === "project" ? "project" : modal === "note" ? "note" : "task";
    const payload = kind === "project" ? { kind, name: draft.title, description: draft.body }
      : kind === "note" ? { kind, title: draft.title, body: draft.body }
      : { kind, title: draft.title, description: draft.description, due_at: draft.due_at || null, project_id: draft.project_id || null, priority: draft.priority };
    setBusy(true);
    try {
      await api("/api/workspace", { method: "POST", body: JSON.stringify(payload) });
      setModal(""); setDraft({ title: "", body: "", description: "", due_at: "", project_id: "", priority: "medium" });
      await refresh(); setNotice(kind === "note" ? "Note saved." : kind === "project" ? "Project created." : "Task added.");
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  async function toggleTask(task) {
    const status = task.status === "done" ? "todo" : "done";
    setTasks((items) => items.map((item) => item.id === task.id ? { ...item, status } : item));
    try { await api("/api/workspace", { method: "POST", body: JSON.stringify({ kind: "task_status", id: task.id, status }) }); await refresh(); }
    catch (error) { setNotice(error.message); await refresh().catch(() => {}); }
  }

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  if (loading) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0c0d", color: "#f4f2ef" }}>Loading DailyManager…</main>;

  if (!user) return (
    <main style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", background: "radial-gradient(ellipse at 70% -10%,#3d2118,transparent 34%),#0b0c0d", color: "#f4f2ef" }}>
      <section style={{ padding: "clamp(25px,6vw,76px)", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 600, borderRight: "1px solid #ffffff10" }}>
        <div style={{ fontWeight: 900, fontSize: 21, letterSpacing: "-.06em" }}><span style={{ display: "inline-grid", placeItems: "center", width: 36, height: 36, marginRight: 10, borderRadius: 12, background: "linear-gradient(145deg,#ffc19e,#ff754a)", color: "#29120a" }}>d</span>DailyManager</div>
        <div style={{ maxWidth: 550, padding: "70px 0" }}>
          <p style={{ color: "#ffb18b", fontSize: 11, letterSpacing: ".17em", fontWeight: 800 }}>YOUR WORK, IN A NEW DIMENSION</p>
          <h1 style={{ fontSize: "clamp(46px,6vw,78px)", lineHeight: .98, letterSpacing: "-.085em", margin: "22px 0" }}>Make space for <span style={{ color: "#ff9a70" }}>big things.</span></h1>
          <p style={{ color: "#9ba2a6", fontSize: 17, maxWidth: 430 }}>Projects, people, plans and progress. One focused workspace, with less noise and more momentum.</p>
          <div style={{ display: "flex", gap: 10, marginTop: 30, flexWrap: "wrap" }}>{["Tasks & projects", "Notes & planning", "One calm workspace"].map(x => <span key={x} style={{ border: "1px solid #303538", background: "#151719", padding: "9px 12px", borderRadius: 10, color: "#c3c7c9", fontSize: 12 }}>{x}</span>)}</div>
        </div>
        <small style={{ color: "#737b7f" }}>A more thoughtful way to manage the work that matters.</small>
      </section>
      <section style={{ display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ width: "min(100%,390px)" }}>
          <p style={{ color: "#ffb18b", fontSize: 11, letterSpacing: ".14em", fontWeight: 800 }}>{authMode === "signup" ? "YOUR NEXT CHAPTER STARTS HERE" : "GOOD TO SEE YOU AGAIN"}</p>
          <h2 style={{ fontSize: 34, letterSpacing: "-.07em", margin: "8px 0" }}>{authMode === "signup" ? "Build your workspace." : "Back to making progress."}</h2>
          <p style={{ color: "#9ba2a6", marginBottom: 24 }}>{authMode === "signup" ? "Start simple. Make it yours as you grow." : "Continue to your workspace."}</p>
          {authError && <p role="alert" style={{ background: "#271715", border: "1px solid #62332d", color: "#ffb1a5", padding: 12, borderRadius: 10, fontSize: 13 }}>{authError}</p>}
          <form onSubmit={submitAuth} style={{ display: "grid", gap: 14 }}>
            {authMode === "signup" && <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 750 }}>Your name<input style={inputStyle} required minLength={2} maxLength={120} autoComplete="name" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} placeholder="e.g. Alex Morgan" /></label>}
            <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 750 }}>Email address<input style={inputStyle} type="email" required maxLength={254} autoComplete="email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} placeholder="you@company.com" /></label>
            <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 750 }}>Password<input style={inputStyle} type="password" required minLength={authMode === "signup" ? 10 : 1} maxLength={128} autoComplete={authMode === "signup" ? "new-password" : "current-password"} value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} placeholder={authMode === "signup" ? "At least 10 characters" : "Your password"} /></label>
            <button style={{ ...buttonStyle, width: "100%", marginTop: 5 }} disabled={busy}>{busy ? "Please wait…" : authMode === "signup" ? "Create my workspace ↗" : "Continue to workspace →"}</button>
          </form>
          <p style={{ textAlign: "center", color: "#9ba2a6", fontSize: 12, marginTop: 20 }}>{authMode === "signup" ? "Already started? " : "New here? "}<button onClick={() => { setAuthMode(authMode === "signup" ? "login" : "signup"); setAuthError(""); }} style={{ border: 0, background: "none", color: "#ffb18b", fontWeight: 850, cursor: "pointer" }}>{authMode === "signup" ? "Log in" : "Create an account"}</button></p>
          <p style={{ color: "#9ba2a6", background: "#211914", border: "1px solid #493327", borderRadius: 10, padding: 12, fontSize: 11 }}>Your workspace data is saved to the connected database when configuration is complete. Billing is not active, and no payment will be taken here.</p>
        </div>
      </section>
    </main>
  );

  const create = (kind) => { setDraft({ title: "", body: "", description: "", due_at: "", project_id: "", priority: "medium" }); setModal(kind); };
  const heading = active === "Overview" ? "Good to see you, " + user.name.split(" ")[0] : active;
  const visibleTasks = filteredTasks;
  return (
    <main className="app-shell" style={{ minHeight: "100vh" }}>
      <aside className="sidebar">
        <a className="brand" href="#" onClick={e => { e.preventDefault(); setActive("Overview"); }}>
          <span className="brand-mark"><span/><span/><span/><span/></span><span className="brand-name">daily<span>manager</span><small>YOUR DAY, IN CONTROL</small></span>
        </a>
        <div className="workspace-switch"><span className="workspace-avatar">{workspace?.name?.[0] || "D"}</span><span className="workspace-copy"><b>{workspace?.name || "My workspace"}</b><small>{workspace?.plan === "free_trial" ? "Free trial" : workspace?.plan || "Workspace"}</small></span><ChevronDown size={15}/></div>
        <div className="nav-list">{NAV.map(({label,icon:Icon})=><button key={label} className={`nav-item ${active===label?"active":""}`} onClick={()=>setActive(label)}><Icon size={17} strokeWidth={1.8}/><span>{label}</span></button>)}</div>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={17}/></div><b>Make room for more</b><p>Unlock your full potential with DailyManager Pro.</p><button onClick={()=>setNotice("Billing is not connected yet.")}>Explore plans <ArrowRight size={14}/></button></div>
          <button className="nav-item" onClick={()=>setActive("Settings")}><Settings2 size={17}/>Settings</button>
          <button className="nav-item" onClick={()=>setNotice("Help center is coming in a later stage.")}><CircleHelp size={17}/>Help & support</button>
          <div className="profile"><div className="profile-avatar">{user.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}</div><div className="profile-copy"><b>{user.name}</b><small>{user.email}</small></div><button aria-label="Log out" title="Log out" onClick={logout} style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer" }}><LogOut size={16}/></button></div>
        </div>
      </aside>
      <section className="main-panel">
        <header className="topbar"><div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><b>{active}</b></div><div className="top-actions"><label className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks & projects…"/><kbd>⌕</kbd></label><button className="icon-button" aria-label="Notifications" onClick={()=>setNotice("You're all caught up.")}><Bell size={18}/></button><div className="top-avatar">{user.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot"/> YOUR WORKSPACE</div><h1>{heading}<span className="wave">✳</span></h1><p className="subtitle">{active==="Overview"?"A little progress each day adds up to big results.":"Your DailyManager workspace, all in one place."}</p></div><button className="primary-button" onClick={()=>create(active==="Projects"?"project":active==="Notes"?"note":"task")}><Plus size={17}/> {active==="Projects"?"New project":active==="Notes"?"New note":"New task"}</button></div>
          {active==="Overview" && <><div className="focus-banner"><div className="focus-orb"><Sparkles size={21}/></div><div className="focus-text"><span>YOUR DAILY FOCUS</span><b>Make today count, one thing at a time.</b><small>You have {openTasks} tasks left to move your day forward.</small></div><div className="focus-right"><div className="focus-progress"><span style={{width:`${tasks.length?completed/tasks.length*100:0}%`}}/></div><small>{completed} of {tasks.length} completed</small></div><Sparkles className="banner-spark" size={82}/></div><div className="stats-grid"><article className="stat-card"><div className="stat-top"><span className="stat-icon violet"><ListTodo size={18}/></span></div><p>Open tasks</p><div className="stat-number">{openTasks}</div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon green"><Check size={18}/></span></div><p>Completed</p><div className="stat-number">{completed}</div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon orange"><FolderKanban size={18}/></span></div><p>Active projects</p><div className="stat-number">{projects.length}</div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon pink"><FileText size={18}/></span></div><p>Notes</p><div className="stat-number">{notes.length}</div></article></div></>}
          {active==="Overview" && <section className="panel" style={{marginTop:20}}><div className="panel-heading"><div><h2>Focus queue</h2><p>Your next actions, ready when you are.</p></div><button className="period-select" onClick={()=>setActive("My tasks")}>View all <ArrowRight size={14}/></button></div>{visibleTasks.filter(t=>t.status!=="done").slice(0,6).map(t=><TaskRow key={t.id} task={t} onToggle={toggleTask}/>)}{!visibleTasks.filter(t=>t.status!=="done").length&&<p className="empty-state">No open tasks yet. Add your first one to get started.</p>}</section>}
          {active==="My tasks" && <section className="panel"><div className="panel-heading"><div><h2>All tasks</h2><p>{openTasks} open · {completed} completed</p></div></div>{visibleTasks.map(t=><TaskRow key={t.id} task={t} onToggle={toggleTask}/>)}{!visibleTasks.length&&<p className="empty-state">No tasks yet. Create one to get started.</p>}</section>}
          {active==="Projects" && <section className="panel"><div className="panel-heading"><div><h2>Your projects</h2><p>Keep milestones and work connected.</p></div><button className="primary-button" onClick={()=>create("project")}><Plus size={15}/> New project</button></div>{filteredProjects.map(p=><div key={p.id} className="task-row"><span className="stat-icon orange"><FolderKanban size={17}/></span><div className="task-info"><b>{p.name}</b><span>{p.description||"No description"} · {p.status}</span></div></div>)}{!filteredProjects.length&&<p className="empty-state">Your first project starts here.</p>}</section>}
          {active==="Notes" && <section className="panel"><div className="panel-heading"><div><h2>Workspace notes</h2><p>Keep decisions and useful ideas close.</p></div><button className="primary-button" onClick={()=>create("note")}><Plus size={15}/> New note</button></div>{notes.map(n=><article key={n.id} className="task-row"><FileText size={18}/><div className="task-info"><b>{n.title}</b><span style={{whiteSpace:"pre-wrap"}}>{n.body}</span></div></article>)}{!notes.length&&<p className="empty-state">Your knowledge hub starts with one good note.</p>}</section>}
          {active==="Planner" && <section className="panel"><div className="panel-heading"><div><h2>Upcoming work</h2><p>Open tasks and due dates.</p></div></div>{visibleTasks.filter(t=>t.status!=="done").map(t=><div key={t.id} className="task-row"><CalendarDays size={17}/><div className="task-info"><b>{t.title}</b><span>{t.due_at?new Date(t.due_at).toLocaleString():"No due date set"}</span></div></div>)}{!openTasks&&<p className="empty-state">Nothing scheduled yet.</p>}</section>}
          {active==="Goals & insights" && <section className="panel"><div className="panel-heading"><div><h2>Progress overview</h2><p>Measure the momentum you're building.</p></div></div><p>{completed} of {tasks.length} tasks completed ({tasks.length?Math.round(completed/tasks.length*100):0}%).</p><div className="focus-progress"><span style={{width:`${tasks.length?completed/tasks.length*100:0}%`}}/></div></section>}
          {active==="Tool library" && <section className="panel"><div className="panel-heading"><div><h2>Tool library</h2><p>Planned modules, not yet enabled.</p></div></div><p>Project planning, automation, calendar, CRM, finance, analytics and team tools will be built in stages.</p></section>}
          {active==="Settings" && <section className="panel"><div className="panel-heading"><div><h2>Workspace settings</h2><p>Your account and plan information.</p></div></div><p><b>Workspace:</b> {workspace?.name}</p><p><b>Account:</b> {user.email}</p><p><b>Plan:</b> {workspace?.plan}</p><p><b>Trial ends:</b> {workspace?.trial_ends_at?new Date(workspace.trial_ends_at).toLocaleDateString():"Not set"}</p><p>Billing is not connected. No payment will be taken in this version.</p></section>}
        </div>
      </section>
      {modal && <div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModal("");}} style={{position:"fixed",inset:0,zIndex:100,display:"grid",placeItems:"center",padding:18,background:"#000b",backdropFilter:"blur(7px)"}}><form onSubmit={saveItem} style={{width:"min(100%,450px)",padding:24,border:"1px solid #373c3f",borderRadius:18,background:"#17191b",display:"grid",gap:14,boxShadow:"0 30px 90px #0009"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h2 style={{margin:0}}>{modal==="project"?"Create a project":modal==="note"?"Capture a note":"Add a task"}</h2><button type="button" onClick={()=>setModal("")} aria-label="Close" style={{border:0,background:"transparent",color:"inherit",cursor:"pointer"}}><X size={18}/></button></div><label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>{modal==="project"?"Project name":modal==="note"?"Note title":"Task name"}<input style={inputStyle} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} required maxLength={modal==="task"?500:modal==="note"?200:160} autoFocus placeholder={modal==="task"?"What needs doing?":"Give it a clear name"}/></label>{modal!=="task"&&<label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>{modal==="note"?"Note":"Description (optional)"}<textarea style={{...inputStyle,minHeight:100,resize:"vertical"}} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})} maxLength={modal==="note"?20000:2000}/></label>}{modal==="task"&&<><label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>Description (optional)<textarea style={{...inputStyle,minHeight:76,resize:"vertical"}} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} maxLength={4000} placeholder="Add helpful context"/></label><label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>Due date (optional)<input style={inputStyle} type="date" value={draft.due_at} onChange={e=>setDraft({...draft,due_at:e.target.value})}/></label><label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>Project<select style={inputStyle} value={draft.project_id} onChange={e=>setDraft({...draft,project_id:e.target.value})}><option value="">Personal / no project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>Priority<select style={inputStyle} value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label></>}<button style={buttonStyle} disabled={busy}>{busy?"Saving…":"Save"}</button></form></div>}
      {notice && <div role="status" style={{position:"fixed",right:20,bottom:20,zIndex:120,background:"#25282a",border:"1px solid #464b4e",borderRadius:11,padding:"12px 16px",color:"#f4f2ef",boxShadow:"0 15px 35px #0008",maxWidth:"90vw"}}>{notice}</div>}
    </main>
  );
}

function TaskRow({ task, onToggle }) {
  return <div className="task-row"><button aria-label={task.status==="done"?"Mark task open":"Complete task"} onClick={()=>onToggle(task)} style={{width:20,height:20,flexShrink:0,borderRadius:7,border:task.status==="done"?"1px solid #70d5a1":"1px solid #555d61",background:task.status==="done"?"#70d5a1":"transparent",color:"#111",display:"grid",placeItems:"center",cursor:"pointer"}}>{task.status==="done"&&<Check size={13}/>}</button><div className="task-info"><b style={{textDecoration:task.status==="done"?"line-through":"none",opacity:task.status==="done"?.65:1}}>{task.title}</b><span>{task.project_name||"Personal"} · {task.priority||"medium"} priority{task.due_at?" · "+new Date(task.due_at).toLocaleDateString():""}</span></div><span className="task-status">{task.status==="done"?"Done":task.priority==="urgent"?"Urgent":task.priority==="high"?"High":"Open"}</span></div>;
}
