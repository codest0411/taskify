<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,14,19&height=220&section=header&text=TaskFlow&fontSize=90&fontColor=ffffff&fontAlignY=38&desc=The%20Ultimate%20Real-Time%20Collaboration%20Hub&descSize=18&descAlignY=58&descColor=c4b5fd&animation=fadeIn" width="100%"/>

<br/>

<img src="https://img.shields.io/badge/Next.js%2014-000000?style=for-the-badge&logo=nextdotjs&logoColor=white"/>
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
<img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white"/>
<img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white"/>
<img src="https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white"/>
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

## 🚀 What is TaskFlow?

</div>

**TaskFlow** is a modern, full-stack collaborative workspace designed to bridge the gap between task management and real-time team communication. Built on the bleeding edge of the web with **Next.js 14**, **Supabase**, and **WebRTC**, TaskFlow is more than just a Kanban board — it is a virtual office. 

Whether you are dragging tasks across the board, jumping into a Google Meet-style **Voice Chat**, or **sharing your screen** with your team, everything happens instantly, securely, and natively in your browser.

<br/>

<div align="center">
  <!-- Note: Replace the src with an actual hero image URL of your app if you have one! -->
  <img src="https://raw.githubusercontent.com/codest0411/taskify/main/public/preview.png" alt="TaskFlow Dashboard Preview" width="800" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);"/>
  <p><em>Experience real-time sync with dark-mode aesthetic perfection.</em></p>
</div>

---

<div align="center">

## ✨ Core Features

</div>

### 🎙️ Real-Time Voice Chat (Google Meet Style)
- **Zero-Friction Audio:** Enter the board and instantly hear your team. Click "Voice" to unmute your own microphone via seamless WebRTC renegotiation.
- **Mobile Optimized:** Full mobile browser support with Auto-play bypass and UI prompts.
- **Enterprise NAT Traversal:** Integrated Twilio/Metered TURN servers to bypass strict 4G/LTE mobile network firewalls.
- **Smart Voice Detection:** Built-in VAD (Voice Activity Detection) highlights exactly who is talking with beautiful floating UI indicators.

### 🖥️ Peer-to-Peer Screen Sharing
- Host instant screen-sharing sessions directly inside the Kanban board without third-party tools.
- Remote peers can view the host's screen in a dynamic, draggable, and resizable overlay window.
- Powered by secure, direct P2P data channels with global STUN/TURN fallbacks.

### 🗂️ Live Kanban Board
- **Instant Sync:** Move a card on your screen, and it instantly moves on everyone else's screen across the world via Supabase Realtime.
- **Drag & Drop:** Fluid, accessible drag-and-drop powered by `@dnd-kit/core`.
- **4 Custom Columns:** Pending → In Progress → Review → Completed. 

### ⚡ Rapid Task Management
- **Quick Create (`⌘K`):** Hit Command+K anywhere to fire up the Quick Create prompt.
- **Bulk Paste Import:** Copy a list of tasks from Notion or Excel and paste them instantly into individual task cards.
- **Rich Task Drawer:** Inline editing, activity timelines, nested priorities, and file attachments with lightbox previews.

### 📊 Team Analytics & Notifications
- Track daily velocity, weekly completions, and overdue counts.
- Member-specific performance bars and metrics.
- Supabase Edge Functions manage assignment alerts, review-ready pings, and daily overdue digests perfectly.

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
| **Frontend** | Next.js 14 App Router + TS | Pages, routing, SSR, API routes |
| **Styling** | Tailwind CSS + shadcn/ui | Premium, utility-first design system |
| **Database** | Supabase PostgreSQL + RLS | Secure, scalable relational data layer |
| **Realtime** | Supabase Realtime + WebRTC | Live DB sync & peer-to-peer audio/video |
| **Auth** | Supabase Auth | Secure role-based access & Row Level Security |
| **Storage** | Supabase Storage | File & image uploads |
| **Email** | Supabase Edge Functions | SMTP notifications & background CRON jobs |
| **State** | Zustand | Lightweight global application state |

---

<div align="center">

## ⚡ Quick Setup

</div>

### 1. Clone & Install
```bash
git clone https://github.com/codest0411/taskify.git
cd taskify
npm install
```

### 2. Environment Variables
Create a `.env.local` file at the root:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Migration
Open **Supabase Dashboard → SQL Editor**, paste the contents of `supabase/migrations/001_schema.sql`, and click **Run**. This establishes all tables, RLS policies, storage buckets, and realtime configurations instantly.

### 4. Start Dev Server
```bash
npm run dev
```
Navigate to **[http://localhost:3000](http://localhost:3000)** and you're fully live. 🎉

---

<div align="center">

## 🚀 Deployment

</div>

<details>
<summary><b>▲ Deploy to Vercel (Recommended)</b></summary>
<br/>

1. Push your code to your GitHub repository.
2. Go to **[vercel.com/new](https://vercel.com/new)** and import your repo.
3. Add your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the **Environment Variables** section.
4. Add your deployed URL to `NEXT_PUBLIC_APP_URL`.
5. Click **Deploy**. 
</details>

---

<div align="center">

## 🎨 Design System

</div>

<div align="center">

| | Property | Value |
|:-:|:---------|:------|
| 🔤 | Heading Font | **Syne** — bold, geometric, futuristic |
| 🔤 | Body Font | **DM Sans** — crisp, highly readable |
| 🎨 | Theme | Deep navy dark mode + vibrant violet/emerald accents |
| 🃏 | Cards | Glassmorphism aesthetics + priority-colored status bars |
| 🎬 | Animations | Tailwind Animate, Fade-ins, Drawers, and Dynamic overlays |

</div>

---

<div align="center">

## 🤝 Contributing

</div>

Contributions are heavily encouraged! Built an awesome new feature? 

```bash
git checkout -b feature/amazing-feature
git commit -m "feat: added an amazing feature"
git push origin feature/amazing-feature
```
Open a Pull Request on GitHub and let's merge it!

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,14,19&height=120&section=footer&animation=fadeIn" width="100%"/>

**MIT License** &nbsp;·&nbsp; Engineered with 💜 by **[codest0411](https://github.com/codest0411)**

<br/>

⭐ **If you love TaskFlow, please star the repository!** ⭐

</div>
