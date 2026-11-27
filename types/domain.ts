// Domain types shared by server and client. Values mirror the Postgres enums.

export const ROLES = ['admin', 'telemarketer', 'sales'] as const;
export type Role = (typeof ROLES)[number];

export const SCHOOL_STATUSES = [
  'new', 'contacted', 'follow_up', 'interested', 'meeting_scheduled',
  'meeting_done', 'converted', 'not_interested', 'invalid',
] as const;
export type SchoolStatus = (typeof SCHOOL_STATUSES)[number];

export const CALL_OUTCOMES = [
  'meeting_scheduled', 'follow_up', 'interested', 'not_reachable', 'not_interested', 'wrong_number',
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const MEETING_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const MEETING_OUTCOMES = ['converted', 'interested', 'proposal_sent', 'follow_up', 'not_interested'] as const;
export type MeetingOutcome = (typeof MEETING_OUTCOMES)[number];

export type FollowUpStatus = 'pending' | 'done' | 'cancelled';

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
};

export type DirectoryUser = Pick<Profile, 'id' | 'fullName' | 'role' | 'active'>;

export type SchoolListItem = {
  id: number;
  name: string;
  location: string;
  tier: string;
  curriculum: string;
  schoolPhone: string;
  status: SchoolStatus;
  assignedTelemarketerId: string | null;
  assignedName: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  nextMeetingAt: string | null;
  contactCount: number;
  callCount: number;
};

export type School = {
  id: number;
  name: string;
  location: string;
  tier: string;
  curriculum: string;
  schoolPhone: string;
  schoolEmail: string;
  website: string;
  researchStatus: string;
  researchNotes: string;
  researchSources: string;
  verifiedSchoolContact: string;
  researchDate: string;
  status: SchoolStatus;
  assignedTelemarketerId: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
};

export type Contact = {
  id: number;
  schoolId: number;
  name: string;
  position: string;
  linkedin: string;
  email: string;
  phone: string;
  priority: string;
  currentRoleVerification: string;
  emailVerificationStatus: string;
  linkedinVerificationStatus: string;
  confidenceScore: string;
  outreachPriority: string;
  recordAuditFlags: string;
};

export type Call = {
  id: number;
  schoolId: number;
  contactId: number | null;
  contactName: string | null;
  userName: string;
  outcome: CallOutcome;
  notes: string;
  enquiry: string;
  createdAt: string;
};

export type FollowUp = {
  id: number;
  schoolId: number;
  schoolName: string;
  location: string;
  schoolPhone: string;
  schoolStatus: SchoolStatus;
  contactId: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactPosition: string | null;
  assignedTo: string;
  assignedName: string;
  dueAt: string;
  notes: string;
  status: FollowUpStatus;
  completedAt: string | null;
};

export type Meeting = {
  id: number;
  schoolId: number;
  schoolName: string;
  location: string;
  schoolPhone: string;
  schoolStatus: SchoolStatus;
  contactId: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactPosition: string | null;
  salesUserId: string;
  salesName: string;
  scheduledBy: string;
  scheduledByName: string;
  startAt: string;
  endAt: string;
  address: string;
  agenda: string;
  status: MeetingStatus;
  outcome: MeetingOutcome | null;
  outcomeNotes: string;
  completedAt: string | null;
  createdAt: string;
};

export type Activity = {
  id: number;
  schoolId: number | null;
  schoolName: string | null;
  userName: string | null;
  type: string;
  message: string;
  createdAt: string;
};

export type SchoolDetail = {
  school: School & { assignedName: string | null };
  contacts: Contact[];
  calls: Call[];
  followUps: FollowUp[];
  meetings: Meeting[];
  activities: Activity[];
};

export type MeetingDetail = {
  meeting: Meeting;
  school: School;
  contacts: Contact[];
  calls: Call[];
};

export type Conflict = { id: number; startAt: string; endAt: string; schoolName: string };

export const TRANSCRIPT_STATUSES = ['pending', 'done', 'no_recording', 'skipped', 'failed'] as const;
export type TranscriptStatus = (typeof TRANSCRIPT_STATUSES)[number];

/** A Salestrail call as listed on the Recordings page and the school page. */
export type CallRecording = {
  id: string;
  userId: string | null;
  userName: string | null;
  schoolId: number | null;
  schoolName: string | null;
  contactId: number | null;
  contactName: string | null;
  phone: string;
  inbound: boolean;
  answered: boolean;
  startedAt: string;
  durationSeconds: number;
  transcriptStatus: TranscriptStatus;
  transcriptLanguage: string | null;
};

export type TranscriptSegment = { start: number; end: number; text: string };

export type CallRecordingDetail = CallRecording & {
  transcript: string | null;
  segments: TranscriptSegment[];
  transcriptProvider: string | null;
  transcriptError: string | null;
};
