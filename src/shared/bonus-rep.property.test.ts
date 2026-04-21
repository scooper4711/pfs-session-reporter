import fc from 'fast-check';
import { findMatchingCheckbox, parsePrestigeValue, processBonusReputation, type CheckboxData } from './bonus-rep';
import type { BonusRep } from './types';

// --- Helpers ---

const SAFE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '.split('');

function createCheckboxData(title: string, identifier?: string): CheckboxData {
  return {
    title,
    prestigeLabelText: '(2 prestige)',
    identifier: identifier ?? `checkbox-${title}`,
  };
}

// --- Arbitraries ---

/** Generates a non-empty faction name string using safe characters. */
function factionNameArbitrary(): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength: 30, unit: fc.constantFrom(...SAFE_CHARS) });
}

/** Generates a decoy title guaranteed to differ from the target (case-insensitive). */
function decoyTitleArbitrary(targetLower: string): fc.Arbitrary<string> {
  return factionNameArbitrary().filter(
    (decoy) => decoy.toLowerCase() !== targetLower,
  );
}

/**
 * Applies a random casing transformation to a string.
 * Returns one of: all uppercase, all lowercase, or a per-character random mix.
 */
function randomCasingArbitrary(base: string): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant(base.toUpperCase()),
    fc.constant(base.toLowerCase()),
    fc.array(fc.boolean(), { minLength: base.length, maxLength: base.length }).map(
      (flags) => base.split('').map((ch, i) => (flags[i] ? ch.toUpperCase() : ch.toLowerCase())).join(''),
    ),
  );
}

// --- Property Tests ---

describe('Bonus Rep Properties', () => {
  /**
   * Feature: extra-reputation-reporting, Property 1: Case-insensitive faction matching finds correct checkbox
   * Validates: Requirements 2.1, 2.2
   */
  it('Property 1: Case-insensitive faction matching finds correct checkbox', () => {
    fc.assert(
      fc.property(
        factionNameArbitrary().chain((faction) =>
          fc.tuple(
            fc.constant(faction),
            randomCasingArbitrary(faction),
            fc.array(decoyTitleArbitrary(faction.toLowerCase()), { minLength: 0, maxLength: 5 }),
            fc.nat({ max: 10 }),
          ),
        ),
        ([faction, casedVariation, decoyTitles, insertIndex]) => {
          const decoyCheckboxes = decoyTitles.map((title) => createCheckboxData(title));
          const matchingCheckbox = createCheckboxData(casedVariation, `match-${casedVariation}`);

          // Insert the matching checkbox at a bounded position among decoys
          const position = insertIndex % (decoyCheckboxes.length + 1);
          const checkboxes = [
            ...decoyCheckboxes.slice(0, position),
            matchingCheckbox,
            ...decoyCheckboxes.slice(position),
          ];

          const result = findMatchingCheckbox(faction, checkboxes);

          expect(result).not.toBeNull();
          expect(result!.title).toBe(casedVariation);
          expect(result!.identifier).toBe(matchingCheckbox.identifier);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: extra-reputation-reporting, Property 2: Unmatched faction returns null
   * Validates: Requirements 2.5
   */
  it('Property 2: Unmatched faction returns null', () => {
    fc.assert(
      fc.property(
        factionNameArbitrary().chain((faction) =>
          fc.tuple(
            fc.constant(faction),
            fc.array(decoyTitleArbitrary(faction.toLowerCase()), { minLength: 0, maxLength: 5 }),
          ),
        ),
        ([faction, decoyTitles]) => {
          const checkboxes = decoyTitles.map((title) => createCheckboxData(title));

          const result = findMatchingCheckbox(faction, checkboxes);

          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: extra-reputation-reporting, Property 3: Prestige label parsing round-trip
   * Validates: Requirements 6.1, 6.5
   */
  describe('Property 3: Prestige label parsing round-trip', () => {
    it('formatting N as "(N prestige)" and parsing returns N', () => {
      fc.assert(
        fc.property(fc.nat(), (n) => {
          const formatted = `(${n} prestige)`;
          const result = parsePrestigeValue(formatted);

          expect(result).toBe(n);
        }),
        { numRuns: 100 },
      );
    });

    it('non-matching strings return null', () => {
      const prestigePattern = /^\(\d+ prestige\)$/;

      fc.assert(
        fc.property(
          fc.string().filter((s) => !prestigePattern.test(s)),
          (nonMatching) => {
            const result = parsePrestigeValue(nonMatching);

            expect(result).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Feature: extra-reputation-reporting, Property 4: Prestige mismatch detection
   * Validates: Requirements 6.2, 6.4
   */
  it('Property 4: Prestige mismatch detection', () => {
    fc.assert(
      fc.property(
        factionNameArbitrary(),
        fc.nat(),
        fc.nat(),
        (faction, reputation, prestigeValue) => {
          const bonusRep: BonusRep = { faction, reputation };

          const checkboxData: CheckboxData = {
            title: faction,
            prestigeLabelText: `(${prestigeValue} prestige)`,
            identifier: `checkbox-${faction}`,
          };

          const result = processBonusReputation(
            [bonusRep],
            [checkboxData],
            [checkboxData],
          );

          if (reputation !== prestigeValue) {
            expect(result.warnings.length).toBeGreaterThan(0);
            const hasMismatchWarning = result.warnings.some(
              (w) =>
                w.includes(faction) &&
                w.includes(String(reputation)) &&
                w.includes(String(prestigeValue)),
            );
            expect(hasMismatchWarning).toBe(true);
          } else {
            expect(result.warnings).toEqual([]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: extra-reputation-reporting, Property 5: Bonus reputation processing produces correct matched count
   * Validates: Requirements 4.2
   */
  it('Property 5: Bonus reputation processing produces correct matched count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }).chain((factionCount) =>
          fc.tuple(
            fc.uniqueArray(factionNameArbitrary(), {
              minLength: factionCount,
              maxLength: factionCount,
              comparator: (a, b) => a.toLowerCase() === b.toLowerCase(),
            }),
            fc.integer({ min: 0, max: factionCount }),
            fc.array(factionNameArbitrary(), { minLength: 0, maxLength: 3 }),
            fc.boolean(),
          ),
        ),
        ([allFactions, matchedSplit, extraCheckboxFactions, matchInGmSet]) => {
          const matchedFactions = allFactions.slice(0, matchedSplit);
          const unmatchedFactions = allFactions.slice(matchedSplit);

          // Build BonusRep entries for ALL factions (matched + unmatched)
          const bonusRepEntries: BonusRep[] = allFactions.map((faction) => ({
            faction,
            reputation: 2,
          }));

          // Build checkbox entries only for matched factions (plus optional extras)
          const matchedCheckboxes = matchedFactions.map((faction) =>
            createCheckboxData(faction),
          );

          // Filter extra checkbox factions to avoid collisions with any BonusRep faction
          const safeExtras = extraCheckboxFactions
            .filter(
              (extra) =>
                !allFactions.some(
                  (f) => f.toLowerCase() === extra.toLowerCase(),
                ),
            )
            .map((faction) => createCheckboxData(faction));

          const checkboxes = [...matchedCheckboxes, ...safeExtras];

          // Place matched checkboxes in either GM set, character set, or both
          const gmCheckboxes = matchInGmSet ? checkboxes : [];
          const characterCheckboxes = matchInGmSet ? [] : checkboxes;

          const result = processBonusReputation(
            bonusRepEntries,
            gmCheckboxes,
            characterCheckboxes,
          );

          // matchedCount should equal the number of BonusRep entries whose faction
          // appears in at least one checkbox set (case-insensitive)
          expect(result.matchedCount).toBe(matchedFactions.length);

          // Each unmatched faction should produce a warning
          for (const faction of unmatchedFactions) {
            const hasWarning = result.warnings.some((w) =>
              w.includes(faction),
            );
            expect(hasWarning).toBe(true);
          }

          // Total matches across both sets should equal matchedFactions.length
          const totalMatches = matchInGmSet
            ? result.gmMatches.length
            : result.characterMatches.length;
          expect(totalMatches).toBe(matchedFactions.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
