'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { api, ClientApiError } from '@/lib/shared/apiClient';
import { MEETING_OUTCOME_LABEL } from '@/lib/shared/labels';
import { fmtDateTime, fmtTime } from '@/lib/shared/format';
import type { DirectoryUser, MeetingDetail, Role } from '@/types/domain';
import { Dialog } from '@/components/ui/Dialog';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { CallOutcomePill, MeetingStatusPill, SchoolStatusPill } from '@/components/ui/Pills';
import { Emails, ExternalLink, Phones } from '@/components/ui/ContactLinks';
import { TextLink } from '@/components/ui/TextLink';
import { MeetingActions } from './MeetingActions';

export function MeetingDialog(props: {
  meetingId: number | null; role: Role; userId: string; salesPeople: DirectoryUser[]; onClose: () => void; onChanged?: () => void;
}) {
  // Keyed body: switching visits starts from a clean state with no reset effect.
  return (
    <Dialog open={props.meetingId !== null} onClose={props.onClose} size="lg" title="Visit">
      {props.meetingId !== null && <MeetingBody key={props.meetingId} {...props} meetingId={props.meetingId} />}
    </Dialog>
  );
}

function MeetingBody({ meetingId, role, userId, salesPeople, onClose, onChanged }: {
  meetingId: number; role: Role; userId: string; salesPeople: DirectoryUser[]; onClose: () => void; onChanged?: () => void;
}) {
  const [data, setData] = useState<MeetingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    api.get<MeetingDetail>(`/meetings/${meetingId}`)
      .then((d) => { if (alive) { setData(d); setError(null); } })
      .catch((e) => { if (alive) setError(e instanceof ClientApiError ? e.message : 'Could not load the visit'); });
    return () => { alive = false; };
  }, [meetingId, version]);

  const m = data?.meeting;
  const canAct = m && m.status === 'scheduled' && (role !== 'sales' || m.salesUserId === userId);
  const mapQuery = m ? encodeURIComponent(m.address || `${m.schoolName} ${m.location}`) : '';

  return (
    <>
      {error && <Alert>{error}</Alert>}
      {!data && !error && <Spinner label="Loading visit" />}
      {m && data && (
        <div className="flex flex-col gap-5">
          <p className="font-display text-h2 text-tmc-navy">{m.schoolName}</p>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-lg font-semibold text-tmc-navy tabular-nums"><CalendarDays aria-hidden className="size-5 text-tmc-cyan-deep" />{fmtDateTime(m.startAt)} – {fmtTime(m.endAt)}</p>
              <p className="text-sm text-tmc-slate">Sales: <strong className="text-tmc-anchor">{m.salesName}</strong> · booked by {m.scheduledByName} on {fmtDateTime(m.createdAt)}</p>
            </div>
            <div className="flex gap-2"><MeetingStatusPill status={m.status} /><SchoolStatusPill status={m.schoolStatus} /></div>
          </div>

          {canAct && <MeetingActions meeting={m} role={role} salesPeople={salesPeople} onDone={() => { setVersion((v) => v + 1); onChanged?.(); }} />}

          {m.status === 'completed' && m.outcome && (
            <Alert tone="success">
              <strong>Outcome: {MEETING_OUTCOME_LABEL[m.outcome]}</strong>
              {m.outcomeNotes && <p className="mt-1 whitespace-pre-wrap">{m.outcomeNotes}</p>}
              <p className="mt-1 text-xs">Recorded {fmtDateTime(m.completedAt)}</p>
            </Alert>
          )}
          {(m.status === 'cancelled' || m.status === 'no_show') && m.outcomeNotes && <Alert tone="warning">{m.outcomeNotes}</Alert>}

          <div className="grid gap-6 md:grid-cols-2">
            <section aria-labelledby="where-who">
              <h3 id="where-who" className="tmc-label mb-2">Where & who</h3>
              <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-tmc-slate">Address</dt>
                <dd>{m.address || `${m.schoolName}, ${m.location}`}{' '}
                  <a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold">Open map<ArrowUpRight aria-hidden className="size-3.5" /><span className="sr-only"> (opens in a new tab)</span></a></dd>
                <dt className="text-tmc-slate">Meet</dt>
                <dd>{m.contactName ? `${m.contactName}${m.contactPosition ? ` (${m.contactPosition})` : ''}` : <span className="text-tmc-slate">Not specified</span>}</dd>
                {m.contactPhone && <><dt className="text-tmc-slate">Contact phone</dt><dd><Phones value={m.contactPhone} /></dd></>}
                <dt className="text-tmc-slate">School phone</dt><dd><Phones value={data.school.schoolPhone} /></dd>
                <dt className="text-tmc-slate">Email</dt><dd><Emails value={data.school.schoolEmail} /></dd>
                <dt className="text-tmc-slate">Website</dt><dd><ExternalLink value={data.school.website} /></dd>
                <dt className="text-tmc-slate">Tier</dt><dd>{data.school.tier} · {data.school.curriculum}</dd>
              </dl>
              {m.agenda && <><h3 className="tmc-label mt-4 mb-1">Brief</h3><p className="whitespace-pre-wrap text-sm">{m.agenda}</p></>}
            </section>
            <section aria-labelledby="tele-history">
              <h3 id="tele-history" className="tmc-label mb-2">Telemarketing history</h3>
              {data.calls.length === 0 ? <p className="text-sm text-tmc-slate">No calls logged.</p> : (
                <ol className="flex flex-col gap-3 border-l-2 border-tmc-border pl-4">
                  {data.calls.map((c) => (
                    <li key={c.id} className="text-sm">
                      <div className="flex flex-wrap items-center gap-2"><CallOutcomePill outcome={c.outcome} /><span className="text-xs text-tmc-slate">{c.userName} · {fmtDateTime(c.createdAt)}</span></div>
                      {c.contactName && <p className="text-xs text-tmc-slate">Spoke to {c.contactName}</p>}
                      {c.notes && <p className="mt-1 whitespace-pre-wrap">{c.notes}</p>}
                      {c.enquiry && <p className="mt-2 rounded-control border border-tmc-cyan-deep/15 bg-tmc-cyan-wash px-3 py-2 text-tmc-navy">Enquiry: {c.enquiry}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
          <TextLink href={`/schools/${m.schoolId}`} onClick={onClose} className="-ml-2 self-start">Open full school profile</TextLink>
        </div>
      )}
    </>
  );
}
