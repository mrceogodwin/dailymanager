"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, RefreshCw, ArrowRight, Bell, CalendarDays, Check, ChevronDown, CircleHelp, Menu, Sun, Moon,
  FileText, FolderKanban, LayoutDashboard, ListTodo, LogOut, Plus, Search,
  Settings2, Sparkles, Target, X, Star, ChevronRight, Play, Clock, ShieldCheck, ChartNoAxesCombined, Users, Layers, Zap, CheckCircle2, ArrowUpRight, Pencil, Trash2,
  Inbox, BriefcaseBusiness, CalendarClock, BookOpenText, MessageSquareText, Workflow, BrainCircuit, Timer, ClipboardList, ContactRound, WalletCards, UserRoundCog, KanbanSquare, MonitorCog, Megaphone, TrendingUp, Headset, Files, PlugZap, Focus, Boxes
} from "lucide-react";

const NAV = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "My tasks", icon: ListTodo },
  { label: "Task board", icon: Layers },
  { label: "Task table", icon: ChartNoAxesCombined },
  { label: "Projects", icon: FolderKanban },
  { label: "Project portfolio", icon: ChartNoAxesCombined },
  { label: "Planner", icon: CalendarDays },
  { label: "Calendar", icon: CalendarDays },
  { label: "Notes", icon: FileText },
  { label: "Goals & insights", icon: Target },
  { label: "Team performance", icon: Users },
  { label: "Activity", icon: Activity },
  { label: "Settings", icon: Settings2 },
];

function parseDueDate(value) {
  if (!value) return null;
  const raw = String(value).slice(0, 10);
  const parts = raw.split("-").map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return new Date(value);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

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

const MODULE_ICONS = {
  "Tasks & Work Intake": Inbox,
  "Projects & Portfolio": BriefcaseBusiness,
  "Planning & Scheduling": CalendarClock,
  "Docs & Knowledge": BookOpenText,
  "Chat & Collaboration": MessageSquareText,
  "Automation & Workflows": Workflow,
  "AI Work Assistant": BrainCircuit,
  "Goals & OKRs": Target,
  "Time & Capacity": Timer,
  "Reports & Analytics": ChartNoAxesCombined,
  "Forms & Requests": ClipboardList,
  "CRM & Client Work": ContactRound,
  "Finance & Billing": WalletCards,
  "People & HR": UserRoundCog,
  "Product & Agile": KanbanSquare,
  "Software & IT Ops": MonitorCog,
  "Marketing & Content": Megaphone,
  "Sales & Revenue": TrendingUp,
  "Customer Support": Headset,
  "Files & Assets": Files,
  "Security & Governance": ShieldCheck,
  "Admin & Workspace": Settings2,
  "Integrations & APIs": PlugZap,
  "Personal Productivity": Focus,
  "Industry & Advanced Workflows": Boxes,
};
const MODULE_NAV = TOOL_CATEGORIES.map((item) => ({ label: item.name, icon: MODULE_ICONS[item.name] || Layers }));
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
  const [activityItems, setActivityItems] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("member");
  const [active, setActive] = useState("Overview");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState("");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [draft, setDraft] = useState({ title: "", body: "", description: "", due_at: "", project_id: "", priority: "medium", assigned_to: "" });
  const [notice, setNotice] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [commentTask, setCommentTask] = useState(null);
  const [taskComments, setTaskComments] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [annualPreview, setAnnualPreview] = useState(false);
  const [taskFilter, setTaskFilter] = useState("all");
  const [taskSort, setTaskSort] = useState("due");
  const [toolSearch, setToolSearch] = useState("");
  const [toolFilter, setToolFilter] = useState("All");
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [milestoneProjectId, setMilestoneProjectId] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [milestonePriority, setMilestonePriority] = useState("high");
  const [bulkTaskLines, setBulkTaskLines] = useState("");
  const [bulkTaskPriority, setBulkTaskPriority] = useState("medium");
  const [bulkTaskProject, setBulkTaskProject] = useState("");
  const [recurringTitle, setRecurringTitle] = useState("");
  const [recurringStart, setRecurringStart] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; });
  const [recurringFrequency, setRecurringFrequency] = useState("weekly");
  const [recurringCount, setRecurringCount] = useState("4");
  const [recurringPriority, setRecurringPriority] = useState("medium");
  const [recurringProject, setRecurringProject] = useState("");

  async function loadNotifications() {
    setNotificationsLoading(true);
    try {
      const data = await api("/api/workspace?notifications=1");
      setNotifications(data.notifications || []);
      setUnreadNotifications(Number(data.unread_count || 0));
    } catch (error) {
      setNotice(error.message || "Could not load notifications.");
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function markNotificationRead(id) {
    try {
      await api("/api/workspace", { method: "POST", body: JSON.stringify({ kind: "notification_read", id }) });
      setNotifications(items => items.map(item => String(item.id) === String(id) ? { ...item, read_at: item.read_at || new Date().toISOString() } : item));
      setUnreadNotifications(count => Math.max(0, count - (notifications.find(item => String(item.id) === String(id) && !item.read_at) ? 1 : 0)));
    } catch (error) {
      setNotice(error.message || "Could not update notification.");
    }
  }

  async function markAllNotificationsRead() {
    try {
      await api("/api/workspace", { method: "POST", body: JSON.stringify({ kind: "notification_read", id: "all" }) });
      setNotifications(items => items.map(item => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
      setUnreadNotifications(0);
    } catch (error) {
      setNotice(error.message || "Could not update notifications.");
    }
  }

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
    if (active !== "Activity" || !user) return;
    let cancelled = false;
    setActivityLoading(true);
    setActivityError("");
    api("/api/workspace").then(data => {
      if (!cancelled) setActivityItems(data.activity || []);
    }).catch(error => {
      if (!cancelled) setActivityError(error.message || "Could not load activity.");
    }).finally(() => { if (!cancelled) setActivityLoading(false); });
    return () => { cancelled = true; };
  }, [active, user]);

  useEffect(() => {
    refresh().catch(() => {}).finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (user) loadNotifications();
  }, [user]);

  useEffect(() => {
    try { setTheme(localStorage.getItem("dailymanager-theme") === "light" ? "light" : "dark"); } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.dataset.dmTheme = theme;
    try { localStorage.setItem("dailymanager-theme", theme); } catch {}
  }, [theme]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!modal) return;
    const closeModalOnEscape = (event) => {
      if (event.key === "Escape") setModal("");
    };
    window.addEventListener("keydown", closeModalOnEscape);
    return () => window.removeEventListener("keydown", closeModalOnEscape);
  }, [modal]);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const q = search.trim().toLowerCase();
    const title = typeof task?.title === "string" ? task.title : "";
    const projectName = typeof task?.project_name === "string" ? task.project_name : "";
    const description = typeof task?.description === "string" ? task.description : "";
    const priority = typeof task?.priority === "string" ? task.priority : "";
    const status = typeof task?.status === "string" ? task.status.replaceAll("_", " ") : "";
    return !q || title.toLowerCase().includes(q) || description.toLowerCase().includes(q) || projectName.toLowerCase().includes(q) || priority.toLowerCase().includes(q) || status.toLowerCase().includes(q);
  }), [tasks, search]);
  const filteredProjects = useMemo(() => projects.filter((project) => {
    const q = search.trim().toLowerCase();
    const name = typeof project?.name === "string" ? project.name : "";
    const description = typeof project?.description === "string" ? project.description : "";
    return !q || name.toLowerCase().includes(q) || description.toLowerCase().includes(q);
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
    const aDue = a.due_at ? parseDueDate(a.due_at).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.due_at ? parseDueDate(b.due_at).getTime() : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    const priorityRank = { urgent: 0, high: 1, medium: 2, low: 3 };
    const priorityDifference = (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4);
    if (priorityDifference !== 0) return priorityDifference;
    return String(a.title || "").localeCompare(String(b.title || ""));
  }), [filteredTasks]);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const overdueTasks = plannerTasks.filter((task) => task.due_at && parseDueDate(task.due_at) < todayStart);
  const dueTodayTasks = plannerTasks.filter((task) => task.due_at && parseDueDate(task.due_at).toDateString() === todayStart.toDateString());
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

  function exportProjectReport(project, projectTasks) {
    const rows = [["Project","Task","Assignee","Priority","Due date","Status","Description"], ...projectTasks.map(task => [project.name, task.title, task.assignee_name || "Unassigned", task.priority || "medium", task.due_at ? parseDueDate(task.due_at).toISOString().slice(0,10) : "", task.status || "todo", task.description || ""])];
    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"','""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dailymanager-${project.name.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "project"}-report.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${projectTasks.length} tasks for ${project.name}.`);
  }

  async function createProjectMilestone(event) {
    event.preventDefault();
    if (!milestoneProjectId) { setNotice("Choose a project for this milestone."); return; }
    if (!milestoneTitle.trim()) { setNotice("Enter a milestone name."); return; }
    if (!milestoneDate) { setNotice("Choose a target date."); return; }
    setBusy(true);
    try {
      await api("/api/workspace", { method: "POST", body: JSON.stringify({ kind: "task", title: milestoneTitle.trim(), description: "PROJECT MILESTONE", due_at: milestoneDate, project_id: milestoneProjectId, priority: milestonePriority }) });
      await refresh();
      setMilestoneTitle("");
      setNotice("Project milestone added.");
    } catch(error) { setNotice(error.message || "Could not add this milestone."); }
    finally { setBusy(false); }
  }

  async function createRecurringTasks(event) {
    event.preventDefault();
    const title = recurringTitle.trim();
    const count = Number(recurringCount);
    if (!title) { setNotice("Enter a task title."); return; }
    if (!recurringStart || Number.isNaN(new Date(`${recurringStart}T12:00:00`).getTime())) { setNotice("Choose a valid start date."); return; }
    if (!Number.isInteger(count) || count < 2 || count > 12) { setNotice("Choose between 2 and 12 occurrences."); return; }
    const dates = Array.from({length:count},(_,index)=>{
      const date = new Date(`${recurringStart}T12:00:00`);
      if (recurringFrequency === "daily") date.setDate(date.getDate()+index);
      else if (recurringFrequency === "weekly") date.setDate(date.getDate()+index*7);
      else {
        const originalDay = date.getDate();
        const targetMonth = date.getMonth()+index;
        const targetYear = date.getFullYear()+Math.floor(targetMonth/12);
        const normalizedMonth = ((targetMonth%12)+12)%12;
        date.setFullYear(targetYear, normalizedMonth, 1);
        date.setDate(Math.min(originalDay, new Date(targetYear, normalizedMonth+1, 0).getDate()));
      }
      return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
    });
    setBusy(true);
    try {
      const results = await Promise.allSettled(dates.map((due_at,index)=>api("/api/workspace",{method:"POST",body:JSON.stringify({kind:"task",title,description:`Scheduled occurrence ${index+1} of ${count} (${recurringFrequency}).`,due_at,project_id:recurringProject||null,priority:recurringPriority})})));
      const created=results.filter(result=>result.status==="fulfilled").length;
      await refresh();
      setNotice(created===count?`${count} scheduled tasks created.`:`${created} of ${count} scheduled tasks created. Please retry the missing occurrences.`);
      if(created===count)setRecurringTitle("");
    } catch(error) { setNotice(error.message||"Could not create this schedule."); }
    finally { setBusy(false); }
  }

  async function createBulkTasks(event) {
    event.preventDefault();
    const titles = [...new Set(bulkTaskLines.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
    if (!titles.length) { setNotice("Add at least one task title."); return; }
    if (titles.length > 30) { setNotice("You can create up to 30 tasks at a time."); return; }
    setBusy(true);
    try {
      const results = await Promise.allSettled(titles.map((title) => api("/api/workspace", { method: "POST", body: JSON.stringify({ kind: "task", title, description: "", due_at: null, project_id: bulkTaskProject || null, priority: bulkTaskPriority }) })));
      const created = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - created;
      await refresh();
      setBulkTaskLines(results.length === created ? "" : titles.filter((_, index) => results[index].status === "rejected").join("\n"));
      setNotice(failed ? `${created} tasks created; ${failed} could not be saved. Failed titles remain in the list.` : `${created} tasks created successfully.`);
    } catch (error) { setNotice(error.message || "Could not create these tasks."); }
    finally { setBusy(false); }
  }

  async function saveItem(event) {
    event.preventDefault();
    const kind = modal === "project" ? "project" : modal === "edit_project" ? "project_update" : modal === "note" ? "note" : modal === "edit_note" ? "note_update" : modal === "edit_task" ? "task_update" : "task";
    const payload = kind === "project" || kind === "project_update" ? { kind, ...(kind === "project_update" ? { id: editingProjectId } : {}), name: draft.title, description: draft.body }
      : kind === "note" || kind === "note_update" ? { kind, ...(kind === "note_update" ? { id: editingNoteId } : {}), title: draft.title, body: draft.body }
      : { kind, ...(kind === "task_update" ? { id: editingTaskId } : {}), title: draft.title, description: draft.description, due_at: draft.due_at || null, project_id: draft.project_id || null, priority: draft.priority, assigned_to: draft.assigned_to || null };
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
    setTasks((items) => items.map((item) => String(item.id) === String(task.id) ? { ...item, status } : item));
    try {
      await api("/api/workspace", { method: "POST", body: JSON.stringify({ kind: "task_status", id: task.id, status }) });
      setNotice(status === "done" ? "Task completed." : status === "in_progress" ? "Task marked in progress." : status === "cancelled" ? "Task cancelled." : "Task reopened.");
      await refresh();
    } catch (error) {
      setTasks((items) => items.map((item) => String(item.id) === String(task.id) ? { ...item, status: previousStatus } : item));
      setNotice(error.message);
      await refresh().catch(() => {});
    }
  }

  async function assignTaskToProject(task, project) {
    setBusy(true);
    try {
      await api("/api/workspace", {
        method: "POST",
        body: JSON.stringify({
          kind: "task_update",
          id: task.id,
          title: task.title || "",
          description: task.description || "",
          due_at: task.due_at || null,
          project_id: String(project.id),
          priority: task.priority || "medium",
          assigned_to: task.assigned_to || null,
        }),
      });
      await refresh();
      setNotice(`“${task.title}” added to ${project.name}.`);
    } catch (error) {
      setNotice(error.message || "Could not assign this task to the project.");
    } finally {
      setBusy(false);
    }
  }

  async function openTaskComments(task) {
    setCommentTask(task);
    setTaskComments([]);
    setTaskHistory([]);
    setCommentDraft("");
    setCommentsLoading(true);
    try {
      const data = await api(`/api/workspace?task_id=${encodeURIComponent(task.id)}`);
      setTaskComments(data.comments || []);
      setTaskHistory(data.history || []);
    } catch (error) {
      setNotice(error.message || "Could not load task discussion.");
    } finally {
      setCommentsLoading(false);
    }
  }

  async function submitTaskComment(event) {
    event.preventDefault();
    if (!commentTask || !commentDraft.trim()) return;
    setBusy(true);
    try {
      const data = await api("/api/workspace", { method: "POST", body: JSON.stringify({ kind: "task_comment", task_id: commentTask.id, body: commentDraft }) });
      setTaskComments(items => [...items, data.comment]);
      setCommentDraft("");
      setNotice("Comment posted.");
    } catch (error) {
      setNotice(error.message || "Could not post comment.");
    } finally {
      setBusy(false);
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
      assigned_to: task.assigned_to || "",
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
      setTasks(items => items.filter(item => String(item.id) !== String(task.id)));
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
  const createTaskForDate = (date) => { const dueAt = date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0"); setDraft({ title: "", body: "", description: "", due_at: dueAt, project_id: "", priority: "medium" }); setModal("task"); };
  const heading = active === "Overview" ? "Good to see you, " + user.name.split(" ")[0] : active;
  const visibleTasks = filteredTasks;
  const filteredTasksByFilter = visibleTasks.filter((task) => {
    if (taskFilter === "assigned_to_me") return String(task.assigned_to || "") === String(user?.id || "");
    if (taskFilter === "done") return task.status === "done";
    if (taskFilter === "cancelled") return task.status === "cancelled";
    if (taskFilter === "open") return !["done", "cancelled"].includes(task.status);
    if (taskFilter === "in_progress") return task.status === "in_progress";
    if (taskFilter === "unscheduled") return !["done", "cancelled"].includes(task.status) && !task.due_at;
    if (taskFilter === "overdue") return !["done", "cancelled"].includes(task.status) && task.due_at && parseDueDate(task.due_at) < todayStart;
    if (taskFilter === "today") return !["done", "cancelled"].includes(task.status) && task.due_at && parseDueDate(task.due_at).toDateString() === todayStart.toDateString();
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
    const aDue = a.due_at ? parseDueDate(a.due_at).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.due_at ? parseDueDate(b.due_at).getTime() : Number.POSITIVE_INFINITY;
    return aDue - bDue;
  });
  return (
    <main className="app-shell" data-theme={theme} style={{ minHeight: "100vh" }}>
      {mobileMenuOpen && <button className="mobile-menu-backdrop" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)} />}
      <aside id="workspace-sidebar" aria-label="Workspace navigation" className={`sidebar${mobileMenuOpen ? " mobile-menu-open" : ""}`}>
        <a className="brand" href="#" onClick={e => { e.preventDefault(); setActive("Overview"); setMobileMenuOpen(false); }}>
          <span className="brand-mark"><span/><span/><span/><span/></span><span className="brand-name">daily<span>manager</span><small>YOUR DAY, IN CONTROL</small></span>
        </a>
        <div className="workspace-switch"><span className="workspace-avatar">{workspace?.name?.[0] || "D"}</span><span className="workspace-copy"><b>{workspace?.name || "My workspace"}</b><small>{workspace?.plan === "free_trial" ? "Free trial" : workspace?.plan || "Workspace"}</small></span><ChevronDown size={15}/></div>
        <div className="nav-list">{[...NAV,...MODULE_NAV].map(({label,icon:Icon})=><button key={label} type="button" aria-current={active===label?"page":undefined} className={`nav-item ${active===label?"active":""}`} onClick={()=>{setActive(label);setMobileMenuOpen(false);}}><Icon size={17} strokeWidth={1.8}/><span>{label}</span></button>)}</div>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={17}/></div><b>Make room for more</b><p>Unlock your full potential with DailyManager Pro.</p><button onClick={()=>setNotice("Billing is not connected yet.")}>Explore plans <ArrowRight size={14}/></button></div>
          <button className="nav-item" onClick={()=>setActive("Settings")}><Settings2 size={17}/>Settings</button>
          <button className="nav-item" onClick={()=>setNotice("Help center is coming in a later stage.")}><CircleHelp size={17}/>Help & support</button>
          <div className="theme-switch-row"><span className="theme-switch-label"><Sun size={15}/> Appearance</span><button type="button" className={`theme-switch ${theme==="light"?"is-light":""}`} role="switch" aria-checked={theme==="light"} aria-label={theme==="light"?"Switch to dark appearance":"Switch to light appearance"} onClick={()=>setTheme(value=>value==="dark"?"light":"dark")}><span className="theme-switch-thumb">{theme==="light"?<Sun size={12}/>:<Moon size={12}/>}</span><span>{theme==="light"?"Light":"Dark"}</span></button></div>
          <div className="profile"><div className="profile-avatar">{user.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}</div><div className="profile-copy"><b>{user.name}</b><small>{user.email}</small></div><button aria-label="Log out" title="Log out" onClick={logout} style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer" }}><LogOut size={16}/></button></div>
        </div>
      </aside>
      <section className="main-panel">
        <header className="topbar"><button className="mobile-menu-toggle" type="button" aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"} aria-controls="workspace-sidebar" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(value => !value)}><Menu size={20}/></button><div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><b>{active}</b></div><div className="top-actions"><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks, descriptions & projects…"/>{search ? <button type="button" aria-label="Clear search" title="Clear search" onClick={()=>setSearch("")} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",border:0,background:"transparent",color:"inherit",cursor:"pointer",padding:4}}><X size={15}/></button> : <kbd>⌕</kbd>}</div><div style={{position:"relative"}}><button className="icon-button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={()=>{const next=!notificationsOpen;setNotificationsOpen(next);if(next)loadNotifications();}} style={{position:"relative"}}><Bell size={18}/>{unreadNotifications>0&&<span style={{position:"absolute",right:5,top:4,minWidth:15,height:15,padding:"0 3px",borderRadius:99,background:"#f06b57",color:"#fff",fontSize:9,fontWeight:800,display:"grid",placeItems:"center"}}>{unreadNotifications>9?"9+":unreadNotifications}</span>}</button>{notificationsOpen&&<section role="dialog" aria-label="Notifications" style={{position:"absolute",right:0,top:48,width:360,maxWidth:"88vw",maxHeight:"min(70vh,520px)",overflowY:"auto",zIndex:130,padding:14,border:"1px solid var(--line,#343a3c)",borderRadius:15,background:"var(--panel,#191c1e)",color:"var(--text,#f4f2ef)",boxShadow:"0 22px 60px #0009"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:10}}><b style={{fontSize:14}}>Notifications</b><div style={{display:"flex",gap:10,alignItems:"center"}}>{unreadNotifications>0&&<button type="button" onClick={markAllNotificationsRead} style={{border:0,background:"transparent",color:"var(--accent,#ff9878)",fontSize:11,cursor:"pointer"}}>Mark all read</button>}<button type="button" aria-label="Close notifications" onClick={()=>setNotificationsOpen(false)} style={{border:0,background:"transparent",color:"inherit",fontSize:18,cursor:"pointer"}}>×</button></div></div>{notificationsLoading?<p className="empty-state">Loading notifications…</p>:!notifications.length?<p className="empty-state">You’re all caught up. New task assignments will appear here.</p>:notifications.map(item=><button key={item.id} type="button" onClick={()=>markNotificationRead(item.id)} style={{display:"grid",width:"100%",textAlign:"left",gap:4,padding:"11px 9px",border:0,borderTop:"1px solid var(--line,#343a3c)",background:item.read_at?"transparent":"var(--surface-muted,rgba(240,107,87,.09))",color:"inherit",cursor:"pointer"}}><span style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><b style={{fontSize:12}}>{item.title}</b>{!item.read_at&&<span style={{width:7,height:7,borderRadius:9,background:"#f06b57",flexShrink:0}}/>}</span><span style={{fontSize:12,color:"var(--muted,#a9b0b2)",lineHeight:1.45}}>{item.body}</span><span style={{fontSize:10,color:"var(--muted,#a9b0b2)"}}>{new Date(item.created_at).toLocaleString()}</span></button>)}</section>}</div><div className="top-avatar">{user.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot"/> YOUR WORKSPACE</div><h1>{heading}<span className="wave">✳</span></h1><p className="subtitle">{active==="Overview"?"A little progress each day adds up to big results.":"Your DailyManager workspace, all in one place."}</p></div><button className="primary-button" onClick={()=>create(active==="Projects"?"project":active==="Notes"?"note":"task")}><Plus size={17}/> {active==="Projects"?"New project":active==="Notes"?"New note":"New task"}</button></div>
          {selectedFeature && active===selectedFeature.name && <section className="panel feature-detail-screen">
            <div className="panel-heading"><div><button type="button" className="project-view-tasks" onClick={()=>setActive(selectedFeature.parent || "Overview")}><ArrowRight size={14} style={{transform:"rotate(180deg)"}}/> Back to {selectedFeature.parent || "workspace"}</button><h2 style={{marginTop:14}}>{selectedFeature.name}</h2><p>{selectedFeature.detail}</p></div><span className="task-status">{selectedFeature.status}</span></div>
            {selectedFeature.name === "Project Milestone Planner" ? <>
              <div className="feature-detail-card"><div className="feature-detail-icon"><CalendarDays size={22}/></div><div><h3>Project milestones</h3><p>Milestones are saved as dated tasks linked to a project. Complete them from your task list to update project progress.</p></div></div>
              <form onSubmit={createProjectMilestone} className="bulk-task-form">
                <label>Project<select value={milestoneProjectId} onChange={(event)=>setMilestoneProjectId(event.target.value)} required><option value="">Choose a project</option>{projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
                <label>Milestone name<input value={milestoneTitle} onChange={(event)=>setMilestoneTitle(event.target.value)} maxLength={500} placeholder="e.g. Design approved" required /></label>
                <div className="bulk-task-options"><label>Target date<input type="date" value={milestoneDate} onChange={(event)=>setMilestoneDate(event.target.value)} required /></label><label>Priority<select value={milestonePriority} onChange={(event)=>setMilestonePriority(event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label></div>
                <div className="bulk-task-footer"><span>Milestones use your existing project task tracking</span><button type="submit" disabled={busy || !milestoneTitle.trim() || !milestoneProjectId || !milestoneDate}>{busy ? "Adding…" : "Add milestone"}</button></div>
              </form>
              <div className="panel-heading" style={{marginTop:24}}><div><h3>Milestone timeline</h3><p>Upcoming and completed milestones across your projects.</p></div></div>
              <div className="milestone-list">{tasks.filter(task=>task.project_id && (task.description||"").includes("PROJECT MILESTONE")).sort((a,b)=>new Date(a.due_at||"9999-12-31")-new Date(b.due_at||"9999-12-31")).map(task=><div className="milestone-row" key={task.id}><span className={`milestone-marker ${task.status==="done"?"is-done":""}`}>{task.status==="done"?<Check size={13}/>:<CalendarDays size={13}/>}</span><div className="milestone-copy"><b>{task.title}</b><span>{projects.find(project=>String(project.id)===String(task.project_id))?.name || "Project"} · {task.due_at?new Date(task.due_at).toLocaleDateString():"No date"}</span></div><span className="task-status">{task.status==="done"?"Completed":task.status==="in_progress"?"In progress":"Upcoming"}</span></div>)}{!tasks.some(task=>task.project_id && (task.description||"").includes("PROJECT MILESTONE"))&&<p className="milestone-empty">No milestones yet. Add your first milestone above.</p>}</div>
            </> : selectedFeature.name === "Recurring task scheduler" ? <>
              <div className="feature-detail-card"><div className="feature-detail-icon"><CalendarDays size={22}/></div><div><h3>Schedule repeated tasks</h3><p>Create dated task occurrences in your workspace. Each occurrence is a normal editable task, so you can manage it independently.</p></div></div>
              <form onSubmit={createRecurringTasks} className="bulk-task-form">
                <label>Task title<input value={recurringTitle} onChange={(event)=>setRecurringTitle(event.target.value)} maxLength={500} placeholder="e.g. Send weekly performance report" required /></label>
                <div className="bulk-task-options"><label>First due date<input type="date" value={recurringStart} onChange={(event)=>setRecurringStart(event.target.value)} required /></label><label>Repeat<select value={recurringFrequency} onChange={(event)=>setRecurringFrequency(event.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><label>Occurrences<select value={recurringCount} onChange={(event)=>setRecurringCount(event.target.value)}><option value="2">2 times</option><option value="3">3 times</option><option value="4">4 times</option><option value="6">6 times</option><option value="8">8 times</option><option value="12">12 times</option></select></label><label>Priority<select value={recurringPriority} onChange={(event)=>setRecurringPriority(event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label></div>
                <label>Project<select value={recurringProject} onChange={(event)=>setRecurringProject(event.target.value)}><option value="">Personal / no project</option>{projects.map((project)=><option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
                <div className="bulk-task-footer"><span>{recurringCount} dated task occurrences will be created</span><button type="submit" disabled={busy || !recurringTitle.trim()}>{busy ? "Scheduling…" : "Create schedule"}</button></div>
              </form>
            </> : selectedFeature.name === "Bulk task creator" ? <>
              <div className="feature-detail-card"><div className="feature-detail-icon"><ClipboardList size={22}/></div><div><h3>Create tasks in one go</h3><p>Enter one task per line. Duplicate titles are removed, and each task is saved to your workspace individually.</p></div></div>
              <form onSubmit={createBulkTasks} className="bulk-task-form">
                <label>Task titles<textarea value={bulkTaskLines} onChange={(event)=>setBulkTaskLines(event.target.value)} rows={8} maxLength={12000} placeholder={"Prepare weekly report\nFollow up with client\nReview project timeline"} /></label>
                <div className="bulk-task-options"><label>Priority<select value={bulkTaskPriority} onChange={(event)=>setBulkTaskPriority(event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><label>Project<select value={bulkTaskProject} onChange={(event)=>setBulkTaskProject(event.target.value)}><option value="">Personal / no project</option>{projects.map((project)=><option key={project.id} value={project.id}>{project.name}</option>)}</select></label></div>
                <div className="bulk-task-footer"><span>{bulkTaskLines.split(/\r?\n/).filter((line)=>line.trim()).length} lines · maximum 30 tasks</span><button type="submit" disabled={busy || !bulkTaskLines.trim()}>{busy ? "Creating tasks…" : "Create tasks"}</button></div>
              </form>
            </> : selectedFeature.name === "Project Template gallery" ? <>
              <div className="feature-detail-card"><div className="feature-detail-icon"><FolderKanban size={22}/></div><div><h3>Project Template Gallery</h3><p>Choose a project starter to prefill the new-project form. Review the name and description before creating your project.</p></div></div>
              <div className="feature-template-grid">
                {[{name:"Website launch",description:"Plan a website delivery from kickoff to launch.",body:"Goal: Launch a reliable website.\n\nMilestones:\n1. Confirm requirements and scope\n2. Complete design and content\n3. Build and test core pages\n4. Review accessibility and mobile layouts\n5. Deploy and verify launch"},{name:"Marketing campaign",description:"Coordinate campaign planning and execution.",body:"Goal: Deliver a measurable marketing campaign.\n\nMilestones:\n1. Define audience and objective\n2. Agree on message and creative assets\n3. Prepare channel schedule\n4. Launch campaign\n5. Review results and next steps"},{name:"Product development",description:"Organize discovery, delivery and quality checks.",body:"Goal: Deliver a useful product increment.\n\nMilestones:\n1. Define user problem and success criteria\n2. Prioritize requirements\n3. Design and implement\n4. Test with representative users\n5. Release and collect feedback"},{name:"Operations improvement",description:"Structure an internal process improvement project.",body:"Goal: Improve an operational workflow.\n\nMilestones:\n1. Document current process\n2. Identify bottlenecks and risks\n3. Agree on proposed changes\n4. Pilot and measure results\n5. Document the new process"}].map(template=><button key={template.name} type="button" className="feature-template-card" onClick={()=>{setDraft({title:template.name,body:template.body,description:template.body,due_at:"",project_id:"",priority:"medium"});setSelectedFeature(null);setActive("Projects");setModal("project");}}><span className="feature-template-icon"><FolderKanban size={19}/></span><b>{template.name}</b><p>{template.description}</p><span className="feature-template-action">Use project template <ArrowRight size={14}/></span></button>)}
              </div>
            </> : selectedFeature.name === "Task Template gallery" ? <>
              <div className="feature-detail-card"><div className="feature-detail-icon"><ClipboardList size={22}/></div><div><h3>Start with a task template</h3><p>Choose a starter workflow. The template pre-fills the task form, and you can edit everything before saving it to your workspace.</p></div></div>
              <div className="feature-template-grid">
                {[{name:"Quick task",description:"A single action with a clear outcome.",priority:"medium",body:"Define the next action and mark it complete when finished."},{name:"Urgent follow-up",description:"Prioritize a time-sensitive response.",priority:"urgent",body:"Confirm the required response, contact the relevant person, and record the outcome."},{name:"Project kickoff",description:"Set up the first step of a new project.",priority:"high",body:"Confirm the goal, identify stakeholders, list first milestones, and agree on the next review."},{name:"Weekly review",description:"Review progress and plan the next week.",priority:"medium",body:"Review open tasks, check overdue work, update priorities, and plan the coming week."}].map(template=><button key={template.name} type="button" className="feature-template-card" onClick={()=>{setDraft({title:template.name==="Quick task"?"":template.name,body:"",description:template.body,due_at:"",project_id:"",priority:template.priority});setSelectedFeature(null);setActive("My tasks");setModal("task");}}><span className="feature-template-icon"><ClipboardList size={19}/></span><b>{template.name}</b><p>{template.description}</p><span className="feature-template-action">Use template <ArrowRight size={14}/></span></button>)}
              </div>
            </> : selectedFeature.name.toLowerCase().includes("rule") || selectedFeature.name.toLowerCase().includes("automation") || selectedFeature.name.toLowerCase().includes("workflow") ? <>
              <div className="feature-detail-card"><div className="feature-detail-icon"><Workflow size={22}/></div><div><h3>Workflow designer</h3><p>Define a trigger, add conditions, choose an action, then review each run before enabling automation.</p></div></div>
              <div className="feature-workflow-preview"><label>When this happens<select disabled defaultValue="task_due"><option value="task_due">A task reaches its due date</option><option>Task status changes</option><option>A request is submitted</option></select></label><span className="feature-flow-arrow"><ArrowRight size={18}/></span><label>Then do this<select disabled defaultValue="notify"><option value="notify">Notify the task owner</option><option>Create a follow-up task</option><option>Request approval</option></select></label></div>
              <div className="feature-roadmap-note"><span className="task-status">Design preview only</span><p>Automation execution, permissions, retry handling and run history are not implemented yet.</p></div>
            </> : selectedFeature.name.toLowerCase().includes("report") || selectedFeature.name.toLowerCase().includes("forecast") || selectedFeature.name.toLowerCase().includes("analytics") ? <>
              <div className="feature-detail-card"><div className="feature-detail-icon"><ChartNoAxesCombined size={22}/></div><div><h3>Report configuration</h3><p>Choose the measures, reporting period and grouping for a future workspace report.</p></div></div>
              <div className="feature-workflow-preview"><label>Measure<select disabled defaultValue="completion"><option value="completion">Task completion</option><option>Workload by owner</option><option>Project delivery</option></select></label><label>Date range<select disabled defaultValue="30"><option value="30">Last 30 days</option><option>This week</option><option>This quarter</option></select></label><label>Group by<select disabled defaultValue="project"><option value="project">Project</option><option>Assignee</option><option>Priority</option></select></label></div>
              <div className="feature-roadmap-note"><span className="task-status">Design preview only</span><p>Custom report saving and historical trend calculations still need implementation.</p></div>
            </> : selectedFeature.name.toLowerCase().includes("client") || selectedFeature.name.toLowerCase().includes("lead") || selectedFeature.name.toLowerCase().includes("deal") || selectedFeature.name.toLowerCase().includes("relationship") ? <>
              <div className="feature-detail-card"><div className="feature-detail-icon"><ContactRound size={22}/></div><div><h3>Client relationship workspace</h3><p>A dedicated CRM workspace will organize contacts, deal stages, meetings and follow-up actions.</p></div></div>
              <div className="feature-workflow-preview"><label>Record type<select disabled defaultValue="lead"><option value="lead">Lead / prospect</option><option>Client account</option><option>Opportunity</option></select></label><label>Pipeline stage<select disabled defaultValue="new"><option value="new">New</option><option>Contacted</option><option>Qualified</option><option>Won / lost</option></select></label></div>
              <div className="feature-roadmap-note"><span className="task-status">Design preview only</span><p>CRM records, activity timelines, pipeline changes and access controls are not active yet.</p></div>
            </> : selectedFeature.name.toLowerCase().includes("expense") || selectedFeature.name.toLowerCase().includes("invoice") || selectedFeature.name.toLowerCase().includes("budget") || selectedFeature.name.toLowerCase().includes("billing") ? <>
              <div className="feature-detail-card"><div className="feature-detail-icon"><WalletCards size={22}/></div><div><h3>Finance record workspace</h3><p>The intended workflow tracks financial records separately from tasks and projects, with clear status and due-date fields.</p></div></div>
              <div className="feature-workflow-preview"><label>Record status<select disabled defaultValue="draft"><option value="draft">Draft</option><option>Awaiting payment</option><option>Paid</option><option>Overdue</option></select></label><label>Currency<select disabled defaultValue="NGN"><option value="NGN">NGN — Nigerian naira</option><option>USD — US dollar</option><option>GBP — Pound sterling</option></select></label></div>
              <div className="feature-roadmap-note"><span className="task-status">Design preview only</span><p>No invoices, payments or accounting entries are being created by this screen.</p></div>
            </> : <>
              <div className="feature-detail-card"><div className="feature-detail-icon"><Sparkles size={22}/></div><div><h3>{selectedFeature.name}</h3><p>{selectedFeature.detail} This dedicated screen is the specification for this feature, not a claim that its backend is already live.</p></div></div>
              <div className="feature-workflow-preview"><div className="feature-step"><span>01</span><b>Configure</b><p>Set the options and rules specific to {selectedFeature.name.toLowerCase()}.</p></div><div className="feature-step"><span>02</span><b>Review</b><p>Validate the information before changes are applied.</p></div><div className="feature-step"><span>03</span><b>Track</b><p>View saved records, activity and any errors in this tool.</p></div></div>
              <div className="feature-roadmap-note"><span className="task-status">Not active yet</span><p>This feature still needs its own data model, working actions, permissions and tests before it can be marked available.</p></div>
            </>}
          </section>}
          {active==="Overview" && <><div className="focus-banner"><div className="focus-orb"><Sparkles size={21}/></div><div className="focus-text"><span>YOUR DAILY FOCUS</span><b>Make today count, one thing at a time.</b><small>You have {openTasks} tasks left to move your day forward.</small></div><div className="focus-right"><div className="focus-progress"><span style={{width:`${tasks.length?completed/tasks.length*100:0}%`}}/></div><small>{completed} of {tasks.length} completed</small></div><Sparkles className="banner-spark" size={82}/></div><div className="stats-grid"><article className="stat-card"><div className="stat-top"><span className="stat-icon violet"><ListTodo size={18}/></span></div><p>Open tasks</p><div className="stat-number">{openTasks}</div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon green"><Check size={18}/></span></div><p>Completed</p><div className="stat-number">{completed}</div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon orange"><FolderKanban size={18}/></span></div><p>Active projects</p><div className="stat-number">{projects.length}</div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon pink"><FileText size={18}/></span></div><p>Notes</p><div className="stat-number">{notes.length}</div></article></div></>}
          {active==="Overview" && <section className="panel" style={{marginTop:20}}><div className="panel-heading"><div><h2>Focus queue</h2><p>Your next actions, ready when you are.</p></div><button className="period-select" onClick={()=>setActive("My tasks")}>View all <ArrowRight size={14}/></button></div>{visibleTasks.filter(t=>t.status!=="done").slice(0,6).map(t=><TaskRow key={t.id} task={t} onToggle={toggleTask} onStatusChange={updateTaskStatus} onEdit={editTask} onDelete={deleteTask} onDiscuss={openTaskComments}/>)}{!visibleTasks.filter(t=>t.status!=="done").length&&<p className="empty-state">No open tasks yet. Add your first one to get started.</p>}</section>}
          {active==="My tasks" && <section className="panel"><div className="panel-heading"><div><h2>All tasks</h2><p>{openTasks} open · {completed} completed · {tasks.filter(task=>task.status==="cancelled").length} cancelled</p></div><button className="primary-button" onClick={()=>create("task")}><Plus size={15}/> New task</button></div><div className="task-toolbar" role="group" aria-label="Filter tasks">{[["all","All tasks"],["assigned_to_me","Assigned to me"],["open","Open"],["in_progress","In progress"],["today","Due today"],["overdue","Overdue"],["unscheduled","No due date"],["priority","High priority"],["done","Completed"],["cancelled","Cancelled"]].map(([value,label])=>{const count=filteredTasks.filter(task=>{if(value==="all")return true;if(value==="assigned_to_me")return String(task.assigned_to||"")===String(user?.id||"");if(value==="done")return task.status==="done";if(value==="cancelled")return task.status==="cancelled";if(value==="open")return !["done","cancelled"].includes(task.status);if(value==="in_progress")return task.status==="in_progress";if(value==="unscheduled")return !["done","cancelled"].includes(task.status)&&!task.due_at;if(value==="today")return !["done","cancelled"].includes(task.status)&&task.due_at&&parseDueDate(task.due_at).toDateString()===todayStart.toDateString();if(value==="overdue")return !["done","cancelled"].includes(task.status)&&task.due_at&&parseDueDate(task.due_at)<todayStart;if(value==="priority")return !["done","cancelled"].includes(task.status)&&["high","urgent"].includes(task.priority);return false;}).length;return <button key={value} className={taskFilter===value?"selected":""} onClick={()=>setTaskFilter(value)} aria-pressed={taskFilter===value}>{label}<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:20,height:20,padding:"0 5px",marginLeft:7,borderRadius:999,fontSize:11,fontWeight:700,background:taskFilter===value?"rgba(255,255,255,.18)":"var(--surface-muted,rgba(127,127,127,.12))",color:"inherit"}}>{count}</span></button>})}</div><div style={{display:"flex",alignItems:"center",gap:10,margin:"12px 0 16px",flexWrap:"wrap"}}><label htmlFor="task-sort" style={{fontSize:13,color:"var(--muted,#a5a5a5)"}}>Sort by</label><select id="task-sort" value={taskSort} onChange={e=>setTaskSort(e.target.value)} style={{...inputStyle,width:"auto",minWidth:170,padding:"9px 12px"}}><option value="due">Due date (earliest first)</option><option value="priority">Priority (highest first)</option><option value="recent">Recently updated</option><option value="title">Task name (A–Z)</option></select></div>{sortedTasksByFilter.map(t=><TaskRow key={t.id} task={t} onToggle={toggleTask} onStatusChange={updateTaskStatus} onEdit={editTask} onDelete={deleteTask}/>)}{!filteredTasksByFilter.length&&<p className="empty-state">No tasks match this filter. Try another view or create a task.</p>}</section>}
          {active==="Task board" && <section className="panel">
            <div className="panel-heading"><div><h2>Task Kanban board</h2><p>Move work through stages and keep the next action visible.</p></div><button className="primary-button" onClick={()=>create("task")}><Plus size={15}/> New task</button></div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",margin:"8px 0 18px"}}><input aria-label="Search board tasks" placeholder="Search task titles…" value={search} onChange={e=>setSearch(e.target.value)} style={{...inputStyle,flex:"1 1 220px",maxWidth:420}}/><button className="period-select" onClick={()=>setActive("My tasks")}>Open full task list <ArrowRight size={14}/></button></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,230px),1fr))",gap:12,alignItems:"start"}}>
              {[
                {status:"todo",title:"To do",description:"Ready to start",accent:"#9ba4aa"},
                {status:"in_progress",title:"In progress",description:"Work underway",accent:"#e7b76b"},
                {status:"done",title:"Completed",description:"Finished work",accent:"#80d5a5"},
                {status:"cancelled",title:"Cancelled",description:"No longer proceeding",accent:"#e99a9a"}
              ].map(column=>{
                const columnTasks=filteredTasks.filter(task=>(task.status||"todo")===column.status);
                return <section key={column.status} aria-label={column.title+" tasks"} style={{border:"1px solid #303638",borderRadius:14,background:"#111415",padding:12,minHeight:180}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:4}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:8,height:8,borderRadius:99,background:column.accent}}/><h3 style={{margin:0,fontSize:14}}>{column.title}</h3></div><span className="task-status">{columnTasks.length}</span></div><p style={{margin:"0 0 12px",fontSize:11,color:"#a9b0b2"}}>{column.description}</p>
                  <div style={{display:"grid",gap:9}}>{columnTasks.map(task=><article key={task.id} style={{border:"1px solid #343a3d",borderRadius:11,padding:12,background:"#191c1e",display:"grid",gap:9}}>
                    <b style={{fontSize:13,lineHeight:1.45,overflowWrap:"anywhere"}}>{task.title}</b><p style={{margin:0,fontSize:11,color:"#a9b0b2",lineHeight:1.5}}>{task.project_name||"Personal"} · {(task.priority||"medium").toUpperCase()} priority{task.due_at?" · "+parseDueDate(task.due_at).toLocaleDateString():""}</p>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}><select aria-label={"Move "+task.title+" to stage"} value={task.status||"todo"} onChange={e=>updateTaskStatus(task,e.target.value)} style={{...inputStyle,padding:"7px 8px",fontSize:11,flex:"1 1 120px"}}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Completed</option><option value="cancelled">Cancelled</option></select><button type="button" className="icon-button" aria-label={"Edit "+task.title} title="Edit task" onClick={()=>editTask(task)}><Pencil size={13}/></button></div>
                  </article>)}
                  {!columnTasks.length&&<p className="empty-state" style={{padding:"18px 8px",fontSize:12}}>No tasks in this stage.</p>}</div>
                </section>;
              })}
            </div>
            <p style={{marginTop:16,fontSize:12,color:"#9da5a8"}}>Changes save to the workspace through the existing task status API. This board currently uses status controls rather than drag-and-drop.</p>
          </section>}
          {active==="Task table" && <section className="panel">
            <div className="panel-heading"><div><h2>Task table</h2><p>Scan and update task records in a structured view.</p></div><button className="primary-button" onClick={()=>create("task")}><Plus size={15}/> New task</button></div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",margin:"8px 0 16px"}}><input aria-label="Search task table" placeholder="Search tasks…" value={search} onChange={e=>setSearch(e.target.value)} style={{...inputStyle,flex:"1 1 220px",maxWidth:420}}/><label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#a9b0b2"}}>Sort<select aria-label="Sort task table" value={taskSort} onChange={e=>setTaskSort(e.target.value)} style={{...inputStyle,width:"auto",minWidth:145,padding:"9px 10px"}}><option value="due">Due date</option><option value="priority">Priority</option><option value="recent">Recently updated</option><option value="title">Name A–Z</option></select></label><button type="button" className="project-view-tasks" onClick={()=>{const rows=[["Task","Description","Project","Priority","Due date","Status"],...sortedTasksByFilter.map(task=>[task.title,task.description||"",task.project_name||"Personal",task.priority||"medium",task.due_at?parseDueDate(task.due_at).toISOString().slice(0,10):"",task.status||"todo"])];const csv=rows.map(row=>row.map(value=>`"${String(value??"").replaceAll('"','""')}"`).join(",")).join("\r\n");const blob=new Blob(["\\uFEFF",csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="dailymanager-tasks.csv";document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);setNotice(`Exported ${sortedTasksByFilter.length} tasks.`);}}><Files size={14}/> Export CSV</button></div>
            <div style={{overflowX:"auto",border:"1px solid #303638",borderRadius:12}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:720,textAlign:"left",fontSize:12}}>
                <thead><tr style={{background:"#171a1b",color:"#a9b0b2"}}>{["Task","Project","Priority","Due date","Status","Actions"].map(label=><th key={label} scope="col" style={{padding:"12px 13px",fontWeight:700,borderBottom:"1px solid #303638",whiteSpace:"nowrap"}}>{label}</th>)}</tr></thead>
                <tbody>{sortedTasksByFilter.map(task=><tr key={task.id}>
                  <td style={{padding:"13px",borderBottom:"1px solid #292e30",maxWidth:250}}><b style={{display:"block",overflowWrap:"anywhere",textDecoration:task.status==="done"?"line-through":"none"}}>{task.title}</b><span style={{display:"block",marginTop:4,color:"#9da5a8",maxWidth:260,overflowWrap:"anywhere"}}>{task.description||"No description"}</span></td>
                  <td style={{padding:"13px",borderBottom:"1px solid #292e30"}}>{task.project_name||"Personal"}</td>
                  <td style={{padding:"13px",borderBottom:"1px solid #292e30",textTransform:"capitalize"}}>{task.priority||"medium"}</td>
                  <td style={{padding:"13px",borderBottom:"1px solid #292e30",whiteSpace:"nowrap"}}>{task.due_at?parseDueDate(task.due_at).toLocaleDateString():"—"}</td>
                  <td style={{padding:"13px",borderBottom:"1px solid #292e30"}}><select aria-label={"Status for "+task.title} value={task.status||"todo"} onChange={e=>updateTaskStatus(task,e.target.value)} style={{...inputStyle,padding:"7px 8px",fontSize:11,minWidth:112}}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Completed</option><option value="cancelled">Cancelled</option></select></td>
                  <td style={{padding:"13px",borderBottom:"1px solid #292e30",whiteSpace:"nowrap"}}><button type="button" className="icon-button" aria-label={"Edit "+task.title} title="Edit task" onClick={()=>editTask(task)}><Pencil size={13}/></button> <button type="button" className="icon-button" aria-label={"Delete "+task.title} title="Delete task" onClick={()=>deleteTask(task)}><Trash2 size={13}/></button></td>
                </tr>)}</tbody>
              </table>
            </div>
            {!sortedTasksByFilter.length&&<p className="empty-state">No task records match your search. Create a task or clear the search.</p>}
            <p style={{marginTop:14,fontSize:12,color:"#9da5a8"}}>{sortedTasksByFilter.length} task record{sortedTasksByFilter.length===1?"":"s"} shown. Status changes save through the workspace API.</p>
          </section>}
          {active==="Project portfolio" && <section className="panel">
            <div className="panel-heading"><div><h2>Project portfolio</h2><p>A portfolio-level view of delivery, workload, and project health.</p></div><button className="primary-button" onClick={()=>create("project")}><Plus size={15}/> New project</button></div>
            <div className="stats-grid" style={{marginBottom:20}}>
              <article className="stat-card"><div className="stat-top"><span className="stat-icon orange"><FolderKanban size={17}/></span></div><p>Total projects</p><div className="stat-number">{projects.length}</div></article>
              <article className="stat-card"><div className="stat-top"><span className="stat-icon green"><CheckCircle2 size={17}/></span></div><p>Tasks completed</p><div className="stat-number">{tasks.filter(t=>t.status==="done").length}</div></article>
              <article className="stat-card"><div className="stat-top"><span className="stat-icon pink"><Clock size={17}/></span></div><p>Overdue open tasks</p><div className="stat-number">{overdueTasks.length}</div></article>
              <article className="stat-card"><div className="stat-top"><span className="stat-icon violet"><Activity size={17}/></span></div><p>Projects with tasks</p><div className="stat-number">{projects.filter(p=>tasks.some(t=>String(t.project_id||"")===String(p.id))).length}</div></article>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:16}}>
              <input aria-label="Search project portfolio" placeholder="Search projects by name or description…" value={search} onChange={e=>setSearch(e.target.value)} style={{...inputStyle,flex:"1 1 250px",maxWidth:460}}/>
              <button className="period-select" onClick={()=>setActive("Projects")}>Manage all projects <ArrowRight size={14}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))",gap:14}}>
              {filteredProjects.map(project=>{
                const linked=tasks.filter(t=>String(t.project_id||"")===String(project.id));
                const countedLinked=linked.filter(t=>t.status!=="cancelled");
                const done=countedLinked.filter(t=>t.status==="done").length;
                const open=linked.filter(t=>!["done","cancelled"].includes(t.status));
                const overdue= open.filter(t=>t.due_at&&parseDueDate(t.due_at)<todayStart).length;
                const progress=countedLinked.length?Math.round(done/countedLinked.length*100):0;
                const health=overdue>0?"Needs attention":countedLinked.length&&progress===100?"Completed":countedLinked.length?"On track":"Not started";
                const healthColor=overdue>0?"#f0a0a0":countedLinked.length&&progress===100?"#8ed9ab":countedLinked.length?"#e9c27b":"#aab2b6";
                return <article key={project.id} style={{border:"1px solid #303638",borderRadius:15,padding:17,background:"#121516",display:"grid",gap:13,alignContent:"start"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",gap:10}}><span className="stat-icon orange"><FolderKanban size={17}/></span><span className="task-status" style={{color:healthColor,borderColor:healthColor+"55"}}>{health}</span></div>
                  <div><h3 style={{fontSize:16,margin:"0 0 6px",overflowWrap:"anywhere"}}>{project.name}</h3><p style={{fontSize:12,color:"#a9b0b2",lineHeight:1.6,margin:0}}>{project.description||"No project description yet."}</p></div>
                  <div className="project-progress-label"><span>{done} / {countedLinked.length} tasks complete</span><b>{progress}%</b></div><div className="focus-progress"><span style={{width:progress+"%"}}/></div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8}}>{[{label:"Open",value:open.length},{label:"Overdue",value:overdue},{label:"Cancelled",value:linked.filter(t=>t.status==="cancelled").length}].map(item=><div key={item.label} style={{background:"#1a1e20",borderRadius:9,padding:"10px 8px"}}><span style={{display:"block",fontSize:10,color:"#9da5a8",marginBottom:5}}>{item.label}</span><b style={{fontSize:17}}>{item.value}</b></div>)}</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="project-view-tasks" onClick={()=>{setSearch(project.name);setActive("My tasks");setTaskFilter("all");}}>View tasks <ArrowRight size={14}/></button><button className="project-view-tasks" onClick={()=>{setSelectedProjectId(project.id);setActive("Project details");}}>Details <ArrowRight size={13}/></button><button className="project-view-tasks" onClick={()=>editProject(project)}>Edit project <Pencil size={13}/></button></div>
                </article>;
              })}
            </div>
            {!filteredProjects.length&&<p className="empty-state">{projects.length?"No projects match this search. Try a different keyword.":"Your portfolio is empty. Create your first project to start tracking delivery."}</p>}
            <p style={{fontSize:11,color:"#929b9f",marginTop:16}}>Health is calculated from linked task status and due dates; it is a lightweight signal, not a project-risk prediction.</p>
          </section>}
          {active==="Project details" && (() => {
            const project=projects.find(item=>String(item.id)===String(selectedProjectId));
            if(!project) return <section className="panel"><div className="panel-heading"><div><h2>Select a project</h2><p>Open a project from Projects or Project Portfolio to inspect its delivery.</p></div><button className="period-select" onClick={()=>setActive("Projects")}>Back to projects <ArrowRight size={14}/></button></div>{projects.map(item=><button key={item.id} className="task-row" style={{width:"100%",textAlign:"left",background:"transparent",borderLeft:0,borderRight:0,borderBottom:0}} onClick={()=>setSelectedProjectId(item.id)}><span className="stat-icon orange"><FolderKanban size={17}/></span><span className="task-info"><b>{item.name}</b><span>{item.description||"No description yet"}</span></span><ArrowRight size={15}/></button>)}</section>;
            const related=tasks.filter(task=>String(task.project_id||"")===String(project.id));
            const countedRelated=related.filter(task=>task.status!=="cancelled");
            const done=countedRelated.filter(task=>task.status==="done").length;
            const activeTasks=related.filter(task=>!["done","cancelled"].includes(task.status));
            const overdue=activeTasks.filter(task=>task.due_at&&parseDueDate(task.due_at)<todayStart);
            const progress=countedRelated.length?Math.round(done/countedRelated.length*100):0;
            const priorityGroups=[{key:"urgent",label:"Urgent"},{key:"high",label:"High"},{key:"medium",label:"Medium"},{key:"low",label:"Low"}];
            const todayKey=new Date(); todayKey.setHours(0,0,0,0);
            const nextWeek=new Date(todayKey); nextWeek.setDate(nextWeek.getDate()+7);
            const dueNextWeek=activeTasks.filter(task=>task.due_at&&parseDueDate(task.due_at)>=todayKey&&parseDueDate(task.due_at)<nextWeek).sort((a,b)=>parseDueDate(a.due_at)-parseDueDate(b.due_at));
            const unscheduled=activeTasks.filter(task=>!task.due_at).length;

            const statusGroups=[{key:"todo",label:"To do"},{key:"in_progress",label:"In progress"},{key:"done",label:"Completed"},{key:"cancelled",label:"Cancelled"}];
            return <div style={{display:"grid",gap:18}}>
              <section className="panel">
                <div className="panel-heading"><div><button className="text-action" onClick={()=>setActive("Projects")}><ArrowRight size={13} style={{transform:"rotate(180deg)"}}/> All projects</button><h2 style={{marginTop:9}}>{project.name}</h2><p>{project.description||"Add a description to explain this project's purpose and outcomes."}</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="period-select" onClick={()=>editProject(project)}><Pencil size={13}/> Edit</button><button className="primary-button" onClick={()=>{setSearch("");setDraft({title:"",body:"",description:"",due_at:"",project_id:String(project.id),priority:"medium"});setModal("task");}}><Plus size={14}/> Add task</button></div></div>
                <div className="stats-grid" style={{marginBottom:0}}>
                  <article className="stat-card"><div className="stat-top"><span className="stat-icon orange"><FolderKanban size={17}/></span></div><p>Completion</p><div className="stat-number">{progress}%</div></article>
                  <article className="stat-card"><div className="stat-top"><span className="stat-icon violet"><ListTodo size={17}/></span></div><p>Tasks counted</p><div className="stat-number">{countedRelated.length}</div></article>
                  <article className="stat-card"><div className="stat-top"><span className="stat-icon green"><CheckCircle2 size={17}/></span></div><p>Completed</p><div className="stat-number">{done}</div></article>
                  <article className="stat-card"><div className="stat-top"><span className="stat-icon pink"><Clock size={17}/></span></div><p>Overdue</p><div className="stat-number">{overdue.length}</div></article>
                </div>
                <div style={{marginTop:17}}><div className="project-progress-label"><span>Delivery progress</span><b>{done} of {countedRelated.length} complete</b></div><div className="focus-progress"><span style={{width:progress+"%"}}/></div></div>
                <div className="project-report-actions"><button type="button" className="project-view-tasks" onClick={()=>exportProjectReport(project,related)}><Files size={14}/> Export project report (CSV)</button><span>Includes every linked task, status, priority and due date.</span></div>
              </section>
              <section className="panel project-workload-panel">
                <div className="panel-heading"><div><h2>Workload &amp; schedule</h2><p>See how open work is distributed and what is due next.</p></div><span className="task-status">{activeTasks.length} open</span></div>
                <div className="project-workload-stats">
                  <article><span>Overdue</span><b className={overdue.length?"workload-danger":""}>{overdue.length}</b></article>
                  <article><span>Due in 7 days</span><b>{dueNextWeek.length}</b></article>
                  <article><span>Unscheduled</span><b>{unscheduled}</b></article>
                </div>
                <div className="project-priority-list"><h3>Open tasks by priority</h3>
                  {priorityGroups.map(group=>{const count=activeTasks.filter(task=>(task.priority||"medium")===group.key).length;const width=activeTasks.length?Math.round(count/activeTasks.length*100):0;return <div className="project-priority-row" key={group.key}><span>{group.label}</span><div className="project-priority-track"><i style={{width:width+"%"}}/></div><b>{count}</b></div>})}
                </div>
                <div className="project-upcoming-list"><h3>Next 7 days</h3>
                  {dueNextWeek.slice(0,8).map(task=><div className="project-upcoming-row" key={task.id}><div><b>{task.title}</b><span>{task.priority||"medium"} priority</span></div><time>{parseDueDate(task.due_at).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}</time></div>)}
                  {!dueNextWeek.length&&<p className="empty-state">No open tasks are due in the next seven days.</p>}
                </div>
              </section>
              {tasks.some(task=>!task.project_id&&![ "done", "cancelled" ].includes(task.status)) && <section className="panel">
                <div className="panel-heading"><div><h2>Unassigned tasks</h2><p>Add existing personal tasks to this project without recreating them.</p></div><span className="task-status">{tasks.filter(task=>!task.project_id&&![ "done", "cancelled" ].includes(task.status)).length} available</span></div>
                <div style={{display:"grid",gap:8}}>
                  {tasks.filter(task=>!task.project_id&&![ "done", "cancelled" ].includes(task.status)).slice(0,12).map(task=><div key={task.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",padding:"12px 0",borderTop:"1px solid #2b3032"}}>
                    <div style={{display:"grid",gap:4,minWidth:0,flex:"1 1 200px"}}><b style={{fontSize:13,overflowWrap:"anywhere"}}>{task.title}</b><span style={{fontSize:11,color:"#9da5a8"}}>{task.priority||"medium"} priority · {task.due_at?"Due "+parseDueDate(task.due_at).toLocaleDateString(undefined,{month:"short",day:"numeric"}):"No due date"}</span></div>
                    <button type="button" className="project-view-tasks" disabled={busy} onClick={()=>assignTaskToProject(task,project)}><Plus size={14}/> Add to project</button>
                  </div>)}
                </div>
                {tasks.filter(task=>!task.project_id&&![ "done", "cancelled" ].includes(task.status)).length>12&&<p style={{fontSize:11,color:"#9da5a8"}}>Showing the first 12 unassigned open tasks.</p>}
              </section>}
              <section className="panel"><div className="panel-heading"><div><h2>Project tasks</h2><p>Update task status or open a task to edit its details.</p></div><button className="period-select" onClick={()=>{setSearch(project.name);setActive("My tasks");setTaskFilter("all");}}>Open task list <ArrowRight size={14}/></button></div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:12}}>
                  {statusGroups.map(group=>{const grouped=related.filter(task=>task.status===group.key);return <div key={group.key} style={{border:"1px solid #2d3234",borderRadius:12,padding:12,background:"#121516",minWidth:0}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}><b style={{fontSize:12}}>{group.label}</b><span className="task-status">{grouped.length}</span></div>
                    {grouped.map(task=><article key={task.id} style={{padding:"11px 0",borderTop:"1px solid #2b3032",display:"grid",gap:8}}><b style={{fontSize:12,overflowWrap:"anywhere",textDecoration:task.status==="done"?"line-through":"none"}}>{task.title}</b><span style={{fontSize:10,color:"#9da5a8"}}>{task.due_at?"Due "+parseDueDate(task.due_at).toLocaleDateString(undefined,{month:"short",day:"numeric"}):"No due date"} · {task.priority||"medium"}</span><div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}><select aria-label={"Status for "+task.title} value={task.status||"todo"} onChange={e=>updateTaskStatus(task,e.target.value)} className="period-select" style={{maxWidth:"100%"}}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Completed</option><option value="cancelled">Cancelled</option></select><button className="icon-button" title="Edit task" aria-label={"Edit "+task.title} onClick={()=>editTask(task)}><Pencil size={13}/></button><button className="icon-button" title="Delete task" aria-label={"Delete "+task.title} onClick={()=>deleteTask(task)}><Trash2 size={13}/></button></div></article>)}
                    {!grouped.length&&<p style={{fontSize:11,color:"#838c8f",padding:"8px 0"}}>No tasks here yet.</p>}
                  </div>})}
                </div>
                {!related.length&&<p className="empty-state">This project has no tasks yet. Use Add task to create its first task.</p>}
              </section>
            </div>;
          })()}
          {active==="Projects" && <section className="panel"><div className="panel-heading"><div><h2>Your projects</h2><p>Track progress across the work you're building.</p></div><button className="primary-button" onClick={()=>create("project")}><Plus size={15}/> New project</button></div><div className="project-grid">{filteredProjects.map(p=>{const projectTasks=tasks.filter(t=>String(t.project_id||"")===String(p.id));const countedProjectTasks=projectTasks.filter(t=>t.status!=="cancelled");const projectDone=countedProjectTasks.filter(t=>t.status==="done").length;const progress=countedProjectTasks.length?Math.round(projectDone/countedProjectTasks.length*100):0;return <article key={p.id} className="project-card"><div className="project-card-top"><span className="stat-icon orange"><FolderKanban size={17}/></span><span className="project-status">{p.status||"Active"}</span></div><h3>{p.name}</h3><p>{p.description||"A dedicated space for this project."}</p><div style={{display:"flex",gap:8,marginTop:8}}><button className="icon-button" aria-label={"Edit project "+p.name} title="Edit project" onClick={()=>editProject(p)}><Pencil size={14}/></button><button className="icon-button" aria-label={"Delete project "+p.name} title="Delete project" onClick={()=>deleteProject(p)}><Trash2 size={14}/></button></div><div className="project-progress-label"><span>{projectDone} of {countedProjectTasks.length} tasks complete</span><b>{progress}%</b></div><div className="focus-progress"><span style={{width:`${progress}%`}}/></div><button className="project-view-tasks" onClick={()=>{setSelectedProjectId(p.id);setActive("Project details");}}>Project details <ArrowRight size={14}/></button><button className="project-view-tasks" onClick={()=>{setSearch(p.name);setActive("My tasks");setTaskFilter("all");}}>View related tasks <ArrowRight size={14}/></button></article>})}</div>{!filteredProjects.length&&<p className="empty-state">Your first project starts here. Create one, then assign tasks to it.</p>}</section>}
          {active==="Notes" && <section className="panel"><div className="panel-heading"><div><h2>Workspace notes</h2><p>Keep decisions and useful ideas close.</p></div><button className="primary-button" onClick={()=>create("note")}><Plus size={15}/> New note</button></div>{filteredNotes.map(n=><article key={n.id} className="task-row note-row"><span className="stat-icon pink"><FileText size={17}/></span><div className="task-info"><b>{n.title}</b><span className="note-preview">{n.body||"No note content yet."}</span><small className="note-meta">{n.updated_at?`Updated ${new Date(n.updated_at).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}`:"Saved note"}</small></div><div style={{display:"flex",gap:6,flexShrink:0}}><button className="icon-button" aria-label={"Edit note "+n.title} title="Edit note" onClick={()=>editNote(n)}><Pencil size={14}/></button><button className="icon-button" aria-label={"Delete note "+n.title} title="Delete note" onClick={()=>deleteNote(n)}><Trash2 size={14}/></button></div></article>)}{!filteredNotes.length&&<p className="empty-state">{notes.length?"No notes match your search. Try a different keyword.":"Your knowledge hub starts with one good note."}</p>}</section>}
          {active==="Planner" && <section className="panel"><div className="panel-heading"><div><h2>Plan your day</h2><p>Tasks are sorted by due date, with overdue work surfaced first.</p></div><button className="primary-button" onClick={()=>create("task")}><Plus size={15}/> Add task</button></div><div className="planner-summary"><article><span>Overdue</span><b>{overdueTasks.length}</b></article><article><span>Due today</span><b>{dueTodayTasks.length}</b></article><article><span>Open tasks</span><b>{plannerTasks.length}</b></article></div>{plannerTasks.map(t=>{const overdue=!!t.due_at&&parseDueDate(t.due_at)<todayStart;const dueToday=!!t.due_at&&parseDueDate(t.due_at).toDateString()===todayStart.toDateString();return <div key={t.id} className="task-row"><CalendarDays size={17}/><div className="task-info"><b>{t.title}</b><span>{t.due_at?parseDueDate(t.due_at).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric"}):"No due date set"} · {t.priority||"medium"} priority · {projects.find(p=>String(p.id)===String(t.project_id))?.name||"No project"}</span></div><span className={"task-status"+(overdue?" planner-overdue":dueToday?" planner-today":"")}>{overdue?"Overdue":dueToday?"Due today":t.due_at?"Upcoming":"Unscheduled"}</span><div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><select aria-label={"Status for "+t.title} value={t.status||"todo"} onChange={e=>updateTaskStatus(t,e.target.value)} className="period-select" style={{maxWidth:135}}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Completed</option><option value="cancelled">Cancelled</option></select><button className="icon-button" title="Edit task" aria-label={"Edit "+t.title} onClick={()=>editTask(t)}><Pencil size={13}/></button><button className="icon-button" title="Delete task" aria-label={"Delete "+t.title} onClick={()=>deleteTask(t)}><Trash2 size={13}/></button></div></div>})}{!plannerTasks.length&&<p className="empty-state">Nothing planned yet. Add a task and give it a due date to see it here.</p>}</section>}
          {active==="Calendar" && <section className="panel">
            <div className="panel-heading"><div><h2>Calendar</h2><p>See your scheduled work by date. Select a day to review its tasks.</p></div><button className="primary-button" onClick={()=>createTaskForDate(selectedCalendarDate)}><Plus size={15}/> Add task</button></div>
            {(() => {
              const year=calendarMonth.getFullYear();
              const month=calendarMonth.getMonth();
              const firstDay=new Date(year,month,1);
              const startOffset=firstDay.getDay();
              const daysInMonth=new Date(year,month+1,0).getDate();
              const cells=Array.from({length:42},(_,index)=>new Date(year,month,1-startOffset+index));
              const dayKey=(d)=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
              const selectedKey=dayKey(selectedCalendarDate);
              const scheduled=tasks.filter(t=>t.due_at&&dayKey(parseDueDate(t.due_at))===selectedKey);
              const openScheduled=scheduled.filter(t=>!["done","cancelled"].includes(t.status));
              return <div className="calendar-layout">
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:16}}>
                    <div><h3 style={{margin:0,fontSize:18}}>{calendarMonth.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</h3><span style={{fontSize:12,color:"#9da5a8"}}>{tasks.filter(t=>t.due_at&&parseDueDate(t.due_at).getMonth()===month&&parseDueDate(t.due_at).getFullYear()===year).length} scheduled tasks this month</span></div>
                    <div style={{display:"flex",gap:7}}><button className="icon-button" aria-label="Previous month" onClick={()=>setCalendarMonth(new Date(year,month-1,1))}><ChevronDown size={15} style={{transform:"rotate(90deg)"}}/></button><button className="period-select" onClick={()=>{const now=new Date();setCalendarMonth(new Date(now.getFullYear(),now.getMonth(),1));setSelectedCalendarDate(new Date(now.getFullYear(),now.getMonth(),now.getDate()));}}>Today</button><button className="icon-button" aria-label="Next month" onClick={()=>setCalendarMonth(new Date(year,month+1,1))}><ChevronDown size={15} style={{transform:"rotate(-90deg)"}}/></button></div>
                  </div>
                  <div className="calendar-grid">
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day=><div key={day} style={{textAlign:"center",fontSize:11,color:"#9da5a8",padding:"7px 0"}}>{day}</div>)}
                    {cells.map((date,index)=>{
                      const key=dayKey(date);
                      const dayTasks=tasks.filter(t=>t.due_at&&dayKey(parseDueDate(t.due_at))===key);
                      const selected=key===selectedKey;
                      const today=key===dayKey(new Date());
                      const inMonth=date.getMonth()===month;
                      return <button key={key} onClick={()=>setSelectedCalendarDate(new Date(date.getFullYear(),date.getMonth(),date.getDate()))} aria-pressed={selected} aria-label={date.toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"})+", "+dayTasks.length+" tasks"} className="calendar-day" style={{minWidth:0,minHeight:76,padding:"7px 4px",borderRadius:10,border:selected?"1px solid #f39a45":"1px solid "+(today?"#8d653f":"#2b3032"),background:selected?"#35271b":"#151819",color:inMonth?"#f2f3f3":"#687174",textAlign:"left",display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:"pointer"}}>
                        <span style={{fontSize:12,fontWeight:selected||today?700:500}}>{date.getDate()}</span>
                        {dayTasks.length>0?<span style={{display:"flex",gap:3,alignItems:"center",justifyContent:"center",maxWidth:"100%"}}>{dayTasks.slice(0,3).map((t,i)=><span key={t.id} style={{width:5,height:5,borderRadius:99,background:t.status==="done"?"#80d5a1":t.priority==="urgent"||t.priority==="high"?"#f08c76":"#f2ad67"}}/>)}<span style={{fontSize:9,color:inMonth?"#c6cdcf":"#687174"}}>{dayTasks.length}</span></span>:<span style={{height:12}}/>}
                      </button>;
                    })}
                  </div>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:11,color:"#aab2b5",marginTop:14}}><span>● Scheduled</span><span style={{color:"#f08c76"}}>● High priority</span><span style={{color:"#80d5a1"}}>● Completed</span></div>
                </div>
                <aside style={{border:"1px solid #2d3335",borderRadius:13,padding:15,background:"#121516",minWidth:0}}>
                  <span style={{fontSize:11,color:"#a9b0b2",textTransform:"uppercase",letterSpacing:".08em"}}>Selected day</span>
                  <h3 style={{fontSize:18,margin:"7px 0 3px"}}>{selectedCalendarDate.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"})}</h3>
                  <p style={{fontSize:12,color:"#9da5a8",margin:"0 0 15px"}}>{openScheduled.length} open · {scheduled.filter(t=>t.status==="done").length} completed</p>
                  {scheduled.map(t=><article key={t.id} style={{borderTop:"1px solid #2c3234",padding:"12px 0",display:"grid",gap:7}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:7,alignItems:"start"}}><b style={{fontSize:13,overflowWrap:"anywhere",textDecoration:t.status==="done"?"line-through":"none"}}>{t.title}</b><span style={{fontSize:10,color:t.status==="done"?"#80d5a1":t.priority==="urgent"||t.priority==="high"?"#f08c76":"#d6b27b"}}>{t.status==="done"?"Done":t.priority||"medium"}</span></div>
                    <span style={{fontSize:11,color:"#9da5a8"}}>{projects.find(p=>String(p.id)===String(t.project_id))?.name||"No project"} · {t.status||"todo"}</span>
                    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}><select aria-label={"Status for "+t.title} value={t.status||"todo"} onChange={e=>updateTaskStatus(t,e.target.value)} className="period-select" style={{maxWidth:130}}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Completed</option><option value="cancelled">Cancelled</option></select><button className="icon-button" title="Edit task" aria-label={"Edit "+t.title} onClick={()=>editTask(t)}><Pencil size={13}/></button><button className="icon-button" title="View task list" aria-label={"Find "+t.title+" in tasks"} onClick={()=>{setSearch(t.title);setActive("My tasks");}}> <ArrowRight size={13}/></button></div>
                  </article>)}
                  {!scheduled.length&&<p className="empty-state" style={{padding:"18px 0"}}>No tasks scheduled for this day.</p>}
                  <button className="project-view-tasks" onClick={()=>createTaskForDate(selectedCalendarDate)}>Create a task for this day <Plus size={14}/></button>
                </aside>
              </div>;
            })()}
          </section>}
          {active==="Team performance" && (() => {
            const activeTasks = tasks.filter(task => !["cancelled"].includes(task.status));
            const membersWithMetrics = members.map(member => {
              const assigned = activeTasks.filter(task => String(task.assigned_to || "") === String(member.id));
              const done = assigned.filter(task => task.status === "done").length;
              const open = assigned.filter(task => !["done","cancelled"].includes(task.status)).length;
              const inProgress = assigned.filter(task => task.status === "in_progress").length;
              const overdue = assigned.filter(task => !["done","cancelled"].includes(task.status) && task.due_at && parseDueDate(task.due_at) < todayStart).length;
              const rate = assigned.length ? Math.round(done / assigned.length * 100) : 0;
              return { ...member, assigned: assigned.length, done, open, inProgress, overdue, rate };
            }).sort((a,b) => b.open-a.open || b.overdue-a.overdue || b.done-a.done || String(a.name||a.email).localeCompare(String(b.name||b.email)));
            const assignedCount = activeTasks.filter(task => task.assigned_to).length;
            const unassignedCount = activeTasks.filter(task => !task.assigned_to).length;
            const completedCount = activeTasks.filter(task => task.status === "done").length;
            const overdueCount = activeTasks.filter(task => !["done","cancelled"].includes(task.status) && task.due_at && parseDueDate(task.due_at) < todayStart).length;
            const teamRate = assignedCount ? Math.round(activeTasks.filter(task => task.status === "done" && task.assigned_to).length / assignedCount * 100) : 0;
            return <div style={{display:"grid",gap:18}}>
              <div className="stats-grid">
                <article className="stat-card"><div className="stat-top"><span className="stat-icon violet"><Users size={18}/></span></div><p>Workspace members</p><div className="stat-number">{members.length}</div></article>
                <article className="stat-card"><div className="stat-top"><span className="stat-icon green"><CheckCircle2 size={18}/></span></div><p>Completed assigned</p><div className="stat-number">{completedCount}</div></article>
                <article className="stat-card"><div className="stat-top"><span className="stat-icon orange"><Clock size={18}/></span></div><p>Overdue assigned</p><div className="stat-number">{overdueCount}</div></article>
                <article className="stat-card"><div className="stat-top"><span className="stat-icon pink"><TrendingUp size={18}/></span></div><p>Team completion</p><div className="stat-number">{teamRate}%</div></article>
              </div>
              <section className="panel">
                <div className="panel-heading"><div><h2>Workload by teammate</h2><p>Live counts from tasks currently assigned to workspace members. Cancelled tasks are excluded.</p></div><button className="project-view-tasks" onClick={()=>setActive("Settings")}>Manage members <ArrowRight size={14}/></button></div>
                {membersWithMetrics.length ? <div style={{display:"grid",gap:0}}>
                  {membersWithMetrics.map(member=><article key={member.id} style={{display:"grid",gridTemplateColumns:"minmax(150px,1.2fr) repeat(4,minmax(58px,.55fr)) minmax(100px,1fr)",gap:12,alignItems:"center",padding:"15px 0",borderTop:"1px solid var(--line,#303538)"}}>
                    <div style={{minWidth:0}}><b style={{display:"block",fontSize:13,overflowWrap:"anywhere"}}>{member.name||member.email}</b><span style={{fontSize:11,color:"var(--muted,#929b9f)"}}>{member.role||"member"}{String(member.id)===String(user?.id)?" · You":""}</span></div>
                    {[["Assigned",member.assigned],["Open",member.open],["Done",member.done],["Overdue",member.overdue]].map(([label,value])=><div key={label}><span style={{display:"block",fontSize:10,color:"var(--muted,#929b9f)"}}>{label}</span><b style={{fontSize:16,color:label==="Overdue"&&value?"#ef8a72":"inherit"}}>{value}</b></div>)}
                    <div><div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--muted,#929b9f)",marginBottom:6}}><span>Completion</span><b>{member.rate}%</b></div><div className="focus-progress"><span style={{width:member.rate+"%"}}/></div></div>
                  </article>)}
                </div> : <p className="empty-state">Workspace members will appear here when they join.</p>}
                <div className="insight-breakdown" style={{marginTop:14}}><div><span>Assigned tasks</span><b>{assignedCount}</b></div><div><span>Unassigned tasks</span><b>{unassignedCount}</b></div><div><span>In progress</span><b>{activeTasks.filter(task=>task.status==="in_progress").length}</b></div><div><span>Open workload</span><b>{activeTasks.filter(task=>!["done","cancelled"].includes(task.status)).length}</b></div></div>
                <p style={{fontSize:11,color:"var(--muted,#929b9f)",margin:"14px 0 0"}}>Completion rate is completed assigned tasks divided by all non-cancelled assigned tasks. Overdue means a task has a due date before today and is not completed or cancelled. Members with no assigned tasks show 0%.</p>
              </section>
            </div>;
          })()}
          {active==="Goals & insights" && <><div className="stats-grid"><article className="stat-card"><div className="stat-top"><span className="stat-icon green"><Check size={18}/></span></div><p>Completion rate</p><div className="stat-number">{tasks.length?Math.round(completed/tasks.length*100):0}%</div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon violet"><ListTodo size={18}/></span></div><p>Tasks completed</p><div className="stat-number">{completed}</div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon orange"><FolderKanban size={18}/></span></div><p>Projects</p><div className="stat-number">{projects.length}</div></article><article className="stat-card"><div className="stat-top"><span className="stat-icon pink"><Activity size={18}/></span></div><p>High priority open</p><div className="stat-number">{highPriorityTasks}</div></article></div><section className="panel"><div className="panel-heading"><div><h2>Progress overview</h2><p>A snapshot of the work you've recorded in DailyManager.</p></div></div><div className="insight-progress-copy"><b>{completed} of {tasks.length} tasks completed</b><span>{tasks.length?Math.round(completed/tasks.length*100):0}% complete</span></div><div className="focus-progress"><span style={{width:`${tasks.length?completed/tasks.length*100:0}%`}}/></div><div className="insight-breakdown"><div><span>Still open</span><b>{openTasks}</b></div><div><span>Overdue</span><b>{overdueTasks.length}</b></div><div><span>Due today</span><b>{dueTodayTasks.length}</b></div><div><span>Notes captured</span><b>{notes.length}</b></div></div>{!tasks.length&&<p className="empty-state">Your insights will become more useful as you add and complete tasks.</p>}</section></>}
          {TOOL_CATEGORIES.some(item => item.name === active) && <section className="panel">
            {(() => {
              const moduleInfo = TOOL_CATEGORIES.find(item => item.name === active);
              const available = moduleInfo.status === "Available";
              const moduleTasks = moduleInfo.name === "Tasks & Work Intake" ? tasks : moduleInfo.name === "Projects & Portfolio" ? projects : moduleInfo.name === "Docs & Knowledge" ? notes : [];
              const featureItems = {
"Tasks & Work Intake":[{name:"Task inbox",detail:"Search, sort, filter, edit, and complete tasks.",status:"Available",open:()=>setActive("My tasks")},{name:"Priority triage",detail:"Review urgent and high-priority work.",status:"Available",open:()=>{setTaskFilter("priority");setActive("My tasks")}},{name:"Deadline monitor",detail:"Review overdue and unscheduled tasks.",status:"Available",open:()=>setActive("Planner")},{name:"Bulk task creator",detail:"Create multiple workspace tasks from a simple list.",status:"Available"},{name:"Recurring task scheduler",detail:"Generate daily, weekly, or monthly task schedules.",status:"Available"}],
"Projects & Portfolio":[{name:"Project portfolio",detail:"Manage projects and linked task progress.",status:"Available",open:()=>setActive("Projects")},{name:"Project health",detail:"Inspect completion and related tasks.",status:"Available",open:()=>setActive("Projects")},{name:"Project Milestone Planner",detail:"Plan dated project milestones and track delivery progress.",status:"Available"},{name:"Task Template gallery",detail:"Start common workflows from reusable task templates.",status:"Available",open:()=>setActive("Task Template gallery")},{name:"Project Template gallery",detail:"Create a project from a reusable project starter.",status:"Available"},{name:"Project templates",detail:"Reusable kickoff checklists.",status:"Planned"}],
"Planning & Scheduling":[{name:"Due-date agenda",detail:"See upcoming tasks ordered by due date.",status:"Available",open:()=>setActive("Planner")},{name:"Today and overdue",detail:"Focus on today's and overdue work.",status:"Available",open:()=>setActive("Planner")},{name:"Recurring schedules",detail:"Repeat schedules and recurring tasks.",status:"Planned"}],
"Docs & Knowledge":[{name:"Workspace notes",detail:"Capture, search, edit, and delete notes.",status:"Available",open:()=>setActive("Notes")},{name:"Knowledge articles",detail:"Reusable how-to guides and team knowledge.",status:"Planned"},{name:"Document version history",detail:"Compare and restore previous versions.",status:"Planned"}],
"Chat & Collaboration":[{name:"Team chat channels",detail:"Topic-based conversations connected to projects.",status:"Planned"},{name:"Mentions and replies",detail:"Notify teammates and keep threaded decisions together.",status:"Planned"},{name:"Decision log",detail:"Record decisions, owners, and follow-up actions.",status:"Planned"}],
"Automation & Workflows":[{name:"Rule builder",detail:"Trigger-and-action rules for routine work.",status:"Planned"},{name:"Approval flows",detail:"Route requests to reviewers.",status:"Planned"},{name:"Workflow run history",detail:"Inspect automation errors and retries.",status:"Planned"}],
"AI Work Assistant":[{name:"Task breakdown",detail:"Turn a task brief into suggested steps.",status:"Planned"},{name:"Notes summarizer",detail:"Summarize notes into decisions and actions.",status:"Planned"},{name:"Next-step suggestions",detail:"Suggest actions grounded in workspace context.",status:"Planned"}],
"Goals & OKRs":[{name:"Progress insights",detail:"Review completion and workload signals.",status:"Available",open:()=>setActive("Goals & insights")},{name:"Goal tracker",detail:"Set goals with owners, targets, and deadlines.",status:"Planned"},{name:"Key results",detail:"Track measurable results against goals.",status:"Planned"}],
"Time & Capacity":[{name:"Time entries",detail:"Record time spent against tasks and projects.",status:"Planned"},{name:"Capacity planner",detail:"Compare workload with available hours.",status:"Planned"},{name:"Timesheet approvals",detail:"Submit and review weekly timesheets.",status:"Planned"}],
"Reports & Analytics":[{name:"Workspace snapshot",detail:"Review completion, projects, and priorities.",status:"Available",open:()=>setActive("Goals & insights")},{name:"Custom report builder",detail:"Choose metrics, filters, and date ranges.",status:"Planned"},{name:"Trend forecasts",detail:"Compare throughput and delivery trends.",status:"Planned"}],
"Forms & Requests":[{name:"Request form builder",detail:"Create structured internal request forms.",status:"Planned"},{name:"Request queue",detail:"Triage requests by urgency and owner.",status:"Planned"},{name:"Routing rules",detail:"Route submissions by request type.",status:"Planned"}],
"CRM & Client Work":[{name:"Client directory",detail:"Client profiles, contacts, and account notes.",status:"Planned"},{name:"Relationship timeline",detail:"Meetings, follow-ups, and account activity.",status:"Planned"},{name:"Client delivery",detail:"Connect engagements to delivery tasks.",status:"Planned"}],
"Finance & Billing":[{name:"Expense register",detail:"Capture expenses and receipt references.",status:"Planned"},{name:"Invoice tracker",detail:"Track invoice status and due dates.",status:"Planned"},{name:"Budget overview",detail:"Compare planned budgets with spending.",status:"Planned"}],
"People & HR":[{name:"Team directory",detail:"Team profiles, roles, and contact details.",status:"Planned"},{name:"Onboarding checklist",detail:"Coordinate new-starter tasks.",status:"Planned"},{name:"Leave requests",detail:"Submit and track leave approvals.",status:"Planned"}],
"Product & Agile":[{name:"Product backlog",detail:"Prioritize ideas, bugs, and feature requests.",status:"Planned"},{name:"Sprint board",detail:"Plan sprint scope and work in progress.",status:"Planned"},{name:"Release tracker",detail:"Coordinate release dates and readiness.",status:"Planned"}],
"Software & IT Ops":[{name:"Incident queue",detail:"Track incidents, severity, owners, and resolution.",status:"Planned"},{name:"Service requests",detail:"Track access, equipment, and IT requests.",status:"Planned"},{name:"Asset inventory",detail:"Maintain devices and lifecycle status.",status:"Planned"}],
"Marketing & Content":[{name:"Campaign planner",detail:"Coordinate campaigns, channels, and launch dates.",status:"Planned"},{name:"Content calendar",detail:"Plan publishing dates and production stages.",status:"Planned"},{name:"Creative approvals",detail:"Review and approve marketing assets.",status:"Planned"}],
"Sales & Revenue":[{name:"Lead pipeline",detail:"Track prospects from contact to opportunity.",status:"Planned"},{name:"Deal board",detail:"Manage deal stages and next actions.",status:"Planned"},{name:"Revenue forecast",detail:"Estimate revenue from open deals.",status:"Planned"}],
"Customer Support":[{name:"Support ticket queue",detail:"Assign tickets and track resolution.",status:"Planned"},{name:"Service-level monitor",detail:"Track response targets and SLA deadlines.",status:"Planned"},{name:"Customer feedback",detail:"Collect feedback themes and follow-up work.",status:"Planned"}],
"Files & Assets":[{name:"Shared file library",detail:"Organize searchable team files.",status:"Planned"},{name:"Asset approvals",detail:"Review assets before publication.",status:"Planned"},{name:"Version history",detail:"Track revisions and file access.",status:"Planned"}],
"Security & Governance":[{name:"Access review",detail:"Review members, roles, and access needs.",status:"Planned"},{name:"Audit event log",detail:"Inspect security-sensitive changes.",status:"Planned"},{name:"Retention policies",detail:"Define data retention rules.",status:"Planned"}],
"Admin & Workspace":[{name:"Workspace profile",detail:"Manage workspace identity and preferences.",status:"Planned"},{name:"Member and role management",detail:"Manage workspace membership and roles.",status:"Available",open:()=>setActive("Settings")},{name:"Workspace templates",detail:"Reusable configurations for different teams.",status:"Planned"}],
"Integrations & APIs":[{name:"Connected apps",detail:"Configure third-party integrations.",status:"Planned"},{name:"API key management",detail:"Issue, rotate, and revoke API credentials.",status:"Planned"},{name:"Webhook monitor",detail:"Inspect delivery attempts and retries.",status:"Planned"}],
"Personal Productivity":[{name:"Focus session",detail:"Run a focused session against a task.",status:"Planned"},{name:"Personal routines",detail:"Build daily and weekly checklists.",status:"Planned"},{name:"Reminder center",detail:"Manage reminders and commitments.",status:"Planned"}],
"Industry & Advanced Workflows":[{name:"Workflow templates",detail:"Configurable workflows for specialist teams.",status:"Planned"},{name:"Custom fields",detail:"Industry-specific fields for records and requests.",status:"Planned"},{name:"Approval matrix",detail:"Multi-step approvals by role and threshold.",status:"Planned"}]
}[moduleInfo.name] || [{name:moduleInfo.name+" workspace",detail:moduleInfo.detail,status:"Planned"}];
              return <><div className="panel-heading"><div><h2>{moduleInfo.name}</h2><p>{moduleInfo.detail}</p></div><span className="task-status">{moduleInfo.status}</span></div>
                <div className="stats-grid" style={{marginBottom:18}}><article className="stat-card"><p>Module status</p><div className="stat-number" style={{fontSize:20}}>{moduleInfo.status}</div></article><article className="stat-card"><p>Records in this module</p><div className="stat-number">{moduleTasks.length}</div></article><article className="stat-card"><p>Roadmap tools</p><div className="stat-number">20</div></article><article className="stat-card"><p>Distinct features listed</p><div className="stat-number">{featureItems.length}</div></article></div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,250px),1fr))",gap:12}}>{featureItems.map(feature=><article key={feature.name} role="button" tabIndex={0} aria-label={`Open ${feature.name}`} onClick={()=>{setMobileMenuOpen(false);if(feature.name==="Task Template gallery"||feature.name==="Project Template gallery"||feature.name==="Bulk task creator"||feature.name==="Recurring task scheduler"||feature.name==="Project Milestone Planner"){setSelectedFeature({...feature,parent:moduleInfo.name});setActive(feature.name);}else if(feature.open){setSelectedFeature(null);feature.open();}else{setSelectedFeature({...feature,parent:moduleInfo.name});setActive(feature.name);}}} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setMobileMenuOpen(false);if(feature.name==="Task Template gallery"||feature.name==="Project Template gallery"||feature.name==="Bulk task creator"||feature.name==="Recurring task scheduler"||feature.name==="Project Milestone Planner"){setSelectedFeature({...feature,parent:moduleInfo.name});setActive(feature.name);}else if(feature.open){setSelectedFeature(null);feature.open();}else{setSelectedFeature({...feature,parent:moduleInfo.name});setActive(feature.name);}}}} style={{border:"1px solid #303638",borderRadius:14,padding:16,background:"#121516",display:"grid",alignContent:"start",gap:10,cursor:"pointer",transition:"border-color .16s,transform .16s"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"start",gap:8}}><h3 style={{margin:0,fontSize:15,lineHeight:1.4}}>{feature.name}</h3><span className="task-status" style={{whiteSpace:"nowrap",fontSize:10}}>{feature.status}</span></div><p style={{margin:0,fontSize:12,lineHeight:1.6,color:"#a9b0b2"}}>{feature.detail}</p>{feature.open&&<button className="project-view-tasks" onClick={e=>{e.stopPropagation();setSelectedFeature(null);feature.open();}}>Open feature <ArrowRight size={14}/></button>}</article>)}</div>
                <p style={{marginTop:18,fontSize:12,color:"#9da5a8"}}>This is a dedicated module screen. Only features marked Available are wired to working screens; planned roadmap items are not represented as implemented. The full catalogue remains documented in <code>docs/TOOL_ROADMAP_500.md</code>.</p>
              </>;
            })()}
          </section>}
          {active==="Activity" && <section className="panel activity-panel">
            <div className="panel-heading"><div><h2>Workspace activity</h2><p>A chronological record of task and project changes captured from now on.</p></div><button className="period-select" type="button" onClick={()=>{setActivityLoading(true);api("/api/workspace").then(data=>setActivityItems(data.activity||[])).catch(error=>setActivityError(error.message)).finally(()=>setActivityLoading(false));}}><Activity size={14}/> Refresh</button></div>
            {activityLoading&&<p className="empty-state">Loading workspace activity…</p>}
            {activityError&&<p className="activity-error">{activityError}</p>}
            {!activityLoading&&!activityError&&!activityItems.length&&<div className="activity-empty"><Activity size={25}/><b>No activity recorded yet</b><span>When workspace members create tasks, update task status or manage projects, those changes will appear here.</span></div>}
            <div className="activity-feed">{activityItems.map(item=><article className="activity-entry" key={item.id}><span className={`activity-entry-icon activity-${item.entity_type}`}>{item.entity_type==="project"?<FolderKanban size={15}/>:item.entity_type==="member"?<Users size={15}/>:item.entity_type==="note"?<FileText size={15}/>:<ListTodo size={15}/>}</span><div className="activity-entry-main"><b>{item.actor_name}</b><p>{item.summary}</p><span>{new Date(item.created_at).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"})}</span></div><span className="activity-entry-type">{item.entity_type}</span></article>)}</div>
            <p className="activity-footnote">Activity history starts when this feature is deployed. Earlier changes are not backfilled.</p>
          </section>}
          {active==="Settings" && <><section className="panel"><div className="panel-heading"><div><h2>Workspace settings</h2><p>Your account and plan information.</p></div></div><p><b>Workspace:</b> {workspace?.name}</p><p><b>Account:</b> {user.email}</p><p><b>Plan:</b> {workspace?.plan}</p><p><b>Trial ends:</b> {workspace?.trial_ends_at?new Date(workspace.trial_ends_at).toLocaleDateString():"Not set"}</p><p>Billing is not connected. No payment will be taken in this version.</p></section><section className="panel" style={{marginTop:18}}><div className="panel-heading"><div><h2>Workspace members</h2><p>Manage who can access this workspace. Roles are stored on each membership.</p></div><span className="task-status">{members.length} member{members.length===1?"":"s"}</span></div>{String(workspace?.owner_user_id)===String(user?.id)&&<form onSubmit={addWorkspaceMember} style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}><input aria-label="Existing member account email" placeholder="Existing DailyManager account email" type="email" required maxLength={254} value={memberEmail} onChange={e=>setMemberEmail(e.target.value)} style={{...inputStyle,flex:"1 1 220px"}}/><select aria-label="New member role" value={memberRole} onChange={e=>setMemberRole(e.target.value)} style={{...inputStyle,width:"auto"}}><option value="member">Member</option><option value="admin">Admin</option><option value="viewer">Viewer</option></select><button style={buttonStyle} disabled={busy}>{busy?"Adding…":"Add member"}</button></form>}{members.map(member=><div key={member.id} style={{display:"flex",alignItems:"center",gap:12,justifyContent:"space-between",padding:"12px 0",borderTop:"1px solid var(--line, #303538)",flexWrap:"wrap"}}><div><b>{member.name}</b><div style={{fontSize:12,color:"#a9b0b2",marginTop:4}}>{member.email}{String(member.id)===String(workspace?.owner_user_id)?" · Workspace owner":""}</div><div className="member-workload"><span>{tasks.filter(task=>String(task.assigned_to||"")===String(member.id)&&!["done","cancelled"].includes(task.status)).length} open</span><span>{tasks.filter(task=>String(task.assigned_to||"")===String(member.id)&&task.status==="in_progress").length} in progress</span><span>{tasks.filter(task=>String(task.assigned_to||"")===String(member.id)&&!["done","cancelled"].includes(task.status)&&task.due_at&&parseDueDate(task.due_at)<todayStart).length} overdue</span></div></div><div style={{display:"flex",gap:8,alignItems:"center"}}>{String(workspace?.owner_user_id)===String(user?.id)&&String(member.id)!==String(user?.id)?<><select aria-label={"Role for "+member.email} value={["admin","member","viewer"].includes(member.role)?member.role:"member"} onChange={e=>updateWorkspaceMember(member,e.target.value)} style={{...inputStyle,width:"auto",minWidth:110}}><option value="admin">Admin</option><option value="member">Member</option><option value="viewer">Viewer</option></select><button className="icon-button" title="Remove member" aria-label={"Remove "+member.email} onClick={()=>removeWorkspaceMember(member)}><Trash2 size={14}/></button></>:<span className="task-status">{member.role||"member"}</span>}</div></div>)}{!members.length&&<p className="empty-state">No workspace members found.</p>}<p style={{fontSize:12,color:"#a9b0b2",marginTop:12}}>Members must already have a DailyManager account. Owners and admins can manage projects. Members can manage tasks they created or that are assigned to them. Viewers have read-only access.</p></section></>}
        </div>
      </section>
      {commentTask && <div role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setCommentTask(null);}} style={{position:"fixed",inset:0,zIndex:110,display:"grid",placeItems:"center",padding:18,background:"#000b",backdropFilter:"blur(7px)"}}>
        <section role="dialog" aria-modal="true" aria-labelledby="task-discussion-title" style={{width:"min(100%,560px)",maxHeight:"calc(100dvh - 36px)",display:"grid",gridTemplateRows:"auto minmax(120px,1fr) auto",gap:14,padding:22,border:"1px solid #373c3f",borderRadius:18,background:"var(--panel,#17191b)",color:"var(--text,#f4f2ef)",boxShadow:"0 30px 90px #0009"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",gap:12}}><div><h2 id="task-discussion-title" style={{margin:0,fontSize:18}}>Task discussion</h2><p style={{margin:"6px 0 0",color:"var(--muted,#a9b0b2)"}}>{commentTask.title}</p></div><button type="button" onClick={()=>setCommentTask(null)} aria-label="Close discussion" style={{border:0,background:"transparent",color:"inherit",cursor:"pointer"}}><X size={18}/></button></div>
          <div style={{overflowY:"auto",display:"grid",alignContent:"start",gap:10,minHeight:120}}>{commentsLoading&&<p className="empty-state">Loading discussion…</p>}{!commentsLoading&&!taskComments.length&&<p className="empty-state">No comments yet. Start the conversation.</p>}{taskComments.map(comment=><article key={comment.id} style={{padding:12,border:"1px solid var(--line,#303638)",borderRadius:12,background:"var(--surface-muted,rgba(127,127,127,.08))"}}><div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><b>{comment.author_name||comment.author_email||"Workspace member"}</b><span style={{fontSize:11,color:"var(--muted,#a9b0b2)"}}>{new Date(comment.created_at).toLocaleString()}</span></div><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",margin:"8px 0 0",lineHeight:1.55}}>{comment.body}</p></article>)}<div style={{marginTop:8}}><h3 style={{fontSize:13,margin:"8px 0",letterSpacing:".02em"}}>Task history</h3>{!taskHistory.length&&<p className="empty-state">No recorded task changes yet.</p>}{taskHistory.map(item=><div key={item.id} style={{display:"grid",gridTemplateColumns:"8px 1fr",gap:10,padding:"8px 0",borderBottom:"1px solid var(--line,#303638)"}}><span style={{width:7,height:7,borderRadius:99,background:"var(--accent,#ef6658)",marginTop:5}}/><div><p style={{margin:0,fontSize:12,lineHeight:1.45}}><b>{item.actor_name||"Workspace member"}</b> {item.summary}</p><span style={{fontSize:10,color:"var(--muted,#a9b0b2)"}}>{new Date(item.created_at).toLocaleString()}</span></div></div>)}</div></div>
          <form onSubmit={submitTaskComment} style={{display:"grid",gap:9}}><textarea aria-label="Write a comment" placeholder="Write a comment…" value={commentDraft} onChange={event=>setCommentDraft(event.target.value)} maxLength={5000} rows={3} style={{...inputStyle,width:"100%",resize:"vertical",fontSize:16}}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><span style={{fontSize:11,color:"var(--muted,#a9b0b2)"}}>{commentDraft.length}/5000</span><button type="submit" style={buttonStyle} disabled={busy||!commentDraft.trim()}>{busy?"Posting…":"Post comment"}</button></div></form>
        </section>
      </div>}
      {modal && <div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModal("");}} style={{position:"fixed",inset:0,zIndex:100,display:"grid",placeItems:"center",padding:18,background:"#000b",backdropFilter:"blur(7px)"}}><form role="dialog" aria-modal="true" aria-labelledby="workspace-dialog-title" onSubmit={saveItem} style={{width:"min(100%,450px)",maxHeight:"calc(100dvh - 36px)",overflowY:"auto",padding:24,border:"1px solid #373c3f",borderRadius:18,background:"#17191b",display:"grid",gap:14,boxShadow:"0 30px 90px #0009"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h2 id="workspace-dialog-title" style={{margin:0}}>{modal==="project"?"Create a project":modal==="edit_project"?"Edit project":modal==="note"?"Capture a note":modal==="edit_note"?"Edit note":modal==="edit_task"?"Edit task":"Add a task"}</h2><button type="button" onClick={()=>setModal("")} aria-label="Close" style={{border:0,background:"transparent",color:"inherit",cursor:"pointer"}}><X size={18}/></button></div><label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>{modal==="project"?"Project name":(modal==="note"||modal==="edit_note")?"Note title":"Task name"}<input style={inputStyle} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} required maxLength={modal==="task"||modal==="edit_task"?500:modal==="note"?200:160} autoFocus placeholder={modal==="task"||modal==="edit_task"?"What needs doing?":"Give it a clear name"}/></label>{modal!=="task"&&modal!=="edit_task"&&<label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>{(modal==="note"||modal==="edit_note")?"Note":"Description (optional)"}<textarea style={{...inputStyle,minHeight:100,resize:"vertical"}} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})} maxLength={modal==="note"||modal==="edit_note"?20000:2000}/></label>}{(modal==="task"||modal==="edit_task")&&<><label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>Description (optional)<textarea style={{...inputStyle,minHeight:76,resize:"vertical"}} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} maxLength={4000} placeholder="Add helpful context"/></label><label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>Due date (optional)<input style={inputStyle} type="date" value={draft.due_at} onChange={e=>setDraft({...draft,due_at:e.target.value})}/></label><label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>Project<select style={inputStyle} value={draft.project_id} onChange={e=>setDraft({...draft,project_id:e.target.value})}><option value="">Personal / no project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>Priority<select style={inputStyle} value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><label style={{display:"grid",gap:6,fontSize:12,fontWeight:750}}>Assign to team member<select style={inputStyle} value={draft.assigned_to || ""} onChange={e=>setDraft({...draft,assigned_to:e.target.value})}><option value="">Unassigned</option>{members.map(member=><option key={member.id} value={member.id}>{member.name || member.email}{member.id===user?.id?" (You)":""}</option>)}</select></label></>}<button style={buttonStyle} disabled={busy}>{busy?"Saving…":"Save"}</button></form></div>}
      {notice && <div role="status" style={{position:"fixed",right:20,bottom:20,zIndex:120,background:"#25282a",border:"1px solid #464b4e",borderRadius:11,padding:"12px 16px",color:"#f4f2ef",boxShadow:"0 15px 35px #0008",maxWidth:"90vw"}}>{notice}</div>}
    </main>
  );
}

function TaskRow({ task, onToggle, onStatusChange, onEdit, onDelete, onDiscuss }) {
  const statusLabel = task.status === "done" ? "Done" : task.status === "in_progress" ? "In progress" : task.status === "cancelled" ? "Cancelled" : "Open";
  return <div className="task-row"><button aria-label={task.status==="done"?"Mark task open":"Complete task"} onClick={()=>onToggle(task)} style={{width:20,height:20,flexShrink:0,borderRadius:7,border:task.status==="done"?"1px solid #70d5a1":"1px solid #555d61",background:task.status==="done"?"#70d5a1":"transparent",color:"#111",display:"grid",placeItems:"center",cursor:"pointer"}}>{task.status==="done"&&<Check size={13}/>}</button><div className="task-info"><b style={{textDecoration:task.status==="done"?"line-through":"none",opacity:task.status==="done"?.65:1}}>{task.title}</b><span>{task.project_name||"Personal"} · {task.priority||"medium"} priority{task.due_at?" · "+parseDueDate(task.due_at).toLocaleDateString():""}{task.assignee_name?" · Assigned to "+task.assignee_name:" · Unassigned"}</span></div><label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#b9c0c2"}}><span className="sr-only">Status for {task.title}</span><select aria-label={"Status for "+task.title} value={task.status||"todo"} onChange={event=>onStatusChange(task,event.target.value)} style={{maxWidth:125,padding:"7px 8px",borderRadius:9,border:"1px solid #3b4245",background:"#171a1b",color:"inherit",fontSize:12}}><option value="todo">Open</option><option value="in_progress">In progress</option><option value="done">Done</option><option value="cancelled">Cancelled</option></select><span className="sr-only">Current status: {statusLabel}</span></label><button type="button" aria-label={"Open discussion for "+task.title} title="Task discussion" onClick={()=>onDiscuss(task)} style={{border:"1px solid #3b4245",borderRadius:8,padding:7,background:"transparent",color:"#c8cecf",cursor:"pointer"}}><MessageSquareText size={14}/></button><button type="button" aria-label={"Edit "+task.title} title="Edit task" onClick={()=>onEdit(task)} style={{border:"1px solid #3b4245",borderRadius:8,padding:7,background:"transparent",color:"#c8cecf",cursor:"pointer"}}><Pencil size={14}/></button><button type="button" aria-label={"Delete "+task.title} title="Delete task" onClick={()=>onDelete(task)} style={{border:"1px solid #493333",borderRadius:8,padding:7,background:"transparent",color:"#f29b9b",cursor:"pointer"}}><Trash2 size={14}/></button></div>;
}
