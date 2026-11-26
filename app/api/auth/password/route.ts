import { route, parseJson } from '@/lib/server/http';
import { changePasswordSchema } from '@/lib/shared/validation';
import { requireApiUser } from '@/lib/server/auth';
import { supabaseForUser } from '@/lib/server/supabase';
import { AppError } from '@/lib/server/errors';
import { clientIp, rateLimit } from '@/lib/server/rateLimit';

export const POST = route('auth.password', async (req) => {
  const { current, next } = await parseJson(req, changePasswordSchema);
  rateLimit(`pw:${clientIp(req)}`, 10, 15 * 60_000);
  const user = await requireApiUser();
  const sb = await supabaseForUser();
  // Re-verify the current password before changing it.
  const check = await sb.auth.signInWithPassword({ email: user.email, password: current });
  if (check.error) throw new AppError('INVALID_REQUEST', 'Current password is wrong');
  if (current === next) throw new AppError('INVALID_REQUEST', 'Choose a password different from the current one');
  const { error } = await sb.auth.updateUser({ password: next });
  if (error) throw new AppError('INVALID_REQUEST', error.message || 'Could not update password');
  await sb.rpc('mark_password_changed');
  return { ok: true };
});
