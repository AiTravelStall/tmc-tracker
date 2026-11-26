import 'server-only';
import type { Activity } from '@/types/domain';
import { supabaseForUser } from '../supabase';
import { unwrap } from './query';
import { mapActivity } from './mappers';

export async function listActivity(opts: { userId?: string; before?: string; limit?: number } = {}): Promise<Activity[]> {
  const sb = await supabaseForUser();
  let q = sb.from('activity_list').select('*');
  if (opts.userId) q = q.eq('user_id', opts.userId);
  if (opts.before) q = q.lt('created_at', opts.before);
  return (unwrap(await q.order('created_at', { ascending: false }).limit(opts.limit ?? 100)) ?? []).map(mapActivity);
}
