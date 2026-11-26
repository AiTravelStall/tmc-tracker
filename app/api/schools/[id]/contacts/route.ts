import { route, parseJson, parseId } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { contactSchema } from '@/lib/shared/validation';
import { saveContact } from '@/lib/server/data/mutations';

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>('contacts.create', async (req, { params }) => {
  await requireApiUser(['admin', 'telemarketer']);
  return { id: await saveContact(parseId((await params).id), null, await parseJson(req, contactSchema)) };
});
