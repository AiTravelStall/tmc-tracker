import 'server-only';
import type { CallRecording, CallRecordingDetail } from '@/types/domain';
import { supabaseForUser } from '../supabase';
import { AppError } from '../errors';
import { unwrap } from './query';
import { mapCallRecording, mapCallRecordingDetail } from './mappers';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// RLS on call_recordings decides visibility: admins see all, others only their own calls.
export async function listRecordings(opts: { userId?: string; schoolId?: number; before?: string; limit?: number } = {}): Promise<CallRecording[]> {
  const sb = await supabaseForUser();
  let q = sb.from('call_recording_list').select('*');
  if (opts.userId) q = q.eq('user_id', opts.userId);
  if (opts.schoolId) q = q.eq('school_id', opts.schoolId);
  if (opts.before) q = q.lt('started_at', opts.before);
  return (unwrap(await q.order('started_at', { ascending: false }).limit(opts.limit ?? 50)) ?? []).map(mapCallRecording);
}

export async function getRecording(id: string): Promise<CallRecordingDetail> {
  if (!UUID.test(id)) throw new AppError('NOT_FOUND', 'Recording not found');
  const sb = await supabaseForUser();
  const [list, full] = await Promise.all([
    sb.from('call_recording_list').select('*').eq('id', id).maybeSingle(),
    sb.from('call_recordings').select('transcript, transcript_segments, transcript_provider, transcript_error').eq('id', id).maybeSingle(),
  ]);
  const row = unwrap(list);
  if (!row) throw new AppError('NOT_FOUND', 'Recording not found');
  return mapCallRecordingDetail(row, unwrap(full) ?? {});
}

/** When the last sync ran, for the "last synced" note. Null if never (or not visible). */
export async function lastSyncedAt(): Promise<string | null> {
  const sb = await supabaseForUser();
  const { data } = await sb.from('call_recordings').select('synced_at').order('synced_at', { ascending: false }).limit(1).maybeSingle();
  return data?.synced_at ?? null;
}
