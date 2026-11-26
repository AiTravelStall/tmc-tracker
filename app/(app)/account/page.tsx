import type { Metadata } from 'next';
import { requirePageUser } from '@/lib/server/auth';
import { ROLE_LABEL } from '@/lib/shared/labels';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { ChangePasswordForm } from '@/components/sections/auth/ChangePasswordForm';

export const metadata: Metadata = { title: 'My account' };

export default async function AccountPage() {
  const user = await requirePageUser();
  return (
    <>
      <PageHeader title="My account" />
      <div className="grid max-w-3xl gap-5">
        <Card>
          <dl className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
            <dt className="text-tmc-slate">Name</dt><dd>{user.fullName}</dd>
            <dt className="text-tmc-slate">Email</dt><dd>{user.email}</dd>
            <dt className="text-tmc-slate">Role</dt><dd>{ROLE_LABEL[user.role]}</dd>
          </dl>
        </Card>
        <Card aria-labelledby="pw"><CardHeader id="pw" title="Change password" /><ChangePasswordForm /></Card>
      </div>
    </>
  );
}
