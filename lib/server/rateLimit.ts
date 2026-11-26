import 'server-only';
import { AppError } from './errors';

// Fixed-window limiter held in process memory. Good enough for a single Node instance;
// on serverless/multi-instance hosting swap for Upstash Ratelimit (design doc §10.5).
// Supabase Auth applies its own per-IP limits on sign-in as a second layer.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    return;
  }
  b.count += 1;
  if (b.count > limit) {
    throw new AppError('RATE_LIMITED', `Too many attempts. Try again in ${Math.ceil((b.resetAt - now) / 60000)} min.`);
  }
}

export function clientIp(req: Request) {
  return req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}
