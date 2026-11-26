import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { AppError } from './errors';
import { EnvError } from './env';
import { log } from './log';

const MAX_JSON_BYTES = 1_000_000;
const NO_STORE = { 'Cache-Control': 'no-store' };

type Handler<C> = (req: Request, ctx: C) => Promise<unknown>;

/**
 * Wrap a route handler: JSON success body, uniform { code, message } errors,
 * no-store caching and one structured log line per failure.
 */
export function route<C = unknown>(name: string, handler: Handler<C>) {
  return async (req: Request, ctx: C) => {
    const started = Date.now();
    try {
      const data = await handler(req, ctx);
      if (data instanceof Response) return data;
      return NextResponse.json(data ?? { ok: true }, { headers: NO_STORE });
    } catch (err) {
      const e = toAppError(err);
      const fields = { route: name, method: req.method, code: e.code, status: e.status, durationMs: Date.now() - started };
      if (e.status >= 500) log.error('request failed', { ...fields, error: err instanceof Error ? err.message : String(err) });
      else log.info('request rejected', fields);
      return NextResponse.json(e.toJSON(), { status: e.status, headers: NO_STORE });
    }
  };
}

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) return new AppError('INVALID_REQUEST', err.issues[0]?.message ?? 'Invalid request');
  if (err instanceof EnvError) return new AppError('NOT_CONFIGURED', 'The server is not configured yet. Ask an admin to set the Supabase keys.');
  return new AppError('INTERNAL', 'Something went wrong. Please try again.');
}

/** Read and validate a JSON body against a zod schema shared with the client form. */
export async function parseJson<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.output<S>> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > MAX_JSON_BYTES) throw new AppError('INVALID_REQUEST', 'Request is too large');
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('INVALID_REQUEST', 'Request body must be JSON');
  }
  return schema.parse(body);
}

export function parseId(value: string, label = 'id'): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new AppError('INVALID_REQUEST', `Invalid ${label}`);
  return n;
}
