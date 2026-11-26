import 'server-only';
import { parse } from 'csv-parse/sync';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError, fromDbError } from '../errors';
import { mapCsvRows } from './mapCsv';

export type ImportStats = { rows: number; schools: number; contacts: number; skipped: number };

/**
 * Upsert the research CSV (one row per decision maker). Idempotent: schools match on
 * (name, location), contacts on (school, name, position); tracker state
 * (status, calls, follow-ups, meetings) is never touched.
 * Must be given the service-role client, after an admin check.
 */
export async function importSchoolsCsv(sb: SupabaseClient, csv: string): Promise<ImportStats> {
  let records: Record<string, string>[];
  try {
    records = parse(csv, { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true, trim: true });
  } catch {
    throw new AppError('INVALID_REQUEST', 'Could not read the CSV file');
  }
  if (!records.length || !('School Name' in records[0]!)) throw new AppError('INVALID_REQUEST', 'CSV must have a "School Name" column');

  const { schools, contacts, skipped } = mapCsvRows(records);

  const ids = new Map<string, number>();
  for (let i = 0; i < schools.length; i += 500) {
    const { data, error } = await sb.from('schools')
      .upsert(schools.slice(i, i + 500), { onConflict: 'name,location' })
      .select('id, name, location');
    if (error) throw fromDbError(error);
    for (const s of data ?? []) ids.set(`${s.name}\u0000${s.location}`, Number(s.id));
  }

  const contactRows = contacts.map(({ schoolKey, ...c }) => ({ ...c, school_id: ids.get(schoolKey)! }));
  for (let i = 0; i < contactRows.length; i += 500) {
    const { error } = await sb.from('contacts').upsert(contactRows.slice(i, i + 500), { onConflict: 'school_id,name,position' });
    if (error) throw fromDbError(error);
  }
  return { rows: records.length, schools: schools.length, contacts: contactRows.length, skipped };
}
