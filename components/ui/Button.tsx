import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/shared/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-button font-semibold no-underline ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:no-underline active:scale-[0.98] ' +
  'disabled:pointer-events-none aria-disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0';

// Disabled states use a neutral fill rather than opacity, so they never read as "pressed" or "hovered".
const variants: Record<ButtonVariant, string> = {
  primary: 'bg-tmc-cyan-deep text-tmc-white shadow-[0_1px_2px_rgb(0_4_66/0.15)] hover:bg-tmc-navy disabled:bg-tmc-border disabled:text-tmc-slate disabled:shadow-none',
  secondary: 'bg-tmc-navy text-tmc-white hover:bg-tmc-anchor disabled:bg-tmc-border disabled:text-tmc-slate',
  outline: 'border border-tmc-border bg-tmc-white text-tmc-navy shadow-[0_1px_1px_rgb(0_4_66/0.04)] hover:border-tmc-border-strong hover:bg-tmc-subtle disabled:text-tmc-slate/60 aria-disabled:text-tmc-slate/60',
  ghost: 'text-tmc-navy hover:bg-tmc-navy/5 disabled:text-tmc-slate/60',
  danger: 'text-tmc-error-ink hover:bg-tmc-error-wash disabled:text-tmc-slate/60',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-[13px] rounded-control',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-6 text-[15px]',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; children: ReactNode; className?: string };

export function Button({ variant, size, className, loading, children, disabled, ...props }: Common & ComponentProps<'button'> & { loading?: boolean }) {
  return (
    <button type="button" className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <LoaderCircle aria-hidden className="animate-spin" />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, ...props }: Common & ComponentProps<typeof Link>) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
