/**
 * @jest-environment jsdom
 */

/**
 * Unit tests for the popup module.
 *
 * Validates: Requirements 2.1, 2.4, 2.5, 3.8, 4.1, 11.1, 11.2, 11.3,
 *            12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 15.2, 15.3
 *
 * Tests popup initialization, clipboard reading, validation error display,
 * success/error message handling, and Paizo page detection.
 */

// --- Chrome API mocks ---

const mockOnMessageAddListener = jest.fn();
const mockTabsQuery = jest.fn();
const mockRuntimeSendMessage = jest.fn();

(globalThis as Record<string, unknown>).chrome = {
  runtime: {
    onMessage: { addListener: mockOnMessageAddListener },
    sendMessage: mockRuntimeSendMessage,
  },
  tabs: {
    query: mockTabsQuery,
  },
};

// --- Clipboard mock ---

const mockReadText = jest.fn();

Object.defineProperty(globalThis, 'navigator', {
  value: {
    clipboard: { readText: mockReadText },
  },
  writable: true,
});

// --- DOM setup helper ---

function setupPopupDom(): void {
  document.body.innerHTML = `
    <div class="container">
      <h1>PFS Session Reporter</h1>
      <p class="description">Fill the Paizo session reporting form from your clipboard data.</p>
      <button id="fillButton" type="button">Fill Form</button>
      <div id="loading" class="loading hidden" role="status" aria-live="polite">
        <span class="spinner"></span>
        <span>Filling form…</span>
      </div>
      <div id="status" class="status hidden" role="alert" aria-live="assertive"></div>
    </div>
  `;
}

// --- Valid SessionReport fixture ---

const VALID_SESSION_REPORT = JSON.stringify({
  gameDate: '2026-01-25',
  gameSystem: 'PFS2E',
  generateGmChronicle: true,
  gmOrgPlayNumber: '12345',
  repEarned: 0,
  reportingA: true,
  reportingB: true,
  reportingC: false,
  reportingD: false,
  scenario: 'PFS2E 7-02',
  signUps: [
    {
      isGM: true,
      orgPlayNumber: '12345',
      characterNumber: '2001',
      characterName: 'GM Character',
      consumeReplay: false,
      repEarned: 4,
      faction: "Envoy's Alliance",
    },
    {
      isGM: false,
      orgPlayNumber: '67890',
      characterNumber: '2002',
      characterName: 'Player One',
      consumeReplay: false,
      repEarned: 4,
      faction: 'Grand Archive',
    },
  ],
  bonusRepEarned: [],
});

const PAIZO_REPORTING_URL =
  'https://www.paizo.com/organizedPlay/myAccount/eventReporter/12345';

// --- Tests ---

/**
 * We need to test the popup module in isolation. Since it registers
 * a DOMContentLoaded listener on import, we trigger initialization
 * manually by dispatching the event after setting up the DOM.
 */

describe('Popup Module', () => {
  beforeEach(() => {
    jest.resetModules();
    mockOnMessageAddListener.mockReset();
    mockTabsQuery.mockReset();
    mockRuntimeSendMessage.mockReset();
    mockReadText.mockReset();
    setupPopupDom();
  });

  async function loadPopupModule(): Promise<void> {
    await import('./popup');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    // Allow async initializePopup to resolve
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);
  }

  function getButton(): HTMLButtonElement {
    return document.querySelector<HTMLButtonElement>('#fillButton')!;
  }

  function getStatus(): HTMLElement {
    return document.querySelector<HTMLElement>('#status')!;
  }

  function getLoading(): HTMLElement {
    return document.querySelector<HTMLElement>('#loading')!;
  }

  describe('page detection and initialization', () => {
    it('disables the fill button when not on Paizo page', async () => {
      mockTabsQuery.mockResolvedValue([
        { url: 'https://example.com/other-page' },
      ]);

      await loadPopupModule();

      expect(getButton().disabled).toBe(true);
      expect(getStatus().textContent).toContain(
        'Navigate to the Paizo session reporting page',
      );
      expect(getStatus().classList.contains('hidden')).toBe(false);
    });

    it('enables the fill button when on Paizo reporting page', async () => {
      mockTabsQuery.mockResolvedValue([{ url: PAIZO_REPORTING_URL }]);

      await loadPopupModule();

      expect(getButton().disabled).toBe(false);
      expect(getStatus().classList.contains('hidden')).toBe(true);
    });

    it('disables the fill button when no active tab URL', async () => {
      mockTabsQuery.mockResolvedValue([{}]);

      await loadPopupModule();

      expect(getButton().disabled).toBe(true);
    });

    it('disables the fill button when no tabs returned', async () => {
      mockTabsQuery.mockResolvedValue([]);

      await loadPopupModule();

      expect(getButton().disabled).toBe(true);
    });
  });

  describe('fill button click — clipboard errors', () => {
    beforeEach(async () => {
      mockTabsQuery.mockResolvedValue([{ url: PAIZO_REPORTING_URL }]);
      await loadPopupModule();
    });

    it('shows error when clipboard read fails', async () => {
      mockReadText.mockRejectedValue(new Error('Permission denied'));

      getButton().click();
      await new Promise(process.nextTick);
      await new Promise(process.nextTick);

      expect(getStatus().textContent).toContain('Could not read clipboard');
      expect(getStatus().classList.contains('error')).toBe(true);
    });

    it('shows error when clipboard is empty', async () => {
      mockReadText.mockResolvedValue('');

      getButton().click();
      await new Promise(process.nextTick);
      await new Promise(process.nextTick);

      expect(getStatus().textContent).toContain('Could not read clipboard');
    });
  });

  describe('fill button click — parse and validation errors', () => {
    beforeEach(async () => {
      mockTabsQuery.mockResolvedValue([{ url: PAIZO_REPORTING_URL }]);
      await loadPopupModule();
    });

    it('shows error when clipboard contains invalid data', async () => {
      mockReadText.mockResolvedValue('not valid json or base64');

      getButton().click();
      await new Promise(process.nextTick);
      await new Promise(process.nextTick);

      expect(getStatus().textContent).toContain(
        'Clipboard does not contain valid session report data',
      );
      expect(getStatus().classList.contains('error')).toBe(true);
    });

    it('shows validation errors for invalid session report', async () => {
      const invalidReport = JSON.stringify({
        gameDate: '',
        gameSystem: 'UNKNOWN',
        scenario: '',
        gmOrgPlayNumber: '',
        signUps: [],
        bonusRepEarned: [],
      });
      mockReadText.mockResolvedValue(invalidReport);

      getButton().click();
      await new Promise(process.nextTick);
      await new Promise(process.nextTick);

      const statusText = getStatus().textContent ?? '';
      expect(statusText).toContain('missing the game date');
      expect(getStatus().classList.contains('error')).toBe(true);
    });
  });

  describe('fill button click — successful workflow', () => {
    beforeEach(async () => {
      mockTabsQuery.mockResolvedValue([{ url: PAIZO_REPORTING_URL }]);
      await loadPopupModule();
    });

    it('sends fillForm message with pendingReport on valid clipboard data', async () => {
      mockReadText.mockResolvedValue(VALID_SESSION_REPORT);
      mockRuntimeSendMessage.mockClear();

      getButton().click();
      await new Promise(process.nextTick);
      await new Promise(process.nextTick);

      expect(mockRuntimeSendMessage).toHaveBeenCalled();
      const calls = mockRuntimeSendMessage.mock.calls;
      const fillFormCall = calls.find(
        (call: unknown[]) => (call[0] as Record<string, unknown>).type === 'fillForm',
      );
      expect(fillFormCall).toBeDefined();
      const sentMessage = fillFormCall![0] as Record<string, unknown>;
      expect(sentMessage.type).toBe('fillForm');
      const pendingReport = sentMessage.pendingReport as Record<string, unknown>;
      expect(pendingReport.report).toEqual(JSON.parse(VALID_SESSION_REPORT));
      expect(typeof pendingReport.timestamp).toBe('number');
    });

    it('shows loading indicator while processing', async () => {
      // Make readText hang so we can check loading state
      let resolveClipboard: (value: string) => void;
      mockReadText.mockReturnValue(
        new Promise<string>((resolve) => {
          resolveClipboard = resolve;
        }),
      );

      getButton().click();
      await new Promise(process.nextTick);

      expect(getLoading().classList.contains('hidden')).toBe(false);
      expect(getButton().disabled).toBe(true);

      // Resolve to complete the workflow
      resolveClipboard!(VALID_SESSION_REPORT);
      await new Promise(process.nextTick);
      await new Promise(process.nextTick);
    });

    it('accepts base64-encoded clipboard data', async () => {
      const base64Data = btoa(VALID_SESSION_REPORT);
      mockReadText.mockResolvedValue(base64Data);
      mockRuntimeSendMessage.mockClear();

      getButton().click();
      await new Promise(process.nextTick);
      await new Promise(process.nextTick);

      expect(mockRuntimeSendMessage).toHaveBeenCalled();
      const calls = mockRuntimeSendMessage.mock.calls;
      const fillFormCall = calls.find(
        (call: unknown[]) => (call[0] as Record<string, unknown>).type === 'fillForm',
      );
      expect(fillFormCall).toBeDefined();
      const sentMessage = fillFormCall![0] as Record<string, unknown>;
      expect(sentMessage.type).toBe('fillForm');
      const pendingReport = sentMessage.pendingReport as Record<string, unknown>;
      expect(pendingReport.report).toEqual(JSON.parse(VALID_SESSION_REPORT));
    });
  });

  describe('content script message handling', () => {
    beforeEach(async () => {
      mockTabsQuery.mockResolvedValue([{ url: PAIZO_REPORTING_URL }]);
      await loadPopupModule();
    });

    function getMessageListener(): (message: Record<string, unknown>) => void {
      expect(mockOnMessageAddListener).toHaveBeenCalled();
      const lastCall = mockOnMessageAddListener.mock.calls.length - 1;
      return mockOnMessageAddListener.mock.calls[lastCall][0];
    }

    it('displays success message from content script', () => {
      const listener = getMessageListener();

      listener({
        type: 'success',
        message: 'Form filled successfully. 4 player row(s) populated.',
        scenario: 'PFS2E 7-02',
      });

      const statusText = getStatus().textContent ?? '';
      expect(statusText).toContain('Form filled successfully');
      expect(statusText).toContain('PFS2E 7-02');
      expect(getStatus().classList.contains('success')).toBe(true);
    });

    it('displays error message from content script', () => {
      const listener = getMessageListener();

      listener({
        type: 'error',
        message: 'Scenario not found in the Paizo form dropdown.',
      });

      expect(getStatus().textContent).toContain('Scenario not found');
      expect(getStatus().classList.contains('error')).toBe(true);
    });

    it('displays success message without scenario when not provided', () => {
      const listener = getMessageListener();

      listener({
        type: 'success',
        message: 'Form filled successfully. 2 player row(s) populated.',
      });

      const statusText = getStatus().textContent ?? '';
      expect(statusText).toContain('Form filled successfully');
      expect(statusText).not.toContain('Scenario:');
    });
  });
});
