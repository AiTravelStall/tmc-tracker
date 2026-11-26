import 'server-only';
import type { DirectoryUser, Profile } from '@/types/domain';
import { supabaseForUser } from '../supabase';
import { unwrap } from './query';
import { mapProfile } from './mappers';

export async function listDirectory(): Promise<DirectoryUser[]> {
  const sb = await supabaseForUser();
  const rows = unwrap(await sb.from('profiles').select('id, full_name, role, active').eq('active', true).order('full_name')) ?? [];
  return rows.map((r) => ({ id: String(r.id), fullName: String(r.full_name), role: r.role, active: Boolean(r.active) }));
}

export async function listUsers(): Promise<Profile[]> {
  const sb = await supabaseForUser();
  const rows = unwrap(await sb.from('profiles').select('*').order('active', { ascending: false }).order('role').order('full_name')) ?? [];
  return rows.map(mapProfile);
}
