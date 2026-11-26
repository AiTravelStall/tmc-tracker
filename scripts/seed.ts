// Import the research CSV into Supabase. Safe to re-run (upserts).
// Usage: npm run db:seed [-- path/to/file.csv]
import fs from 'node:fs';
import path from 'node:path';
import { supabaseAdmin } from '@/lib/server/supabase';
import { importSchoolsCsv } from '@/lib/server/import/schools';

const file = process.argv[2] ?? path.join(process.cwd(), 'data', 'seed', 'schools.csv');
const stats = await importSchoolsCsv(supabaseAdmin(), fs.readFileSync(file, 'utf8'));
console.log(`Imported ${path.basename(file)}:`, stats);
