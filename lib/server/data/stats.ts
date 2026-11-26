import 'server-only';
import { supabaseForUser } from '../supabase';
import { env } from '../env';
import { unwrap } from './query';
import { dayBounds } from '@/lib/shared/time';
import type { CallOutcome, SchoolStatus } from '@/types/domain';

export type DashboardStats = {
  days: number;
  totals: Record<
    'schools' | 'contacts' | 'schoolsContacted' | 'converted' | 'calls' | 'schoolsCalled' | 'enquiries' |
    'visitsBooked' | 'visitsCompleted' | 'visitsUpcoming' | 'visitsAwaitingOutcome' | 'followUpsPending' | 'followUpsOverdue',
    number
  >;
  statusCounts: Partial<Record<SchoolStatus, number>>;
  daily: { day: string; calls: number; visitsBooked: number; visitsDone: number }[];
  telemarketers: {
    id: string; name: string; active: boolean; calls: number; schoolsCalled: number; enquiries: number;
    visitsBooked: number; followUpsPending: number; followUpsOverdue: number; schoolsAssigned: number; lastCallAt: string | null;
  }[];
  sales: { id: string; name: string; active: boolean; upcoming: number; awaitingOutcome: number; completed: number; cancelled: number; converted: number }[];
  callOutcomes: { outcome: CallOutcome; count: number }[];
  byTier: { tier: string; total: number; contacted: number; visitStage: number; converted: number }[];
};

export async function getDashboardStats(days: number): Promise<DashboardStats> {
  const sb = await supabaseForUser();
  return unwrap(await sb.rpc('dashboard_stats', { p_days: days, p_tz: env().NEXT_PUBLIC_APP_TIMEZONE })) as DashboardStats;
}

export type TelemarketerStats = { callsToday: number; callsWeek: number; enquiriesWeek: number; visitsBookedWeek: number; schoolsNotCalled: number };
export type SalesStats = { upcoming: number; today: number; pendingOutcome: number; completedWeek: number };

export async function getMyStats<T extends TelemarketerStats | SalesStats>(): Promise<T> {
  const sb = await supabaseForUser();
  return unwrap(await sb.rpc('my_stats', { p_day_start: dayBounds().start })) as T;
}
