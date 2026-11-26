'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/shared/apiClient';
import { dayBounds, fromZonedInput } from '@/lib/shared/time';
import { fmtTime } from '@/lib/shared/format';
import type { Meeting } from '@/types/domain';

function dayOf(local: string) {
  try { return dayBounds(new Date(fromZonedInput(local))); } catch { return null; }
}

/** The chosen sales person's existing visits on the chosen day, so callers can offer a free slot. */
export function SalesDayPreview({ salesUserId, startLocal }: { salesUserId: string; startLocal: string }) {
  const day = startLocal ? dayOf(startLocal) : null;
  const key = salesUserId && day ? `${salesUserId}|${day.start}` : null;
  const [result, setResult] = useState<{ key: string; rows: Meeting[] } | null>(null);

  useEffect(() => {
    if (!key || !day) return;
    let alive = true;
    api.get<Meeting[]>('/meetings', { salesUserId, from: day.start, to: day.end, status: 'scheduled' })
      .then((rows) => { if (alive) setResult({ key, rows }); })
      .catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures salesUserId + day
  }, [key]);

  if (!key || result?.key !== key) return null;
  return (
    <div className="rounded-control border border-tmc-border bg-tmc-white px-3 py-2.5 text-xs" aria-live="polite">
      {result.rows.length ? (
        <>
          <strong>Already booked that day:</strong>
          <ul className="mt-1 list-disc pl-4">
            {result.rows.map((m) => <li key={m.id}>{fmtTime(m.startAt)}–{fmtTime(m.endAt)} · {m.schoolName}</li>)}
          </ul>
        </>
      ) : <span className="text-tmc-slate">No other visits booked that day.</span>}
    </div>
  );
}
