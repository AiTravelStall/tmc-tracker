'use client';

import { AlarmClockPlus } from 'lucide-react';
import { api } from '@/lib/shared/apiClient';
import { useAction } from '@/lib/hooks/useAction';
import { fromZonedInput, slotInDays, zonedParts } from '@/lib/shared/time';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

/** Push a follow-up to the next working day at the same time. */
export function SnoozeButton({ id, dueAt }: { id: number; dueAt: string }) {
  const toast = useToast();
  const snooze = useAction(async () => {
    const hour = zonedParts(new Date(dueAt)).hour || 11;
    await api.patch(`/followups/${id}`, { dueAt: fromZonedInput(slotInDays(1, hour)) });
    toast('Moved to tomorrow');
  });
  return (
    <Button size="sm" variant="outline" onClick={() => snooze.run()} loading={snooze.pending} aria-label="Snooze to tomorrow">
      {!snooze.pending && <AlarmClockPlus aria-hidden />}+1 day
    </Button>
  );
}
