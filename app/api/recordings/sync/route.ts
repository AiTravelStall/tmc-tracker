import { route } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { runSalestrailSync } from '@/lib/server/salestrail/sync';

// "Sync now" on the Recordings page: the same pass the cron runs, on demand.
export const POST = route('recordings.sync', async () => {
  await requireApiUser(['admin']);
  return runSalestrailSync();
});
