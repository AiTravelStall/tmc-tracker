'use client';

import { useState } from 'react';
import { dayBounds } from '@/lib/shared/time';
import { fmtDate } from '@/lib/shared/format';

type Point = { day: string; value: number };

/**
 * Single-series daily bar chart: one hue, 4px rounded data-ends on the baseline,
 * hover/focus tooltip, and a screen-reader table (dataviz rules).
 */
export function DailyBars({ label, data, days }: { label: string; data: Point[]; days: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = Math.min(days, 90);
  const byDay = new Map(data.map((d) => [d.day, d.value]));
  const todayStart = new Date(dayBounds().start);
  const series = Array.from({ length: n }, (_, i) => {
    const d = new Date(todayStart.getTime() - (n - 1 - i) * 86400000 + 12 * 3600000);
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE || 'Asia/Kolkata' }).format(d);
    return { key, date: d, value: byDay.get(key) ?? 0 };
  });
  const max = Math.max(1, ...series.map((s) => s.value));
  const total = series.reduce((a, s) => a + s.value, 0);

  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="font-semibold text-tmc-navy">{label}</span>
        <span className="text-xs text-tmc-slate">{total} in the last {n} days · peak {max}/day</span>
      </figcaption>
      <div className="relative flex h-28 items-end gap-0.5 border-b border-tmc-border" onMouseLeave={() => setHover(null)} aria-hidden>
        {series.map((s, i) => (
          <div key={s.key} className="flex h-full flex-1 items-end hover:bg-tmc-cyan-wash/60" onMouseEnter={() => setHover(i)}>
            <div className="w-full rounded-t-[4px] bg-tmc-series-1" style={{ height: `${(s.value / max) * 100}%` }} />
          </div>
        ))}
        {hover !== null && series[hover] && (
          <div className="pointer-events-none absolute bottom-full mb-1 -translate-x-1/2 rounded-control bg-tmc-navy px-2.5 py-1.5 text-xs whitespace-nowrap text-tmc-white shadow-overlay"
            style={{ left: `${((hover + 0.5) / series.length) * 100}%` }}>
            <strong>{series[hover].value}</strong> {label.toLowerCase()} · {fmtDate(series[hover].date)}
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between text-xs text-tmc-slate" aria-hidden><span>{fmtDate(series[0]?.date)}</span><span>Today</span></div>
      <table className="sr-only">
        <caption>{label} per day</caption>
        <tbody>{series.filter((s) => s.value).map((s) => <tr key={s.key}><th scope="row">{fmtDate(s.date)}</th><td>{s.value}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
