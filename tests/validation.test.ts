import { describe, expect, it } from 'vitest';
import { logCallSchema, meetingUpdateSchema, schoolFiltersSchema } from '@/lib/shared/validation';

const clientId = '7b0d7c1e-8d5f-4b0a-9a51-0f3f0c1d2e3f';

describe('logCallSchema', () => {
  it('requires a follow-up date for "call back later"', () => {
    const r = logCallSchema.safeParse({ clientId, outcome: 'follow_up' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('Set a follow-up date');
  });

  it('requires visit details for a booked visit', () => {
    expect(logCallSchema.safeParse({ clientId, outcome: 'meeting_scheduled' }).success).toBe(false);
    const ok = logCallSchema.safeParse({
      clientId, outcome: 'meeting_scheduled',
      meeting: { salesUserId: clientId, startAt: '2026-11-25T05:30:00.000Z', durationMin: 60 },
    });
    expect(ok.success).toBe(true);
  });

  it('rejects unknown outcomes and over-long notes', () => {
    expect(logCallSchema.safeParse({ clientId, outcome: 'maybe' }).success).toBe(false);
    expect(logCallSchema.safeParse({ clientId, outcome: 'not_reachable', notes: 'x'.repeat(4001) }).success).toBe(false);
  });
});

describe('meetingUpdateSchema', () => {
  it('needs an outcome to complete a visit', () => {
    expect(meetingUpdateSchema.safeParse({ action: 'complete' }).success).toBe(false);
    expect(meetingUpdateSchema.safeParse({ action: 'complete', outcome: 'converted' }).success).toBe(true);
  });
});

describe('schoolFiltersSchema', () => {
  it('defaults the page and rejects bad assignee ids', () => {
    expect(schoolFiltersSchema.parse({}).page).toBe(1);
    expect(schoolFiltersSchema.safeParse({ assigned: 'robert' }).success).toBe(false);
    expect(schoolFiltersSchema.safeParse({ assigned: 'me' }).success).toBe(true);
  });
});
