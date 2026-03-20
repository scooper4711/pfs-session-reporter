import fc from 'fast-check';
import { isPaizoReportingPage } from './url-matcher';

// --- Arbitraries ---

const PAIZO_REPORTING_BASE = 'https://www.paizo.com/organizedPlay/myAccount/eventReporter';

function paizoReportingUrlArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant(PAIZO_REPORTING_BASE),
    fc.webPath().map((path) => `${PAIZO_REPORTING_BASE}${path}`),
    fc.webQueryParameters().map((query) => `${PAIZO_REPORTING_BASE}?${query}`),
    fc.webFragments().map((fragment) => `${PAIZO_REPORTING_BASE}#${fragment}`),
  );
}

function nonPaizoUrlArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.webUrl().filter((url) => {
      try {
        const parsed = new URL(url);
        return parsed.hostname !== 'www.paizo.com';
      } catch {
        return true;
      }
    }),
    fc.constant('https://www.paizo.com/store'),
    fc.constant('https://www.paizo.com/organizedPlay/myAccount'),
    fc.constant('https://www.paizo.com/organizedPlay'),
    fc.constant('https://paizo.com/organizedPlay/myAccount/eventReporter'),
  );
}

function invalidUrlArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant(''),
    fc.constant('not-a-url'),
    fc.string({ minLength: 1, maxLength: 50 }),
  );
}

// --- Property Tests ---

describe('URL Matcher Properties', () => {
  /**
   * Feature: paizo-session-report-browser-plugin, Property 11: Paizo URL detection
   * Validates: Requirements 11.1
   */
  it('Property 11: isPaizoReportingPage returns true for valid Paizo reporting URLs', () => {
    fc.assert(
      fc.property(paizoReportingUrlArbitrary(), (url) => {
        expect(isPaizoReportingPage(url)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 11a: isPaizoReportingPage returns false for non-Paizo URLs', () => {
    fc.assert(
      fc.property(nonPaizoUrlArbitrary(), (url) => {
        expect(isPaizoReportingPage(url)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 11b: isPaizoReportingPage returns false for invalid URL strings', () => {
    fc.assert(
      fc.property(invalidUrlArbitrary(), (url) => {
        expect(isPaizoReportingPage(url)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
