import 'server-only';
import type { FollowUp, Profile } from '@/types/domain';
import { supabaseForUser } from '../supabase';
import { unwrap } from './query';
import { mapFollowUp } from './mappers';
import { dayBounds } from '@/lib/shared/time';

export type FollowUpScope = 'overdue' | 'today' | 'upcoming' | 'done';

/** Telemarketers see their own queue; admins see everyone's or one person's. */
export async function listFollowUps(user: Profile, scope: FollowUpScope, assignee?: string): Promise<FollowUp[]> {
  const sb = await supabaseForUser();
  const { start, end } = dayBounds();
  let q = sb.from('follow_up_list').select('*');
  const who = user.role === 'telemarketer' ? user.id : assignee;
  if (who) q = q.eq('assigned_to', who);
  if (scope === 'done') {
    q = q.in('status', ['done', 'cancelled']).order('completed_at', { ascending: false, nullsFirst: false });
  } else {
    q = q.eq('status', 'pending');
    if (scope === 'overdue') q = q.lt('due_at', start);
    if (scope === 'today') q = q.gte('due_at', start).lt('due_at', end);
    if (scope === 'upcoming') q = q.gte('due_at', end);
    q = q.order('due_at', { ascending: true });
  }
  return (unwrap(await q.limit(500)) ?? []).map(mapFollowUp);
}

export async function followUpSummary(assignee?: string) {
  const sb = await supabaseForUser();
  const { start, end } = dayBounds();
  const data = unwrap(await sb.rpc('follow_up_summary', { p_day_start: start, p_day_end: end, p_user: assignee ?? null }));
  return data as { overdue: number; today: number; upcoming: number; dueNow: number };
}

/** Follow-ups that fell due in the last `minutes`, for in-app reminders. */
export async function recentlyDue(user: Profile, minutes = 120): Promise<FollowUp[]> {
  const sb = await supabaseForUser();
  const now = new Date();
  let q = sb.from('follow_up_list').select('*').eq('status', 'pending')
    .lte('due_at', now.toISOString()).gte('due_at', new Date(now.getTime() - minutes * 60000).toISOString());
  if (user.role === 'telemarketer') q = q.eq('assigned_to', user.id);
  return (unwrap(await q.order('due_at', { ascending: false }).limit(20)) ?? []).map(mapFollowUp);
}
