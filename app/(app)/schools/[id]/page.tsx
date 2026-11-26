import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BellRing, Building2, CalendarCheck, ChevronLeft, ChevronRight, PhoneCall, UsersRound } from 'lucide-react';
import { requirePageUser } from '@/lib/server/auth';
import { getSchoolDetail } from '@/lib/server/data/schools';
import { listDirectory } from '@/lib/server/data/users';
import { AppError } from '@/lib/server/errors';
import { fmtDateTime } from '@/lib/shared/format';
import { cn } from '@/lib/shared/cn';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { SchoolStatusPill } from '@/components/ui/Pills';
import { Emails, ExternalLink, Phones, RawValue } from '@/components/ui/ContactLinks';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { CallForm } from '@/components/sections/school/CallForm';
import { ContactCard } from '@/components/sections/school/ContactCard';
import { ContactDialogButton, EditSchoolButton } from '@/components/sections/school/EditDialogs';
import { FollowUpItem } from '@/components/sections/school/FollowUpItem';
import { HistoryTabs } from '@/components/sections/school/HistoryTabs';
import { SchoolAdminControls } from '@/components/sections/school/SchoolAdminControls';
import { MeetingDialogFromUrl } from '@/components/sections/meetings/MeetingDialogFromUrl';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ contact?: string }> };

async function load(idParam: string) {
  const id = Number(idParam);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  try {
    return await getSchoolDetail(id);
  } catch (e) {
    if (e instanceof AppError && e.code === 'NOT_FOUND') notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { school } = await load((await params).id);
  return { title: school.name };
}

export default async function SchoolPage({ params, searchParams }: Props) {
  const user = await requirePageUser();
  const [{ id }, { contact }] = await Promise.all([params, searchParams]);
  const [detail, directory] = await Promise.all([load(id), listDirectory()]);
  const { school, contacts, calls, followUps, meetings, activities } = detail;
  const canCall = user.role !== 'sales';
  const salesPeople = directory.filter((u) => u.role === 'sales');
  const pending = followUps.filter((f) => f.status === 'pending');
  const upcoming = meetings.filter((m) => m.status === 'scheduled');
  const research: [string, string][] = [
    ['Research status', school.researchStatus], ['Research notes', school.researchNotes],
    ['Research date', school.researchDate],
  ];
  const sources = school.researchSources.split(/\s*[;|]\s*|\s+(?=https?:\/\/)/).map((s) => s.trim()).filter(Boolean);

  return (
    <>
      <PageHeader
        eyebrow={(
          <Link href="/schools" className="-ml-1 inline-flex min-h-9 items-center gap-1 rounded-control px-1 text-[13px] font-medium text-tmc-slate no-underline hover:text-tmc-navy hover:no-underline">
            <ChevronLeft aria-hidden className="size-4" />{user.role === 'sales' ? 'My schools' : 'Schools'}
          </Link>
        )}
        title={school.name}
        description={<span className="flex flex-wrap items-center gap-x-3 gap-y-1"><SchoolStatusPill status={school.status} /><span>{[school.location, school.tier, school.curriculum].filter(Boolean).join(' · ')}</span></span>}
        actions={<>
          {user.role === 'admin' && (
            <SchoolAdminControls schoolId={school.id} status={school.status} assignedId={school.assignedTelemarketerId}
              telemarketers={directory.filter((u) => u.role === 'telemarketer')} />
          )}
        </>}
      />

      <div className={cn('grid items-start gap-5', canCall && 'xl:grid-cols-[minmax(0,1fr)_420px]')}>
        <div className="flex min-w-0 flex-col gap-5">
          <Card aria-labelledby="school-contact">
            <CardHeader id="school-contact" icon={<Building2 />} title="School contact" action={canCall && <EditSchoolButton school={school} />} />
            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[140px_1fr] sm:gap-y-3 [&_dd]:mb-3 sm:[&_dd]:mb-0 [&_dt]:text-[13px]">
              <dt className="text-tmc-slate">Phone</dt><dd><Phones value={school.schoolPhone} /></dd>
              <dt className="text-tmc-slate">Email</dt><dd><Emails value={school.schoolEmail} /></dd>
              <dt className="text-tmc-slate">Website</dt><dd><ExternalLink value={school.website} /></dd>
              <dt className="text-tmc-slate">Verified contact</dt><dd className="whitespace-pre-wrap text-xs"><RawValue value={school.verifiedSchoolContact} /></dd>
              <dt className="text-tmc-slate">Telemarketer</dt><dd>{school.assignedName ?? <span className="text-tmc-slate">Unassigned</span>}</dd>
              <dt className="text-tmc-slate">Last contacted</dt>
              <dd>{school.lastContactedAt ? <>{fmtDateTime(school.lastContactedAt)} (<RelativeTime value={school.lastContactedAt} />)</> : <span className="text-tmc-slate">Never</span>}</dd>
            </dl>
            <details className="group mt-5 border-t border-tmc-border pt-4 text-sm">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold text-tmc-cyan-deep [&::-webkit-details-marker]:hidden">
                <ChevronRight aria-hidden className="size-4 transition-transform group-open:rotate-90" />Research details
              </summary>
              <dl className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-[140px_1fr] sm:gap-y-3 [&_dd]:mb-3 sm:[&_dd]:mb-0 [&_dt]:text-[13px]">
                {research.map(([label, value]) => (
                  <div key={label} className="contents"><dt className="text-tmc-slate">{label}</dt><dd className="whitespace-pre-wrap text-xs"><RawValue value={value} /></dd></div>
                ))}
                <dt className="text-tmc-slate">Sources</dt>
                <dd className="flex flex-col gap-1 text-xs break-all">
                  {sources.length ? sources.map((s) => /^https?:\/\//.test(s)
                    ? <a key={s} href={s} target="_blank" rel="noopener noreferrer">{s}</a> : <span key={s}>{s}</span>)
                    : <span className="text-tmc-slate">—</span>}
                </dd>
              </dl>
            </details>
          </Card>

          <Card aria-labelledby="decision-makers">
            <CardHeader id="decision-makers" icon={<UsersRound />} title={`Decision makers (${contacts.length})`} action={canCall && <ContactDialogButton schoolId={school.id} />} />
            <div className="flex flex-col gap-3">
              {contacts.map((c) => <ContactCard key={c.id} contact={c} canCall={canCall} />)}
              {!contacts.length && <p className="rounded-control border border-dashed border-tmc-border px-4 py-6 text-center text-sm text-tmc-slate">No contacts yet.</p>}
            </div>
          </Card>

          <Card aria-label="History">
            <HistoryTabs calls={calls} meetings={meetings} followUps={followUps} activities={activities} showFollowUps={canCall} />
          </Card>
        </div>

        <div className="flex flex-col gap-5 xl:sticky xl:top-8">
          {(pending.length > 0 || upcoming.length > 0) && (
            <Card aria-labelledby="next-steps">
              <CardHeader id="next-steps" icon={<BellRing />} title="Next steps" />
              <div className="flex flex-col gap-2">
                {upcoming.map((m) => (
                  <Link key={m.id} href={`?visit=${m.id}`} scroll={false}
                    className="flex items-start gap-3 rounded-control border border-tmc-violet-ink/15 bg-tmc-violet-wash p-3 text-sm text-tmc-anchor no-underline transition-colors hover:border-tmc-violet-ink/40 hover:no-underline">
                    <CalendarCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-tmc-violet-ink" />
                    <span>
                      <span className="block font-semibold text-tmc-navy">Visit by {m.salesName}</span>
                      <span className="block text-xs text-tmc-charcoal">{fmtDateTime(m.startAt)} · <RelativeTime value={m.startAt} /></span>
                    </span>
                  </Link>
                ))}
                {pending.map((f) => <FollowUpItem key={f.id} followUp={f} canEdit={user.role === 'admin' || f.assignedTo === user.id} />)}
              </div>
            </Card>
          )}
          {canCall && (
            <Card id="log-call" aria-labelledby="log-call-title" className="scroll-mt-6">
              <CardHeader id="log-call-title" icon={<PhoneCall />} title="Log a call" description="Record the outcome and plan the next step." />
              <CallForm schoolId={school.id} schoolAddress={`${school.name}, ${school.location}`} contacts={contacts}
                salesPeople={salesPeople} defaultContactId={contact ? Number(contact) : undefined} />
            </Card>
          )}
        </div>
      </div>
      <MeetingDialogFromUrl role={user.role} userId={user.id} salesPeople={salesPeople} />
    </>
  );
}
