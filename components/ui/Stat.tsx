import type { ReactNode } from 'react';
import { cn } from '@/lib/shared/cn';

const subTone = { warning: 'text-tmc-warning-ink', success: 'text-tmc-success-ink' } as const;
const iconTone = { warning: 'bg-tmc-warning-wash text-tmc-warning-ink', success: 'bg-tmc-success-wash text-tmc-success-ink' } as const;

export function Stat({ label, value, sub, tone, icon }: {
  label: string; value: number | string | null | undefined; sub?: string; tone?: 'warning' | 'success'; icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-panel border border-tmc-border bg-tmc-white p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-tmc-slate">{label}</span>
        {icon && (
          <span aria-hidden className={cn('grid size-8 place-items-center rounded-control [&_svg]:size-4', tone ? iconTone[tone] : 'bg-tmc-cyan-wash text-tmc-cyan-deep')}>
            {icon}
          </span>
        )}
      </div>
      <div className="font-display text-[36px] leading-none text-tmc-navy tabular-nums">{value ?? '—'}</div>
      {sub && <div className={cn('text-xs font-medium', tone ? subTone[tone] : 'text-tmc-slate')}>{sub}</div>}
    </div>
  );
}
