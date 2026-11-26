'use client';

import { useEffect } from 'react';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  const notConfigured = /environment variables|not configured/i.test(error.message);
  return (
    <Card className="mx-auto mt-10 flex max-w-lg flex-col items-center text-center">
      <span aria-hidden className="mb-3 grid size-12 place-items-center rounded-full bg-tmc-error-wash text-tmc-error-ink"><TriangleAlert className="size-6" /></span>
      <h1 className="font-display text-h2 text-tmc-navy">{notConfigured ? 'Setup needed' : 'Something went wrong'}</h1>
      <p className="mt-2 text-sm text-tmc-slate">
        {notConfigured
          ? 'The Supabase keys are missing. Add them to .env.local and restart the server.'
          : 'This page could not load. Your data is safe — try again, and if it keeps happening tell an admin.'}
      </p>
      {error.digest && <p className="mt-2 text-xs text-tmc-slate">Reference: {error.digest}</p>}
      <div className="mt-5 flex justify-center gap-2">
        <Button onClick={reset}><RotateCcw aria-hidden />Try again</Button>
      </div>
    </Card>
  );
}
