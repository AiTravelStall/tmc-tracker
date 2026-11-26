import { route } from '@/lib/server/http';
import { requireApiUser } from '@/lib/server/auth';
import { supabaseForUser } from '@/lib/server/supabase';
import { unwrap } from '@/lib/server/data/query';

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  // Neutralise spreadsheet formula injection and quote when needed.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const GET = route('admin.export', async () => {
  await requireApiUser(['admin']);
  const sb = await supabaseForUser();
  const [schools, calls, meetings] = await Promise.all([
    sb.from('school_list').select('*').order('name'),
    sb.from('call_list').select('school_id, notes, enquiry, created_at').order('created_at', { ascending: false }),
    sb.from('meeting_list').select('school_id, start_at, sales_name, status, outcome, outcome_notes').order('start_at', { ascending: false }),
  ]);
  const lastCall = new Map<number, { notes: string; enquiry: string }>();
  for (const c of unwrap(calls) ?? []) if (!lastCall.has(c.school_id)) lastCall.set(c.school_id, c);
  const lastEnquiry = new Map<number, string>();
  for (const c of unwrap(calls) ?? []) if (c.enquiry && !lastEnquiry.has(c.school_id)) lastEnquiry.set(c.school_id, c.enquiry);
  const lastMeeting = new Map<number, Record<string, string>>();
  for (const m of unwrap(meetings) ?? []) if (!lastMeeting.has(m.school_id)) lastMeeting.set(m.school_id, m);

  const header = ['School Name', 'Location', 'Tier', 'Curriculum', 'School Phone', 'School Email', 'Website', 'Status',
    'Telemarketer', 'Last Contacted', 'Next Follow-up', 'Calls', 'Last Call Notes', 'Latest Enquiry',
    'Latest Visit', 'Sales Person', 'Visit Status', 'Visit Outcome', 'Visit Notes'];
  const lines = (unwrap(schools) ?? []).map((s) => {
    const m = lastMeeting.get(s.id);
    return [s.name, s.location, s.tier, s.curriculum, s.school_phone, s.school_email, s.website, s.status,
      s.assigned_name, s.last_contacted_at, s.next_follow_up_at, s.call_count, lastCall.get(s.id)?.notes,
      lastEnquiry.get(s.id), m?.start_at, m?.sales_name, m?.status, m?.outcome, m?.outcome_notes].map(cell).join(',');
  });
  return new Response('﻿' + [header.join(','), ...lines].join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tmc-tracker-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
});
