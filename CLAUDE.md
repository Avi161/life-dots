# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LifeDots** is a memento mori dashboard that visualizes a user's lifespan as a grid of dots. It is a monorepo with three applications:

- `frontend/` — React + Vite SPA (main web app)
- `backend/` — Express 5 + Supabase REST API (port 4000)
- `extension/` — Chrome Manifest v3 popup (shares `dateEngine` with frontend)

## Development Commands

### Frontend
```bash
cd frontend
npm run dev       # Dev server at http://localhost:5173
npm run build     # Production build
npm run lint      # ESLint
npm run deploy    # Build + deploy to gh-pages
```

### Backend
```bash
cd backend
npm run dev       # Node watch mode (auto-reload on changes)
npm run start     # Production
npm run test      # Run tests with node --test test/
```

### Extension
```bash
cd extension
npm run dev       # Dev server at http://localhost:5174
npm run build     # Build dist/ for loading in Chrome
```

## Architecture

### Data Flow
```
Frontend (React) ←→ Backend (Express, port 4000) ←→ Supabase (Auth + PostgreSQL)
      ↓                                                       ↓
 localStorage                                      RLS-protected tables
```

### Context Key System
Journal entries and todos are organized by hierarchical context keys:
- `"life"` → whole-life journal
- `"year-20"` → 20th year
- `"year-20-month-3"` → 3rd month of 20th year
- `"year-20-month-3-day-15"` → specific day

These keys are computed by `frontend/src/utils/dateEngine.js` and `useJournalContext.js`.

### Backend: Routes → Controllers → Services → Supabase
```
backend/src/
├── routes/       # Express route definitions
├── controllers/  # Request validation (Zod) + response formatting
├── services/     # Supabase query logic
└── middleware/   # JWT auth (auth.js), error handling (errorHandler.js)
```
All responses follow: `{ success: boolean, data?: any, error?: { message: string } }`

### Frontend Key Modules
- `dateEngine.js` — Computes dot grid (lived/current/future/before-birth status, labels)
- `dotMeta.js` — Dot color/tag metadata cache; synced as JSONB to `profiles.dot_meta`
- `api.js` — HTTP client with Bearer token auth; handles OAuth flow + all CRUD
- `DotGrid.jsx` — Main grid renderer (years/months/days/hours views with Framer Motion)

### Extension
Reuses `dateEngine.js` via Vite alias (`@dateEngine`). Stores auth token in `chrome.storage.local`. Popup is 400×560px with tabs for Dots/Todos.

### Database Tables (Supabase)
- `profiles` — User settings: `birth_date`, `expected_lifespan`, `theme`, `dot_meta` (JSONB)
- `journal_entries` — `context_key`, `content`, `user_id`
- `todos` — `context_key`, `task`, `due_date`, `is_completed`, `user_id`

Row Level Security (RLS) is enforced on all tables.

### Theme System
CSS variables (`--bg`, `--fg`, `--fg-muted`, `--control-bg`, `--control-border`, etc.) toggled via `data-theme` attribute on `<html>`.

### Auth
- Supabase Auth with Google OAuth + email/password
- Frontend and extension store JWT in `localStorage` / `chrome.storage.local`
- Backend verifies JWT in `Authorization: Bearer <token>` header via `middleware/auth.js`