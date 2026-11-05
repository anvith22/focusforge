# FocusForge ⚡

> **Personal Productivity & Anti-Procrastination OS for Software Engineers**  
> Build momentum on your side projects after work through single-task sprints, PostgreSQL persistence, and reflection routines.

---

## 1. Architectural Overview

FocusForge is engineered as a clean full-stack monorepo with strict separation of concerns, transactional PostgreSQL persistence, and timestamp-based elapsed time reconciliation.

```text
focusforge/
├── apps/
│   ├── web/                     # React 19 + Vite + TypeScript + Tailwind CSS v4
│   │   ├── src/
│   │   │   ├── components/      # FocusTimer, TaskCard (with Subtasks & AI), SoundscapeBar, DistractionPadModal
│   │   │   ├── layouts/         # MainLayout (Dark navy sidebar + responsive shell)
│   │   │   ├── pages/           # Today, Projects, Tasks, History, Progress (Friction & Peak Hours), Settings
│   │   │   ├── hooks/           # useFocusTimer (timestamp reconciliation, notifications, Pomodoro cycles)
│   │   │   ├── lib/             # Typed API client, multi-track SoundEngine, parkedThoughts
│   │   │   └── types/           # Shared TypeScript interfaces
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── api/                     # Node.js + Express + TypeScript + pg
│       ├── src/
│       │   ├── config/          # Zod environment variable parsing
│       │   ├── db/
│       │   │   ├── migrations/  # Idempotent SQL migrations (001, 002, 003)
│       │   │   ├── seeds/       # Sample development project & tasks
│       │   │   ├── pool.ts      # PostgreSQL connection pool with masked logs
│       │   │   └── migrate.ts   # Repeatable migration runner
│       │   ├── middleware/      # Centralized error handler & Zod validation
│       │   ├── modules/
│       │   │   ├── projects/    # Project CRUD & stats
│       │   │   ├── tasks/       # Task CRUD, subtasks, recurrence service
│       │   │   ├── subtasks/    # Atomic task checklist CRUD & reordering
│       │   │   ├── sessions/    # Focus session lifecycle, concurrency guard, friction diagnostics
│       │   │   ├── thoughts/    # Distraction parking pad (PostgreSQL backed)
│       │   │   ├── settings/    # User settings persistence
│       │   │   ├── ai/          # Anti-procrastination AI task deconstruction
│       │   │   └── dashboard/   # Daily & weekly PostgreSQL analytics & streaks
│       │   ├── app.ts           # Express application setup & CORS
│       │   └── server.ts        # Server entry with graceful shutdown
│       └── package.json
├── package.json                 # Monorepo workspaces & dev scripts
├── .gitignore
├── .env.example
└── README.md
```

---

## 2. Technology Stack

- **Frontend**:
  - React 19
  - Vite 6
  - TypeScript
  - Tailwind CSS v4 (`@tailwindcss/vite`)
  - React Router 7
  - TanStack Query v5
  - Lucide React icons
- **Backend**:
  - Node.js (v20+)
  - Express
  - TypeScript
  - Zod for runtime schema validation
  - `pg` (node-postgres) with connection pooling
- **Database**:
  - PostgreSQL (Local or Hosted)
  - Partial unique index `idx_one_running_focus_session` enforcing at most one active session
  - Triggers for automatic `updated_at` timestamps
  - Versioned migration tracking (`schema_migrations`)

---

## 3. Getting Started & Installation

### Prerequisites
- **Node.js**: v20 or higher (`node -v`)
- **npm**: v10 or higher (`npm -v`)
- **PostgreSQL**: Running locally or via remote connection

### Clone & Install Dependencies
From the repository root:
```bash
npm install
```

---

## 4. Environment Configuration

Copy the example environment files:
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### Backend (`apps/api/.env`)
```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/focusforge
CLIENT_ORIGIN=http://localhost:5173
APP_TIMEZONE=Asia/Kolkata
NODE_ENV=development
```

### Frontend (`apps/web/.env`)
```env
VITE_API_URL=/api
```
*(In development, Vite automatically proxies `/api` requests to `http://localhost:5000`)*

---

## 5. Database Setup & Migrations

### 1. Create the Database
Ensure PostgreSQL is running, then create the database if it doesn't already exist:
```sql
CREATE DATABASE focusforge;
```

### 2. Run Database Migrations
Migrations are repeatable and track applied versions in `schema_migrations`:
```bash
npm run migrate
```

### 3. (Optional) Development Seed Data
To populate the database with a sample project and tasks:
```bash
npm run seed
```

---

## 6. Running the Application

### Run Frontend & Backend Concurrently
```bash
npm run dev
```
- **Web App**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:5000](http://localhost:5000)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### Run Independently
- Run API server only:
  ```bash
  npm run dev:api
  ```
- Run Web frontend only:
  ```bash
  npm run dev:web
  ```

---

## 7. Testing & Quality Assurance

Run all unit and integration tests across workspaces:
```bash
npm run test
```

Or test packages individually:
```bash
npm run test:api   # 17 Vitest tests for endpoints, constraints & error handling
npm run test:web   # Vitest unit tests for timer calculations and formatting
```

### Production Build
Verify TypeScript type safety and compile production assets:
```bash
npm run build
```

---

## 8. Core Features & Capabilities

### ⚡ Focus Timer with Timestamp Reconciliation
- **Presets**: 10m (Quick Start), 25m (Pomodoro), 50m (Deep Work), or Custom minutes.
- **Accurate Elapsed Time**: Calculates elapsed duration using timestamps rather than raw `setInterval` ticks. Reconciles seamlessly on tab switches or browser minimization.
- **Session Recovery**: If the tab is closed, any running session is recovered directly from PostgreSQL on next load.
- **Concurrency Guard**: Enforced at the database level (`idx_one_running_focus_session`), preventing multiple conflicting timers across tabs.

### 🛡️ Distraction Management & Zen Mode
- **Pre-Flight Focus Checklist**: Modal prompting the user to silence phones, close unrelated browser tabs, and commit to single-tasking before timer start.
- **Zen Mode**: Distraction-free full-screen overlay centering the timer and active task objective.
- **Tab Title Feedback**: Displays live countdown `(MM:SS) FocusForge` in browser tab header.

### 📝 Evening Routine & Reflection
- Prompting questions upon completing or abandoning a session:
  1. *What did you accomplish?*
  2. *What blocked you, if anything?*
  3. *What is your next concrete action?*
- Persisted to PostgreSQL for historical review in **Focus History**.

### 📊 Real PostgreSQL Metrics & Streaks
- **Today Dashboard**: Today's active tasks, highest-priority recommended action, total actual focus minutes, and daily progress gauge.
- **Weekly Progress**: 7-day focus minute breakdown, planned vs. actual comparison bar chart, and consistency streaks calculated from actual persisted timestamps.
