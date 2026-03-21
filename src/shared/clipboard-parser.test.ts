import {
  detectEncoding,
  decodeUtf16Le,
  parseClipboardData,
} from './clipboard-parser';
import { SessionReport } from './types';

// --- Test Helpers ---

/**
 * Encode a string as UTF-16LE bytes and return the base64 representation.
 * Mirrors the encoding logic from pfs-chronicle-generator's
 * session-report-serializer to avoid a cross-workspace import.
 */
function encodeUtf16LeBase64(text: string): string {
  const bytes = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    const codePoint = text.codePointAt(i) ?? 0;
    bytes[i * 2] = codePoint & 0xFF;
    bytes[i * 2 + 1] = codePoint >> 8;
  }
  const binaryString = Array.from(bytes, (byte) =>
    String.fromCodePoint(byte),
  ).join('');
  return btoa(binaryString);
}

// --- Test Fixtures ---

const SAMPLE_JSON = '{"a":1}';

const SAMPLE_SESSION_REPORT: SessionReport = {
  gameDate: '2024-06-15',
  gameSystem: 'PFS2E',
  generateGmChronicle: true,
  gmOrgPlayNumber: 123456,
  repEarned: 4,
  reportingA: true,
  reportingB: false,
  reportingC: false,
  reportingD: false,
  scenario: 'Test Scenario',
  signUps: [
    {
      isGM: false,
      orgPlayNumber: 654321,
      characterNumber: 2001,
      characterName: 'Test Character',
      consumeReplay: false,
      repEarned: 4,
      faction: 'Horizon Hunters',
    },
  ],
  bonusRepEarned: [],
};

/**
 * Helper: encode a string as UTF-16LE base64 and return the atob() output.
 * This simulates what the clipboard parser receives after base64 decoding
 * a UTF-16LE payload from the chronicle generator.
 */
function encodeToUtf16LeBinaryString(text: string): string {
  return atob(encodeUtf16LeBase64(text));
}

// --- detectEncoding ---

describe('detectEncoding', () => {
  it('returns utf-8 for an empty string', () => {
    expect(detectEncoding('')).toBe('utf-8');
  });

  it('returns utf-16le for a known UTF-16LE binary string', () => {
    const binaryString = encodeToUtf16LeBinaryString(SAMPLE_JSON);
    expect(detectEncoding(binaryString)).toBe('utf-16le');
  });

  it('returns utf-8 for a known UTF-8 binary string', () => {
    const binaryString = atob(btoa(SAMPLE_JSON));
    expect(detectEncoding(binaryString)).toBe('utf-8');
  });

  it('returns utf-8 for an odd-length binary string', () => {
    const oddLengthString = 'abc';
    expect(oddLengthString.length % 2).toBe(1);
    expect(detectEncoding(oddLengthString)).toBe('utf-8');
  });
});

// --- decodeUtf16Le ---

describe('decodeUtf16Le', () => {
  it('decodes a known UTF-16LE binary string to the original text', () => {
    const binaryString = encodeToUtf16LeBinaryString(SAMPLE_JSON);
    expect(decodeUtf16Le(binaryString)).toBe(SAMPLE_JSON);
  });

  it('ignores a trailing byte on odd-length input without error', () => {
    const binaryString = encodeToUtf16LeBinaryString('AB');
    const oddInput = binaryString + 'X';

    expect(oddInput.length % 2).toBe(1);
    expect(decodeUtf16Le(oddInput)).toBe('AB');
  });
});

// --- parseClipboardData ---

describe('parseClipboardData', () => {
  it('parses a UTF-16LE base64 payload into a SessionReport', () => {
    const payload = encodeUtf16LeBase64(JSON.stringify(SAMPLE_SESSION_REPORT));
    const result = parseClipboardData(payload);
    expect(result).toEqual(SAMPLE_SESSION_REPORT);
  });

  it('parses a UTF-8 base64 payload into a SessionReport (regression)', () => {
    const payload = btoa(JSON.stringify(SAMPLE_SESSION_REPORT));
    const result = parseClipboardData(payload);
    expect(result).toEqual(SAMPLE_SESSION_REPORT);
  });

  it('parses raw JSON into a SessionReport (regression)', () => {
    const payload = JSON.stringify(SAMPLE_SESSION_REPORT);
    const result = parseClipboardData(payload);
    expect(result).toEqual(SAMPLE_SESSION_REPORT);
  });

  it('returns null for garbage input (regression)', () => {
    expect(parseClipboardData('not-json-not-base64!@#$')).toBeNull();
  });
});
