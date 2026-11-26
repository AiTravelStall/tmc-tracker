import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, HOME_FOR } from '@/lib/server/auth';
import { AuthCard } from '@/components/sections/auth/AuthCard';
import { LoginForm } from '@/components/sections/auth/LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect(user.mustChangePassword ? '/welcome' : HOME_FOR[user.role]);
  return (
    <AuthCard title="Sign in" subtitle="School outreach, follow-ups and sales visits in one place.">
      <Suspense><LoginForm /></Suspense>
    </AuthCard>
  );
}
