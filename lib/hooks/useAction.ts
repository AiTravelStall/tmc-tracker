'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClientApiError } from '@/lib/shared/apiClient';

/**
 * Run a mutation, track pending/error state, and refresh server components on success.
 * Prevents double-submits while pending.
 */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>, opts: { refresh?: boolean } = {}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ClientApiError | null>(null);

  const run = useCallback(async (...args: A): Promise<R | undefined> => {
    if (pending) return undefined;
    setPending(true);
    setError(null);
    try {
      const result = await fn(...args);
      if (opts.refresh !== false) router.refresh();
      return result;
    } catch (e) {
      setError(e instanceof ClientApiError ? e : new ClientApiError('INTERNAL', 'Something went wrong', 0));
      return undefined;
    } finally {
      setPending(false);
    }
  }, [fn, opts.refresh, pending, router]);

  return { run, pending, error, setError };
}
