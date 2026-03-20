import fc from 'fast-check';
import { extractGmSignUp, extractPlayerSignUps } from './signup-utils';
import { SignUp } from './types';

// --- Arbitraries ---

const ASCII_STRING_OPTS = { minLength: 1, maxLength: 20, unit: 'grapheme-ascii' as const };

const playerSignUpArbitrary: fc.Arbitrary<SignUp> = fc.record({
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

// --- Property Tests ---

describe('SignUp Utils Properties', () => {
  /**
   * Feature: paizo-session-report-browser-plugin, Property 9: GM and player partitioning from signUps
   * Validates: Requirements 7.2, 7.3, 7.4, 10.1, 10.2
   */
  describe('Property 9: GM and player partitioning from signUps', () => {
    it('extractGmSignUp returns the entry with isGM === true with correct fields', () => {
      fc.assert(
        fc.property(
          gmSignUpArbitrary,
          fc.uniqueArray(playerSignUpArbitrary, {
            minLength: 0,
            maxLength: 5,
            selector: (s) => s.orgPlayNumber,
          }),
          fc.integer({ min: 0, max: 5 }),
          (gm, players, insertIndex) => {
            const clampedIndex = Math.min(insertIndex, players.length);
            const signUps = [
              ...players.slice(0, clampedIndex),
              gm,
              ...players.slice(clampedIndex),
            ];

            const result = extractGmSignUp(signUps);

            expect(result).toBe(gm);
            expect(result?.isGM).toBe(true);
            expect(result?.characterNumber).toBe(gm.characterNumber);
            expect(result?.faction).toBe(gm.faction);
            expect(result?.repEarned).toBe(gm.repEarned);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('extractPlayerSignUps returns all entries with isGM === false in original order', () => {
      fc.assert(
        fc.property(
          gmSignUpArbitrary,
          fc.uniqueArray(playerSignUpArbitrary, {
            minLength: 1,
            maxLength: 5,
            selector: (s) => s.orgPlayNumber,
          }),
          fc.integer({ min: 0, max: 5 }),
          (gm, players, insertIndex) => {
            const clampedIndex = Math.min(insertIndex, players.length);
            const signUps = [
              ...players.slice(0, clampedIndex),
              gm,
              ...players.slice(clampedIndex),
            ];

            const result = extractPlayerSignUps(signUps);

            expect(result).toEqual(players);
            expect(result).toHaveLength(players.length);
            result.forEach((entry) => {
              expect(entry.isGM).toBe(false);
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('extractGmSignUp returns null when no GM entry exists', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(playerSignUpArbitrary, {
            minLength: 1,
            maxLength: 6,
            selector: (s) => s.orgPlayNumber,
          }),
          (players) => {
            const result = extractGmSignUp(players);
            expect(result).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('extractPlayerSignUps returns empty array when all entries are GM', () => {
      fc.assert(
        fc.property(gmSignUpArbitrary, (gm) => {
          const result = extractPlayerSignUps([gm]);
          expect(result).toEqual([]);
        }),
        { numRuns: 100 },
      );
    });
  });
});
