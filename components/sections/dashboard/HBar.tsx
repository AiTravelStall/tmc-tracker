import Link from 'next/link';

/** Horizontal magnitude bar with its value as text (never colour alone). */
export function HBar({ label, value, max, sub, href }: { label: string; value: number; max: number; sub?: string; href?: string }) {
  const body = (
    <>
      <span className="text-sm">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-[4px] bg-tmc-mist" aria-hidden>
        <span className="block h-full rounded-r-[4px] bg-tmc-series-1" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </span>
      <span className="text-right text-sm font-semibold tabular-nums">{value}{sub && <span className="ml-1 text-xs font-normal text-tmc-slate">{sub}</span>}</span>
    </>
  );
  const cls = 'grid grid-cols-[minmax(110px,160px)_1fr_80px] items-center gap-3 rounded-control px-2 py-1.5';
  return href
    ? <Link href={href} className={`${cls} text-tmc-anchor no-underline hover:bg-tmc-subtle hover:no-underline`}>{body}</Link>
    : <div className={cls}>{body}</div>;
}
