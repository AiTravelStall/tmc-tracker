'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/shared/apiClient';
import { useToast } from '@/components/ui/Toast';

type Reminder = { key: string; title: string; body: string; at: string; href: string };
type Summary = { badge: number; reminders: Reminder[] };

/** Polls once a minute for the sidebar badge and newly-due items. */
export function useReminderBadge() {
  const [state, setState] = useState<Summary>({ badge: 0, reminders: [] });
  useEffect(() => {
    let alive = true;
    const tick = () => api.get<Summary>('/followups/summary').then((s) => alive && setState(s)).catch(() => {});
    tick();
    const t = setInterval(tick, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return state;
}

/**
 * Surfaces reminders as a toast (and a browser notification if allowed). Items already
 * due when the page loads are summarised once; later ones are announced individually.
 */
export function Reminders({ reminders }: { reminders: Reminder[] }) {
  const toast = useToast();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!reminders) return;
    if (seen.current === null) {
      seen.current = new Set(reminders.map((r) => r.key));
      if (reminders.length) toast(`${reminders.length} reminder${reminders.length > 1 ? 's' : ''}: ${reminders[0]!.title.toLowerCase()} — ${reminders[0]!.body}`, 'info');
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
      return;
    }
    for (const r of reminders) {
      if (seen.current.has(r.key)) continue;
      seen.current.add(r.key);
      toast(`${r.title}: ${r.body}`, 'info');
      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification(r.title, { body: r.body }); } catch { /* unsupported */ }
      }
    }
  }, [reminders, toast]);

  return null;
}
