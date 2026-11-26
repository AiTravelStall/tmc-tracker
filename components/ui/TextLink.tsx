import Link from 'next/link';
import type { ComponentProps } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/shared/cn';

/** "See all" style link with a trailing arrow that nudges on hover. */
export function TextLink({ className, children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link className={cn('group inline-flex min-h-9 items-center gap-1 rounded-control px-2 text-[13px] font-semibold no-underline hover:bg-tmc-cyan-wash hover:no-underline', className)} {...props}>
      {children}
      <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
