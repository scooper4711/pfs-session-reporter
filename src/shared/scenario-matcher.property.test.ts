import fc from 'fast-check';
import { extractScenarioNumber, findScenarioOption } from './scenario-matcher';

// --- Helpers ---

interface MockOption {
  value: string;
  text: string;
}

/**
 * Creates a minimal HTMLSelectElement-like object with an options array.
 * Avoids jsdom dependency by providing just enough structure for findScenarioOption.
 */
function createMockSelect(entries: MockOption[]): HTMLSelectElement {
  const options = entries.map((entry) => ({
    value: entry.value,
    text: entry.text,
  }));

  return { options } as unknown as HTMLSelectElement;
}

// --- Arbitraries ---

const SAFE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('');

function scenarioNumberArbitrary(): fc.Arbitrary<{ n: number; mm: string }> {
  return fc.record({
    n: fc.integer({ min: 1, max: 9 }),
    mm: fc.integer({ min: 0, max: 99 }).map((v) => String(v).padStart(2, '0')),
  });
}

function scenarioTitleArbitrary(): fc.Arbitrary<string> {
  return fc.string({ minLength: 3, maxLength: 40, unit: fc.constantFrom(...SAFE_CHARS) });
}

function optionValueArbitrary(): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength: 10, unit: fc.constantFrom(...SAFE_CHARS) });
}

// --- Property Tests ---

describe('Scenario Matcher Properties', () => {
  /**
   * Feature: paizo-session-report-browser-plugin, Property 7: Scenario number extraction and matching
   * Validates: Requirements 5.1, 5.2
   */
  it('Property 7: extractScenarioNumber extracts N-MM from scenario strings and findScenarioOption finds matching option', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('PFS2E', 'SFS2E'),
        scenarioNumberArbitrary(),
        scenarioTitleArbitrary(),
        optionValueArbitrary(),
        (prefix, { n, mm }, title, optionValue) => {
          const scenarioString = `${prefix} ${n}-${mm}`;
          const expectedNumber = `${n}-${mm}`;

          // Verify extraction produces the correct scenario number
          const extracted = extractScenarioNumber(scenarioString);
          expect(extracted).toBe(expectedNumber);

          // Verify matching against a select with the correct option
          const matchingText = `#${expectedNumber}: ${title}`;
          const select = createMockSelect([
            { value: 'placeholder', text: 'Select a Scenario...' },
            { value: optionValue, text: matchingText },
          ]);

          const foundValue = findScenarioOption(select, scenarioString);
          expect(foundValue).toBe(optionValue);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 7a: findScenarioOption returns null when no option matches the scenario', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('PFS2E', 'SFS2E'),
        scenarioNumberArbitrary(),
        scenarioTitleArbitrary(),
        (prefix, { n, mm }, title) => {
          const scenarioString = `${prefix} ${n}-${mm}`;
          const expectedNumber = `${n}-${mm}`;

          // Create a select with an option that does NOT contain the matching pattern
          const unrelatedText = `#99-99: ${title}`;

          // Guard against accidental match when generated number is 99-99
          fc.pre(!unrelatedText.includes(`#${expectedNumber}:`));

          const select = createMockSelect([
            { value: 'placeholder', text: 'Select a Scenario...' },
            { value: '42', text: unrelatedText },
          ]);

          const foundValue = findScenarioOption(select, scenarioString);
          expect(foundValue).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 7b: extractScenarioNumber returns null for strings without a trailing N-MM pattern', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20, unit: fc.constantFrom(...SAFE_CHARS) }),
        (randomString: string) => {
          // Ensure the string doesn't accidentally end with whitespace + digits-digits
          fc.pre(!/\s\d+-\d+$/.test(randomString));

          const result = extractScenarioNumber(randomString);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
