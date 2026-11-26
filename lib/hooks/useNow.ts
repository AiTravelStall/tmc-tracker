'use client';

import { useSyncExternalStore } from 'react';

// One shared minute-resolution clock for every component that shows "overdue" or "in 2 hours".
// The server snapshot is null, so server HTML and the first client render always match.
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => { now = Date.now(); listeners.forEach((l) => l()); }, 30_000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) { clearInterval(timer); timer = null; }
  };
}

export function useNow(): number | null {
  return useSyncExternalStore(subscribe, () => now, () => null);
}
