import type { ReactNode } from 'react';
import { cn } from '@/lib/shared/cn';
import type { Tone } from '@/lib/shared/labels';

const tones: Record<Tone, [string, string]> = {
  neutral: ['bg-tmc-mist text-tmc-charcoal ring-tmc-border', 'bg-tmc-slate/60'],
  info: ['bg-tmc-info-wash text-tmc-info-ink ring-tmc-info-ink/15', 'bg-tmc-info-ink'],
  brand: ['bg-tmc-cyan-wash text-tmc-cyan-deep ring-tmc-cyan-deep/15', 'bg-tmc-cyan-deep'],
  success: ['bg-tmc-success-wash text-tmc-success-ink ring-tmc-success/20', 'bg-tmc-success'],
  warning: ['bg-tmc-warning-wash text-tmc-warning-ink ring-tmc-warning/25', 'bg-tmc-warning'],
  danger: ['bg-tmc-error-wash text-tmc-error-ink ring-tmc-error/20', 'bg-tmc-error'],
  violet: ['bg-tmc-violet-wash text-tmc-violet-ink ring-tmc-violet-ink/15', 'bg-tmc-violet-ink'],
};

/** Small labelled state chip. Colour is never the only signal: the text names the state. */
export function StatusPill({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const [pill, dot] = tones[tone];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', pill, className)}>
      <span aria-hidden className={cn('size-1.5 rounded-full', dot)} />
      {children}
    </span>
  );
}
