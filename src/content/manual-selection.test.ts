/**
 * Unit tests for manual scenario selection decision functions.
 *
 * Tests isScenarioSelected, shouldEnterManualMode, and buildManualScenarioMessage
 * with specific examples and edge cases.
 */

import {
  isScenarioSelected,
  shouldEnterManualMode,
  buildManualScenarioMessage,
} from './manual-selection';

describe('isScenarioSelected', () => {
  it('returns false for empty string', () => {
    expect(isScenarioSelected('')).toBe(false);
  });

  it('returns false for default placeholder value 0', () => {
    expect(isScenarioSelected('0')).toBe(false);
  });

  it('returns true for a valid scenario value', () => {
    expect(isScenarioSelected('scenario-101')).toBe(true);
  });

  it('returns true for a numeric non-zero value', () => {
    expect(isScenarioSelected('42')).toBe(true);
  });

  it('returns true for a single character value', () => {
    expect(isScenarioSelected('a')).toBe(true);
  });
});

describe('shouldEnterManualMode', () => {
  it('returns true when flag is true and report is not expired', () => {
    expect(shouldEnterManualMode('true', false)).toBe(true);
  });

  it('returns false when flag is true but report is expired', () => {
    expect(shouldEnterManualMode('true', true)).toBe(false);
  });

  it('returns false when flag is null and report is not expired', () => {
    expect(shouldEnterManualMode(null, false)).toBe(false);
  });

  it('returns false when flag is null and report is expired', () => {
    expect(shouldEnterManualMode(null, true)).toBe(false);
  });

  it('returns false when flag is false string and report is not expired', () => {
    expect(shouldEnterManualMode('false', false)).toBe(false);
  });

  it('returns false when flag is empty string and report is not expired', () => {
    expect(shouldEnterManualMode('', false)).toBe(false);
  });
});

describe('buildManualScenarioMessage', () => {
  it('returns object with type manualScenarioRequired', () => {
    const result = buildManualScenarioMessage('PFS2E 1-01');
    expect(result.type).toBe('manualScenarioRequired');
  });

  it('includes the scenario name in the message', () => {
    const result = buildManualScenarioMessage('PFS2E 1-01');
    expect(result.scenario).toBe('PFS2E 1-01');
  });

  it('preserves the exact scenario string', () => {
    const scenario = 'PFS2E 3-19: Rats of Round Mountain Part 1';
    const result = buildManualScenarioMessage(scenario);
    expect(result).toEqual({
      type: 'manualScenarioRequired',
      scenario,
    });
  });

  it('handles empty scenario string', () => {
    const result = buildManualScenarioMessage('');
    expect(result).toEqual({
      type: 'manualScenarioRequired',
      scenario: '',
    });
  });
});
