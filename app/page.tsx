import { redirect } from 'next/navigation';
import { getCurrentUser, HOME_FOR } from '@/lib/server/auth';

export default async function Root() {
  const user = await getCurrentUser();
  redirect(user ? HOME_FOR[user.role] : '/login');
}
