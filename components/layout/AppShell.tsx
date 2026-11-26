'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { cn } from '@/lib/shared/cn';
import { ROLE_LABEL } from '@/lib/shared/labels';
import { api } from '@/lib/shared/apiClient';
import type { Role } from '@/types/domain';
import { ToastProvider } from '@/components/ui/Toast';
import { NAV } from './nav';
import { Reminders, useReminderBadge } from './Reminders';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

export function AppShell({ user, children }: { user: { fullName: string; role: Role }; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { badge, reminders } = useReminderBadge();

  const signOut = async () => {
    await api.post('/auth/logout').catch(() => {});
    router.replace('/login');
    router.refresh();
  };

  const items = NAV[user.role];
  const link = (item: (typeof items)[number]) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined}
        className={cn('group flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium no-underline transition-colors hover:no-underline',
          active ? 'bg-tmc-white text-tmc-navy shadow-[0_1px_2px_rgb(0_0_0/0.2)]' : 'text-tmc-white/70 hover:bg-tmc-white/8 hover:text-tmc-white')}>
        <Icon aria-hidden className={cn('size-[18px] shrink-0', active ? 'text-tmc-cyan-deep' : 'text-tmc-white/55 group-hover:text-tmc-cyan')} />
        <span className="truncate">{item.label}</span>
        {item.badge && badge > 0 && (
          <span className="ml-auto min-w-6 rounded-full bg-tmc-error px-1.5 py-0.5 text-center text-[11px] font-bold leading-4 text-tmc-white tabular-nums">
            {badge}<span className="sr-only"> due</span>
          </span>
        )}
      </Link>
    );
  };
  const main = items.filter((i) => !i.group);
  const admin = items.filter((i) => i.group === 'admin');

  return (
    <ToastProvider>
      <a href="#main" className="sr-only z-50 rounded-control bg-tmc-white px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to main content
      </a>
      <div className="flex min-h-dvh">
        <aside aria-label="Sidebar" className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-tmc-navy px-3 pt-5 pb-3 transition-transform duration-200 h-dvh overscroll-contain lg:translate-x-0 lg:transition-none',
          open ? 'translate-x-0 shadow-overlay' : '-translate-x-full',
        )}>
          <div className="mb-7 flex items-center justify-between px-2">
            <Link href="/" className="flex items-center gap-2.5 text-tmc-white no-underline hover:no-underline">
              <span aria-hidden className="grid size-9 place-items-center rounded-control bg-tmc-cyan font-display text-xl text-tmc-navy">T</span>
              <span className="leading-none">
                <span className="block font-display text-[22px] tracking-wide">TMC Tracker</span>
                <span className="block text-[11px] font-medium tracking-wide text-tmc-white/50">School outreach</span>
              </span>
            </Link>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="grid size-10 place-items-center rounded-control text-tmc-white/70 hover:bg-tmc-white/10 lg:hidden">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {main.map(link)}
            {admin.length > 0 && (
              <>
                <p className="mt-6 mb-1.5 px-3 text-[11px] font-semibold tracking-[0.08em] text-tmc-white/40 uppercase">Admin</p>
                {admin.map(link)}
              </>
            )}
          </nav>
          <div className="mt-4 flex items-center gap-1 rounded-control bg-tmc-navy-soft p-1.5">
            <Link href="/account" onClick={() => setOpen(false)} aria-current={pathname === '/account' ? 'page' : undefined}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[8px] px-1.5 py-1.5 text-tmc-white no-underline hover:bg-tmc-white/8 hover:no-underline">
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-tmc-cyan/20 text-sm font-semibold text-tmc-cyan">{initials(user.fullName)}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold leading-tight">{user.fullName}</span>
                <span className="block text-xs text-tmc-white/55">{ROLE_LABEL[user.role]}</span>
              </span>
            </Link>
            <button type="button" onClick={signOut} aria-label="Sign out" className="grid size-10 shrink-0 place-items-center rounded-[8px] text-tmc-white/60 hover:bg-tmc-white/8 hover:text-tmc-white">
              <LogOut aria-hidden className="size-[18px]" />
            </button>
          </div>
        </aside>
        {open && <div aria-hidden className="fixed inset-0 z-30 bg-tmc-navy/40 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)} />}

        <div className="min-w-0 flex-1 lg:pl-64">
          <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-tmc-border bg-tmc-white/90 px-3 py-2 backdrop-blur lg:hidden">
            <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}
              className="grid size-11 place-items-center rounded-control text-tmc-navy hover:bg-tmc-subtle"><Menu aria-hidden className="size-5" /></button>
            <span className="font-display text-xl text-tmc-navy">TMC Tracker</span>
            {badge > 0 && <span className="ml-auto rounded-full bg-tmc-error-wash px-2.5 py-1 text-xs font-bold text-tmc-error-ink">{badge} due</span>}
          </div>
          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1360px] px-4 py-6 outline-none sm:px-6 lg:px-10 lg:py-9">
            {children}
          </main>
        </div>
      </div>
      <Reminders reminders={reminders} />
    </ToastProvider>
  );
}
