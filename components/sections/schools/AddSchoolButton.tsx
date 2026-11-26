'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/shared/apiClient';
import { useAction } from '@/lib/hooks/useAction';
import { schoolCreateSchema } from '@/lib/shared/validation';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Feedback';

const FIELDS = [
  ['name', 'School name *'], ['location', 'Location (Area, City)'], ['tier', 'Tier'], ['curriculum', 'Curriculum'],
  ['schoolPhone', 'School phone'], ['schoolEmail', 'School email'], ['website', 'Website'],
] as const;

export function AddSchoolButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const save = useAction(async (form: FormData) => {
    const parsed = schoolCreateSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) { setFieldError(parsed.error.issues[0]?.message ?? 'Check the form'); return; }
    const { id } = await api.post<{ id: number }>('/schools', parsed.data);
    router.push(`/schools/${id}`);
  }, { refresh: false });

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus aria-hidden />Add school</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add school">
        <form onSubmit={(e) => { e.preventDefault(); setFieldError(null); save.run(new FormData(e.currentTarget)); }} className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map(([name, label]) => (
            <FormField key={name} label={label} error={name === 'name' ? fieldError : undefined}>
              <input name={name} required={name === 'name'} />
            </FormField>
          ))}
          {save.error && <Alert className="sm:col-span-2">{save.error.message}</Alert>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={save.pending}>{save.pending ? 'Adding…' : 'Add school'}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
