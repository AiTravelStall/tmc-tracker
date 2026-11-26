import { route } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { followUpSummary, recentlyDue } from '@/lib/server/data/followups';
import { listMeetings } from '@/lib/server/data/meetings';

// Polled by the app shell for the sidebar badge and reminders.
export const GET = route('followups.summary', async () => {
  const user = await requireApiUser();
  if (user.role === 'sales') {
    const now = new Date();
    const soon = await listMeetings({ from: now.toISOString(), to: new Date(now.getTime() + 2 * 3600_000).toISOString(), statuses: ['scheduled'] });
    return { badge: soon.length, reminders: soon.map((m) => ({ key: `m${m.id}:${m.startAt}`, title: 'Upcoming visit', body: m.schoolName, at: m.startAt, href: '/calendar' })) };
  }
  const [summary, due] = await Promise.all([followUpSummary(), recentlyDue(user)]);
  return {
    badge: summary.overdue + summary.today,
    reminders: due.map((f) => ({ key: `f${f.id}:${f.dueAt}`, title: 'Follow-up call due', body: f.schoolName, at: f.dueAt, href: `/schools/${f.schoolId}` })),
  };
});
