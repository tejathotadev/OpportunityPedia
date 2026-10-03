# OpportunityPedia — Complete Project Guide

> A detailed explanation of the whole project in **simple English**.
> Read this file from top to bottom if you are new to the project.

---

## 1. What Is This Project?

This repository holds two parts. **OpportunityX** is the company (legal entity: OpportunityX
Private Limited), and **OpportunityPedia** is its product.

1. **Marketing website** (public) — the OpportunityX company website: Home, Products, OpportunityPedia product page, Company, Careers, Contact, Privacy, Terms.
   It explains the company and its products, and collects contact messages.

2. **OpportunityPedia app** (private, login required) — the web application for the OpportunityPedia product.
   It is an **opportunity intelligence dashboard**:
   - It scans many job boards + US government contracts (SAM.gov).
   - It shows staffing jobs, government tenders, and contract awards.
   - It groups jobs by company, shows how "hot" a company is hiring.
   - Teams can assign leads, send outreach emails (including **AI draft**), track activity, and get notifications.
   - Platform admins can add **curated opportunities** and choose which customer workspaces see them (after Radar runs).

Think of it like: **Radar collects raw jobs → Backend cleans and stores them → Frontend shows them nicely.** Admin-curated signals join the same Opportunities UI after a successful scan.

Live parts:

- Frontend is built with **React + Vite + TypeScript** and hosted on **Vercel**.
- Backend is built with **FastAPI (Python)** and hosted on **Render / Railway**.
- Database is **PostgreSQL on Supabase**. The backend is the only one that talks to the database.

---

## 2. Overall Project Structure

Root folder: `OpportunityPedia/`

```text
OpportunityPedia/
├── README.md                  <- this file
├── render.yaml                <- Render hosting settings for backend
├── backend/                   <- Python FastAPI backend
│   ├── app/
│   │   ├── main.py            <- app start, middleware, /health
│   │   ├── api/
│   │   │   ├── routes.py      <- list of all URL paths
│   │   │   ├── router.py      <- connects paths to controllers
│   │   │   └── deps.py        <- auth helpers (who is logged in?)
│   │   ├── controllers/       <- checks input, calls services
│   │   ├── services/          <- main business logic
│   │   ├── repositories/      <- only place that talks to database (raw SQL)
│   │   ├── db/
│   │   │   ├── connection.py  <- Postgres connection pool
│   │   │   ├── schema.py      <- table name constants
│   │   │   └── migrate.py     <- runs SQL migration files
│   │   ├── core/
│   │   │   ├── config.py      <- reads all environment variables
│   │   │   ├── security.py    <- password hash + JWT token
│   │   │   ├── provisioning.py<- plans, seat limits, user status
│   │   │   ├── rate_limit.py  <- stops spam / abuse
│   │   │   ├── ttl_cache.py   <- caches GET responses for 8 seconds
│   │   │   ├── request_cache.py <- caches data inside one request
│   │   │   ├── request_logging.py <- logs + request ID
│   │   │   └── timeouts.py    <- timeout constants
│   │   ├── providers/
│   │   │   ├── sources/sources.py      <- list of 116 job sources
│   │   │   └── collectors/collectors.py<- code that fetches each source
│   │   ├── radar/
│   │   │   └── heat.py        <- VERY_HOT / HOT scoring logic
│   │   └── data/
│   │       └── naics_sector_56.py <- NAICS codes helper data
│   ├── bootstrap.py / seed_accounts.py / seed_admin.py
│   ├── requirements.txt       <- Python packages
│   ├── Dockerfile             <- how to build backend container
│   ├── .env / .env.example    <- secret settings (never commit .env)
├── frontend/                  <- React + Vite frontend
│   ├── src/
│   │   ├── main.tsx / App.tsx <- app entry
│   │   ├── routes/router.tsx  <- all page URLs
│   │   ├── marketing/         <- public OpportunityX website pages + components
│   │   └── app/               <- private OpportunityPedia app
│   │       ├── pages/         <- Login, Overview, Opportunities, Vendors, etc.
│   │       ├── services/      <- api.ts + one file per feature (auth, radar...)
│   │       ├── store/         <- Zustand login session + toast + UI
│   │       ├── components/    <- AppShell, Sidebar, Topbar, AppFooter, tables, drawers, dialogs
│   │       ├── features/      <- dashboard, opportunities, radar, outreach...
│   │       └── utils/, hooks/, providers/, config/
│   ├── vite.config.ts         <- dev server + /api proxy
│   ├── vercel.json            <- Vercel build + /api rewrite to backend
│   ├── package.json
│   └── index.html
└── supabase/                  <- database SQL
    ├── schema.sql             <- full fresh database design (canonical)
    ├── migrations/            <- small step-by-step changes (5 files)
    ├── SETUP.md               <- database setup notes
    └── *.sql                  <- old one-time helper scripts
```

**Simple rule:**

- `frontend/` never talks to the database directly.
- `backend/app/repositories/` is the only place with SQL.
- `backend/app/services/` has the rules.
- `backend/app/controllers/` only checks input and calls services.
- `supabase/` has the shape of the database.

---

## 3. FastAPI Backend Architecture

### 3.1 How the app starts — `backend/app/main.py`

1. `app = FastAPI(title="Radar", version="0.1.0", lifespan=lifespan)`.
2. On start (`lifespan`):
   - Sets up logging (`configure_logging`).
   - Opens Postgres connection pool (`init_pool`).
3. On stop: closes pool (`close_pool`).
4. Adds one router: `app.include_router(api_router)`. All API URLs start with `/api/v1`.
5. Has a simple check URL: `GET /health` returns `{status: "ok", pool, responseCache, ...}`.
   Render uses this to know if backend is alive.
6. If `frontend/dist` exists (after `npm run build`), backend also serves the built website at `/`.
   In production Vercel serves frontend, so this is mostly for local testing.
7. Every request gets its own small memory bag (`attach_request_cache` middleware).
   This avoids loading the same opportunities twice inside one request.

### 3.2 Middleware order (what happens before your code runs)

FastAPI runs middleware in reverse order of adding. The effective order is:

1. `RequestLoggingMiddleware` — gives each request an ID (`X-Request-Id`), skips `/health`, warns on 500 errors.
2. `RateLimitMiddleware` — in-memory sliding window, no Redis needed:
   - Skips `/health`, `/docs`, non-`/api/` URLs, and `/radar/run`.
   - Login URLs → auth bucket (default 20/minute).
   - Contact, signup, payments, set-password → public bucket (default 30/minute).
   - Everything else → api bucket (default 180/minute).
   - Returns `429 + Retry-After` if too many requests.
   - Identity = IP (`X-Forwarded-For` or client IP) + short hash of token.
3. `ResponseCacheMiddleware` — caches only safe GETs for 8 seconds:
   - Only `/api/v1/dashboard/*`, `/api/v1/radar/status`, `/notifications`, `/team/ownership`, `/assignments/me`.
   - Key = hash(token) + path + query. Only caches `200 OK`. Adds `X-Cache: HIT/MISS`.
   - Any `POST/PUT/PATCH/DELETE` to `/api/*` clears the cache.
4. `CORSMiddleware` — which websites can call the backend:
   - Allowed list comes from `CORS_ORIGINS`.
   - Also allows `http://localhost:*` and `http://127.0.0.1:*` for local dev.
   - `allow_credentials=False`, all methods and headers allowed.

Plus normal FastAPI features: auto docs at `/docs` and `/openapi.json`.

### 3.3 Layered design (request flow)

```text
Browser
  → routes.py (what URL?)
  → router.py (which controller function?)
  → controllers/*.py (check input with Pydantic, get current user)
  → services/*.py (business rules)
  → repositories/*.py (raw SQL with psycopg)
  → PostgreSQL (Supabase)
```

There is **no SQLAlchemy and no Supabase JS client**. It uses raw SQL with `psycopg` + `psycopg_pool`.

Folders:

- `controllers/` — includes `auth`, `admin`, `access`, `contact`, `op`, `radar`, `razorpay`, `workspace`, `curated`, `ai_outreach`.
- `services/` — includes `op_service`, `radar_service`, `curated_opportunity_service`, `gemini_service`, auth/access/email, etc.
- `repositories/` — one per table group (incl. `curated_opportunity_repository`). Many do `CREATE TABLE IF NOT EXISTS` to self-heal.
- `core/` — config, security, rate limit, cache, logging, timeouts, provisioning.
- `providers/` + `radar/` — external fetching + scoring (see section 7).

---

## 4. PostgreSQL Database Structure and Access Layer

### 4.1 Connection — `app/db/connection.py`

- Uses `psycopg` with `psycopg_pool.ConnectionPool`.
- `row_factory=dict_row` so every row comes back as a Python dict.
- Default `autocommit=True` for single statements.
- Two helpers:
  - `connect_database()` — `with pool.connection() as conn: yield conn` for simple queries.
  - `transaction()` — sets `autocommit=False`, then `commit` or `rollback`. Used for multi-step writes (assign + activity log, replace jobs + vendors, set-password + consume token).
- `init_pool()`, `close_pool()`, `pool_stats()` for health checks.
- `_ensure_pool()` lazily opens pool for scripts that skip FastAPI lifespan (like seed scripts).
- Migrations tracked in `public.schema_migrations(version, applied_at)`.

CLI:

```bash
python -m app.db.migrate          # apply pending files in supabase/migrations/
python -m app.db.migrate --status # show applied vs PENDING
python -m app.db.migrate --stamp  # mark all as done without running (fresh DB after schema.sql)
```

### 4.2 All tables (simple explanation)

All tables have **Row Level Security (RLS) enabled with zero public policies**.
That means the anon key cannot read anything. Only the backend connection string can read/write.

| Table | What it stores (simple words) |
|---|---|
| `users` | Every person. `role` = `platform_admin` or `customer`. `status` = `pending`, `pending_password`, `provisioning`, `active`, `paid` (old), `removed`. `plan` = `free` or `paid`. `workspace_id` points to owner (owner points to self). `seat_role` = `owner` or `member`. `session_version` for single-device login. `gov_api_key` = personal SAM.gov key. `is_demo` = demo account flag. |
| `contact_leads` | Messages from Contact form. `status` = `new`, `in_progress`, `contacted`, `closed`. Reference like `OP-000123`. |
| `payments` | Razorpay payments. `status` = `pending`, `paid`, `failed`, `refunded`. Stores `provider_order_id`, `provider_payment_id`. |
| `password_setup_tokens` | One-time set-password links. Stores `token_hash` (sha256), `expires_at` (24h), `used_at`. |
| `support_tickets` | Support requests. `status` = `open`, `in_progress`, `resolved`, `closed`. |
| `opportunity_details` | Extra SAM.gov facts per user + notice. `UNIQUE(user_id, notice_id)`. `detail` is JSON (agency, office, contacts, attachments). Survives radar refresh. |
| `company_hiring_signals` | Company rollup, no job list. `total_openings`, `very_hot`, `hot`, `highest_temperature`, `team_breakdown/facets/atoms` JSON. `UNIQUE(user_id, company_id)`. |
| `outreach_messages` | Emails sent to a company about an opportunity. Stores sender, recipient, subject, body, `matched_count`, filters. |
| `opportunity_activities` | Timeline feed: assigned, outreach sent, notes, etc. |
| `opportunity_assignments` | Who owns which lead. `UNIQUE(user_id, opportunity_id)` (one owner per workspace). |
| `naics_codes` | Master list of industry codes. `code` PK, title, sector/group. |
| `user_naics_codes` | Which NAICS codes each user follows. PK `(user_id, naics_code)`. |
| `radar_runs` | History of each radar scan. `status`, `boards_run`, `jobs_found`, `new_count`, `notes`, `new_items` JSON (first 50 new jobs). |
| `radar_jobs` | Latest snapshot of jobs (tenders). Wiped + re-inserted every run per user. |
| `radar_vendors` | Latest snapshot of vendors (contract winners). Same wipe + insert. |
| `companies` | Shared catalog of companies, classified once (only in migration `04`). `company_type` = `product/service/mixed/unknown`, `tier` = `mnc/tier1/tier2/startup/unknown`. |
| `app_notifications` | Inbox rows. `type` = `very_hot/assignment/deadline/team/system`. `read_at` null = unread. (only in migration `05`). |
| `curated_opportunities` | Admin-entered opportunities (commercial or government). Dynamic fields by type (C2C, vendor requirement, partnership, tender, etc.). `status` = `active` \| `archived`. Migrations `06`+. |
| `curated_opportunity_visibility` | Which customer **workspaces** may see a curated row. `released_at` null = queued; set after that workspace’s **successful Radar run** (migration `07`). |
| `schema_migrations` | Which migration files already ran. |

Key relationships:

- One workspace owner (`users.id`) → many members (`users.workspace_id`), payments, tokens, tickets, details, signals, outreach, activities, assignments, radar rows, notifications.
- `user_naics_codes.naics_code → naics_codes.code`.
- `companies` stands alone (shared cache).
- `curated_opportunity_visibility.opportunity_id → curated_opportunities.id`; `workspace_id → users.id` (owner).

### 4.3 Repository files

- `user_repository.py` — find by email/id, insert admin/customer/invited/member, seat count, gov key, activate/remove/restore/purge.
- `radar_repository.py` — in-memory `_runs` dict for live `running` state + Postgres for history. `replace_user_jobs_and_vendors()` does DELETE + INSERT in one transaction. `query_jobs_page()` does SQL filter/sort/page.
- `radar_history_repository.py` — durable `radar_runs` insert/complete/list.
- `curated_opportunity_repository.py` — admin curated CRUD + visibility + `release_pending_for_workspace()`.
- `opportunity_detail_repository.py`, `company_hiring_repository.py`, `company_catalog_repository.py`, `assignment_repository.py`, `outreach_repository.py`, `notification_repository.py`, `payment_repository.py`, `token_repository.py`, `lead_repository.py`, `naics_repository.py` — each handles its own tables.

---

## 5. Authentication and Authorization

### 5.1 Passwords and tokens — `app/core/security.py`

- Passwords: `bcrypt.hashpw` + `gensalt`, checked with `checkpw`. Never stored in plain text.
- Login token: JWT (`PyJWT`, HS256):
  - Payload: `{sub: user_id, email, role, sv: session_version, exp: now + JWT_EXPIRE_MINUTES}`.
  - `JWT_EXPIRE_MINUTES` default `720` = 12 hours.
  - Secret from `JWT_SECRET`.
- Single device rule: every login does `bump_session_version` (+1). Old tokens have old `sv` and get `401 "Signed in elsewhere. Sign in again to continue."` Frontend then logs that session out.

### 5.2 Two kinds of users

1. **Platform admin** (`role=platform_admin`):
   - Login: `POST /api/v1/admin/login`.
   - Me: `GET /api/v1/admin/me`.
   - Guard: `require_admin` in `app/api/deps.py`.
   - Can list/create/activate/change-plan/remove/restore users, manage NAICS, see payments/leads, see any user's radar runs.

2. **Customer** (`role=customer`):
   - Signup free: `POST /api/v1/plans/free/signup` → creates user with `status=pending_password` + sends set-password email.
   - Paid request: `POST /api/v1/access-requests` → creates user + pending payment.
   - Set password: `POST /api/v1/auth/set-password?token=...` (token valid 24h, 8+ char password).
   - Login: `POST /api/v1/auth/login`.
   - Me / update: `GET /api/v1/auth/me`, `PATCH /api/v1/auth/me`.
   - Provisioning poll: `GET /api/v1/auth/provisioning-status?email=`.
   - Guard: `require_customer`.
   - Only `active` (or old `paid`) users can log in. `removed`, `provisioning`, `pending_password`, `pending` get clear 403 messages.

### 5.3 Workspaces (teams)

- Defined in `app/core/provisioning.py`:
  - Plans: `free`, `paid`. `PLAN_SEAT_LIMITS = {free: 2, paid: 5}`.
  - Free plan is a **2-day trial** (`TRIAL_DAYS=2`, `users.trial_ends_at`). After expiry, login and API access are locked until admin flips plan to `paid`.
  - Settings → **Plan** shows trial end / time left, seats, and Radar limits (`GET /workspace/plan`).
  - Demo accounts (`is_demo`) skip the trial clock.
  - Statuses: `pending_password`, `provisioning`, `active`, `paid`, `removed`.
  - Seat roles: `owner`, `member`.
- Owner invites member: `POST /workspace/team/invite`. Member gets set-password email.
- All Opportunity/Radar data is scoped to `workspace_id` (owner ID).
  - `current_user_id` returns `workspace_id or id` so teammates see owner's data.
  - `current_actor_id` returns own `id` for personal inbox, assign-to-me.
- Owner-only actions: invite, remove member, reassign to others.
- Removed users are soft-deleted (`removed_at`) and auto-purged after `TRIAL_PURGE_DAYS=2` days. Members purge immediately (hard delete).

### 5.4 Frontend auth — how login is remembered

- `src/app/store/useAuthStore.ts` — Zustand + `persist` in localStorage key `op-auth`. Stores `{user: {token, profile}, admin: {token, profile}}`.
- `src/app/services/api.ts` — axios interceptor adds `Authorization: Bearer <token>` to every request (unless explicit header for admin).
- `RequireUserAuth.tsx` → if no `user.token`, go to `/login`. `RequireAdminAuth.tsx` → if no `admin.token`, go to `/admin/login`.
- `CurrentUserProvider.tsx` — sets token provider, loads team, builds permissions (`can.reassign` only for owner).
- On `401 "Signed in elsewhere"` — frontend clears that session and redirects to login. This enforces one active device.

---

## 6. API Routes and How Frontend Communicates With Backend

### 6.1 Base URL logic — `frontend/src/app/services/api.ts`

- Only library: `axios`. No `fetch`, no Supabase JS.
- `API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'`.
  - Local dev: Vite proxy in `vite.config.ts` forwards `/api → http://127.0.0.1:8000`, so same-origin works and CORS is avoided.
  - Production: FastAPI can serve `frontend/dist` same-origin, OR Vercel `vercel.json` rewrites `/api/:path* → https://opportunitypedia-production.up.railway.app/api/:path*`.
  - `VITE_API_BASE_URL` is the **only** frontend env var. It overrides both.
- Timeout: normal `API_TIMEOUT_MS=60_000` (60s), radar `RADAR_TIMEOUT_MS=120_000` (120s).
- Error mapping: 401 = session expired, 403 = no access, 409 = email exists, 429 = too many, 502 = email SMTP failed, 503 = email not configured, 501 = not available yet.
- Data fetching: `@tanstack/react-query` with `staleTime 30s`, no refetch on focus, retry once. Central keys in `queryKeys.ts`.

### 6.2 Full route table (prefix `/api/v1`)

**Health (no prefix):**

| Method | Path | What it does |
|---|---|---|
| GET | `/health` | Alive check + pool/cache stats |

**Admin auth + users:**

| Method | Path | What it does |
|---|---|---|
| POST | `/api/v1/admin/login` | Admin login → JWT |
| GET | `/api/v1/admin/me` | Current admin profile |
| GET | `/api/v1/admin/users` | List customers (auto-purges expired) |
| POST | `/api/v1/admin/users` | Invite customer + setup email |
| POST | `/api/v1/admin/users/{id}/activate` | Set API key + NAICS + active |
| PATCH | `/api/v1/admin/users/{id}/plan` | Switch free ↔ paid |
| POST | `/api/v1/admin/users/{id}/remove` | Soft-remove + clear radar data |
| POST | `/api/v1/admin/users/{id}/restore` | Undo remove |
| GET | `/api/v1/admin/naics/catalog` | Full NAICS tree |
| GET | `/api/v1/admin/users/{id}/naics` | User's NAICS coverage |
| PUT | `/api/v1/admin/users/{id}/naics` | Replace user's NAICS |
| GET | `/api/v1/admin/users/{id}/radar-runs` | User's run history |
| GET | `/api/v1/admin/payments` | All payments |
| GET | `/api/v1/admin/leads` | All contact leads |
| PATCH | `/api/v1/admin/leads/{id}` | Update lead status + notes |
| GET | `/api/v1/admin/curated-opportunities` | List admin-curated opportunities |
| POST | `/api/v1/admin/curated-opportunities` | Create curated opportunity + workspace visibility |
| GET | `/api/v1/admin/curated-opportunities/{id}` | Curated detail |
| PATCH | `/api/v1/admin/curated-opportunities/{id}` | Edit curated opportunity |
| PUT | `/api/v1/admin/curated-opportunities/{id}/visibility` | Replace visible workspace list |
| POST | `/api/v1/admin/curated-opportunities/{id}/archive` | Soft-archive (users stop seeing it) |
| POST | `/api/v1/admin/gemini/test` | Test platform `GEMINI_API_KEY` (AI outreach drafts) |

**Public (no login):**

| Method | Path | What it does |
|---|---|---|
| POST | `/api/v1/contact` | Contact form → lead `OP-000123` |
| POST | `/api/v1/access-requests` | Paid access request + pending payment |
| POST | `/api/v1/plans/free/signup` | Free signup + setup email |
| POST | `/api/v1/payments/razorpay/order` | Create Razorpay order |
| POST | `/api/v1/payments/razorpay/verify` | Verify payment → paid → setup email |

**Customer auth:**

| Method | Path | What it does |
|---|---|---|
| POST | `/api/v1/auth/login` | Customer login → JWT |
| GET | `/api/v1/auth/me` | Current customer profile |
| PATCH | `/api/v1/auth/me` | Update name/phone |
| POST | `/api/v1/auth/set-password` | Use token to set password |
| POST | `/api/v1/auth/resend-setup` | Re-send setup link |
| GET | `/api/v1/auth/provisioning-status?email=` | Poll if account is ready |

**Workspace / team:**

| Method | Path | What it does |
|---|---|---|
| GET | `/api/v1/workspace/team` | List seats + limits |
| GET | `/api/v1/workspace/plan` | Plan, 2-day trial clock, Radar/seat limits (Settings) |
| POST | `/api/v1/workspace/team/invite` | Owner invites teammate |
| DELETE | `/api/v1/workspace/team/{id}` | Owner removes teammate |

**Opportunities + vendors + dashboard:**

| Method | Path | What it does |
|---|---|---|
| GET | `/api/v1/radar/results` | Old lanes payload (legacy) |
| GET | `/api/v1/opportunities?...` | Filtered, paginated opportunities (radar + **released** curated government merged when present) |
| GET | `/api/v1/opportunities/shared?category=` | Admin-curated rows visible to this workspace (`commercial` / `government`; only `released_at` set) |
| GET | `/api/v1/opportunities/companies` | Company rollup list |
| GET | `/api/v1/opportunities/companies/{id}/hiring-signal` | Facets + matched count |
| GET | `/api/v1/opportunities/{id}` | Detail + suggested vendors |
| GET | `/api/v1/opportunities/{id}/open` | 307 redirect to real SAM.gov URL (hides collector domain) |
| GET | `/api/v1/opportunities/{id}/activity` | Activity feed |
| GET | `/api/v1/opportunities/{id}/outreach` | Outreach history |
| GET | `/api/v1/opportunities/{id}/assignments` | Current assignment |
| POST | `/api/v1/opportunities/{id}/assign` | Assign to self or teammate |
| DELETE | `/api/v1/opportunities/{id}/assign` | Unassign |
| POST | `/api/v1/opportunities/{id}/saved` | 501 — not built yet |
| POST | `/api/v1/opportunities/{id}/notes` | 501 — not built yet |
| POST | `/api/v1/opportunities/{id}/follow-up` | Handled as outreach follow-up |
| GET | `/api/v1/vendors` | Agency rollup |
| GET | `/api/v1/vendors/{id}` | Single agency |
| GET | `/api/v1/dashboard/metrics` | Counts: vendors, opps, openings, veryHot, hot, mine |
| GET | `/api/v1/dashboard/overview` | Metrics + pipeline + attention + deadlines in one call |
| GET | `/api/v1/dashboard/pipeline` | Assigned / needs outreach / contacted / follow-up |
| GET | `/api/v1/dashboard/needs-attention` | Closing → surging → undated → steady |
| GET | `/api/v1/dashboard/deadlines` | Future deadlines sorted |
| GET | `/api/v1/activity` | Team activity |
| GET | `/api/v1/assignments/me` | My leads |
| GET | `/api/v1/team/ownership` | Stub `{items: []}` |
| GET | `/api/v1/notifications` | Inbox |
| POST | `/api/v1/notifications/{id}/read` | Mark one read |
| POST | `/api/v1/notifications/read-all` | Mark all read |
| GET | `/api/v1/saved-views` | Stub `{items: []}` |
| POST | `/api/v1/saved-views` | 501 |
| DELETE | `/api/v1/saved-views/{id}` | 501 |
| GET | `/api/v1/search?q=` | Global search |
| POST | `/api/v1/outreach` | Validate → send email → save → activity log |
| POST | `/api/v1/outreach/ai-draft` | Gemini drafts professional subject + body (never sends; edit then POST `/outreach`) |

**Radar:**

| Method | Path | What it does |
|---|---|---|
| GET | `/api/v1/radar/status` | Can I run? + last run + cooldown |
| GET | `/api/v1/radar/runs` | History, newest first |
| POST | `/api/v1/radar/run` | Start a run in background → `202 {accepted, cooldown}` |

### 6.3 Frontend pages — `src/routes/router.tsx`

Public (under `SiteLayout`): `/` Home, `/products`, `/products/opportunitypedia`, `/company`, `/careers`, `/contact`, `/privacy`, `/terms`, `/about → /company`, `/products/opportunityx → /products/opportunitypedia`. One public header and footer for all of them — see [`ARCHITECTURE.md` §3.5](ARCHITECTURE.md#35-public-website).

Auth: `/login`, `/set-password?token=`, `/workspace-setup?email=`, `/get-started` (free signup), `/admin/login`.

Private `/app` (inside `AppProviders` + `RequireUserAuth` + `AppShell`):
`/app/overview`, `/app/opportunities` (+ `:id` drawer), `/app/vendors` (+ `:id` drawer for curated/shared), `/app/my-assignments`, `/app/activity`, `/app/settings`.

**App chrome (`AppShell`):** static sidebar + static topbar + scrollable main + static footer.
Footer text (centered): `Copyright © 2026 | OpportunityX | All Rights Reserved`.
Sidebar collapse is a circular chevron on the sidebar/header seam (not a bottom control).
Account (profile settings, Help & Support, sign out) lives in the sidebar profile menu only — not in the topbar.
Help & Support is not a separate sidebar nav item.

**Login (`/login`):** password field has show/hide (eye) control; no “Need access?” header link.

**Overview:** primary action button label is **Run** (play icon), not “Run Radar”.
Category scope tabs: **All / Government / Commercial** (Vendors Soon tab removed).

**Opportunities:** Industry Soon filter removed. Tables use single-line headers, balanced column widths, and truncated cell text with hover tooltip only when ellipsis is active (`TruncatedText`). Long type badges truncate so they do not overlap Detected. Radar-discovered commercial/government rows only — admin handpicked signals live on **Vendors**.

**Vendors:** Lists admin-curated opportunities shared with the workspace (`GET /opportunities/shared`), unlocked after a successful Radar run. Category filter: All / Commercial / Government. Overview **Very Hot** and **Total Opportunities** include released Vendors rows; clicking Very Hot asks Government vs Vendors.

Admin `/admin` (inside `AdminApp`): `/admin/leads`, `/admin/opportunities`, `/admin/users`.

---

## 7. Radar / Opportunity Processing Flow

This is the heart of the product. Simple idea: **fetch jobs from many places, score them, save snapshot, show in UI.**

Admin can also add **curated** opportunities (LinkedIn / manual signals). Those are **not** stored in `radar_jobs` (radar wipes that table). They live in `curated_opportunities` and only appear for a workspace after a **successful Radar run** releases them.
### 7.1 Sources — `app/providers/sources/sources.py`

- 72 Greenhouse boards + 11 Lever + 33 Ashby + `sam-gov` = **116 sources**, all `enabled: True`.
- Greenhouse = startup jobs, Lever = startup jobs, Ashby = startup jobs, SAM.gov = US federal contracts.
- `enabled_sources()` filters by `COLLECTORS[key].enabled`.

### 7.2 Collectors — `app/providers/collectors/collectors.py`

- `fetch_greenhouse`: `GET boards-api.greenhouse.io/v1/boards/{token}/jobs?content=false`, cap `RADAR_MAX_JOBS_PER_BOARD`.
- `fetch_lever`: `GET api.lever.co/v0/postings/{token}?mode=json`.
- `fetch_ashby`: `GET api.ashbyhq.com/posting-api/job-board/{token}`, skip `isListed=False`.
- `fetch_sam_gov` (most important):
  - Key = user's `gov_api_key` or global `SAM_GOV_API_KEY`.
  - Date range = `postedFrom = today - SAM_LOOKBACK_DAYS` (max 364 days) to today.
  - For each NAICS code in `SAM_NAICS_QUERY` (default `561311,561312,561320,561330`):
    - `GET api.sam.gov/opportunities/v2/search?api_key&postedFrom&postedTo&limit=1000&offset&ncode={code}&active=Yes`.
    - Page with `offset` until `SAM_MAX_ROWS_PER_CODE` (default 2000).
    - Handles 401/403/429 (quota). Non-federal keys allow **10 requests/day** — that is why cooldowns exist.
  - Dedup by `noticeId`.
  - Drop codes not in `SAM_NAICS_CODES` allow-list.
  - Drop expired if `SAM_EXCLUDE_EXPIRED=true` (checks `responseDeadLine` / `archiveDate`).
  - If award with winner → `record_kind=vendor` (extract awardee, optional entity lookup if `SAM_ENTITY_LOOKUPS>0`).
  - Else → `record_kind=tender`, `department="SAM / {noticeType} / NAICS {code}"`, `heat=VERY_HOT`.

### 7.3 Heat scoring — `app/radar/heat.py`

- `VERY_HOT` vs `HOT`. Signals: `JOB_OPENING`, `GOVERNMENT_TENDER`, `STAFFING`, `CONTRACT_AWARD`, etc.
- Rule: ATS jobs → `HOT` + `JOB_OPENING`. SAM.gov → `VERY_HOT` + `GOV_STAFFING`.
- NAICS categories: `561311` Employment Placement, `561312` Executive Search, `561320` Temporary Help, `561330` PEO.
- `match_vendors_to_tenders`: score +3 agency match, +3 NAICS, +2 category, +1 staffing keyword, top 8 shown as `suggestedVendors`.

### 7.4 Run lifecycle — `app/services/radar_service.py` + `radar_controller.py`

```text
User clicks "Run"
  → POST /api/v1/radar/run
  → start_radar_run(): check cooldown + daily cap, create running row, return 202 instantly (button locks)
  → Background task execute_radar_run():
      _fetch_and_store():
        1. Resolve NAICS codes for user
        2. Get gov API key
        3. httpx.Client(timeout=max(RADAR_HTTP_TIMEOUT,90))
        4. Loop all sources, fetch, classify, split vendor vs tender
        5. Detect new: fetched_ids - previous_ids, keep first 50 in new_items
        6. update_run(ok or failed, boards_run, jobs_found, new_count, notes)
        7. replace_user_jobs_and_vendors() in ONE transaction (wipe + insert)
        8. upsert SAM details into opportunity_details (survives refresh)
        9. persist_company_hiring_signals() → company rollups
       10. fan_out notifications (summary + up to 15 item rows + overflow)
       11. if run status == ok → release pending curated_opportunity_visibility for this workspace
  → Frontend polls GET /radar/status until running=false, shows toast
```

- `radar_status()`:
  - `running` = `status==running and now-last<15min`. Older running rows are treated as stale.
  - Else check daily cap `RADAR_RUNS_PER_DAY` (0 = no cap). If exceeded, `nextRunAt = midnight + 1 day`.
  - Else check cooldown `RADAR_RUN_COOLDOWN_MINUTES` (or `HOURS*60`). If too soon, `nextRunAt = last + cooldown` + human message like "in 5 hours".
  - Returns `{canRun, reason, running, lastRunAt, lastRunStatus, jobsFound, newCount, runsToday, runsPerDay, cooldownMinutes, nextRunAt}`.
- `GET /radar/runs` = durable history from `radar_runs` table, newest first.
- `render.yaml` sets `RADAR_RUN_COOLDOWN_MINUTES=2`, `RADAR_RUNS_PER_DAY=0` for demo (fast re-run). Default code is 6 hours + 2/day because SAM.gov quota is tiny.

### 7.5 Curated opportunities (admin-shared signals)

Separate from radar snapshots so they survive wipe/replace:

```text
Platform admin → /admin/opportunities → + Add Opportunity
  → Category Commercial | Government → dynamic fields by type
  → Visible to: multi-select customer workspaces (owners)
  → Create → rows in curated_opportunities + visibility (released_at = null)

Customer runs Radar successfully
  → release_pending_for_workspace(workspace_id)
  → released_at = now()

Customer Opportunities UI
  → Commercial: company hiring rollups from Radar
  → Government: radar tenders / procurement notices
  → Badge: Shared only when viewing curated rows on Vendors

Customer Vendors UI
  → Admin-curated (handpicked) opportunities released after a successful Radar run
  → GET /opportunities/shared (optional category=commercial|government)
```

Only `platform_admin` creates/edits. Customers never create curated rows. No Source / Source URL fields in the form or Overview.

### 7.6 Read path — `app/services/op_service.py`

- `_load(user_id)` loads `radar_jobs` + `radar_vendors`, filters to live collectors, overlays `opportunity_details`, cached per-request.
- `map_opportunity()` converts DB row → UI object:
  - `signal_type → type`: `rfp`, `procurement`, `hiring`, `funding`, `expansion`, `partnership`.
  - `heat → temperature`: `very_hot`, `hot`.
  - Hides raw `provider/url`, builds `viewUrl` via `/open` redirect.
  - Adds SAM facts, contacts, attachments, assignment, outreach state.
- `list_opportunities()` tries SQL `query_jobs_page()` first; when released curated government rows exist, merges in-memory so totals stay correct. Falls back to in-memory filter/sort/paginate on SQL errors.
- `list_shared_opportunities()` returns released curated rows for the workspace (`category` optional).
- Dashboards derived from same data: metrics, pipeline, needs-attention (closing → surging → undated → steady), deadlines, surge detection (14-day recent vs prior, ≥5 recent and ≥25% growth).
- `company_classify_service` labels `companies` catalog out-of-band (Gemini if `GEMINI_API_KEY` set, else heuristic).
- `gemini_service` powers professional **AI outreach drafts** (same platform key; model default `gemini-3.5-flash-lite`).
---

## 8. Environment Variables and Configuration Management

All backend settings live in `backend/app/core/config.py` (plain `os.getenv`, no Pydantic).
It loads `backend/.env` with `python-dotenv`. Table names are validated as identifiers.

Copy `backend/.env.example` → `backend/.env` to start.

### 8.1 Full variable table

| Variable | Default | Simple meaning |
|---|---|---|
| `DATABASE_URL` | (required) | Postgres connection string from Supabase. Never put in frontend. |
| `MYSQL_HOST/PORT/USER/PASSWORD/DATABASE` | legacy | Old MySQL settings, ignored once `DATABASE_URL` is set. Kept so old `.env` does not crash. |
| `TABLE_USERS/PAYMENTS/PASSWORD_TOKENS/RADAR_RUNS/JOBS/VENDORS` | `users`, `payments`, ... | Table names. Rarely changed. |
| `JWT_SECRET` | `change-me` | Secret to sign login tokens. Must be long random in production. |
| `JWT_EXPIRE_MINUTES` | `720` | Login lasts 12 hours. |
| `CORS_ORIGINS` | localhost list | Which websites can call backend. Add production domain here. |
| `ADMIN_EMAIL/PASSWORD/NAME` | — | Seed admin login (`/admin/login`). |
| `DEMO_EMAIL/PASSWORD/NAME/COMPANY` | demo defaults | Seed demo customer (`/login → /app`). |
| `SAM_GOV_API_KEY` | empty | Global SAM.gov key. Users can also have personal `gov_api_key`. 10 requests/day for non-federal keys. |
| `SAM_LOOKBACK_DAYS` | `365` | How far back to search (capped ~364). |
| `SAM_NAICS_CODES` | `561311,561312,561320,561330` | Keep only these codes after fetch. |
| `SAM_NAICS_QUERY` | same as above | Send these codes to SAM.gov (one request per code). SAM needs full 6-digit codes, not parent `5613`. |
| `SAM_MAX_ROWS_PER_CODE` | `2000` | Max rows per NAICS code. |
| `SAM_EXCLUDE_EXPIRED` | `true` | Hide past-deadline notices. |
| `SAM_ENTITY_LOOKUPS` | `0` | Extra entity API calls per award. Keep 0 to save quota. |
| `RADAR_HTTP_TIMEOUT_SECONDS` | `60` | HTTP timeout for collectors. |
| `RADAR_MAX_JOBS_PER_BOARD` | `50` (code), `500` (render/example) | Max jobs per ATS board. |
| `RADAR_RUN_COOLDOWN_HOURS` | `6` | Min wait between runs (hours version). |
| `RADAR_RUN_COOLDOWN_MINUTES` | `0` (overrides hours if >0) | Min wait in minutes. Render uses `2` for demo. |
| `RADAR_RUNS_PER_DAY` | `2` (0 = no limit) | Max runs per day. Render uses `0` for demo. |
| `OP_PUBLIC_USER_ID` | `0` | Local-dev only: serve reads as this user without token. `0` = disabled (require login). Render example uses `4`. |
| `ACCESS_AMOUNT_CENTS/PAISE` | `4900` | Price for paid access (49.00 INR). |
| `ACCESS_CURRENCY` | `inr` | Currency. |
| `RAZORPAY_KEY_ID/SECRET` | empty | Razorpay payment keys. |
| `APP_PUBLIC_URL` | `http://127.0.0.1:8000` | Backend public URL (used in emails/links). |
| `FRONTEND_PUBLIC_URL` | `APP_PUBLIC_URL` or `http://127.0.0.1:5173` | Where set-password links open. |
| `RESEND_API_KEY` | empty | Preferred email sender (HTTPS). Get at resend.com. |
| `EMAIL_FROM` | empty | Verified mailbox like `OpportunityPedia <hello@opportunitypedia.com>`. Invites keep this name; **outreach** overrides the display name to the customer's `company` (same mailbox + Reply-To = user). |
| `SMTP_HOST/PORT/USER/PASSWORD/FROM/USE_SSL/TIMEOUT_SECONDS` | port `465`, ssl `true`, timeout `8` | Fallback email if Resend is empty. |
| `RATE_LIMIT_ENABLED` | `true` | Turn spam protection on/off. |
| `RATE_LIMIT_AUTH/PUBLIC/API_PER_MINUTE` | `20/30/180` | Limits per minute. |
| `RESPONSE_CACHE_ENABLED/TTL_SECONDS` | `true/8` | Cache GETs for 8 seconds. |
| `REQUEST_LOG_ENABLED/LOG_LEVEL` | `true/INFO` | Logging. |
| `DB_POOL_MIN/MAX_SIZE` | `1/10` | Postgres pool size. `1` worker only (see below). |
| `USER_AGENT` | `OpportunityPediaRadar/0.1 ...` | Sent to job boards. |
| `GEMINI_API_KEY` | empty | Platform-wide Google Gemini key. Used for company classify + **AI outreach drafts**. Empty = AI draft disabled. Never put in frontend. |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Gemini model id for generateContent. |
| `VITE_API_BASE_URL` | `/api/v1` | **Only frontend var.** Overrides backend URL. |

Frontend has **no `.env` file** in the repo. Only `VITE_API_BASE_URL` is read in `src/app/services/api.ts`.

**Gotcha:** Do not define `GEMINI_API_KEY` twice in `.env`. `python-dotenv` keeps the **last** value, so an empty duplicate later in the file clears the key.
### 8.2 `render.yaml` (hosting defaults)

- One web service `opportunitypedia-backend`, `runtime: python`, `plan: free`, `rootDir: backend`.
- Build: `pip install -r requirements.txt`.
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`.
  - **One worker only** because runs + rate-limit + cache live in process memory. Two workers would not share state.
- Health check: `/health`.
- Env in file: `SAM_NAICS_CODES=561320`, `SAM_LOOKBACK_DAYS=365`, `RADAR_MAX_JOBS_PER_BOARD=500`, `RADAR_RUN_COOLDOWN_MINUTES=2`, `RADAR_RUNS_PER_DAY=0`, `OP_PUBLIC_USER_ID=4`.
- Secrets (`SAM_GOV_API_KEY`, `JWT_SECRET`, `APP_PUBLIC_URL`) are set in Render dashboard, never committed. `JWT_SECRET` uses `generateValue: true`.

### 8.3 `vercel.json` (frontend hosting)

- Build: `npm run build`, output `dist`.
- `/api/:path*` → `https://opportunitypedia-production.up.railway.app/api/:path*`.
- Everything else → `/index.html` (SPA fallback for React Router).

---

## 9. How to Run Locally (Step by Step)

### 9.1 What you need

- Python 3.12, Node 18+, a Supabase project, Git.

### 9.2 Database setup (once)

1. Open Supabase → SQL Editor.
2. Paste `supabase/schema.sql` and run it (fresh DB only, once).
3. In `backend/` run:
   ```bash
   pip install -r requirements.txt
   python -m app.db.migrate --stamp   # mark fresh DB as done
   ```
4. For existing DB later:
   ```bash
   python -m app.db.migrate          # apply new files
   python -m app.db.migrate --status # check
   ```
5. RLS is ON with no public policies — only backend `DATABASE_URL` can read. Do not enable anon access.

Connection tip from `SETUP.md`:

- Railway → use **Session pooler** URL.
- Local → use **Direct** URL.
- Never put `DATABASE_URL` in frontend or Vercel frontend env.

### 9.3 Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, FRONTEND_PUBLIC_URL
pip install -r requirements.txt
python seed_accounts.py   # creates admin + demo user
uvicorn app.main:app --reload --port 8000
# Open http://127.0.0.1:8000/docs for API docs
# Check http://127.0.0.1:8000/health
```

Seed scripts:

- `seed_accounts.py` — upserts `ADMIN_EMAIL` as `platform_admin/active` + `DEMO_EMAIL` as `customer/active/is_demo` with hashed passwords.
- `seed_admin.py` — just calls the above.

### 9.4 Frontend setup

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173, /api proxied to http://127.0.0.1:8000
npm run build  # creates dist/
npm run typecheck
npm run lint
```

No `.env` needed unless backend is elsewhere:

```bash
VITE_API_BASE_URL=https://your-backend/api/v1 npm run build
```

### 9.5 Quick test flow

1. Contact form on marketing site → check `contact_leads` table or `/admin/leads`.
2. Login admin: `/admin/login` with `ADMIN_EMAIL` → Users, Leads, **Opportunities**.
3. Optional: Admin → Opportunities → **Test Gemini** (needs `GEMINI_API_KEY` in backend `.env`, then restart API).
4. Admin → **+ Add Opportunity** → pick workspaces → Create (queued until Radar).
5. Login demo/customer: `/login` → `/app/overview`.
6. Click **Run** → watch `GET /radar/status` → curated Shared signals appear on **Vendors**.
7. Open a Vendor opportunity → Send outreach → **Generate with AI** (draft only) → edit → Send.
8. Assign a lead, check Activity + Notifications.

---

## 10. User Roles and Daily Workflow

- **Visitor** → reads marketing, submits `/contact` or `/get-started`.
- **Free customer** → signup → set password (24h link) → `provisioning` → `active` → login → Run (radar scan, limited by cooldown) → assign + outreach.
- **Paid customer** → access request → Razorpay order → verify → `paid/active` → same as above with higher seat limit (5 vs 2).
- **Team member** → owner invites via email → set password → sees owner's workspace data, can assign to self, cannot invite others.
- **Platform admin** → manages users, NAICS coverage, payments, leads, **curated opportunities** + Gemini test; can activate/remove/restore, change plans.

Outreach flow:

```text
Opportunity → EmailComposer
  → optional: Generate with AI → POST /outreach/ai-draft → fill subject/body
  → edit → POST /outreach → validate → send via Resend (or SMTP)
    (From display = customer company; mailbox = EMAIL_FROM; Reply-To = sender)
  → save outreach_messages → log opportunity_activities → notify team
```

Curated flow:

```text
Admin creates curated opp + visibility → released_at null
  → Customer successful Radar run → released_at set
  → Opportunities (Radar commercial / government) and Vendors (curated Shared)
```
---

## 11. Important Limits and Gotchas

- **SAM.gov quota:** 10 requests/day per non-federal key. One run = one request per NAICS code (default 4). That is why `RADAR_RUN_COOLDOWN_HOURS=6` + `RADAR_RUNS_PER_DAY=2` exist. Do not lower in production.
- **One worker only:** `uvicorn --workers 1`. Runs, rate-limit, and cache are in memory. More workers = broken cooldowns.
- **Stale runs:** `running` older than 15 min is treated as not running.
- **501 stubs:** saved-notes, saved-views create/delete, `team/ownership` are placeholders returning `501` or empty. Frontend handles them as "not available yet".
- **Single session:** login bumps `session_version`. Old tabs get "Signed in elsewhere".
- **Email:** Resend preferred. Without `RESEND_API_KEY` or SMTP, setup emails return `502/503` and `setup_url` is returned directly (dev fallback).
- **Gemini / AI draft:** Needs `GEMINI_API_KEY`. Admin **Test Gemini** on `/admin/opportunities` before users rely on Generate with AI. Duplicate empty `GEMINI_API_KEY=` in `.env` clears the key.
- **Curated vs radar:** Curated rows are never written to `radar_jobs`. They appear only after a successful Radar run releases visibility for that workspace.
- **Docker:** `python:3.12-slim`, healthcheck `curl /health`, same single-worker command.

---

## 12. Where to Look in Code (Quick Map)

- New API endpoint? → `backend/app/api/routes.py` + `router.py` → `controllers/` → `services/` → `repositories/`.
- Auth problem? → `core/security.py`, `services/auth_service.py`, `services/account_service.py`, `api/deps.py`.
- Radar not running? → `services/radar_service.py`, `repositories/radar_repository.py`, `providers/collectors/collectors.py`, `core/config.py` (cooldown vars).
- Empty dashboard? → `services/op_service.py` (`_load`, `map_opportunity`, rollups).
- Curated / Shared signals? → `services/curated_opportunity_service.py`, `repositories/curated_opportunity_repository.py`, `controllers/curated_controller.py`, admin page `AdminOpportunitiesPage.tsx`.
- AI email draft? → `services/gemini_service.py`, `controllers/ai_outreach_controller.py`, `EmailComposer.tsx` (Generate with AI).
- Frontend API error? → `frontend/src/app/services/api.ts` (base URL, token, error map).
- DB shape? → `supabase/schema.sql` first, then `supabase/migrations/` (incl. `06` curated, `07` release_on_radar).
- Hosting? → `render.yaml` (backend), `frontend/vercel.json` (frontend), `backend/Dockerfile`.

---

## 13. Tech Stack Summary

- **Frontend:** React 19, React Router 7, TanStack Query 5, Zustand 5, Axios, Zod + React Hook Form, Radix UI, Tailwind 4, Vite 8, TypeScript.
- **Backend:** FastAPI, Uvicorn, psycopg + psycopg_pool, python-dotenv, bcrypt, PyJWT, Razorpay, httpx, email-validator, Pydantic.
- **Database:** Supabase Postgres, raw SQL, RLS locked down, migrations in `supabase/migrations/`.
- **Hosting:** Vercel (frontend), Render/Railway (backend), Supabase (DB), Resend/SMTP (email), Razorpay (payments), SAM.gov + Greenhouse/Lever/Ashby (data), Google Gemini (classify + AI outreach drafts).

---

*Updated 2026-09-17 for curated opportunities, Radar release gating, and AI outreach drafts. For setup details also see `supabase/SETUP.md` and `backend/.env.example`.*