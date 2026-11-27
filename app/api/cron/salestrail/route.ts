import { route } from '@/lib/server/http';
import { integrationEnv } from '@/lib/server/env';
import { AppError } from '@/lib/server/errors';
import { runSalestrailSync } from '@/lib/server/salestrail/sync';

// Called every 10 minutes by the Worker's cron trigger (worker.ts). No user session here,
// so it is public in proxy.ts and authenticated by CRON_SECRET instead.
function sameSecret(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const POST = route('cron.salestrail', async (req) => {
  const cfg = integrationEnv();
  if (!cfg) throw new AppError('NOT_CONFIGURED', 'Salestrail is not connected yet');
  const given = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!sameSecret(given, cfg.CRON_SECRET)) throw new AppError('UNAUTHENTICATED', 'Invalid cron secret');
  return runSalestrailSync();
});
