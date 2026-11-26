// Timezone-aware helpers. The whole team works in one business timezone, so the server
// and every browser format and interpret times in it, whatever the device clock says.
export const APP_TZ = process.env.NEXT_PUBLIC_APP_TIMEZONE || 'Asia/Kolkata';

type Parts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function zonedParts(date: Date, tz = APP_TZ): Parts {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year), month: Number(p.month), day: Number(p.day),
    hour: Number(p.hour), minute: Number(p.minute), weekday: WEEKDAYS.indexOf(String(p.weekday)),
  };
}

/** Milliseconds the zone is ahead of UTC at `date`. */
export function tzOffsetMs(date: Date, tz = APP_TZ): number {
  const p = zonedParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(date.getTime() / 60000) * 60000;
}

/** Wall-clock time in the zone → UTC Date (handles DST by re-checking the offset). */
export function zonedToUtc(year: number, month: number, day: number, hour = 0, minute = 0, tz = APP_TZ): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let t = guess - tzOffsetMs(new Date(guess), tz);
  const second = guess - tzOffsetMs(new Date(t), tz);
  if (second !== t) t = second;
  return new Date(t);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO instant → value for <input type="datetime-local">, in the business timezone. */
export function toZonedInput(iso: string | Date, tz = APP_TZ): string {
  const p = zonedParts(new Date(iso), tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** <input type="datetime-local"> value → ISO instant, interpreting it in the business timezone. */
export function fromZonedInput(value: string, tz = APP_TZ): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) throw new Error('Invalid date/time');
  return zonedToUtc(+m[1]!, +m[2]!, +m[3]!, +m[4]!, +m[5]!, tz).toISOString();
}

/** Start/end of the business day containing `at`, as ISO strings. */
export function dayBounds(at = new Date(), tz = APP_TZ) {
  const p = zonedParts(at, tz);
  const start = zonedToUtc(p.year, p.month, p.day, 0, 0, tz);
  const next = zonedParts(new Date(start.getTime() + 36 * 3600000), tz);
  const end = zonedToUtc(next.year, next.month, next.day, 0, 0, tz);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** A datetime-local value `days` from today at `hour`, skipping Sundays. */
export function slotInDays(days: number, hour = 11, now = new Date(), tz = APP_TZ): string {
  const p = zonedParts(now, tz);
  let d = new Date(Date.UTC(p.year, p.month - 1, p.day + days, 12));
  if (d.getUTCDay() === 0) d = new Date(d.getTime() + 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(hour)}:00`;
}
