import { describe, expect, it } from 'vitest';
import { mapCsvRows } from '@/lib/server/import/mapCsv';

const row = (o: Record<string, string>) => ({ 'School Name': 'A School', Location: 'Whitefield, Bangalore', Tier: 'A1', 'Decision Maker Name': 'P', Position: 'Principal', ...o });

describe('mapCsvRows', () => {
  it('groups contacts under one school and keeps the first row\'s school fields', () => {
    const r = mapCsvRows([row({ Tier: 'A1' }), row({ 'Decision Maker Name': 'Q', Position: 'Trustee', Tier: 'ignored' })]);
    expect(r.schools).toHaveLength(1);
    expect(r.schools[0]!.tier).toBe('A1');
    expect(r.contacts).toHaveLength(2);
  });

  it('merges duplicate contacts (same school, name, position) with the later row winning', () => {
    const r = mapCsvRows([row({ Phone: '1' }), row({ Phone: '2' })]);
    expect(r.contacts).toHaveLength(1);
    expect(r.contacts[0]!.phone).toBe('2');
  });

  it('skips rows without a school name and names unnamed contacts', () => {
    const r = mapCsvRows([row({ 'School Name': '' }), row({ 'Decision Maker Name': '' })]);
    expect(r.skipped).toBe(1);
    expect(r.contacts[0]!.name).toBe('Unknown');
  });
});
