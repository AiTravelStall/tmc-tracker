'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { cn } from '@/lib/shared/cn';

type Tone = 'success' | 'error' | 'info';
type ToastItem = { id: number; message: string; tone: Tone };
const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random();
    setItems((t) => [...t, { id, message, tone }]);
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 left-4 z-50 flex flex-col items-end sm:left-auto sm:max-w-sm flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex items-start gap-3 rounded-control bg-tmc-navy px-4 py-3 text-sm font-medium text-tmc-white shadow-overlay [animation:toast-in_.2s_ease-out]">
            {t.tone === 'error' ? <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-tmc-error-wash" />
              : t.tone === 'info' ? <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-tmc-cyan" />
                : <CircleCheck aria-hidden className={cn('mt-0.5 size-4 shrink-0 text-tmc-success-wash')} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
