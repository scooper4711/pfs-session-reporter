/**
 * Unit tests for the background service worker message routing.
 *
 * Validates: Requirement 1.5
 *
 * The service worker routes messages between the popup and content script:
 * - Popup messages (no sender.tab) → forwarded to active tab's content script
 * - Content script messages (has sender.tab) → forwarded to popup
 */

// --- Chrome API mocks ---

const mockAddListener = jest.fn();
const mockTabsQuery = jest.fn();
const mockTabsSendMessage = jest.fn();
const mockRuntimeSendMessage = jest.fn();

(globalThis as Record<string, unknown>).chrome = {
  runtime: {
    onMessage: { addListener: mockAddListener },
    sendMessage: mockRuntimeSendMessage,
  },
  tabs: {
    query: mockTabsQuery,
    sendMessage: mockTabsSendMessage,
  },
};

// Import after mocks are set — the module registers the listener at load time
import './service-worker';

// --- Helpers ---

type MessageListener = (
  message: Record<string, unknown>,
  sender: chrome.runtime.MessageSender,
) => void;

function getRegisteredListener(): MessageListener {
  expect(mockAddListener).toHaveBeenCalledTimes(1);
  return mockAddListener.mock.calls[0][0] as MessageListener;
}

// --- Tests ---

describe('Service Worker Message Routing', () => {
  let listener: MessageListener;

  beforeAll(() => {
    listener = getRegisteredListener();
  });

  beforeEach(() => {
    mockTabsQuery.mockReset();
    mockTabsSendMessage.mockReset();
    mockRuntimeSendMessage.mockReset();
  });

  it('registers a chrome.runtime.onMessage listener on load', () => {
    expect(mockAddListener).toHaveBeenCalledTimes(1);
    expect(typeof mockAddListener.mock.calls[0][0]).toBe('function');
  });

  it('forwards popup messages to the active tab content script', async () => {
    const activeTabId = 42;
    mockTabsQuery.mockResolvedValue([{ id: activeTabId }]);

    const message = { type: 'fillForm' };
    const popupSender = {} as chrome.runtime.MessageSender;

    listener(message, popupSender);

    // Allow the async forwardToContentScript to resolve
    await new Promise(process.nextTick);

    expect(mockTabsQuery).toHaveBeenCalledWith({
      active: true,
      currentWindow: true,
    });
    expect(mockTabsSendMessage).toHaveBeenCalledWith(activeTabId, message);
    expect(mockRuntimeSendMessage).not.toHaveBeenCalled();
  });

  it('forwards content script messages to the popup', () => {
    const message = {
      type: 'success',
      message: 'Form filled successfully. 4 player row(s) populated.',
      scenario: 'PFS2E 7-02',
    };
    const contentScriptSender = {
      tab: { id: 10 },
    } as chrome.runtime.MessageSender;

    listener(message, contentScriptSender);

    expect(mockRuntimeSendMessage).toHaveBeenCalledWith(message);
    expect(mockTabsQuery).not.toHaveBeenCalled();
    expect(mockTabsSendMessage).not.toHaveBeenCalled();
  });

  it('forwards error messages from content script to the popup', () => {
    const message = {
      type: 'error',
      message: 'Scenario not found in dropdown.',
    };
    const contentScriptSender = {
      tab: { id: 5 },
    } as chrome.runtime.MessageSender;

    listener(message, contentScriptSender);

    expect(mockRuntimeSendMessage).toHaveBeenCalledWith(message);
  });

  it('does not forward popup messages when no active tab is found', async () => {
    mockTabsQuery.mockResolvedValue([]);

    const message = { type: 'fillForm' };
    const popupSender = {} as chrome.runtime.MessageSender;

    listener(message, popupSender);

    await new Promise(process.nextTick);

    expect(mockTabsQuery).toHaveBeenCalled();
    expect(mockTabsSendMessage).not.toHaveBeenCalled();
  });

  it('does not forward popup messages when active tab has no id', async () => {
    mockTabsQuery.mockResolvedValue([{}]);

    const message = { type: 'fillForm' };
    const popupSender = {} as chrome.runtime.MessageSender;

    listener(message, popupSender);

    await new Promise(process.nextTick);

    expect(mockTabsQuery).toHaveBeenCalled();
    expect(mockTabsSendMessage).not.toHaveBeenCalled();
  });
});
