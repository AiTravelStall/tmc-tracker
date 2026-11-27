import { CALL_OUTCOME_LABEL, CALL_OUTCOME_TONE, MEETING_STATUS_LABEL, MEETING_STATUS_TONE, STATUS_LABEL, STATUS_TONE, TRANSCRIPT_STATUS_LABEL, TRANSCRIPT_STATUS_TONE } from '@/lib/shared/labels';
import type { CallOutcome, MeetingStatus, SchoolStatus, TranscriptStatus } from '@/types/domain';
import { StatusPill } from './StatusPill';

export const SchoolStatusPill = ({ status }: { status: SchoolStatus }) => <StatusPill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusPill>;
export const MeetingStatusPill = ({ status }: { status: MeetingStatus }) => <StatusPill tone={MEETING_STATUS_TONE[status]}>{MEETING_STATUS_LABEL[status]}</StatusPill>;
export const CallOutcomePill = ({ outcome }: { outcome: CallOutcome }) => <StatusPill tone={CALL_OUTCOME_TONE[outcome]}>{CALL_OUTCOME_LABEL[outcome]}</StatusPill>;
export const TranscriptStatusPill = ({ status }: { status: TranscriptStatus }) => <StatusPill tone={TRANSCRIPT_STATUS_TONE[status]}>{TRANSCRIPT_STATUS_LABEL[status]}</StatusPill>;
