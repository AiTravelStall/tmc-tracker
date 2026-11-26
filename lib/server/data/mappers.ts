// Raw Postgres rows (snake_case, loosely typed at the boundary) → typed view models.
// Components never see database shapes (design doc §8.2).
import type {
  Activity, Call, Contact, FollowUp, Meeting, Profile, School, SchoolListItem,
} from '@/types/domain';

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const strOrNull = (v: unknown) => (v == null ? null : String(v));
const num = (v: unknown) => Number(v ?? 0);
const numOrNull = (v: unknown) => (v == null ? null : Number(v));

export function mapProfile(r: Row): Profile {
  return {
    id: str(r.id), fullName: str(r.full_name), email: str(r.email), phone: str(r.phone),
    role: r.role as Profile['role'], active: Boolean(r.active),
    mustChangePassword: Boolean(r.must_change_password), createdAt: str(r.created_at),
  };
}

export function mapSchoolListItem(r: Row): SchoolListItem {
  return {
    id: num(r.id), name: str(r.name), location: str(r.location), tier: str(r.tier), curriculum: str(r.curriculum),
    schoolPhone: str(r.school_phone), status: r.status as SchoolListItem['status'],
    assignedTelemarketerId: strOrNull(r.assigned_telemarketer_id), assignedName: strOrNull(r.assigned_name),
    lastContactedAt: strOrNull(r.last_contacted_at), nextFollowUpAt: strOrNull(r.next_follow_up_at),
    nextMeetingAt: strOrNull(r.next_meeting_at), contactCount: num(r.contact_count), callCount: num(r.call_count),
  };
}

export function mapSchool(r: Row): School {
  return {
    id: num(r.id), name: str(r.name), location: str(r.location), tier: str(r.tier), curriculum: str(r.curriculum),
    schoolPhone: str(r.school_phone), schoolEmail: str(r.school_email), website: str(r.website),
    researchStatus: str(r.research_status), researchNotes: str(r.research_notes), researchSources: str(r.research_sources),
    verifiedSchoolContact: str(r.verified_school_contact), researchDate: str(r.research_date),
    status: r.status as School['status'], assignedTelemarketerId: strOrNull(r.assigned_telemarketer_id),
    lastContactedAt: strOrNull(r.last_contacted_at), nextFollowUpAt: strOrNull(r.next_follow_up_at),
  };
}

export function mapContact(r: Row): Contact {
  return {
    id: num(r.id), schoolId: num(r.school_id), name: str(r.name), position: str(r.position), linkedin: str(r.linkedin),
    email: str(r.email), phone: str(r.phone), priority: str(r.priority),
    currentRoleVerification: str(r.current_role_verification), emailVerificationStatus: str(r.email_verification_status),
    linkedinVerificationStatus: str(r.linkedin_verification_status), confidenceScore: str(r.confidence_score),
    outreachPriority: str(r.outreach_priority), recordAuditFlags: str(r.record_audit_flags),
  };
}

export function mapCall(r: Row): Call {
  return {
    id: num(r.id), schoolId: num(r.school_id), contactId: numOrNull(r.contact_id), contactName: strOrNull(r.contact_name),
    userName: str(r.user_name), outcome: r.outcome as Call['outcome'], notes: str(r.notes), enquiry: str(r.enquiry),
    createdAt: str(r.created_at),
  };
}

export function mapFollowUp(r: Row): FollowUp {
  return {
    id: num(r.id), schoolId: num(r.school_id), schoolName: str(r.school_name), location: str(r.location),
    schoolPhone: str(r.school_phone), schoolStatus: r.school_status as FollowUp['schoolStatus'],
    contactId: numOrNull(r.contact_id), contactName: strOrNull(r.contact_name), contactPhone: strOrNull(r.contact_phone),
    contactPosition: strOrNull(r.contact_position), assignedTo: str(r.assigned_to), assignedName: str(r.assigned_name),
    dueAt: str(r.due_at), notes: str(r.notes), status: r.status as FollowUp['status'], completedAt: strOrNull(r.completed_at),
  };
}

export function mapMeeting(r: Row): Meeting {
  return {
    id: num(r.id), schoolId: num(r.school_id), schoolName: str(r.school_name), location: str(r.location),
    schoolPhone: str(r.school_phone), schoolStatus: r.school_status as Meeting['schoolStatus'],
    contactId: numOrNull(r.contact_id), contactName: strOrNull(r.contact_name), contactPhone: strOrNull(r.contact_phone),
    contactPosition: strOrNull(r.contact_position), salesUserId: str(r.sales_user_id), salesName: str(r.sales_name),
    scheduledBy: str(r.scheduled_by), scheduledByName: str(r.scheduled_by_name), startAt: str(r.start_at), endAt: str(r.end_at),
    address: str(r.address), agenda: str(r.agenda), status: r.status as Meeting['status'],
    outcome: (r.outcome as Meeting['outcome']) ?? null, outcomeNotes: str(r.outcome_notes),
    completedAt: strOrNull(r.completed_at), createdAt: str(r.created_at),
  };
}

export function mapActivity(r: Row): Activity {
  return {
    id: num(r.id), schoolId: numOrNull(r.school_id), schoolName: strOrNull(r.school_name), userName: strOrNull(r.user_name),
    type: str(r.type), message: str(r.message), createdAt: str(r.created_at),
  };
}
