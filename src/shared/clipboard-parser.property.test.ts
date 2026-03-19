import fc from 'fast-check';
import { parseClipboardData } from './clipboard-parser';
import { SessionReport, SignUp, BonusRep } from './types';

// --- Arbitraries ---
// Use grapheme-ascii unit so btoa() works on JSON.stringify output

const ASCII_STRING_OPTS = { minLength: 1, maxLength: 20, unit: 'grapheme-ascii' as const };

const bonusRepArbitrary: fc.Arbitrary<BonusRep> = fc.record({
  faction: fc.string(ASCII_STRING_OPTS),
  reputation: fc.integer({ min: 0, max: 20 }),
});

const signUpArbitrary: fc.Arbitrary<SignUp> = fc.record({
  isGM: fc.boolean(),
  orgPlayNumber: fc.string(ASCII_STRING_OPTS),
  characterNumber: fc.string({ ...ASCII_STRING_OPTS, maxLength: 10 }),
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
    gmOrgPlayNumber: fc.string(ASCII_STRING_OPTS),
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
});
