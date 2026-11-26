import { route, parseJson, parseId } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { schoolPatchSchema } from '@/lib/shared/validation';
import { patchSchool } from '@/lib/server/data/mutations';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>('schools.patch', async (req, { params }) => {
  const user = await requireApiUser(['admin', 'telemarketer']);
  await patchSchool(user, parseId((await params).id), await parseJson(req, schoolPatchSchema));
  return { ok: true };
});
