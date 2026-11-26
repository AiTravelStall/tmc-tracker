import { route, parseJson } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { assignSchoolsSchema } from '@/lib/shared/validation';
import { assignSchools } from '@/lib/server/data/mutations';

export const POST = route('schools.assign', async (req) => {
  await requireApiUser(['admin']);
  return { updated: await assignSchools(await parseJson(req, assignSchoolsSchema)) };
});
