import { describe, expect, it } from 'vitest';
import { asUrl, isMissing, splitEmails, splitPhones, telHref } from '@/lib/shared/format';

describe('research-sheet value parsing', () => {
  it('treats placeholder phrases as missing', () => {
    for (const v of ['Not found', 'Not publicly available', 'No LinkedIn URL found', 'N/A', '', '-']) expect(isMissing(v)).toBe(true);
    expect(isMissing('+91 80 4876 7722')).toBe(false);
  });

  it('splits multi-number phone cells', () => {
    expect(splitPhones('080 26323953; 080 26323966; 93411 22554')).toEqual(['080 26323953', '080 26323966', '93411 22554']);
    expect(splitPhones('+91 80954 32322 / +91 78294 32322')).toEqual(['+91 80954 32322', '+91 78294 32322']);
    expect(splitPhones('Not found')).toEqual([]);
    expect(telHref('+91 - 8971738606')).toBe('tel:+918971738606');
  });

  it('extracts emails and urls', () => {
    expect(splitEmails('enquiry@a.com; chairman@a.com')).toEqual(['enquiry@a.com', 'chairman@a.com']);
    expect(asUrl('www.stonehill.in')).toBe('https://www.stonehill.in');
    expect(asUrl('Not found')).toBeNull();
  });
});
