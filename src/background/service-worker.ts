/**
 * Background service worker for the PFS Session Reporter extension.
 *
 * Acts as a message router between the popup and content script.
 * Messages from the popup (e.g., 'fillForm') are forwarded to the
 * active tab's content script. Messages from the content script
 * (e.g., 'success', 'error') are forwarded to the popup.
 */

/**
 * Finds the active tab in the current window.
 * Returns the tab ID or null if no active tab is found.
 */
async function findActiveTabId(): Promise<number | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0]?.id;
  return tabId ?? null;
}

/**
 * Forwards a message from the popup to the active tab's content script.
 */
async function forwardToContentScript(
  message: Record<string, unknown>,
): Promise<void> {
  const tabId = await findActiveTabId();
  if (tabId === null) {
    return;
  }
  chrome.tabs.sendMessage(tabId, message);
}

/**
 * Forwards a message from the content script to the popup.
 */
function forwardToPopup(message: Record<string, unknown>): void {
  chrome.runtime.sendMessage(message);
}

/**
 * Determines whether a message originates from a content script.
 * Content script messages include a sender.tab property.
 */
function isFromContentScript(sender: chrome.runtime.MessageSender): boolean {
  return sender.tab !== undefined;
}

/**
 * Determines whether a message originates from the popup.
 * Popup messages have no sender.tab property.
 */
function isFromPopup(sender: chrome.runtime.MessageSender): boolean {
  return sender.tab === undefined;
}

/**
 * Routes incoming messages between the popup and content script.
 *
 * - Messages from the popup (no sender.tab) are forwarded to the
 *   active tab's content script.
 * - Messages from a content script (has sender.tab) are forwarded
 *   to the popup via chrome.runtime.sendMessage.
 */
chrome.runtime.onMessage.addListener(
  (
    message: Record<string, unknown>,
    sender: chrome.runtime.MessageSender,
  ): void => {
    if (isFromPopup(sender)) {
      forwardToContentScript(message);
    } else if (isFromContentScript(sender)) {
      forwardToPopup(message);
    }
  },
);
