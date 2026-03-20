/**
 * Property tests for phase detection in the content script.
 *
 * Feature: paizo-session-report-browser-plugin, Property 6: Phase detection correctness
 * Validates: Requirements 4.3, 4.5, 4.7
 *
 * Tests the pure determinePhase function which encapsulates the phase
 * detection logic without DOM dependencies. The function takes form state
 * values as parameters and returns the appropriate phase.
 */

import fc from 'fast-check';
import { GAME_SYSTEM_TO_SELECT_VALUE } from '../constants/selectors';

// sessionStorage mock — must be set before content-script module loads,
// because onPageLoad() calls sessionStorage.getItem at import time.
(globalThis as Record<string, unknown>).sessionStorage = {
  getItem: jest.fn().mockReturnValue(null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

// Chrome API mock — must be set before content-script module loads,
// because it registers chrome.runtime.onMessage.addListener at import time.
(globalThis as Record<string, unknown>).chrome = {
  runtime: {
    onMessage: { addListener: jest.fn() },
    sendMessage: jest.fn(),
  },
};

import { determinePhase } from './content-script';

// --- Arbitraries ---

const SAFE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');

function selectValueArbitrary(): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength: 10, unit: fc.constantFrom(...SAFE_CHARS) });
}

// --- Property Tests ---

describe('Phase Detection Properties', () => {
  /**
   * Feature: paizo-session-report-browser-plugin, Property 6: Phase detection correctness
   * Validates: Requirements 4.3, 4.5, 4.7
   */
  it('Property 6a: returns session-type when session type value does not match expected value', () => {
    fc.assert(
      fc.property(
        selectValueArbitrary(),
        selectValueArbitrary(),
        selectValueArbitrary(),
        (wrongSessionType, scenarioMatch, currentScenario) => {
          const expectedValue = GAME_SYSTEM_TO_SELECT_VALUE['PFS2E'];
          fc.pre(wrongSessionType !== expectedValue);

          const phase = determinePhase(
            wrongSessionType,
            expectedValue,
            scenarioMatch,
            currentScenario,
          );
          expect(phase).toBe('session-type');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 6b: returns session-type when session type select is missing (null)', () => {
    fc.assert(
      fc.property(
        selectValueArbitrary(),
        selectValueArbitrary(),
        (scenarioMatch, currentScenario) => {
          const expectedValue = GAME_SYSTEM_TO_SELECT_VALUE['PFS2E'];

          const phase = determinePhase(
            null,
            expectedValue,
            scenarioMatch,
            currentScenario,
          );
          expect(phase).toBe('session-type');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 6c: returns scenario when session type matches but scenario does not match', () => {
    fc.assert(
      fc.property(
        selectValueArbitrary(),
        selectValueArbitrary(),
        (scenarioMatchValue, currentScenarioValue) => {
          fc.pre(scenarioMatchValue !== currentScenarioValue);

          const expectedSessionType = GAME_SYSTEM_TO_SELECT_VALUE['PFS2E'];

          const phase = determinePhase(
            expectedSessionType,
            expectedSessionType,
            scenarioMatchValue,
            currentScenarioValue,
          );
          expect(phase).toBe('scenario');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 6d: returns scenario when scenario select is missing (null current value)', () => {
    fc.assert(
      fc.property(
        selectValueArbitrary(),
        (scenarioMatchValue) => {
          const expectedSessionType = GAME_SYSTEM_TO_SELECT_VALUE['PFS2E'];

          const phase = determinePhase(
            expectedSessionType,
            expectedSessionType,
            scenarioMatchValue,
            null,
          );
          expect(phase).toBe('scenario');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 6e: returns fill-fields when both session type and scenario match', () => {
    fc.assert(
      fc.property(
        selectValueArbitrary(),
        (scenarioValue) => {
          const expectedSessionType = GAME_SYSTEM_TO_SELECT_VALUE['PFS2E'];

          const phase = determinePhase(
            expectedSessionType,
            expectedSessionType,
            scenarioValue,
            scenarioValue,
          );
          expect(phase).toBe('fill-fields');
        },
      ),
      { numRuns: 100 },
    );
  });
});
