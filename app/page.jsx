"use client";

import { useState } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, Bell, CalendarDays, Check,
  ChevronDown, CircleHelp, Clock3, Command, FileText, FolderKanban,
  LayoutDashboard, ListTodo, MoreHorizontal, Plus, Search, Settings2,
  Sparkles, Target, TrendingUp, Users, Wallet, X, Zap
} from "lucide-react";

const initialTasks = [
  { id: 1, title: "Finalize landing page wireframes", project: "Website refresh", time: "Today · 11:30 AM", done: true, color: "purple" },
  { id: 2, title: "Review Q4 campaign performance", project: "Marketing", time: "Today · 2:00 PM", done: false, color: "orange" },
  { id: 3, title: "Send proposal to new client", project: "Client work", time: "Today · 4:30 PM", done: false, color: "green" },
  { id: 4, title: "Plan next week's priorities", project: "Personal", time: "Tomorrow · 9:00 AM", done: false, color: "pink" },
];

const navGroups = [
  { label: "WORKSPACE", items: [
    { name: "Overview", icon: LayoutDashboard },
    { name: "My tasks", icon: ListTodo, count: "8" },
    { name: "Projects", icon: FolderKanban },
    { name: "Calendar", icon: CalendarDays },
    { name: "Notes", icon: FileText },
  ]},
  { label: "MANAGE", items: [
    { name: "Team", icon: Users },
    { name: "Finance", icon: Wallet },
    { name: "Goals & habits", icon: Target },
  ]},
];

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [tasks, setTasks] = useState(initialTasks);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  const toggleTask = (id) => setTasks((items) => items.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  const addTask = (event) => {
    event.preventDefault();
    if (!newTask.trim()) return;
    setTasks((items) => [{ id: Date.now(), title: newTask.trim(), project: "Personal", time: "Just added", done: false, color: "purple" }, ...items]);
    setNewTask("");
    setShowAdd(false);
    setNotice("Task added to your list");
    setTimeout(() => setNotice(""), 2600);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setActive("Overview")}>
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span className="brand-name">daily<span>manager</span><small>YOUR DAY, IN CONTROL</small></span>
        </a>
        <button className="workspace-switch" onClick={() => setNotice("Workspace switching is coming soon")}><span className="workspace-avatar">G</span><span className="workspace-copy"><b>Godwin's workspace</b><small>Personal workspace</small></span><ChevronDown size={15}/></button>
        <div className="nav-list">
          {navGroups.map((group) => <div className="nav-group" key={group.label}><p className="nav-label">{group.label}</p>{group.items.map(({name, icon: Icon, count}) => <button key={name} className={`nav-item ${active === name ? "active" : ""}`} onClick={() => {setActive(name); if(name !== "Overview") setNotice(name + " workspace preview");}}><Icon size={17} strokeWidth={1.8}/><span>{name}</span>{count && <em>{count}</em>}</button>)}</div>)}
        </div>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={17}/></div><b>Make room for more</b><p>Unlock your full potential with DailyManager Pro.</p><button onClick={() => setNotice("Plans and billing will be available soon")}>Explore plans <ArrowRight size={14}/></button></div>
          <button className="nav-item" onClick={() => setNotice("Settings are coming soon")}><Settings2 size={17}/>Settings</button>
          <button className="nav-item" onClick={() => setNotice("Help center is coming soon")}><CircleHelp size={17}/>Help & support</button>
          <div className="profile"><div className="profile-avatar">GO</div><div className="profile-copy"><b>Godwin Oriabure</b><small>Free plan</small></div><MoreHorizontal size={18}/></div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar"><div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><b>{active}</b></div><div className="top-actions"><label className="search-box"><Search size={16}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search anything..."/><kbd><Command size={10}/> K</kbd></label><button className="icon-button" aria-label="Notifications" onClick={()=>setNotice("You're all caught up")}><Bell size={18}/><i/></button><div className="top-avatar">GO</div></div></header>

        <div className="content">
          <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot"/> TUESDAY, OCTOBER 28</div><h1>{active === "Overview" ? "Good evening, Godwin" : active}<span className="wave">✳</span></h1><p className="subtitle">{active === "Overview" ? "A little progress each day adds up to big results." : "Your DailyManager workspace, all in one place."}</p></div><button className="primary-button" onClick={()=>setShowAdd(true)}><Plus size={17}/> New task</button></div>

          <div className="focus-banner"><div className="focus-orb"><Sparkles size={21}/></div><div className="focus-text"><span>YOUR DAILY FOCUS</span><b>Make today count, one thing at a time.</b><small>You have {tasks.filter(t=>!t.done).length} tasks left to move your day forward.</small></div><div className="focus-right"><div className="focus-progress"><span style={{width:`${tasks.length ? tasks.filter(t=>t.done).length/tasks.length*100 : 0}%`}}/></div><small>{tasks.filter(t=>t.done).length} of {tasks.length} completed</small></div><Sparkles className="banner-spark" size={82}/></div>

          <div className="section-heading"><div><h2>Your overview</h2><p>Here's what's happening with your work.</p></div><button className="period-select" onClick={()=>setNotice("Showing your current week")}><CalendarDays size={15}/> This week <ChevronDown size={14}/></button></div>
          <div className="stats-grid">
            <article className="stat-card"><div className="stat-top"><span className="stat-icon violet"><ListTodo size={18}/></span><span className="stat-trend"><TrendingUp size={13}/> Active</span></div><p>Tasks in progress</p><div className="stat-number">{tasks.filter(t=>!t.done).length}<span className="stat-note"> tasks left</span></div><div className="mini-bars"><i/><i/><i/><i/><i/><i/><i/></div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon amber"><FolderKanban size={18}/></span><span className="stat-trend neutral">In motion</span></div><p>Active projects</p><div className="stat-number">06<span className="stat-note"> projects</span></div><div className="avatar-stack"><span>JD</span><span>AM</span><span>KO</span><span>+3</span></div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon mint"><Clock3 size={18}/></span><span className="stat-trend"><TrendingUp size={13}/> On track</span></div><p>Focus time</p><div className="stat-number">4.2<span className="stat-note"> hrs this week</span></div><div className="stat-foot"><span className="foot-line"><i/></span><span>Keep the momentum</span></div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon rose"><Activity size={18}/></span><span className="stat-trend neutral">This week</span></div><p>Goals completed</p><div className="stat-number">12<span className="stat-note"> of 16 goals</span></div><div className="goal-track"><span/></div></article>
          </div>

          <div className="lower-grid">
            <section className="panel task-panel"><div className="panel-heading"><div><h2>Today's tasks</h2><p>Keep your priorities close.</p></div><button className="text-action" onClick={()=>setActive("My tasks")}>View all <ArrowRight size={14}/></button></div><div className="task-list">{tasks.filter(t=>t.title.toLowerCase().includes(search.toLowerCase())).map((task)=><div className={`task-row ${task.done ? "task-done" : ""}`} key={task.id}><button className={`check-circle ${task.done ? "checked" : ""}`} onClick={()=>toggleTask(task.id)} aria-label={task.done ? "Mark incomplete" : "Mark complete"}>{task.done && <Check size={13}/>}</button><div className="task-info"><b>{task.title}</b><span><i className={`project-dot ${task.color}`}/>{task.project}<span className="task-divider">·</span><Clock3 size={12}/>{task.time}</span></div><button className="more-button" onClick={()=>setNotice("Task options are coming soon")} aria-label="Task options"><MoreHorizontal size={18}/></button></div>)}</div><button className="add-task-inline" onClick={()=>setShowAdd(true)}><Plus size={15}/> Add a task</button></section>
            <section className="panel week-panel"><div className="panel-heading"><div><h2>Weekly rhythm</h2><p>Your progress at a glance.</p></div><button className="more-button" onClick={()=>setNotice("Weekly report is coming soon")} aria-label="More weekly options"><MoreHorizontal size={18}/></button></div><div className="week-summary"><div><strong>78<span>%</span></strong><small>weekly consistency</small></div><span className="week-change"><TrendingUp size={13}/> +8.4%</span></div><div className="chart"><div className="chart-grid"><i/><i/><i/></div><div className="chart-bars">{[{d:"M",h:48},{d:"T",h:76},{d:"W",h:58},{d:"T",h:88},{d:"F",h:67},{d:"S",h:35},{d:"S",h:25}].map((day,i)=><div className="chart-column" key={i}><span className={i===3?"chart-bar highlight":"chart-bar"} style={{height:day.h+"%"}}/><small>{day.d}</small></div>)}</div></div><div className="week-footer"><span><i className="legend-dot"/> Completed</span><span><i className="legend-dot muted"/> Remaining</span><button onClick={()=>setNotice("Detailed insights are coming soon")}>Insights <ArrowDownRight size={13}/></button></div></section>
          </div>

          <div className="bottom-grid"><section className="panel quick-panel"><div className="panel-heading"><div><h2>Quick access</h2><p>Pick up right where you left off.</p></div></div><div className="quick-links"><button onClick={()=>setActive("Projects")}><span className="quick-icon q-purple"><FolderKanban size={18}/></span><span><b>Projects</b><small>6 active projects</small></span><ArrowRight size={15}/></button><button onClick={()=>setActive("Notes")}><span className="quick-icon q-orange"><FileText size={18}/></span><span><b>My notes</b><small>Capture an idea</small></span><ArrowRight size={15}/></button><button onClick={()=>setActive("Calendar")}><span className="quick-icon q-green"><CalendarDays size={18}/></span><span><b>Calendar</b><small>Plan your week</small></span><ArrowRight size={15}/></button></div></section><section className="insight-card"><div className="insight-icon"><Zap size={18}/></div><span className="insight-label">A LITTLE INSIGHT</span><h3>Progress over perfection.</h3><p>Small, consistent steps build the kind of momentum that lasts. Focus on your next best action.</p><button onClick={()=>setNotice("Daily insights will be personalized soon")}>A fresh perspective <ArrowRight size={14}/></button><div className="insight-decoration">✳</div></section></div>
          <footer className="footer"><span>© 2026 DailyManager</span><span>Made for your best work <span className="footer-heart">♥</span></span><span className="footer-status"><i/> All systems ready</span></footer>
        </div>
      </section>

      {notice && <div className="toast"><span className="toast-check"><Check size={14}/></span>{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss"><X size={14}/></button></div>}
      {showAdd && <div className="modal-backdrop" onClick={()=>setShowAdd(false)}><form className="task-modal" onSubmit={addTask} onClick={(e)=>e.stopPropagation()}><div className="modal-top"><div><span className="modal-kicker">MAKE IT HAPPEN</span><h2>Create a task</h2><p>Get it out of your head and onto your list.</p></div><button type="button" className="icon-button" onClick={()=>setShowAdd(false)}><X size={18}/></button></div><label className="field-label" htmlFor="task-title">Task name</label><input autoFocus id="task-title" className="task-input" value={newTask} onChange={(e)=>setNewTask(e.target.value)} placeholder="What needs to get done?" maxLength={120}/><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowAdd(false)}>Cancel</button><button type="submit" className="primary-button"><Plus size={16}/> Create task</button></div></form></div>}
    </main>
  );
}