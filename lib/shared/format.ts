import { APP_TZ } from './time';

const dateTime = new Intl.DateTimeFormat('en-IN', { timeZone: APP_TZ, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const dateOnly = new Intl.DateTimeFormat('en-IN', { timeZone: APP_TZ, day: 'numeric', month: 'short', year: 'numeric' });
const timeOnly = new Intl.DateTimeFormat('en-IN', { timeZone: APP_TZ, hour: 'numeric', minute: '2-digit' });

export const fmtDateTime = (v?: string | Date | null) => (v ? dateTime.format(new Date(v)) : '—');
export const fmtDate = (v?: string | Date | null) => (v ? dateOnly.format(new Date(v)) : '—');
export const fmtTime = (v?: string | Date | null) => (v ? timeOnly.format(new Date(v)) : '');

export function relative(v: string | Date | null | undefined, now = Date.now()): string {
  if (!v) return '—';
  const diff = new Date(v).getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (abs < 3600000) return rtf.format(Math.round(diff / 60000), 'minute');
  if (abs < 86400000) return rtf.format(Math.round(diff / 3600000), 'hour');
  return rtf.format(Math.round(diff / 86400000), 'day');
}

/** The research sheet uses phrases like "Not found" / "Not publicly available" for missing data. */
export function isMissing(v?: string | null): boolean {
  if (!v) return true;
  const s = v.trim().toLowerCase();
  return !s || /^(not\b|no\b|n\/a|na$|none|unknown|-$)/.test(s);
}

/** "+91 80 1234; 080 5678 / 99887" → separate dialable numbers. */
export function splitPhones(v?: string | null): string[] {
  if (!v || isMissing(v)) return [];
  return v.split(/[;,|]|\s\/\s/).map((p) => p.trim()).filter((p) => (p.match(/\d/g) ?? []).length >= 6);
}
export const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`;

export function splitEmails(v?: string | null): string[] {
  if (!v || isMissing(v)) return [];
  return v.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [];
}

export function asUrl(v?: string | null): string | null {
  if (!v || isMissing(v)) return null;
  const s = v.trim().split(/\s|;/)[0] ?? '';
  if (!/\./.test(s)) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

/** Activity messages embed ISO timestamps; render them in the business timezone. */
export const humanize = (msg: string) =>
  msg.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, (iso) => fmtDateTime(iso));

export const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

/** For server components, which render once per request. Client components use useNow(). */
export const isPast = (iso: string, at: number = Date.now()) => new Date(iso).getTime() < at;
