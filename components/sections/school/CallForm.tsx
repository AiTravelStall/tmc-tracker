'use client';

import { useState, type ReactNode } from 'react';
import { BellRing, CalendarCheck, CalendarClock, ClipboardList, PhoneMissed, PhoneOff, ThumbsDown } from 'lucide-react';
import { api, ClientApiError } from '@/lib/shared/apiClient';
import { useAction } from '@/lib/hooks/useAction';
import { CALL_OUTCOME_OPTIONS } from '@/lib/shared/labels';
import { logCallSchema } from '@/lib/shared/validation';
import { fromZonedInput, slotInDays, toZonedInput } from '@/lib/shared/time';
import { fmtDateTime } from '@/lib/shared/format';
import type { CallOutcome, Conflict, Contact, DirectoryUser } from '@/types/domain';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { ChoiceCards, PresetChips, Switch, type ChoiceOption } from '@/components/ui/Choice';
import { Alert } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import { SalesDayPreview } from './SalesDayPreview';

const QUICK = [{ value: 1, label: 'Tomorrow' }, { value: 2, label: 'In 2 days' }, { value: 3, label: 'In 3 days' }, { value: 7, label: 'Next week' }, { value: 14, label: 'In 2 weeks' }] as const;
const DURATIONS = [30, 45, 60, 90, 120];
const newClientId = () => crypto.randomUUID();

const OUTCOME_UI: Record<CallOutcome, Pick<ChoiceOption<CallOutcome>, 'icon' | 'tone'>> = {
  meeting_scheduled: { icon: <CalendarCheck />, tone: 'positive' },
  follow_up: { icon: <CalendarClock />, tone: 'neutral' },
  interested: { icon: <ClipboardList />, tone: 'positive' },
  not_reachable: { icon: <PhoneMissed />, tone: 'negative' },
  not_interested: { icon: <ThumbsDown />, tone: 'negative' },
  wrong_number: { icon: <PhoneOff />, tone: 'negative' },
};
const OUTCOMES: ChoiceOption<CallOutcome>[] = CALL_OUTCOME_OPTIONS.map((o) => ({ value: o.value, label: o.label, description: o.hint, ...OUTCOME_UI[o.value] }));

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className="tmc-reveal flex flex-col gap-4 rounded-control border border-tmc-border bg-tmc-subtle p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-tmc-navy">
        <span aria-hidden className="text-tmc-cyan-deep [&_svg]:size-4">{icon}</span>{title}
      </p>
      {children}
    </div>
  );
}

export function CallForm({ schoolId, schoolAddress, contacts, salesPeople, defaultContactId }: {
  schoolId: number; schoolAddress: string; contacts: Contact[]; salesPeople: DirectoryUser[]; defaultContactId?: number;
}) {
  const toast = useToast();
  // A fresh id per attempt-series makes retries idempotent; regenerated after success.
  const [clientId, setClientId] = useState(newClientId);
  const [outcome, setOutcome] = useState<CallOutcome | ''>('');
  const [contactId, setContactId] = useState(defaultContactId ? String(defaultContactId) : '');
  const [notes, setNotes] = useState('');
  const [enquiry, setEnquiry] = useState('');
  const [followUpOn, setFollowUpOn] = useState(false);
  const [followUp, setFollowUp] = useState({ dueLocal: slotInDays(1), notes: '' });
  const [visit, setVisit] = useState({
    salesUserId: salesPeople.length === 1 ? salesPeople[0]!.id : '', startLocal: slotInDays(2), durationMin: 60,
    address: schoolAddress, agenda: '',
  });
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // "Log call" on a contact card sets ?contact=…; adopt it when it changes (render-time state sync).
  const [seenDefault, setSeenDefault] = useState(defaultContactId);
  if (defaultContactId !== seenDefault) {
    setSeenDefault(defaultContactId);
    if (defaultContactId) setContactId(String(defaultContactId));
  }

  const submit = useAction(async (force: boolean) => {
    if (!outcome) return;
    let body;
    try {
      body = logCallSchema.parse({
        clientId, outcome, notes, enquiry,
        contactId: contactId ? Number(contactId) : null,
        followUp: followUpOn && outcome !== 'meeting_scheduled' ? { dueAt: fromZonedInput(followUp.dueLocal), notes: followUp.notes } : null,
        meeting: outcome === 'meeting_scheduled'
          ? { ...visit, startAt: visit.startLocal ? fromZonedInput(visit.startLocal) : '' }
          : null,
        force,
      });
    } catch (e) {
      setFormError(e instanceof Error && 'issues' in e ? (e as { issues: { message: string }[] }).issues[0]?.message ?? 'Check the form' : 'Check the form');
      return;
    }
    try {
      await api.post(`/schools/${schoolId}/calls`, body);
    } catch (e) {
      if (e instanceof ClientApiError && e.code === 'CONFLICT' && Array.isArray(e.details)) setConflicts(e.details as Conflict[]);
      throw e;
    }
    toast(outcome === 'meeting_scheduled' ? 'Call logged and visit booked' : body.followUp ? 'Call logged, follow-up scheduled' : 'Call logged');
    setOutcome(''); setNotes(''); setEnquiry(''); setConflicts(null); setClientId(newClientId());
  });

  const chooseOutcome = (o: CallOutcome) => {
    setOutcome(o);
    // Outcomes that imply a callback default the follow-up on.
    setFollowUpOn(o === 'follow_up' || o === 'not_reachable' || o === 'interested');
    setConflicts(null);
    setFormError(null);
    submit.setError(null);
  };

  const canSubmit = !!outcome && (outcome !== 'meeting_scheduled' || (visit.salesUserId && visit.startLocal));
  const preset = QUICK.find((q) => slotInDays(q.value) === followUp.dueLocal)?.value ?? null;

  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); setFormError(null); submit.run(false); }}>
      <FormField label="Who did you speak to?">
        <select value={contactId} onChange={(e) => setContactId(e.target.value)}>
          <option value="">School reception / general line</option>
          {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.position ? ` — ${c.position}` : ''}</option>)}
        </select>
      </FormField>

      <ChoiceCards name={`outcome-${schoolId}`} legend="How did the call go?" options={OUTCOMES} value={outcome} onChange={chooseOutcome} />

      <FormField label="Call notes" hint={outcome ? undefined : 'Saved with the call so the next caller has context.'}>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was discussed, who to ask for, best time to call…" />
      </FormField>

      {(outcome === 'interested' || outcome === 'meeting_scheduled' || outcome === 'follow_up') && (
        <FormField label="Enquiry / requirement" hint="Grades, number of students, dates, budget, programme of interest">
          <textarea rows={2} value={enquiry} onChange={(e) => setEnquiry(e.target.value)} />
        </FormField>
      )}

      {outcome === 'meeting_scheduled' && (
        <Panel title="Book the sales visit" icon={<CalendarCheck />}>
          <div className="grid gap-3 @container sm:grid-cols-2">
            <FormField label="Sales person">
              <select value={visit.salesUserId} onChange={(e) => setVisit({ ...visit, salesUserId: e.target.value })} required>
                <option value="">Choose a sales person</option>
                {salesPeople.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </FormField>
            <FormField label="Duration">
              <select value={visit.durationMin} onChange={(e) => setVisit({ ...visit, durationMin: Number(e.target.value) })}>
                {DURATIONS.map((m) => <option key={m} value={m}>{m} minutes</option>)}
              </select>
            </FormField>
            <FormField label="Date & time" className="sm:col-span-2">
              <input type="datetime-local" value={visit.startLocal} min={toZonedInput(new Date())} required
                onChange={(e) => setVisit({ ...visit, startLocal: e.target.value })} />
            </FormField>
          </div>
          <SalesDayPreview salesUserId={visit.salesUserId} startLocal={visit.startLocal} />
          <FormField label="Address">
            <input value={visit.address} onChange={(e) => setVisit({ ...visit, address: e.target.value })} />
          </FormField>
          <FormField label="Brief for the sales person">
            <textarea rows={2} value={visit.agenda} onChange={(e) => setVisit({ ...visit, agenda: e.target.value })} placeholder="Who they'll meet and what the school wants" />
          </FormField>
        </Panel>
      )}

      {outcome && outcome !== 'meeting_scheduled' && (
        <div className="tmc-reveal flex flex-col gap-4 rounded-control border border-tmc-border bg-tmc-subtle p-4">
          <Switch checked={followUpOn} disabled={outcome === 'follow_up'} onChange={setFollowUpOn}
            label={<span className="inline-flex items-center gap-2"><BellRing aria-hidden className="size-4 text-tmc-cyan-deep" />Schedule a follow-up call</span>}
            description={outcome === 'follow_up' ? 'Required for “Call back later”.' : 'You’ll get a reminder when it’s due.'} />
          {followUpOn && (
            <div className="tmc-reveal flex flex-col gap-3">
              <PresetChips label="Quick dates" options={QUICK} value={preset} onChange={(d) => setFollowUp({ ...followUp, dueLocal: slotInDays(d) })} />
              <FormField label="Follow-up on">
                <input type="datetime-local" value={followUp.dueLocal} required onChange={(e) => setFollowUp({ ...followUp, dueLocal: e.target.value })} />
              </FormField>
              <FormField label="Reminder note">
                <input value={followUp.notes} placeholder="e.g. Ask for the principal after 3pm" onChange={(e) => setFollowUp({ ...followUp, notes: e.target.value })} />
              </FormField>
            </div>
          )}
        </div>
      )}

      {conflicts ? (
        <Alert tone="warning">
          <p className="font-semibold">{submit.error?.message}</p>
          <ul className="mt-1 list-disc pl-4">{conflicts.map((c) => <li key={c.id}>{fmtDateTime(c.startAt)} — {c.schoolName}</li>)}</ul>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => submit.run(true)} disabled={submit.pending}>Book anyway</Button>
        </Alert>
      ) : (formError || submit.error) && <Alert>{formError ?? submit.error?.message}</Alert>}

      <div className="flex flex-col gap-2">
        <Button type="submit" size="lg" disabled={!canSubmit} loading={submit.pending} className="w-full">
          {submit.pending ? 'Saving…' : outcome === 'meeting_scheduled' ? 'Log call & book visit' : 'Log call'}
        </Button>
        {!outcome && <p className="text-center text-xs text-tmc-slate">Choose how the call went to continue.</p>}
      </div>
    </form>
  );
}
