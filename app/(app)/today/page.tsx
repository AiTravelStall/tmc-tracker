import type { Metadata } from 'next';
import Link from 'next/link';
import { BellRing, CalendarCheck, ClipboardList, MapPin, Phone, PhoneCall, School, Search } from 'lucide-react';
import { requirePageUser } from '@/lib/server/auth';
import { listFollowUps } from '@/lib/server/data/followups';
import { listSchools } from '@/lib/server/data/schools';
import { listMeetings } from '@/lib/server/data/meetings';
import { getMyStats, type TelemarketerStats } from '@/lib/server/data/stats';
import { zonedParts } from '@/lib/shared/time';
import { fmtDateTime } from '@/lib/shared/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { EmptyState } from '@/components/ui/Feedback';
import { ButtonLink } from '@/components/ui/Button';
import { Phones } from '@/components/ui/ContactLinks';
import { TextLink } from '@/components/ui/TextLink';
import { FollowUpTable } from '@/components/sections/followups/FollowUpTable';

export const metadata: Metadata = { title: 'My day' };

export default async function TodayPage() {
  const user = await requirePageUser(['telemarketer']);
  const [stats, overdue, today, mine, upcoming] = await Promise.all([
    getMyStats<TelemarketerStats>(),
    listFollowUps(user, 'overdue'),
    listFollowUps(user, 'today'),
    listSchools(user, { status: 'new', assigned: 'me', page: 1 }),
    listMeetings({ statuses: ['scheduled'], from: new Date().toISOString(), limit: 200 }),
  ]);
  const fresh = mine.rows.length ? mine.rows : (await listSchools(user, { status: 'new', assigned: 'none', page: 1 })).rows;
  const due = [...overdue, ...today];
  const booked = upcoming.filter((m) => m.scheduledBy === user.id).slice(0, 8);
  const hour = zonedParts(new Date()).hour;
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader title={`${greeting}, ${user.fullName.split(' ')[0]}`}
        description="Start with the follow-ups that are due, then work through new schools."
        actions={<ButtonLink href="/schools?status=new"><Search aria-hidden />Browse new schools</ButtonLink>} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat icon={<PhoneCall />} label="Calls today" value={stats.callsToday} />
        <Stat icon={<Phone />} label="Calls this week" value={stats.callsWeek} />
        <Stat icon={<ClipboardList />} label="Enquiries this week" value={stats.enquiriesWeek} />
        <Stat icon={<CalendarCheck />} label="Visits booked this week" value={stats.visitsBookedWeek} />
        <Stat icon={<School />} label="Schools not yet called" value={stats.schoolsNotCalled} />
      </div>

      <Card flush aria-labelledby="due-today">
        <CardHeader padded id="due-today" icon={<BellRing />} title={`Follow-ups due today (${due.length})`} description="Overdue calls appear first." action={<TextLink href="/followups">All follow-ups</TextLink>} />
        {due.length ? <FollowUpTable rows={due} /> : <EmptyState icon={<BellRing />} title="You're all caught up">No follow-ups are due today.</EmptyState>}
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card flush aria-labelledby="next-schools">
          <CardHeader padded id="next-schools" icon={<School />} title="Next schools to call" action={<TextLink href="/schools?status=new">See all</TextLink>} />
          {fresh.length === 0 ? <EmptyState icon={<School />} title="Every school has been contacted" /> : (
            <ul className="divide-y divide-tmc-border">
              {fresh.slice(0, 10).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-tmc-subtle sm:px-6">
                  <div className="min-w-0">
                    <Link href={`/schools/${s.id}`} className="font-semibold text-tmc-navy">{s.name}</Link>
                    <p className="text-xs text-tmc-slate">{s.location} · {s.tier}</p>
                  </div>
                  <div className="shrink-0 text-sm"><Phones value={s.schoolPhone} compact /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card flush aria-labelledby="my-visits">
          <CardHeader padded id="my-visits" icon={<MapPin />} title="Visits I booked" action={<TextLink href="/calendar">Calendar</TextLink>} />
          {booked.length === 0 ? <EmptyState icon={<CalendarCheck />}>No upcoming visits booked by you.</EmptyState> : (
            <ul className="divide-y divide-tmc-border">
              {booked.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-tmc-subtle sm:px-6">
                  <div><Link href={`/schools/${m.schoolId}`} className="font-semibold text-tmc-navy">{m.schoolName}</Link><p className="text-xs text-tmc-slate">{m.salesName}</p></div>
                  <span className="rounded-full bg-tmc-violet-wash px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-tmc-violet-ink tabular-nums">{fmtDateTime(m.startAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
