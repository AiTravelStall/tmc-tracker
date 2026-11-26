import 'server-only';
import type { PostgrestError } from '@supabase/supabase-js';
import { fromDbError } from '../errors';

/** Unwrap a Supabase response, converting DB errors to AppErrors. */
export function unwrap<T>(res: { data: T | null; error: PostgrestError | null }): T {
  if (res.error) throw fromDbError(res.error);
  return res.data as T;
}

/** Escape LIKE wildcards in user search input. */
export const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
