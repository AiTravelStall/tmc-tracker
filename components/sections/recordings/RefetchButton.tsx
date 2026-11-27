'use client';

import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/shared/apiClient';
import { useAction } from '@/lib/hooks/useAction';
import { Button } from '@/components/ui/Button';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { useToast } from '@/components/ui/Toast';

type Result = { saved: number; transcribed: number; waiting: number };

/** Pull new calls from Salestrail and transcribe a few; shows when that last happened. */
export function RefetchButton({ lastUpdated }: { lastUpdated: string | null }) {
  const toast = useToast();
  const refetch = useAction(async () => {
    const r = await api.post<Result>('/recordings/sync');
    const parts = [`${r.saved} call${r.saved === 1 ? '' : 's'} checked`, `${r.transcribed} transcribed`];
    if (r.waiting) parts.push(`${r.waiting} still waiting — press again`);
    toast(parts.join(' · '));
  });
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="text-xs text-tmc-slate">
          Last updated {lastUpdated ? <RelativeTime value={lastUpdated} className="font-medium text-tmc-charcoal" /> : <span className="font-medium text-tmc-charcoal">never</span>}
        </span>
        <Button variant="outline" onClick={() => refetch.run()} loading={refetch.pending}>
          {!refetch.pending && <RefreshCw aria-hidden />}Refetch recordings
        </Button>
      </div>
      {refetch.error && <p role="alert" className="text-xs text-tmc-error-ink">{refetch.error.message}</p>}
    </div>
  );
}
