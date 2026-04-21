/**
 * Pure decision functions for the manual scenario selection flow.
 *
 * These functions encapsulate decision logic without DOM or Chrome API
 * dependencies, following the existing pattern (e.g., determinePhase).
 */

/**
 * Determines whether a scenario select value represents a valid selection
 * (not the default empty/placeholder value).
 */
export function isScenarioSelected(scenarioSelectValue: string): boolean {
  return scenarioSelectValue !== '' && scenarioSelectValue !== '0';
}

/**
 * Determines whether the content script should enter manual selection mode
 * on page load (when the manual selection flag is set in sessionStorage).
 *
 * Returns true if manual mode should be active (flag is set and report is not expired).
 */
export function shouldEnterManualMode(
  manualSelectionFlag: string | null,
  isReportExpired: boolean,
): boolean {
  if (isReportExpired) {
    return false;
  }
  return manualSelectionFlag === 'true';
}

/**
 * Builds the manualScenarioRequired message payload.
 */
export function buildManualScenarioMessage(scenario: string): { type: string; scenario: string } {
  return { type: 'manualScenarioRequired', scenario };
}
