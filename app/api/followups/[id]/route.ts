import { route, parseJson, parseId } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { followUpUpdateSchema } from '@/lib/shared/validation';
import { updateFollowUp } from '@/lib/server/data/mutations';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>('followups.update', async (req, { params }) => {
  await requireApiUser(['admin', 'telemarketer']);
  await updateFollowUp(parseId((await params).id), await parseJson(req, followUpUpdateSchema));
  return { ok: true };
});
