import type { Metadata } from 'next';
import { requirePageUser } from '@/lib/server/auth';
import { listSchools, getSchoolFilterOptions, PAGE_SIZE } from '@/lib/server/data/schools';
import { listDirectory } from '@/lib/server/data/users';
import { schoolFiltersSchema } from '@/lib/shared/validation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { SchoolFilters } from '@/components/sections/schools/SchoolFilters';
import { SchoolTable } from '@/components/sections/schools/SchoolTable';
import { AddSchoolButton } from '@/components/sections/schools/AddSchoolButton';
import { Pager } from '@/components/sections/schools/Pager';

export const metadata: Metadata = { title: 'Schools' };

export default async function SchoolsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageUser();
  const raw = await searchParams;
  const parsed = schoolFiltersSchema.safeParse(Object.fromEntries(Object.entries(raw).filter(([, v]) => v)));
  const filters = parsed.success ? parsed.data : { page: 1 };
  const [{ rows, total }, options, directory] = await Promise.all([listSchools(user, filters), getSchoolFilterOptions(), listDirectory()]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cleanParams = Object.fromEntries(Object.entries(raw).filter(([k, v]) => v && k !== 'page')) as Record<string, string>;

  return (
    <>
      <PageHeader
        title={user.role === 'sales' ? 'My schools' : 'Schools'}
        description={`${total} school${total === 1 ? '' : 's'}${user.role === 'sales' ? ' with visits booked for you' : ''}`}
        actions={user.role !== 'sales' ? <AddSchoolButton /> : undefined}
      />
      <SchoolFilters options={options} telemarketers={directory.filter((u) => u.role === 'telemarketer')} role={user.role} />
      <Card flush>
        <SchoolTable rows={rows} role={user.role} telemarketers={directory.filter((u) => u.role === 'telemarketer')} />
      </Card>
      <Pager page={filters.page} pages={pages} params={cleanParams} />
    </>
  );
}
