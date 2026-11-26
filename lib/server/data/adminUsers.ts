import 'server-only';
import type { z } from 'zod';
import type { userCreateSchema, userUpdateSchema } from '@/lib/shared/validation';
import type { Profile } from '@/types/domain';
import { supabaseAdmin } from '../supabase';
import { AppError, fromDbError } from '../errors';
import { log } from '../log';
import { mapProfile } from './mappers';

// User management needs the service role (Supabase Auth admin API). Callers MUST have
// verified the requester is an admin before calling these.

const BAN_FOREVER = '876000h'; // ~100 years: Supabase's way to disable sign-in

export async function createUser(actor: Profile, v: z.output<typeof userCreateSchema>): Promise<Profile> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.auth.admin.createUser({
    email: v.email, password: v.password, email_confirm: true, user_metadata: { full_name: v.fullName },
  });
  if (error || !data.user) {
    const exists = /already|registered|exists/i.test(error?.message ?? '');
    throw new AppError(exists ? 'CONFLICT' : 'DB_ERROR', exists ? 'A user with this email already exists' : 'Could not create the login');
  }
  const { data: row, error: pErr } = await sb.from('profiles').insert({
    id: data.user.id, full_name: v.fullName, email: v.email, phone: v.phone, role: v.role, must_change_password: true,
  }).select('*').single();
  if (pErr) {
    await sb.auth.admin.deleteUser(data.user.id); // keep auth and profiles in step
    throw fromDbError(pErr);
  }
  await sb.from('activities').insert({ user_id: actor.id, type: 'user', message: `Created ${v.role} account for ${v.fullName}` });
  log.info('user created', { actor: actor.id, user: data.user.id, role: v.role });
  return mapProfile(row);
}

export async function updateUser(actor: Profile, id: string, v: z.output<typeof userUpdateSchema>): Promise<Profile> {
  if (id === actor.id && (v.active === false || (v.role && v.role !== 'admin'))) {
    throw new AppError('INVALID_REQUEST', "You can't disable or demote your own account");
  }
  const sb = supabaseAdmin();
  const patch: Record<string, unknown> = {};
  if (v.fullName !== undefined) patch.full_name = v.fullName;
  if (v.phone !== undefined) patch.phone = v.phone;
  if (v.role !== undefined) patch.role = v.role;
  if (v.active !== undefined) patch.active = v.active;
  if (v.password !== undefined) patch.must_change_password = true;

  const authPatch: { password?: string; ban_duration?: string } = {};
  if (v.password) authPatch.password = v.password;
  if (v.active !== undefined) authPatch.ban_duration = v.active ? 'none' : BAN_FOREVER;
  if (Object.keys(authPatch).length) {
    const { error } = await sb.auth.admin.updateUserById(id, authPatch);
    if (error) throw new AppError('DB_ERROR', 'Could not update the login');
  }
  const { data, error } = Object.keys(patch).length
    ? await sb.from('profiles').update(patch).eq('id', id).select('*').single()
    : await sb.from('profiles').select('*').eq('id', id).single();
  if (error) throw fromDbError(error);
  log.info('user updated', { actor: actor.id, user: id, fields: Object.keys(patch) });
  return mapProfile(data);
}
