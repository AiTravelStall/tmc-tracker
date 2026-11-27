import 'server-only';
import { integrationEnv, type IntegrationEnv } from '../env';
import { AppError } from '../errors';
import { log } from '../log';
import { supabaseAdmin } from '../supabase';
import { phoneKey, phoneKeys } from '@/lib/shared/phone';
import { fetchCallsCreatedBetween, recordingUrl } from './client';
import { parseCall, type SalestrailCall } from './parse';
import { transcribe } from './transcribe';

const CURSOR_KEY = 'salestrail.created_cursor';
const FIRST_SYNC_DAYS = 30;
const OVERLAP_MS = 30 * 60_000;        // re-read the last 30 min: uploads can land slightly out of order
const MIN_SECONDS = 5;                 // shorter calls are rings/voicemail: not worth transcribing
const NO_RECORDING_AFTER_MS = 6 * 3_600_000; // recordings upload after the call; give up after 6 h
const MAX_ATTEMPTS = 3;
const TRANSCRIBE_PER_RUN = 4;          // keeps one run well inside Worker time and subrequest limits

export type SyncResult = { fetched: number; saved: number; unreadable: number; transcribed: number; noRecording: number; failed: number };

type Sb = ReturnType<typeof supabaseAdmin>;
type Match = { schoolId: number; contactId: number | null };

async function matchers(sb: Sb) {
  const [profiles, schools, contacts] = await Promise.all([
    sb.from('profiles').select('id, email'),
    sb.from('schools').select('id, school_phone'),
    sb.from('contacts').select('id, school_id, phone'),
  ]);
  for (const r of [profiles, schools, contacts]) if (r.error) throw new AppError('DB_ERROR', r.error.message);

  const byEmail = new Map((profiles.data ?? []).map((p) => [String(p.email).toLowerCase(), String(p.id)]));
  const byPhone = new Map<string, Match>();
  // A decision maker's own number is the more specific match, so it wins over the school line.
  for (const c of contacts.data ?? []) for (const k of phoneKeys(c.phone)) if (!byPhone.has(k)) byPhone.set(k, { schoolId: c.school_id, contactId: c.id });
  for (const s of schools.data ?? []) for (const k of phoneKeys(s.school_phone)) if (!byPhone.has(k)) byPhone.set(k, { schoolId: s.id, contactId: null });
  return { byEmail, byPhone };
}

async function saveCalls(sb: Sb, calls: SalestrailCall[]) {
  if (!calls.length) return 0;
  const { byEmail, byPhone } = await matchers(sb);
  const { data: existing, error } = await sb.from('call_recordings').select('id').in('id', calls.map((c) => c.id));
  if (error) throw new AppError('DB_ERROR', error.message);
  const known = new Set((existing ?? []).map((r) => r.id));

  const rows = calls.map((c) => {
    const key = phoneKey(c.number);
    const match = key ? byPhone.get(key) : undefined;
    return {
      id: c.id, user_id: byEmail.get(c.userEmail) ?? null, salestrail_user_email: c.userEmail, salestrail_user_name: c.userName,
      school_id: match?.schoolId ?? null, contact_id: match?.contactId ?? null, phone: c.number,
      inbound: c.inbound, answered: c.answered, started_at: c.startedAt, duration_seconds: c.durationSeconds,
      source: c.source, salestrail_created_at: c.createdAt, synced_at: new Date().toISOString(),
    };
  });
  // Only brand-new calls get a transcript status; re-synced ones keep theirs (and their transcript).
  const fresh = rows.filter((r) => !known.has(r.id)).map((r) => ({
    ...r, transcript_status: r.answered && r.duration_seconds >= MIN_SECONDS ? 'pending' : 'skipped',
  }));
  const updates = rows.filter((r) => known.has(r.id));
  for (const batch of [fresh, updates]) {
    if (!batch.length) continue;
    const { error: upErr } = await sb.from('call_recordings').upsert(batch, { onConflict: 'id' });
    if (upErr) throw new AppError('DB_ERROR', upErr.message);
  }
  return rows.length;
}

async function transcribePending(sb: Sb, cfg: IntegrationEnv) {
  const tally = { transcribed: 0, noRecording: 0, failed: 0 };
  const { data: queue, error } = await sb.from('call_recordings')
    .select('id, started_at, transcript_attempts').eq('transcript_status', 'pending')
    .order('started_at', { ascending: true }).limit(TRANSCRIBE_PER_RUN);
  if (error) throw new AppError('DB_ERROR', error.message);

  for (const call of queue ?? []) {
    try {
      const url = await recordingUrl(cfg, call.id);
      if (!url) {
        if (Date.now() - new Date(call.started_at).getTime() > NO_RECORDING_AFTER_MS) {
          await sb.from('call_recordings').update({ transcript_status: 'no_recording' }).eq('id', call.id);
          tally.noRecording++;
        }
        continue; // not uploaded yet: try again next run
      }
      const audioRes = await fetch(url);
      if (!audioRes.ok) throw new Error(`recording download failed (${audioRes.status})`);
      const t = await transcribe(await audioRes.blob(), cfg.GROQ_API_KEY);
      await sb.from('call_recordings').update({
        transcript_status: 'done', transcript: t.text, transcript_segments: t.segments, transcript_language: t.language,
        transcript_provider: t.provider, transcript_error: null, transcribed_at: new Date().toISOString(),
        transcript_attempts: call.transcript_attempts + 1,
      }).eq('id', call.id);
      tally.transcribed++;
    } catch (e) {
      if (e instanceof AppError && e.code === 'NOT_CONFIGURED') throw e; // bad credentials: stop the run
      const attempts = call.transcript_attempts + 1;
      const message = e instanceof Error ? e.message : String(e);
      await sb.from('call_recordings').update({
        transcript_attempts: attempts, transcript_error: message.slice(0, 500),
        ...(attempts >= MAX_ATTEMPTS ? { transcript_status: 'failed' } : {}),
      }).eq('id', call.id);
      if (attempts >= MAX_ATTEMPTS) tally.failed++;
      log.warn('transcription failed', { call: call.id, attempts, error: message });
    }
  }
  return tally;
}

/** One sync pass: pull new calls from Salestrail, then transcribe a few waiting recordings. */
export async function runSalestrailSync(): Promise<SyncResult> {
  const cfg = integrationEnv();
  if (!cfg) throw new AppError('NOT_CONFIGURED', 'Salestrail is not connected yet');
  const sb = supabaseAdmin();

  const { data: state } = await sb.from('integration_state').select('value').eq('key', CURSOR_KEY).maybeSingle();
  const cursor = typeof state?.value?.at === 'string' ? new Date(state.value.at) : null;
  const to = new Date();
  const from = cursor ? new Date(cursor.getTime() - OVERLAP_MS) : new Date(to.getTime() - FIRST_SYNC_DAYS * 86_400_000);

  const rows = await fetchCallsCreatedBetween(cfg, from, to);
  const calls = rows.map(parseCall).filter((c): c is SalestrailCall => c !== null);
  const unreadable = rows.length - calls.length;
  if (unreadable) log.warn('salestrail rows not understood', { count: unreadable, fields: Object.keys(rows[0] ?? {}) });

  const saved = await saveCalls(sb, calls);
  const { error } = await sb.from('integration_state')
    .upsert({ key: CURSOR_KEY, value: { at: to.toISOString() }, updated_at: to.toISOString() }, { onConflict: 'key' });
  if (error) throw new AppError('DB_ERROR', error.message);

  const tally = await transcribePending(sb, cfg);
  const result = { fetched: rows.length, saved, unreadable, ...tally };
  log.info('salestrail sync', result);
  return result;
}
