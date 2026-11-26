import { route, parseJson } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { userCreateSchema } from '@/lib/shared/validation';
import { createUser } from '@/lib/server/data/adminUsers';

export const POST = route('users.create', async (req) => {
  const actor = await requireApiUser(['admin']);
  return createUser(actor, await parseJson(req, userCreateSchema));
});
