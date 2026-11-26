import { ArrowLeftRight, BellRing, CalendarDays, LayoutDashboard, MapPin, School, ScrollText, Sun, Users, type LucideIcon } from 'lucide-react';
import type { Role } from '@/types/domain';

export type NavItem = { href: string; label: string; icon: LucideIcon; badge?: boolean; group?: 'admin' };

export const NAV: Record<Role, NavItem[]> = {
  admin: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/schools', label: 'Schools', icon: School },
    { href: '/followups', label: 'Follow-ups', icon: BellRing, badge: true },
    { href: '/calendar', label: 'Calendar', icon: CalendarDays },
    { href: '/meetings', label: 'Visits', icon: MapPin },
    { href: '/activity', label: 'Activity log', icon: ScrollText, group: 'admin' },
    { href: '/team', label: 'Team', icon: Users, group: 'admin' },
    { href: '/data', label: 'Import / Export', icon: ArrowLeftRight, group: 'admin' },
  ],
  telemarketer: [
    { href: '/today', label: 'My day', icon: Sun },
    { href: '/schools', label: 'Schools', icon: School },
    { href: '/followups', label: 'Follow-ups', icon: BellRing, badge: true },
    { href: '/calendar', label: 'Sales calendar', icon: CalendarDays },
    { href: '/meetings', label: 'Visits', icon: MapPin },
  ],
  sales: [
    { href: '/calendar', label: 'My calendar', icon: CalendarDays, badge: true },
    { href: '/meetings', label: 'My visits', icon: MapPin },
    { href: '/schools', label: 'My schools', icon: School },
  ],
};
