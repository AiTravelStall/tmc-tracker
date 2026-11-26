import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarCheck, CircleCheck, ClipboardList, BellRing, MapPin, Phone, School, Trophy, Users } from 'lucide-react';
import { requirePageUser } from '@/lib/server/auth';
import { getDashboardStats } from '@/lib/server/data/stats';
import { listActivity } from '@/lib/server/data/activity';
import { CALL_OUTCOME_LABEL, STATUS_LABEL } from '@/lib/shared/labels';
import { fmtDateTime, humanize, pct } from '@/lib/shared/format';
import { cn } from '@/lib/shared/cn';
import { SCHOOL_STATUSES } from '@/types/domain';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Table, Td, Th } from '@/components/ui/Table';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { TextLink } from '@/components/ui/TextLink';
import { EmptyState } from '@/components/ui/Feedback';
import { DailyBars } from '@/components/sections/dashboard/DailyBars';
import { HBar } from '@/components/sections/dashboard/HBar';
import { RangePicker, RANGES } from '@/components/sections/dashboard/RangePicker';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requirePageUser(['admin']);
  const requested = Number((await searchParams).days);
  const days = RANGES.some(([d]) => d === requested) ? requested : 30;
  const [s, recent] = await Promise.all([getDashboardStats(days), listActivity({ limit: 15 })]);
  const t = s.totals;
  const statusMax = Math.max(1, ...Object.values(s.statusCounts).map(Number));
  const outcomeTotal = s.callOutcomes.reduce((a, o) => a + o.count, 0);
  const rangeLabel = RANGES.find(([d]) => d === days)![1];

  return (
    <>
      <PageHeader title="Dashboard" description={`Telemarketing and sales activity across all ${t.schools} schools.`} actions={<RangePicker days={days} />} />

      <h2 className="tmc-label mb-3">Pipeline · all time</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat icon={<School />} label="Schools in database" value={t.schools} sub={`${t.contacts} decision makers`} />
        <Stat icon={<Phone />} label="Schools contacted" value={t.schoolsContacted} sub={`${pct(t.schoolsContacted, t.schools)} of all schools`} />
        <Stat icon={<MapPin />} label="Upcoming visits" value={t.visitsUpcoming} tone={t.visitsAwaitingOutcome ? 'warning' : undefined}
          sub={t.visitsAwaitingOutcome ? `${t.visitsAwaitingOutcome} past visits need an outcome` : 'All past visits updated'} />
        <Stat icon={<BellRing />} label="Follow-ups pending" value={t.followUpsPending} sub={`${t.followUpsOverdue} overdue`} tone={t.followUpsOverdue ? 'warning' : undefined} />
        <Stat icon={<Trophy />} label="Converted" value={t.converted} sub={`${pct(t.converted, t.schoolsContacted)} of contacted`} tone="success" />
      </div>

      <h2 className="tmc-label mt-8 mb-3">Last {rangeLabel}</h2>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat icon={<Phone />} label="Calls made" value={t.calls} sub={`${t.schoolsCalled} schools`} />
        <Stat icon={<ClipboardList />} label="Enquiries taken" value={t.enquiries} sub={`${pct(t.enquiries, t.calls)} of calls`} />
        <Stat icon={<CalendarCheck />} label="Visits booked" value={t.visitsBooked} />
        <Stat icon={<CircleCheck />} label="Visits completed" value={t.visitsCompleted} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-8" aria-label="Daily activity">
          <DailyBars label="Calls" days={days} data={s.daily.map((d) => ({ day: d.day, value: d.calls }))} />
          <DailyBars label="Visits booked" days={days} data={s.daily.map((d) => ({ day: d.day, value: d.visitsBooked }))} />
        </Card>
        <Card aria-labelledby="by-status">
          <CardHeader id="by-status" title="Schools by status" description="Select a row to see those schools." />
          {SCHOOL_STATUSES.map((k) => (
            <HBar key={k} label={STATUS_LABEL[k]} value={s.statusCounts[k] ?? 0} max={statusMax} sub={pct(s.statusCounts[k] ?? 0, t.schools)} href={`/schools?status=${k}`} />
          ))}
        </Card>
      </div>

      <Card flush className="mt-5" aria-labelledby="tele-table">
        <CardHeader padded id="tele-table" title="Telemarketers" icon={<Users />} action={<TextLink href="/team">Manage team</TextLink>} />
        <Table>
          <thead><tr><Th>Name</Th><Th numeric>Calls</Th><Th numeric>Schools called</Th><Th numeric>Enquiries</Th><Th numeric>Visits booked</Th><Th numeric>Follow-ups</Th><Th numeric>Overdue</Th><Th numeric>Assigned</Th><Th>Last call</Th></tr></thead>
          <tbody>
            {!s.telemarketers.length && <tr><Td colSpan={9} className="text-tmc-slate">No telemarketers yet — add them under Team.</Td></tr>}
            {s.telemarketers.map((u) => (
              <tr key={u.id} className={cn('hover:bg-tmc-subtle', !u.active && 'opacity-50')}>
                <Td className="font-semibold text-tmc-navy">{u.name}</Td><Td numeric>{u.calls}</Td><Td numeric>{u.schoolsCalled}</Td><Td numeric>{u.enquiries}</Td>
                <Td numeric>{u.visitsBooked}</Td><Td numeric>{u.followUpsPending}</Td>
                <Td numeric className={cn(u.followUpsOverdue > 0 && 'font-semibold text-tmc-error-ink')}>{u.followUpsOverdue}</Td>
                <Td numeric>{u.schoolsAssigned}</Td><Td className="text-xs">{u.lastCallAt ? <RelativeTime value={u.lastCallAt} /> : '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card flush className="mt-5" aria-labelledby="sales-table">
        <CardHeader padded id="sales-table" title="Sales team" icon={<MapPin />} action={<TextLink href="/calendar">Calendar</TextLink>} />
        <Table>
          <thead><tr><Th>Name</Th><Th numeric>Upcoming</Th><Th numeric>Visits done</Th><Th numeric>Converted</Th><Th numeric>Cancelled / no-show</Th><Th numeric>Awaiting outcome</Th></tr></thead>
          <tbody>
            {!s.sales.length && <tr><Td colSpan={6} className="text-tmc-slate">No sales people yet — add them under Team.</Td></tr>}
            {s.sales.map((u) => (
              <tr key={u.id} className={cn('hover:bg-tmc-subtle', !u.active && 'opacity-50')}>
                <Td className="font-semibold text-tmc-navy">{u.name}</Td><Td numeric>{u.upcoming}</Td><Td numeric>{u.completed}</Td><Td numeric>{u.converted}</Td><Td numeric>{u.cancelled}</Td>
                <Td numeric className={cn(u.awaitingOutcome > 0 && 'font-semibold text-tmc-error-ink')}>{u.awaitingOutcome}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card aria-labelledby="outcomes">
          <CardHeader id="outcomes" title="Call outcomes" />
          {!s.callOutcomes.length ? <EmptyState compact>No calls in this period.</EmptyState>
            : s.callOutcomes.map((o) => <HBar key={o.outcome} label={CALL_OUTCOME_LABEL[o.outcome]} value={o.count} max={s.callOutcomes[0]!.count} sub={pct(o.count, outcomeTotal)} />)}
        </Card>
        <Card flush aria-labelledby="by-tier">
          <CardHeader padded id="by-tier" title="By tier" />
          <Table>
            <thead><tr><Th>Tier</Th><Th numeric>Schools</Th><Th numeric>Contacted</Th><Th numeric>Visit stage</Th><Th numeric>Converted</Th></tr></thead>
            <tbody>
              {s.byTier.map((r) => (
                <tr key={r.tier}><Td>{r.tier || '—'}</Td><Td numeric>{r.total}</Td><Td numeric>{r.contacted}</Td><Td numeric>{r.visitStage}</Td><Td numeric>{r.converted}</Td></tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>

      <Card className="mt-5" aria-labelledby="recent">
        <CardHeader id="recent" title="Recent activity" action={<TextLink href="/activity">Full log</TextLink>} />
        {!recent.length ? <EmptyState compact>No activity yet.</EmptyState> : (
          <ol className="relative flex flex-col gap-4 text-sm before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-tmc-border">
            {recent.map((a) => (
              <li key={a.id} className="relative pl-6">
                <span aria-hidden className="absolute top-1.5 left-0 size-[11px] rounded-full border-2 border-tmc-white bg-tmc-cyan-deep ring-1 ring-tmc-border" />
                <p><strong className="text-tmc-navy">{a.userName ?? 'System'}</strong>{' '}{humanize(a.message)}
                  {a.schoolName && <> · <Link href={`/schools/${a.schoolId}`}>{a.schoolName}</Link></>}</p>
                <p className="text-xs text-tmc-slate">{fmtDateTime(a.createdAt)}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}
