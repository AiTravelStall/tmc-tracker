# TMC Tracker

## Date -> 27/11/2026

School outreach tracker for The Modern Classroom. Telemarketers call schools from the research list and either book a sales visit or set a follow-up call. Sales people work from a calendar of visits booked for them, and admins see the whole pipeline.

**Stack:** Next.js 16 (App Router) · TypeScript (strict) · Tailwind v4 with TMC design tokens · Supabase (Postgres, Auth, Row Level Security) · Zod · Vitest. Built to the conventions in the TMC system design document.

## Roles

| Role | Can |
|---|---|
| **Admin** | See the dashboard, every school, follow-up and visit. Manage the team, override status, assign schools, import/export CSV, read the activity log. |
| **Telemarketer** | Use "My day", browse all schools (click-to-call, LinkedIn, email), log calls with notes and enquiries, book sales visits, schedule and reschedule follow-ups. |
| **Sales** | Use their own calendar and visits only. Read the school brief and call history, record visit outcomes, reschedule or cancel. |

## Flow

1. **Call:** on a school's page the telemarketer logs the call outcome.
   - *Schedule sales visit:* pick a sales person and slot. That person's bookings for the day are shown, and clashes are blocked unless overridden.
   - *Call back later / Not reachable / Enquiry taken:* set a follow-up date.
   - *Not interested / Wrong number:* closes the school.
2. **Follow-ups:** due calls appear on "My day" and under Follow-ups (Overdue / Today / Upcoming), with a sidebar badge and a reminder toast or browser notification. Logging any call to that school completes them.
3. **Visit:** the sales person opens the visit on their calendar and records the outcome (converted, interested, proposal, second visit, not interested). A cancelled or no-show visit creates a re-book follow-up for the telemarketer who booked it.
4. **Status:** New → Contacted / Follow-up / Interested → Visit scheduled → Visited → Converted, or Not interested / Invalid. A softer call outcome never undoes a booked or completed visit.

## Setup

Requires Node.js 20.9+ and a Supabase project.

```bash
npm install
cp .env.example .env.local        # then fill in the values below
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → **Publishable key** (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | Same page → **Secret keys** (`sb_secret_…`). **Server only. Never prefix with `NEXT_PUBLIC_`.** The legacy JWT `anon`/`service_role` keys are not accepted. |
| `DATABASE_URL` | Project Settings → Database → Connection string → URI ("Session pooler"). Only needed for migrations. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Your first admin login. Used once. |

In the Supabase dashboard, go to **Authentication → Sign In / Providers → Email** and turn off **"Allow new users to sign up"**. Only admins should create accounts. Accounts without a profile can't see anything anyway, but there's no reason to allow sign-ups.

Then:

```bash
npm run db:migrate          # creates tables, RLS policies and functions (safe to re-run; --dry-run to preview)
npm run db:create-admin     # creates the first admin from ADMIN_* (must change password on first login)
npm run db:seed             # imports data/seed/schools.csv: 229 schools, 1,048 decision makers
                            # (the CSV is git-ignored: it holds personal contact data; get it from the team)
npm run dev                 # http://localhost:3000
```

Sign in as the admin, set your password, and add telemarketers and sales people under **Team**.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` / `build` / `start` | Develop / production build / serve |
| `npm run typecheck`, `lint`, `test` | `tsc --noEmit`, ESLint (incl. module-boundary and raw-hex rules), Vitest |
| `npm run db:migrate [-- --dry-run]` | Apply `supabase/migrations/*.sql` once each, logged in `ops.schema_migrations` |
| `npm run db:seed [-- file.csv]` | Upsert a research CSV (also available to admins at **Import / Export**) |
| `npm run db:create-admin` | Create the first admin |

## Architecture

```
app/(app)/*            Server-rendered pages (fetch → compose sections). Auth checked per page.
app/api/*              Same-origin BFF routes. Zod-validated input, { code, message } errors, no-store.
proxy.ts               Refreshes the Supabase session cookie; redirects signed-out users.
lib/server/            server-only: env validation, Supabase clients, auth, errors, logger, rate limit
lib/server/data/       Queries → mappers → typed view models; mutations call Postgres functions
lib/shared/            Client-safe: zod schemas (shared by forms and routes), formatting, timezone, labels
components/ui/         Primitives: Button, Card, Dialog (native <dialog>), FormField, StatusPill, Table…
components/sections/   One folder per page; client islands only where there is interaction
supabase/migrations/   Schema, RLS + views, transactional business functions
types/                 Domain + API types shared across layers
tests/                 Vitest unit tests
docs/adr/              Architecture decision records
```

**Security model:** signed-in users can only `SELECT`, filtered by RLS. Every write goes through a `security definer` Postgres function that re-checks the caller's role and runs as one transaction. The browser never talks to Supabase directly. The service-role key is used only for user management and CSV import, after an admin check. Security headers are set in `next.config.ts` (CSP starts in report-only). Sign-in and password changes are rate-limited.

**Error contract:** every API error is `{ "code": "INVALID_REQUEST | UNAUTHENTICATED | FORBIDDEN | NOT_FOUND | CONFLICT | RATE_LIMITED | NOT_CONFIGURED | DB_ERROR | INTERNAL", "message": "…" }` with matching HTTP status. Database functions raise `TM400/TM403/TM404/TM409`, which map to the same codes. Raw database messages are never shown to users.

## Deploying (Vercel)

1. Import the repo. Add the env vars above, except `DATABASE_URL` and `ADMIN_*`, which are only for local scripts.
2. Set `NEXT_PUBLIC_SITE_URL` to the production URL.
3. Run `npm run db:migrate` against production from your machine before deploying schema changes.
4. On serverless hosting the in-memory rate limiter is per instance. Swap `lib/server/rateLimit.ts` for Upstash Ratelimit if you need a global limit; Supabase Auth's own limits still apply.

## Runbook

- **"Server is not configured yet"**: one or more Supabase env vars are missing. The message lists which.
- **A user can't sign in**: check they're Active under Team. Disabling a user also bans them in Supabase Auth.
- **Forgotten password**: an admin sets a new temporary one under Team → Edit. The user must change it on next sign-in.
- **Re-importing research data**: Import / Export → upload CSV. Only school and contact details change; calls, follow-ups, visits and statuses are untouched.
