import { requirePageUser } from '@/lib/server/auth';
import { AppShell } from '@/components/layout/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  return <AppShell user={{ fullName: user.fullName, role: user.role }}>{children}</AppShell>;
}
