// Browser-side fetch wrapper for our own /api routes. Unwraps the { code, message } envelope.
import type { ApiError, ApiErrorCode } from '@/types/api';

export class ClientApiError extends Error {
  constructor(public code: ApiErrorCode, message: string, public status: number, public details?: unknown) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${url}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': typeof body === 'string' ? 'text/csv' : 'application/json' },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ClientApiError('INTERNAL', 'Network error — check your connection and try again.', 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data ?? {}) as Partial<ApiError>;
    if (res.status === 401 && typeof window !== 'undefined') window.location.assign('/login');
    throw new ClientApiError(err.code ?? 'INTERNAL', err.message ?? `Request failed (${res.status})`, res.status, err.details);
  }
  return data as T;
}

export const api = {
  get: <T>(url: string, params?: Record<string, string | undefined | null>) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString() : '';
    return request<T>('GET', qs ? `${url}?${qs}` : url);
  },
  post: <T>(url: string, body: unknown = {}) => request<T>('POST', url, body),
  patch: <T>(url: string, body: unknown) => request<T>('PATCH', url, body),
};
