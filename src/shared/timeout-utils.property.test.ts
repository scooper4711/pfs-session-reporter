import fc from 'fast-check';
import { isExpired } from './timeout-utils';
import { TIMEOUT_MS } from '../constants/selectors';

// --- Property Tests ---

describe('Timeout Utils Properties', () => {
  /**
   * Feature: paizo-session-report-browser-plugin, Property 12: Pending report timeout detection
   * Validates: Requirements 15.1
   */
  it('Property 12: isExpired returns true when elapsed time exceeds 30 seconds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: TIMEOUT_MS + 1, max: TIMEOUT_MS + 600_000 }),
        (elapsedMs) => {
          const now = Date.now();
          const timestamp = now - elapsedMs;

          jest.spyOn(Date, 'now').mockReturnValue(now);

          expect(isExpired(timestamp)).toBe(true);

          jest.restoreAllMocks();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 12a: isExpired returns false when elapsed time is within 30 seconds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: TIMEOUT_MS }),
        (elapsedMs) => {
          const now = Date.now();
          const timestamp = now - elapsedMs;

          jest.spyOn(Date, 'now').mockReturnValue(now);

          expect(isExpired(timestamp)).toBe(false);

          jest.restoreAllMocks();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 12b: isExpired boundary - exactly 30 seconds is not expired', () => {
    const now = Date.now();
    const timestamp = now - TIMEOUT_MS;

    jest.spyOn(Date, 'now').mockReturnValue(now);

    expect(isExpired(timestamp)).toBe(false);

    jest.restoreAllMocks();
  });
});
