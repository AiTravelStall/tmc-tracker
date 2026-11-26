import type { Metadata } from 'next';
import { z } from 'zod';
import { BellRing } from 'lucide-react';
import { requirePageUser } from '@/lib/server/auth';
import { followUpSummary, listFollowUps, type FollowUpScope } from '@/lib/server/data/followups';
import { listDirectory } from '@/lib/server/data/users';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { FollowUpTable } from '@/components/sections/followups/FollowUpTable';
import { TabNav } from '@/components/sections/followups/TabNav';
import { PersonFilter } from '@/components/sections/followups/PersonFilter';

export const metadata: Metadata = { title: 'Follow-ups' };

const querySchema = z.object({
  tab: z.enum(['overdue', 'today', 'upcoming', 'done']).catch('today'),
  user: z.string().uuid().optional().catch(undefined),
});

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requirePageUser(['admin', 'telemarketer']);
  const { tab, user } = querySchema.parse(await searchParams);
  const assignee = me.role === 'admin' ? user : undefined;
  const [rows, summary, directory] = await Promise.all([
    listFollowUps(me, tab as FollowUpScope, assignee),
    followUpSummary(assignee),
    me.role === 'admin' ? listDirectory() : Promise.resolve([]),
  ]);
  const href = (t: string) => `?${new URLSearchParams({ tab: t, ...(assignee ? { user: assignee } : {}) })}`;

  return (
    <>
      <PageHeader
        title="Follow-up calls"
        description="Calls promised in earlier conversations. Logging any call to the school completes its follow-up automatically."
        actions={me.role === 'admin' && <PersonFilter people={directory.filter((u) => u.role !== 'sales')} param="user" label="Telemarketer" allLabel="All telemarketers" />}
      />
      <TabNav label="Follow-up views" active={tab} tabs={[
        { key: 'overdue', label: 'Overdue', href: href('overdue'), count: summary.overdue, danger: true },
        { key: 'today', label: 'Today', href: href('today'), count: summary.today },
        { key: 'upcoming', label: 'Upcoming', href: href('upcoming'), count: summary.upcoming },
        { key: 'done', label: 'Completed', href: href('done') },
      ]} />
      <Card flush>
        {rows.length ? <FollowUpTable rows={rows} showAssignee={me.role === 'admin'} />
          : <EmptyState icon={<BellRing />} title={tab === 'overdue' ? 'Nothing overdue' : 'No follow-ups here'}>{tab === 'overdue' ? 'Every promised call has been made on time.' : 'Follow-ups appear here when you schedule a call back.'}</EmptyState>}
      </Card>
    </>
  );
}
