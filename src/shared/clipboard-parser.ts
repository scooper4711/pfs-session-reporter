import { SessionReport } from './types';

/**
 * Attempt to parse a string as JSON and return a SessionReport.
 * Returns null if parsing fails or the result is not an object.
 */
export function tryParseJson(data: string): SessionReport | null {
  try {
    const parsed: unknown = JSON.parse(data);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as SessionReport;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Attempt to base64-decode a string.
 * Returns the decoded string, or null if decoding fails.
 */
export function tryBase64Decode(data: string): string | null {
  try {
    const decoded = atob(data);
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Parse clipboard data as a SessionReport.
 * Tries raw JSON first; on failure, tries base64 decode then JSON parse.
 * Returns the parsed SessionReport or null on failure.
 */
export function parseClipboardData(data: string): SessionReport | null {
  const fromJson = tryParseJson(data);
  if (fromJson) {
    return fromJson;
  }

  const decoded = tryBase64Decode(data);
  if (decoded) {
    return tryParseJson(decoded);
  }

  return null;
}
