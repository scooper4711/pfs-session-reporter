/**
 * Content script injected into the Paizo session reporting page.
 *
 * Implements a stateless phase detection approach: on each page load,
 * inspects the current form state against the Pending_Report data in
 * sessionStorage to determine which phase to execute next.
 *
 * Phases:
 * 1. session-type — Set the session type dropdown and submit
 * 2. scenario — Set the scenario dropdown and submit
 * 3. fill-fields — Populate all remaining form fields
 */

import {
  SELECTORS,
  STORAGE_KEY,
  GAME_SYSTEM_TO_SELECT_VALUE,
} from '../constants/selectors';
import { SessionReport, PendingReport, Phase, SignUp } from '../shared/types';
import { convertToFormDate } from '../shared/date-utils';
import { findFactionOptionValue } from '../shared/faction-map';
import { findScenarioOption } from '../shared/scenario-matcher';
import { extractGmSignUp, extractPlayerSignUps } from '../shared/signup-utils';
import { isExpired } from '../shared/timeout-utils';
import type { CheckboxData, BonusRepResult } from '../shared/bonus-rep';
import { processBonusReputation } from '../shared/bonus-rep';

/**
 * Pure phase detection logic that determines the workflow phase
 * based on form state values.
 *
 * Extracted as a pure function for testability — no DOM access needed.
 *
 * @param sessionTypeValue - Current value of the session type select (null if element missing)
 * @param expectedSessionTypeValue - Expected value for the report's gameSystem
 * @param scenarioMatchValue - The matching scenario option value (null if no match or element missing)
 * @param currentScenarioValue - Current value of the scenario select (null if element missing)
 * @returns The phase to execute: 'session-type', 'scenario', or 'fill-fields'
 */
export function determinePhase(
  sessionTypeValue: string | null,
  expectedSessionTypeValue: string | undefined,
  scenarioMatchValue: string | null,
  currentScenarioValue: string | null,
): Phase {
  if (sessionTypeValue === null || sessionTypeValue !== expectedSessionTypeValue) {
    return 'session-type';
  }

  if (currentScenarioValue === null || currentScenarioValue !== scenarioMatchValue) {
    return 'scenario';
  }

  return 'fill-fields';
}

/**
 * Determines the current workflow phase by inspecting form state
 * against the report data.
 *
 * @param report - The SessionReport from the Pending_Report
 * @returns The phase to execute: 'session-type', 'scenario', or 'fill-fields'
 */
export function detectPhase(report: SessionReport): Phase {
  const sessionTypeSelect = document.querySelector<HTMLSelectElement>(
    SELECTORS.sessionTypeSelect,
  );
  const expectedValue = GAME_SYSTEM_TO_SELECT_VALUE[report.gameSystem];

  const scenarioSelect = document.querySelector<HTMLSelectElement>(
    SELECTORS.scenarioSelect,
  );
  const scenarioMatchValue = scenarioSelect
    ? findScenarioOption(scenarioSelect, report.scenario)
    : null;

  return determinePhase(
    sessionTypeSelect?.value ?? null,
    expectedValue,
    scenarioMatchValue,
    scenarioSelect?.value ?? null,
  );
}

/**
 * Dispatches a change event on an element.
 * Used for text inputs and faction selects that need change events
 * to trigger AJAX handlers or jQuery datepicker.
 */
function dispatchChangeEvent(element: HTMLElement): void {
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Sets a text input value and dispatches a change event.
 */
function setInputWithChangeEvent(
  selector: string,
  value: string,
): void {
  const element = document.querySelector<HTMLInputElement>(selector);
  if (element) {
    element.value = value;
    dispatchChangeEvent(element);
  }
}

/**
 * Sets an input value without dispatching a change event.
 * Used for fields that don't need AJAX triggers.
 */
function setInputValue(selector: string, value: string): void {
  const element = document.querySelector<HTMLInputElement>(selector);
  if (element) {
    element.value = value;
  }
}

/**
 * Sets a checkbox's checked property.
 */
function setCheckbox(selector: string, checked: boolean): void {
  const element = document.querySelector<HTMLInputElement>(selector);
  if (element) {
    element.checked = checked;
  }
}

/**
 * Sets a select element's value and dispatches a change event.
 * Used for faction selects (not session type or scenario selects).
 */
function setSelectWithChangeEvent(
  selector: string,
  factionName: string,
): void {
  const selectElement = document.querySelector<HTMLSelectElement>(selector);
  if (!selectElement) {
    return;
  }

  const optionValue = findFactionOptionValue(selectElement, factionName);
  if (optionValue) {
    selectElement.value = optionValue;
    dispatchChangeEvent(selectElement);
  } else {
    console.warn(`Unknown faction: "${factionName}" — leaving dropdown at default`);
  }
}

/**
 * Sends a message to the extension runtime (background script / popup).
 */
function sendMessage(message: Record<string, unknown>): void {
  chrome.runtime.sendMessage(message);
}

/**
 * Reads the Pending_Report from sessionStorage.
 */
function readPendingReport(): PendingReport | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PendingReport;
  } catch {
    return null;
  }
}

/**
 * Clears the Pending_Report from sessionStorage.
 */
function clearPendingReport(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Phase 1: Set the session type dropdown and submit the form.
 *
 * Sets the value directly WITHOUT dispatching a change event to avoid
 * triggering the inline onChange="this.form.submit()" handler prematurely.
 * Then calls form.submit() programmatically.
 */
function executePhase1(report: SessionReport): void {
  const sessionTypeSelect = document.querySelector<HTMLSelectElement>(
    SELECTORS.sessionTypeSelect,
  );
  const form = document.querySelector<HTMLFormElement>(SELECTORS.form);

  if (!sessionTypeSelect || !form) {
    clearPendingReport();
    sendMessage({
      type: 'error',
      message: 'Could not find expected form fields. Make sure you\'re on the Paizo session reporting page.',
    });
    return;
  }

  const expectedValue = GAME_SYSTEM_TO_SELECT_VALUE[report.gameSystem];
  if (expectedValue) {
    sessionTypeSelect.value = expectedValue;
  }

  form.submit();
}

/**
 * Phase 2: Set the scenario dropdown and submit the form.
 *
 * Uses ScenarioMatcher to find the matching option. Sets the value
 * directly WITHOUT dispatching a change event. Then calls form.submit().
 * If no match is found, clears Pending_Report and sends an error.
 */
function executePhase2(report: SessionReport): void {
  const scenarioSelect = document.querySelector<HTMLSelectElement>(
    SELECTORS.scenarioSelect,
  );
  const form = document.querySelector<HTMLFormElement>(SELECTORS.form);

  if (!scenarioSelect || !form) {
    clearPendingReport();
    sendMessage({
      type: 'error',
      message: 'Could not find expected form fields. Make sure you\'re on the Paizo session reporting page.',
    });
    return;
  }

  const matchingValue = findScenarioOption(scenarioSelect, report.scenario);
  if (!matchingValue) {
    clearPendingReport();
    sendMessage({
      type: 'error',
      message: `Scenario '${report.scenario}' was not found in the Paizo form dropdown.`,
    });
    return;
  }

  scenarioSelect.value = matchingValue;
  form.submit();
}

/**
 * Populates the GM-specific fields on the form.
 */
function populateGmFields(report: SessionReport): void {
  setInputWithChangeEvent(SELECTORS.gmNumber, String(report.gmOrgPlayNumber));

  const gmSignUp = extractGmSignUp(report.signUps);
  if (gmSignUp) {
    setInputValue(SELECTORS.gmCharacterNumber, String(gmSignUp.characterNumber));
    setSelectWithChangeEvent(SELECTORS.gmFactionSelect, gmSignUp.faction);
    setInputValue(SELECTORS.gmReputation, String(gmSignUp.repEarned));
  }
}

/**
 * Populates the date and reporting flag fields.
 */
function populateDateAndFlags(report: SessionReport): void {
  const formDate = convertToFormDate(report.gameDate);
  setInputWithChangeEvent(SELECTORS.sessionDate, formDate);

  setCheckbox(SELECTORS.reportingA, report.reportingA);
  setCheckbox(SELECTORS.reportingB, report.reportingB);
  setCheckbox(SELECTORS.reportingC, report.reportingC);
  setCheckbox(SELECTORS.reportingD, report.reportingD);
}

/**
 * Extracts CheckboxData from a NodeList of checkbox input elements.
 *
 * For each checkbox, reads the title attribute and the text content
 * of the next sibling <td> element (the prestige label). Uses the
 * checkbox name attribute as the identifier for DOM correlation.
 */
function extractCheckboxData(
  checkboxes: NodeListOf<HTMLInputElement>,
): CheckboxData[] {
  const data: CheckboxData[] = [];
  for (const checkbox of checkboxes) {
    const title = checkbox.title;
    const parentTd = checkbox.closest('td');
    const siblingTd = parentTd?.nextElementSibling as HTMLTableCellElement | null;
    const prestigeLabelText = siblingTd?.textContent?.trim() ?? null;

    data.push({
      title,
      prestigeLabelText,
      identifier: checkbox.name,
    });
  }
  return data;
}

/**
 * Populates special faction objective checkboxes based on bonusRepEarned data.
 *
 * Queries the DOM for GM and character faction objective checkboxes,
 * extracts their data, delegates matching to processBonusReputation,
 * then sets .checked = true on matched checkboxes and logs warnings.
 */
function populateBonusReputation(report: SessionReport): BonusRepResult {
  const gmCheckboxes = document.querySelectorAll<HTMLInputElement>(
    SELECTORS.gmFactionObjectiveCheckboxes,
  );
  const charCheckboxes = document.querySelectorAll<HTMLInputElement>(
    SELECTORS.characterFactionObjectiveCheckboxes,
  );

  const gmCheckboxData = extractCheckboxData(gmCheckboxes);
  const charCheckboxData = extractCheckboxData(charCheckboxes);

  const result = processBonusReputation(
    report.bonusRepEarned,
    gmCheckboxData,
    charCheckboxData,
  );

  for (const match of result.gmMatches) {
    const checkbox = document.querySelector<HTMLInputElement>(
      `input[name="${match.checkboxIdentifier}"]`,
    );
    if (checkbox) {
      checkbox.checked = true;
    }
  }

  for (const match of result.characterMatches) {
    const checkbox = document.querySelector<HTMLInputElement>(
      `input[name="${match.checkboxIdentifier}"]`,
    );
    if (checkbox) {
      checkbox.checked = true;
    }
  }

  for (const warning of result.warnings) {
    console.warn(warning);
  }

  return result;
}

/**
 * Populates a single player row on the form.
 */
function populatePlayerRow(index: number, player: SignUp): void {
  setInputWithChangeEvent(SELECTORS.playerNumber(index), String(player.orgPlayNumber));
  setInputValue(SELECTORS.characterNumber(index), String(player.characterNumber));
  setInputValue(SELECTORS.characterName(index), player.characterName);
  setSelectWithChangeEvent(SELECTORS.factionSelect(index), player.faction);
  setInputValue(SELECTORS.prestigePoints(index), String(player.repEarned));
  setCheckbox(SELECTORS.consumesReplay(index), player.consumeReplay);
}

/**
 * Clicks the "Add Extra Character" button to add more player rows.
 */
function clickAddExtraCharacter(): void {
  const button = document.querySelector<HTMLInputElement>(
    SELECTORS.addExtraCharacter,
  );
  if (button) {
    button.click();
  }
}

/**
 * Populates all player rows, adding extra rows if needed.
 */
function populatePlayerRows(report: SessionReport): void {
  const players = extractPlayerSignUps(report.signUps);
  const defaultRowCount = 6;

  for (let i = players.length; i > defaultRowCount; i--) {
    clickAddExtraCharacter();
  }

  players.forEach((player, index) => {
    populatePlayerRow(index, player);
  });
}

/**
 * Phase 3: Fill all remaining form fields.
 *
 * Sets date with change event (jQuery datepicker), GM fields,
 * reporting flag checkboxes, and player rows. Clears Pending_Report
 * on completion and sends a success message.
 */
function executePhase3(report: SessionReport): void {
  const form = document.querySelector<HTMLFormElement>(SELECTORS.form);
  if (!form) {
    clearPendingReport();
    sendMessage({
      type: 'error',
      message: 'Could not find expected form fields. Make sure you\'re on the Paizo session reporting page.',
    });
    return;
  }

  populateGmFields(report);
  populateDateAndFlags(report);
  const bonusRepResult = populateBonusReputation(report);
  populatePlayerRows(report);

  clearPendingReport();

  const playerCount = extractPlayerSignUps(report.signUps).length;
  let message = `Form filled successfully. ${playerCount} player row(s) populated.`;

  if (bonusRepResult.matchedCount > 0) {
    message += ` ${bonusRepResult.matchedCount} extra reputation faction(s) checked.`;
  }

  for (const warning of bonusRepResult.warnings) {
    message += ` ${warning}`;
  }

  sendMessage({
    type: 'success',
    message,
    scenario: report.scenario,
  });
}

/**
 * Entry point: called on page load.
 *
 * Checks sessionStorage for a Pending_Report. If present and not expired,
 * detects the current phase and executes it. If expired, clears and stops.
 */
function onPageLoad(): void {
  const pendingReport = readPendingReport();
  if (!pendingReport) {
    return;
  }

  if (isExpired(pendingReport.timestamp)) {
    clearPendingReport();
    return;
  }

  const phase = detectPhase(pendingReport.report);

  switch (phase) {
    case 'session-type':
      executePhase1(pendingReport.report);
      break;
    case 'scenario':
      executePhase2(pendingReport.report);
      break;
    case 'fill-fields':
      executePhase3(pendingReport.report);
      break;
  }
}

/**
 * Stores a PendingReport in sessionStorage.
 */
function storePendingReport(pendingReport: PendingReport): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pendingReport));
}

/**
 * Listen for messages from the background script.
 *
 * The 'fillForm' message triggers the workflow. If the message includes
 * a pendingReport, it is stored in sessionStorage before running the
 * workflow. This allows the popup to pass the report data through the
 * background script to the content script for storage.
 */
chrome.runtime.onMessage.addListener(
  (message: Record<string, unknown>) => {
    if (message.type === 'fillForm') {
      if (message.pendingReport) {
        storePendingReport(message.pendingReport as PendingReport);
      }
      onPageLoad();
    }
  },
);

// Auto-start on page load if Pending_Report exists
onPageLoad();
