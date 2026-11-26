import type { ComponentProps } from 'react';
import { cn } from '@/lib/shared/cn';

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:last-child_td]:border-b-0', className)} {...props} />
    </div>
  );
}
export function Th({ className, numeric, ...props }: ComponentProps<'th'> & { numeric?: boolean }) {
  return <th scope="col" className={cn('whitespace-nowrap border-b border-tmc-border bg-tmc-subtle px-4 py-2.5 text-left text-xs font-semibold text-tmc-slate first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6', numeric && 'text-right', className)} {...props} />;
}
export function Td({ className, numeric, ...props }: ComponentProps<'td'> & { numeric?: boolean }) {
  return <td className={cn('border-b border-tmc-border px-4 py-3.5 align-top first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6', numeric && 'text-right tabular-nums', className)} {...props} />;
}
