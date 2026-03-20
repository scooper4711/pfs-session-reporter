import fc from 'fast-check';
import { isPaizoReportingPage } from './url-matcher';

// --- Arbitraries ---

const PAIZO_WEBOBJECTS_BASE = 'https://paizo.com/cgi-bin/WebObjects/Store.woa/';
const PAIZO_WEBOBJECTS_BASE_WWW = 'https://www.paizo.com/cgi-bin/WebObjects/Store.woa/';

function paizoReportingUrlArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant(`${PAIZO_WEBOBJECTS_BASE}wa/PathfinderSociety/reportEvent`),
    fc.constant(`${PAIZO_WEBOBJECTS_BASE_WWW}wa/PathfinderSociety/reportEvent`),
    fc.webQueryParameters().map((query) =>
      `${PAIZO_WEBOBJECTS_BASE}wa/PathfinderSociety/reportEvent?${query}`),
    fc.webFragments().map((fragment) =>
      `${PAIZO_WEBOBJECTS_BASE}wa/PathfinderSociety/reportEvent#${fragment}`),
    // Dynamic WebObjects URLs after form navigation
    fc.string({ minLength: 5, maxLength: 40, unit: 'grapheme-ascii' as const })
      .map((suffix) => `${PAIZO_WEBOBJECTS_BASE}${suffix.replace(/ /g, '')}`),
    fc.constant(`${PAIZO_WEBOBJECTS_BASE_WWW}160/wo/EtXfNp25Bq9yX4lrttbFJ0/2.17.2.1.3.1.1.1`),
  );
}

function nonPaizoUrlArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.webUrl().filter((url) => {
      try {
        const parsed = new URL(url);
        return parsed.hostname !== 'paizo.com' && parsed.hostname !== 'www.paizo.com';
      } catch {
        return true;
      }
    }),
    fc.constant('https://paizo.com/store'),
    fc.constant('https://paizo.com/organizedPlay/myAccount'),
    fc.constant('https://www.paizo.com/store'),
    fc.constant('https://example.com/cgi-bin/WebObjects/Store.woa/wa/PathfinderSociety/reportEvent'),
    fc.constant('https://paizo.com/cgi-bin/other-app'),
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

  it('Property 11c: isPaizoReportingPage matches the real Paizo reporting URL', () => {
    const realUrl = 'https://paizo.com/cgi-bin/WebObjects/Store.woa/wa/PathfinderSociety/reportEvent?event=v5748mkg4iody&destinationPath=organizedplay%2FmyAccount';
    expect(isPaizoReportingPage(realUrl)).toBe(true);
  });

  it('Property 11d: isPaizoReportingPage matches dynamic WebObjects URLs after form navigation', () => {
    const dynamicUrl = 'https://paizo.com/cgi-bin/WebObjects/Store.woa/160/wo/EtXfNp25Bq9yX4lrttbFJ0/2.17.2.1.3.1.1.1';
    expect(isPaizoReportingPage(dynamicUrl)).toBe(true);
  });
});
