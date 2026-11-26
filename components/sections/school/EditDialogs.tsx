'use client';

import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { api } from '@/lib/shared/apiClient';
import { useAction } from '@/lib/hooks/useAction';
import { contactSchema, schoolDetailsSchema } from '@/lib/shared/validation';
import { isMissing } from '@/lib/shared/format';
import type { Contact, School } from '@/types/domain';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';

const SCHOOL_FIELDS = [
  ['schoolPhone', 'School phone'], ['schoolEmail', 'School email'], ['website', 'Website'],
  ['location', 'Location'], ['tier', 'Tier'], ['curriculum', 'Curriculum'],
] as const;

export function EditSchoolButton({ school }: { school: School }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const save = useAction(async (form: FormData) => {
    await api.patch(`/schools/${school.id}`, schoolDetailsSchema.parse(Object.fromEntries(form)));
    toast('School details updated');
    setOpen(false);
  });
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}><Pencil aria-hidden />Edit</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Edit school details">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.run(new FormData(e.currentTarget)); }}>
          {SCHOOL_FIELDS.map(([k, label]) => (
            <FormField key={k} label={label}><input name={k} defaultValue={school[k]} /></FormField>
          ))}
          {save.error && <Alert className="sm:col-span-2">{save.error.message}</Alert>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={save.pending}>{save.pending ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function ContactDialogButton({ schoolId, contact }: { schoolId: number; contact?: Contact }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const isNew = !contact;
  const clean = (v?: string) => (v && !isMissing(v) ? v : '');
  const save = useAction(async (form: FormData) => {
    const body = contactSchema.parse(Object.fromEntries(form));
    if (isNew) await api.post(`/schools/${schoolId}/contacts`, body);
    else await api.patch(`/schools/${schoolId}/contacts/${contact.id}`, body);
    toast(isNew ? 'Contact added' : 'Contact updated');
    setOpen(false);
  });
  return (
    <>
      {isNew
        ? <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Plus aria-hidden />Add contact</Button>
        : <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label={`Edit ${contact.name}`}><Pencil aria-hidden /></Button>}
      <Dialog open={open} onClose={() => setOpen(false)} title={isNew ? 'Add contact' : `Edit ${contact.name}`}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.run(new FormData(e.currentTarget)); }}>
          <FormField label="Name *"><input name="name" defaultValue={contact?.name} required /></FormField>
          <FormField label="Position"><input name="position" defaultValue={contact?.position} /></FormField>
          <FormField label="Phone"><input name="phone" defaultValue={clean(contact?.phone)} /></FormField>
          <FormField label="Email"><input name="email" type="email" defaultValue={clean(contact?.email)} /></FormField>
          <FormField label="LinkedIn URL" className="sm:col-span-2"><input name="linkedin" defaultValue={clean(contact?.linkedin)} /></FormField>
          {save.error && <Alert className="sm:col-span-2">{save.error.message}</Alert>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={save.pending}>{save.pending ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
