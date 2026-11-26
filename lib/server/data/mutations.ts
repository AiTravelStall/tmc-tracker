import 'server-only';
import type { z } from 'zod';
import type {
  assignSchoolsSchema, contactSchema, followUpUpdateSchema, logCallSchema, meetingCreateSchema,
  meetingUpdateSchema, schoolCreateSchema, schoolPatchSchema,
} from '@/lib/shared/validation';
import type { Profile } from '@/types/domain';
import { supabaseForUser } from '../supabase';
import { AppError } from '../errors';
import { unwrap } from './query';

// Thin wrappers over the transactional Postgres functions. Role checks happen in the
// database (and again here for a clear error before the round-trip where cheap).

export async function logCall(schoolId: number, v: z.output<typeof logCallSchema>) {
  const sb = await supabaseForUser();
  return unwrap(await sb.rpc('log_call', {
    p_client_id: v.clientId,
    p_school_id: schoolId,
    p_outcome: v.outcome,
    p_notes: v.notes,
    p_enquiry: v.enquiry,
    p_contact_id: v.contactId ?? null,
    p_follow_up_at: v.outcome === 'meeting_scheduled' ? null : v.followUp?.dueAt ?? null,
    p_follow_up_notes: v.followUp?.notes ?? '',
    p_meeting: v.meeting ?? null,
    p_force: v.force,
  })) as { callId: number; followUpId: number | null; meetingId: number | null; followUpsClosed: number; duplicate: boolean };
}

export async function createMeeting(v: z.output<typeof meetingCreateSchema>) {
  const sb = await supabaseForUser();
  return unwrap(await sb.rpc('create_meeting', {
    p_school_id: v.schoolId, p_sales_user_id: v.salesUserId, p_start_at: v.startAt, p_duration_min: v.durationMin,
    p_contact_id: v.contactId ?? null, p_address: v.address, p_agenda: v.agenda, p_force: v.force,
  })) as number;
}

export async function updateMeeting(id: number, v: z.output<typeof meetingUpdateSchema>) {
  const sb = await supabaseForUser();
  unwrap(await sb.rpc('update_meeting', {
    p_id: id,
    p_action: v.action,
    p_start_at: v.action === 'reschedule' ? v.startAt : null,
    p_duration_min: v.action === 'reschedule' ? v.durationMin ?? null : null,
    p_sales_user_id: v.action === 'reschedule' ? v.salesUserId ?? null : null,
    p_outcome: v.action === 'complete' ? v.outcome : null,
    p_notes: v.action === 'reschedule' ? null : v.notes,
    p_force: v.action === 'reschedule' ? v.force : false,
  }));
}

export async function updateFollowUp(id: number, v: z.output<typeof followUpUpdateSchema>) {
  const sb = await supabaseForUser();
  unwrap(await sb.rpc('update_follow_up', {
    p_id: id, p_due_at: v.dueAt ?? null, p_notes: v.notes ?? null, p_status: v.status ?? null, p_assigned_to: v.assignedTo ?? null,
  }));
}

export async function createSchool(v: z.output<typeof schoolCreateSchema>) {
  const sb = await supabaseForUser();
  return unwrap(await sb.rpc('create_school', {
    p_name: v.name, p_location: v.location, p_tier: v.tier, p_curriculum: v.curriculum,
    p_school_phone: v.schoolPhone, p_school_email: v.schoolEmail, p_website: v.website,
  })) as number;
}

export async function patchSchool(user: Profile, id: number, v: z.output<typeof schoolPatchSchema>) {
  const sb = await supabaseForUser();
  const details: Record<string, string> = {};
  if (v.schoolPhone !== undefined) details.school_phone = v.schoolPhone;
  if (v.schoolEmail !== undefined) details.school_email = v.schoolEmail;
  if (v.website !== undefined) details.website = v.website;
  if (v.location !== undefined) details.location = v.location;
  if (v.tier !== undefined) details.tier = v.tier;
  if (v.curriculum !== undefined) details.curriculum = v.curriculum;
  if (Object.keys(details).length) unwrap(await sb.rpc('update_school_details', { p_id: id, p_fields: details }));

  const adminChange = v.status !== undefined || v.assignedTelemarketerId !== undefined;
  if (adminChange) {
    if (user.role !== 'admin') throw new AppError('FORBIDDEN', 'Only admins can change status or assignment');
    unwrap(await sb.rpc('admin_update_school', {
      p_id: id, p_status: v.status ?? null,
      p_assigned_to: v.assignedTelemarketerId ?? null, p_set_assignee: v.assignedTelemarketerId !== undefined,
    }));
  }
}

export async function assignSchools(v: z.output<typeof assignSchoolsSchema>) {
  const sb = await supabaseForUser();
  return unwrap(await sb.rpc('assign_schools', { p_ids: v.ids, p_telemarketer_id: v.telemarketerId })) as number;
}

export async function saveContact(schoolId: number, contactId: number | null, v: z.output<typeof contactSchema>) {
  const sb = await supabaseForUser();
  return unwrap(await sb.rpc('save_contact', {
    p_school_id: schoolId, p_contact_id: contactId, p_name: v.name, p_position: v.position,
    p_phone: v.phone, p_email: v.email, p_linkedin: v.linkedin,
  })) as number;
}
