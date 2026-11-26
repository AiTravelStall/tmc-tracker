'use client';

import { useState } from 'react';
import { BellRing } from 'lucide-react';
import { api } from '@/lib/shared/apiClient';
import { useAction } from '@/lib/hooks/useAction';
import { useNow } from '@/lib/hooks/useNow';
import { fromZonedInput, toZonedInput } from '@/lib/shared/time';
import { fmtDateTime } from '@/lib/shared/format';
import { cn } from '@/lib/shared/cn';
import type { FollowUp } from '@/types/domain';
import { Button } from '@/components/ui/Button';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { useToast } from '@/components/ui/Toast';

export function FollowUpItem({ followUp: f, canEdit }: { followUp: FollowUp; canEdit: boolean }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [due, setDue] = useState(toZonedInput(f.dueAt));
  const now = useNow();
  const overdue = now !== null && new Date(f.dueAt).getTime() < now;
  const patch = useAction(async (body: Record<string, unknown>, msg: string) => {
    await api.patch(`/followups/${f.id}`, body);
    toast(msg);
    setEditing(false);
  });

  return (
    <div className={cn('flex gap-3 rounded-control border p-3 text-sm', overdue ? 'border-tmc-error/25 bg-tmc-error-wash' : 'border-tmc-warning/25 bg-tmc-warning-wash/60')}>
      <BellRing aria-hidden className={cn('mt-0.5 size-4 shrink-0', overdue ? 'text-tmc-error-ink' : 'text-tmc-warning-ink')} />
      <div className="min-w-0 flex-1">
      <p className="font-semibold text-tmc-navy">Follow-up call{overdue && <span className="text-tmc-error-ink"> · overdue</span>}</p>
      <p className="text-xs text-tmc-charcoal">{fmtDateTime(f.dueAt)} · <RelativeTime value={f.dueAt} /> · {f.assignedName}</p>
      {f.notes && <p className="mt-1 text-xs text-tmc-charcoal">{f.notes}</p>}
      {canEdit && !editing && (
        <div className="mt-2 -ml-1 flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Reschedule</Button>
          <Button size="sm" variant="ghost" onClick={() => patch.run({ status: 'cancelled' }, 'Follow-up cancelled')}>Cancel</Button>
        </div>
      )}
      {editing && (
        <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); patch.run({ dueAt: fromZonedInput(due) }, 'Follow-up moved'); }}>
          <label className="sr-only" htmlFor={`fu-${f.id}`}>New follow-up time</label>
          <input id={`fu-${f.id}`} type="datetime-local" className="tmc-input min-h-9 w-auto py-1" value={due} onChange={(e) => setDue(e.target.value)} />
          <Button size="sm" type="submit" loading={patch.pending}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Back</Button>
        </form>
      )}
      {patch.error && <p role="alert" className="mt-1 text-xs text-tmc-error-ink">{patch.error.message}</p>}
      </div>
    </div>
  );
}
