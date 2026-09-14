# Supabase setup (you do this once)

Your FastAPI backend talks to **Supabase Postgres only** (not Supabase Auth).
Auth stays FastAPI + JWT. Radar **job/vendor snapshots** and run history live in Postgres; only the in-flight “running” run state is process-local.

You already created the Supabase account — complete these steps in the project.

## 1. Open your project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Open (or create) the OpportunityPedia project
3. Wait until the database shows ready

## 2. Apply the schema

### Fresh project (empty database)

1. Left sidebar → **SQL Editor** → **New query**
2. Open `supabase/schema.sql`, paste all of it → **Run**
3. From `backend/`:
   ```bash
   python -m app.db.migrate --stamp
   ```
   That records migration versions without re-running them (schema.sql already has the full shape).

### Existing project (tables already created)

From `backend/` with `DATABASE_URL` set:

```bash
python -m app.db.migrate
python -m app.db.migrate --status
```

Migrations live in `supabase/migrations/` and are tracked in `public.schema_migrations`.

Confirm in **Table Editor** that these exist:

- `users` — admin, demo, buyers (includes `workspace_id`, `seat_role`, `session_version`, `removed_at`)
- `contact_leads` — marketing contact form
- `payments` — purchases
- `password_setup_tokens` — set-password links
- `support_tickets` — buyer support (ready for later)
- `opportunity_details` — SAM notice facts from radar scans
- `company_hiring_signals` — commercial company rollups
- `outreach_messages` / `opportunity_activities` — outreach + activity
- `radar_runs` — scan history
- `radar_jobs` / `radar_vendors` — live Radar snapshots (survive API restart)
- `schema_migrations` — applied migration versions

Older one-off files (`opportunity_details.sql`, etc.) are superseded by `schema.sql` + migrations; you only need them if you are repairing a very old database.

RLS is on with **no public policies**, so the browser/anon key cannot read these tables. Only the backend connection string can.

## 3. Copy the Postgres connection string

**Project Settings → Database → Connection string → URI**

Prefer:

- **Session pooler** for Railway / always-on API, or
- **Direct** `db.[ref].supabase.co` for local scripts

Example:

```text
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-….pooler.supabase.com:5432/postgres
```

If the password has `@`, `#`, etc., URL-encode them (`@` → `%40`).

## 4. Put secrets in env (never in the frontend)

### Local — `backend/.env`

```env
DATABASE_URL=postgresql://postgres:...@....supabase.co:5432/postgres

ADMIN_EMAIL=you@opportunitypedia.com
ADMIN_PASSWORD=choose-a-strong-password
ADMIN_NAME=Platform Admin

DEMO_EMAIL=demo@opportunitypedia.com
DEMO_PASSWORD=DemoOpportunity2026!
DEMO_NAME=Demo User
DEMO_COMPANY=OpportunityPedia Demo

JWT_SECRET=change-me-to-a-long-random-string
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173,https://opportunitypedia.com,https://www.opportunitypedia.com
OP_PUBLIC_USER_ID=0
```

Copy from `backend/.env.example` if helpful.

### Railway (production API)

Add the **same** variables (at least `DATABASE_URL`, `ADMIN_*`, `DEMO_*`, `JWT_SECRET`, `CORS_ORIGINS`).

Do **not** put `DATABASE_URL` or DB password in Vercel / the frontend.

## 5. Install deps + seed admin & demo

From `backend/` (use the project venv if you have one):

```bash
pip install -r requirements.txt
python seed_accounts.py
```

This upserts:

| Account | Role | Where to sign in |
|---|---|---|
| `ADMIN_EMAIL` | `platform_admin` | `/admin/login` |
| `DEMO_EMAIL` | `customer` + `is_demo` | `/login` → `/app` |

In Supabase **Table Editor → users** you should see both rows.

## 6. Restart the API

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Then check:

1. Site **Contact** form → new row in `contact_leads`
2. `/admin/login` → **Leads** + **Users**
3. `/login` with demo email/password → product

## What each table is for

| Table | Purpose |
|---|---|
| `users` | Platform admin + paying/demo customers |
| `contact_leads` | “Talk to us” marketing inquiries (not accounts) |
| `payments` | Razorpay orders / paid status |
| `password_setup_tokens` | One-time set-password links after purchase |
| `support_tickets` | In-product support (schema ready; UI later) |
| `opportunity_details` | Government notice facts (survive restart) |
| `company_hiring_signals` | Commercial company totals + facets (no job openings) |
| `outreach_messages` / `opportunity_activities` | Sent outreach + activity feed |

Radar **job openings** stay in memory only. Commercial **company rollups** and government **notice details** are persisted.

## Security reminders

- Use **Postgres only** from FastAPI — do not turn on Supabase Auth for this app.
- Never expose the `service_role` key or `DATABASE_URL` in the browser.
- Rotate `JWT_SECRET` and admin password before public launch.
