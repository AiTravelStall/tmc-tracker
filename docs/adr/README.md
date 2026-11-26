# Architecture decision records

| ADR | Decision | Status | Rationale | Consequences |
|---|---|---|---|---|
| 001 | Next.js App Router, server components by default, client islands for interaction | Accepted | Matches the TMC marketing-site stack and conventions; pages ship little JS | Must follow Next 16 conventions (async `params`/`cookies`, `proxy.ts`). |
| 002 | Supabase Postgres is the only system of record; Supabase Auth for logins | Accepted | Managed Postgres + auth, row level security, backups | Supabase project + keys are a hard dependency. |
| 003 | Same-origin BFF: the browser only calls `/api/*`; the publishable key is used server-side only | Accepted | One place for validation, rate limits and the error envelope; no direct DB access from the browser | Every new feature needs a route. |
| 004 | All writes go through `security definer` Postgres functions; API roles have SELECT only | Accepted | Multi-step changes (call → close follow-ups → book visit → status) are atomic, and the rules hold for any client | Business rules live in SQL migrations; test them (see PGlite checks in the PR that introduced them). |
| 005 | RLS mirrors roles: sales see only schools/visits booked for them; follow-ups are telemarketing-only | Accepted | Defence in depth behind the API checks | Views use `security_invoker` so RLS applies through them. |
| 006 | Idempotent call logging via client-generated `client_id` | Accepted | Double-clicks and retries can't create duplicate calls (design doc §11.4) | Client must keep the id stable across retries of one submit. |
| 007 | One business timezone (`NEXT_PUBLIC_APP_TIMEZONE`, default Asia/Kolkata) for display and date inputs | Accepted | Server and browser render identical times; "today" is the same for everyone | The calendar grid uses the browser's local time (no tz plugin). |
| 008 | User management uses the service-role key, only after an admin check | Accepted | Supabase Auth admin API needs it | Key must never reach the browser; rotate if leaked. |
