import { route, parseJson } from '@/lib/server/http';
import { loginSchema } from '@/lib/shared/validation';
import { supabaseForUser } from '@/lib/server/supabase';
import { AppError } from '@/lib/server/errors';
import { clientIp, rateLimit } from '@/lib/server/rateLimit';
import { HOME_FOR } from '@/lib/server/auth';
import { log } from '@/lib/server/log';
import type { Role } from '@/types/domain';

export const POST = route('auth.login', async (req) => {
  const { email, password } = await parseJson(req, loginSchema);
  rateLimit(`login:${clientIp(req)}`, 20, 15 * 60_000);
  rateLimit(`login:${email}`, 8, 15 * 60_000);

  const sb = await supabaseForUser();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    log.info('login failed', { reason: error?.code ?? 'unknown' });
    throw new AppError('UNAUTHENTICATED', 'Wrong email or password');
  }
  const { data: profile } = await sb.from('profiles').select('role, active, must_change_password').eq('id', data.user.id).maybeSingle();
  if (!profile?.active) {
    await sb.auth.signOut();
    throw new AppError('FORBIDDEN', 'This account is disabled or has no role yet. Contact an admin.');
  }
  return { redirectTo: profile.must_change_password ? '/welcome' : HOME_FOR[profile.role as Role] };
});
