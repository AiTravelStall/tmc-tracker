import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/shared/cn';

export function Card({ className, flush, ...props }: ComponentProps<'section'> & { flush?: boolean }) {
  return (
    <section
      className={cn('rounded-panel border border-tmc-border bg-tmc-white shadow-card', flush ? 'overflow-hidden' : 'p-5 sm:p-6', className)}
      {...props}
    />
  );
}

export function CardHeader({ title, description, action, id, padded, icon }: {
  title: ReactNode; description?: ReactNode; action?: ReactNode; id?: string; padded?: boolean; icon?: ReactNode;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', padded ? 'border-b border-tmc-border px-5 py-4 sm:px-6' : 'mb-5')}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-control bg-tmc-cyan-wash text-tmc-cyan-deep [&_svg]:size-[18px]">{icon}</span>}
        <div className="min-w-0">
          <h2 id={id} className="text-[15px] font-semibold leading-snug text-tmc-navy">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-tmc-slate">{description}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
    </div>
  );
}
