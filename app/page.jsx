"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, Bell, CalendarDays, Check, ChevronDown, CircleHelp,
  FileText, FolderKanban, LayoutDashboard, ListTodo, LogOut, Plus, Search,
  Settings2, Sparkles, Target, X, Star, ChevronRight, Play, Clock, ShieldCheck, ChartNoAxesCombined, Users, Layers, Zap, CheckCircle2, ArrowUpRight, Pencil, Trash2
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

const TOOL_CATEGORIES = [
  { name: "Tasks & Work Intake", count: 20, status: "Available", detail: "Create, prioritize, filter, and complete workspace tasks." },
  { name: "Projects & Portfolio", count: 20, status: "Available", detail: "Organize projects and review task progress." },
  { name: "Planning & Scheduling", count: 20, status: "In progress", detail: "Planner, due dates, and upcoming workload." },
  { name: "Docs & Knowledge", count: 20, status: "In progress", detail: "Notes are available; shared documents and knowledge bases are planned." },
  { name: "Chat & Collaboration", count: 20, status: "Planned", detail: "Team conversations, mentions, and shared decisions." },
  { name: "Automation & Workflows", count: 20, status: "Planned", detail: "Rules, triggers, approvals, and recurring workflows." },
  { name: "AI Work Assistant", count: 20, status: "Planned", detail: "Summaries, planning assistance, and grounded suggestions." },
  { name: "Goals & OKRs", count: 20, status: "In progress", detail: "Current completion insights; linked goals and key results are planned." },
  { name: "Time & Capacity", count: 20, status: "Planned", detail: "Time tracking, workload, capacity, and timesheets." },
  { name: "Reports & Analytics", count: 20, status: "In progress", detail: "Current basic insights; custom reports and forecasting are planned." },
  { name: "Forms & Requests", count: 20, status: "Planned", detail: "Intake forms, routing, and request queues." },
  { name: "CRM & Client Work", count: 20, status: "Planned", detail: "Client records, pipelines, and relationship history." },
  { name: "Finance & Billing", count: 20, status: "Planned", detail: "Budgets, expenses, invoicing, and subscription operations." },
  { name: "People & HR", count: 20, status: "Planned", detail: "Onboarding, team directories, leave, and people operations." },
  { name: "Product & Agile", count: 20, status: "Planned", detail: "Backlogs, sprints, releases, and product feedback." },
  { name: "Software & IT Ops", count: 20, status: "Planned", detail: "Incidents, service requests, assets, and engineering workflows." },
  { name: "Marketing & Content", count: 20, status: "Planned", detail: "Campaigns, calendars, approvals, and content production." },
  { name: "Sales & Revenue", count: 20, status: "Planned", detail: "Lead tracking, deals, forecasts, and handoffs." },
  { name: "Customer Support", count: 20, status: "Planned", detail: "Tickets, service levels, knowledge articles, and customer feedback." },
  { name: "Files & Assets", count: 20, status: "Planned", detail: "Shared files, versioning, approvals, and asset libraries." },
  { name: "Security & Governance", count: 20, status: "Planned", detail: "Access policies, audit history, retention, and compliance controls." },
  { name: "Admin & Workspace", count: 20, status: "Planned", detail: "Workspace setup, roles, templates, and organization controls." },
  { name: "Integrations & APIs", count: 20, status: "Planned", detail: "Connectors, webhooks, API keys, and integration monitoring." },
  { name: "Personal Productivity", count: 20, status: "Planned", detail: "Focus sessions, routines, personal planning, and reminders." },
  { name: "Industry & Advanced Workflows", count: 20, status: "Planned", detail: "Configurable workflow packs for specialized teams." },
];

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
  const [members, setMembers] = useState([]);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("member");
  const [active, setActive] = useState("Overview");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState("");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [draft, setDraft] = useState({ title: "", body: "", description: "", due_at: "", project_id: "", priority: "medium" });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [annualPreview, setAnnualPreview] = useState(false);
  const [taskFilter, setTaskFilter] = useState("all");
  const [taskSort, setTaskSort] = useState("due");
  const [toolSearch, setToolSearch] = useState("");
  const [toolFilter, setToolFilter] = useState("All");

  const refresh = useCallback(async () => {
    const data = await api("/api/auth/me");
    setUser(data.user);
    setWorkspace(data.workspace);
    setTasks(data.tasks || []);
    setProjects(data.projects || []);
    setNotes(data.notes || []);
    setMembers(data.members || []);
  }, []);

  useEffect(() => {
    refresh().catch(() => {}).finally(() => setLoading(false));
  }, [refresh]);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const q = search.trim().toLowerCase();
    const title = typeof task?.title === "string" ? task.title : "";
    const projectName = typeof task?.project_name === "string" ? task.project_name : "";
    const description = typeof task?.description === "string" ? task.description : "";
    const priority = typeof task?.priority === "string" ? task.priority : "";
    return !q || title.toLowerCase().includes(q) || description.toLowerCase().includes(q) || projectName.toLowerCase().includes(q) || priority.toLowerCase().includes(q);
  }), [tasks, search]);
  const filteredProjects = useMemo(() => projects.filter((project) => {
    const q = search.trim().toLowerCase();
    const name = typeof project?.name === "string" ? project.name : "";
    return !q || name.toLowerCase().includes(q);
  }), [projects, search]);
  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((note) => {
      const title = typeof note?.title === "string" ? note.title : "";
      const body = typeof note?.body === "string" ? note.body : "";
      return !q || title.toLowerCase().includes(q) || body.toLowerCase().includes(q);
    });
  }, [notes, search]);
  const completed = tasks.filter((task) => task.status === "done").length;
  const openTasks = tasks.filter((task) => !["done", "cancelled"].includes(task.status)).length;
  const plannerTasks = useMemo(() => filteredTasks.filter((task) => !["done", "cancelled"].includes(task.status)).sort((a, b) => {
    if (!a.due_at && !b.due_at) return 0;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  }), [filteredTasks]);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const overdueTasks = plannerTasks.filter((task) => task.due_at && new Date(task.due_at) < todayStart);
  const dueTodayTasks = plannerTasks.filter((task) => task.due_at && new Date(task.due_at).toDateString() === todayStart.toDateString());
  const highPriorityTasks = tasks.filter((task) => !["done", "cancelled"].includes(task.status) && ["high", "urgent"].includes(task.priority)).length;

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
    setBusy(true);
    try {
      await api("/api/auth/logout", { method: "POST", body: "{}" });
      setUser(null); setWorkspace(null); setTasks([]); setProjects([]); setNotes([]);
      setAuthMode("login");
      setNotice("You have been signed out.");
    } catch (error) {
      setNotice(error.message || "Could not sign you out. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(event) {
    event.preventDefault();
    const kind = modal === "project" ? "project" : modal === "edit_project" ? "project_update" : modal === "note" ? "note" : modal === "edit_note" ? "note_update" : modal === "edit_task" ? "task_update" : "task";
    const payload = kind === "project" || kind === "project_update" ? { kind, ...(kind === "project_update" ? { id: editingProjectId } : {}), name: draft.title, description: draft.body }
      : kind === "note" || kind === "note_update" ? { kind, ...(kind === "note_update" ? { id: editingNoteId } : {}), title: draft.title, body: draft.body }
      : { kind, ...(kind === "task_update" ? { id: editingTaskId } : {}), title: draft.title, description: draft.description, due_at: draft.due_at || null, project_id: draft.project_id || null, priority: draft.priority };
    setBusy(true);
    try {
      await api("/api/workspace", { method: "POST", body: JSON.stringify(payload) });
      setModal(""); setEditingTaskId(null); setEditingNoteId(null); setEditingProjectId(null); setDraft({ title: "", body: "", description: "", due_at: "", project_id: "", priority: "medium" });
      await refresh(); setNotice((kind === "note" || kind === "note_update") ? (kind === "note_update" ? "Note updated." : "Note saved.") : (kind === "project" || kind === "project_update") ? (kind === "project_update" ? "Project updated." : "Project created.") : kind === "task_update" ? "Task updated." : "Task added.");
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  async function addWorkspaceMember(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api("/api/workspace", { method: "POST", body: JSON.stringify({ kind: "member_add", email: memberEmail, role: memberRole }) });
      setMemberEmail("");
      setNotice("Workspace member added.");
      await refresh();
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  async function updateWorkspaceMember(member, role) {
    try {
      await api("/api/workspace", { method: "POST", body: JSON.stringify({ kind: "member_role", user_id: member.id, role }) });
      setNotice("Member role updated.");
      await refresh();
    } catch (error) { setNotice(error.message); }
  }

  async function removeWorkspaceMember(member) {
    if (!window.confirm("Remove this person from the workspace?")) return;
    try {
      await api("/api/workspace", { method: "POST", body: JSON.stringify({ kind: "member_remove", user_id: member.id }) });
      setNotice("Member removed.");
      await refresh();
    } catch (error) { setNotice(error.message); }
  }

  async function updateTaskStatus(task, status) {
    if (!["todo", "in_progress", "done", "cancelled"].includes(status)) return;
    const previousStatus = task.status;
    setTasks((items) => items.map((item) => item.id === task.id ? { ...item, status } : item));
    try {
      await api("/api/workspace", { method: "POST", body: JSON.stringify({ kind: "task_status", id: task.id, status }) });
      setNotice(status === "done" ? "Task completed." : status === "in_progress" ? "Task marked in progress." : status === "cancelled" ? "Task cancelled." : "Task reopened.");
      await refresh();
    } catch (error) {
      setTasks((items) => items.map((item) => item.id === task.id ? { ...item, status: previousStatus } : item));
      setNotice(error.message);
      await refresh().catch(() => {});
    }
  }

  function editTask(task) {
    setEditingTaskId(task.id);
    setDraft({
      title: task.title || "",
      body: "",
      description: task.description || "",
      due_at: task.due_at ? String(task.due_at).slice(0, 10) : "",
      project_id: task.project_id || "",
      priority: task.priority || "medium",
    });
    setModal("edit_task");
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    try {
      await api("/api/workspace", {
        method: "POST",
        body: JSON.stringify({ kind: "task_delete", id: task.id }),
      });
      setTasks(items => items.filter(item => item.id !== task.id));
      setNotice("Task deleted.");
      await refresh();
    } catch (error) {
      setNotice(error.message);
    }
  }

  function editProject(project) {
    setEditingProjectId(project.id);
    setDraft({ title: typeof project.name === "string" ? project.name : "", body: typeof project.description === "string" ? project.description : "", description: "", due_at: "", project_id: "", priority: "medium" });
    setModal("edit_project");
  }

  async function deleteProject(project) {
    if (!window.confirm("Delete this project? Projects with linked tasks cannot be deleted.")) return;
    try {
      await api("/api/workspace", { method: "POST", body: JSON.stringify({ kind: "project_delete", id: project.id }) });
      setProjects(items => items.filter(item => item.id !== project.id));
      setNotice("Project deleted.");
      await refresh();
    } catch (error) { setNotice(error.message); }
  }

  function editNote(note) {
    setEditingNoteId(note.id);
    setDraft({ title: typeof note.title === "string" ? note.title : "", body: typeof note.body === "string" ? note.body : "", description: "", due_at: "", project_id: "", priority: "medium" });
    setModal("edit_note");
  }

  async function deleteNote(note) {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    try {
      await api("/api/workspace", { method: "POST", body: JSON.stringify({ kind: "note_delete", id: note.id }) });
      setNotes(items => items.filter(item => item.id !== note.id));
      setNotice("Note deleted.");
      await refresh();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function toggleTask(task) {
    await updateTaskStatus(task, task.status === "done" ? "todo" : "done");
  }

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  if (loading) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0c0d", color: "#f4f2ef" }}>Loading DailyManager…</main>;

  if (!user) return (
    <main className="landing">
      <div className="landing-glow landing-glow-one"/><div className="landing-glow landing-glow-two"/>
      <header className="landing-nav">
        <a className="landing-brand" href="#" onClick={e=>e.preventDefault()}><span className="landing-mark"><i/><i/><i/><i/></span><span>daily<span className="brand-accent">manager</span><small>MAKE SPACE FOR BIG THINGS</small></span></a>
        <nav className="landing-links"><a href="#platform">Platform</a><a href="#features">Features</a><a href="#workflow">How it works</a><a href="#plans">Plans</a></nav>
        <div className="landing-nav-actions"><button className="landing-login" onClick={()=>{setAuthMode("login");document.getElementById("get-started")?.scrollIntoView({behavior:"smooth",block:"center"});}}>Log in</button><button className="landing-nav-cta" onClick={()=>{setAuthMode("signup");document.getElementById("get-started")?.scrollIntoView({behavior:"smooth",block:"center"});}}>Start for free <ArrowUpRight size={15}/></button></div>
      </header>
      <section className="landing-hero" id="platform">
        <div className="hero-copy">
          <div className="hero-pill"><span className="live-dot"/> THE OPERATING SYSTEM FOR YOUR DAY <ArrowUpRight size={13}/></div>
          <h1>Your ambition deserves <span>a better system.</span></h1>
          <p className="hero-subtitle">Bring your projects, priorities, notes and plans into one beautifully connected workspace. Less busywork. More meaningful progress.</p>
          <div className="hero-actions"><button className="hero-primary" onClick={()=>{setAuthMode("signup");document.getElementById("get-started")?.scrollIntoView({behavior:"smooth",block:"center"});}}>Build your workspace <ArrowRight size={17}/></button><a className="hero-secondary" href="#workflow"><span className="play-button"><Play size={12} fill="currentColor"/></span> See how it works</a></div>
          <div className="hero-proof"><div className="proof-avatars"><span>G</span><span>A</span><span>M</span><span>+</span></div><div><div className="proof-stars">★★★★★</div><p>Designed for people building something meaningful.</p></div></div>
          <div className="hero-trust"><span><CheckCircle2 size={14}/> Start free</span><span><ShieldCheck size={14}/> Private by design</span><span><Zap size={14}/> Set up in minutes</span></div>
        </div>
        <div className="hero-visual" aria-label="Preview of the DailyManager workspace">
          <div className="visual-orbit orbit-a"/><div className="visual-orbit orbit-b"/>
          <div className="product-window">
            <div className="window-top"><div className="window-dots"><i/><i/><i/></div><span>daily manager <b>/ overview</b></span><span className="window-status"><i/> LIVE PREVIEW</span></div>
            <div className="window-body">
              <aside className="mock-sidebar"><div className="mock-brand"><span className="landing-mark mini"><i/><i/><i/><i/></span><b>daily<span>manager</span></b></div><div className="mock-workspace">◈ &nbsp; My workspace <ChevronDown size={11}/></div><small>WORKSPACE</small><div className="mock-nav active">◫ &nbsp; Overview</div><div className="mock-nav">☷ &nbsp; My tasks <em>8</em></div><div className="mock-nav">▦ &nbsp; Projects</div><div className="mock-nav">▣ &nbsp; Planner</div><div className="mock-nav">▤ &nbsp; Notes</div><div className="mock-sidebar-bottom"><span className="mock-avatar">G</span><span><b>Godwin's space</b><small>Personal workspace</small></span></div></aside>
              <div className="mock-main"><div className="mock-greeting"><div><small>TUESDAY, YOUR WAY</small><h3>Good morning, Godwin <span>✳</span></h3><p>Here’s your space to make things happen.</p></div><span className="mock-date">Today ↗</span></div>
                <div className="mock-focus"><div className="mock-focus-icon"><Sparkles size={17}/></div><div><small>YOUR DAILY FOCUS</small><b>Make progress on what matters.</b><span>One clear next step changes everything.</span></div><div className="mock-focus-art"><i/><i/><i/><i/><i/></div></div>
                <div className="mock-stat-grid"><div className="mock-stat"><small>Open tasks</small><b>08</b><span className="mock-orange">↗ Keep moving</span></div><div className="mock-stat"><small>Completed</small><b>24</b><span className="mock-green">+12% this week</span></div><div className="mock-stat"><small>Projects</small><b>04</b><span>Across your workspace</span></div></div>
                <div className="mock-lower"><div className="mock-card"><div className="mock-card-head"><b>Focus queue</b><small>View all ↗</small></div><div className="mock-task"><i/> <span><b>Review product roadmap</b><small>Product studio · High priority</small></span><em>Today</em></div><div className="mock-task"><i/> <span><b>Prepare launch content</b><small>Marketing · Medium priority</small></span><em>Tomorrow</em></div><div className="mock-task"><i/> <span><b>Send project update</b><small>Operations · Low priority</small></span><em>Friday</em></div></div><div className="mock-card mock-progress-card"><div className="mock-card-head"><b>Weekly momentum</b><span>↗</span></div><strong>76<span>%</span></strong><small>You're building a good rhythm.</small><div className="mock-chart">{[30,52,40,68,48,83,62,94,72,85,57,78].map((v,i)=><i key={i} style={{height:v+"%"}}/>)}</div><div className="mock-chart-labels"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span></div></div></div>
              </div>
            </div>
          </div>
          <div className="floating-chip chip-top"><span className="chip-icon violet"><Layers size={15}/></span><span><b>Everything connected</b><small>One calm workspace</small></span><CheckCircle2 size={16} className="chip-check"/></div>
          <div className="floating-chip chip-bottom"><span className="chip-icon green"><ChartNoAxesCombined size={16}/></span><span><b>Momentum unlocked</b><small>Small steps add up</small></span><span className="chip-growth">+18%</span></div>
          <div className="hero-image-tile"><div className="image-tile-art"><span>FOCUS</span><b>Make room<br/>for your best work.</b><i>✳</i></div><small>YOUR NEXT CHAPTER <ArrowUpRight size={12}/></small></div>
        </div>
      </section>
      <section className="landing-marquee"><span>ONE WORKSPACE</span><i/> <span>MORE CLARITY</span><i/> <span>LESS CONTEXT SWITCHING</span><i/> <span>REAL MOMENTUM</span><i/> <span>ONE WORKSPACE</span></section>
      <section className="landing-section feature-section" id="features"><div className="section-kicker">A SPACE THAT THINKS WITH YOU</div><div className="section-title-row"><div><h2>Not another to-do list.<br/><span>Your whole picture.</span></h2></div><p>DailyManager brings the moving pieces of your day together, so you can see what matters and move forward with confidence.</p></div>
        <div className="feature-showcase"><article className="feature-card feature-card-large"><div className="feature-card-top"><span className="feature-symbol peach"><ListTodo size={20}/></span><span className="feature-index">01 / FOCUS</span></div><h3>Turn a busy mind into a clear next step.</h3><p>Capture tasks, set priorities and keep the important work in sight without the clutter.</p><div className="mini-task-board"><div className="mini-board-head"><b>Today's priorities</b><span>3 items</span></div><div><i className="mini-check checked"><Check size={10}/></i><span><b>Map the next release</b><small>Product studio</small></span><em>Done</em></div><div><i className="mini-check"/><span><b>Write landing page copy</b><small>Website refresh</small></span><em className="priority-high">High</em></div><div><i className="mini-check"/><span><b>Review weekly goals</b><small>Personal</small></span><em>Today</em></div></div></article>
          <article className="feature-card feature-card-project"><div className="feature-card-top"><span className="feature-symbol lilac"><Layers size={20}/></span><span className="feature-index">02 / BUILD</span></div><h3>Projects that feel connected.</h3><p>Keep the work, deadlines and outcomes around each idea in one place.</p><div className="project-stack"><div className="project-stack-card"><span className="stack-art stack-art-one">✳</span><span><b>Website refresh</b><small>8 tasks · Product</small></span><strong>72%</strong></div><div className="stack-progress"><i style={{width:"72%"}}/></div><div className="project-stack-card"><span className="stack-art stack-art-two">◈</span><span><b>Launch campaign</b><small>5 tasks · Marketing</small></span><strong>48%</strong></div><div className="stack-progress"><i style={{width:"48%"}}/></div><div className="project-stack-card"><span className="stack-art stack-art-three">↗</span><span><b>Client portal</b><small>12 tasks · Operations</small></span><strong>31%</strong></div><div className="stack-progress"><i style={{width:"31%"}}/></div></div></article>
          <article className="feature-card feature-card-notes"><div className="feature-card-top"><span className="feature-symbol mint"><FileText size={20}/></span><span className="feature-index">03 / REMEMBER</span></div><h3>Good ideas deserve a home.</h3><p>Keep notes and decisions close to the work they belong to.</p><div className="note-preview"><div className="note-preview-top"><span>✳ FIELD NOTES / 04</span><span>•••</span></div><h4>Make it useful.<br/>Make it matter.</h4><p>Clarity comes from deciding what not to do, too.</p><div className="note-tags"><span>Strategy</span><span>Ideas</span><span>Personal</span></div></div></article>
        </div>
      </section>
      <section className="landing-workflow" id="workflow"><div className="workflow-copy"><div className="section-kicker">BUILT AROUND YOUR FLOW</div><h2>From scattered thoughts<br/>to <span>steady progress.</span></h2><p>Start with what is on your mind. Give it structure when you need it. Then spend your energy doing the work—not managing the tools.</p><div className="workflow-steps"><div><span>01</span><p><b>Capture</b><small>Get tasks, notes and ideas out of your head.</small></p><CheckCircle2 size={17}/></div><div><span>02</span><p><b>Connect</b><small>Organize your work into projects and priorities.</small></p><CheckCircle2 size={17}/></div><div><span>03</span><p><b>Move forward</b><small>See your progress and choose your next step.</small></p><CheckCircle2 size={17}/></div></div></div><div className="workflow-visual"><div className="workflow-glow"/><div className="workflow-note note-a"><span>IDEA / 001</span><b>Make the product<br/>feel effortless.</b><small>Captured just now</small></div><div className="workflow-note note-b"><span>PROJECT / ACTIVE</span><b>Launch a better<br/>workspace.</b><div className="workflow-meter"><i/></div><small>68% of milestones complete</small></div><div className="workflow-note note-c"><span>TODAY / NEXT STEP</span><b>Ship one useful thing.</b><span className="workflow-pill"><Check size={11}/> Ready to go</span></div><div className="workflow-orb"><span>✳</span><small>MAKE<br/>MOMENTUM</small></div></div></section>
      <section className="landing-testimonials"><div className="testimonial-intro"><div className="section-kicker">MADE FOR YOUR KIND OF AMBITION</div><h2>A little more clarity<br/><span>changes everything.</span></h2><p>DailyManager is being built around a simple idea: your tools should support your work, not become the work.</p><div className="testimonial-controls"><button aria-label="Previous story" onClick={()=>setTestimonialIndex(i=>(i+2)%3)}>←</button><span>0{testimonialIndex+1} <i/> 03</span><button aria-label="Next story" onClick={()=>setTestimonialIndex(i=>(i+1)%3)}>→</button></div></div><div className="testimonial-stage"><div className="testimonial-glow"/><article className="testimonial-card"><div className="testimonial-stars">★★★★★</div><blockquote>{["“I want my workspace to make the next step feel obvious—not give me another thing to manage.”","“The best productivity system is the one that gives your attention back to the work you care about.”","“Big goals become less intimidating when the small, useful steps have somewhere to live.”"][testimonialIndex]}</blockquote><div className="testimonial-person"><span className={"testimonial-avatar avatar-"+testimonialIndex}>{["G","A","M"][testimonialIndex]}</span><span><b>{["The builder","The thoughtful planner","The focused creator"][testimonialIndex]}</b><small>{["Product and business","Independent professional","Creative workflow"][testimonialIndex]}</small></span><span className="testimonial-mark">✳</span></div><div className="testimonial-dots">{[0,1,2].map(i=><button key={i} aria-label={"Show story "+(i+1)} className={testimonialIndex===i?"selected":""} onClick={()=>setTestimonialIndex(i)}/>)}</div></article></div></section>
      <section className="landing-section" id="plans"><div className="section-kicker">SIMPLE BY DESIGN</div><div className="section-title-row"><h2>A little structure.<br/><span>A lot more possibility.</span></h2><div className="billing-switch"><span>Monthly</span><button aria-label="Toggle yearly plan preview" aria-pressed={annualPreview} className={annualPreview?"is-annual":""} onClick={()=>setAnnualPreview(v=>!v)}><i/></button><span>Yearly <em>PREVIEW</em></span></div></div><div className="pricing-grid"><article className="price-card"><span className="price-eyebrow">START WITH CLARITY</span><h3>Starter</h3><p>For getting your work into one place.</p><div className="price-value"><strong>Free</strong></div><button onClick={()=>{setAuthMode("signup");document.getElementById("get-started")?.scrollIntoView({behavior:"smooth",block:"center"});}}>Get started <ArrowRight size={15}/></button><ul><li><Check size={14}/> Personal workspace</li><li><Check size={14}/> Tasks and projects</li><li><Check size={14}/> Notes and planning</li><li><Check size={14}/> Core progress overview</li></ul></article><article className="price-card price-card-featured"><span className="popular-label"><Sparkles size={12}/> YOUR NEXT LEVEL</span><span className="price-eyebrow">FOR YOUR BIGGER PLANS</span><h3>Pro</h3><p>For turning a growing workload into momentum.</p><div className="price-value"><strong>{annualPreview?"Yearly plan preview":"Monthly plan preview"}</strong></div><button onClick={()=>{setAuthMode("signup");document.getElementById("get-started")?.scrollIntoView({behavior:"smooth",block:"center"});}}>Join the early list <ArrowRight size={15}/></button><ul><li><Check size={14}/> Expanded workspace tools</li><li><Check size={14}/> Advanced insights</li><li><Check size={14}/> More customization</li><li><Check size={14}/> Future team features</li></ul><small className="price-disclaimer">Preview only. Paid billing is not active.</small></article><article className="price-card"><span className="price-eyebrow">FOR THE WAY YOU WORK</span><h3>Flexible</h3><p>A workspace that grows with your process.</p><div className="price-value"><strong>In development</strong></div><button onClick={()=>setNotice("More workspace options will be announced as they are built.")}>Explore roadmap <ArrowRight size={15}/></button><ul><li><Check size={14}/> Modular tools</li><li><Check size={14}/> Personal workflows</li><li><Check size={14}/> Connected planning</li><li><Check size={14}/> More ways to customize</li></ul></article></div></section>
      <section className="landing-bottom-cta"><div className="cta-orb">✳</div><div><div className="section-kicker">YOUR NEXT CHAPTER STARTS HERE</div><h2>Make space for <span>big things.</span></h2><p>Build a workspace that helps your ambition feel a little more manageable.</p></div><button onClick={()=>{setAuthMode("signup");document.getElementById("get-started")?.scrollIntoView({behavior:"smooth",block:"center"});}}>Create your workspace <ArrowRight size={17}/></button></section>
      <section className="landing-signup" id="get-started"><div className="signup-promo"><span className="section-kicker">A CALMER WAY TO GET THINGS DONE</span><h2>Start where you are.<br/><span>Build from there.</span></h2><p>Your plans do not need another tab. They need a place to come together.</p><div className="signup-benefits"><span><CheckCircle2 size={15}/> Personal workspace</span><span><CheckCircle2 size={15}/> No card required</span><span><CheckCircle2 size={15}/> Your pace, your priorities</span></div><div className="signup-decoration"><div className="deco-card deco-one"><span>THIS WEEK</span><b>Make meaningful progress.</b><div><i/><i/><i/><i/><i/></div></div><div className="deco-card deco-two"><Sparkles size={17}/><b>One thing at a time.</b><small>That is enough to begin.</small></div></div></div><div className="signup-form-card"><div className="signup-card-mark"><span className="landing-mark"><i/><i/><i/><i/></span><span>{authMode==="signup"?"YOUR WORKSPACE AWAITS":"WELCOME BACK"}</span></div><h3>{authMode==="signup"?"Make it yours.":"Pick up where you left off."}</h3><p>{authMode==="signup"?"Create your account and start bringing your day together.":"Sign in to get back to your workspace."}</p>
        {authError&&<p role="alert" className="landing-error">{authError}</p>}
        <form onSubmit={submitAuth} className="landing-auth-form">{authMode==="signup"&&<label>Your name<input required minLength={2} maxLength={120} autoComplete="name" value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})} placeholder="e.g. Alex Morgan"/></label>}<label>Email address<input type="email" required maxLength={254} autoComplete="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="you@company.com"/></label><label>Password<input type="password" required minLength={authMode==="signup"?10:1} maxLength={128} autoComplete={authMode==="signup"?"new-password":"current-password"} value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} placeholder={authMode==="signup"?"At least 10 characters":"Your password"}/></label><button className="landing-submit" disabled={busy}>{busy?"Please wait…":authMode==="signup"?"Create my workspace":"Log in to DailyManager"} <ArrowRight size={16}/></button></form><div className="signup-switch">{authMode==="signup"?"Already have an account?":"New to DailyManager?"} <button onClick={()=>{setAuthMode(authMode==="signup"?"login":"signup");setAuthError("");}}>{authMode==="signup"?"Log in":"Create an account"}</button></div><div className="signup-security"><ShieldCheck size={14}/> Private workspace sessions. Billing is not active yet.</div></div></section>
      <footer className="landing-footer"><a className="landing-brand" href="#platform"><span className="landing-mark"><i/><i/><i/><i/></span><span>daily<span className="brand-accent">manager</span><small>MAKE SPACE FOR BIG THINGS</small></span></a><span>Make space for what matters.</span><div><a href="#features">Features</a><a href="#plans">Plans</a><a href="#get-started">Get started</a></div><small>© {new Date().getFullYear()} DailyManager</small></footer>
      {notice&&<div role="status" className="landing-toast">{notice}</div>}
    </main>
  );

  const create = (kind) => { setDraft({ title: "", body: "", description: "", due_at: "", project_id: "", priority: "medium" }); setModal(kind); };
  const heading = active === "Overview" ? "Good to see you, " + user.name.split(" ")[0] : active;
  const visibleTasks = filteredTasks;
  const filteredTasksByFilter = visibleTasks.filter((task) => {
    if (taskFilter === "done") return task.status === "done";
    if (taskFilter === "cancelled") return task.status === "cancelled";
    if (taskFilter === "open") return !["done", "cancelled"].includes(task.status);
    if (taskFilter === "in_progress") return task.status === "in_progress";
    if (taskFilter === "overdue") return !["done", "cancelled"].includes(task.status) && task.due_at && new Date(task.due_at) < todayStart;
    if (taskFilter === "priority") return !["done", "cancelled"].includes(task.status) && ["high", "urgent"].includes(task.priority);
    return true;
  });
  const sortedTasksByFilter = [...filteredTasksByFilter].sort((a, b) => {
    if (taskSort === "priority") {
      const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (rank[a.priority] ?? 4) - (rank[b.priority] ?? 4);
    }
    if (taskSort === "recent") return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
    if (taskSort === "title") return String(a.title || "").localeCompare(String(b.title || ""));
    const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY;
    return aDue - bDue;
  });
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
        <header className="topbar"><div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><b>{active}</b></div><div className="top-actions"><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks, descriptions & projects…"/>{search ? <button type="button" aria-label="Clear search" title="Clear search" onClick={()=>setSearch("")} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",border:0,background:"transparent",color:"inherit",cursor:"pointer",padding:4}}><X size={15}/></button> : <kbd>⌕</kbd>}</div><button className="icon-button" aria-label="Notifications" onClick={()=>setNotice("You're all caught up.")}><Bell size={18}/></button><div className="top-avatar">{user.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot"/> YOUR WORKSPACE</div><h1>{heading}<span className="wave">✳</span></h1><p className="subtitle">{active==="Overview"?"A little progress each day adds up to big results.":"Your DailyManager workspace, all in one place."}</p></div><button className="primary-button" onClick={()=>create(active==="Projects"?"project":active==="Notes"?"note":"task")}><Plus size={17}/> {active==="Projects"?"New project":active==="Notes"?"New note":"New task"}</button></div>
          {active==="Overview" && <><div className="focus-banner"><div className="focus-orb"><Sparkles size={21}/></div><div className="focus-text"><span>YOUR DAILY FOCUS</span><b>Make today count, one thing at a time.</b><small>You have {openTasks} tasks left to move your day forward.</small></div><div className="focus-right"><div className="focus-progress"><span style={{width:`${tasks.length?completed/tasks.length*100:0}%`}}/></div><small>{completed} of {tasks.length} completed</small></div><Sparkles className="banner-spark" size={82}/></div><div className="stats-grid"><article className="stat-card"><div className="stat-top"><span className="stat-icon violet"><ListTodo size={18}/></span></div><p>Open tasks</p><div className="stat-number">{openTasks}</div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon green"><Check size={18}/></span></div><p>Completed</p><div className="stat-number">{completed}</div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon orange"><FolderKanban size={18}/></span></div><p>Active projects</p><div className="stat-number">{projects.length}</div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon pink"><FileText size={18}/></span></div><p>Notes</p><div className="stat-number">{notes.length}</div></article></div></>}
          {active==="Overview" && <section className="panel" style={{marginTop:20}}><div className="panel-heading"><div><h2>Focus queue</h2><p>Your next actions, ready when you are.</p></div><button className="period-select" onClick={()=>setActive("My tasks")}>View all <ArrowRight size={14}/></button></div>{visibleTasks.filter(t=>t.status!=="done").slice(0,6).map(t=><TaskRow key={t.id} task={t} onToggle={toggleTask} onStatusChange={updateTaskStatus} onEdit={editTask} onDelete={deleteTask}/>)}{!visibleTasks.filter(t=>t.status!=="done").length&&<p className="empty-state">No open tasks yet. Add your first one to get started.</p>}</section>}
          {active==="My tasks" && <section className="panel"><div className="panel-heading"><div><h2>All tasks</h2><p>{openTasks} open · {completed} completed · {tasks.filter(task=>task.status==="cancelled").length} cancelled</p></div><button className="primary-button" onClick={()=>create("task")}><Plus size={15}/> New task</button></div><div className="task-toolbar" role="group" aria-label="Filter tasks">{[["all","All tasks"],["open","Open"],["in_progress","In progress"],["overdue","Overdue"],["priority","High priority"],["done","Completed"],["cancelled","Cancelled"]].map(([value,label])=>{const count=filteredTasks.filter(task=>{if(value==="all")return true;if(value==="done")return task.status==="done";if(value==="cancelled")return task.status==="cancelled";if(value==="open")return !["done","cancelled"].includes(task.status);if(value==="in_progress")return task.status==="in_progress";if(value==="overdue")return !["done","cancelled"].includes(task.status)&&task.due_at&&new Date(task.due_at)<todayStart;if(value==="priority")return !["done","cancelled"].includes(task.status)&&["high","urgent"].includes(task.priority);return false;}).length;return <button key={value} className={taskFilter===value?"selected":""} onClick={()=>setTaskFilter(value)} aria-pressed={taskFilter===value}>{label}<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:20,height:20,padding:"0 5px",marginLeft:7,borderRadius:999,fontSize:11,fontWeight:700,background:taskFilter===value?"rgba(255,255,255,.18)":"var(--surface-muted,rgba(127,127,127,.12))",color:"inherit"}}>{count}</span></button>})}</div><div style={{display:"flex",alignItems:"center",gap:10,margin:"12px 0 16px",flexWrap:"wrap"}}><label htmlFor="task-sort" style={{fontSize:13,color:"var(--muted,#a5a5a5)"}}>Sort by</label><select id="task-sort" value={taskSort} onChange={e=>setTaskSort(e.target.value)} style={{...inputStyle,width:"auto",minWidth:170,padding:"9px 12px"}}><option value="due">Due date (earliest first)</option><option value="priority">Priority (highest first)</option><option value="recent">Recently updated</option><option value="title">Task name (A–Z)</option></select></div>{sortedTasksByFilter.map(t=><TaskRow key={t.id} task={t} onToggle={toggleTask} onStatusChange={updateTaskStatus} onEdit={editTask} onDelete={deleteTask}/>)}{!filteredTasksByFilter.length&&<p className="empty-state">No tasks match this filter. Try another view or create a task.</p>}</section>}
          {active==="Projects" && <section className="panel"><div className="panel-heading"><div><h2>Your projects</h2><p>Track progress across the work you're building.</p></div><button className="primary-button" onClick={()=>create("project")}><Plus size={15}/> New project</button></div><div className="project-grid">{filteredProjects.map(p=>{const projectTasks=tasks.filter(t=>String(t.project_id||"")===String(p.id));const projectDone=projectTasks.filter(t=>t.status==="done").length;const progress=projectTasks.length?Math.round(projectDone/projectTasks.length*100):0;return <article key={p.id} className="project-card"><div className="project-card-top"><span className="stat-icon orange"><FolderKanban size={17}/></span><span className="project-status">{p.status||"Active"}</span></div><h3>{p.name}</h3><p>{p.description||"A dedicated space for this project."}</p><div style={{display:"flex",gap:8,marginTop:8}}><button className="icon-button" aria-label={"Edit project "+p.name} title="Edit project" onClick={()=>editProject(p)}><Pencil size={14}/></button><button className="icon-button" aria-label={"Delete project "+p.name} title="Delete project" onClick={()=>deleteProject(p)}><Trash2 size={14}/></button></div><div className="project-progress-label"><span>{projectDone} of {projectTasks.length} tasks complete</span><b>{progress}%</b></div><div className="focus-progress"><span style={{width:`${progress}%`}}/></div><button className="project-view-tasks" onClick={()=>{setSearch(p.name);setActive("My tasks");setTaskFilter("all");}}>View related tasks <ArrowRight size={14}/></button></article>})}</div>{!filteredProjects.length&&<p className="empty-state">Your first project starts here. Create one, then assign tasks to it.</p>}</section>}
          {active==="Notes" && <section className="panel"><div className="panel-heading"><div><h2>Workspace notes</h2><p>Keep decisions and useful ideas close.</p></div><button className="primary-button" onClick={()=>create("note")}><Plus size={15}/> New note</button></div>{filteredNotes.map(n=><article key={n.id} className="task-row note-row"><span className="stat-icon pink"><FileText size={17}/></span><div className="task-info"><b>{n.title}</b><span className="note-preview">{n.body||"No note content yet."}</span><small className="note-meta">{n.updated_at?`Updated ${new Date(n.updated_at).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}`:"Saved note"}</small></div><div style={{display:"flex",gap:6,flexShrink:0}}><button className="icon-button" aria-label={"Edit note "+n.title} title="Edit note" onClick={()=>editNote(n)}><Pencil size={14}/></button><button className="icon-button" aria-label={"Delete note "+n.title} title="Delete note" onClick={()=>deleteNote(n)}><Trash2 size={14}/></button></div></article>)}{!filteredNotes.length&&<p className="empty-state">{notes.length?"No notes match your search. Try a different keyword.":"Your knowledge hub starts with one good note."}</p>}</section>}
          {active==="Planner" && <section className="panel"><div className="panel-heading"><div><h2>Plan your day</h2><p>Tasks are sorted by due date, with overdue work surfaced first.</p></div><button className="primary-button" onClick={()=>create("task")}><Plus size={15}/> Add task</button></div><div className="planner-summary"><article><span>Overdue</span><b>{overdueTasks.length}</b></article><article><span>Due today</span><b>{dueTodayTasks.length}</b></article><article><span>Open tasks</span><b>{plannerTasks.length}</b></article></div>{plannerTasks.map(t=>{const overdue=!!t.due_at&&new Date(t.due_at)<todayStart;const dueToday=!!t.due_at&&new Date(t.due_at).toDateString()===todayStart.toDateString();return <div key={t.id} className="task-row"><CalendarDays size={17}/><div className="task-info"><b>{t.title}</b><span>{t.due_at?new Date(t.due_at).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric"}):"No due date set"} · {t.priority||"medium"} priority</span></div><span className={"task-status"+(overdue?" planner-overdue":dueToday?" planner-today":"")}>{overdue?"Overdue":dueToday?"Due today":t.due_at?"Upcoming":"Unscheduled"}</span></div>})}{!plannerTasks.length&&<p className="empty-state">Nothing planned yet. Add a task and give it a due date to see it here.</p>}</section>}
          {active==="Goals & insights" && <><div className="stats-grid"><article className="stat-card"><div className="stat-top"><span className="stat-icon green"><Check size={18}/></span></div><p>Completion rate</p><div className="stat-number">{tasks.length?Math.round(completed/tasks.length*100):0}%</div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon violet"><ListTodo size={18}/></span></div><p>Tasks completed</p><div className="stat-number">{completed}</div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon orange"><FolderKanban size={18}/></span></div><p>Projects</p><div className="stat-number">{projects.length}</div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon pink"><Activity size={18}/></span></div><p>High priority open</p><div className="stat-number">{highPriorityTasks}</div></article></div><section className="panel"><div className="panel-heading"><div><h2>Progress overview</h2><p>A snapshot of the work you've recorded in DailyManager.</p></div></div><div className="insight-progress-copy"><b>{completed} of {tasks.length} tasks completed</b><span>{tasks.length?Math.round(completed/tasks.length*100):0}% complete</span></div><div className="focus-progress"><span style={{width:`${tasks.length?completed/tasks.length*100:0}%`}}/></div><div className="insight-breakdown"><div><span>Still open</span><b>{openTasks}</b></div><div><span>Overdue</span><b>{overdueTasks.length}</b></div><div><span>Due today</span><b>{dueTodayTasks.length}</b></div><div><span>Notes captured</span><b>{notes.length}</b></div></div>{!tasks.length&&<p className="empty-state">Your insights will become more useful as you add and complete tasks.</p>}</section></>}
          {active==="Tool library" && <section className="panel"><div className="panel-heading"><div><h2>Tool library</h2><p>Explore the 500-tool roadmap by module. Statuses are explicit so planned tools are not mistaken for working features.</p></div><span className="task-status">25 modules · 500 roadmap items</span></div><div style={{display:"flex",gap:10,flexWrap:"wrap",margin:"18px 0"}}><input aria-label="Search tool modules" placeholder="Search modules…" value={toolSearch} onChange={e=>setToolSearch(e.target.value)} style={{...inputStyle,flex:"1 1 220px",maxWidth:420}}/><select aria-label="Filter tool module status" value={toolFilter} onChange={e=>setToolFilter(e.target.value)} style={{...inputStyle,width:"auto",minWidth:160}}><option>All</option><option>Available</option><option>In progress</option><option>Planned</option></select></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,235px),1fr))",gap:12}}>{TOOL_CATEGORIES.filter(item=>(toolFilter==="All"||item.status===toolFilter)&&(!toolSearch.trim()||(item.name+" "+item.detail).toLowerCase().includes(toolSearch.trim().toLowerCase()))).map(item=><article key={item.name} style={{border:"1px solid #303638",borderRadius:14,padding:16,background:"#121516",display:"grid",alignContent:"start",gap:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"start",gap:8}}><h3 style={{margin:0,fontSize:15,lineHeight:1.4}}>{item.name}</h3><span className="task-status" style={{whiteSpace:"nowrap",fontSize:10}}>{item.status}</span></div><p style={{margin:0,fontSize:12,lineHeight:1.6,color:"#a9b0b2"}}>{item.detail}</p><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}><span style={{fontSize:11,color:"#a9b0b2"}}>20 roadmap tools</span>{item.status==="Available"&&<span style={{fontSize:11,color:"#8fe0b1"}}>Usable today</span>}</div></article>)}</div>{!TOOL_CATEGORIES.some(item=>(toolFilter==="All"||item.status===toolFilter)&&(!toolSearch.trim()||(item.name+" "+item.detail).toLowerCase().includes(toolSearch.trim().toLowerCase())))&&<p className="empty-state">No modules match that search. Try a different term.</p>}<p style={{marginTop:18,fontSize:12,color:"#9da5a8"}}>Roadmap details: <code>docs/TOOL_ROADMAP_500.md</code>. A module is not marked available unless its core workflow exists; advanced tools still require implementation, permissions, testing, and deployment verification.</p></section>}
          {active==="Settings" && <><section className="panel"><div className="panel-heading"><div><h2>Workspace settings</h2><p>Your account and plan information.</p></div></div><p><b>Workspace:</b> {workspace?.name}</p><p><b>Account:</b> {user.email}</p><p><b>Plan:</b> {workspace?.plan}</p><p><b>Trial ends:</b> {workspace?.trial_ends_at?new Date(workspace.trial_ends_at).toLocaleDateString():"Not set"}</p><p>Billing is not connected. No payment will be taken in this version.</p></section><section className="panel" style={{marginTop:18}}><div className="panel-heading"><div><h2>Workspace members</h2><p>Manage who can access this workspace. Roles are stored on each membership.</p></div><span className="task-status">{members.length} member{members.length===1?"":"s"}</span></div>{String(workspace?.owner_user_id)===String(user?.id)&&<form onSubmit={addWorkspaceMember} style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}><input aria-label="Existing member account email" placeholder="Existing DailyManager account email" type="email" required maxLength={254} value={memberEmail} onChange={e=>setMemberEmail(e.target.value)} style={{...inputStyle,flex:"1 1 220px"}}/><select aria-label="New member role" value={memberRole} onChange={e=>setMemberRole(e.target.value)} style={{...inputStyle,width:"auto"}}><option value="member">Member</option><option value="admin">Admin</option><option value="viewer">Viewer</option></select><button style={buttonStyle} disabled={busy}>{busy?"Adding…":"Add member"}</button></form>}{members.map(member=><div key={member.id} style={{display:"flex",alignItems:"center",gap:12,justifyContent:"space-between",padding:"12px 0",borderTop:"1px solid var(--line, #303538)",flexWrap:"wrap"}}><div><b>{member.name}</b><div style={{fontSize:12,color:"#a9b0b2",marginTop:4}}>{member.email}{String(member.id)===String(workspace?.owner_user_id)?" · Workspace owner":""}</div></div><div style={{display:"flex",gap:8,alignItems:"center"}}>{String(workspace?.owner_user_id)===String(user?.id)&&String(member.id)!==String(user?.id)?<><select aria-label={"Role for "+member.email} value={["admin","member","viewer"].includes(member.role)?member.role:"member"} onChange={e=>updateWorkspaceMember(member,e.target.value)} style={{...inputStyle,width:"auto",minWidth:110}}><option value="admin">Admin</option><option value="member">Member</option><option value="viewer">Viewer</option></select><button className="icon-button" title="Remove member" aria-label={"Remove "+member.email} onClick={()=>removeWorkspaceMember(member)}><Trash2 size={14}/></button></>:<span className="task-status">{member.role||"member"}</span>}</div></div>)}{!members.length&&<p className="empty-state">No workspace members found.</p>}<p style={{fontSize:12,color:"#a9b0b2",marginTop:12}}>Members must already have a DailyManager account. Admin and viewer roles are saved, but fine-grained feature permissions are not yet enforced across every action.</p></section></>}
        </div>
      </section>
      {modal && <div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModal("");}} style={{position:"fixed",inset:0,zIndex:100,display:"grid",placeItems:"center",padding:18,background:"#000b",backdropFilter:"blur(7px)"}}><form onSubmit={saveItem} style={{width:"min(100%,450px)",padding:24,border:"1px solid #373c3f",borderRadius:18,background:"#17191b",display:"grid",gap:14,boxShadow:"0 30px 90px #0009"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h2 style={{margin:0}}>{modal==="project"?"Create a project":modal==="edit_project"?"Edit project":modal==="note"?"Capture a note":modal==="edit_note"?"Edit note":modal==="edit_task"?"Edit task":"Add a task"}</h2><button type="button" onClick={()=>setModal("")} aria-label="Close" style={{border:0,background:"transparent",color:"inherit",cursor:"pointer"}}><X size={18}/></button></div><label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>{modal==="project"?"Project name":(modal==="note"||modal==="edit_note")?"Note title":"Task name"}<input style={inputStyle} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} required maxLength={modal==="task"||modal==="edit_task"?500:modal==="note"?200:160} autoFocus placeholder={modal==="task"||modal==="edit_task"?"What needs doing?":"Give it a clear name"}/></label>{modal!=="task"&&modal!=="edit_task"&&<label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>{(modal==="note"||modal==="edit_note")?"Note":"Description (optional)"}<textarea style={{...inputStyle,minHeight:100,resize:"vertical"}} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})} maxLength={modal==="note"||modal==="edit_note"?20000:2000}/></label>}{(modal==="task"||modal==="edit_task")&&<><label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>Description (optional)<textarea style={{...inputStyle,minHeight:76,resize:"vertical"}} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} maxLength={4000} placeholder="Add helpful context"/></label><label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>Due date (optional)<input style={inputStyle} type="date" value={draft.due_at} onChange={e=>setDraft({...draft,due_at:e.target.value})}/></label><label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>Project<select style={inputStyle} value={draft.project_id} onChange={e=>setDraft({...draft,project_id:e.target.value})}><option value="">Personal / no project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>Priority<select style={inputStyle} value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label></>}<button style={buttonStyle} disabled={busy}>{busy?"Saving…":"Save"}</button></form></div>}
      {notice && <div role="status" style={{position:"fixed",right:20,bottom:20,zIndex:120,background:"#25282a",border:"1px solid #464b4e",borderRadius:11,padding:"12px 16px",color:"#f4f2ef",boxShadow:"0 15px 35px #0008",maxWidth:"90vw"}}>{notice}</div>}
    </main>
  );
}

function TaskRow({ task, onToggle, onStatusChange, onEdit, onDelete }) {
  const statusLabel = task.status === "done" ? "Done" : task.status === "in_progress" ? "In progress" : task.status === "cancelled" ? "Cancelled" : "Open";
  return <div className="task-row"><button aria-label={task.status==="done"?"Mark task open":"Complete task"} onClick={()=>onToggle(task)} style={{width:20,height:20,flexShrink:0,borderRadius:7,border:task.status==="done"?"1px solid #70d5a1":"1px solid #555d61",background:task.status==="done"?"#70d5a1":"transparent",color:"#111",display:"grid",placeItems:"center",cursor:"pointer"}}>{task.status==="done"&&<Check size={13}/>}</button><div className="task-info"><b style={{textDecoration:task.status==="done"?"line-through":"none",opacity:task.status==="done"?.65:1}}>{task.title}</b><span>{task.project_name||"Personal"} · {task.priority||"medium"} priority{task.due_at?" · "+new Date(task.due_at).toLocaleDateString():""}</span></div><label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#b9c0c2"}}><span className="sr-only">Status for {task.title}</span><select aria-label={"Status for "+task.title} value={task.status||"todo"} onChange={event=>onStatusChange(task,event.target.value)} style={{maxWidth:125,padding:"7px 8px",borderRadius:9,border:"1px solid #3b4245",background:"#171a1b",color:"inherit",fontSize:12}}><option value="todo">Open</option><option value="in_progress">In progress</option><option value="done">Done</option><option value="cancelled">Cancelled</option></select><span className="sr-only">Current status: {statusLabel}</span></label><button type="button" aria-label={"Edit "+task.title} title="Edit task" onClick={()=>onEdit(task)} style={{border:"1px solid #3b4245",borderRadius:8,padding:7,background:"transparent",color:"#c8cecf",cursor:"pointer"}}><Pencil size={14}/></button><button type="button" aria-label={"Delete "+task.title} title="Delete task" onClick={()=>onDelete(task)} style={{border:"1px solid #493333",borderRadius:8,padding:7,background:"transparent",color:"#f29b9b",cursor:"pointer"}}><Trash2 size={14}/></button></div>;
}
