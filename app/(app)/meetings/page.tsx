import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { MapPin } from 'lucide-react';
import { requirePageUser } from '@/lib/server/auth';
import { listMeetings } from '@/lib/server/data/meetings';
import { listDirectory } from '@/lib/server/data/users';
import { MEETING_OUTCOME_LABEL } from '@/lib/shared/labels';
import { fmtDateTime } from '@/lib/shared/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { Table, Td, Th } from '@/components/ui/Table';
import { MeetingStatusPill, SchoolStatusPill } from '@/components/ui/Pills';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { TabNav } from '@/components/sections/followups/TabNav';
import { PersonFilter } from '@/components/sections/followups/PersonFilter';
import { MeetingDialogFromUrl } from '@/components/sections/meetings/MeetingDialogFromUrl';

export const metadata: Metadata = { title: 'Visits' };

const querySchema = z.object({
  tab: z.enum(['upcoming', 'needs_outcome', 'completed', 'cancelled']).catch('upcoming'),
  sales: z.string().uuid().optional().catch(undefined),
});

export default async function MeetingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requirePageUser();
  const { tab, sales } = querySchema.parse(await searchParams);
  const now = new Date().toISOString();
  const salesUserId = user.role === 'sales' ? undefined : sales;
  const [rows, directory] = await Promise.all([
    tab === 'upcoming' ? listMeetings({ salesUserId, statuses: ['scheduled'], from: now })
      : tab === 'needs_outcome' ? listMeetings({ salesUserId, statuses: ['scheduled'], endedBefore: now, order: 'desc' })
      : tab === 'completed' ? listMeetings({ salesUserId, statuses: ['completed'], order: 'desc', limit: 300 })
      : listMeetings({ salesUserId, statuses: ['cancelled', 'no_show'], order: 'desc', limit: 300 }),
    listDirectory(),
  ]);
  const salesPeople = directory.filter((u) => u.role === 'sales');
  const href = (t: string) => `?${new URLSearchParams({ tab: t, ...(salesUserId ? { sales: salesUserId } : {}) })}`;
  const keep = (id: number) => `?${new URLSearchParams({ tab, ...(salesUserId ? { sales: salesUserId } : {}), visit: String(id) })}`;

  return (
    <>
      <PageHeader
        title={user.role === 'sales' ? 'My visits' : 'Visits'}
        actions={user.role !== 'sales' && <PersonFilter people={salesPeople} param="sales" label="Sales person" allLabel="All sales people" />}
      />
      <TabNav label="Visit views" active={tab} tabs={[
        { key: 'upcoming', label: 'Upcoming', href: href('upcoming') },
        { key: 'needs_outcome', label: 'Needs outcome', href: href('needs_outcome') },
        { key: 'completed', label: 'Completed', href: href('completed') },
        { key: 'cancelled', label: 'Cancelled / no-show', href: href('cancelled') },
      ]} />
      <Card flush>
        {!rows.length ? <EmptyState icon={<MapPin />} title="No visits here">Visits booked from a call show up in this list and on the calendar.</EmptyState> : (
          <Table>
            <thead>
              <tr><Th>When</Th><Th>School</Th>{user.role !== 'sales' && <Th>Sales person</Th>}<Th>Booked by</Th><Th>Status</Th>{tab === 'completed' && <Th>Outcome</Th>}</tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-tmc-subtle">
                  <Td className="whitespace-nowrap">
                    <Link href={keep(m.id)} scroll={false} className="font-semibold tabular-nums">{fmtDateTime(m.startAt)}</Link>
                    <div className="text-xs text-tmc-slate"><RelativeTime value={m.startAt} /></div>
                  </Td>
                  <Td>
                    <Link href={`/schools/${m.schoolId}`} className="font-semibold text-tmc-navy">{m.schoolName}</Link>
                    <div className="text-xs text-tmc-slate">{m.location}</div>
                    <div className="mt-1"><SchoolStatusPill status={m.schoolStatus} /></div>
                  </Td>
                  {user.role !== 'sales' && <Td>{m.salesName}</Td>}
                  <Td className="text-xs">{m.scheduledByName}</Td>
                  <Td><MeetingStatusPill status={m.status} /></Td>
                  {tab === 'completed' && (
                    <Td className="max-w-sm text-xs">
                      <strong>{m.outcome ? MEETING_OUTCOME_LABEL[m.outcome] : '—'}</strong>
                      {m.outcomeNotes && <p className="line-clamp-2 text-tmc-slate">{m.outcomeNotes}</p>}
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <MeetingDialogFromUrl role={user.role} userId={user.id} salesPeople={salesPeople} />
    </>
  );
}
