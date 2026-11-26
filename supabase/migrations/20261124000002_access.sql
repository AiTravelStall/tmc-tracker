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
