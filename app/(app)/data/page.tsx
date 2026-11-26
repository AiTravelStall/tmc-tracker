import type { Metadata } from 'next';
import { requirePageUser } from '@/lib/server/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { buttonClass } from '@/components/ui/Button';
import { ImportCard } from '@/components/sections/data/ImportCard';

export const metadata: Metadata = { title: 'Import / Export' };

export default async function DataPage() {
  await requirePageUser(['admin']);
  return (
    <>
      <PageHeader title="Import / Export" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card aria-labelledby="import"><CardHeader id="import" title="Import schools CSV" /><ImportCard /></Card>
        <Card aria-labelledby="export">
          <CardHeader id="export" title="Export tracker" />
          <p className="mb-4 text-sm text-tmc-slate">One row per school with status, telemarketer, latest call notes, enquiry, latest visit and visit notes.</p>
          {/* Plain link: the browser handles the download with the session cookie. */}
          <a href="/api/admin/export" className={buttonClass('outline')} download>Download CSV</a>
        </Card>
      </div>
    </>
  );
}
