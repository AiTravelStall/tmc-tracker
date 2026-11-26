'use client';

import { useEffect } from 'react';
import { api } from '@/lib/shared/apiClient';
import { useAction } from '@/lib/hooks/useAction';
import { STATUS_LABEL } from '@/lib/shared/labels';
import type { DirectoryUser, SchoolStatus } from '@/types/domain';
import { useToast } from '@/components/ui/Toast';

export function SchoolAdminControls({ schoolId, status, assignedId, telemarketers }: {
  schoolId: number; status: SchoolStatus; assignedId: string | null; telemarketers: DirectoryUser[];
}) {
  const toast = useToast();
  const save = useAction(async (patch: Record<string, unknown>) => {
    await api.patch(`/schools/${schoolId}`, patch);
    toast('Saved');
  });
  useEffect(() => { if (save.error) toast(save.error.message, 'error'); }, [save.error, toast]);
  return (
    <div className="flex flex-wrap gap-2">
      <label className="sr-only" htmlFor="admin-status">Override status</label>
      <select id="admin-status" className="tmc-input min-h-10 w-auto py-1.5 text-sm" value={status} disabled={save.pending}
        onChange={(e) => save.run({ status: e.target.value })}>
        {(Object.keys(STATUS_LABEL) as SchoolStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      <label className="sr-only" htmlFor="admin-assignee">Assigned telemarketer</label>
      <select id="admin-assignee" className="tmc-input min-h-10 w-auto py-1.5 text-sm" value={assignedId ?? ''} disabled={save.pending}
        onChange={(e) => save.run({ assignedTelemarketerId: e.target.value || null })}>
        <option value="">Unassigned</option>
        {telemarketers.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
      </select>
    </div>
  );
}
