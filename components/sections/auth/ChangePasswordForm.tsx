'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ClientApiError } from '@/lib/shared/apiClient';
import { changePasswordSchema } from '@/lib/shared/validation';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';

export function ChangePasswordForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const errs: Record<string, string> = {};
    const parsed = changePasswordSchema.safeParse({ current: form.get('current'), next: form.get('next') });
    if (!parsed.success) parsed.error.issues.forEach((i) => { errs[String(i.path[0])] ??= i.message; });
    if (form.get('next') !== form.get('confirm')) errs.confirm = 'Passwords do not match';
    setFieldErrors(errs);
    if (Object.keys(errs).length || !parsed.success) return;

    setPending(true);
    setError(null);
    try {
      await api.post('/auth/password', parsed.data);
      formEl.reset();
      setDone(true);
      if (redirectTo) { router.replace(redirectTo); router.refresh(); }
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Could not update password');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormField label="Current password" error={fieldErrors.current}>
        <input name="current" type="password" autoComplete="current-password" required />
      </FormField>
      <FormField label="New password" hint="At least 8 characters" error={fieldErrors.next}>
        <input name="next" type="password" autoComplete="new-password" required minLength={8} />
      </FormField>
      <FormField label="Confirm new password" error={fieldErrors.confirm}>
        <input name="confirm" type="password" autoComplete="new-password" required />
      </FormField>
      {error && <Alert>{error}</Alert>}
      {done && !redirectTo && <Alert tone="success">Password updated.</Alert>}
      <Button type="submit" disabled={pending} className="self-start">{pending ? 'Saving…' : 'Update password'}</Button>
    </form>
  );
}
