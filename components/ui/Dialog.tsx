'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/shared/cn';

/**
 * Native <dialog> with showModal(): focus trap, inert background and Escape
 * come from the platform (design doc §13.2 A2). Focus returns to the opener on close.
 */
export function Dialog({ open, onClose, title, children, footer, size = 'md' }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'md' | 'lg';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement;
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onCancel = (e: Event) => { e.preventDefault(); onClose(); };
    const onCloseEvt = () => { if (opener.current instanceof HTMLElement) opener.current.focus(); };
    d.addEventListener('cancel', onCancel);
    d.addEventListener('close', onCloseEvt);
    return () => { d.removeEventListener('cancel', onCancel); d.removeEventListener('close', onCloseEvt); };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={cn(
        'm-auto max-h-[90vh] w-[calc(100%-32px)] overflow-hidden rounded-panel bg-tmc-white p-0 text-tmc-anchor shadow-overlay backdrop:bg-tmc-navy/45 backdrop:backdrop-blur-[2px] open:[animation:toast-in_.18s_ease-out]',
        size === 'lg' ? 'max-w-4xl' : 'max-w-xl',
      )}
    >
      {open && (
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-tmc-border py-3 pr-3 pl-6">
            <h2 id="dialog-title" className="text-lg font-semibold text-tmc-navy">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-11 place-items-center rounded-full text-tmc-slate transition-colors hover:bg-tmc-mist hover:text-tmc-navy">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-tmc-border bg-tmc-subtle px-6 py-3.5">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
