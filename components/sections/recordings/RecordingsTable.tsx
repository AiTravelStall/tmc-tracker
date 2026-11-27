import Link from 'next/link';
import { PhoneIncoming, PhoneMissed, PhoneOutgoing } from 'lucide-react';
import type { CallRecording } from '@/types/domain';
import { fmtDateTime, fmtDuration } from '@/lib/shared/format';
import { Table, Td, Th } from '@/components/ui/Table';
import { TranscriptStatusPill } from '@/components/ui/Pills';

function Direction({ call }: { call: CallRecording }) {
  const Icon = !call.answered ? PhoneMissed : call.inbound ? PhoneIncoming : PhoneOutgoing;
  const label = `${call.inbound ? 'Incoming' : 'Outgoing'}${call.answered ? '' : ', not answered'}`;
  return <Icon aria-label={label} className={call.answered ? 'size-4 text-tmc-slate' : 'size-4 text-tmc-error'} />;
}

/** Calls newest first; each row opens the player and transcript. */
export function RecordingsTable({ calls, showCaller, showSchool = true }: { calls: CallRecording[]; showCaller: boolean; showSchool?: boolean }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>When</Th>
          {showSchool && <Th>School / number</Th>}
          {showCaller && <Th>Caller</Th>}
          <Th numeric>Length</Th>
          <Th>Transcript</Th>
        </tr>
      </thead>
      <tbody>
        {calls.map((c) => (
          <tr key={c.id} className="hover:bg-tmc-subtle">
            <Td>
              <Link href={`/recordings/${c.id}`} className="flex items-center gap-2 font-semibold whitespace-nowrap text-tmc-navy">
                <Direction call={c} />{fmtDateTime(c.startedAt)}
              </Link>
            </Td>
            {showSchool && (
              <Td>
                {c.schoolId ? <Link href={`/schools/${c.schoolId}`} className="font-medium">{c.schoolName}</Link> : <span className="text-tmc-slate">Unknown number</span>}
                <span className="block text-xs text-tmc-slate">{[c.contactName, c.phone].filter(Boolean).join(' · ')}</span>
              </Td>
            )}
            {showCaller && <Td className="whitespace-nowrap">{c.userName ?? <span className="text-tmc-slate">Not linked</span>}</Td>}
            <Td numeric>{c.answered ? fmtDuration(c.durationSeconds) : '—'}</Td>
            <Td><TranscriptStatusPill status={c.transcriptStatus} /></Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
