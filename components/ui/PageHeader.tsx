import type { ReactNode } from 'react';

/** Exactly one h1 per page, in the display face. */
export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="font-display text-display tracking-[0.01em] text-balance text-tmc-navy">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-pretty text-tmc-slate">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
