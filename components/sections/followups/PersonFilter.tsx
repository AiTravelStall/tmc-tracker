'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DirectoryUser } from '@/types/domain';

/** URL-driven person filter used on admin views. */
export function PersonFilter({ people, param, label, allLabel }: { people: DirectoryUser[]; param: string; label: string; allLabel: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <>
      <label htmlFor={`pf-${param}`} className="sr-only">{label}</label>
      <select id={`pf-${param}`} className="tmc-input w-auto min-w-48" value={params.get(param) ?? ''}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          if (e.target.value) next.set(param, e.target.value); else next.delete(param);
          router.replace(`${pathname}?${next}`, { scroll: false });
        }}>
        <option value="">{allLabel}</option>
        {people.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
      </select>
    </>
  );
}
