'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ClientApiError } from '@/lib/shared/apiClient';
import { loginSchema } from '@/lib/shared/validation';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: form.get('email'), password: form.get('password') });
    if (!parsed.success) {
      const errs = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
      setFieldErrors(errs);
      (e.currentTarget.elements.namedItem(Object.keys(errs)[0]!) as HTMLElement | null)?.focus();
      return;
    }
    setFieldErrors({});
    setPending(true);
    setError(null);
    try {
      const { redirectTo } = await api.post<{ redirectTo: string }>('/auth/login', parsed.data);
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
      router.replace(redirectTo === '/welcome' ? redirectTo : safeNext ?? redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Could not sign in');
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormField label="Email" error={fieldErrors.email}>
        <input name="email" type="email" autoComplete="username" autoFocus required />
      </FormField>
      <FormField label="Password" error={fieldErrors.password}>
        <input name="password" type="password" autoComplete="current-password" required />
      </FormField>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" size="lg" loading={pending} className="mt-1 w-full">{pending ? 'Signing in…' : 'Sign in'}</Button>
      <p className="text-center text-xs text-tmc-slate">Forgot your password? Ask your admin to reset it.</p>
    </form>
  );
}
