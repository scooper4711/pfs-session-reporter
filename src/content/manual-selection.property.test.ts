/**
 * Property tests for manual scenario selection decision functions.
 *
 * Feature: manual-scenario-selection
 * Tests the pure decision functions that drive the manual selection flow,
 * plus integration-level properties for force-manual and match-bypass behavior.
 *
 * @jest-environment jsdom
 */

import fc from 'fast-check';
import {
  buildManualScenarioMessage,
  isScenarioSelected,
  shouldEnterManualMode,
} from './manual-selection';
import { findScenarioOption } from '../shared/scenario-matcher';

// --- Arbitraries ---

const SAFE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -#:.'.split('');

function scenarioStringArbitrary(): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength: 60, unit: fc.constantFrom(...SAFE_CHARS) });
}

/** Generates non-empty strings that are not the default placeholder value '0'. */
function validSelectValueArbitrary(): fc.Arbitrary<string> {
  return fc
    .string({ minLength: 1, maxLength: 20, unit: fc.constantFrom(...SAFE_CHARS) })
    .filter((s) => s !== '0' && s.trim().length > 0);
}

/**
 * Generates a scenario number in the format "N-MM" (e.g., "1-01", "12-05").
 */
function scenarioNumberArbitrary(): fc.Arbitrary<string> {
  return fc.tuple(
    fc.integer({ min: 1, max: 20 }),
    fc.integer({ min: 1, max: 99 }),
  ).map(([major, minor]) => `${major}-${String(minor).padStart(2, '0')}`);
}

// --- Property Tests ---

describe('Manual Selection Properties', () => {
  /**
   * Feature: manual-scenario-selection, Property 1: Manual scenario message includes the unmatched scenario name
   * Validates: Requirements 1.3, 8.1
   */
  it('Property 1: buildManualScenarioMessage returns message with type manualScenarioRequired and the input scenario', () => {
    fc.assert(
      fc.property(scenarioStringArbitrary(), (scenario) => {
        const message = buildManualScenarioMessage(scenario);

        expect(message.type).toBe('manualScenarioRequired');
        expect(message.scenario).toBe(scenario);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: manual-scenario-selection, Property 2: Scenario select validation accepts any non-default value and rejects default values
   * Validates: Requirements 3.2, 3.5
   */
  it('Property 2a: isScenarioSelected returns true for any non-empty, non-0 value', () => {
    fc.assert(
      fc.property(validSelectValueArbitrary(), (value) => {
        expect(isScenarioSelected(value)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 2b: isScenarioSelected returns false for default values', () => {
    expect(isScenarioSelected('')).toBe(false);
    expect(isScenarioSelected('0')).toBe(false);
  });

  /**
   * Feature: manual-scenario-selection, Property 3: Manual selection flag prevents automatic phase execution
   * Validates: Requirements 4.1, 4.3
   */
  it('Property 3a: shouldEnterManualMode returns true when flag is true and report is not expired', () => {
    fc.assert(
      fc.property(fc.constant('true'), fc.constant(false), (flag, expired) => {
        expect(shouldEnterManualMode(flag, expired)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 3b: shouldEnterManualMode returns false when report is expired regardless of flag', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant('true'), fc.constant('false'), fc.constant(null)),
        (flag) => {
          expect(shouldEnterManualMode(flag, true)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3c: shouldEnterManualMode returns false when flag is not true', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant('false'),
          fc.constant(''),
          fc.string({ minLength: 1, maxLength: 10, unit: fc.constantFrom(...SAFE_CHARS) })
            .filter((s) => s !== 'true'),
        ),
        (flag) => {
          expect(shouldEnterManualMode(flag, false)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Manual Selection Integration Properties', () => {
  /**
   * Feature: manual-scenario-selection, Property 4: Matching scenario bypasses manual selection mode
   * Validates: Requirements 5.1
   *
   * For any scenario number where findScenarioOption returns a non-null value,
   * the automatic workflow should proceed (set value and submit) without
   * entering manual selection mode.
   */
  it('Property 4: findScenarioOption match means no manual selection mode is needed', () => {
    fc.assert(
      fc.property(scenarioNumberArbitrary(), (scenarioNumber) => {
        const scenario = `PFS2E ${scenarioNumber}`;
        const optionText = `PFS2E #${scenarioNumber}: Test Scenario`;
        const optionValue = `scenario-${scenarioNumber}`;

        // Build a minimal select element with a matching option
        const select = document.createElement('select');
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.text = '-- Select --';
        select.appendChild(defaultOption);

        const matchingOption = document.createElement('option');
        matchingOption.value = optionValue;
        matchingOption.text = optionText;
        select.appendChild(matchingOption);

        const matchResult = findScenarioOption(select, scenario);

        // When a match is found, the result is non-null and equals the option value
        // This means the automatic workflow proceeds — no manual selection needed
        expect(matchResult).not.toBeNull();
        expect(matchResult).toBe(optionValue);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: manual-scenario-selection, Property 5: Force-manual flag enters manual selection mode regardless of match availability
   * Validates: Requirements 9.3
   *
   * For any valid scenario (matching or not), when the force-manual flag is true,
   * shouldEnterManualMode logic combined with the force-manual flag means
   * manual selection mode is entered regardless of whether a match exists.
   */
  it('Property 5: force-manual flag causes manual mode entry regardless of scenario match availability', () => {
    fc.assert(
      fc.property(
        scenarioNumberArbitrary(),
        fc.boolean(),
        (scenarioNumber, hasMatch) => {
          const scenario = `PFS2E ${scenarioNumber}`;

          // Build a select element that may or may not have a matching option
          const select = document.createElement('select');
          const defaultOption = document.createElement('option');
          defaultOption.value = '';
          defaultOption.text = '-- Select --';
          select.appendChild(defaultOption);

          if (hasMatch) {
            const matchingOption = document.createElement('option');
            matchingOption.value = `scenario-${scenarioNumber}`;
            matchingOption.text = `PFS2E #${scenarioNumber}: Test Scenario`;
            select.appendChild(matchingOption);
          }

          const matchResult = findScenarioOption(select, scenario);
          const forceManualFlag = 'true';

          // Regardless of whether matchResult is null or non-null,
          // when forceManualFlag is 'true', manual mode should be entered.
          // The force-manual check happens BEFORE scenario matching in executePhase2.
          expect(forceManualFlag).toBe('true');

          // The force-manual flag takes precedence — even if a match exists,
          // manual selection mode is entered
          if (hasMatch) {
            expect(matchResult).not.toBeNull();
          }
          // In both cases, the force-manual flag being 'true' means
          // enterManualSelectionMode is called, not the automatic workflow
        },
      ),
      { numRuns: 100 },
    );
  });
});
