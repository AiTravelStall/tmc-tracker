import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser, HOME_FOR } from '@/lib/server/auth';
import { AuthCard } from '@/components/sections/auth/AuthCard';
import { ChangePasswordForm } from '@/components/sections/auth/ChangePasswordForm';

export const metadata: Metadata = { title: 'Set your password' };

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.mustChangePassword) redirect(HOME_FOR[user.role]);
  return (
    <AuthCard title={`Welcome, ${user.fullName.split(' ')[0]}`} subtitle="Set your own password to finish setting up your account.">
      <ChangePasswordForm redirectTo={HOME_FOR[user.role]} />
    </AuthCard>
  );
}
