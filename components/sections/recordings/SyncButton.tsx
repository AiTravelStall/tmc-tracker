'use client';

import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/shared/apiClient';
import { useAction } from '@/lib/hooks/useAction';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

type Result = { saved: number; transcribed: number };

/** Admin: run the Salestrail sync now instead of waiting for the 10-minute cron. */
export function SyncButton() {
  const toast = useToast();
  const sync = useAction(async () => {
    const r = await api.post<Result>('/recordings/sync');
    toast(`Synced ${r.saved} call${r.saved === 1 ? '' : 's'} · ${r.transcribed} transcribed`);
  });
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={() => sync.run()} loading={sync.pending}>
        {!sync.pending && <RefreshCw aria-hidden />}Sync now
      </Button>
      {sync.error && <p role="alert" className="text-xs text-tmc-error-ink">{sync.error.message}</p>}
    </div>
  );
}
