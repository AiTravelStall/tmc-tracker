import { z } from 'zod';
import { route, parseJson } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { userUpdateSchema } from '@/lib/shared/validation';
import { updateUser } from '@/lib/server/data/adminUsers';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>('users.update', async (req, { params }) => {
  const actor = await requireApiUser(['admin']);
  const id = z.string().uuid().parse((await params).id);
  return updateUser(actor, id, await parseJson(req, userUpdateSchema));
});
