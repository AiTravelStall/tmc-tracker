-- TMC Tracker: core schema.
-- Every table lives in `public`, has RLS enabled (see 0002) and is only written
-- through the security-definer functions in 0003, so business rules hold no
-- matter which client talks to the database.

create extension if not exists pg_trgm;

-- ---------- enums ----------
create type public.app_role as enum ('admin', 'telemarketer', 'sales');

create type public.school_status as enum (
  'new', 'contacted', 'follow_up', 'interested',
  'meeting_scheduled', 'meeting_done', 'converted',
  'not_interested', 'invalid'
);

create type public.call_outcome as enum (
  'meeting_scheduled', 'follow_up', 'interested',
  'not_reachable', 'not_interested', 'wrong_number'
);

create type public.follow_up_status as enum ('pending', 'done', 'cancelled');

create type public.meeting_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');

create type public.meeting_outcome as enum (
  'converted', 'interested', 'proposal_sent', 'follow_up', 'not_interested'
);

-- ---------- tables ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text not null default '',
  role public.app_role not null,
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.schools (
  id bigint generated always as identity primary key,
  name text not null,
  location text not null default '',
  tier text not null default '',
  curriculum text not null default '',
  school_phone text not null default '',
  school_email text not null default '',
  website text not null default '',
  research_status text not null default '',
  research_notes text not null default '',
  research_sources text not null default '',
  verified_school_contact text not null default '',
  research_date text not null default '',
  status public.school_status not null default 'new',
  assigned_telemarketer_id uuid references public.profiles (id) on delete set null,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, location)
);

create table public.contacts (
  id bigint generated always as identity primary key,
  school_id bigint not null references public.schools (id) on delete cascade,
  name text not null,
  position text not null default '',
  linkedin text not null default '',
  email text not null default '',
  phone text not null default '',
  priority text not null default '',
  current_role_verification text not null default '',
  email_verification_status text not null default '',
  linkedin_verification_status text not null default '',
  confidence_score text not null default '',
  outreach_priority text not null default '',
  record_audit_flags text not null default '',
  created_at timestamptz not null default now(),
  unique (school_id, name, position)
);

create table public.calls (
  id bigint generated always as identity primary key,
  -- Client-generated id; makes "log call" idempotent against double-submits and retries.
  client_id uuid not null unique,
  school_id bigint not null references public.schools (id) on delete cascade,
  contact_id bigint references public.contacts (id) on delete set null,
  user_id uuid not null references public.profiles (id),
  outcome public.call_outcome not null,
  notes text not null default '',
  enquiry text not null default '',
  created_at timestamptz not null default now()
);

create table public.follow_ups (
  id bigint generated always as identity primary key,
  school_id bigint not null references public.schools (id) on delete cascade,
  contact_id bigint references public.contacts (id) on delete set null,
  assigned_to uuid not null references public.profiles (id),
  created_by uuid not null references public.profiles (id),
  call_id bigint references public.calls (id) on delete set null,
  due_at timestamptz not null,
  notes text not null default '',
  status public.follow_up_status not null default 'pending',
  completed_at timestamptz,
  completed_call_id bigint references public.calls (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.meetings (
  id bigint generated always as identity primary key,
  school_id bigint not null references public.schools (id) on delete cascade,
  contact_id bigint references public.contacts (id) on delete set null,
  sales_user_id uuid not null references public.profiles (id),
  scheduled_by uuid not null references public.profiles (id),
  call_id bigint references public.calls (id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  address text not null default '',
  agenda text not null default '',
  status public.meeting_status not null default 'scheduled',
  outcome public.meeting_outcome,
  outcome_notes text not null default '',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create table public.activities (
  id bigint generated always as identity primary key,
  school_id bigint references public.schools (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- ---------- indexes ----------
create index contacts_school_idx on public.contacts (school_id);
create index calls_school_idx on public.calls (school_id, created_at desc);
create index calls_user_idx on public.calls (user_id, created_at desc);
create index follow_ups_assignee_idx on public.follow_ups (assigned_to, status, due_at);
create index follow_ups_school_idx on public.follow_ups (school_id, status);
create index meetings_sales_idx on public.meetings (sales_user_id, start_at);
create index meetings_school_idx on public.meetings (school_id);
create index meetings_status_idx on public.meetings (status, start_at);
create index activities_school_idx on public.activities (school_id, created_at desc);
create index activities_time_idx on public.activities (created_at desc);
create index schools_status_idx on public.schools (status);
create index schools_assigned_idx on public.schools (assigned_telemarketer_id);
create index schools_name_trgm on public.schools using gin (name gin_trgm_ops);
