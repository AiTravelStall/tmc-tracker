import 'server-only';
import type { Meeting, MeetingDetail, MeetingStatus } from '@/types/domain';
import { supabaseForUser } from '../supabase';
import { AppError } from '../errors';
import { unwrap } from './query';
import { mapCall, mapContact, mapMeeting, mapSchool } from './mappers';

export type MeetingQuery = {
  from?: string; to?: string; salesUserId?: string; statuses?: MeetingStatus[];
  endedBefore?: string; order?: 'asc' | 'desc'; limit?: number;
};

/** RLS already limits sales people to their own visits. */
export async function listMeetings(q: MeetingQuery): Promise<Meeting[]> {
  const sb = await supabaseForUser();
  let query = sb.from('meeting_list').select('*');
  if (q.salesUserId) query = query.eq('sales_user_id', q.salesUserId);
  if (q.from) query = query.gte('end_at', q.from);
  if (q.to) query = query.lt('start_at', q.to);
  if (q.endedBefore) query = query.lt('end_at', q.endedBefore);
  if (q.statuses?.length) query = query.in('status', q.statuses);
  query = query.order('start_at', { ascending: q.order !== 'desc' }).limit(q.limit ?? 1000);
  return (unwrap(await query) ?? []).map(mapMeeting);
}

export async function getMeetingDetail(id: number): Promise<MeetingDetail> {
  const sb = await supabaseForUser();
  const row = unwrap(await sb.from('meeting_list').select('*').eq('id', id).maybeSingle());
  if (!row) throw new AppError('NOT_FOUND', 'Visit not found');
  const meeting = mapMeeting(row);
  const [school, contacts, calls] = await Promise.all([
    sb.from('schools').select('*').eq('id', meeting.schoolId).single(),
    sb.from('contacts').select('*').eq('school_id', meeting.schoolId).order('id'),
    sb.from('call_list').select('*').eq('school_id', meeting.schoolId).order('created_at', { ascending: false }).limit(20),
  ]);
  return {
    meeting,
    school: mapSchool(unwrap(school)),
    contacts: (unwrap(contacts) ?? []).map(mapContact),
    calls: (unwrap(calls) ?? []).map(mapCall),
  };
}
