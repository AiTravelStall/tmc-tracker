import type { ReactNode } from 'react';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-tmc-navy bg-[radial-gradient(ellipse_at_top_right,rgb(26_175_224/0.28),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgb(26_175_224/0.12),transparent_50%)] p-4">
      <div className="w-full max-w-md rounded-card bg-tmc-white p-7 shadow-overlay sm:p-9">
        <div className="mb-6 flex items-center gap-2.5">
          <span aria-hidden className="grid size-10 place-items-center rounded-control bg-tmc-navy font-display text-2xl text-tmc-cyan">T</span>
          <span className="font-display text-2xl tracking-wide text-tmc-navy">TMC Tracker</span>
        </div>
        <h1 className="font-display text-display text-tmc-navy">{title}</h1>
        {subtitle && <p className="mt-1.5 mb-7 text-[15px] text-tmc-slate">{subtitle}</p>}
        {children}
      </div>
    </main>
  );
}
