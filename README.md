<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TaskFlow — README</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --navy:#0d1117;--navy2:#161b22;--navy3:#1c2230;
  --violet:#7c3aed;--violet2:#a78bfa;--violet3:#c4b5fd;
  --border:#30363d;--text:#e6edf3;--muted:#8b949e;--dim:#484f58;
  --green:#3fb950;--amber:#f0883e;--red:#f85149;--blue:#58a6ff;
}
body{font-family:'DM Sans',sans-serif;background:var(--navy);color:var(--text);min-height:100vh;padding:0}

.hero{
  background:var(--navy);
  padding:3.5rem 2rem 2rem;
  text-align:center;
  position:relative;
  overflow:hidden;
  border-bottom:1px solid var(--border);
}
.hero::before{
  content:'';position:absolute;top:-120px;left:50%;transform:translateX(-50%);
  width:600px;height:600px;
  background:radial-gradient(circle,rgba(124,58,237,0.15) 0%,transparent 70%);
  pointer-events:none;
}
.hero-badge{
  display:inline-flex;align-items:center;gap:6px;
  background:rgba(124,58,237,0.15);
  border:1px solid rgba(124,58,237,0.4);
  border-radius:20px;padding:4px 14px;
  font-size:12px;color:var(--violet2);font-family:'Syne',sans-serif;
  letter-spacing:0.05em;text-transform:uppercase;
  margin-bottom:1.25rem;
}
.dot{width:6px;height:6px;border-radius:50%;background:var(--violet2);animation:pulse 2s infinite;display:inline-block}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}

.hero h1{
  font-family:'Syne',sans-serif;font-size:3rem;font-weight:800;
  background:linear-gradient(135deg,#fff 0%,var(--violet2) 60%,var(--violet3) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  line-height:1.1;margin-bottom:0.75rem;
}
.hero-sub{font-size:1.1rem;color:var(--muted);max-width:500px;margin:0 auto 2rem;line-height:1.6}

.pill-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:2rem}
.pill{
  padding:5px 14px;border-radius:20px;font-size:12px;font-weight:500;
  background:var(--navy2);border:1px solid var(--border);color:var(--muted);
  font-family:'Syne',sans-serif;
}
.pill.v{border-color:rgba(124,58,237,0.5);color:var(--violet2);background:rgba(124,58,237,0.08)}

.btn-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.btn{
  display:inline-flex;align-items:center;gap:8px;
  padding:10px 22px;border-radius:8px;font-size:14px;font-weight:500;
  font-family:'DM Sans',sans-serif;cursor:pointer;border:none;transition:all 0.15s;
  text-decoration:none;
}
.btn-primary{background:var(--violet);color:#fff}
.btn-primary:hover{background:#6d28d9;transform:translateY(-1px)}
.btn-ghost{background:transparent;color:var(--text);border:1px solid var(--border)}
.btn-ghost:hover{background:var(--navy2)}

.section{padding:2.5rem 2rem;border-bottom:1px solid var(--border)}
.section:last-child{border-bottom:none}

.sec-label{
  font-family:'Syne',sans-serif;font-size:11px;text-transform:uppercase;
  letter-spacing:0.1em;color:var(--violet2);margin-bottom:1.25rem;display:flex;align-items:center;gap:8px;
}
.sec-label::after{content:'';flex:1;height:1px;background:var(--border)}

.stack-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.stack-card{
  background:var(--navy2);border:1px solid var(--border);border-radius:10px;
  padding:14px;transition:all 0.2s;
}
.stack-card:hover{border-color:rgba(124,58,237,0.5);transform:translateY(-2px)}
.stack-card .layer{font-size:10px;color:var(--dim);font-family:'Syne',sans-serif;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px}
.stack-card .tech{font-size:13px;font-weight:500;color:var(--text)}

.feat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
.feat-card{
  background:var(--navy2);border:1px solid var(--border);border-radius:12px;
  padding:18px;transition:all 0.2s;
  position:relative;overflow:hidden;
}
.feat-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,var(--violet),var(--violet2));
  opacity:0;transition:opacity 0.2s;
}
.feat-card:hover{border-color:rgba(124,58,237,0.4)}
.feat-card:hover::before{opacity:1}
.feat-icon{
  width:36px;height:36px;border-radius:8px;
  background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);
  display:flex;align-items:center;justify-content:center;
  font-size:16px;margin-bottom:12px;
}
.feat-title{font-family:'Syne',sans-serif;font-size:14px;font-weight:600;color:var(--text);margin-bottom:6px}
.feat-desc{font-size:13px;color:var(--muted);line-height:1.6}
.feat-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.feat-tag{font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid var(--border)}

.board-preview{
  background:var(--navy2);border:1px solid var(--border);border-radius:14px;
  padding:16px;overflow:hidden;
}
.board-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.board-title{font-family:'Syne',sans-serif;font-size:14px;font-weight:600}
.progress-wrap{flex:1;max-width:200px;margin-left:auto;margin-right:16px}
.progress-bar{height:5px;border-radius:3px;background:var(--navy3);overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,var(--violet),var(--violet2));border-radius:3px;width:45%}
.prog-label{font-size:11px;color:var(--muted);text-align:right;margin-top:3px}

.cols{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.col{background:var(--navy3);border-radius:10px;padding:10px;min-height:160px}
.col-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.col-name{font-size:11px;font-family:'Syne',sans-serif;text-transform:uppercase;letter-spacing:0.07em;color:var(--muted)}
.col-count{font-size:11px;padding:1px 7px;border-radius:10px;background:rgba(255,255,255,0.07);color:var(--dim)}

.task{
  background:var(--navy2);border:1px solid var(--border);border-radius:8px;
  padding:10px 10px 10px 13px;margin-bottom:8px;
  border-left-width:3px;cursor:grab;transition:transform 0.15s;
  position:relative;
}
.task:hover{transform:scale(1.02)}
.task.p-high{border-left-color:var(--red)}
.task.p-med{border-left-color:var(--amber)}
.task.p-low{border-left-color:var(--green)}
.task.p-done{border-left-color:var(--violet)}
.task-name{font-size:12px;font-weight:500;color:var(--text);margin-bottom:5px}
.task-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.badge{font-size:10px;padding:2px 7px;border-radius:4px;font-weight:500}
.badge-red{background:rgba(248,81,73,0.15);color:var(--red)}
.badge-amber{background:rgba(240,136,62,0.15);color:var(--amber)}
.badge-green{background:rgba(63,185,80,0.15);color:var(--green)}
.badge-violet{background:rgba(167,139,250,0.15);color:var(--violet2)}
.badge-blue{background:rgba(88,166,255,0.15);color:var(--blue)}
.avatar-row{display:flex;margin-left:auto}
.avatar{width:18px;height:18px;border-radius:50%;border:1.5px solid var(--navy2);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:600;margin-left:-5px}
.av1{background:#7c3aed;color:#fff}
.av2{background:#0d9488;color:#fff}
.av3{background:#b45309;color:#fff}

.setup-steps{display:flex;flex-direction:column;gap:0}
.step{display:flex;gap:16px;padding:16px 0;border-bottom:1px solid var(--border)}
.step:last-child{border-bottom:none}
.step-num{
  min-width:28px;height:28px;border-radius:50%;
  background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.4);
  display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:700;color:var(--violet2);font-family:'Syne',sans-serif;
  flex-shrink:0;margin-top:2px;
}
.step-body{}
.step-title{font-size:14px;font-weight:500;color:var(--text);margin-bottom:4px}
.step-desc{font-size:13px;color:var(--muted);line-height:1.5}
.code-block{
  background:var(--navy3);border:1px solid var(--border);border-radius:8px;
  padding:10px 14px;margin-top:8px;
  font-family:monospace;font-size:12px;color:#a5d6ff;
  overflow-x:auto;white-space:nowrap;
}

.kbd-grid{display:grid;grid-template-columns:auto 1fr;gap:0}
.kbd-row{display:contents}
.kbd-row>*{padding:10px 0;border-bottom:1px solid var(--border)}
.kbd-row:last-child>*{border-bottom:none}
.kbd{
  display:inline-flex;gap:4px;align-items:center;padding-right:20px;
}
.key{
  background:var(--navy3);border:1px solid var(--border);border-bottom:2px solid var(--dim);
  border-radius:5px;padding:2px 8px;font-size:12px;color:var(--text);
  font-family:'Syne',sans-serif;
}
.kbd-action{font-size:13px;color:var(--muted)}

.design-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}
.design-card{background:var(--navy2);border:1px solid var(--border);border-radius:10px;padding:14px}
.design-label{font-size:11px;color:var(--dim);font-family:'Syne',sans-serif;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:6px}
.design-val{font-size:13px;color:var(--text)}

.swatch-row{display:flex;gap:8px;margin-top:8px}
.swatch{width:28px;height:28px;border-radius:6px;border:1px solid rgba(255,255,255,0.08)}

.footer{
  text-align:center;padding:2.5rem 2rem;
  background:var(--navy2);
  border-top:1px solid var(--border);
}
.footer p{font-size:13px;color:var(--dim);margin-top:8px}
</style>
</head>
<body>

<div class="hero">
  <div class="hero-badge"><span class="dot"></span> Production Ready</div>
  <h1>TaskFlow</h1>
  <p class="hero-sub">A collaborative Kanban task manager built for real teams — with real-time sync, drag & drop, email alerts, and dark-first design.</p>
  <div class="pill-row">
    <span class="pill v">Next.js 14</span>
    <span class="pill v">Supabase</span>
    <span class="pill v">TypeScript</span>
    <span class="pill">Zustand</span>
    <span class="pill">dnd-kit</span>
    <span class="pill">Tailwind CSS</span>
    <span class="pill">RLS</span>
    <span class="pill">Realtime</span>
  </div>
  <div class="btn-row">
    <a class="btn btn-primary" href="https://github.com/codest0411/taskify">&#11042; View on GitHub</a>
    <a class="btn btn-ghost" href="#quick-setup">Quick Setup &rarr;</a>
  </div>
</div>

<div class="section">
  <div class="sec-label">Tech Stack</div>
  <div class="stack-grid">
    <div class="stack-card"><div class="layer">Frontend</div><div class="tech">Next.js 14 App Router</div></div>
    <div class="stack-card"><div class="layer">Language</div><div class="tech">TypeScript</div></div>
    <div class="stack-card"><div class="layer">Styling</div><div class="tech">Tailwind CSS</div></div>
    <div class="stack-card"><div class="layer">Database</div><div class="tech">Supabase PostgreSQL</div></div>
    <div class="stack-card"><div class="layer">Auth</div><div class="tech">Supabase Auth</div></div>
    <div class="stack-card"><div class="layer">Realtime</div><div class="tech">Supabase Realtime</div></div>
    <div class="stack-card"><div class="layer">Storage</div><div class="tech">Supabase Storage</div></div>
    <div class="stack-card"><div class="layer">State</div><div class="tech">Zustand</div></div>
    <div class="stack-card"><div class="layer">Drag &amp; Drop</div><div class="tech">@dnd-kit/core</div></div>
  </div>
</div>

<div class="section">
  <div class="sec-label">Live Board Preview</div>
  <div class="board-preview">
    <div class="board-header">
      <div class="board-title">Sprint #4 — TaskFlow UI</div>
      <div class="progress-wrap">
        <div class="progress-bar"><div class="progress-fill"></div></div>
        <div class="prog-label">4 / 9 completed</div>
      </div>
    </div>
    <div class="cols">
      <div class="col">
        <div class="col-header"><span class="col-name">Pending</span><span class="col-count">3</span></div>
        <div class="task p-high"><div class="task-name">Auth flow redesign</div><div class="task-meta"><span class="badge badge-red">High</span><div class="avatar-row"><div class="avatar av1">G</div></div></div></div>
        <div class="task p-med"><div class="task-name">Dark mode tokens</div><div class="task-meta"><span class="badge badge-amber">Med</span><div class="avatar-row"><div class="avatar av2">K</div></div></div></div>
        <div class="task p-low"><div class="task-name">README polish</div><div class="task-meta"><span class="badge badge-green">Low</span></div></div>
      </div>
      <div class="col">
        <div class="col-header"><span class="col-name">In Progress</span><span class="col-count">2</span></div>
        <div class="task p-high"><div class="task-name">Drag &amp; drop fixes</div><div class="task-meta"><span class="badge badge-red">High</span><div class="avatar-row"><div class="avatar av1">G</div><div class="avatar av3">R</div></div></div></div>
        <div class="task p-med"><div class="task-name">Email reminders cron</div><div class="task-meta"><span class="badge badge-amber">Med</span><div class="avatar-row"><div class="avatar av2">K</div></div></div></div>
      </div>
      <div class="col">
        <div class="col-header"><span class="col-name">Review</span><span class="col-count">2</span></div>
        <div class="task p-done"><div class="task-name">Supabase RLS policies</div><div class="task-meta"><span class="badge badge-violet">Review</span><div class="avatar-row"><div class="avatar av3">R</div></div></div></div>
        <div class="task p-done"><div class="task-name">Team invite flow</div><div class="task-meta"><span class="badge badge-violet">Review</span></div></div>
      </div>
      <div class="col">
        <div class="col-header"><span class="col-name">Completed</span><span class="col-count">4</span></div>
        <div class="task p-done"><div class="task-name">Kanban board core</div><div class="task-meta"><span class="badge badge-blue">Done</span></div></div>
        <div class="task p-done"><div class="task-name">Task drawer UI</div><div class="task-meta"><span class="badge badge-blue">Done</span></div></div>
        <div class="task p-done"><div class="task-name">Dashboard analytics</div><div class="task-meta"><span class="badge badge-blue">Done</span></div></div>
        <div class="task p-done"><div class="task-name">Paste bulk import</div><div class="task-meta"><span class="badge badge-blue">Done</span></div></div>
      </div>
    </div>
  </div>
</div>

<div class="section">
  <div class="sec-label">Features</div>
  <div class="feat-grid">
    <div class="feat-card">
      <div class="feat-icon">&#9635;</div>
      <div class="feat-title">Kanban Board</div>
      <div class="feat-desc">4 columns with real-time sync. Drag tasks between Pending &rarr; In Progress &rarr; Review &rarr; Completed.</div>
      <div class="feat-tags"><span class="feat-tag">dnd-kit</span><span class="feat-tag">supabase realtime</span></div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">&#11042;</div>
      <div class="feat-title">3 Ways to Create Tasks</div>
      <div class="feat-desc">Full modal with all fields, &amp;#8984;K quick-create, or paste a list for bulk import in one shot.</div>
      <div class="feat-tags"><span class="feat-tag">⌘K shortcut</span><span class="feat-tag">paste import</span></div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">&#10792;</div>
      <div class="feat-title">Task Detail Drawer</div>
      <div class="feat-desc">Edit inline, view activity timeline, thread comments, attach files with drag-drop + lightbox preview.</div>
      <div class="feat-tags"><span class="feat-tag">file uploads</span><span class="feat-tag">comments</span></div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">&#9673;</div>
      <div class="feat-title">Dashboard Analytics</div>
      <div class="feat-desc">Velocity, overdue count, weekly completion rate, and per-member progress bars at a glance.</div>
      <div class="feat-tags"><span class="feat-tag">stats</span><span class="feat-tag">team view</span></div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">&#11042;</div>
      <div class="feat-title">Team Management</div>
      <div class="feat-desc">Create teams, generate invite codes, and manage roles: Owner &rarr; Admin &rarr; Member.</div>
      <div class="feat-tags"><span class="feat-tag">invite code</span><span class="feat-tag">roles</span></div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">&#9647;</div>
      <div class="feat-title">Email Notifications</div>
      <div class="feat-desc">Assigned alerts, review-ready pings, custom reminders, and daily overdue digests via SMTP.</div>
      <div class="feat-tags"><span class="feat-tag">edge functions</span><span class="feat-tag">cron</span></div>
    </div>
  </div>
</div>

<div class="section" id="quick-setup">
  <div class="sec-label">Quick Setup</div>
  <div class="setup-steps">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <div class="step-title">Clone &amp; Install</div>
        <div class="step-desc">Pull the repo and install dependencies with npm.</div>
        <div class="code-block">git clone https://github.com/codest0411/taskify.git &amp;&amp; cd taskify &amp;&amp; npm install</div>
      </div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <div class="step-title">Set Environment Variables</div>
        <div class="step-desc">Copy the example env file and add your Supabase URL, anon key, service role key, and app URL.</div>
        <div class="code-block">cp .env.example .env.local</div>
      </div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <div class="step-title">Run the Database Migration</div>
        <div class="step-desc">Open Supabase Dashboard → SQL Editor → paste <code style="background:rgba(255,255,255,0.07);padding:1px 5px;border-radius:4px;font-size:12px">supabase/migrations/001_schema.sql</code> → Run. Sets up all tables, RLS, indexes, storage, and realtime subscriptions.</div>
      </div>
    </div>
    <div class="step">
      <div class="step-num">4</div>
      <div class="step-body">
        <div class="step-title">Start the Dev Server</div>
        <div class="step-desc">Boot the app locally at <code style="background:rgba(255,255,255,0.07);padding:1px 5px;border-radius:4px;font-size:12px">http://localhost:3000</code></div>
        <div class="code-block">npm run dev</div>
      </div>
    </div>
  </div>
</div>

<div class="section">
  <div class="sec-label">Deployment</div>
  <div class="setup-steps">
    <div class="step">
      <div class="step-num">A</div>
      <div class="step-body">
        <div class="step-title">Deploy via Git (Recommended)</div>
        <div class="step-desc">Push to GitHub, go to <strong style="color:var(--text)">vercel.com/new</strong>, import your repo, add environment variables in Settings → Environment Variables, then click Deploy.</div>
        <div class="code-block">git init &amp;&amp; git add . &amp;&amp; git commit -m "initial commit" &amp;&amp; git push -u origin main</div>
      </div>
    </div>
    <div class="step">
      <div class="step-num">B</div>
      <div class="step-body">
        <div class="step-title">Deploy via CLI</div>
        <div class="step-desc">Install the Vercel CLI and run the deploy command. Follow the prompts.</div>
        <div class="code-block">npm install -g vercel &amp;&amp; vercel</div>
      </div>
    </div>
    <div class="step">
      <div class="step-num">C</div>
      <div class="step-body">
        <div class="step-title">Self-hosted</div>
        <div class="step-desc">Build and start the production server on your own infrastructure.</div>
        <div class="code-block">npm run build &amp;&amp; npm start</div>
      </div>
    </div>
  </div>
</div>

<div class="section">
  <div class="sec-label">Email Setup</div>
  <div class="setup-steps">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <div class="step-title">Supabase Dashboard SMTP (Recommended)</div>
        <div class="step-desc">Go to Supabase Dashboard → Authentication → SMTP Settings. Enable custom SMTP and enter your provider details (Gmail: smtp.gmail.com:587, Outlook: smtp.office365.com:587). No Resend or external providers required.</div>
      </div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <div class="step-title">Deploy Edge Functions</div>
        <div class="step-desc">Install Supabase CLI, link your project, then deploy the email functions.</div>
        <div class="code-block">supabase functions deploy send-email &amp;&amp; supabase functions deploy email-reminders</div>
      </div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <div class="step-title">Set Up Reminder Cron Job</div>
        <div class="step-desc">Enable pg_cron in Supabase Dashboard → Database → Extensions, then schedule the reminder function every 5 minutes via SQL Editor.</div>
      </div>
    </div>
  </div>
</div>

<div class="section">
  <div class="sec-label">Keyboard Shortcuts</div>
  <div class="kbd-grid">
    <div class="kbd-row">
      <div class="kbd"><span class="key">⌘</span><span class="key">K</span></div>
      <div class="kbd-action">Quick create task</div>
    </div>
    <div class="kbd-row">
      <div class="kbd"><span class="key">Esc</span></div>
      <div class="kbd-action">Close modals &amp; drawers</div>
    </div>
    <div class="kbd-row">
      <div class="kbd"><span class="key">Enter</span></div>
      <div class="kbd-action">Submit quick create</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="sec-label">Design System</div>
  <div class="design-grid">
    <div class="design-card">
      <div class="design-label">Heading Font</div>
      <div class="design-val" style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700">Syne</div>
    </div>
    <div class="design-card">
      <div class="design-label">Body Font</div>
      <div class="design-val" style="font-family:'DM Sans',sans-serif">DM Sans</div>
    </div>
    <div class="design-card">
      <div class="design-label">Theme</div>
      <div class="design-val">Deep Navy + Violet</div>
    </div>
    <div class="design-card">
      <div class="design-label">Cards</div>
      <div class="design-val">Glass + Priority Borders</div>
    </div>
    <div class="design-card">
      <div class="design-label">Color Palette</div>
      <div class="swatch-row">
        <div class="swatch" style="background:#0d1117"></div>
        <div class="swatch" style="background:#7c3aed"></div>
        <div class="swatch" style="background:#a78bfa"></div>
        <div class="swatch" style="background:#3fb950"></div>
        <div class="swatch" style="background:#f0883e"></div>
        <div class="swatch" style="background:#f85149"></div>
      </div>
    </div>
    <div class="design-card">
      <div class="design-label">Animations</div>
      <div class="design-val">Fade modals, slide drawer, smooth drag</div>
    </div>
  </div>
</div>

<div class="footer">
  <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;background:linear-gradient(135deg,#fff,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">TaskFlow</div>
  <p>MIT License &middot; Built by <a href="https://github.com/codest0411" style="color:var(--violet2);text-decoration:none">codest0411</a></p>
</div>

</body>
</html>
