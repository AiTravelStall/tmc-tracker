import Link from 'next/link';
import { PhoneCall } from 'lucide-react';
import type { FollowUp } from '@/types/domain';
import { fmtDateTime, isPast, splitPhones } from '@/lib/shared/format';
import { cn } from '@/lib/shared/cn';
import { Table, Td, Th } from '@/components/ui/Table';
import { SchoolStatusPill } from '@/components/ui/Pills';
import { Phones } from '@/components/ui/ContactLinks';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { buttonClass } from '@/components/ui/Button';
import { SnoozeButton } from './SnoozeButton';

export function FollowUpTable({ rows, showAssignee, showNotes = true }: { rows: FollowUp[]; showAssignee?: boolean; showNotes?: boolean }) {
  return (
    <Table>
      <thead>
        <tr><Th>Due</Th><Th>School</Th><Th>Who to call</Th>{showNotes && <Th>Note</Th>}{showAssignee && <Th>Telemarketer</Th>}<Th><span className="sr-only">Actions</span></Th></tr>
      </thead>
      <tbody>
        {rows.map((f) => {
          const overdue = f.status === 'pending' && isPast(f.dueAt);
          const phone = splitPhones(f.contactPhone).length ? f.contactPhone : f.schoolPhone;
          return (
            <tr key={f.id} className="hover:bg-tmc-subtle">
              <Td className={cn('whitespace-nowrap tabular-nums', overdue && 'text-tmc-error-ink')}>
                <div className="font-semibold">{fmtDateTime(f.dueAt)}</div>
                <div className="text-xs">{f.status === 'pending' ? <RelativeTime value={f.dueAt} /> : f.status}</div>
              </Td>
              <Td>
                <Link href={`/schools/${f.schoolId}`} className="font-semibold text-tmc-navy">{f.schoolName}</Link>
                <div className="text-xs text-tmc-slate">{f.location}</div>
                <div className="mt-1"><SchoolStatusPill status={f.schoolStatus} /></div>
              </Td>
              <Td>
                {f.contactName && <div className="text-xs">{f.contactName}{f.contactPosition ? ` · ${f.contactPosition}` : ''}</div>}
                <Phones value={phone} compact />
              </Td>
              {showNotes && <Td className="text-xs">{f.notes || <span className="text-tmc-slate">—</span>}</Td>}
              {showAssignee && <Td className="text-xs">{f.assignedName}</Td>}
              <Td className="whitespace-nowrap">
                {f.status === 'pending' && (
                  <div className="flex gap-1">
                    <Link href={`/schools/${f.schoolId}#log-call`} className={buttonClass('primary', 'sm')}><PhoneCall aria-hidden />Call & log</Link>
                    <SnoozeButton id={f.id} dueAt={f.dueAt} />
                  </div>
                )}
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
