'use client';

import { useState } from 'react';
import { LoaderCircle, Upload } from 'lucide-react';
import { api } from '@/lib/shared/apiClient';
import { useAction } from '@/lib/hooks/useAction';
import { Alert } from '@/components/ui/Feedback';
import { buttonClass } from '@/components/ui/Button';

type Stats = { rows: number; schools: number; contacts: number; skipped: number };

export function ImportCard() {
  const [result, setResult] = useState<Stats | null>(null);
  const upload = useAction(async (file: File) => {
    setResult(null);
    if (file.size > 10_000_000) throw new Error('CSV is larger than 10 MB');
    setResult(await api.post<Stats>('/admin/import', await file.text()));
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-tmc-slate">
        Upload a CSV in the research-sheet format (one row per decision maker, with a <code>School Name</code> column).
        Existing schools and contacts are updated in place. Calls, follow-ups, visits and statuses are never changed.
      </p>
      <label className={buttonClass('primary', 'md', 'w-fit cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-tmc-cyan-bright')}>
        {upload.pending ? <LoaderCircle aria-hidden className="animate-spin" /> : <Upload aria-hidden />}
        {upload.pending ? 'Importing…' : 'Choose CSV file'}
        <input type="file" accept=".csv,text/csv" className="sr-only" disabled={upload.pending}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.run(f); e.target.value = ''; }} />
      </label>
      {upload.error && <Alert>{upload.error.message}</Alert>}
      {result && (
        <Alert tone="success">
          <strong>Import finished — {result.rows} rows read.</strong>
          <p>{result.schools} schools and {result.contacts} contacts created or updated.{result.skipped ? ` ${result.skipped} rows had no school name and were skipped.` : ''}</p>
        </Alert>
      )}
    </div>
  );
}
