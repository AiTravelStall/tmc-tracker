import { route, parseJson, parseId } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { logCallSchema } from '@/lib/shared/validation';
import { logCall } from '@/lib/server/data/mutations';

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>('schools.logCall', async (req, { params }) => {
  await requireApiUser(['admin', 'telemarketer']);
  return logCall(parseId((await params).id), await parseJson(req, logCallSchema));
});
