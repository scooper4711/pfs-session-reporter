import fc from 'fast-check';
import { convertToFormDate, extractDatePortion } from './date-utils';

// --- Arbitraries ---

function validDatePartsArbitrary(): fc.Arbitrary<{ year: number; month: number; day: number }> {
  return fc.record({
    year: fc.integer({ min: 2000, max: 2099 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  });
}

function isoDateStringArbitrary(): fc.Arbitrary<string> {
  return validDatePartsArbitrary().map(({ year, month, day }) =>
    `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  );
}

function timezoneSuffixArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant(''),
    fc.constant('T12:30:00Z'),
    fc.constant('T00:00:00+00:00'),
    fc.constant('T23:59:59-05:00'),
    fc.constant('T08:15:30+09:30'),
    fc.tuple(
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 }),
      fc.integer({ min: 0, max: 59 }),
    ).map(([h, m, s]) =>
      `T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}Z`,
    ),
  );
}

// --- Property Tests ---

describe('Date Utils Properties', () => {
  /**
   * Feature: paizo-session-report-browser-plugin, Property 8: Date format conversion
   * Validates: Requirements 6.1, 6.3
   */
  it('Property 8: convertToFormDate produces MM/DD/YYYY matching original date components', () => {
    fc.assert(
      fc.property(
        validDatePartsArbitrary(),
        timezoneSuffixArbitrary(),
        ({ year, month, day }, suffix) => {
          const isoDate = `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}${suffix}`;
          const result = convertToFormDate(isoDate);

          const [resultMonth, resultDay, resultYear] = result.split('/');

          expect(resultYear).toBe(String(year));
          expect(resultMonth).toBe(String(month).padStart(2, '0'));
          expect(resultDay).toBe(String(day).padStart(2, '0'));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 8a: extractDatePortion discards time/timezone suffix', () => {
    fc.assert(
      fc.property(
        isoDateStringArbitrary(),
        timezoneSuffixArbitrary(),
        (dateOnly, suffix) => {
          const fullDate = `${dateOnly}${suffix}`;
          const extracted = extractDatePortion(fullDate);

          expect(extracted).toBe(dateOnly);
          expect(extracted).toHaveLength(10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 8b: convertToFormDate output matches MM/DD/YYYY format', () => {
    fc.assert(
      fc.property(
        isoDateStringArbitrary(),
        timezoneSuffixArbitrary(),
        (dateOnly, suffix) => {
          const result = convertToFormDate(`${dateOnly}${suffix}`);

          expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        },
      ),
      { numRuns: 100 },
    );
  });
});
