/**
 * Unit tests for content-script.ts
 *
 * Tests the DOM manipulation functions (phases 1-3), message handling,
 * and the onPageLoad entry point. Uses jsdom (via jest-environment-jsdom
 * override) to provide a realistic DOM environment.
 *
 * @jest-environment jsdom
 */

import { SELECTORS, STORAGE_KEY, MANUAL_SELECTION_KEY, FORCE_MANUAL_KEY, GAME_SYSTEM_TO_SELECT_VALUE } from '../constants/selectors';
import { SessionReport, PendingReport } from '../shared/types';

// --- Mocks (must be set before content-script module loads) ---

const mockSessionStorage: Record<string, string> = {};
const sessionStorageMock = {
  getItem: jest.fn((key: string) => mockSessionStorage[key] ?? null),
  setItem: jest.fn((key: string, value: string) => { mockSessionStorage[key] = value; }),
  removeItem: jest.fn((key: string) => { delete mockSessionStorage[key]; }),
};
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock, writable: true });

const sendMessageMock = jest.fn();
const addListenerMock = jest.fn();
(globalThis as Record<string, unknown>).chrome = {
  runtime: {
    onMessage: { addListener: addListenerMock },
    sendMessage: sendMessageMock,
  },
};

// --- Import after mocks ---
// The module runs onPageLoad() and registers chrome.runtime.onMessage on import.
// With empty sessionStorage, onPageLoad() returns immediately.
import { determinePhase, detectPhase } from './content-script';

// Capture the message handler registered during module load, before any clearAllMocks
const messageHandler: (message: Record<string, unknown>) => void = addListenerMock.mock.calls[0][0];

// --- Test Fixtures ---

/** Scenario string must end with "N-MM" for extractScenarioNumber to match */
const TEST_SCENARIO = 'PFS2E 1-01';
/** Option text must contain "#N-MM:" for findScenarioOption to match */
const TEST_SCENARIO_OPTION_TEXT = 'PFS2E #1-01: The Absalom Initiation';
const TEST_SCENARIO_OPTION_VALUE = 'scenario-101';

function createTestReport(overrides: Partial<SessionReport> = {}): SessionReport {
  return {
    gameDate: '2025-06-15',
    gameSystem: 'PFS2E',
    generateGmChronicle: true,
    gmOrgPlayNumber: 12345,
    repEarned: 4,
    reportingA: true,
    reportingB: false,
    reportingC: true,
    reportingD: false,
    scenario: TEST_SCENARIO,
    signUps: [
      {
        isGM: true,
        orgPlayNumber: 12345,
        characterNumber: 2001,
        characterName: 'GM Character',
        consumeReplay: false,
        repEarned: 4,
        faction: 'Horizon Hunters',
      },
      {
        isGM: false,
        orgPlayNumber: 67890,
        characterNumber: 1,
        characterName: 'Test Player',
        consumeReplay: false,
        repEarned: 4,
        faction: 'Envoys Alliance',
      },
    ],
    bonusRepEarned: [],
    ...overrides,
  };
}

function createPendingReport(overrides: Partial<SessionReport> = {}): PendingReport {
  return {
    report: createTestReport(overrides),
    timestamp: Date.now(),
  };
}

function buildFormDom(): void {
  document.body.innerHTML = `
    <form name="editObject">
      <select name="17.2.1.3.1.1.1.15">
        <option value="">-- Select --</option>
        <option value="4">Pathfinder Society (Second Edition)</option>
      </select>
      <select name="17.2.1.3.1.1.1.17">
        <option value="">-- Select --</option>
        <option value="${TEST_SCENARIO_OPTION_VALUE}">${TEST_SCENARIO_OPTION_TEXT}</option>
      </select>
      <input id="sessionDate" value="" />
      <input id="gameMasterNumber" value="" />
      <input id="gameMasterCharacterNumber" value="" />
      <input id="gameMasterName" value="" />
      <select id="gmFactionSelect">
        <option value="">-- Select --</option>
        <option value="hh">Horizon Hunters</option>
      </select>
      <input name="something.35.15.5.something" value="" />
      <input name="17.2.1.3.1.1.1.27.1" type="checkbox" />
      <input name="17.2.1.3.1.1.1.27.3" type="checkbox" />
      <input name="17.2.1.3.1.1.1.27.5" type="checkbox" />
      <input name="17.2.1.3.1.1.1.27.7" type="checkbox" />
      ${buildPlayerRows(6)}
      <input name="17.2.1.3.1.1.1.41" type="button" value="Add Extra Character" />
    </form>
  `;
}

function buildPlayerRows(count: number): string {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <input id="${i}playerNumber" value="" />
      <input id="${i}characterNumber" value="" />
      <input id="${i}characterName" value="" />
      <select id="${i}FactionSelect">
        <option value="">-- Select --</option>
        <option value="ea">Envoys Alliance</option>
        <option value="hh">Horizon Hunters</option>
      </select>
      <input id="${i}prestigePoints" value="" />
      <input name="something.${i}consumesReplay" type="checkbox" />
    `;
  }
  return html;
}

function clearMocksAndStorage(): void {
  jest.clearAllMocks();
  Object.keys(mockSessionStorage).forEach(key => delete mockSessionStorage[key]);
}

// --- Tests ---

describe('content-script module load', () => {
  it('registers a chrome.runtime.onMessage listener on import', () => {
    expect(messageHandler).toBeDefined();
    expect(typeof messageHandler).toBe('function');
  });

  it('calls sessionStorage.getItem on import (onPageLoad auto-start)', () => {
    expect(sessionStorageMock.getItem).toHaveBeenCalledWith(STORAGE_KEY);
  });
});

describe('detectPhase (DOM-based)', () => {
  beforeEach(() => {
    buildFormDom();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns session-type when session type select has wrong value', () => {
    const report = createTestReport();
    const sessionTypeSelect = document.querySelector<HTMLSelectElement>(SELECTORS.sessionTypeSelect);
    sessionTypeSelect!.value = '';
    expect(detectPhase(report)).toBe('session-type');
  });

  it('returns scenario when session type matches but scenario does not', () => {
    const report = createTestReport();
    const sessionTypeSelect = document.querySelector<HTMLSelectElement>(SELECTORS.sessionTypeSelect);
    sessionTypeSelect!.value = GAME_SYSTEM_TO_SELECT_VALUE['PFS2E'];
    const scenarioSelect = document.querySelector<HTMLSelectElement>(SELECTORS.scenarioSelect);
    scenarioSelect!.value = '';
    expect(detectPhase(report)).toBe('scenario');
  });

  it('returns fill-fields when both session type and scenario match', () => {
    const report = createTestReport();
    const sessionTypeSelect = document.querySelector<HTMLSelectElement>(SELECTORS.sessionTypeSelect);
    sessionTypeSelect!.value = GAME_SYSTEM_TO_SELECT_VALUE['PFS2E'];
    const scenarioSelect = document.querySelector<HTMLSelectElement>(SELECTORS.scenarioSelect);
    scenarioSelect!.value = TEST_SCENARIO_OPTION_VALUE;
    expect(detectPhase(report)).toBe('fill-fields');
  });
});

describe('onMessage listener', () => {
  beforeEach(() => {
    buildFormDom();
    clearMocksAndStorage();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('ignores messages that are not fillForm', () => {
    messageHandler({ type: 'other' });
    expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('stores pendingReport in sessionStorage when provided', () => {
    const pending = createPendingReport();
    messageHandler({ type: 'fillForm', pendingReport: pending });
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(pending),
    );
  });

  it('executes phase 1 (session-type) when form has wrong session type', () => {
    const pending = createPendingReport();
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(pending);

    const sessionTypeSelect = document.querySelector<HTMLSelectElement>(SELECTORS.sessionTypeSelect);
    sessionTypeSelect!.value = '';
    const form = document.querySelector<HTMLFormElement>(SELECTORS.form);
    form!.submit = jest.fn();

    messageHandler({ type: 'fillForm', pendingReport: pending });

    expect(sessionTypeSelect!.value).toBe(GAME_SYSTEM_TO_SELECT_VALUE['PFS2E']);
    expect(form!.submit).toHaveBeenCalled();
  });

  it('executes phase 2 (scenario) when session type matches but scenario does not', () => {
    const pending = createPendingReport();
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(pending);

    const sessionTypeSelect = document.querySelector<HTMLSelectElement>(SELECTORS.sessionTypeSelect);
    sessionTypeSelect!.value = GAME_SYSTEM_TO_SELECT_VALUE['PFS2E'];
    const scenarioSelect = document.querySelector<HTMLSelectElement>(SELECTORS.scenarioSelect);
    scenarioSelect!.value = '';
    const form = document.querySelector<HTMLFormElement>(SELECTORS.form);
    form!.submit = jest.fn();

    messageHandler({ type: 'fillForm', pendingReport: pending });

    expect(scenarioSelect!.value).toBe(TEST_SCENARIO_OPTION_VALUE);
    expect(form!.submit).toHaveBeenCalled();
  });

  it('executes phase 3 (fill-fields) and populates GM and player fields', () => {
    const pending = createPendingReport();
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(pending);

    const sessionTypeSelect = document.querySelector<HTMLSelectElement>(SELECTORS.sessionTypeSelect);
    sessionTypeSelect!.value = GAME_SYSTEM_TO_SELECT_VALUE['PFS2E'];
    const scenarioSelect = document.querySelector<HTMLSelectElement>(SELECTORS.scenarioSelect);
    scenarioSelect!.value = TEST_SCENARIO_OPTION_VALUE;

    messageHandler({ type: 'fillForm', pendingReport: pending });

    // GM fields
    const gmNumber = document.querySelector<HTMLInputElement>(SELECTORS.gmNumber);
    expect(gmNumber!.value).toBe('12345');
    const gmCharNumber = document.querySelector<HTMLInputElement>(SELECTORS.gmCharacterNumber);
    expect(gmCharNumber!.value).toBe('2001');

    // Date
    const dateField = document.querySelector<HTMLInputElement>(SELECTORS.sessionDate);
    expect(dateField!.value).not.toBe('');

    // Checkboxes
    const reportingA = document.querySelector<HTMLInputElement>(SELECTORS.reportingA);
    expect(reportingA!.checked).toBe(true);
    const reportingB = document.querySelector<HTMLInputElement>(SELECTORS.reportingB);
    expect(reportingB!.checked).toBe(false);

    // Player row (index 0 = first non-GM player)
    const playerNumber = document.querySelector<HTMLInputElement>('[id="0playerNumber"]');
    expect(playerNumber!.value).toBe('67890');
    const charName = document.querySelector<HTMLInputElement>('[id="0characterName"]');
    expect(charName!.value).toBe('Test Player');

    // Clears pending report and sends success
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    );
  });
});

// --- Bonus Reputation DOM Helpers ---

/**
 * Builds HTML for a single faction objective checkbox row matching the
 * Paizo form structure: <tr><td>Label</td><td><input .../></td><td>(N prestige)</td></tr>
 */
function buildFactionCheckboxRow(
  nameAttr: string,
  factionTitle: string,
  prestigeLabel: string,
): string {
  return `
    <tr>
      <td>${factionTitle}:  </td>
      <td><input type="checkbox" name="${nameAttr}" title="${factionTitle}" /></td>
      <td>${prestigeLabel}</td>
    </tr>
  `;
}

/**
 * Adds GM and character faction objective checkbox tables to the form DOM.
 * Each faction gets a row in both the GM and character checkbox tables.
 */
function addFactionCheckboxesToDom(
  factions: Array<{ name: string; prestige: number }>,
): void {
  const form = document.querySelector('form[name="editObject"]');
  if (!form) return;

  let gmRows = '';
  let charRows = '';
  factions.forEach((faction, index) => {
    const gmName = `17.2.1.3.1.1.1.31.1.${index}.3`;
    const charName = `17.2.1.3.1.1.1.33.1.${index}.3`;
    const label = `(${faction.prestige} prestige)`;
    gmRows += buildFactionCheckboxRow(gmName, faction.name, label);
    charRows += buildFactionCheckboxRow(charName, faction.name, label);
  });

  const tableHtml = `
    <table class="gm-faction-objectives">${gmRows}</table>
    <table class="char-faction-objectives">${charRows}</table>
  `;
  form.insertAdjacentHTML('beforeend', tableHtml);
}

/**
 * Sets up the form DOM in Phase 3 state (session type and scenario already selected).
 */
function setupPhase3Dom(): void {
  buildFormDom();
  const sessionTypeSelect = document.querySelector<HTMLSelectElement>(SELECTORS.sessionTypeSelect);
  sessionTypeSelect!.value = GAME_SYSTEM_TO_SELECT_VALUE['PFS2E'];
  const scenarioSelect = document.querySelector<HTMLSelectElement>(SELECTORS.scenarioSelect);
  scenarioSelect!.value = TEST_SCENARIO_OPTION_VALUE;
}

/**
 * Triggers Phase 3 by sending a fillForm message with the given pending report.
 */
function triggerPhase3(pending: PendingReport): void {
  mockSessionStorage[STORAGE_KEY] = JSON.stringify(pending);
  messageHandler({ type: 'fillForm', pendingReport: pending });
}

describe('Phase 3 bonus reputation integration', () => {
  beforeEach(() => {
    clearMocksAndStorage();
    setupPhase3Dom();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('checks the correct DOM checkboxes when bonusRepEarned matches', () => {
    addFactionCheckboxesToDom([
      { name: 'Verdant Wheel', prestige: 2 },
      { name: 'Vigilant Seal', prestige: 2 },
    ]);

    const pending = createPendingReport({
      bonusRepEarned: [
        { faction: 'Verdant Wheel', reputation: 2 },
        { faction: 'Vigilant Seal', reputation: 2 },
      ],
    });
    triggerPhase3(pending);

    const gmCheckbox0 = document.querySelector<HTMLInputElement>(
      'input[name="17.2.1.3.1.1.1.31.1.0.3"]',
    );
    const gmCheckbox1 = document.querySelector<HTMLInputElement>(
      'input[name="17.2.1.3.1.1.1.31.1.1.3"]',
    );
    const charCheckbox0 = document.querySelector<HTMLInputElement>(
      'input[name="17.2.1.3.1.1.1.33.1.0.3"]',
    );
    const charCheckbox1 = document.querySelector<HTMLInputElement>(
      'input[name="17.2.1.3.1.1.1.33.1.1.3"]',
    );

    expect(gmCheckbox0!.checked).toBe(true);
    expect(gmCheckbox1!.checked).toBe(true);
    expect(charCheckbox0!.checked).toBe(true);
    expect(charCheckbox1!.checked).toBe(true);
  });

  it('completes without error when bonusRepEarned is empty', () => {
    addFactionCheckboxesToDom([
      { name: 'Verdant Wheel', prestige: 2 },
    ]);

    const pending = createPendingReport({ bonusRepEarned: [] });
    triggerPhase3(pending);

    // Checkboxes remain unchecked
    const gmCheckbox = document.querySelector<HTMLInputElement>(
      'input[name="17.2.1.3.1.1.1.31.1.0.3"]',
    );
    expect(gmCheckbox!.checked).toBe(false);

    // Success message sent without errors
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    );
  });

  it('includes warning in success message for unmatched faction', () => {
    addFactionCheckboxesToDom([
      { name: 'Verdant Wheel', prestige: 2 },
    ]);

    const pending = createPendingReport({
      bonusRepEarned: [
        { faction: 'Nonexistent Faction', reputation: 2 },
      ],
    });
    triggerPhase3(pending);

    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        message: expect.stringContaining('Nonexistent Faction'),
      }),
    );

    // Other fields still populated (player row)
    const playerNumber = document.querySelector<HTMLInputElement>('[id="0playerNumber"]');
    expect(playerNumber!.value).toBe('67890');
  });

  it('includes warning in success message for prestige mismatch and checkbox is still checked', () => {
    addFactionCheckboxesToDom([
      { name: 'Verdant Wheel', prestige: 2 },
    ]);

    const pending = createPendingReport({
      bonusRepEarned: [
        { faction: 'Verdant Wheel', reputation: 1 },
      ],
    });
    triggerPhase3(pending);

    // Checkbox is still checked despite mismatch
    const gmCheckbox = document.querySelector<HTMLInputElement>(
      'input[name="17.2.1.3.1.1.1.31.1.0.3"]',
    );
    expect(gmCheckbox!.checked).toBe(true);

    // Warning in success message
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        message: expect.stringContaining('Warning: Verdant Wheel reputation is 1 in session report but 2 on form'),
      }),
    );
  });

  it('includes bonus rep count in success message', () => {
    addFactionCheckboxesToDom([
      { name: 'Verdant Wheel', prestige: 2 },
      { name: 'Vigilant Seal', prestige: 2 },
    ]);

    const pending = createPendingReport({
      bonusRepEarned: [
        { faction: 'Verdant Wheel', reputation: 2 },
        { faction: 'Vigilant Seal', reputation: 2 },
      ],
    });
    triggerPhase3(pending);

    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        message: expect.stringContaining('2 extra reputation faction(s) checked.'),
      }),
    );
  });

  it('extractCheckboxData correctly reads title and sibling <td> text from DOM', () => {
    addFactionCheckboxesToDom([
      { name: 'Verdant Wheel', prestige: 2 },
      { name: 'Vigilant Seal', prestige: 4 },
    ]);

    // Trigger Phase 3 with matching factions to exercise extractCheckboxData
    const pending = createPendingReport({
      bonusRepEarned: [
        { faction: 'Verdant Wheel', reputation: 2 },
        { faction: 'Vigilant Seal', reputation: 4 },
      ],
    });
    triggerPhase3(pending);

    // Both GM and character checkboxes should be checked — proves extractCheckboxData
    // correctly read the title attributes and matched them to bonusRepEarned factions
    const gmVerdant = document.querySelector<HTMLInputElement>(
      'input[name="17.2.1.3.1.1.1.31.1.0.3"]',
    );
    const gmVigilant = document.querySelector<HTMLInputElement>(
      'input[name="17.2.1.3.1.1.1.31.1.1.3"]',
    );
    expect(gmVerdant!.checked).toBe(true);
    expect(gmVigilant!.checked).toBe(true);

    // No prestige mismatch warnings — proves extractCheckboxData correctly read
    // the sibling <td> prestige label text "(2 prestige)" and "(4 prestige)"
    const successCall = sendMessageMock.mock.calls[0][0];
    expect(successCall.message).not.toContain('Warning:');
    expect(successCall.message).toContain('2 extra reputation faction(s) checked.');
  });
});

describe('error handling', () => {
  beforeEach(() => {
    clearMocksAndStorage();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('sends error when form is missing in phase 1', () => {
    document.body.innerHTML = '';
    const pending = createPendingReport();
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(pending);

    messageHandler({ type: 'fillForm', pendingReport: pending });

    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' }),
    );
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('enters manual selection mode when scenario is not found in phase 2', () => {
    document.body.innerHTML = `
      <form name="editObject">
        <select name="17.2.1.3.1.1.1.15">
          <option value="4">PFS2E</option>
        </select>
        <select name="17.2.1.3.1.1.1.17">
          <option value="">-- Select --</option>
        </select>
      </form>
    `;

    const pending = createPendingReport({ scenario: 'PFS2E 99-99' });
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(pending);

    const sessionTypeSelect = document.querySelector<HTMLSelectElement>(SELECTORS.sessionTypeSelect);
    sessionTypeSelect!.value = GAME_SYSTEM_TO_SELECT_VALUE['PFS2E'];

    messageHandler({ type: 'fillForm', pendingReport: pending });

    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'manualScenarioRequired', scenario: 'PFS2E 99-99' }),
    );
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(MANUAL_SELECTION_KEY, 'true');
  });

  it('sends error when form is missing in phase 3', () => {
    document.body.innerHTML = `
      <select name="17.2.1.3.1.1.1.15">
        <option value="4">PFS2E</option>
      </select>
      <select name="17.2.1.3.1.1.1.17">
        <option value="${TEST_SCENARIO_OPTION_VALUE}">${TEST_SCENARIO_OPTION_TEXT}</option>
      </select>
    `;

    const pending = createPendingReport();
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(pending);

    const sessionTypeSelect = document.querySelector<HTMLSelectElement>(SELECTORS.sessionTypeSelect);
    sessionTypeSelect!.value = GAME_SYSTEM_TO_SELECT_VALUE['PFS2E'];
    const scenarioSelect = document.querySelector<HTMLSelectElement>(SELECTORS.scenarioSelect);
    scenarioSelect!.value = TEST_SCENARIO_OPTION_VALUE;

    messageHandler({ type: 'fillForm', pendingReport: pending });

    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('clears expired pending reports and all workflow state', () => {
    buildFormDom();
    const expiredPending: PendingReport = {
      report: createTestReport(),
      timestamp: Date.now() - 60_000,
    };
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(expiredPending);

    messageHandler({ type: 'fillForm', pendingReport: expiredPending });

    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(MANUAL_SELECTION_KEY);
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(FORCE_MANUAL_KEY);
  });
});


// --- Manual Selection Flow Helpers ---

/**
 * Sets up the form DOM in Phase 2 state (session type already selected,
 * scenario not yet matched) with no matching scenario option.
 */
function setupPhase2DomNoMatch(): void {
  document.body.innerHTML = `
    <form name="editObject">
      <select name="17.2.1.3.1.1.1.15">
        <option value="">-- Select --</option>
        <option value="4">Pathfinder Society (Second Edition)</option>
      </select>
      <select name="17.2.1.3.1.1.1.17">
        <option value="">-- Select --</option>
      </select>
    </form>
  `;
  const sessionTypeSelect = document.querySelector<HTMLSelectElement>(SELECTORS.sessionTypeSelect);
  sessionTypeSelect!.value = GAME_SYSTEM_TO_SELECT_VALUE['PFS2E'];
}

/**
 * Sets up the form DOM in Phase 2 state with a matching scenario option.
 */
function setupPhase2DomWithMatch(): void {
  buildFormDom();
  const sessionTypeSelect = document.querySelector<HTMLSelectElement>(SELECTORS.sessionTypeSelect);
  sessionTypeSelect!.value = GAME_SYSTEM_TO_SELECT_VALUE['PFS2E'];
  const scenarioSelect = document.querySelector<HTMLSelectElement>(SELECTORS.scenarioSelect);
  scenarioSelect!.value = '';
  const form = document.querySelector<HTMLFormElement>(SELECTORS.form);
  form!.submit = jest.fn();
}

// --- Manual Selection Flow Tests ---

describe('executePhase2 manual selection', () => {
  beforeEach(() => {
    clearMocksAndStorage();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('enters manual mode when findScenarioOption returns null', () => {
    setupPhase2DomNoMatch();
    const pending = createPendingReport({ scenario: 'PFS2E 99-99' });
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(pending);

    messageHandler({ type: 'fillForm', pendingReport: pending });

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(MANUAL_SELECTION_KEY, 'true');
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'manualScenarioRequired', scenario: 'PFS2E 99-99' }),
    );
  });

  it('proceeds normally when findScenarioOption returns a match', () => {
    setupPhase2DomWithMatch();
    const pending = createPendingReport();
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(pending);

    messageHandler({ type: 'fillForm', pendingReport: pending });

    const scenarioSelect = document.querySelector<HTMLSelectElement>(SELECTORS.scenarioSelect);
    expect(scenarioSelect!.value).toBe(TEST_SCENARIO_OPTION_VALUE);
    const form = document.querySelector<HTMLFormElement>(SELECTORS.form);
    expect(form!.submit).toHaveBeenCalled();
    expect(sendMessageMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'manualScenarioRequired' }),
    );
  });

  it('enters manual mode when FORCE_MANUAL_KEY is set, regardless of match', () => {
    setupPhase2DomWithMatch();
    const pending = createPendingReport();
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(pending);

    messageHandler({ type: 'fillForm', pendingReport: pending, forceManualScenario: true });

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(MANUAL_SELECTION_KEY, 'true');
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'manualScenarioRequired', scenario: TEST_SCENARIO }),
    );
    // Force-manual flag should be removed after being consumed
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(FORCE_MANUAL_KEY);
  });
});

describe('onPageLoad manual selection', () => {
  beforeEach(() => {
    clearMocksAndStorage();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('sends manualSelectionActive when manual selection flag is set', () => {
    buildFormDom();
    const pending = createPendingReport();
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(pending);
    mockSessionStorage[MANUAL_SELECTION_KEY] = 'true';

    messageHandler({ type: 'fillForm' });

    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'manualSelectionActive', scenario: TEST_SCENARIO }),
    );
  });

  it('clears all state when pending report is expired with manual flag set', () => {
    buildFormDom();
    const expiredPending: PendingReport = {
      report: createTestReport(),
      timestamp: Date.now() - 60_000,
    };
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(expiredPending);
    mockSessionStorage[MANUAL_SELECTION_KEY] = 'true';

    messageHandler({ type: 'fillForm', pendingReport: expiredPending });

    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(MANUAL_SELECTION_KEY);
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(FORCE_MANUAL_KEY);
    expect(sendMessageMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'manualSelectionActive' }),
    );
  });
});

describe('handleContinueWithScenario', () => {
  beforeEach(() => {
    clearMocksAndStorage();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('calls executePhase3 when scenario is selected', () => {
    buildFormDom();
    const pending = createPendingReport();
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(pending);
    mockSessionStorage[MANUAL_SELECTION_KEY] = 'true';

    // Set scenario select to a non-default value (simulating user selection)
    const scenarioSelect = document.querySelector<HTMLSelectElement>(SELECTORS.scenarioSelect);
    scenarioSelect!.value = TEST_SCENARIO_OPTION_VALUE;

    messageHandler({ type: 'continueWithScenario' });

    // Manual selection flag should be cleared
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(MANUAL_SELECTION_KEY);
    // Phase 3 should execute — pending report cleared and success sent
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    );
  });

  it('sends error when no scenario selected', () => {
    buildFormDom();
    const pending = createPendingReport();
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(pending);
    mockSessionStorage[MANUAL_SELECTION_KEY] = 'true';

    // Leave scenario select at default empty value
    const scenarioSelect = document.querySelector<HTMLSelectElement>(SELECTORS.scenarioSelect);
    scenarioSelect!.value = '';

    messageHandler({ type: 'continueWithScenario' });

    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: 'No scenario has been selected. Please select a scenario from the dropdown first.',
      }),
    );
  });

  it('sends error when no pending report exists', () => {
    buildFormDom();

    messageHandler({ type: 'continueWithScenario' });

    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: 'No pending report found.',
      }),
    );
  });
});

describe('handleCancelManualSelection', () => {
  beforeEach(() => {
    clearMocksAndStorage();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('clears all workflow state', () => {
    buildFormDom();
    const pending = createPendingReport();
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(pending);
    mockSessionStorage[MANUAL_SELECTION_KEY] = 'true';

    messageHandler({ type: 'cancelManualSelection' });

    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(MANUAL_SELECTION_KEY);
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(FORCE_MANUAL_KEY);
  });
});

describe('message listener manual selection messages', () => {
  beforeEach(() => {
    clearMocksAndStorage();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('handles continueWithScenario message', () => {
    buildFormDom();
    const pending = createPendingReport();
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(pending);

    const scenarioSelect = document.querySelector<HTMLSelectElement>(SELECTORS.scenarioSelect);
    scenarioSelect!.value = TEST_SCENARIO_OPTION_VALUE;

    messageHandler({ type: 'continueWithScenario' });

    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    );
  });

  it('handles cancelManualSelection message', () => {
    buildFormDom();
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(createPendingReport());
    mockSessionStorage[MANUAL_SELECTION_KEY] = 'true';

    messageHandler({ type: 'cancelManualSelection' });

    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(MANUAL_SELECTION_KEY);
  });

  it('stores FORCE_MANUAL_KEY when fillForm has forceManualScenario true', () => {
    buildFormDom();
    const pending = createPendingReport();

    messageHandler({ type: 'fillForm', pendingReport: pending, forceManualScenario: true });

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(FORCE_MANUAL_KEY, 'true');
  });

  it('does not store FORCE_MANUAL_KEY when fillForm has no forceManualScenario', () => {
    buildFormDom();
    const pending = createPendingReport();

    messageHandler({ type: 'fillForm', pendingReport: pending });

    expect(sessionStorageMock.setItem).not.toHaveBeenCalledWith(FORCE_MANUAL_KEY, 'true');
  });
});
