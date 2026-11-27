import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, FileText } from 'lucide-react';
import { requirePageUser } from '@/lib/server/auth';
import { getRecording } from '@/lib/server/data/recordings';
import { AppError } from '@/lib/server/errors';
import { fmtDateTime, fmtDuration } from '@/lib/shared/format';
import { languageLabel } from '@/lib/shared/labels';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/Feedback';
import { TranscriptStatusPill } from '@/components/ui/Pills';
import { TranscriptPlayer } from '@/components/sections/recordings/TranscriptPlayer';

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  try {
    return await getRecording(id);
  } catch (e) {
    if (e instanceof AppError && e.code === 'NOT_FOUND') notFound();
    throw e;
  }
}

export const metadata: Metadata = { title: 'Call recording' };

const WAITING: Record<string, string> = {
  pending: 'Waiting for the recording. Salestrail uploads it from the phone after the call, usually within a few minutes. Once it shows a play button in the Salestrail dashboard, press Refetch recordings. If it never appears, check that call recording is turned on in the Salestrail app.',
  no_recording: 'Salestrail has no recording for this call. Recording works on Android phones with the Call Recording add-on.',
  skipped: 'This call wasn’t answered (or was only a few seconds), so there is nothing to transcribe.',
  failed: 'The transcript couldn’t be created after several tries.',
};

export default async function RecordingPage({ params }: Props) {
  const user = await requirePageUser();
  const call = await load((await params).id);
  const who = call.schoolName ?? call.phone;
  const facts: [string, string][] = [
    ['When', fmtDateTime(call.startedAt)],
    ['Direction', call.inbound ? 'Incoming' : 'Outgoing'],
    ['Length', call.answered ? fmtDuration(call.durationSeconds) : 'Not answered'],
    ['Number', call.phone || '—'],
    ...(call.contactName ? [['Spoke with', call.contactName] as [string, string]] : []),
    ...(user.role === 'admin' ? [['Caller', call.userName ?? 'Not linked to a tracker user'] as [string, string]] : []),
    ...(call.transcriptLanguage ? [['Language', languageLabel(call.transcriptLanguage)!] as [string, string]] : []),
  ];

  return (
    <>
      <PageHeader
        eyebrow={(
          <Link href="/recordings" className="-ml-1 inline-flex min-h-9 items-center gap-1 rounded-control px-1 text-[13px] font-medium text-tmc-slate no-underline hover:text-tmc-navy hover:no-underline">
            <ChevronLeft aria-hidden className="size-4" />Recordings
          </Link>
        )}
        title={who}
        description={<span className="flex flex-wrap items-center gap-x-3 gap-y-1"><TranscriptStatusPill status={call.transcriptStatus} />
          {call.schoolId && <Link href={`/schools/${call.schoolId}`}>Open school</Link>}</span>}
      />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card aria-labelledby="transcript-title">
          <CardHeader id="transcript-title" icon={<FileText />} title="Recording and transcript"
            description={call.segments.length ? 'Click any line to play from there.' : undefined} />
          {/* Only when Salestrail has audio: done (transcribed) or failed (audio existed but transcription didn't work). */}
          {call.transcriptStatus === 'done' || call.transcriptStatus === 'failed'
            ? <TranscriptPlayer src={`/api/recordings/${call.id}/audio`} segments={call.segments} text={call.transcript} />
            : null}
          {call.transcriptStatus !== 'done' && (
            <EmptyState compact icon={<FileText />}>{WAITING[call.transcriptStatus]}</EmptyState>
          )}
        </Card>
        <Card aria-label="Call details">
          <dl className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-3 text-sm">
            {facts.map(([k, v]) => <div key={k} className="contents"><dt className="text-tmc-slate">{k}</dt><dd className="min-w-0 break-words">{v}</dd></div>)}
          </dl>
        </Card>
      </div>
    </>
  );
}
