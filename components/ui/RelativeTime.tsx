'use client';

import { useNow } from '@/lib/hooks/useNow';
import { fmtDateTime, relative } from '@/lib/shared/format';

/** "in 2 hours" on the client; the absolute time on the server so hydration always matches. */
export function RelativeTime({ value, className }: { value: string | null | undefined; className?: string }) {
  const now = useNow();
  if (!value) return <span className={className}>—</span>;
  return (
    <time dateTime={value} title={fmtDateTime(value)} className={className}>
      {now === null ? fmtDateTime(value) : relative(value, now)}
    </time>
  );
}
