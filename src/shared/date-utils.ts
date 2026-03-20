/**
 * Extracts the date portion (YYYY-MM-DD) from an ISO 8601 date string,
 * discarding any time and timezone suffix.
 *
 * @param isoDate - ISO 8601 date string (e.g., "2026-01-25" or "2026-01-25T12:30:00+00:00")
 * @returns The first 10 characters representing YYYY-MM-DD
 */
export function extractDatePortion(isoDate: string): string {
  return isoDate.slice(0, 10);
}

/**
 * Converts an ISO 8601 date string to the Paizo form date format (MM/DD/YYYY).
 * Handles dates with or without time/timezone suffixes.
 *
 * @param isoDate - ISO 8601 date string (e.g., "2026-01-25" or "2026-01-25T12:30:00+00:00")
 * @returns Date in MM/DD/YYYY format (e.g., "01/25/2026")
 */
export function convertToFormDate(isoDate: string): string {
  const datePortion = extractDatePortion(isoDate);
  const [year, month, day] = datePortion.split('-');
  return `${month}/${day}/${year}`;
}
