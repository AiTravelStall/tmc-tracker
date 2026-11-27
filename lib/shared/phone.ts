import { splitPhones } from './format';

/**
 * Comparable key for a phone number: its last 10 digits. Indian mobiles and landlines
 * (with or without +91 / leading 0) and the E.164 numbers Salestrail sends all reduce to
 * the same key. Numbers with fewer than 10 digits can't be matched reliably → null.
 */
export function phoneKey(raw?: string | null): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
}

/** Keys for every number in a free-text field like "+91 80 1234 5678; 99887 76655". */
export function phoneKeys(field?: string | null): string[] {
  return [...new Set(splitPhones(field).map(phoneKey).filter((k): k is string => k !== null))];
}
