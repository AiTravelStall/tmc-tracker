import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { ChevronRight, ChevronsLeft, ScrollText } from 'lucide-react';
import { requirePageUser } from '@/lib/server/auth';
import { listActivity } from '@/lib/server/data/activity';
import { listDirectory } from '@/lib/server/data/users';
import { fmtDateTime, humanize } from '@/lib/shared/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { buttonClass } from '@/components/ui/Button';
import { PersonFilter } from '@/components/sections/followups/PersonFilter';

export const metadata: Metadata = { title: 'Activity log' };
const PAGE = 100;

const querySchema = z.object({
  user: z.string().uuid().optional().catch(undefined),
  before: z.string().datetime({ offset: true }).optional().catch(undefined),
});

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requirePageUser(['admin']);
  const { user, before } = querySchema.parse(await searchParams);
  const [rows, directory] = await Promise.all([listActivity({ userId: user, before, limit: PAGE }), listDirectory()]);
  const older = rows.length === PAGE ? `?${new URLSearchParams({ ...(user ? { user } : {}), before: rows[rows.length - 1]!.createdAt })}` : null;

  return (
    <>
      <PageHeader title="Activity log" description="Every call, booking, visit and change, newest first."
        actions={<PersonFilter people={directory} param="user" label="Person" allLabel="Everyone" />} />
      <Card>
        {!rows.length ? <EmptyState icon={<ScrollText />}>No activity{before ? ' before this point' : ' yet'}.</EmptyState> : (
          <ol className="relative flex flex-col gap-5 text-sm before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-tmc-border">
            {rows.map((a) => (
              <li key={a.id} className="relative pl-6">
                <span aria-hidden className="absolute top-1 left-0 size-[11px] rounded-full border-2 border-tmc-white bg-tmc-cyan-deep ring-1 ring-tmc-border" />
                <p className="text-xs text-tmc-slate">
                  <strong className="text-tmc-anchor">{a.userName ?? 'System'}</strong>
                  {a.schoolName && <> · <Link href={`/schools/${a.schoolId}`}>{a.schoolName}</Link></>} · {fmtDateTime(a.createdAt)}
                </p>
                <p className="whitespace-pre-wrap">{humanize(a.message)}</p>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-6 flex gap-2 border-t border-tmc-border pt-4 empty:hidden">
          {before && <Link href={user ? `?user=${user}` : '?'} className={buttonClass('ghost', 'sm')}><ChevronsLeft aria-hidden />Newest</Link>}
          {older && <Link href={older} className={buttonClass('outline', 'sm')}>Older<ChevronRight aria-hidden /></Link>}
        </div>
      </Card>
    </>
  );
}
