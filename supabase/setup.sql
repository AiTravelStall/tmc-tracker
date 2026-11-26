-- TMC Tracker one-time setup. Paste into Supabase → SQL Editor → New query → Run.
-- Generated from supabase/migrations; records them so `npm run db:migrate` won't re-apply.
begin;

-- ===== 20261124000001_schema.sql =====
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

-- ===== 20261124000002_access.sql =====
-- TMC Tracker: role helpers, row level security and read views.
-- Model: signed-in users may only SELECT (filtered by RLS). All writes go
-- through the functions in 0003, which re-check the caller's role.

-- ---------- role helpers ----------
create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.can_see_school(p_school_id bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case public.current_app_role()
    when 'admin' then true
    when 'telemarketer' then true
    when 'sales' then exists (
      select 1 from public.meetings m
      where m.school_id = p_school_id and m.sales_user_id = auth.uid()
    )
    else false
  end
$$;

-- ---------- privileges ----------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;

-- New objects must not silently become writable by API roles.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.schools enable row level security;
alter table public.contacts enable row level security;
alter table public.calls enable row level security;
alter table public.follow_ups enable row level security;
alter table public.meetings enable row level security;
alter table public.activities enable row level security;

create policy profiles_read on public.profiles
  for select to authenticated
  using (public.current_app_role() is not null or id = auth.uid());

create policy schools_read on public.schools
  for select to authenticated using (public.can_see_school(id));

create policy contacts_read on public.contacts
  for select to authenticated using (public.can_see_school(school_id));

create policy calls_read on public.calls
  for select to authenticated using (public.can_see_school(school_id));

create policy follow_ups_read on public.follow_ups
  for select to authenticated
  using (public.current_app_role() in ('admin', 'telemarketer'));

create policy meetings_read on public.meetings
  for select to authenticated
  using (
    public.current_app_role() in ('admin', 'telemarketer')
    or (public.current_app_role() = 'sales' and sales_user_id = auth.uid())
  );

create policy activities_read on public.activities
  for select to authenticated
  using (
    public.current_app_role() = 'admin'
    or (school_id is not null and public.can_see_school(school_id))
  );

-- ---------- read views (security_invoker: RLS of the caller applies) ----------
create view public.school_list with (security_invoker = true) as
select
  s.id, s.name, s.location, s.tier, s.curriculum,
  s.school_phone, s.school_email, s.website, s.status,
  s.assigned_telemarketer_id, p.full_name as assigned_name,
  s.last_contacted_at, s.next_follow_up_at,
  (select count(*) from public.contacts c where c.school_id = s.id)::int as contact_count,
  (select count(*) from public.calls c where c.school_id = s.id)::int as call_count,
  (select min(m.start_at) from public.meetings m where m.school_id = s.id and m.status = 'scheduled') as next_meeting_at,
  lower(concat_ws(' ', s.name, s.location, s.school_phone, s.school_email,
    (select string_agg(concat_ws(' ', c.name, c.phone, c.email), ' ') from public.contacts c where c.school_id = s.id)
  )) as search_text
from public.schools s
left join public.profiles p on p.id = s.assigned_telemarketer_id;

create view public.follow_up_list with (security_invoker = true) as
select
  f.id, f.school_id, f.contact_id, f.assigned_to, f.created_by, f.call_id,
  f.due_at, f.notes, f.status, f.completed_at, f.created_at,
  s.name as school_name, s.location, s.school_phone, s.status as school_status,
  c.name as contact_name, c.phone as contact_phone, c.position as contact_position,
  p.full_name as assigned_name
from public.follow_ups f
join public.schools s on s.id = f.school_id
join public.profiles p on p.id = f.assigned_to
left join public.contacts c on c.id = f.contact_id;

create view public.meeting_list with (security_invoker = true) as
select
  m.id, m.school_id, m.contact_id, m.sales_user_id, m.scheduled_by, m.call_id,
  m.start_at, m.end_at, m.address, m.agenda, m.status, m.outcome, m.outcome_notes,
  m.completed_at, m.created_at, m.updated_at,
  s.name as school_name, s.location, s.school_phone, s.status as school_status,
  u.full_name as sales_name, b.full_name as scheduled_by_name,
  c.name as contact_name, c.phone as contact_phone, c.position as contact_position
from public.meetings m
join public.schools s on s.id = m.school_id
join public.profiles u on u.id = m.sales_user_id
join public.profiles b on b.id = m.scheduled_by
left join public.contacts c on c.id = m.contact_id;

create view public.call_list with (security_invoker = true) as
select
  c.id, c.school_id, c.contact_id, c.user_id, c.outcome, c.notes, c.enquiry, c.created_at,
  u.full_name as user_name, ct.name as contact_name
from public.calls c
join public.profiles u on u.id = c.user_id
left join public.contacts ct on ct.id = c.contact_id;

create view public.activity_list with (security_invoker = true) as
select
  a.id, a.school_id, a.user_id, a.type, a.message, a.created_at,
  u.full_name as user_name, u.role as user_role, s.name as school_name
from public.activities a
left join public.profiles u on u.id = a.user_id
left join public.schools s on s.id = a.school_id;

grant select on public.school_list, public.follow_up_list, public.meeting_list,
  public.call_list, public.activity_list to authenticated;

-- ===== 20261124000003_functions.sql =====
-- TMC Tracker: write path and reporting.
-- Each public function is one transaction, checks the caller's role first and
-- raises a typed SQLSTATE the API layer maps to an HTTP status:
--   TM400 invalid request · TM403 forbidden · TM404 not found · TM409 conflict

-- ---------- internals (not executable by API roles) ----------
create or replace function public._fail(p_code text, p_message text, p_detail jsonb default null)
returns void language plpgsql as $$
begin
  raise exception using errcode = p_code, message = p_message, detail = coalesce(p_detail::text, '');
end $$;

create or replace function public._require_role(p_roles public.app_role[])
returns public.app_role language plpgsql stable security definer set search_path = public as $$
declare v_role public.app_role := public.current_app_role();
begin
  if v_role is null then perform public._fail('TM403', 'Your account is not active'); end if;
  if not v_role = any (p_roles) then perform public._fail('TM403', 'You do not have access to this'); end if;
  return v_role;
end $$;

create or replace function public._iso(p_ts timestamptz)
returns text language sql immutable as $$
  select to_char(p_ts at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
$$;

create or replace function public._log(p_school_id bigint, p_type text, p_message text)
returns void language sql security definer set search_path = public as $$
  insert into public.activities (school_id, user_id, type, message) values (p_school_id, auth.uid(), p_type, p_message)
$$;

-- Softer call outcomes must not undo real progress (a booked or finished visit).
create or replace function public._set_school_status(p_school_id bigint, p_next public.school_status, p_force boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare v_cur public.school_status;
begin
  select status into v_cur from public.schools where id = p_school_id;
  if not p_force
     and v_cur in ('meeting_scheduled', 'meeting_done', 'converted')
     and p_next in ('contacted', 'follow_up', 'interested') then
    return;
  end if;
  update public.schools set status = p_next, updated_at = now() where id = p_school_id;
end $$;

create or replace function public._refresh_next_follow_up(p_school_id bigint)
returns void language sql security definer set search_path = public as $$
  update public.schools
  set next_follow_up_at = (select min(due_at) from public.follow_ups where school_id = p_school_id and status = 'pending')
  where id = p_school_id
$$;

create or replace function public._meeting_conflicts(p_sales uuid, p_start timestamptz, p_end timestamptz, p_exclude bigint default 0)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'startAt', m.start_at, 'endAt', m.end_at, 'schoolName', s.name) order by m.start_at), '[]'::jsonb)
  from public.meetings m join public.schools s on s.id = m.school_id
  where m.sales_user_id = p_sales and m.status = 'scheduled' and m.id <> p_exclude
    and m.start_at < p_end and m.end_at > p_start
$$;

create or replace function public._create_meeting(
  p_school_id bigint, p_sales_user_id uuid, p_start_at timestamptz, p_duration_min int,
  p_contact_id bigint, p_address text, p_agenda text, p_call_id bigint, p_force boolean
) returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_sales_name text;
  v_minutes int := least(greatest(coalesce(p_duration_min, 60), 15), 600);
  v_end timestamptz;
  v_conflicts jsonb;
  v_id bigint;
begin
  select full_name into v_sales_name from public.profiles
  where id = p_sales_user_id and role = 'sales' and active;
  if v_sales_name is null then perform public._fail('TM400', 'Pick an active sales person'); end if;
  if p_start_at is null then perform public._fail('TM400', 'Pick a date and time for the visit'); end if;
  v_end := p_start_at + make_interval(mins => v_minutes);

  if not coalesce(p_force, false) then
    v_conflicts := public._meeting_conflicts(p_sales_user_id, p_start_at, v_end);
    if jsonb_array_length(v_conflicts) > 0 then
      perform public._fail('TM409', v_sales_name || ' already has a visit at that time', v_conflicts);
    end if;
  end if;

  insert into public.meetings (school_id, contact_id, sales_user_id, scheduled_by, call_id, start_at, end_at, address, agenda)
  values (p_school_id, p_contact_id, p_sales_user_id, auth.uid(), p_call_id, p_start_at, v_end,
          coalesce(p_address, ''), coalesce(p_agenda, ''))
  returning id into v_id;

  perform public._set_school_status(p_school_id, 'meeting_scheduled', true);
  perform public._log(p_school_id, 'meeting_scheduled', 'Visit booked with ' || v_sales_name || ' for ' || public._iso(p_start_at));
  return v_id;
end $$;

-- ---------- calls ----------
create or replace function public.log_call(
  p_client_id uuid,
  p_school_id bigint,
  p_outcome public.call_outcome,
  p_notes text default '',
  p_enquiry text default '',
  p_contact_id bigint default null,
  p_follow_up_at timestamptz default null,
  p_follow_up_notes text default '',
  p_meeting jsonb default null,
  p_force boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_role public.app_role := public._require_role(array['admin', 'telemarketer']::public.app_role[]);
  v_school public.schools%rowtype;
  v_existing bigint;
  v_call_id bigint;
  v_closed int;
  v_follow_up_id bigint;
  v_meeting_id bigint;
  v_assignee uuid;
  v_next public.school_status;
begin
  -- Idempotency: a retried submit returns the original result.
  select id into v_existing from public.calls where client_id = p_client_id;
  if v_existing is not null then
    return jsonb_build_object('callId', v_existing, 'duplicate', true);
  end if;

  select * into v_school from public.schools where id = p_school_id for update;
  if not found then perform public._fail('TM404', 'School not found'); end if;
  if p_contact_id is not null and not exists (select 1 from public.contacts where id = p_contact_id and school_id = p_school_id) then
    perform public._fail('TM400', 'That contact does not belong to this school');
  end if;
  if p_outcome = 'follow_up' and p_follow_up_at is null then
    perform public._fail('TM400', 'Set a follow-up date');
  end if;
  if p_outcome = 'meeting_scheduled' and p_meeting is null then
    perform public._fail('TM400', 'Fill in the visit details');
  end if;

  insert into public.calls (client_id, school_id, contact_id, user_id, outcome, notes, enquiry)
  values (p_client_id, p_school_id, p_contact_id, auth.uid(), p_outcome, coalesce(p_notes, ''), coalesce(p_enquiry, ''))
  returning id into v_call_id;

  -- Any call to the school completes its open follow-ups.
  update public.follow_ups
  set status = 'done', completed_at = now(), completed_call_id = v_call_id
  where school_id = p_school_id and status = 'pending';
  get diagnostics v_closed = row_count;

  perform public._log(p_school_id, 'call', 'Call logged: ' || replace(p_outcome::text, '_', ' ')
    || case when coalesce(p_notes, '') <> '' then ' — ' || p_notes else '' end);

  if p_follow_up_at is not null and p_outcome <> 'meeting_scheduled' then
    v_assignee := case when v_role = 'telemarketer' then auth.uid()
                       else coalesce(v_school.assigned_telemarketer_id, auth.uid()) end;
    insert into public.follow_ups (school_id, contact_id, assigned_to, created_by, call_id, due_at, notes)
    values (p_school_id, p_contact_id, v_assignee, auth.uid(), v_call_id, p_follow_up_at, coalesce(p_follow_up_notes, ''))
    returning id into v_follow_up_id;
    perform public._log(p_school_id, 'follow_up', 'Follow-up call set for ' || public._iso(p_follow_up_at));
  end if;

  if p_outcome = 'meeting_scheduled' then
    v_meeting_id := public._create_meeting(
      p_school_id,
      nullif(p_meeting ->> 'salesUserId', '')::uuid,
      nullif(p_meeting ->> 'startAt', '')::timestamptz,
      nullif(p_meeting ->> 'durationMin', '')::int,
      p_contact_id,
      p_meeting ->> 'address',
      p_meeting ->> 'agenda',
      v_call_id,
      p_force
    );
  else
    v_next := case p_outcome
      when 'follow_up' then 'follow_up'
      when 'interested' then 'interested'
      when 'not_interested' then 'not_interested'
      when 'wrong_number' then 'invalid'
      else case when v_follow_up_id is not null then 'follow_up' else 'contacted' end
    end;
    perform public._set_school_status(p_school_id, v_next, p_outcome in ('not_interested', 'wrong_number'));
  end if;

  update public.schools
  set last_contacted_at = now(),
      assigned_telemarketer_id = coalesce(assigned_telemarketer_id, case when v_role = 'telemarketer' then auth.uid() end)
  where id = p_school_id;
  perform public._refresh_next_follow_up(p_school_id);

  return jsonb_build_object('callId', v_call_id, 'followUpId', v_follow_up_id,
    'meetingId', v_meeting_id, 'followUpsClosed', v_closed, 'duplicate', false);
end $$;

-- ---------- meetings ----------
create or replace function public.create_meeting(
  p_school_id bigint, p_sales_user_id uuid, p_start_at timestamptz, p_duration_min int default 60,
  p_contact_id bigint default null, p_address text default '', p_agenda text default '', p_force boolean default false
) returns bigint language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role(array['admin', 'telemarketer']::public.app_role[]);
  if not exists (select 1 from public.schools where id = p_school_id) then perform public._fail('TM404', 'School not found'); end if;
  return public._create_meeting(p_school_id, p_sales_user_id, p_start_at, p_duration_min, p_contact_id, p_address, p_agenda, null, p_force);
end $$;

create or replace function public.update_meeting(
  p_id bigint,
  p_action text,                       -- reschedule | complete | cancel | no_show
  p_start_at timestamptz default null,
  p_duration_min int default null,
  p_sales_user_id uuid default null,
  p_outcome public.meeting_outcome default null,
  p_notes text default null,
  p_force boolean default false
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_role public.app_role := public._require_role(array['admin', 'telemarketer', 'sales']::public.app_role[]);
  m public.meetings%rowtype;
  v_sales_name text;
  v_sales uuid;
  v_start timestamptz;
  v_minutes int;
  v_end timestamptz;
  v_conflicts jsonb;
  v_assignee uuid;
begin
  select * into m from public.meetings where id = p_id for update;
  if not found then perform public._fail('TM404', 'Visit not found'); end if;
  if v_role = 'sales' and m.sales_user_id <> auth.uid() then perform public._fail('TM403', 'This visit is not on your calendar'); end if;
  if m.status <> 'scheduled' then perform public._fail('TM400', 'Only scheduled visits can be changed'); end if;
  select full_name into v_sales_name from public.profiles where id = m.sales_user_id;

  if p_action = 'reschedule' then
    v_sales := case when v_role <> 'sales' and p_sales_user_id is not null then p_sales_user_id else m.sales_user_id end;
    if not exists (select 1 from public.profiles where id = v_sales and role = 'sales' and active) then
      perform public._fail('TM400', 'Pick an active sales person');
    end if;
    v_start := coalesce(p_start_at, m.start_at);
    v_minutes := least(greatest(coalesce(p_duration_min, (extract(epoch from m.end_at - m.start_at) / 60)::int), 15), 600);
    v_end := v_start + make_interval(mins => v_minutes);
    if not coalesce(p_force, false) then
      v_conflicts := public._meeting_conflicts(v_sales, v_start, v_end, m.id);
      if jsonb_array_length(v_conflicts) > 0 then
        perform public._fail('TM409', 'That slot clashes with another visit', v_conflicts);
      end if;
    end if;
    update public.meetings set start_at = v_start, end_at = v_end, sales_user_id = v_sales, updated_at = now() where id = m.id;
    perform public._log(m.school_id, 'meeting', 'Visit rescheduled to ' || public._iso(v_start));

  elsif p_action = 'complete' then
    if p_outcome is null then perform public._fail('TM400', 'Pick the visit outcome'); end if;
    update public.meetings
    set status = 'completed', outcome = p_outcome, outcome_notes = coalesce(p_notes, ''), completed_at = now(), updated_at = now()
    where id = m.id;
    perform public._set_school_status(m.school_id,
      case p_outcome when 'converted' then 'converted'::public.school_status
                     when 'not_interested' then 'not_interested'::public.school_status
                     else 'meeting_done'::public.school_status end, true);
    perform public._log(m.school_id, 'meeting_done', 'Visit completed by ' || v_sales_name || ': '
      || replace(p_outcome::text, '_', ' ') || case when coalesce(p_notes, '') <> '' then ' — ' || p_notes else '' end);

  elsif p_action in ('cancel', 'no_show') then
    update public.meetings
    set status = case p_action when 'cancel' then 'cancelled'::public.meeting_status else 'no_show'::public.meeting_status end,
        outcome_notes = coalesce(p_notes, outcome_notes), updated_at = now()
    where id = m.id;
    perform public._log(m.school_id, 'meeting', 'Visit marked ' || replace(p_action, '_', ' ')
      || case when coalesce(p_notes, '') <> '' then ' — ' || p_notes else '' end);

    -- No other visit booked: hand the school back to telemarketing with a re-book call tomorrow.
    if not exists (select 1 from public.meetings where school_id = m.school_id and status = 'scheduled') then
      perform public._set_school_status(m.school_id, 'follow_up', true);
      select coalesce(
        (select id from public.profiles where id = m.scheduled_by and role = 'telemarketer' and active),
        (select assigned_telemarketer_id from public.schools where id = m.school_id)
      ) into v_assignee;
      if v_assignee is not null then
        insert into public.follow_ups (school_id, contact_id, assigned_to, created_by, due_at, notes)
        values (m.school_id, m.contact_id, v_assignee, auth.uid(), now() + interval '1 day',
                'Visit ' || replace(p_action, '_', ' ') || ' — please re-book');
        perform public._refresh_next_follow_up(m.school_id);
      end if;
    end if;
  else
    perform public._fail('TM400', 'Unknown action');
  end if;
end $$;

-- ---------- follow-ups ----------
create or replace function public.update_follow_up(
  p_id bigint, p_due_at timestamptz default null, p_notes text default null,
  p_status public.follow_up_status default null, p_assigned_to uuid default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_role public.app_role := public._require_role(array['admin', 'telemarketer']::public.app_role[]);
  f public.follow_ups%rowtype;
begin
  select * into f from public.follow_ups where id = p_id for update;
  if not found then perform public._fail('TM404', 'Follow-up not found'); end if;
  if v_role = 'telemarketer' and f.assigned_to <> auth.uid() then perform public._fail('TM403', 'This follow-up is assigned to someone else'); end if;
  if f.status <> 'pending' then perform public._fail('TM400', 'This follow-up is already closed'); end if;

  if p_due_at is not null then
    update public.follow_ups set due_at = p_due_at where id = f.id;
    perform public._log(f.school_id, 'follow_up', 'Follow-up moved to ' || public._iso(p_due_at));
  end if;
  if p_notes is not null then update public.follow_ups set notes = p_notes where id = f.id; end if;
  if p_assigned_to is not null then
    if v_role <> 'admin' then perform public._fail('TM403', 'Only admins can reassign follow-ups'); end if;
    if not exists (select 1 from public.profiles where id = p_assigned_to and role in ('telemarketer', 'admin') and active) then
      perform public._fail('TM400', 'Pick a telemarketer');
    end if;
    update public.follow_ups set assigned_to = p_assigned_to where id = f.id;
  end if;
  if p_status in ('done', 'cancelled') then
    update public.follow_ups set status = p_status, completed_at = now() where id = f.id;
    perform public._log(f.school_id, 'follow_up', 'Follow-up marked ' || p_status::text);
  end if;
  perform public._refresh_next_follow_up(f.school_id);
end $$;

-- ---------- schools & contacts ----------
create or replace function public.create_school(
  p_name text, p_location text default '', p_tier text default '', p_curriculum text default '',
  p_school_phone text default '', p_school_email text default '', p_website text default ''
) returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  perform public._require_role(array['admin', 'telemarketer']::public.app_role[]);
  if coalesce(trim(p_name), '') = '' then perform public._fail('TM400', 'School name is required'); end if;
  if exists (select 1 from public.schools where name = trim(p_name) and location = trim(coalesce(p_location, ''))) then
    perform public._fail('TM409', 'A school with this name and location already exists');
  end if;
  insert into public.schools (name, location, tier, curriculum, school_phone, school_email, website)
  values (trim(p_name), trim(coalesce(p_location, '')), coalesce(p_tier, ''), coalesce(p_curriculum, ''),
          coalesce(p_school_phone, ''), coalesce(p_school_email, ''), coalesce(p_website, ''))
  returning id into v_id;
  perform public._log(v_id, 'school', 'School added manually');
  return v_id;
end $$;

create or replace function public.update_school_details(p_id bigint, p_fields jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  s public.schools%rowtype;
  v_changed text[] := '{}';
begin
  perform public._require_role(array['admin', 'telemarketer']::public.app_role[]);
  select * into s from public.schools where id = p_id for update;
  if not found then perform public._fail('TM404', 'School not found'); end if;

  if p_fields ? 'school_phone' and p_fields ->> 'school_phone' is distinct from s.school_phone then v_changed := array_append(v_changed, 'phone'); end if;
  if p_fields ? 'school_email' and p_fields ->> 'school_email' is distinct from s.school_email then v_changed := array_append(v_changed, 'email'); end if;
  if p_fields ? 'website' and p_fields ->> 'website' is distinct from s.website then v_changed := array_append(v_changed, 'website'); end if;
  if p_fields ? 'location' and p_fields ->> 'location' is distinct from s.location then v_changed := array_append(v_changed, 'location'); end if;
  if p_fields ? 'tier' and p_fields ->> 'tier' is distinct from s.tier then v_changed := array_append(v_changed, 'tier'); end if;
  if p_fields ? 'curriculum' and p_fields ->> 'curriculum' is distinct from s.curriculum then v_changed := array_append(v_changed, 'curriculum'); end if;
  if cardinality(v_changed) = 0 then return; end if;

  update public.schools set
    school_phone = coalesce(p_fields ->> 'school_phone', school_phone),
    school_email = coalesce(p_fields ->> 'school_email', school_email),
    website = coalesce(p_fields ->> 'website', website),
    location = coalesce(p_fields ->> 'location', location),
    tier = coalesce(p_fields ->> 'tier', tier),
    curriculum = coalesce(p_fields ->> 'curriculum', curriculum),
    updated_at = now()
  where id = p_id;
  perform public._log(p_id, 'edit', 'Updated ' || array_to_string(v_changed, ', '));
end $$;

create or replace function public.admin_update_school(
  p_id bigint, p_status public.school_status default null,
  p_assigned_to uuid default null, p_set_assignee boolean default false
) returns void language plpgsql security definer set search_path = public as $$
declare s public.schools%rowtype;
begin
  perform public._require_role(array['admin']::public.app_role[]);
  select * into s from public.schools where id = p_id for update;
  if not found then perform public._fail('TM404', 'School not found'); end if;
  if p_status is not null and p_status <> s.status then
    perform public._set_school_status(p_id, p_status, true);
    perform public._log(p_id, 'status', 'Status changed from ' || replace(s.status::text, '_', ' ') || ' to ' || replace(p_status::text, '_', ' '));
  end if;
  if p_set_assignee then
    if p_assigned_to is not null and not exists (select 1 from public.profiles where id = p_assigned_to and role = 'telemarketer') then
      perform public._fail('TM400', 'Pick a telemarketer');
    end if;
    update public.schools set assigned_telemarketer_id = p_assigned_to, updated_at = now() where id = p_id;
    perform public._log(p_id, 'edit', 'Telemarketer assignment updated');
  end if;
end $$;

create or replace function public.assign_schools(p_ids bigint[], p_telemarketer_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  perform public._require_role(array['admin']::public.app_role[]);
  if p_telemarketer_id is not null and not exists (select 1 from public.profiles where id = p_telemarketer_id and role = 'telemarketer') then
    perform public._fail('TM400', 'Pick a telemarketer');
  end if;
  update public.schools set assigned_telemarketer_id = p_telemarketer_id, updated_at = now() where id = any (p_ids);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace function public.save_contact(
  p_school_id bigint, p_contact_id bigint, p_name text, p_position text default '',
  p_phone text default '', p_email text default '', p_linkedin text default ''
) returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  perform public._require_role(array['admin', 'telemarketer']::public.app_role[]);
  if coalesce(trim(p_name), '') = '' then perform public._fail('TM400', 'Contact name is required'); end if;
  if not exists (select 1 from public.schools where id = p_school_id) then perform public._fail('TM404', 'School not found'); end if;
  if p_contact_id is null then
    insert into public.contacts (school_id, name, position, phone, email, linkedin)
    values (p_school_id, trim(p_name), coalesce(p_position, ''), coalesce(p_phone, ''), coalesce(p_email, ''), coalesce(p_linkedin, ''))
    returning id into v_id;
    perform public._log(p_school_id, 'contact', 'Added contact ' || trim(p_name));
  else
    update public.contacts
    set name = trim(p_name), position = coalesce(p_position, ''), phone = coalesce(p_phone, ''),
        email = coalesce(p_email, ''), linkedin = coalesce(p_linkedin, '')
    where id = p_contact_id and school_id = p_school_id
    returning id into v_id;
    if v_id is null then perform public._fail('TM404', 'Contact not found'); end if;
    perform public._log(p_school_id, 'contact', 'Updated contact ' || trim(p_name));
  end if;
  return v_id;
exception when unique_violation then
  perform public._fail('TM409', 'This school already has a contact with that name and position');
end $$;

create or replace function public.mark_password_changed()
returns void language sql security definer set search_path = public as $$
  update public.profiles set must_change_password = false where id = auth.uid()
$$;

-- ---------- reporting ----------
create or replace function public.follow_up_summary(p_day_start timestamptz, p_day_end timestamptz, p_user uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_role public.app_role := public._require_role(array['admin', 'telemarketer']::public.app_role[]);
  v_user uuid := case when v_role = 'telemarketer' then auth.uid() else p_user end;
begin
  return (
    select jsonb_build_object(
      'overdue', count(*) filter (where due_at < p_day_start),
      'today', count(*) filter (where due_at >= p_day_start and due_at < p_day_end),
      'upcoming', count(*) filter (where due_at >= p_day_end),
      'dueNow', count(*) filter (where due_at <= now())
    )
    from public.follow_ups
    where status = 'pending' and (v_user is null or assigned_to = v_user)
  );
end $$;

create or replace function public.my_stats(p_day_start timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_role public.app_role := public._require_role(array['admin', 'telemarketer', 'sales']::public.app_role[]);
  v_uid uuid := auth.uid();
  v_week timestamptz := now() - interval '7 days';
begin
  if v_role = 'sales' then
    return jsonb_build_object(
      'upcoming', (select count(*) from public.meetings where sales_user_id = v_uid and status = 'scheduled' and start_at >= now()),
      'today', (select count(*) from public.meetings where sales_user_id = v_uid and status = 'scheduled'
                 and start_at >= p_day_start and start_at < p_day_start + interval '1 day'),
      'pendingOutcome', (select count(*) from public.meetings where sales_user_id = v_uid and status = 'scheduled' and end_at < now()),
      'completedWeek', (select count(*) from public.meetings where sales_user_id = v_uid and status = 'completed' and completed_at >= v_week)
    );
  end if;
  return jsonb_build_object(
    'callsToday', (select count(*) from public.calls where user_id = v_uid and created_at >= p_day_start),
    'callsWeek', (select count(*) from public.calls where user_id = v_uid and created_at >= v_week),
    'enquiriesWeek', (select count(*) from public.calls where user_id = v_uid and created_at >= v_week and outcome in ('interested', 'meeting_scheduled')),
    'visitsBookedWeek', (select count(*) from public.meetings where scheduled_by = v_uid and created_at >= v_week),
    'schoolsNotCalled', (select count(*) from public.schools where status = 'new')
  );
end $$;

create or replace function public.dashboard_stats(p_days int, p_tz text default 'Asia/Kolkata')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 1), 365);
  v_since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 365));
  v_tz text := case when exists (select 1 from pg_timezone_names where name = p_tz) then p_tz else 'UTC' end;
begin
  perform public._require_role(array['admin']::public.app_role[]);
  return jsonb_build_object(
    'days', v_days,
    'totals', jsonb_build_object(
      'schools', (select count(*) from public.schools),
      'contacts', (select count(*) from public.contacts),
      'schoolsContacted', (select count(*) from public.schools where status <> 'new'),
      'converted', (select count(*) from public.schools where status = 'converted'),
      'calls', (select count(*) from public.calls where created_at >= v_since),
      'schoolsCalled', (select count(distinct school_id) from public.calls where created_at >= v_since),
      'enquiries', (select count(*) from public.calls where created_at >= v_since and outcome in ('interested', 'meeting_scheduled')),
      'visitsBooked', (select count(*) from public.meetings where created_at >= v_since),
      'visitsCompleted', (select count(*) from public.meetings where status = 'completed' and completed_at >= v_since),
      'visitsUpcoming', (select count(*) from public.meetings where status = 'scheduled' and start_at >= now()),
      'visitsAwaitingOutcome', (select count(*) from public.meetings where status = 'scheduled' and end_at < now()),
      'followUpsPending', (select count(*) from public.follow_ups where status = 'pending'),
      'followUpsOverdue', (select count(*) from public.follow_ups where status = 'pending' and due_at < now())
    ),
    'statusCounts', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                     from (select status, count(*) as n from public.schools group by status) x),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'calls', calls, 'visitsBooked', booked, 'visitsDone', done) order by d), '[]'::jsonb)
              from (select d, sum(c)::int as calls, sum(b)::int as booked, sum(v)::int as done from (
                      select (created_at at time zone v_tz)::date as d, 1 as c, 0 as b, 0 as v from public.calls where created_at >= v_since
                      union all select (created_at at time zone v_tz)::date, 0, 1, 0 from public.meetings where created_at >= v_since
                      union all select (completed_at at time zone v_tz)::date, 0, 0, 1 from public.meetings where status = 'completed' and completed_at >= v_since
                    ) u group by d) dd),
    'telemarketers', (select coalesce(jsonb_agg(t order by t.active desc, t.calls desc), '[]'::jsonb) from (
        select p.id, p.full_name as name, p.active,
          (select count(*) from public.calls c where c.user_id = p.id and c.created_at >= v_since) as calls,
          (select count(distinct school_id) from public.calls c where c.user_id = p.id and c.created_at >= v_since) as "schoolsCalled",
          (select count(*) from public.calls c where c.user_id = p.id and c.created_at >= v_since and c.outcome in ('interested', 'meeting_scheduled')) as enquiries,
          (select count(*) from public.meetings m where m.scheduled_by = p.id and m.created_at >= v_since) as "visitsBooked",
          (select count(*) from public.follow_ups f where f.assigned_to = p.id and f.status = 'pending') as "followUpsPending",
          (select count(*) from public.follow_ups f where f.assigned_to = p.id and f.status = 'pending' and f.due_at < now()) as "followUpsOverdue",
          (select count(*) from public.schools s where s.assigned_telemarketer_id = p.id) as "schoolsAssigned",
          (select max(created_at) from public.calls c where c.user_id = p.id) as "lastCallAt"
        from public.profiles p where p.role = 'telemarketer') t),
    'sales', (select coalesce(jsonb_agg(t order by t.active desc, t.completed desc), '[]'::jsonb) from (
        select p.id, p.full_name as name, p.active,
          (select count(*) from public.meetings m where m.sales_user_id = p.id and m.status = 'scheduled' and m.start_at >= now()) as upcoming,
          (select count(*) from public.meetings m where m.sales_user_id = p.id and m.status = 'scheduled' and m.end_at < now()) as "awaitingOutcome",
          (select count(*) from public.meetings m where m.sales_user_id = p.id and m.status = 'completed' and m.completed_at >= v_since) as completed,
          (select count(*) from public.meetings m where m.sales_user_id = p.id and m.status in ('cancelled', 'no_show') and m.updated_at >= v_since) as cancelled,
          (select count(*) from public.meetings m where m.sales_user_id = p.id and m.outcome = 'converted' and m.completed_at >= v_since) as converted
        from public.profiles p where p.role = 'sales') t),
    'callOutcomes', (select coalesce(jsonb_agg(jsonb_build_object('outcome', outcome, 'count', n) order by n desc), '[]'::jsonb)
                     from (select outcome, count(*) as n from public.calls where created_at >= v_since group by outcome) x),
    'byTier', (select coalesce(jsonb_agg(jsonb_build_object('tier', tier, 'total', total, 'contacted', contacted, 'visitStage', visit, 'converted', conv) order by total desc), '[]'::jsonb)
               from (select tier, count(*) as total, count(*) filter (where status <> 'new') as contacted,
                       count(*) filter (where status in ('meeting_scheduled', 'meeting_done', 'converted')) as visit,
                       count(*) filter (where status = 'converted') as conv
                     from public.schools group by tier) x)
  );
end $$;

-- ---------- execute privileges ----------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.current_app_role(),
  public.can_see_school(bigint),
  public.log_call(uuid, bigint, public.call_outcome, text, text, bigint, timestamptz, text, jsonb, boolean),
  public.create_meeting(bigint, uuid, timestamptz, int, bigint, text, text, boolean),
  public.update_meeting(bigint, text, timestamptz, int, uuid, public.meeting_outcome, text, boolean),
  public.update_follow_up(bigint, timestamptz, text, public.follow_up_status, uuid),
  public.create_school(text, text, text, text, text, text, text),
  public.update_school_details(bigint, jsonb),
  public.admin_update_school(bigint, public.school_status, uuid, boolean),
  public.assign_schools(bigint[], uuid),
  public.save_contact(bigint, bigint, text, text, text, text, text),
  public.mark_password_changed(),
  public.follow_up_summary(timestamptz, timestamptz, uuid),
  public.my_stats(timestamptz),
  public.dashboard_stats(int, text)
to authenticated;

-- ===== 20261124000004_service_role.sql =====
-- Newer Supabase projects no longer grant API roles access to new objects by default.
-- The server-side service role (user management, CSV import) needs explicit grants.
-- It bypasses RLS by design, so it is only used after an admin check in the app.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

create schema if not exists ops;
create table if not exists ops.schema_migrations (name text primary key, applied_at timestamptz not null default now());
insert into ops.schema_migrations (name) values ('20261124000001_schema.sql') on conflict do nothing;
insert into ops.schema_migrations (name) values ('20261124000002_access.sql') on conflict do nothing;
insert into ops.schema_migrations (name) values ('20261124000003_functions.sql') on conflict do nothing;
insert into ops.schema_migrations (name) values ('20261124000004_service_role.sql') on conflict do nothing;
commit;
