import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'csv-parse/sync';
import { mapCsvRows } from '@/lib/server/import/mapCsv';

const file = path.join(process.cwd(), 'data/seed/schools.csv');

describe.skipIf(!fs.existsSync(file))('bundled research CSV', () => {
  it('maps every row into schools and contacts', () => {
    const records: Record<string, string>[] = parse(fs.readFileSync(file, 'utf8'), { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true, trim: true });
    const { schools, contacts, skipped } = mapCsvRows(records);
    expect(records.length).toBe(1129);
    expect(schools.length).toBe(229);
    expect(contacts.length).toBe(1048);
    expect(skipped).toBe(0);
    expect(new Set(schools.map((s) => `${s.name}|${s.location}`)).size).toBe(schools.length);
  });
});
