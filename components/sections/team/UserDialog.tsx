'use client';

import { useState } from 'react';
import { api } from '@/lib/shared/apiClient';
import { useAction } from '@/lib/hooks/useAction';
import { ROLE_LABEL } from '@/lib/shared/labels';
import { userCreateSchema, userUpdateSchema } from '@/lib/shared/validation';
import { ROLES, type Profile } from '@/types/domain';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';

function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('') + '!7';
}

export function UserDialog({ user, onClose }: { user: Profile | null; onClose: () => void }) {
  const toast = useToast();
  const isNew = !user;
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const save = useAction(async (form: FormData) => {
    const raw = Object.fromEntries(form) as Record<string, string>;
    if (!isNew && !raw.password) delete raw.password;
    const parsed = (isNew ? userCreateSchema : userUpdateSchema).safeParse(raw);
    if (!parsed.success) { setFieldError(parsed.error.issues[0]?.message ?? 'Check the form'); return; }
    if (isNew) await api.post('/users', parsed.data); else await api.patch(`/users/${user.id}`, parsed.data);
    toast(isNew ? `Account created for ${raw.fullName}. Share the temporary password with them.` : 'User updated');
    onClose();
  });

  return (
    <Dialog open onClose={onClose} title={isNew ? 'Add user' : `Edit ${user.fullName}`}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); setFieldError(null); save.run(new FormData(e.currentTarget)); }}>
        <FormField label="Full name *"><input name="fullName" defaultValue={user?.fullName} required /></FormField>
        <FormField label="Email (login) *" hint={isNew ? undefined : 'Email cannot be changed'}>
          <input name="email" type="email" defaultValue={user?.email} required={isNew} disabled={!isNew} />
        </FormField>
        <FormField label="Phone"><input name="phone" defaultValue={user?.phone} /></FormField>
        <FormField label="Role *">
          <select name="role" defaultValue={user?.role ?? 'telemarketer'}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
        </FormField>
        <FormField className="sm:col-span-2" label={isNew ? 'Temporary password *' : 'Reset password'}
          hint={isNew ? 'They will be asked to choose their own password on first sign-in.' : 'Leave blank to keep the current password.'}>
          <input name="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required={isNew} autoComplete="new-password" />
        </FormField>
        <div className="sm:col-span-2 -mt-2"><Button size="sm" variant="outline" onClick={() => setPassword(generatePassword())}>Generate password</Button></div>
        {(fieldError || save.error) && <Alert className="sm:col-span-2">{fieldError ?? save.error?.message}</Alert>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.pending}>{save.pending ? 'Saving…' : isNew ? 'Create account' : 'Save'}</Button>
        </div>
      </form>
    </Dialog>
  );
}
