import type { CallOutcome, MeetingOutcome, MeetingStatus, Role, SchoolStatus, TranscriptStatus } from '@/types/domain';

export const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', telemarketer: 'Telemarketer', sales: 'Sales' };

export const STATUS_LABEL: Record<SchoolStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  follow_up: 'Follow-up',
  interested: 'Enquiry / Interested',
  meeting_scheduled: 'Visit scheduled',
  meeting_done: 'Visited',
  converted: 'Converted',
  not_interested: 'Not interested',
  invalid: 'Invalid / Wrong no.',
};

export const CALL_OUTCOME_OPTIONS: { value: CallOutcome; label: string; hint: string }[] = [
  { value: 'meeting_scheduled', label: 'Schedule sales visit', hint: 'Agreed to meet a sales person' },
  { value: 'follow_up', label: 'Call back later', hint: 'Asked us to call on another day' },
  { value: 'interested', label: 'Enquiry taken', hint: 'Interested; requirement noted' },
  { value: 'not_reachable', label: 'Not reachable', hint: 'No answer, busy or switched off' },
  { value: 'not_interested', label: 'Not interested', hint: 'School declined for now' },
  { value: 'wrong_number', label: 'Wrong number', hint: 'Number is invalid or not the school' },
];
export const CALL_OUTCOME_LABEL = Object.fromEntries(CALL_OUTCOME_OPTIONS.map((o) => [o.value, o.label])) as Record<CallOutcome, string>;

export const MEETING_OUTCOME_OPTIONS: { value: MeetingOutcome; label: string }[] = [
  { value: 'converted', label: 'Converted / deal won' },
  { value: 'interested', label: 'Interested — needs more time' },
  { value: 'proposal_sent', label: 'Proposal / quote to be sent' },
  { value: 'follow_up', label: 'Second visit needed' },
  { value: 'not_interested', label: 'Not interested' },
];
export const MEETING_OUTCOME_LABEL = Object.fromEntries(MEETING_OUTCOME_OPTIONS.map((o) => [o.value, o.label])) as Record<MeetingOutcome, string>;

export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No show',
};

export type Tone = 'neutral' | 'info' | 'brand' | 'success' | 'warning' | 'danger' | 'violet';

export const STATUS_TONE: Record<SchoolStatus, Tone> = {
  new: 'neutral', contacted: 'info', follow_up: 'warning', interested: 'brand', meeting_scheduled: 'violet',
  meeting_done: 'violet', converted: 'success', not_interested: 'danger', invalid: 'neutral',
};
export const MEETING_STATUS_TONE: Record<MeetingStatus, Tone> = {
  scheduled: 'info', completed: 'success', cancelled: 'neutral', no_show: 'danger',
};
export const CALL_OUTCOME_TONE: Record<CallOutcome, Tone> = {
  meeting_scheduled: 'success', interested: 'brand', follow_up: 'warning',
  not_reachable: 'neutral', not_interested: 'danger', wrong_number: 'danger',
};

export const TRANSCRIPT_STATUS_LABEL: Record<TranscriptStatus, string> = {
  pending: 'Transcribing', done: 'Transcript ready', no_recording: 'No recording', skipped: 'Not answered', failed: 'Transcript failed',
};
export const TRANSCRIPT_STATUS_TONE: Record<TranscriptStatus, Tone> = {
  pending: 'info', done: 'success', no_recording: 'neutral', skipped: 'neutral', failed: 'danger',
};

/** Whisper reports languages as ISO codes or English names; show a friendly name. */
const LANGUAGES: Record<string, string> = { en: 'English', hi: 'Hindi', kn: 'Kannada', ta: 'Tamil', te: 'Telugu', ml: 'Malayalam', mr: 'Marathi', bn: 'Bengali', ur: 'Urdu' };
export const languageLabel = (v: string | null) => (v ? LANGUAGES[v.toLowerCase()] ?? v.charAt(0).toUpperCase() + v.slice(1) : null);
