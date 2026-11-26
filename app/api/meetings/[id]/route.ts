import { route, parseJson, parseId } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { meetingUpdateSchema } from '@/lib/shared/validation';
import { getMeetingDetail } from '@/lib/server/data/meetings';
import { updateMeeting } from '@/lib/server/data/mutations';

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>('meetings.get', async (_req, { params }) => {
  await requireApiUser();
  return getMeetingDetail(parseId((await params).id));
});

export const PATCH = route<Ctx>('meetings.update', async (req, { params }) => {
  await requireApiUser();
  await updateMeeting(parseId((await params).id), await parseJson(req, meetingUpdateSchema));
  return { ok: true };
});
