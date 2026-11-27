// Salestrail call rows → our shape. The Pull API's JSON fields aren't documented; the Push API
// payload is (callId, userEmail, userName, number, formattedNumber, inbound, answered, startTime,
// duration, source, sourceDetail, createdAt), so we read those names first and accept a few
// common variants. Rows without an id or start time are rejected rather than guessed.

export type SalestrailCall = {
  id: string;
  userEmail: string;
  userName: string;
  number: string;
  inbound: boolean;
  answered: boolean;
  startedAt: string;
  durationSeconds: number;
  source: string;
  createdAt: string | null;
};

type Row = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pick = (r: Row, ...keys: string[]) => {
  for (const k of keys) if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
  return undefined;
};
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const bool = (v: unknown) => v === true || v === 'true' || v === 1 || v === '1';
const iso = (v: unknown): string | null => {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export function parseCall(r: Row): SalestrailCall | null {
  const id = text(pick(r, 'callId', 'id', 'uuid', 'call_id')).toLowerCase();
  const startedAt = iso(pick(r, 'startTime', 'start_time', 'startedAt', 'started_at'));
  if (!UUID.test(id) || !startedAt) return null;

  const direction = text(pick(r, 'direction')).toLowerCase();
  const inbound = r.inbound !== undefined ? bool(r.inbound) : direction.startsWith('in');
  const duration = Number(pick(r, 'duration', 'durationSeconds', 'duration_seconds') ?? 0);

  return {
    id,
    userEmail: text(pick(r, 'userEmail', 'user_email', 'email')).toLowerCase(),
    userName: text(pick(r, 'userName', 'user_name')),
    number: text(pick(r, 'formattedNumber', 'number', 'phoneNumber', 'phone_number', 'phone')),
    inbound,
    answered: bool(pick(r, 'answered', 'isAnswered')),
    startedAt,
    durationSeconds: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0,
    source: [text(r.source), text(r.sourceDetail)].filter(Boolean).join(' · '),
    createdAt: iso(pick(r, 'createdAt', 'created_at')),
  };
}

/** The list endpoint may return a bare array or wrap it; find the array of call objects. */
export function callRows(body: unknown): Row[] {
  if (Array.isArray(body)) return body.filter((x): x is Row => typeof x === 'object' && x !== null);
  if (body && typeof body === 'object') {
    for (const key of ['calls', 'data', 'items', 'results', 'content']) {
      const v = (body as Row)[key];
      if (Array.isArray(v)) return callRows(v);
    }
  }
  return [];
}
