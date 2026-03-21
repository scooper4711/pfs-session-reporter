import { SessionReport } from './types';

export type EncodingType = 'utf-16le' | 'utf-8';

const DEFAULT_MAX_SAMPLE_BYTES = 64;

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
 * Detect whether atob() output bytes represent UTF-16LE or UTF-8 text.
 *
 * Uses the Null_Byte_Heuristic: UTF-16LE encoded ASCII text has 0x00
 * at every odd byte position. Samples up to maxSampleBytes odd positions
 * to avoid scanning very large payloads.
 *
 * Returns 'utf-8' for empty strings, odd-length strings, or when any
 * sampled odd-indexed byte is non-zero.
 */
export function detectEncoding(
  binaryString: string,
  maxSampleBytes: number = DEFAULT_MAX_SAMPLE_BYTES
): EncodingType {
  if (binaryString.length === 0 || binaryString.length % 2 !== 0) {
    return 'utf-8';
  }

  const samplesToCheck = Math.min(maxSampleBytes, Math.floor(binaryString.length / 2));

  for (let i = 0; i < samplesToCheck; i++) {
    const oddIndex = 2 * i + 1;
    if ((binaryString.codePointAt(oddIndex) ?? -1) !== 0x00) {
      return 'utf-8';
    }
  }

  return 'utf-16le';
}

/**
 * Interpret atob() output bytes as UTF-16LE pairs and return the
 * decoded string.
 *
 * Reads bytes in pairs: character = lowByte + (highByte << 8).
 * Silently ignores a trailing byte if the input has odd length.
 */
export function decodeUtf16Le(binaryString: string): string {
  const pairCount = Math.floor(binaryString.length / 2);
  const characters: string[] = [];

  for (let i = 0; i < pairCount; i++) {
    const lowByte = binaryString.codePointAt(2 * i) ?? 0;
    const highByte = binaryString.codePointAt(2 * i + 1) ?? 0;
    characters.push(String.fromCodePoint(lowByte + (highByte << 8)));
  }

  return characters.join('');
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
    const encoding = detectEncoding(decoded);
    const text = encoding === 'utf-16le'
      ? decodeUtf16Le(decoded)
      : decoded;
    return tryParseJson(text);
  }

  return null;
}
