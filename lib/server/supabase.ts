import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Per-request client bound to the signed-in user's session cookies.
 * Every query through it is subject to Row Level Security.
 */
export async function supabaseForUser(): Promise<SupabaseClient> {
  // Read cookies first: it marks the route as per-request (never prerendered at build time).
  const store = await cookies();
  const e = env();
  return createServerClient(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there. proxy.ts refreshes them.
        }
      },
    },
  });
}

let admin: SupabaseClient | null = null;

/** Secret-key client (acts as service_role). Bypasses RLS — only for user management and bulk import, after an admin check. */
export function supabaseAdmin(): SupabaseClient {
  if (admin) return admin;
  const e = env();
  admin = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
