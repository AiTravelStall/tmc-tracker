'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MEETING_OUTCOME_LABEL } from '@/lib/shared/labels';
import { fmtDateTime, humanize } from '@/lib/shared/format';
import { cn } from '@/lib/shared/cn';
import { useNow } from '@/lib/hooks/useNow';
import type { Activity, Call, FollowUp, Meeting } from '@/types/domain';
import { CallOutcomePill, MeetingStatusPill } from '@/components/ui/Pills';
import { StatusPill } from '@/components/ui/StatusPill';

type Tab = 'calls' | 'visits' | 'followups' | 'activity';

export function HistoryTabs({ calls, meetings, followUps, activities, showFollowUps }: {
  calls: Call[]; meetings: Meeting[]; followUps: FollowUp[]; activities: Activity[]; showFollowUps: boolean;
}) {
  const [tab, setTab] = useState<Tab>('calls');
  const tabs: [Tab, string][] = [
    ['calls', `Calls (${calls.length})`], ['visits', `Visits (${meetings.length})`],
    ...(showFollowUps ? [['followups', `Follow-ups (${followUps.length})`] as [Tab, string]] : []),
    ['activity', 'Activity'],
  ];
  const now = useNow() ?? 0;

  return (
    <div>
      <div role="tablist" aria-label="School history" className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-tmc-border">
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls={`panel-${k}`} onClick={() => setTab(k)}
            className={cn('-mb-px min-h-11 whitespace-nowrap border-b-2 px-3 text-sm transition-colors', tab === k ? 'border-tmc-cyan-deep font-semibold text-tmc-navy' : 'border-transparent font-medium text-tmc-slate hover:border-tmc-border-strong hover:text-tmc-navy')}>
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        <ol className="relative flex flex-col gap-5 pl-6 has-[>li[data-empty]]:before:hidden before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-tmc-border [&>li]:relative [&>li:not([data-empty])]:before:absolute [&>li:not([data-empty])]:before:top-1.5 [&>li:not([data-empty])]:before:-left-6 [&>li:not([data-empty])]:before:size-[11px] [&>li:not([data-empty])]:before:rounded-full [&>li:not([data-empty])]:before:border-2 [&>li:not([data-empty])]:before:border-tmc-white [&>li:not([data-empty])]:before:bg-tmc-border-strong [&>li:not([data-empty])]:before:ring-1 [&>li:not([data-empty])]:before:ring-tmc-border">
          {tab === 'calls' && (calls.length ? calls.map((c) => (
            <li key={c.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-2"><CallOutcomePill outcome={c.outcome} /><span className="text-xs text-tmc-slate">{c.userName} · {fmtDateTime(c.createdAt)}</span></div>
              {c.contactName && <p className="text-xs text-tmc-slate">Spoke to {c.contactName}</p>}
              {c.notes && <p className="mt-1 whitespace-pre-wrap">{c.notes}</p>}
              {c.enquiry && <p className="mt-2 rounded-control border border-tmc-cyan-deep/15 bg-tmc-cyan-wash px-3 py-2 text-tmc-navy">Enquiry: {c.enquiry}</p>}
            </li>
          )) : <li data-empty className="-ml-6 text-sm text-tmc-slate">No calls logged yet.</li>)}
          {tab === 'visits' && (meetings.length ? meetings.map((m) => (
            <li key={m.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <MeetingStatusPill status={m.status} />
                <Link href={`?visit=${m.id}`} scroll={false} className="font-semibold">{fmtDateTime(m.startAt)}</Link>
                <span>with {m.salesName}</span>
              </div>
              <p className="text-xs text-tmc-slate">Booked by {m.scheduledByName}{m.contactName ? ` · meet ${m.contactName}` : ''}</p>
              {m.outcome && <p className="mt-2 rounded-control border border-tmc-success/20 bg-tmc-success-wash px-3 py-2 text-tmc-success-ink">Outcome: {MEETING_OUTCOME_LABEL[m.outcome]}{m.outcomeNotes ? ` — ${m.outcomeNotes}` : ''}</p>}
            </li>
          )) : <li data-empty className="-ml-6 text-sm text-tmc-slate">No visits yet.</li>)}
          {tab === 'followups' && (followUps.length ? followUps.map((f) => (
            <li key={f.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={f.status !== 'pending' ? 'neutral' : new Date(f.dueAt).getTime() < now ? 'danger' : 'warning'}>{f.status}</StatusPill>
                <strong>{fmtDateTime(f.dueAt)}</strong><span className="text-xs text-tmc-slate">· {f.assignedName}</span>
              </div>
              {f.notes && <p className="mt-1 text-xs">{f.notes}</p>}
            </li>
          )) : <li data-empty className="-ml-6 text-sm text-tmc-slate">No follow-ups.</li>)}
          {tab === 'activity' && activities.map((a) => (
            <li key={a.id} className="text-sm">{humanize(a.message)} <span className="text-xs text-tmc-slate">· {a.userName ?? 'System'} · {fmtDateTime(a.createdAt)}</span></li>
          ))}
        </ol>
      </div>
    </div>
  );
}
