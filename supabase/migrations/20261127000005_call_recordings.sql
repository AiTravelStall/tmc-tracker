-- TMC Tracker: Salestrail call recordings and transcripts.
-- Rows are written only by the server's sync job (service role). Signed-in users
-- may read them: admins see every call, everyone else only calls from their own phone.

create table public.call_recordings (
  id uuid primary key,                                   -- Salestrail callId
  user_id uuid references public.profiles (id) on delete set null,   -- matched by email
  salestrail_user_email text not null default '',
  salestrail_user_name text not null default '',
  school_id bigint references public.schools (id) on delete set null, -- matched by phone
  contact_id bigint references public.contacts (id) on delete set null,
  phone text not null default '',
  inbound boolean not null default false,
  answered boolean not null default false,
  started_at timestamptz not null,
  duration_seconds integer not null default 0,
  source text not null default '',
  transcript_status text not null default 'pending'
    check (transcript_status in ('pending', 'done', 'no_recording', 'skipped', 'failed')),
  transcript text,
  transcript_segments jsonb,                             -- [{ start, end, text }]
  transcript_language text,
  transcript_provider text,
  transcript_error text,
  transcript_attempts integer not null default 0,
  transcribed_at timestamptz,
  salestrail_created_at timestamptz,
  synced_at timestamptz not null default now()
);

create index call_recordings_started_idx on public.call_recordings (started_at desc);
create index call_recordings_user_idx on public.call_recordings (user_id, started_at desc);
create index call_recordings_school_idx on public.call_recordings (school_id, started_at desc);
create index call_recordings_queue_idx on public.call_recordings (started_at) where transcript_status = 'pending';

-- Small key/value store for integration cursors. Server-only: no grants to API roles.
create table public.integration_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.call_recordings enable row level security;
alter table public.integration_state enable row level security;

create policy call_recordings_read on public.call_recordings
  for select to authenticated
  using (public.current_app_role() = 'admin' or user_id = auth.uid());

create view public.call_recording_list with (security_invoker = true) as
select
  r.id, r.user_id, r.salestrail_user_name, r.school_id, r.contact_id, r.phone, r.inbound, r.answered,
  r.started_at, r.duration_seconds, r.transcript_status, r.transcript_language,
  u.full_name as user_name, s.name as school_name, ct.name as contact_name
from public.call_recordings r
left join public.profiles u on u.id = r.user_id
left join public.schools s on s.id = r.school_id
left join public.contacts ct on ct.id = r.contact_id;

grant select on public.call_recordings, public.call_recording_list to authenticated;
grant all on public.call_recordings, public.integration_state to service_role;
