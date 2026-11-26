import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { Profile, Role } from '@/types/domain';
import { supabaseForUser } from './supabase';
import { AppError } from './errors';
import { mapProfile } from './data/mappers';

export const HOME_FOR: Record<Role, string> = { admin: '/dashboard', telemarketer: '/today', sales: '/calendar' };

/** The signed-in, active user, or null. Cached per request so layout + page share one lookup. */
export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  const sb = await supabaseForUser();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!data || !data.active) return null;
  return mapProfile(data);
});

/** For pages: redirect to /login when signed out, or home when the role is not allowed. */
export async function requirePageUser(roles?: Role[]): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.mustChangePassword) redirect('/welcome');
  if (roles && !roles.includes(user.role)) redirect(HOME_FOR[user.role]);
  return user;
}

/** For route handlers: throw a typed error instead of redirecting. */
export async function requireApiUser(roles?: Role[]): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) throw new AppError('UNAUTHENTICATED', 'Please sign in again');
  if (roles && !roles.includes(user.role)) throw new AppError('FORBIDDEN', 'You do not have access to this');
  return user;
}
