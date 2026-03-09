# Life in Dots — Backend

Node.js + Express API server backed by Supabase (Auth + PostgreSQL).

## Tech Stack

- **Node.js 22** + **Express 5**
- **Supabase** — Auth (email/password) and PostgreSQL with Row Level Security
- **Zod** — request validation
- **Supabase CLI** — database migrations and local development

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Create a Supabase project

Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in your `.env` with values from the Supabase dashboard:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Project Settings > API > Project URL |
| `SUPABASE_ANON_KEY` | Project Settings > API > Project API keys > `anon` / `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings > API > Project API keys > `service_role` (keep secret) |
| `PORT` | Express port, defaults to `4000` |
| `FRONTEND_URL` | CORS origin, defaults to `http://localhost:5173` |

### 4. Install Supabase CLI

```bash
npm install -g supabase
# or
brew install supabase/tap/supabase
```

### 5. Apply database migrations

Link your project and push migrations to the remote database:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### 6. Start the server

```bash
npm run dev
```

The API is available at `http://localhost:4000/api`.

## Local Development with Supabase CLI

You can run a full local Supabase stack (no cloud project needed):

```bash
supabase start          # starts Postgres, Auth, etc. via Docker
npm run dev             # starts Express
```

`supabase start` prints local URLs and keys — use those in your `.env` for local dev.

## API Reference

### Health Check

```
GET /api/health
```

Returns `{ "success": true, "data": { "status": "ok" } }`.

---

### Auth (Google OAuth)

#### Get Google Login URL

```
GET /api/auth/google
GET /api/auth/google?redirect_to=http://localhost:5173/auth/callback
```

Returns `{ success, data: { url } }`. Redirect the user to the returned URL to start the Google sign-in flow.

#### OAuth Callback

```
GET /api/auth/callback?code=<auth_code>
```

Exchanges the auth code (from the Google redirect) for a Supabase session. Returns `{ success, data: { user, session } }`.

The `session.access_token` is used in subsequent requests as `Authorization: Bearer <token>`.

#### Get Current User

```
GET /api/auth/me
Authorization: Bearer <token>
```

Returns the authenticated user's info and profile.

---

### Journal Entries

All journal routes require the `Authorization: Bearer <token>` header.

#### List Entries

```
GET /api/journal
GET /api/journal?from=2026-01-01&to=2026-03-08
```

Returns entries ordered by date descending.

#### Get Entry by Date

```
GET /api/journal/2026-03-08
```

Returns a single entry or `404`.

#### Create / Upsert Entry

```
POST /api/journal
Content-Type: application/json

{
  "entry_date": "2026-03-08",
  "content": "Today was a good day."
}
```

Creates a new entry or updates the existing one for that date. Returns `201`.

#### Update Entry

```
PUT /api/journal/2026-03-08
Content-Type: application/json

{
  "content": "Updated my thoughts for today."
}
```

Returns the updated entry or `404`.

#### Delete Entry

```
DELETE /api/journal/2026-03-08
```

Returns `204` on success or `404`.

## Project Structure

```
backend/
├── supabase/
│   ├── migrations/          SQL schema + RLS policies
│   └── seed.sql             Sample data template
├── src/
│   ├── index.js             Express app entry point
│   ├── lib/
│   │   └── supabase.js      Supabase client setup
│   ├── middleware/
│   │   ├── auth.js          JWT verification
│   │   └── errorHandler.js  Error classes + middleware
│   ├── controllers/         Request handling + validation
│   ├── services/            Business logic + DB queries
│   └── routes/              Express route definitions
├── package.json
├── .env.example
└── .gitignore
```
