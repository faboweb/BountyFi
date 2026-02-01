/**
 * Safe date parsing and formatting to avoid RangeError: Date value out of bounds
 * when API returns null, invalid, or out-of-range date strings.
 */

const FALLBACK = '—';

/**
 * Parse an ISO or date string into a Date. Returns null if invalid or out of bounds.
 */
export function safeParseDate(value: string | null | undefined): Date | null {
  if (value == null || typeof value !== 'string' || value.trim() === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  // Avoid out-of-range years that can throw in toLocaleDateString
  const y = d.getFullYear();
  if (y < 1 || y > 275760) return null;
  return d;
}

/**
 * Format a date string for display. Never throws; returns fallback for invalid/out-of-bounds values.
 */
export function safeFormatDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'short' }
): string {
  const d = safeParseDate(value);
  if (!d) return FALLBACK;
  try {
    return d.toLocaleDateString(undefined, options);
  } catch {
    return FALLBACK;
  }
}

/**
 * Check if two date strings are the same calendar day. Safe for invalid dates (returns false).
 */
export function isSameCalendarDay(iso1: string | null | undefined, iso2: string | null | undefined): boolean {
  const d1 = safeParseDate(iso1);
  const d2 = safeParseDate(iso2);
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
