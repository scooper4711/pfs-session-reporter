/**
 * Unit tests for content-script.ts
 *
 * Tests the DOM manipulation functions (phases 1-3), message handling,
 * and the onPageLoad entry point. Uses jsdom (via jest-environment-jsdom
 * override) to provide a realistic DOM environment.
 *
 * @jest-environment jsdom
 */

import { SELECTORS, STORAGE_KEY, GAME_SYSTEM_TO_SELECT_VALUE } from '../constants/selectors';
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

  it('sends error when scenario is not found in phase 2', () => {
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
      expect.objectContaining({ type: 'error' }),
    );
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

  it('clears expired pending reports', () => {
    buildFormDom();
    const expiredPending: PendingReport = {
      report: createTestReport(),
      timestamp: Date.now() - 60_000,
    };
    mockSessionStorage[STORAGE_KEY] = JSON.stringify(expiredPending);

    messageHandler({ type: 'fillForm', pendingReport: expiredPending });

    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });
});
