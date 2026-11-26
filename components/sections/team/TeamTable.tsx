'use client';

import { useState } from 'react';
import { Pencil, UserPlus } from 'lucide-react';
import { api } from '@/lib/shared/apiClient';
import { useAction } from '@/lib/hooks/useAction';
import { ROLE_LABEL } from '@/lib/shared/labels';
import { fmtDate } from '@/lib/shared/format';
import { cn } from '@/lib/shared/cn';
import type { Profile, Role } from '@/types/domain';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { Table, Td, Th } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { UserDialog } from './UserDialog';

const ROLE_TONE: Record<Role, 'danger' | 'info' | 'success'> = { admin: 'danger', telemarketer: 'info', sales: 'success' };

export function TeamTable({ users, meId }: { users: Profile[]; meId: string }) {
  const toast = useToast();
  const [editing, setEditing] = useState<Profile | 'new' | null>(null);
  const toggle = useAction(async (u: Profile) => {
    await api.patch(`/users/${u.id}`, { active: !u.active });
    toast(u.active ? `${u.fullName} can no longer sign in` : `${u.fullName} re-enabled`);
  });

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-tmc-border px-5 py-3 sm:px-6">
        <p className="text-sm text-tmc-slate"><strong className="text-tmc-navy">{users.filter((u) => u.active).length}</strong> active of {users.length}</p>
        <Button onClick={() => setEditing('new')}><UserPlus aria-hidden />Add user</Button>
      </div>
      {toggle.error && <p role="alert" className="px-5 pt-3 text-sm text-tmc-error-ink">{toggle.error.message}</p>}
      <Table>
        <thead><tr><Th>Name</Th><Th>Email</Th><Th>Phone</Th><Th>Role</Th><Th>Status</Th><Th>Since</Th><Th><span className="sr-only">Actions</span></Th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={cn('hover:bg-tmc-subtle', !u.active && 'opacity-60')}>
              <Td>
                <span className="flex items-center gap-3">
                  <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-tmc-cyan-wash text-xs font-semibold text-tmc-cyan-deep">
                    {u.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                  </span>
                  <span className="font-semibold text-tmc-navy">{u.fullName}{u.id === meId && <span className="font-normal text-tmc-slate"> (you)</span>}</span>
                </span>
              </Td>
              <Td className="break-all">{u.email}</Td>
              <Td>{u.phone || '—'}</Td>
              <Td><StatusPill tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</StatusPill></Td>
              <Td>{!u.active ? <StatusPill>Disabled</StatusPill> : u.mustChangePassword ? <StatusPill tone="warning">Invited</StatusPill> : <StatusPill tone="success">Active</StatusPill>}</Td>
              <Td className="text-xs whitespace-nowrap text-tmc-slate">{fmtDate(u.createdAt)}</Td>
              <Td className="whitespace-nowrap">
                <Button size="sm" variant="ghost" onClick={() => setEditing(u)} aria-label={`Edit ${u.fullName}`}><Pencil aria-hidden />Edit</Button>
                {u.id !== meId && (
                  <Button size="sm" variant={u.active ? 'danger' : 'ghost'} onClick={() => toggle.run(u)} disabled={toggle.pending}>
                    {u.active ? 'Disable' : 'Enable'}
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {editing && <UserDialog user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
