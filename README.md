<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,14,19&height=220&section=header&text=TaskFlow&fontSize=90&fontColor=ffffff&fontAlignY=38&desc=Production-grade%20Collaborative%20Kanban%20Task%20Manager&descSize=18&descAlignY=58&descColor=c4b5fd&animation=fadeIn" width="100%"/>

<br/>

<img src="https://img.shields.io/badge/Next.js%2014-000000?style=for-the-badge&logo=nextdotjs&logoColor=white"/>
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
<img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white"/>
<img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white"/>
<img src="https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=react&logoColor=white"/>

<br/><br/>

<img src="https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel&logoColor=white"/>
<img src="https://img.shields.io/badge/License-MIT-a78bfa?style=flat-square"/>
<img src="https://img.shields.io/github/stars/codest0411/taskify?style=flat-square&color=7c3aed&label=Stars"/>
<img src="https://img.shields.io/github/issues/codest0411/taskify?style=flat-square&color=f85149&label=Issues"/>
<img src="https://img.shields.io/badge/PRs-Welcome-3fb950?style=flat-square"/>

<br/><br/>

**[🌐 Live Demo](https://taskflow99.vercel.app)** &nbsp;•&nbsp; **[📁 Repo](https://github.com/codest0411/taskify)** &nbsp;•&nbsp; **[🐛 Report Bug](https://github.com/codest0411/taskify/issues)** &nbsp;•&nbsp; **[✨ Request Feature](https://github.com/codest0411/taskify/issues)**

</div>

---

<div align="center">

## 🗂️ What is TaskFlow?

</div>

**TaskFlow** is a full-stack, real-time Kanban task manager for teams — built with **Next.js 14 App Router**, **Supabase**, and **TypeScript**. It supports drag-and-drop task management, live board sync across team members, role-based access, email notifications, file attachments, and a dashboard with per-member analytics — all deployable to Vercel in minutes.

---

<div align="center">

## ✨ Features

</div>

<table>
<thead>
<tr>
<th>🗂️ Kanban Board</th>
<th>✍️ Task Creation</th>
<th>📋 Task Drawer</th>
</tr>
</thead>
<tbody>
<tr>
<td>4 columns: Pending → In Progress → Review → Completed. Drag & drop with real-time sync and a progress bar.</td>
<td>3 ways: Full modal, <code>⌘K</code> quick-create, or paste a newline-separated list for bulk import.</td>
<td>Edit inline, activity timeline, comments, file attachments with drag-drop upload and lightbox preview.</td>
</tr>
</tbody>
</table>

<table>
<thead>
<tr>
<th>📊 Analytics</th>
<th>👥 Teams</th>
<th>📧 Notifications</th>
<th>🌙 Dark Mode</th>
</tr>
</thead>
<tbody>
<tr>
<td>Total tasks, weekly completions, overdue count, daily velocity, per-member bars.</td>
<td>Invite codes, Owner → Admin → Member roles, team rename & member management.</td>
<td>Assignment alerts, review-ready pings, custom reminders, daily overdue digests.</td>
<td>Dark-first with toggle. Deep navy + violet accent system-wide.</td>
</tr>
</tbody>
</table>

---

<div align="center">

## 🛠️ Tech Stack

</div>

<div align="center">

<img src="https://skillicons.dev/icons?i=nextjs,ts,tailwind,supabase,vercel,react,postgres&theme=dark&perline=7"/>

</div>

<br/>

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| **Frontend** | Next.js 14 App Router + TypeScript | Pages, routing, SSR |
| **Styling** | Tailwind CSS | Utility-first design system |
| **Database** | Supabase PostgreSQL + RLS | Secure, scalable data layer |
| **Auth** | Supabase Auth | Email/password sign-in |
| **Realtime** | Supabase Realtime | Live board sync across members |
| **Storage** | Supabase Storage | File & image uploads |
| **Email** | Supabase Edge Functions | SMTP notifications & reminders |
| **State** | Zustand | Lightweight global state |
| **Drag & Drop** | @dnd-kit/core | Accessible drag interactions |

---

<div align="center">

## ⚡ Quick Setup

</div>

### Step 1 — Clone & Install

```bash
git clone https://github.com/codest0411/taskify.git
cd taskify
npm install
```

### Step 2 — Environment Variables

```bash
cp .env.example .env.local
```

Fill in your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3 — Database Migration

> Open **Supabase Dashboard → SQL Editor**, paste `supabase/migrations/001_schema.sql`, click **Run**.

This creates all tables, RLS policies, indexes, storage buckets, and realtime subscriptions automatically.

### Step 4 — Start Dev Server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** and you're live. 🎉

---

<div align="center">

## 🚀 Deployment

</div>

<details>
<summary><b>▲ Vercel via Git (Recommended)</b></summary>

<br/>

```bash
git init
git add .
git commit -m "initial commit: TaskFlow"
git remote add origin https://github.com/codest0411/taskify.git
git branch -M main
git push -u origin main
```

1. Go to **[vercel.com/new](https://vercel.com/new)**
2. Import your `taskify` repository
3. Add environment variables under **Settings → Environment Variables**
4. Set `NEXT_PUBLIC_APP_URL` → `https://taskflow99.vercel.app`
5. Click **Deploy** ✅

</details>

<details>
<summary><b>▲ Vercel via CLI</b></summary>

<br/>

```bash
npm install -g vercel
vercel
```

</details>

<details>
<summary><b>🖥️ Self-Hosted</b></summary>

<br/>

```bash
npm run build
npm start
```

</details>

---

<div align="center">

## 📧 Email Setup

</div>

TaskFlow uses **Supabase Edge Functions** — no Resend or external provider needed.

<details>
<summary><b>Option A — Supabase Dashboard SMTP (Recommended)</b></summary>

<br/>

1. Supabase Dashboard → **Authentication → SMTP Settings**
2. Enable custom SMTP and enter your provider:

| Provider | Host | Port |
|:---------|:-----|:-----|
| Gmail | `smtp.gmail.com` | `587` (App Password) |
| Outlook | `smtp.office365.com` | `587` |
| Any SMTP | your host | your port |

</details>

<details>
<summary><b>Option B — Deploy Edge Functions</b></summary>

<br/>

```bash
npm install -g supabase
supabase login
supabase link --project-ref ouoarvjxugxegmjpmwyp
supabase functions deploy send-email
supabase functions deploy email-reminders
supabase secrets set APP_URL=https://your-domain.com
```

**Enable the Reminder Cron Job:**

```sql
SELECT cron.schedule(
  'email-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ouoarvjxugxegmjpmwyp.supabase.co/functions/v1/email-reminders',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

> Enable `pg_cron` first: Supabase Dashboard → **Database → Extensions → pg_cron**

</details>

---

<div align="center">

## ⌨️ Keyboard Shortcuts

</div>

<div align="center">

| Shortcut | Action |
|:--------:|:-------|
| `⌘K` / `Ctrl+K` | Quick create task |
| `Esc` | Close modals & drawers |
| `Enter` | Submit quick create |

</div>

---

<div align="center">

## 🎨 Design System

</div>

<div align="center">

| | Property | Value |
|:-:|:---------|:------|
| 🔤 | Heading Font | **Syne** — bold, geometric |
| 🔤 | Body Font | **DM Sans** — clean, readable |
| 🎨 | Theme | Deep navy dark mode + violet/purple primary |
| 🃏 | Cards | Glass morphism + priority-colored left borders |
| 🎬 | Animations | Fade-in modals · Slide-in drawer · Smooth drag overlay |

</div>

---

<div align="center">

## 📁 Folder Structure

</div>

```
src/
├── app/
│   ├── api/
│   │   ├── tasks/               # CRUD + attachments + comments
│   │   ├── teams/               # Create, join, invite, manage
│   │   └── reminders/           # Cron trigger endpoint
│   ├── auth/
│   │   ├── login/
│   │   ├── signup/
│   │   └── callback/
│   └── dashboard/
│       ├── layout.tsx           # Auth guard + sidebar
│       ├── onboarding/          # Create or join team
│       ├── board/[teamId]/      # ← Main Kanban board
│       ├── team/[teamId]/       # Member list
│       └── settings/[teamId]/   # Team settings
│
├── components/
│   ├── board/                   # board-client, columns, task-cards
│   ├── tasks/                   # drawer, modal, quick-create, paste-import
│   ├── layout/                  # app-shell, theme-provider, user-menu
│   └── ui/                      # shadcn/ui primitives
│
├── hooks/
├── lib/
│   ├── supabase/                # client, server, middleware
│   └── utils.ts
├── store/index.ts               # Zustand global state
└── types/index.ts               # TypeScript interfaces

supabase/
├── migrations/
│   └── 001_schema.sql           # Full DB schema + RLS policies
└── functions/
    ├── send-email/index.ts
    └── email-reminders/index.ts  # Cron: check & send reminders
```

---

<div align="center">

## 🤝 Contributing

</div>

Contributions are welcome! Feel free to open an issue or submit a pull request.

```bash
# Fork the repo, then:
git checkout -b feature/your-feature
git commit -m "feat: add your feature"
git push origin feature/your-feature
# Open a Pull Request on GitHub
```

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,14,19&height=120&section=footer&animation=fadeIn" width="100%"/>

**MIT License** &nbsp;·&nbsp; Made with 💜 by **[codest0411](https://github.com/codest0411)**

<br/>

⭐ **Star this repo if you found it useful!** ⭐

</div>
