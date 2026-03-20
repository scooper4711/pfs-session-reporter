import fc from 'fast-check';
import { validateSessionReport } from './validation';
import { SessionReport, SignUp, BonusRep } from './types';

// --- Arbitraries ---

const ASCII_STRING_OPTS = { minLength: 1, maxLength: 20, unit: 'grapheme-ascii' as const };

const bonusRepArbitrary: fc.Arbitrary<BonusRep> = fc.record({
  faction: fc.string(ASCII_STRING_OPTS),
  reputation: fc.integer({ min: 0, max: 20 }),
});

const validSignUpArbitrary: fc.Arbitrary<SignUp> = fc.record({
  isGM: fc.constant(false),
  orgPlayNumber: fc.integer({ min: 1, max: 999999 }),
  characterNumber: fc.integer({ min: 1, max: 9999 }),
  characterName: fc.string({ ...ASCII_STRING_OPTS, maxLength: 50 }),
  consumeReplay: fc.boolean(),
  repEarned: fc.integer({ min: 0, max: 20 }),
  faction: fc.string({ ...ASCII_STRING_OPTS, maxLength: 30 }),
});

const gmSignUpArbitrary: fc.Arbitrary<SignUp> = fc.record({
  isGM: fc.constant(true as boolean),
  orgPlayNumber: fc.integer({ min: 1, max: 999999 }),
  characterNumber: fc.integer({ min: 1, max: 9999 }),
  characterName: fc.string({ ...ASCII_STRING_OPTS, maxLength: 50 }),
  consumeReplay: fc.boolean(),
  repEarned: fc.integer({ min: 0, max: 20 }),
  faction: fc.string({ ...ASCII_STRING_OPTS, maxLength: 30 }),
});

function validDateArbitrary(): fc.Arbitrary<string> {
  return fc.tuple(
    fc.integer({ min: 2000, max: 2099 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  ).map(([y, m, d]) =>
    `${String(y)}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
  );
}

/**
 * Build a valid SessionReport with at most one GM entry.
 * Uses fc.boolean() to optionally include a GM signUp,
 * plus at least one player signUp.
 */
function validSessionReportArbitrary(): fc.Arbitrary<SessionReport> {
  return fc.record({
    gameDate: validDateArbitrary(),
    gameSystem: fc.constant('PFS2E' as string),
    generateGmChronicle: fc.boolean(),
    gmOrgPlayNumber: fc.integer({ min: 1, max: 999999 }),
    repEarned: fc.integer({ min: 0, max: 20 }),
    reportingA: fc.boolean(),
    reportingB: fc.boolean(),
    reportingC: fc.boolean(),
    reportingD: fc.boolean(),
    scenario: fc.string({ ...ASCII_STRING_OPTS, maxLength: 50 }),
    signUps: fc.tuple(
      fc.boolean(),
      gmSignUpArbitrary,
      fc.uniqueArray(validSignUpArbitrary, {
        minLength: 1,
        maxLength: 5,
        selector: (s) => s.orgPlayNumber,
      }),
    ).chain(([includeGm, gm, players]) => {
      if (includeGm) {
        // Ensure GM orgPlayNumber is unique among players
        const usedNumbers = new Set(players.map((p) => p.orgPlayNumber));
        if (usedNumbers.has(gm.orgPlayNumber)) {
          return fc.constant([...players] as SignUp[]);
        }
        return fc.constant([gm, ...players] as SignUp[]);
      }
      return fc.constant([...players] as SignUp[]);
    }),
    bonusRepEarned: fc.array(bonusRepArbitrary, { minLength: 0, maxLength: 4 }),
  });
}

// --- Property Tests ---

describe('Validation Properties', () => {
  /**
   * Feature: paizo-session-report-browser-plugin, Property 4: Validation accepts valid SessionReport objects
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
   */
  it('Property 4: validateSessionReport accepts valid SessionReport objects', () => {
    fc.assert(
      fc.property(validSessionReportArbitrary(), (report) => {
        const result = validateSessionReport(report);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: paizo-session-report-browser-plugin, Property 5: Validation rejects SessionReport with missing required fields
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
   */
  describe('Property 5: validateSessionReport rejects invalid SessionReport objects', () => {
    it('rejects missing or empty gameDate', () => {
      fc.assert(
        fc.property(
          validSessionReportArbitrary(),
          fc.constantFrom('', '   ', 'not-a-date', 'abcd-ef-gh'),
          (report, badDate) => {
            const invalid = { ...report, gameDate: badDate };
            const result = validateSessionReport(invalid);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects missing or empty scenario', () => {
      fc.assert(
        fc.property(validSessionReportArbitrary(), (report) => {
          const invalid = { ...report, scenario: '' };
          const result = validateSessionReport(invalid);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    });

    it('rejects missing gmOrgPlayNumber', () => {
      fc.assert(
        fc.property(validSessionReportArbitrary(), (report) => {
          const invalid = { ...report, gmOrgPlayNumber: undefined };
          const result = validateSessionReport(invalid);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    });

    it('rejects unsupported gameSystem', () => {
      fc.assert(
        fc.property(
          validSessionReportArbitrary(),
          fc.constantFrom('PFS1E', 'SFS2E', 'UNKNOWN', ''),
          (report, badSystem) => {
            const invalid = { ...report, gameSystem: badSystem };
            const result = validateSessionReport(invalid);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects empty signUps array', () => {
      fc.assert(
        fc.property(validSessionReportArbitrary(), (report) => {
          const invalid = { ...report, signUps: [] };
          const result = validateSessionReport(invalid);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    });

    it('rejects multiple GM entries', () => {
      fc.assert(
        fc.property(
          validSessionReportArbitrary(),
          gmSignUpArbitrary,
          gmSignUpArbitrary,
          (report, gm1, gm2) => {
            fc.pre(gm1.orgPlayNumber !== gm2.orgPlayNumber);
            const playerSignUps = report.signUps.filter((s) => !s.isGM);
            const invalid = { ...report, signUps: [gm1, gm2, ...playerSignUps] };
            const result = validateSessionReport(invalid);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain(
              'Session report has multiple sign-up entries marked as GM.',
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects signUp with empty required string fields', () => {
      fc.assert(
        fc.property(
          validSessionReportArbitrary(),
          fc.constantFrom('characterName', 'faction'),
          (report, fieldToEmpty) => {
            const signUps = report.signUps.map((s, i) =>
              i === 0 ? { ...s, [fieldToEmpty]: '' } : s,
            );
            const invalid = { ...report, signUps };
            const result = validateSessionReport(invalid);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects signUp with missing numeric fields', () => {
      fc.assert(
        fc.property(
          validSessionReportArbitrary(),
          fc.constantFrom('orgPlayNumber', 'characterNumber'),
          (report, fieldToRemove) => {
            const signUps = report.signUps.map((s, i) =>
              i === 0 ? { ...s, [fieldToRemove]: undefined } : s,
            );
            const invalid = { ...report, signUps };
            const result = validateSessionReport(invalid);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
