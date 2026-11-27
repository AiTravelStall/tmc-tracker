import { route } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rateLimit';
import { runSalestrailSync } from '@/lib/server/salestrail/sync';

// "Refetch recordings" on the Recordings page. Any signed-in user may run it (it only
// imports calls; what each person can then see is still limited by RLS).
export const POST = route('recordings.sync', async () => {
  const user = await requireApiUser();
  rateLimit(`recordings-sync:${user.id}`, 6, 60_000);
  return runSalestrailSync();
});
