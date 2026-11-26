'use client';

import { useCallback, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { EventDropArg, EventSourceFuncArg, EventInput } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { api } from '@/lib/shared/apiClient';
import type { DirectoryUser, Meeting, MeetingStatus, Role } from '@/types/domain';
import { MeetingDialog } from '@/components/sections/meetings/MeetingDialog';
import { useToast } from '@/components/ui/Toast';

// Status colours are reserved for state and always paired with the legend label.
const STATUS_COLOR: Record<MeetingStatus, string> = {
  scheduled: 'var(--color-tmc-cyan-deep)',
  completed: 'var(--color-tmc-success)',
  cancelled: 'var(--color-tmc-slate)',
  no_show: 'var(--color-tmc-error)',
};
const NEEDS_OUTCOME = 'var(--color-tmc-warning)';

export function CalendarView({ role, userId, salesPeople }: { role: Role; userId: string; salesPeople: DirectoryUser[] }) {
  const toast = useToast();
  const cal = useRef<FullCalendar>(null);
  const [salesId, setSalesId] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  const events = useCallback(async (info: EventSourceFuncArg): Promise<EventInput[]> => {
    const rows = await api.get<Meeting[]>('/meetings', { from: info.start.toISOString(), to: info.end.toISOString(), salesUserId: salesId || undefined });
    const now = Date.now();
    return rows.filter((m) => showCancelled || m.status !== 'cancelled').map((m) => {
      const color = m.status === 'scheduled' && new Date(m.endAt).getTime() < now ? NEEDS_OUTCOME : STATUS_COLOR[m.status];
      return {
        id: String(m.id), start: m.startAt, end: m.endAt,
        title: role === 'sales' ? m.schoolName : `${m.schoolName} · ${m.salesName}`,
        backgroundColor: color, borderColor: color, classNames: [`ev-${m.status}`],
        editable: m.status === 'scheduled' && role !== 'telemarketer',
      };
    });
  }, [salesId, showCancelled, role]);

  const move = async (info: EventDropArg | EventResizeDoneArg) => {
    const { start, end } = info.event;
    if (!start || !end) return info.revert();
    try {
      await api.patch(`/meetings/${info.event.id}`, { action: 'reschedule', startAt: start.toISOString(), durationMin: Math.round((+end - +start) / 60000) });
      toast('Visit moved');
    } catch (e) {
      info.revert();
      toast(e instanceof Error ? e.message : 'Could not move the visit', 'error');
    }
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-4 text-xs text-tmc-charcoal" aria-label="Legend">
          {([['Scheduled', STATUS_COLOR.scheduled], ['Needs outcome', NEEDS_OUTCOME], ['Completed', STATUS_COLOR.completed], ['No show', STATUS_COLOR.no_show]] as const)
            .map(([label, c]) => <li key={label} className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-sm" style={{ background: c }} />{label}</li>)}
          {showCancelled && <li className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-sm" style={{ background: STATUS_COLOR.cancelled }} />Cancelled</li>}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          {role !== 'sales' && (
            <>
              <label htmlFor="cal-sales" className="sr-only">Sales person</label>
              <select id="cal-sales" className="tmc-input w-auto" value={salesId} onChange={(e) => setSalesId(e.target.value)}>
                <option value="">All sales people</option>
                {salesPeople.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-tmc-cyan-deep" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
            Show cancelled
          </label>
        </div>
      </div>
      <div className="rounded-panel border border-tmc-border bg-tmc-white p-3 shadow-card sm:p-5">
        <FullCalendar
          key={`${salesId}-${showCancelled}`}
          ref={cal}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={typeof window !== 'undefined' && window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth'}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' }}
          buttonText={{ today: 'Today', month: 'Month', week: 'Week', day: 'Day', list: 'Agenda' }}
          height="auto"
          firstDay={1}
          nowIndicator
          dayMaxEvents={4}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          events={events}
          eventDrop={move}
          eventResize={move}
          eventClick={(info) => { info.jsEvent.preventDefault(); setOpenId(Number(info.event.id)); }}
          eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
        />
      </div>
      <MeetingDialog meetingId={openId} role={role} userId={userId} salesPeople={salesPeople}
        onClose={() => setOpenId(null)} onChanged={() => cal.current?.getApi().refetchEvents()} />
    </>
  );
}
