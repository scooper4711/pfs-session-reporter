/**
 * Popup logic for the PFS Session Reporter extension.
 *
 * Handles user interaction: reads clipboard data, parses and validates
 * the SessionReport, then sends it to the content script via the
 * background service worker to begin the form-filling workflow.
 */

import { parseClipboardData } from '../shared/clipboard-parser';
import { validateSessionReport } from '../shared/validation';
import { isPaizoReportingPage } from '../shared/url-matcher';
import { SessionReport, PendingReport } from '../shared/types';

interface PopupElements {
  fillButton: HTMLButtonElement;
  loading: HTMLElement;
  status: HTMLElement;
  manualSelection: HTMLElement;
  manualScenarioName: HTMLElement;
  continueButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
}

/**
 * Retrieves the popup DOM elements.
 * Returns null if any required element is missing.
 */
function getPopupElements(): PopupElements | null {
  const fillButton = document.querySelector<HTMLButtonElement>('#fillButton');
  const loading = document.querySelector<HTMLElement>('#loading');
  const status = document.querySelector<HTMLElement>('#status');
  const manualSelection = document.querySelector<HTMLElement>('#manualSelection');
  const manualScenarioName = document.querySelector<HTMLElement>('#manualScenarioName');
  const continueButton = document.querySelector<HTMLButtonElement>('#continueButton');
  const cancelButton = document.querySelector<HTMLButtonElement>('#cancelButton');

  if (!fillButton || !loading || !status || !manualSelection
      || !manualScenarioName || !continueButton || !cancelButton) {
    return null;
  }

  return {
    fillButton, loading, status,
    manualSelection, manualScenarioName, continueButton, cancelButton,
  };
}

/**
 * Shows the loading indicator and hides the status area.
 */
function showLoading(elements: PopupElements): void {
  elements.loading.classList.remove('hidden');
  elements.status.classList.add('hidden');
  elements.fillButton.disabled = true;
}

/**
 * Hides the loading indicator.
 */
function hideLoading(elements: PopupElements): void {
  elements.loading.classList.add('hidden');
  elements.fillButton.disabled = false;
}

/**
 * Displays an error message in the status area.
 */
function showError(elements: PopupElements, message: string): void {
  hideLoading(elements);
  elements.status.textContent = message;
  elements.status.className = 'status error';
  elements.status.classList.remove('hidden');
}

/**
 * Displays a success message in the status area.
 */
function showSuccess(elements: PopupElements, message: string): void {
  hideLoading(elements);
  elements.status.textContent = message;
  elements.status.className = 'status success';
  elements.status.classList.remove('hidden');
}

/**
 * Displays a message indicating the user is not on the Paizo page.
 */
function showNotOnPaizoPage(elements: PopupElements): void {
  elements.fillButton.disabled = true;
  elements.status.textContent =
    'Navigate to the Paizo session reporting page to use this extension.';
  elements.status.className = 'status error';
  elements.status.classList.remove('hidden');
}

/**
 * Shows the manual selection panel with the unmatched scenario name.
 * Hides the fill button, loading indicator, and status area.
 */
function showManualSelection(elements: PopupElements, scenario: string): void {
  elements.fillButton.classList.add('hidden');
  elements.loading.classList.add('hidden');
  elements.status.classList.add('hidden');
  elements.manualSelection.classList.remove('hidden');
  elements.manualScenarioName.textContent = scenario;
}

/**
 * Hides the manual selection panel and re-shows the fill button.
 */
function hideManualSelection(elements: PopupElements): void {
  elements.manualSelection.classList.add('hidden');
  elements.fillButton.classList.remove('hidden');
  elements.fillButton.disabled = false;
}

/**
 * Reads text from the system clipboard.
 * Returns the clipboard text or null if reading fails.
 */
async function readClipboard(): Promise<string | null> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

/**
 * Reads clipboard data, parses it as a SessionReport, and validates it.
 * Returns the validated SessionReport or throws with a user-facing message.
 */
async function readAndParseClipboard(): Promise<SessionReport> {
  const clipboardText = await readClipboard();

  if (clipboardText === null || clipboardText.length === 0) {
    throw new Error(
      'Could not read clipboard. Make sure you\'ve copied the session report data.',
    );
  }

  const report = parseClipboardData(clipboardText);
  if (!report) {
    throw new Error(
      'Clipboard does not contain valid session report data. Copy the report from pfs-chronicle-generator first.',
    );
  }

  const validation = validateSessionReport(report);
  if (!validation.valid) {
    throw new Error(validation.errors.join('\n'));
  }

  return report;
}

/**
 * Creates a PendingReport from a validated SessionReport.
 */
function createPendingReport(report: SessionReport): PendingReport {
  return { report, timestamp: Date.now() };
}

/**
 * Sends the fillForm message with the PendingReport to the background
 * script, which forwards it to the content script. The content script
 * stores the PendingReport in sessionStorage and starts the workflow.
 */
function sendFillFormMessage(
  pendingReport: PendingReport,
  forceManualScenario?: boolean,
): void {
  const message: Record<string, unknown> = {
    type: 'fillForm',
    pendingReport,
  };
  if (forceManualScenario) {
    message.forceManualScenario = true;
  }
  chrome.runtime.sendMessage(message);
}

/**
 * Queries the active tab URL and checks if it's the Paizo reporting page.
 */
async function checkActiveTabUrl(): Promise<boolean> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tabs[0]?.url;
  if (!url) {
    return false;
  }
  return isPaizoReportingPage(url);
}

/**
 * Handles the Fill Form button click.
 *
 * Reads clipboard data, parses and validates the SessionReport,
 * creates a PendingReport, and sends it to the content script
 * to begin the form-filling workflow.
 */
async function handleFillClick(elements: PopupElements, event: MouseEvent): Promise<void> {
  showLoading(elements);

  try {
    const report = await readAndParseClipboard();
    const pendingReport = createPendingReport(report);
    const forceManualScenario = event.altKey;
    sendFillFormMessage(pendingReport, forceManualScenario);
    hideLoading(elements);
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : 'An unexpected error occurred.';
    showError(elements, message);
  }
}

/**
 * Listens for messages from the background script (forwarded from
 * the content script). Updates the popup UI based on success or error.
 */
function listenForContentScriptMessages(elements: PopupElements): void {
  chrome.runtime.onMessage.addListener(
    (message: Record<string, unknown>) => {
      if (message.type === 'success') {
        const scenarioInfo = message.scenario
          ? `\nScenario: ${String(message.scenario)}`
          : '';
        showSuccess(elements, `${String(message.message)}${scenarioInfo}`);
      } else if (message.type === 'error') {
        hideManualSelection(elements);
        showError(elements, String(message.message));
      } else if (
        message.type === 'manualScenarioRequired'
        || message.type === 'manualSelectionActive'
      ) {
        showManualSelection(elements, String(message.scenario));
      }
    },
  );
}

/**
 * Initializes the popup on DOM content loaded.
 *
 * Checks if the active tab is on the Paizo reporting page,
 * enables/disables the fill button accordingly, and sets up
 * event listeners.
 */
async function initializePopup(): Promise<void> {
  const elements = getPopupElements();
  if (!elements) {
    return;
  }

  const isOnPaizoPage = await checkActiveTabUrl();
  if (!isOnPaizoPage) {
    showNotOnPaizoPage(elements);
    return;
  }

  elements.fillButton.addEventListener('click', (event: MouseEvent) => {
    handleFillClick(elements, event);
  });

  elements.continueButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'continueWithScenario' });
  });

  elements.cancelButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'cancelManualSelection' });
    hideManualSelection(elements);
  });

  listenForContentScriptMessages(elements);
}

document.addEventListener('DOMContentLoaded', initializePopup);
