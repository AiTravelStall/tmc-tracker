'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { STATUS_LABEL } from '@/lib/shared/labels';
import type { DirectoryUser, Role, SchoolStatus } from '@/types/domain';

type Options = { tiers: string[]; curricula: string[]; cities: string[]; areas: string[] };

const select = 'tmc-input w-auto min-w-0 flex-1 basis-40 text-sm sm:flex-none';

/** All filter state lives in the URL so views are shareable and survive back/forward. */
export function SchoolFilters({ options, telemarketers, role }: { options: Options; telemarketers: DirectoryUser[]; role: Role }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const t = setTimeout(() => { if (q !== (params.get('q') ?? '')) set('q', q.trim()); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <search className="mb-4 flex flex-wrap gap-2 rounded-panel border border-tmc-border bg-tmc-white p-3 shadow-card">
      <label className="sr-only" htmlFor="school-search">Search schools</label>
      <div className="relative min-w-60 flex-[2_1_280px]">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tmc-slate" />
        <input id="school-search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search school, area, contact, phone or email" className="tmc-input pl-10" />
      </div>
      <select aria-label="Status" className={select} value={params.get('status') ?? ''} onChange={(e) => set('status', e.target.value)}>
        <option value="">All statuses</option>
        {(Object.keys(STATUS_LABEL) as SchoolStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      <select aria-label="Tier" className={select} value={params.get('tier') ?? ''} onChange={(e) => set('tier', e.target.value)}>
        <option value="">All tiers</option>
        {options.tiers.map((t) => <option key={t}>{t}</option>)}
      </select>
      <select aria-label="Curriculum" className={select} value={params.get('curriculum') ?? ''} onChange={(e) => set('curriculum', e.target.value)}>
        <option value="">All curricula</option>
        {options.curricula.map((t) => <option key={t}>{t}</option>)}
      </select>
      <select aria-label="Location" className={select} value={params.get('location') ?? ''} onChange={(e) => set('location', e.target.value)}>
        <option value="">All locations</option>
        <optgroup label="Cities">{options.cities.map((c) => <option key={`c-${c}`} value={c}>{c}</option>)}</optgroup>
        <optgroup label="Areas">{options.areas.map((a) => <option key={a} value={a}>{a}</option>)}</optgroup>
      </select>
      {role !== 'sales' && (
        <select aria-label="Telemarketer" className={select} value={params.get('assigned') ?? ''} onChange={(e) => set('assigned', e.target.value)}>
          <option value="">Anyone&apos;s</option>
          <option value="me">Assigned to me</option>
          <option value="none">Unassigned</option>
          {telemarketers.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
        </select>
      )}
      <select aria-label="Sort" className={select} value={params.get('sort') ?? ''} onChange={(e) => set('sort', e.target.value)}>
        <option value="">Sort: Name</option>
        <option value="recent">Sort: Recently contacted</option>
        <option value="followup">Sort: Next follow-up</option>
        <option value="status">Sort: Status</option>
      </select>
    </search>
  );
}
