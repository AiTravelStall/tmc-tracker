import Link from 'next/link';
import { cn } from '@/lib/shared/cn';

/** Server-rendered tab links (URL state, no client JS). */
export function TabNav({ tabs, active, label }: { tabs: { key: string; label: string; href: string; count?: number; danger?: boolean }[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="mb-4 flex gap-1 overflow-x-auto rounded-control border border-tmc-border bg-tmc-white p-1 shadow-card sm:inline-flex">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} aria-current={active === t.key ? 'page' : undefined}
          className={cn('inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[8px] px-3.5 text-sm font-medium no-underline transition-colors hover:no-underline',
            active === t.key ? 'bg-tmc-navy text-tmc-white' : 'text-tmc-charcoal hover:bg-tmc-subtle hover:text-tmc-navy')}>
          {t.label}
          {t.count !== undefined && (
            <span className={cn('min-w-6 rounded-full px-1.5 text-center text-xs font-semibold tabular-nums', active === t.key ? 'bg-tmc-white/20' : t.danger && t.count > 0 ? 'bg-tmc-error-wash text-tmc-error-ink' : 'bg-tmc-mist text-tmc-slate')}>{t.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
