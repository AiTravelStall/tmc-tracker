import type { Metadata } from 'next';
import { requirePageUser } from '@/lib/server/auth';
import { listUsers } from '@/lib/server/data/users';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { TeamTable } from '@/components/sections/team/TeamTable';

export const metadata: Metadata = { title: 'Team' };

export default async function TeamPage() {
  const me = await requirePageUser(['admin']);
  const users = await listUsers();
  return (
    <>
      <PageHeader title="Team" description="Create logins for telemarketers and sales people. Disabled users can no longer sign in; their history is kept." />
      <Card flush><TeamTable users={users} meId={me.id} /></Card>
    </>
  );
}
