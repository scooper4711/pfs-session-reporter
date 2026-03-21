import fc from 'fast-check';
import { parseClipboardData, detectEncoding, decodeUtf16Le } from './clipboard-parser';
import { SessionReport, SignUp, BonusRep } from './types';

// --- Local test helpers ---
// Mirrors encoding logic from pfs-chronicle-generator to avoid cross-workspace imports.

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

function serializeSessionReport(
  report: SessionReport,
  skipBase64?: boolean,
): string {
  const json = JSON.stringify(report);
  if (skipBase64) {
    return json;
  }
  return encodeUtf16LeBase64(json);
}

// --- Arbitraries ---
// Use grapheme-ascii unit so btoa() works on JSON.stringify output

const ASCII_STRING_OPTS = { minLength: 1, maxLength: 20, unit: 'grapheme-ascii' as const };

const bonusRepArbitrary: fc.Arbitrary<BonusRep> = fc.record({
  faction: fc.string(ASCII_STRING_OPTS),
  reputation: fc.integer({ min: 0, max: 20 }),
});

const signUpArbitrary: fc.Arbitrary<SignUp> = fc.record({
  isGM: fc.boolean(),
  orgPlayNumber: fc.integer({ min: 1, max: 999999 }),
  characterNumber: fc.integer({ min: 1, max: 9999 }),
  characterName: fc.string({ ...ASCII_STRING_OPTS, maxLength: 50 }),
  consumeReplay: fc.boolean(),
  repEarned: fc.integer({ min: 0, max: 20 }),
  faction: fc.string({ ...ASCII_STRING_OPTS, maxLength: 30 }),
});

function buildSessionReportArbitrary(): fc.Arbitrary<SessionReport> {
  return fc.record({
    gameDate: fc.tuple(
      fc.integer({ min: 2000, max: 2099 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
    ).map(([y, m, d]) =>
      `${String(y)}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    ),
    gameSystem: fc.constant('PFS2E' as string),
    generateGmChronicle: fc.boolean(),
    gmOrgPlayNumber: fc.integer({ min: 1, max: 999999 }),
    repEarned: fc.integer({ min: 0, max: 20 }),
    reportingA: fc.boolean(),
    reportingB: fc.boolean(),
    reportingC: fc.boolean(),
    reportingD: fc.boolean(),
    scenario: fc.string({ ...ASCII_STRING_OPTS, maxLength: 50 }),
    signUps: fc.uniqueArray(signUpArbitrary, {
      minLength: 1,
      maxLength: 6,
      selector: (s) => s.orgPlayNumber,
    }),
    bonusRepEarned: fc.array(bonusRepArbitrary, { minLength: 0, maxLength: 4 }),
  });
}

const sessionReportArbitrary = buildSessionReportArbitrary();

// --- Property Tests ---

describe('Clipboard Parser Properties', () => {
  /**
   * Feature: paizo-session-report-browser-plugin, Property 1: Clipboard data round-trip
   * Validates: Requirements 2.6
   */
  it('Property 1: round-trip through base64 encoding preserves SessionReport', () => {
    fc.assert(
      fc.property(sessionReportArbitrary, (report) => {
        const json = JSON.stringify(report);
        const base64 = btoa(json);
        const result = parseClipboardData(base64);
        expect(result).toEqual(report);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: paizo-session-report-browser-plugin, Property 2: Clipboard parser accepts both raw JSON and base64
   * Validates: Requirements 2.2, 2.3
   */
  it('Property 2: parseClipboardData accepts both raw JSON and base64', () => {
    fc.assert(
      fc.property(sessionReportArbitrary, (report) => {
        const json = JSON.stringify(report);
        const base64 = btoa(json);

        const fromRawJson = parseClipboardData(json);
        const fromBase64 = parseClipboardData(base64);

        expect(fromRawJson).toEqual(report);
        expect(fromBase64).toEqual(report);
        expect(fromRawJson).toEqual(fromBase64);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: paizo-session-report-browser-plugin, Property 3: Invalid clipboard data rejection
   * Validates: Requirements 2.4
   */
  it('Property 3: parseClipboardData returns null for invalid data', () => {
    const invalidChars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'.split('');
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200, unit: fc.constantFrom(...invalidChars) }),
        (randomString: string) => {
          // Skip inputs that happen to be valid JSON objects
          let isValidJsonObject = false;
          try {
            const parsed = JSON.parse(randomString);
            if (typeof parsed === 'object' && parsed !== null) {
              isValidJsonObject = true;
            }
          } catch {
            // not valid JSON
          }

          // Skip inputs that happen to be valid base64 decoding to JSON objects
          let isValidBase64JsonObject = false;
          try {
            const decoded = atob(randomString);
            const parsed = JSON.parse(decoded);
            if (typeof parsed === 'object' && parsed !== null) {
              isValidBase64JsonObject = true;
            }
          } catch {
            // not valid base64-encoded JSON
          }

          fc.pre(!isValidJsonObject && !isValidBase64JsonObject);

          const result = parseClipboardData(randomString);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: utf16le-clipboard-encoding, Property 1: UTF-16LE Encoding Detection
   * Validates: Requirements 1.2, 6.4
   */
  it('Property 1: detectEncoding returns utf-16le for UTF-16LE base64 payloads', () => {
    fc.assert(
      fc.property(sessionReportArbitrary, (report) => {
        const base64Payload = serializeSessionReport(report, false);
        const binaryString = atob(base64Payload);
        expect(detectEncoding(binaryString)).toBe('utf-16le');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: utf16le-clipboard-encoding, Property 2: UTF-8 Encoding Detection
   * Validates: Requirements 1.3, 1.4, 6.5
   */
  it('Property 2: detectEncoding returns utf-8 for UTF-8 base64 payloads', () => {
    const asciiFieldArbitrary = fc.string({
      minLength: 1,
      maxLength: 30,
      unit: 'grapheme-ascii' as const,
    });

    const asciiJsonObjectArbitrary = fc.record({
      name: asciiFieldArbitrary,
      value: asciiFieldArbitrary,
      count: fc.integer({ min: 0, max: 9999 }),
    });

    fc.assert(
      fc.property(asciiJsonObjectArbitrary, (obj) => {
        const json = JSON.stringify(obj);
        const base64 = btoa(json);
        const binaryString = atob(base64);
        expect(detectEncoding(binaryString)).toBe('utf-8');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: utf16le-clipboard-encoding, Property 3: UTF-16LE Decode Round-Trip
   * Validates: Requirements 2.2, 5.2, 5.4
   */
  it('Property 3: encodeUtf16LeBase64 then decodeUtf16Le round-trips to original string', () => {
    const asciiStringArbitrary = fc.string({
      minLength: 0,
      maxLength: 200,
      unit: 'grapheme-ascii' as const,
    });

    fc.assert(
      fc.property(asciiStringArbitrary, (original) => {
        const base64Encoded = encodeUtf16LeBase64(original);
        const binaryString = atob(base64Encoded);
        const decoded = decodeUtf16Le(binaryString);
        expect(decoded).toBe(original);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: utf16le-clipboard-encoding, Property 4: UTF-16LE End-to-End Round-Trip
   * Validates: Requirements 6.1
   */
  it('Property 4: serializeSessionReport UTF-16LE then parseClipboardData round-trips to original', () => {
    fc.assert(
      fc.property(sessionReportArbitrary, (report) => {
        const base64Payload = serializeSessionReport(report, false);
        const result = parseClipboardData(base64Payload);
        expect(result).toEqual(report);
      }),
      { numRuns: 100 },
    );
  });
});
