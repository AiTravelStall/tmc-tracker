import type { ApiError, ApiErrorCode } from '@/types/api';

const STATUS: Record<ApiErrorCode, number> = {
  INVALID_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  NOT_CONFIGURED: 503,
  DB_ERROR: 502,
  INTERNAL: 500,
};

/** Typed application error; route handlers translate it into the API envelope. */
export class AppError extends Error {
  constructor(public code: ApiErrorCode, message: string, public details?: unknown) {
    super(message);
    this.name = 'AppError';
  }
  get status() {
    return STATUS[this.code];
  }
  toJSON(): ApiError {
    return this.details === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, details: this.details };
  }
}

// SQLSTATEs raised by our Postgres functions (see migrations/..._functions.sql).
const SQLSTATE: Record<string, ApiErrorCode> = {
  TM400: 'INVALID_REQUEST',
  TM403: 'FORBIDDEN',
  TM404: 'NOT_FOUND',
  TM409: 'CONFLICT',
  '42501': 'FORBIDDEN', // insufficient_privilege
  '23505': 'CONFLICT', // unique_violation
  '22P02': 'INVALID_REQUEST', // invalid_text_representation (bad enum / uuid)
  '22007': 'INVALID_REQUEST', // invalid_datetime_format
};

type PgError = { code?: string; message?: string; details?: string | null };

/** Map a PostgREST/Postgres error to an AppError. Only our own TM* messages are shown to users. */
export function fromDbError(err: PgError): AppError {
  const code = (err.code && SQLSTATE[err.code]) || 'DB_ERROR';
  const ours = err.code?.startsWith('TM');
  let details: unknown;
  if (ours && err.details) {
    try { details = JSON.parse(err.details); } catch { details = undefined; }
  }
  const message = ours ? (err.message ?? 'Request failed')
    : code === 'FORBIDDEN' ? 'You do not have access to this'
    : code === 'CONFLICT' ? 'That record already exists'
    : code === 'INVALID_REQUEST' ? 'Some of the values sent are not valid'
    : 'The database could not complete this request. Please try again.';
  return new AppError(code, message, details);
}
