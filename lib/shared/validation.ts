// One schema per form, imported by the client form AND the route handler (design doc §11.4).
import { z } from 'zod';
import { CALL_OUTCOMES, MEETING_OUTCOMES, ROLES, SCHOOL_STATUSES } from '@/types/domain';

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`);
const optionalText = (max: number) => text(max).optional().default('');
const isoDateTime = z.string().datetime({ offset: true, message: 'Pick a valid date and time' });
const id = z.coerce.number().int().positive();
const uuid = z.string().uuid();

// ---------- auth & users ----------
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password').max(200),
});

export const passwordSchema = z.string().min(8, 'Use at least 8 characters').max(72, 'Use at most 72 characters');

export const changePasswordSchema = z.object({
  current: z.string().min(1, 'Enter your current password'),
  next: passwordSchema,
});

export const userCreateSchema = z.object({
  fullName: text(120).min(1, 'Name is required'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: optionalText(40),
  role: z.enum(ROLES),
  password: passwordSchema,
});

export const userUpdateSchema = z.object({
  fullName: text(120).min(1).optional(),
  phone: text(40).optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
  password: passwordSchema.optional(),
});

// ---------- schools ----------
export const schoolFiltersSchema = z.object({
  q: text(100).optional(),
  status: z.enum(SCHOOL_STATUSES).optional(),
  tier: text(100).optional(),
  curriculum: text(100).optional(),
  location: text(100).optional(),
  assigned: z.union([z.literal('me'), z.literal('none'), uuid]).optional(),
  sort: z.enum(['name', 'recent', 'followup', 'status']).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
export type SchoolFilters = z.infer<typeof schoolFiltersSchema>;

export const schoolCreateSchema = z.object({
  name: text(200).min(1, 'School name is required'),
  location: optionalText(200),
  tier: optionalText(100),
  curriculum: optionalText(100),
  schoolPhone: optionalText(200),
  schoolEmail: optionalText(300),
  website: optionalText(300),
});

export const schoolDetailsSchema = z.object({
  schoolPhone: text(200).optional(),
  schoolEmail: text(300).optional(),
  website: text(300).optional(),
  location: text(200).optional(),
  tier: text(100).optional(),
  curriculum: text(100).optional(),
});

export const schoolAdminSchema = z.object({
  status: z.enum(SCHOOL_STATUSES).optional(),
  assignedTelemarketerId: uuid.nullable().optional(),
});

export const schoolPatchSchema = schoolDetailsSchema.merge(schoolAdminSchema);

export const assignSchoolsSchema = z.object({
  ids: z.array(id).min(1).max(500),
  telemarketerId: uuid.nullable(),
});

export const contactSchema = z.object({
  name: text(150).min(1, 'Contact name is required'),
  position: optionalText(150),
  phone: optionalText(200),
  email: optionalText(300),
  linkedin: optionalText(500),
});

// ---------- calls, follow-ups, meetings ----------
export const meetingInputSchema = z.object({
  salesUserId: uuid,
  startAt: isoDateTime,
  durationMin: z.coerce.number().int().min(15).max(600).default(60),
  address: optionalText(500),
  agenda: optionalText(2000),
});

export const logCallSchema = z
  .object({
    clientId: uuid,
    outcome: z.enum(CALL_OUTCOMES),
    contactId: id.nullable().optional(),
    notes: optionalText(4000),
    enquiry: optionalText(2000),
    followUp: z.object({ dueAt: isoDateTime, notes: optionalText(500) }).nullable().optional(),
    meeting: meetingInputSchema.nullable().optional(),
    force: z.boolean().optional().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.outcome === 'follow_up' && !v.followUp) ctx.addIssue({ code: 'custom', path: ['followUp'], message: 'Set a follow-up date' });
    if (v.outcome === 'meeting_scheduled' && !v.meeting) ctx.addIssue({ code: 'custom', path: ['meeting'], message: 'Fill in the visit details' });
  });
export type LogCallInput = z.input<typeof logCallSchema>;

export const meetingCreateSchema = meetingInputSchema.extend({
  schoolId: id,
  contactId: id.nullable().optional(),
  force: z.boolean().optional().default(false),
});

export const meetingUpdateSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('reschedule'),
    startAt: isoDateTime,
    durationMin: z.coerce.number().int().min(15).max(600).optional(),
    salesUserId: uuid.optional(),
    force: z.boolean().optional().default(false),
  }),
  z.object({ action: z.literal('complete'), outcome: z.enum(MEETING_OUTCOMES), notes: optionalText(4000) }),
  z.object({ action: z.literal('cancel'), notes: optionalText(1000) }),
  z.object({ action: z.literal('no_show'), notes: optionalText(1000) }),
]);
export type MeetingUpdateInput = z.input<typeof meetingUpdateSchema>;

export const followUpUpdateSchema = z.object({
  dueAt: isoDateTime.optional(),
  notes: text(500).optional(),
  status: z.enum(['done', 'cancelled']).optional(),
  assignedTo: uuid.optional(),
});

export const meetingRangeSchema = z.object({
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
  salesUserId: uuid.optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
});
