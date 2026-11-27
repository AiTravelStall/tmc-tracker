# TMC Tracker

## Date -> 27/11/2026

School outreach tracker for The Modern Classroom. Telemarketers call schools from the research list and either book a sales visit or set a follow-up call. Sales people work from a calendar of visits booked for them, and admins see the whole pipeline.

**Stack:** Next.js 16 (App Router) · TypeScript (strict) · Tailwind v4 with TMC design tokens · Supabase (Postgres, Auth, Row Level Security) · Zod · Vitest. Hosted on Cloudflare Workers via [vinext](https://github.com/cloudflare/vinext). Call recordings come from Salestrail and are transcribed with Groq Whisper, with Cloudflare Workers AI as a fallback. Built to the conventions in the TMC system design document.

## Roles

| Role | Can |
|---|---|
| **Admin** | See the dashboard, every school, follow-up and visit. Manage the team, override status, assign schools, import/export CSV, read the activity log, and listen to every call recording. |
| **Telemarketer** | Use "My day", browse all schools (click-to-call, LinkedIn, email), log calls with notes and enquiries, book sales visits, schedule and reschedule follow-ups, and review their own call recordings. |
| **Sales** | Use their own calendar and visits only. Read the school brief and call history, record visit outcomes, reschedule or cancel, and review their own call recordings. |

## Flow

1. **Call:** on a school's page the telemarketer logs the call outcome.
   - *Schedule sales visit:* pick a sales person and slot. That person's bookings for the day are shown, and clashes are blocked unless overridden.
   - *Call back later / Not reachable / Enquiry taken:* set a follow-up date.
   - *Not interested / Wrong number:* closes the school.
2. **Follow-ups:** due calls appear on "My day" and under Follow-ups (Overdue / Today / Upcoming), with a sidebar badge and a reminder toast or browser notification. Logging any call to that school completes them.
3. **Visit:** the sales person opens the visit on their calendar and records the outcome (converted, interested, proposal, second visit, not interested). A cancelled or no-show visit creates a re-book follow-up for the telemarketer who booked it.
4. **Status:** New → Contacted / Follow-up / Interested → Visit scheduled → Visited → Converted, or Not interested / Invalid. A softer call outcome never undoes a booked or completed visit.
5. **Recordings:** calls made with the Salestrail app appear under **Recordings** after someone presses **Refetch recordings**; the time of the last refetch is shown beside the button. Each call is linked to a tracker user by email and to a school or decision maker by phone number, and also appears on that school's page. Open a call to play it; click any line of the transcript to jump there in the audio.

## Call recordings (Salestrail)

- **What Salestrail needs:** the **Call Recording** add-on (Android only) and the **CRM Integration** add-on, which provides the API. Team members sign in to the Salestrail app with the **same email** as their tracker login.
- **How a refetch works:** `POST /api/recordings/sync` pulls calls created since the last run from the [Salestrail Pull API](https://www.salestrail.io/knowledge-base/how-to-use-salestrail-pull-api), matches them to users and schools, and saves them to `call_recordings`. It then transcribes up to 5 waiting recordings; press again if more are waiting. Calls under 5 seconds or unanswered are skipped. If a call has no recording 6 hours after it was made, it's marked "No recording".
- **Transcription:** Groq `whisper-large-v3`, free tier. When Groq is rate-limited or fails, Cloudflare Workers AI `whisper-large-v3-turbo` is used instead (free daily allowance, only available on Cloudflare).
- **Audio is not stored.** When someone presses play, the tracker checks they may see that call, then redirects to a short-lived download link from Salestrail.
- **Who sees what:** RLS on `call_recordings` lets admins see every call and everyone else only their own.

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
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Your first admin login. Used once; remove `ADMIN_PASSWORD` afterwards. |
| `SALESTRAIL_API_USERNAME`, `SALESTRAIL_API_PASSWORD` | Optional (recordings). The Salestrail **owner** generates them at `callanalytics.salestrail.io/integration/apidocs`. A non-owner only sees their own calls. |
| `GROQ_API_KEY` | Optional (transcripts). Free key from console.groq.com. Without it, transcripts use Cloudflare Workers AI only. |

In the Supabase dashboard, go to **Authentication → Sign In / Providers → Email** and turn off **"Allow new users to sign up"**. Only admins should create accounts. Accounts without a profile can't see anything anyway, but there's no reason to allow sign-ups.

Then:

```bash
npm run db:migrate          # creates tables, RLS policies and functions (safe to re-run; --dry-run to preview)
                            # no DATABASE_URL? paste supabase/setup*.sql files into Supabase → SQL Editor instead
npm run db:create-admin     # creates the first admin from ADMIN_* (must change password on first login)
npm run db:seed             # imports data/seed/schools.csv: 229 schools, 1,048 decision makers
                            # (the CSV is git-ignored: it holds personal contact data; get it from the team)
npm run dev                 # http://localhost:3000
```

Sign in as the admin, set your password, and add telemarketers and sales people under **Team**.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` / `build` / `start` | Develop / production build / serve (Next.js) |
| `npm run build:vinext` / `start:vinext` | Build for Cloudflare Workers / preview that build locally in workerd (reads `.env.local`) |
| `npm run deploy:vinext` | Build and deploy to Cloudflare from your machine (normally Cloudflare builds from GitHub instead) |
| `npm run typecheck`, `lint`, `test` | `tsc --noEmit`, ESLint (incl. module-boundary and raw-hex rules), Vitest |
| `npm run db:migrate [-- --dry-run]` | Apply `supabase/migrations/*.sql` once each, logged in `ops.schema_migrations` |
| `npm run db:seed [-- file.csv]` | Upsert a research CSV (also available to admins at **Import / Export**) |
| `npm run db:create-admin` | Create the first admin |

## Architecture

```
app/(app)/*            Server-rendered pages (fetch → compose sections). Auth checked per page.
app/api/*              Same-origin BFF routes. Zod-validated input, { code, message } errors, no-store.
worker.ts              Cloudflare Worker entry: vinext's handler + the Workers AI binding for transcription
cloudflare.config.ts   Worker name, bindings, compatibility flags (vinext / cf CLI)
proxy.ts               Refreshes the Supabase session cookie; redirects signed-out users.
lib/server/            server-only: env validation, Supabase clients, auth, errors, logger, rate limit
lib/server/data/       Queries → mappers → typed view models; mutations call Postgres functions
lib/server/salestrail/ Salestrail client, call parsing, transcription (Groq → Workers AI), refetch job
lib/shared/            Client-safe: zod schemas (shared by forms and routes), formatting, timezone, labels
components/ui/         Primitives: Button, Card, Dialog (native <dialog>), FormField, StatusPill, Table…
components/sections/   One folder per page; client islands only where there is interaction
supabase/migrations/   Schema, RLS + views, transactional business functions
types/                 Domain + API types shared across layers
tests/                 Vitest unit tests
docs/adr/              Architecture decision records
```

**Security model:** signed-in users can only `SELECT`, filtered by RLS. Every write goes through a `security definer` Postgres function that re-checks the caller's role and runs as one transaction. The browser never talks to Supabase directly. The secret key (service role) is used only for user management, CSV import and the recordings refetch, after the caller's role has been checked. Security headers are set in `next.config.ts` (CSP starts in report-only). Sign-in and password changes are rate-limited.

**Error contract:** every API error is `{ "code": "INVALID_REQUEST | UNAUTHENTICATED | FORBIDDEN | NOT_FOUND | CONFLICT | RATE_LIMITED | NOT_CONFIGURED | DB_ERROR | INTERNAL", "message": "…" }` with matching HTTP status. Database functions raise `TM400/TM403/TM404/TM409`, which map to the same codes. Raw database messages are never shown to users.

## Deploying (Cloudflare Workers)

The live site is a Cloudflare Worker named `tmc-tracker`, built by **Workers Builds** from the `main` branch on GitHub (`npx cf build`, then `npx cf deploy --prebuilt`). Every push to `main` deploys.

1. In Cloudflare → Workers & Pages → **tmc-tracker** → Settings → **Variables and Secrets**, add every value as **Type: Secret**:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
   - optionally `SALESTRAIL_API_USERNAME`, `SALESTRAIL_API_PASSWORD`, `GROQ_API_KEY`

   **Don't add them as plain-text variables.** Those are printed in build logs, and the deploy aborts because they clash with `cloudflare.config.ts`. Secrets stay hidden and are kept across deploys.
2. Run database changes before pushing code that needs them: use `npm run db:migrate`, or paste the matching `supabase/setup-*.sql` into the SQL Editor.
3. Never run `cf deploy --force` against the live Worker. It replaces dashboard settings with the local config.
4. GitHub Actions (`.github/workflows/ci.yml`) runs typecheck, lint, tests, both builds and `npm audit` on every push.
5. The in-memory rate limiter is per Worker instance. Swap `lib/server/rateLimit.ts` for a shared store if you need a global limit; Supabase Auth's own limits still apply.

## Runbook

- **"Server is not configured yet"**: one or more Supabase env vars are missing. The message lists which.
- **Deploy fails with "differs from the remote configuration … vars"**: a value was added as a plain-text variable in the Cloudflare dashboard. Re-add it as a Secret and rotate it, because it was printed in the build log.
- **Recordings page shows "Connect Salestrail"**: `SALESTRAIL_API_USERNAME` / `SALESTRAIL_API_PASSWORD` aren't set on the Worker.
- **A call shows "Not linked"**: the Salestrail user's email doesn't match any tracker login. **"Unknown number"**: the dialled number isn't on any school or contact.
- **Transcripts stuck on "Transcribing"**: press Refetch recordings again; each press handles up to 5. Calls that fail 3 times are marked "Transcript failed" with the error stored in `call_recordings.transcript_error`.
- **A user can't sign in**: check they're Active under Team. Disabling a user also bans them in Supabase Auth.
- **Forgotten password**: an admin sets a new temporary one under Team → Edit. The user must change it on next sign-in.
- **Re-importing research data**: Import / Export → upload CSV. Only school and contact details change; calls, follow-ups, visits and statuses are untouched.
