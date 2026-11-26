import { describe, expect, it } from 'vitest';
import { dayBounds, fromZonedInput, slotInDays, toZonedInput, zonedToUtc } from '@/lib/shared/time';

const IST = 'Asia/Kolkata';

describe('time (business timezone)', () => {
  it('converts IST wall-clock to UTC and back', () => {
    expect(fromZonedInput('2026-11-25T11:00', IST)).toBe('2026-11-25T05:30:00.000Z');
    expect(toZonedInput('2026-11-25T05:30:00.000Z', IST)).toBe('2026-11-25T11:00');
  });

  it('handles DST zones', () => {
    // 02:30 on 2026-03-08 does not exist in New York; 12:00 the day after is EDT (UTC-4).
    expect(zonedToUtc(2026, 3, 9, 12, 0, 'America/New_York').toISOString()).toBe('2026-03-09T16:00:00.000Z');
  });

  it('computes the business day containing an instant', () => {
    // 20:00 UTC on 24 Nov is 01:30 on 25 Nov in IST.
    const { start, end } = dayBounds(new Date('2026-11-24T20:00:00Z'), IST);
    expect(start).toBe('2026-11-24T18:30:00.000Z');
    expect(end).toBe('2026-11-25T18:30:00.000Z');
  });

  it('skips Sundays for quick slots', () => {
    // Saturday 28 Nov 2026 + 1 day = Sunday → Monday 30 Nov.
    expect(slotInDays(1, 11, new Date('2026-11-28T06:00:00Z'), IST)).toBe('2026-11-30T11:00');
    expect(slotInDays(2, 15, new Date('2026-11-24T06:00:00Z'), IST)).toBe('2026-11-26T15:00');
  });
});
