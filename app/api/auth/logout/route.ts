import { route } from '@/lib/server/http';
import { supabaseForUser } from '@/lib/server/supabase';

export const POST = route('auth.logout', async () => {
  const sb = await supabaseForUser();
  await sb.auth.signOut();
  return { ok: true };
});
