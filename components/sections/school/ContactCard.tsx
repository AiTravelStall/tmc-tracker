import Link from 'next/link';
import { ChevronRight, PhoneCall } from 'lucide-react';
import type { Contact } from '@/types/domain';
import { StatusPill } from '@/components/ui/StatusPill';
import { Emails, LinkedIn, Phones, RawValue } from '@/components/ui/ContactLinks';
import { buttonClass } from '@/components/ui/Button';
import { ContactDialogButton } from './EditDialogs';

const VERIFICATION: [keyof Contact, string][] = [
  ['currentRoleVerification', 'Role verification'], ['emailVerificationStatus', 'Email status'],
  ['linkedinVerificationStatus', 'LinkedIn status'], ['confidenceScore', 'Confidence'],
  ['outreachPriority', 'Outreach priority'], ['recordAuditFlags', 'Audit flags'],
];

export function ContactCard({ contact: c, canCall }: { contact: Contact; canCall: boolean }) {
  const hasVerification = VERIFICATION.some(([k]) => c[k]);
  return (
    <article className="rounded-control border border-tmc-border p-4 transition-colors hover:border-tmc-border-strong">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-tmc-cyan-wash text-sm font-semibold text-tmc-cyan-deep">
            {c.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
          </span>
          <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 font-semibold text-tmc-navy">
            {c.name}
            {c.priority && <StatusPill tone={c.priority === 'High' ? 'danger' : 'neutral'}>{c.priority} priority</StatusPill>}
          </h3>
          <p className="text-[13px] text-tmc-slate">{c.position || '—'}</p>
          </div>
        </div>
        {canCall && (
          <div className="flex shrink-0 gap-1 pl-[52px] sm:pl-0">
            <Link href={`?contact=${c.id}#log-call`} scroll={false} className={buttonClass('outline', 'sm')}><PhoneCall aria-hidden />Log call</Link>
            <ContactDialogButton schoolId={c.schoolId} contact={c} />
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm sm:pl-[52px]">
        <Phones value={c.phone} />
        <Emails value={c.email} />
        <LinkedIn value={c.linkedin} />
      </div>
      {hasVerification && (
        <details className="group mt-3 text-xs sm:pl-[52px]">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-semibold text-tmc-cyan-deep [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden className="size-3.5 transition-transform group-open:rotate-90" />Verification details
          </summary>
          <dl className="mt-2 grid grid-cols-[130px_1fr] gap-x-3 gap-y-1.5 rounded-control bg-tmc-subtle p-3">
            {VERIFICATION.map(([k, label]) => (
              <div key={k} className="contents"><dt className="text-tmc-slate">{label}</dt><dd><RawValue value={c[k] as string} /></dd></div>
            ))}
          </dl>
        </details>
      )}
    </article>
  );
}
