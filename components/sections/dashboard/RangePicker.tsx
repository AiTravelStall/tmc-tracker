import Link from 'next/link';
import { cn } from '@/lib/shared/cn';

export const RANGES = [[7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '12 months']] as const;

export function RangePicker({ days }: { days: number }) {
  return (
    <nav aria-label="Date range" className="inline-flex gap-1 rounded-control border border-tmc-border bg-tmc-white p-1 shadow-card">
      {RANGES.map(([d, label]) => (
        <Link key={d} href={`?days=${d}`} aria-current={days === d ? 'true' : undefined}
          className={cn('inline-flex min-h-9 items-center rounded-[8px] px-3 text-sm font-medium no-underline transition-colors hover:no-underline',
            days === d ? 'bg-tmc-navy text-tmc-white' : 'text-tmc-charcoal hover:bg-tmc-subtle hover:text-tmc-navy')}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
