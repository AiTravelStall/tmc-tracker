// Apply supabase/migrations/*.sql in order, once each, recording them in ops.schema_migrations.
// Usage: npm run db:migrate [-- --dry-run]
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const dryRun = process.argv.includes('--dry-run');
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Add the Supabase "Session pooler" connection string to .env.local.');
  process.exit(1);
}

const dir = path.join(process.cwd(), 'supabase', 'migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  await sql`create schema if not exists ops`;
  await sql`create table if not exists ops.schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set((await sql<{ name: string }[]>`select name from ops.schema_migrations`).map((r) => r.name));
  const pending = files.filter((f) => !applied.has(f));
  if (!pending.length) console.log('Database is up to date.');
  for (const file of pending) {
    if (dryRun) { console.log(`[dry-run] would apply ${file}`); continue; }
    const body = fs.readFileSync(path.join(dir, file), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into ops.schema_migrations (name) values (${file})`;
    });
    console.log(`Applied ${file}`);
  }
} catch (err) {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
