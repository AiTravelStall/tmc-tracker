import { route, parseJson } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { meetingCreateSchema, meetingRangeSchema } from '@/lib/shared/validation';
import { listMeetings } from '@/lib/server/data/meetings';
import { createMeeting } from '@/lib/server/data/mutations';

// Calendar feed. Sales people only ever get their own visits (enforced by RLS).
export const GET = route('meetings.list', async (req) => {
  await requireApiUser();
  const q = meetingRangeSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return listMeetings({ from: q.from, to: q.to, salesUserId: q.salesUserId, statuses: q.status ? [q.status] : undefined });
});

export const POST = route('meetings.create', async (req) => {
  await requireApiUser(['admin', 'telemarketer']);
  return { id: await createMeeting(await parseJson(req, meetingCreateSchema)) };
});
