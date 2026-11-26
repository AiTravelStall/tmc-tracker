import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonClass } from '@/components/ui/Button';

export function Pager({ page, pages, params }: { page: number; pages: number; params: Record<string, string> }) {
  if (pages <= 1) return null;
  const href = (p: number) => `?${new URLSearchParams({ ...params, page: String(p) }).toString()}`;
  return (
    <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-4 text-sm">
      {page > 1 ? <Link className={buttonClass('outline', 'sm')} href={href(page - 1)}><ChevronLeft aria-hidden />Previous</Link>
        : <span aria-disabled="true" className={buttonClass('outline', 'sm')}><ChevronLeft aria-hidden />Previous</span>}
      <span className="text-tmc-slate tabular-nums">Page <strong className="text-tmc-navy">{page}</strong> of {pages}</span>
      {page < pages ? <Link className={buttonClass('outline', 'sm')} href={href(page + 1)}>Next<ChevronRight aria-hidden /></Link>
        : <span aria-disabled="true" className={buttonClass('outline', 'sm')}>Next<ChevronRight aria-hidden /></span>}
    </nav>
  );
}
