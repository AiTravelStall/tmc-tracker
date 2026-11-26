import { describe, expect, it } from 'vitest';
import { AppError, fromDbError } from '@/lib/server/errors';

describe('fromDbError', () => {
  it('maps our SQLSTATEs to the API envelope and keeps their message', () => {
    const e = fromDbError({ code: 'TM409', message: 'Ravi already has a visit at that time', details: '[{"id":1}]' });
    expect(e.code).toBe('CONFLICT');
    expect(e.status).toBe(409);
    expect(e.toJSON()).toEqual({ code: 'CONFLICT', message: 'Ravi already has a visit at that time', details: [{ id: 1 }] });
  });

  it('never leaks raw database messages', () => {
    const e = fromDbError({ code: 'XX000', message: 'relation "secret_table" does not exist' });
    expect(e.code).toBe('DB_ERROR');
    expect(e.message).not.toContain('secret_table');
  });

  it('maps privilege errors to FORBIDDEN', () => {
    expect(fromDbError({ code: '42501', message: 'permission denied' }).status).toBe(403);
    expect(new AppError('RATE_LIMITED', 'x').status).toBe(429);
  });
});
