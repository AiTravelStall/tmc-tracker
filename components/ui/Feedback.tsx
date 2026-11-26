import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Inbox, LoaderCircle, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/shared/cn';

export function EmptyState({ children, title, icon, action, compact }: {
  children?: ReactNode; title?: ReactNode; icon?: ReactNode; action?: ReactNode; compact?: boolean;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 text-center', compact ? 'py-8' : 'py-14')}>
      <span aria-hidden className="mb-3 grid size-11 place-items-center rounded-full bg-tmc-mist text-tmc-slate [&_svg]:size-5">{icon ?? <Inbox />}</span>
      {title && <p className="font-semibold text-tmc-navy">{title}</p>}
      {children && <p className="mt-1 max-w-sm text-sm text-tmc-slate">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex justify-center py-10 text-tmc-cyan-deep">
      <LoaderCircle aria-hidden className="size-7 animate-spin" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

const ALERT = {
  error: { cls: 'border-tmc-error/25 bg-tmc-error-wash text-tmc-error-ink', Icon: CircleAlert },
  warning: { cls: 'border-tmc-warning/30 bg-tmc-warning-wash text-tmc-warning-ink', Icon: TriangleAlert },
  success: { cls: 'border-tmc-success/30 bg-tmc-success-wash text-tmc-success-ink', Icon: CircleCheck },
};

export function Alert({ tone = 'error', children, className }: { tone?: 'error' | 'warning' | 'success'; children: ReactNode; className?: string }) {
  const { cls, Icon } = ALERT[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-2.5 rounded-control border px-3.5 py-3 text-sm', cls, className)}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
