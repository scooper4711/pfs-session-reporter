/**
 * Scenario matching utilities for the Paizo session reporting form.
 *
 * Extracts scenario numbers from SessionReport scenario strings (e.g., "PFS2E 7-02")
 * and matches them against Scenario_Select dropdown options by searching for the
 * "#N-MM:" pattern in option text.
 */

const SCENARIO_NUMBER_PATTERN = /\s(\d+-\d+)$/;
const OPTION_SCENARIO_PATTERN_PREFIX = '#';
const OPTION_SCENARIO_PATTERN_SUFFIX = ':';

/**
 * Extracts the scenario number portion from a scenario string.
 *
 * @param scenario - Scenario string in the format "PFS2E N-MM" (e.g., "PFS2E 7-02")
 * @returns The scenario number (e.g., "7-02"), or null if the format doesn't match
 */
export function extractScenarioNumber(scenario: string): string | null {
  const match = scenario.match(SCENARIO_NUMBER_PATTERN);
  if (!match) {
    return null;
  }
  return match[1];
}

/**
 * Searches a select element's options for one whose text contains the extracted
 * scenario number in the format "#N-MM:".
 *
 * @param selectElement - The Scenario_Select HTMLSelectElement to search
 * @param scenario - The full scenario string from the SessionReport (e.g., "PFS2E 7-02")
 * @returns The matching option's value, or null if no match is found
 */
export function findScenarioOption(
  selectElement: HTMLSelectElement,
  scenario: string,
): string | null {
  const scenarioNumber = extractScenarioNumber(scenario);
  if (!scenarioNumber) {
    return null;
  }

  const searchPattern = `${OPTION_SCENARIO_PATTERN_PREFIX}${scenarioNumber}${OPTION_SCENARIO_PATTERN_SUFFIX}`;

  for (const option of Array.from(selectElement.options)) {
    if (option.text.includes(searchPattern)) {
      return option.value;
    }
  }

  return null;
}
