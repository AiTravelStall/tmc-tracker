import { ArrowUpRight, Mail, Phone } from 'lucide-react';
import { asUrl, isMissing, splitEmails, splitPhones, telHref } from '@/lib/shared/format';

/** Renders a raw research value, greying out "Not found"-style placeholders. */
export function RawValue({ value }: { value?: string | null }) {
  if (isMissing(value)) return <span className="text-tmc-slate/80">{value || '—'}</span>;
  return <span>{value}</span>;
}

const chip = 'inline-flex items-center gap-1.5 font-medium whitespace-nowrap';

export function Phones({ value, compact }: { value?: string | null; compact?: boolean }) {
  const phones = splitPhones(value);
  if (!phones.length) return <RawValue value={value} />;
  const shown = compact ? phones.slice(0, 1) : phones;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
      {shown.map((p) => (
        <a key={p} href={telHref(p)} className={`${chip} tabular-nums`} aria-label={`Call ${p}`}>
          <Phone aria-hidden className="size-3.5" />{p}
        </a>
      ))}
      {compact && phones.length > 1 && <span className="text-xs text-tmc-slate">+{phones.length - 1} more</span>}
    </span>
  );
}

export function Emails({ value }: { value?: string | null }) {
  const emails = splitEmails(value);
  if (!emails.length) return <RawValue value={value} />;
  return (
    <span className="inline-flex flex-wrap gap-x-4 gap-y-1">
      {emails.map((e) => (
        <a key={e} href={`mailto:${e}`} className="inline-flex items-center gap-1.5 break-all">
          <Mail aria-hidden className="size-3.5 shrink-0" />{e}
        </a>
      ))}
    </span>
  );
}

export function ExternalLink({ value, label }: { value?: string | null; label?: string }) {
  const url = asUrl(value);
  if (!url) return <RawValue value={value} />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all">
      {label ?? url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
      <ArrowUpRight aria-hidden className="size-3.5 shrink-0" /><span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function LinkedIn({ value }: { value?: string | null }) {
  const url = asUrl(value);
  if (!url || !/linkedin\.com/i.test(url)) {
    return <span className="text-xs text-tmc-slate">LinkedIn: {value || '—'}</span>;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={chip}>
      <span aria-hidden className="grid size-4 place-items-center rounded-[4px] bg-tmc-cyan-deep text-[10px] font-bold leading-none text-tmc-white">in</span>
      LinkedIn<ArrowUpRight aria-hidden className="size-3.5" /><span className="sr-only"> profile (opens in a new tab)</span>
    </a>
  );
}
