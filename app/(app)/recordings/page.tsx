import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { AudioLines, ChevronRight, ChevronsLeft, PlugZap } from 'lucide-react';
import { requirePageUser } from '@/lib/server/auth';
import { integrationEnv } from '@/lib/server/env';
import { lastSyncedAt, listRecordings } from '@/lib/server/data/recordings';
import { listDirectory } from '@/lib/server/data/users';
import { fmtDateTime } from '@/lib/shared/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { buttonClass } from '@/components/ui/Button';
import { PersonFilter } from '@/components/sections/followups/PersonFilter';
import { RecordingsTable } from '@/components/sections/recordings/RecordingsTable';
import { SyncButton } from '@/components/sections/recordings/SyncButton';

export const metadata: Metadata = { title: 'Recordings' };
const PAGE = 50;

const querySchema = z.object({
  user: z.string().uuid().optional().catch(undefined),
  before: z.string().datetime({ offset: true }).optional().catch(undefined),
});

const SETUP = [
  'In Salestrail, the organisation owner opens callanalytics.salestrail.io/integration/apidocs and generates an API username and password.',
  'Create a free Groq API key at console.groq.com (optional: without it, transcripts use Cloudflare Workers AI only).',
  'Add SALESTRAIL_API_USERNAME, SALESTRAIL_API_PASSWORD, GROQ_API_KEY and CRON_SECRET as secrets on the tmc-tracker Worker.',
  'Each team member signs in to the Salestrail app with the same email as their tracker login, so calls are linked to them.',
];

export default async function RecordingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requirePageUser();
  const isAdmin = user.role === 'admin';
  const { user: person, before } = querySchema.parse(await searchParams);
  const connected = integrationEnv() !== null;
  const [calls, directory, synced] = await Promise.all([
    listRecordings({ userId: isAdmin ? person : undefined, before, limit: PAGE }),
    isAdmin ? listDirectory() : Promise.resolve([]),
    lastSyncedAt(),
  ]);
  const older = calls.length === PAGE ? `?${new URLSearchParams({ ...(person ? { user: person } : {}), before: calls[calls.length - 1]!.startedAt })}` : null;

  return (
    <>
      <PageHeader title="Recordings"
        description={isAdmin ? 'Every call made from Salestrail, with its recording and transcript.' : 'Calls made from your phone, with recordings and transcripts.'}
        actions={isAdmin && connected && <>
          <PersonFilter people={directory.filter((u) => u.role !== 'admin' || u.id === user.id)} param="user" label="Caller" allLabel="Everyone" />
          <SyncButton />
        </>} />

      {isAdmin && !connected && (
        <Card className="mb-5" aria-labelledby="setup-title">
          <CardHeader id="setup-title" icon={<PlugZap />} title="Connect Salestrail" description="Recordings appear here once these are set." />
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-tmc-anchor">{SETUP.map((s) => <li key={s}>{s}</li>)}</ol>
        </Card>
      )}

      <Card flush>
        {!calls.length ? (
          <EmptyState icon={<AudioLines />} title={before ? 'No older calls' : 'No calls yet'}>
            {connected ? 'New calls show up here within about 10 minutes of being made.' : 'Calls show up here once Salestrail is connected.'}
          </EmptyState>
        ) : <RecordingsTable calls={calls} showCaller={isAdmin} />}
        {(before || older || synced) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-tmc-border px-5 py-3 sm:px-6">
            {before && <Link href={person ? `?user=${person}` : '?'} className={buttonClass('ghost', 'sm')}><ChevronsLeft aria-hidden />Newest</Link>}
            {older && <Link href={older} className={buttonClass('outline', 'sm')}>Older<ChevronRight aria-hidden /></Link>}
            {synced && <span className="ml-auto text-xs text-tmc-slate">Last synced {fmtDateTime(synced)}</span>}
          </div>
        )}
      </Card>
    </>
  );
}
