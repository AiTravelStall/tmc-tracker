import { route, parseJson, parseId } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { contactSchema } from '@/lib/shared/validation';
import { saveContact } from '@/lib/server/data/mutations';

type Ctx = { params: Promise<{ id: string; contactId: string }> };

export const PATCH = route<Ctx>('contacts.update', async (req, { params }) => {
  await requireApiUser(['admin', 'telemarketer']);
  const p = await params;
  return { id: await saveContact(parseId(p.id), parseId(p.contactId, 'contact id'), await parseJson(req, contactSchema)) };
});
