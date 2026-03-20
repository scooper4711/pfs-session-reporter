import fc from 'fast-check';
import {
  FACTION_ABBREVIATION_MAP,
  getFactionAbbreviation,
  findFactionOptionValue,
} from './faction-map';

// --- Constants ---

const KNOWN_FACTIONS: Array<{ name: string; abbreviation: string }> = [
  { name: "Envoy's Alliance", abbreviation: 'EA' },
  { name: 'Grand Archive', abbreviation: 'GA' },
  { name: 'Horizon Hunters', abbreviation: 'HH' },
  { name: 'Radiant Oath', abbreviation: 'RO' },
  { name: 'Verdant Wheel', abbreviation: 'VW' },
  { name: 'Vigilant Seal', abbreviation: 'VS' },
];

const KNOWN_FACTION_NAMES = new Set(KNOWN_FACTIONS.map((f) => f.name));

// --- Helpers ---

interface MockOption {
  value: string;
  text: string;
}

/**
 * Creates a minimal HTMLSelectElement-like object with an options array.
 * Avoids jsdom dependency by providing just enough structure for findFactionOptionValue.
 */
function createMockSelect(entries: MockOption[]): HTMLSelectElement {
  const options = entries.map((entry) => ({
    value: entry.value,
    text: entry.text,
  }));

  return { options } as unknown as HTMLSelectElement;
}

// --- Arbitraries ---

function knownFactionArbitrary(): fc.Arbitrary<{ name: string; abbreviation: string }> {
  return fc.constantFrom(...KNOWN_FACTIONS);
}

function optionValueArbitrary(): fc.Arbitrary<string> {
  return fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/);
}

const SAFE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('');

function unknownFactionArbitrary(): fc.Arbitrary<string> {
  return fc
    .string({ minLength: 1, maxLength: 30, unit: fc.constantFrom(...SAFE_CHARS) })
    .filter((name) => !KNOWN_FACTION_NAMES.has(name));
}

// --- Property Tests ---

describe('Faction Map Properties', () => {
  /**
   * Feature: paizo-session-report-browser-plugin, Property 10: Faction abbreviation mapping
   * Validates: Requirements 8.1, 8.2
   */
  it('Property 10: getFactionAbbreviation returns correct abbreviation for all known factions', () => {
    fc.assert(
      fc.property(knownFactionArbitrary(), ({ name, abbreviation }) => {
        expect(getFactionAbbreviation(name)).toBe(abbreviation);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 10a: findFactionOptionValue finds the matching option in a select element', () => {
    fc.assert(
      fc.property(
        knownFactionArbitrary(),
        optionValueArbitrary(),
        ({ name, abbreviation }, optionValue) => {
          const optionText = `${abbreviation} - ${name}`;
          const select = createMockSelect([
            { value: '', text: 'Select a Faction...' },
            { value: optionValue, text: optionText },
          ]);

          expect(findFactionOptionValue(select, name)).toBe(optionValue);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 10b: getFactionAbbreviation returns null for unknown faction names', () => {
    fc.assert(
      fc.property(unknownFactionArbitrary(), (unknownName) => {
        expect(getFactionAbbreviation(unknownName)).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('Property 10c: findFactionOptionValue returns null for unknown faction names', () => {
    fc.assert(
      fc.property(unknownFactionArbitrary(), (unknownName) => {
        const select = createMockSelect([
          { value: '', text: 'Select a Faction...' },
          { value: '0', text: "EA - Envoy's Alliance" },
        ]);

        expect(findFactionOptionValue(select, unknownName)).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('Property 10d: FACTION_ABBREVIATION_MAP contains exactly six PFS2E factions', () => {
    const mapEntries = Object.entries(FACTION_ABBREVIATION_MAP);
    expect(mapEntries).toHaveLength(KNOWN_FACTIONS.length);

    for (const { name, abbreviation } of KNOWN_FACTIONS) {
      expect(FACTION_ABBREVIATION_MAP[name]).toBe(abbreviation);
    }
  });
});
