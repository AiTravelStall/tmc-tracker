import 'server-only';
import type { Profile, SchoolDetail, SchoolListItem } from '@/types/domain';
import type { SchoolFilters } from '@/lib/shared/validation';
import { supabaseForUser } from '../supabase';
import { AppError } from '../errors';
import { likeEscape, unwrap } from './query';
import { mapActivity, mapCall, mapContact, mapFollowUp, mapMeeting, mapSchool, mapSchoolListItem } from './mappers';

const SORTS: Record<string, { column: string; ascending: boolean }> = {
  name: { column: 'name', ascending: true },
  recent: { column: 'last_contacted_at', ascending: false },
  followup: { column: 'next_follow_up_at', ascending: true },
  status: { column: 'status', ascending: true },
};
export const PAGE_SIZE = 50;

export async function listSchools(user: Profile, f: SchoolFilters): Promise<{ rows: SchoolListItem[]; total: number }> {
  const sb = await supabaseForUser();
  let q = sb.from('school_list').select('*', { count: 'exact' });
  if (f.q) q = q.ilike('search_text', `%${likeEscape(f.q.toLowerCase())}%`);
  if (f.status) q = q.eq('status', f.status);
  if (f.tier) q = q.eq('tier', f.tier);
  if (f.curriculum) q = q.eq('curriculum', f.curriculum);
  if (f.location) q = q.ilike('location', `%${likeEscape(f.location)}%`);
  if (f.assigned === 'me') q = q.eq('assigned_telemarketer_id', user.id);
  else if (f.assigned === 'none') q = q.is('assigned_telemarketer_id', null);
  else if (f.assigned) q = q.eq('assigned_telemarketer_id', f.assigned);
  const sort = SORTS[f.sort ?? 'name'] ?? SORTS.name!;
  q = q.order(sort.column, { ascending: sort.ascending, nullsFirst: false }).order('name');
  const from = (f.page - 1) * PAGE_SIZE;
  const res = await q.range(from, from + PAGE_SIZE - 1);
  const rows = unwrap(res) ?? [];
  return { rows: rows.map(mapSchoolListItem), total: res.count ?? 0 };
}

export async function getSchoolFilterOptions() {
  const sb = await supabaseForUser();
  const rows = unwrap(await sb.from('schools').select('tier, curriculum, location')) ?? [];
  const uniq = (k: 'tier' | 'curriculum' | 'location') =>
    [...new Set(rows.map((r) => String(r[k] ?? '')).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const locations = uniq('location');
  return {
    tiers: uniq('tier'),
    curricula: uniq('curriculum'),
    cities: [...new Set(locations.map((l) => l.split(',').pop()!.trim()))].sort(),
    areas: locations.filter((l) => l.includes(',')),
  };
}

export async function getSchoolDetail(id: number): Promise<SchoolDetail> {
  const sb = await supabaseForUser();
  const school = unwrap(await sb.from('schools').select('*').eq('id', id).maybeSingle()) as Record<string, unknown> | null;
  if (!school) throw new AppError('NOT_FOUND', 'School not found, or it is not on your schedule');
  const [assignee, contacts, calls, followUps, meetings, activities] = await Promise.all([
    school.assigned_telemarketer_id
      ? sb.from('profiles').select('full_name').eq('id', String(school.assigned_telemarketer_id)).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    sb.from('contacts').select('*').eq('school_id', id).order('priority', { ascending: true }).order('id'),
    sb.from('call_list').select('*').eq('school_id', id).order('created_at', { ascending: false }),
    sb.from('follow_up_list').select('*').eq('school_id', id).order('due_at', { ascending: false }),
    sb.from('meeting_list').select('*').eq('school_id', id).order('start_at', { ascending: false }),
    sb.from('activity_list').select('*').eq('school_id', id).order('created_at', { ascending: false }).limit(200),
  ]);
  return {
    school: { ...mapSchool(school), assignedName: (unwrap(assignee) as { full_name?: string } | null)?.full_name ?? null },
    contacts: (unwrap(contacts) ?? []).map(mapContact),
    calls: (unwrap(calls) ?? []).map(mapCall),
    // Sales cannot read follow-ups (RLS); an empty list is the correct view for them.
    followUps: (followUps.error ? [] : followUps.data ?? []).map(mapFollowUp),
    meetings: (unwrap(meetings) ?? []).map(mapMeeting),
    activities: (unwrap(activities) ?? []).map(mapActivity),
  };
}
