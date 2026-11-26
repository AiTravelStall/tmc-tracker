import { route, parseJson } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { schoolCreateSchema } from '@/lib/shared/validation';
import { createSchool } from '@/lib/server/data/mutations';

export const POST = route('schools.create', async (req) => {
  await requireApiUser(['admin', 'telemarketer']);
  return { id: await createSchool(await parseJson(req, schoolCreateSchema)) };
});
