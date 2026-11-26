import { route } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase';
import { importSchoolsCsv } from '@/lib/server/import/schools';
import { AppError } from '@/lib/server/errors';
import { log } from '@/lib/server/log';

const MAX_CSV_BYTES = 10_000_000;
export const maxDuration = 60;

export const POST = route('admin.import', async (req) => {
  const actor = await requireApiUser(['admin']);
  if (Number(req.headers.get('content-length') ?? 0) > MAX_CSV_BYTES) throw new AppError('INVALID_REQUEST', 'CSV is larger than 10 MB');
  const csv = await req.text();
  if (!csv.trim()) throw new AppError('INVALID_REQUEST', 'Upload a CSV file');
  const sb = supabaseAdmin();
  const stats = await importSchoolsCsv(sb, csv);
  await sb.from('activities').insert({ user_id: actor.id, type: 'import', message: `Imported CSV: ${stats.rows} rows, ${stats.schools} schools, ${stats.contacts} contacts` });
  log.info('csv imported', { actor: actor.id, ...stats });
  return stats;
});
