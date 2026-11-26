import type { Metadata } from 'next';
import { requirePageUser } from '@/lib/server/auth';
import { listDirectory } from '@/lib/server/data/users';
import { PageHeader } from '@/components/ui/PageHeader';
import { CalendarView } from '@/components/sections/calendar/CalendarView';

export const metadata: Metadata = { title: 'Calendar' };

export default async function CalendarPage() {
  const user = await requirePageUser();
  const directory = await listDirectory();
  return (
    <>
      <PageHeader
        title={user.role === 'sales' ? 'My calendar' : 'Sales calendar'}
        description={user.role === 'sales'
          ? 'Every school visit booked for you. Open a visit for the school brief and to record the outcome.'
          : 'Every sales visit booked by the telemarketing team.'}
      />
      <CalendarView role={user.role} userId={user.id} salesPeople={directory.filter((u) => u.role === 'sales')} />
    </>
  );
}
