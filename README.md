# TaskFlow — Team Task Manager

<p align="center">
  <strong>A production-grade collaborative Kanban task manager</strong><br/>
  Built with Next.js 14, Supabase, and TypeScript
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#quick-setup">Quick Setup</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#folder-structure">Folder Structure</a>
</p>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| **Backend** | Next.js API Routes |
| **Database** | Supabase (PostgreSQL) with Row Level Security |
| **Auth** | Supabase Auth (email/password) |
| **Storage** | Supabase Storage (file uploads) |
| **Email** | Supabase Edge Functions (your SMTP) |
| **Real-time** | Supabase Realtime (live board sync) |
| **State** | Zustand |
| **Drag & Drop** | @dnd-kit/core |

---

## Quick Setup

### 1. Clone & Install

```bash
git clone https://github.com/codest0411/taskify.git
cd taskify
npm install
```

### 2. Environment Variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_APP_URL` | Your app URL (`http://localhost:3000` for dev) |

### 3. Set Up the Database

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/001_schema.sql`
4. Click **Run**

This creates all tables, RLS policies, indexes, storage bucket, and realtime subscriptions.

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment

### Vercel (Recommended)

This project is optimized for **Vercel** deployment. A `vercel.json` config is included that handles:

- ✅ Framework detection (Next.js)
- ✅ Client-side routing (no 404 on page refresh)
- ✅ Security headers (XSS protection, content-type sniffing, clickjacking)
- ✅ Region optimization

#### Option A — Deploy via Git (Recommended)

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "initial commit: TaskFlow team task manager"
   git remote add origin https://github.com/codest0411/taskify.git
   git branch -M main
   git push -u origin main
   ```

2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your `taskify` repository
4. Add environment variables in **Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` → set to your Vercel deployment URL (e.g., `https://taskify-xyz.vercel.app`)
5. Click **Deploy**

#### Option B — Deploy via CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts and add environment variables when asked.

### Self-hosted

```bash
npm run build
npm start
```

---

## Email Setup (Supabase Built-in SMTP)

TaskFlow uses Supabase Edge Functions to send emails. You do **NOT** need Resend or external providers.

### Option A — Supabase Dashboard SMTP (Recommended)

1. Go to Supabase Dashboard → **Authentication** → **SMTP Settings**
2. Enable custom SMTP and enter your provider details:
   - **Gmail**: smtp.gmail.com:587 (use App Password)
   - **Outlook**: smtp.office365.com:587
   - **Any SMTP provider**
3. Emails will be sent automatically by the edge functions

### Option B — Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref ouoarvjxugxegmjpmwyp

# Deploy the send-email function
supabase functions deploy send-email

# Deploy the reminder cron function  
supabase functions deploy email-reminders

# Set environment variables for the function
supabase secrets set APP_URL=https://your-domain.com
```

### Setting Up the Reminder Cron Job

In Supabase Dashboard → **Database** → **Extensions** → Enable **pg_cron**

Then in SQL Editor:
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

---

## Features

### ✅ Kanban Board
- 4 columns: Pending → In Progress → Review → Completed
- Drag & drop tasks between columns
- Real-time sync across all team members
- Progress bar showing completion percentage

### ✅ Task Creation (3 Methods)
- **Full Modal**: Title, description, priority, due date, reminder, assignees, tags
- **Quick Create**: Press `⌘K` or click Quick → type title → Enter
- **Paste Import**: Paste a list of tasks (one per line) → bulk create

### ✅ Task Detail Drawer
- Edit all fields inline
- Activity timeline with timestamps
- Comment thread
- File attachments with image preview / lightbox
- Upload via drag-and-drop or click

### ✅ Dashboard Analytics
- Total tasks, completed this week (with % change), overdue count, daily velocity
- Per-member completion rate bars

### ✅ Team Management
- Create team → auto-generated invite code
- Join via invite code
- Role system: owner > admin > member
- Settings page: rename team, manage members, regenerate invite code

### ✅ Email Notifications
- Task assigned to you
- Task moved to Review
- Reminder at custom time
- Overdue alerts (daily)

### ✅ Dark/Light Mode
- Dark first, toggle in sidebar

---

## Folder Structure

```
src/
├── app/
│   ├── api/
│   │   ├── tasks/
│   │   │   ├── route.ts              # POST /api/tasks
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET/PATCH/DELETE
│   │   │       ├── attachments/      # POST file upload
│   │   │       └── comments/         # POST comment
│   │   ├── teams/
│   │   │   ├── create/               # POST create team
│   │   │   ├── join/                 # POST join via code
│   │   │   ├── invite/               # POST regen code
│   │   │   └── [teamId]/
│   │   │       ├── route.ts          # PATCH team
│   │   │       └── members/[memberId]/ # PATCH/DELETE
│   │   └── reminders/
│   │       └── send/                 # POST cron trigger
│   ├── auth/
│   │   ├── login/                    # Login page
│   │   ├── signup/                   # Signup page
│   │   └── callback/                 # OAuth callback
│   └── dashboard/
│       ├── layout.tsx                # Auth guard + sidebar
│       ├── page.tsx                  # Redirects to first team
│       ├── onboarding/               # Create or join team
│       ├── board/[teamId]/           # Main Kanban board
│       ├── team/[teamId]/            # Member list
│       └── settings/[teamId]/        # Team settings
├── components/
│   ├── board/
│   │   ├── board-client.tsx          # Main interactive board
│   │   ├── board-header.tsx          # Filters, progress, actions
│   │   ├── board-column.tsx          # Droppable column
│   │   ├── task-card.tsx             # Draggable task card
│   │   └── team-settings-client.tsx
│   ├── tasks/
│   │   ├── task-drawer.tsx           # Full task detail drawer
│   │   ├── create-task-modal.tsx     # Full creation form
│   │   ├── quick-create.tsx          # ⌘K quick input
│   │   ├── paste-import.tsx          # Bulk paste import
│   │   └── dashboard-stats.tsx       # Stats row
│   ├── layout/
│   │   ├── app-shell.tsx             # Sidebar + layout
│   │   ├── theme-provider.tsx        # Dark/light mode
│   │   └── user-menu.tsx
│   └── ui/                           # shadcn/ui primitives
├── hooks/
│   └── use-toast.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client + service client
│   │   └── middleware.ts             # Auth session refresh
│   └── utils.ts                      # Helpers
├── store/
│   └── index.ts                      # Zustand global state
├── types/
│   └── index.ts                      # TypeScript interfaces
└── styles/
    └── globals.css                   # Tailwind + custom CSS

supabase/
├── migrations/
│   └── 001_schema.sql               # Full DB schema + RLS
└── functions/
    ├── send-email/index.ts           # Email sender function
    └── email-reminders/index.ts     # Cron: check & send reminders
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Quick create task |
| `Esc` | Close modals/drawers |
| `Enter` | Submit quick create |

---

## Design

- **Font**: Syne (headings) + DM Sans (body) — imported from Google Fonts
- **Theme**: Deep navy dark mode with violet/purple primary accent
- **Cards**: Glass morphism with priority-colored left borders
- **Animations**: Fade-in modals, slide-in drawer, smooth drag overlay

---

## License

MIT © [codest0411](https://github.com/codest0411)
