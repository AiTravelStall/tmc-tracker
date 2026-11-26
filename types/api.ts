// Uniform API error envelope (design doc §10.2). Every /api route returns this on failure.
export const API_ERROR_CODES = [
  'INVALID_REQUEST',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'NOT_CONFIGURED',
  'DB_ERROR',
  'INTERNAL',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export type ApiError = {
  code: ApiErrorCode;
  /** Human-readable, safe to show to the user. */
  message: string;
  /** Optional structured data, e.g. clashing visits for CONFLICT. */
  details?: unknown;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };
