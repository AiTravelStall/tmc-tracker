'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DirectoryUser, Role } from '@/types/domain';
import { MeetingDialog } from './MeetingDialog';

/** Opens the visit dialog for `?visit=<id>`, so any link or row can open it without shared client state. */
export function MeetingDialogFromUrl({ role, userId, salesPeople }: { role: Role; userId: string; salesPeople: DirectoryUser[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = Number(params.get('visit'));
  const close = () => {
    const next = new URLSearchParams(params);
    next.delete('visit');
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  };
  return (
    <MeetingDialog meetingId={Number.isSafeInteger(id) && id > 0 ? id : null} role={role} userId={userId}
      salesPeople={salesPeople} onClose={close} onChanged={() => router.refresh()} />
  );
}
