import {
  findMatchingCheckbox,
  parsePrestigeValue,
  processBonusReputation,
  CheckboxData,
} from './bonus-rep';
import type { BonusRep } from './types';

// --- Test Helpers ---

function createCheckboxData(
  title: string,
  prestigeLabelText: string | null = '(2 prestige)',
  identifier: string = `checkbox-${title.toLowerCase().replace(/\s/g, '-')}`,
): CheckboxData {
  return { title, prestigeLabelText, identifier };
}

function createBonusRep(faction: string, reputation: number): BonusRep {
  return { faction, reputation };
}

// --- findMatchingCheckbox ---

describe('findMatchingCheckbox', () => {
  const verdantWheel = createCheckboxData('Verdant Wheel');
  const vigilantSeal = createCheckboxData('Vigilant Seal');
  const checkboxes = [verdantWheel, vigilantSeal];

  it('returns the matching entry for an exact case match', () => {
    expect(findMatchingCheckbox('Verdant Wheel', checkboxes)).toBe(verdantWheel);
  });

  it('returns the matching entry for different casing', () => {
    expect(findMatchingCheckbox('verdant wheel', checkboxes)).toBe(verdantWheel);
    expect(findMatchingCheckbox('VIGILANT SEAL', checkboxes)).toBe(vigilantSeal);
  });

  it('returns null for an empty checkboxes array', () => {
    expect(findMatchingCheckbox('Verdant Wheel', [])).toBeNull();
  });

  it('returns null when no checkbox title matches', () => {
    expect(findMatchingCheckbox('Horizon Hunters', checkboxes)).toBeNull();
  });
});

// --- parsePrestigeValue ---

describe('parsePrestigeValue', () => {
  it('parses a valid prestige label', () => {
    expect(parsePrestigeValue('(2 prestige)')).toBe(2);
  });

  it('parses zero prestige', () => {
    expect(parsePrestigeValue('(0 prestige)')).toBe(0);
  });

  it('returns null for an empty string', () => {
    expect(parsePrestigeValue('')).toBeNull();
  });

  it('returns null when parentheses are missing', () => {
    expect(parsePrestigeValue('2 prestige')).toBeNull();
  });

  it('returns null for non-numeric content', () => {
    expect(parsePrestigeValue('(abc prestige)')).toBeNull();
  });
});

// --- processBonusReputation ---

describe('processBonusReputation', () => {
  it('returns an empty result for undefined bonusRepEarned', () => {
    const result = processBonusReputation(undefined, [], []);

    expect(result.matchedCount).toBe(0);
    expect(result.warnings).toEqual([]);
    expect(result.gmMatches).toEqual([]);
    expect(result.characterMatches).toEqual([]);
  });

  it('returns an empty result for an empty bonusRepEarned array', () => {
    const result = processBonusReputation([], [], []);

    expect(result.matchedCount).toBe(0);
    expect(result.warnings).toEqual([]);
    expect(result.gmMatches).toEqual([]);
    expect(result.characterMatches).toEqual([]);
  });

  it('warns for each unmatched faction when no checkboxes exist on the form', () => {
    const bonusRep = [createBonusRep('Verdant Wheel', 2)];

    const result = processBonusReputation(bonusRep, [], []);

    expect(result.matchedCount).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Verdant Wheel');
    expect(result.warnings[0]).toContain('not found');
  });

  it('matches one faction across both GM and character checkbox sets', () => {
    const bonusRep = [createBonusRep('Verdant Wheel', 2)];
    const gmCheckboxes = [createCheckboxData('Verdant Wheel', '(2 prestige)', 'gm-vw')];
    const charCheckboxes = [createCheckboxData('Verdant Wheel', '(2 prestige)', 'char-vw')];

    const result = processBonusReputation(bonusRep, gmCheckboxes, charCheckboxes);

    expect(result.matchedCount).toBe(1);
    expect(result.gmMatches).toEqual([
      { checkboxIdentifier: 'gm-vw', faction: 'Verdant Wheel' },
    ]);
    expect(result.characterMatches).toEqual([
      { checkboxIdentifier: 'char-vw', faction: 'Verdant Wheel' },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('matches two factions and returns correct matched count', () => {
    const bonusRep = [
      createBonusRep('Verdant Wheel', 2),
      createBonusRep('Vigilant Seal', 2),
    ];
    const gmCheckboxes = [
      createCheckboxData('Verdant Wheel', '(2 prestige)', 'gm-vw'),
      createCheckboxData('Vigilant Seal', '(2 prestige)', 'gm-vs'),
    ];
    const charCheckboxes = [
      createCheckboxData('Verdant Wheel', '(2 prestige)', 'char-vw'),
      createCheckboxData('Vigilant Seal', '(2 prestige)', 'char-vs'),
    ];

    const result = processBonusReputation(bonusRep, gmCheckboxes, charCheckboxes);

    expect(result.matchedCount).toBe(2);
    expect(result.gmMatches).toHaveLength(2);
    expect(result.characterMatches).toHaveLength(2);
    expect(result.warnings).toEqual([]);
  });

  it('produces a prestige mismatch warning when values differ', () => {
    const bonusRep = [createBonusRep('Verdant Wheel', 1)];
    const gmCheckboxes = [createCheckboxData('Verdant Wheel', '(2 prestige)', 'gm-vw')];
    const charCheckboxes = [createCheckboxData('Verdant Wheel', '(2 prestige)', 'char-vw')];

    const result = processBonusReputation(bonusRep, gmCheckboxes, charCheckboxes);

    expect(result.matchedCount).toBe(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Verdant Wheel');
    expect(result.warnings[0]).toContain('1');
    expect(result.warnings[0]).toContain('2');
  });

  it('warns when the prestige label is missing (null)', () => {
    const bonusRep = [createBonusRep('Verdant Wheel', 2)];
    const gmCheckboxes = [createCheckboxData('Verdant Wheel', null, 'gm-vw')];
    const charCheckboxes = [createCheckboxData('Verdant Wheel', '(2 prestige)', 'char-vw')];

    const result = processBonusReputation(bonusRep, gmCheckboxes, charCheckboxes);

    expect(result.matchedCount).toBe(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Could not parse prestige');
    expect(result.warnings[0]).toContain('Verdant Wheel');
  });

  it('warns for an unmatched faction while still matching others', () => {
    const bonusRep = [
      createBonusRep('Verdant Wheel', 2),
      createBonusRep('Horizon Hunters', 2),
    ];
    const gmCheckboxes = [createCheckboxData('Verdant Wheel', '(2 prestige)', 'gm-vw')];
    const charCheckboxes = [createCheckboxData('Verdant Wheel', '(2 prestige)', 'char-vw')];

    const result = processBonusReputation(bonusRep, gmCheckboxes, charCheckboxes);

    expect(result.matchedCount).toBe(1);
    expect(result.gmMatches).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Horizon Hunters');
    expect(result.warnings[0]).toContain('not found');
  });
});
