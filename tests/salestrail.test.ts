import { describe, expect, it } from 'vitest';
import { phoneKey, phoneKeys } from '@/lib/shared/phone';
import { callRows, parseCall } from '@/lib/server/salestrail/parse';
import { fmtDuration } from '@/lib/shared/format';

// The documented Push API payload (salestrail.io/knowledge-base/push-api-integration).
const PUSH_EXAMPLE = {
  userId: '11111111-user-id22-3333-444444444444', userName: 'Test Man', userEmail: 'Test.Man@mail.com',
  userPhone: '+49501234567', callId: '12121212-2323-3434-4545-123412341234', source: 'android', sourceDetail: 'SIM',
  startTime: '2021-10-08T10:05:37Z', duration: 300, answered: true, inbound: true,
  number: '+358401234567', formattedNumber: '+358401234567', createdAt: '2021-10-08T10:08:16.316843Z',
};

describe('phoneKey', () => {
  it('reduces Indian formats and E.164 to the same last-10-digit key', () => {
    for (const p of ['+91 73388 56789', '+91 - 7338856789', '07338856789', '7338856789', '+917338856789']) {
      expect(phoneKey(p)).toBe('7338856789');
    }
    expect(phoneKey('+91 11 4777 0777')).toBe(phoneKey('+911147770777'));
  });
  it('rejects numbers too short to match safely', () => {
    expect(phoneKey('12345')).toBeNull();
    expect(phoneKey('')).toBeNull();
  });
  it('splits multi-number fields', () => {
    expect(phoneKeys('+91 80 2345 6789; 98450 12345 / 98450 12345')).toEqual(['8023456789', '9845012345']);
  });
});

describe('parseCall', () => {
  it('reads the documented Push API payload', () => {
    expect(parseCall(PUSH_EXAMPLE)).toEqual({
      id: '12121212-2323-3434-4545-123412341234', userEmail: 'test.man@mail.com', userName: 'Test Man',
      number: '+358401234567', inbound: true, answered: true, startedAt: '2021-10-08T10:05:37.000Z',
      durationSeconds: 300, source: 'android · SIM', createdAt: '2021-10-08T10:08:16.316Z',
    });
  });
  it('accepts common field-name variants', () => {
    const c = parseCall({ id: '12121212-2323-3434-4545-123412341234', start_time: '2026-11-27T05:00:00Z', direction: 'OUTBOUND', phoneNumber: '+919845012345' });
    expect(c).toMatchObject({ inbound: false, number: '+919845012345', answered: false, durationSeconds: 0 });
  });
  it('rejects rows without a call id or start time', () => {
    expect(parseCall({ ...PUSH_EXAMPLE, callId: 'not-a-uuid' })).toBeNull();
    expect(parseCall({ ...PUSH_EXAMPLE, startTime: undefined })).toBeNull();
  });
  it('finds the rows in bare or wrapped responses', () => {
    expect(callRows([PUSH_EXAMPLE])).toHaveLength(1);
    expect(callRows({ calls: [PUSH_EXAMPLE] })).toHaveLength(1);
    expect(callRows({ nothing: true })).toEqual([]);
  });
});

describe('fmtDuration', () => {
  it('formats seconds as m:ss or h:mm:ss', () => {
    expect(fmtDuration(0)).toBe('0:00');
    expect(fmtDuration(75)).toBe('1:15');
    expect(fmtDuration(3725)).toBe('1:02:05');
  });
});
