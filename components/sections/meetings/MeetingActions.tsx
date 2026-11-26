'use client';

import { useState } from 'react';
import { CalendarClock, CalendarX, ClipboardCheck, FileText, Hourglass, Repeat, ThumbsDown, Trophy } from 'lucide-react';
import { api, ClientApiError } from '@/lib/shared/apiClient';
import { useAction } from '@/lib/hooks/useAction';
import { useNow } from '@/lib/hooks/useNow';
import { MEETING_OUTCOME_OPTIONS } from '@/lib/shared/labels';
import { fromZonedInput, toZonedInput } from '@/lib/shared/time';
import { fmtDateTime } from '@/lib/shared/format';
import type { Conflict, DirectoryUser, Meeting, MeetingOutcome, Role } from '@/types/domain';
import type { MeetingUpdateInput } from '@/lib/shared/validation';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Feedback';
import { ChoiceCards, type ChoiceOption } from '@/components/ui/Choice';
import { useToast } from '@/components/ui/Toast';

const OUTCOME_UI: Record<MeetingOutcome, Pick<ChoiceOption<MeetingOutcome>, 'icon' | 'tone'>> = {
  converted: { icon: <Trophy />, tone: 'positive' },
  interested: { icon: <Hourglass />, tone: 'neutral' },
  proposal_sent: { icon: <FileText />, tone: 'neutral' },
  follow_up: { icon: <Repeat />, tone: 'neutral' },
  not_interested: { icon: <ThumbsDown />, tone: 'negative' },
};

type Mode = null | 'complete' | 'reschedule' | 'cancel' | 'no_show';

export function MeetingActions({ meeting, role, salesPeople, onDone }: {
  meeting: Meeting; role: Role; salesPeople: DirectoryUser[]; onDone: () => void;
}) {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>(null);
  const [outcome, setOutcome] = useState<MeetingOutcome | ''>('');
  const [notes, setNotes] = useState('');
  const [start, setStart] = useState(toZonedInput(meeting.startAt));
  const [duration, setDuration] = useState(Math.round((+new Date(meeting.endAt) - +new Date(meeting.startAt)) / 60000));
  const [salesUserId, setSalesUserId] = useState(meeting.salesUserId);
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const now = useNow();
  const isPast = now !== null && new Date(meeting.endAt).getTime() < now;

  const save = useAction(async (force: boolean) => {
    let body: MeetingUpdateInput;
    if (mode === 'complete') body = { action: 'complete', outcome: outcome as MeetingOutcome, notes };
    else if (mode === 'reschedule') body = { action: 'reschedule', startAt: fromZonedInput(start), durationMin: duration, salesUserId: role === 'sales' ? undefined : salesUserId, force };
    else body = { action: mode === 'cancel' ? 'cancel' : 'no_show', notes };
    try {
      await api.patch(`/meetings/${meeting.id}`, body);
    } catch (e) {
      if (e instanceof ClientApiError && e.code === 'CONFLICT' && Array.isArray(e.details)) setConflicts(e.details as Conflict[]);
      throw e;
    }
    toast(mode === 'complete' ? 'Visit outcome saved' : mode === 'reschedule' ? 'Visit rescheduled' : 'Visit updated');
    setMode(null);
    onDone();
  });

  const open = (m: Mode) => { setMode(m); setConflicts(null); save.setError(null); };

  if (!mode) {
    return (
      <div className="flex flex-col gap-3">
        {isPast && <Alert tone="warning">This visit time has passed — please record what happened.</Alert>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => open('complete')}><ClipboardCheck aria-hidden />Record visit outcome</Button>
          <Button variant="outline" onClick={() => open('reschedule')}><CalendarClock aria-hidden />Reschedule</Button>
          {isPast && <Button variant="outline" onClick={() => open('no_show')}>No show</Button>}
          <Button variant="danger" onClick={() => open('cancel')}><CalendarX aria-hidden />Cancel visit</Button>
        </div>
      </div>
    );
  }

  return (
    <form className="tmc-reveal flex flex-col gap-4 rounded-control border border-tmc-border bg-tmc-subtle p-4" onSubmit={(e) => { e.preventDefault(); save.run(false); }}>
      {mode === 'complete' && (
        <>
          <ChoiceCards name={`visit-outcome-${meeting.id}`} legend="How did the visit go?" value={outcome} onChange={setOutcome}
            options={MEETING_OUTCOME_OPTIONS.map((o) => ({ ...o, ...OUTCOME_UI[o.value] }))} />
          <FormField label="Discussion notes">
            <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Who you met, what was discussed, requirements, next steps…" />
          </FormField>
        </>
      )}
      {mode === 'reschedule' && (
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="New date & time"><input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required /></FormField>
          <FormField label="Duration">
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}
            </select>
          </FormField>
          {role !== 'sales' && (
            <FormField label="Sales person">
              <select value={salesUserId} onChange={(e) => setSalesUserId(e.target.value)}>
                {salesPeople.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </FormField>
          )}
        </div>
      )}
      {(mode === 'cancel' || mode === 'no_show') && (
        <FormField label="Reason" hint="The telemarketer who booked it automatically gets a follow-up call to re-book.">
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
      )}
      {conflicts ? (
        <Alert tone="warning">
          Clashes with:
          <ul className="list-disc pl-4">{conflicts.map((c) => <li key={c.id}>{fmtDateTime(c.startAt)} — {c.schoolName}</li>)}</ul>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => save.run(true)}>Save anyway</Button>
        </Alert>
      ) : save.error && <Alert>{save.error.message}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" loading={save.pending} disabled={mode === 'complete' && !outcome}>{save.pending ? 'Saving…' : 'Save'}</Button>
        <Button variant="ghost" onClick={() => setMode(null)}>Back</Button>
      </div>
    </form>
  );
}
