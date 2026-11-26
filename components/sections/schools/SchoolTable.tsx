'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, PhoneCall, SearchX } from 'lucide-react';
import type { DirectoryUser, Role, SchoolListItem } from '@/types/domain';
import { api } from '@/lib/shared/apiClient';
import { useAction } from '@/lib/hooks/useAction';
import { useNow } from '@/lib/hooks/useNow';
import { fmtDateTime } from '@/lib/shared/format';
import { cn } from '@/lib/shared/cn';
import { Table, Td, Th } from '@/components/ui/Table';
import { SchoolStatusPill } from '@/components/ui/Pills';
import { Phones } from '@/components/ui/ContactLinks';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/FormField';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';

export function SchoolTable({ rows, role, telemarketers }: { rows: SchoolListItem[]; role: Role; telemarketers: DirectoryUser[] }) {
  const router = useRouter();
  const toast = useToast();
  const isAdmin = role === 'admin';
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignee, setAssignee] = useState('');
  const assign = useAction(async () => {
    const r = await api.post<{ updated: number }>('/schools/assign', { ids: [...selected], telemarketerId: assignee || null });
    toast(`Updated ${r.updated} schools`);
    setSelected(new Set());
    setAssignOpen(false);
  });

  const now = useNow();
  if (!rows.length) return <EmptyState icon={<SearchX />} title="No schools match these filters">Try a different search or clear a filter.</EmptyState>;
  const allChecked = rows.every((r) => selected.has(r.id));
  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <>
      {isAdmin && selected.size > 0 && (
        <div className="tmc-reveal flex items-center justify-between gap-3 border-b border-tmc-cyan-deep/20 bg-tmc-cyan-wash px-5 py-2.5 text-sm sm:px-6">
          <span className="text-tmc-navy"><strong>{selected.size}</strong> selected</span>
          <Button size="sm" onClick={() => setAssignOpen(true)}>Assign to telemarketer</Button>
        </div>
      )}
      <Table>
        <thead>
          <tr>
            {isAdmin && (
              <Th className="w-10">
                <input type="checkbox" aria-label="Select all on this page" checked={allChecked}
                  onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} className="tmc-checkbox" />
              </Th>
            )}
            <Th>School</Th>
            <Th>Tier / curriculum</Th>
            <Th>School phone</Th>
            <Th>Status</Th>
            <Th>Last contact</Th>
            <Th>Next step</Th>
            {role !== 'sales' && <Th>Telemarketer</Th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className={cn('cursor-pointer hover:bg-tmc-subtle', selected.has(s.id) && 'bg-tmc-cyan-wash/50')} onClick={() => router.push(`/schools/${s.id}`)}>
              {isAdmin && (
                <Td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" aria-label={`Select ${s.name}`} checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="tmc-checkbox" />
                </Td>
              )}
              <Td>
                <Link href={`/schools/${s.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-tmc-navy">{s.name}</Link>
                <div className="text-xs text-tmc-slate">{s.location} · {s.contactCount} contact{s.contactCount === 1 ? '' : 's'}</div>
              </Td>
              <Td><div className="text-xs">{s.tier}</div><div className="text-xs text-tmc-slate">{s.curriculum}</div></Td>
              <Td onClick={(e) => e.stopPropagation()}><Phones value={s.schoolPhone} compact /></Td>
              <Td><SchoolStatusPill status={s.status} /></Td>
              <Td className="text-xs">{s.lastContactedAt ? <RelativeTime value={s.lastContactedAt} /> : <span className="text-tmc-slate">Never</span>}</Td>
              <Td className="text-xs whitespace-nowrap">
                {s.nextMeetingAt ? <span className="inline-flex items-center gap-1.5 text-tmc-violet-ink"><MapPin aria-hidden className="size-3.5" />{fmtDateTime(s.nextMeetingAt)}</span>
                  : s.nextFollowUpAt ? (
                    <span className={cn('inline-flex items-center gap-1.5', now !== null && new Date(s.nextFollowUpAt).getTime() < now ? 'font-semibold text-tmc-error-ink' : 'text-tmc-charcoal')}>
                      <PhoneCall aria-hidden className="size-3.5" />{fmtDateTime(s.nextFollowUpAt)}
                    </span>
                  ) : <span className="text-tmc-slate">—</span>}
              </Td>
              {role !== 'sales' && <Td className="text-xs">{s.assignedName ?? <span className="text-tmc-slate">—</span>}</Td>}
            </tr>
          ))}
        </tbody>
      </Table>

      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} title={`Assign ${selected.size} schools`}
        footer={<>
          <Button variant="ghost" onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button onClick={() => assign.run()} loading={assign.pending}>{assign.pending ? 'Saving…' : 'Save'}</Button>
        </>}>
        <FormField label="Telemarketer">
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">— Unassign —</option>
            {telemarketers.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </select>
        </FormField>
        {assign.error && <Alert className="mt-3">{assign.error.message}</Alert>}
      </Dialog>
    </>
  );
}
