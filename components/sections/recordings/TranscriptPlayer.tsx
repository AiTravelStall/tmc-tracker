'use client';

import { useRef, useState } from 'react';
import type { TranscriptSegment } from '@/types/domain';
import { fmtDuration } from '@/lib/shared/format';
import { cn } from '@/lib/shared/cn';

/** Audio player with a transcript that follows playback; click a line to jump there. */
export function TranscriptPlayer({ src, segments, text }: { src: string; segments: TranscriptSegment[]; text: string | null }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [now, setNow] = useState(0);
  const [failed, setFailed] = useState(false);

  const seek = (t: number) => {
    const el = audio.current;
    if (!el) return;
    el.currentTime = t;
    void el.play().catch(() => {});
  };

  return (
    <div className="flex flex-col gap-5">
      {failed
        ? <p role="alert" className="rounded-control bg-tmc-error-wash px-4 py-3 text-sm text-tmc-error-ink">Salestrail didn&apos;t return a recording for this call. Reload the page to try again; if it keeps happening, check the call in the Salestrail dashboard.</p>
        : <audio ref={audio} src={src} controls preload="none" className="w-full" onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} onError={() => setFailed(true)} />}

      {segments.length > 0 ? (
        <ol className="flex flex-col gap-1">
          {segments.map((s, i) => {
            const active = now >= s.start && now < s.end;
            return (
              <li key={i}>
                <button type="button" onClick={() => seek(s.start)} aria-current={active || undefined}
                  className={cn('flex w-full gap-3 rounded-control px-3 py-2 text-left text-sm transition-colors hover:bg-tmc-subtle',
                    active && 'bg-tmc-cyan-wash ring-1 ring-tmc-cyan-deep/20 ring-inset hover:bg-tmc-cyan-wash')}>
                  <span className="w-12 shrink-0 pt-px text-xs tabular-nums text-tmc-slate">{fmtDuration(s.start)}</span>
                  <span className="text-tmc-anchor">{s.text}</span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : text ? <p className="whitespace-pre-wrap text-sm text-tmc-anchor">{text}</p> : null}
    </div>
  );
}
