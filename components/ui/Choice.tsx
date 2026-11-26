'use client';

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/shared/cn';

export type ChoiceOption<T extends string> = { value: T; label: string; description?: string; icon?: ReactNode; tone?: 'positive' | 'neutral' | 'negative' };

const toneIcon = {
  positive: 'bg-tmc-success-wash text-tmc-success-ink',
  neutral: 'bg-tmc-cyan-wash text-tmc-cyan-deep',
  negative: 'bg-tmc-mist text-tmc-slate',
};

/**
 * Card-style radio group built on real radio inputs: arrow keys move between options,
 * the description is visible text (no hover-only tooltip), and the selected card shows
 * a check mark so selection never relies on colour or a hover border alone.
 */
export function ChoiceCards<T extends string>({ name, legend, options, value, onChange, columns = 2 }: {
  name: string; legend: ReactNode; options: ChoiceOption<T>[]; value: T | ''; onChange: (v: T) => void; columns?: 1 | 2;
}) {
  return (
    <fieldset className="@container">
      <legend className="mb-2 text-[13px] font-semibold text-tmc-charcoal">{legend}</legend>
      <div className={cn('grid gap-2', columns === 2 && '@lg:grid-cols-2')}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label key={o.value}
              className={cn(
                'relative flex min-h-14 cursor-pointer items-center gap-3 rounded-control border bg-tmc-white px-3 py-2.5 transition-[border-color,background-color,box-shadow] duration-150',
                'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-tmc-cyan-bright',
                checked ? 'border-tmc-cyan-deep bg-tmc-cyan-wash/60 shadow-[0_0_0_1px_var(--color-tmc-cyan-deep)]' : 'border-tmc-border hover:border-tmc-border-strong hover:bg-tmc-subtle',
              )}>
              <input type="radio" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="sr-only" />
              {o.icon && (
                <span aria-hidden className={cn('grid size-8 shrink-0 place-items-center rounded-control [&_svg]:size-4', checked ? 'bg-tmc-cyan-deep text-tmc-white' : toneIcon[o.tone ?? 'neutral'])}>
                  {o.icon}
                </span>
              )}
              <span className="min-w-0 flex-1 pr-5">
                <span className={cn('block text-sm leading-tight', checked ? 'font-semibold text-tmc-navy' : 'font-medium text-tmc-anchor')}>{o.label}</span>
                {o.description && <span className="mt-0.5 block text-xs leading-snug text-tmc-slate">{o.description}</span>}
              </span>
              <span aria-hidden className={cn('absolute top-1/2 right-3 grid -translate-y-1/2 size-[18px] place-items-center rounded-full border transition-colors',
                checked ? 'border-tmc-cyan-deep bg-tmc-cyan-deep text-tmc-white' : 'border-tmc-border-strong bg-tmc-white')}>
                {checked && <Check className="size-3" strokeWidth={3} />}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Accessible on/off switch (role="switch") with a visible label and optional description. */
export function Switch({ checked, onChange, label, description, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; disabled?: boolean;
}) {
  return (
    <label className={cn('flex items-start justify-between gap-4', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-tmc-navy">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-tmc-slate">{description}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className={cn(
        'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-tmc-cyan-bright',
        checked ? 'bg-tmc-cyan-deep' : 'bg-tmc-border-strong', disabled && 'opacity-60',
      )}>
        <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-tmc-white shadow-[0_1px_2px_rgb(0_4_66/0.25)] transition-transform duration-200', checked && 'translate-x-5')} />
      </span>
    </label>
  );
}

/** Pill toggle buttons for quick presets (e.g. "Tomorrow", "Next week"). */
export function PresetChips<T extends string | number>({ label, options, value, onChange }: {
  label: string; options: readonly { value: T; label: string }[]; value: T | null; onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={String(o.value)} type="button" aria-pressed={on} onClick={() => onChange(o.value)}
            className={cn('min-h-9 rounded-full border px-3.5 text-[13px] font-medium transition-colors',
              on ? 'border-tmc-navy bg-tmc-navy text-tmc-white' : 'border-tmc-border bg-tmc-white text-tmc-charcoal hover:border-tmc-border-strong hover:bg-tmc-subtle')}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
