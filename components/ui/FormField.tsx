'use client';

import { useId, type ReactElement, type ReactNode, cloneElement } from 'react';
import { cn } from '@/lib/shared/cn';

type ControlProps = { id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string; className?: string };

/**
 * Label + control + hint/error, wired for assistive tech (design doc §11.4):
 * label[for], aria-invalid, aria-describedby → hint & error ids, error in role="alert".
 */
export function FormField({ label, hint, error, children, className }: {
  label: ReactNode; hint?: ReactNode; error?: string | null; children: ReactElement<ControlProps>; className?: string;
}) {
  const id = useId();
  const controlId = children.props.id ?? `f${id}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={controlId} className="text-[13px] font-semibold text-tmc-charcoal">{label}</label>
      {cloneElement(children, {
        id: controlId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
        className: cn('tmc-input', children.props.className),
      })}
      {hint && <p id={hintId} className="text-xs text-tmc-slate">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-xs font-medium text-tmc-error-ink">{error}</p>}
    </div>
  );
}
