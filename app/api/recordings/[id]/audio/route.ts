import { route } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { integrationEnv } from '@/lib/server/env';
import { AppError } from '@/lib/server/errors';
import { getRecording } from '@/lib/server/data/recordings';
import { recordingUrl } from '@/lib/server/salestrail/client';

type Ctx = { params: Promise<{ id: string }> };

// Plays a recording without storing it: check the viewer may see this call (RLS), then
// redirect to the short-lived download link Salestrail issues for it.
export const GET = route<Ctx>('recordings.audio', async (_req, { params }) => {
  await requireApiUser();
  const call = await getRecording((await params).id); // NOT_FOUND if not visible to this user
  const cfg = integrationEnv();
  if (!cfg) throw new AppError('NOT_CONFIGURED', 'Salestrail is not connected yet');
  const url = await recordingUrl(cfg, call.id);
  if (!url) throw new AppError('NOT_FOUND', 'This call has no recording');
  return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'no-store' } });
});
