# Requirements Document

## Introduction

This feature adds a manual scenario selection fallback to the PFS Session Reporter browser extension. Currently, when the extension cannot automatically match the scenario from the clipboard data against the Paizo form's scenario dropdown (Phase 2), it shows an error and stops the workflow entirely. This leaves the GM with no way to continue without manually filling the entire form.

The desired behavior is: when auto-matching fails, the extension notifies the user that the scenario was not found, instructs the user to manually select the correct scenario from the Paizo form's dropdown (which triggers a page reload via the inline `onChange="this.form.submit()"`), and then automatically continues with Phase 3 (fill-fields) on the reloaded page. The extension needs a way for the user to confirm that the manually selected scenario is correct, since the extension can no longer verify the scenario programmatically.

Key constraint: selecting a scenario from the Paizo dropdown causes a full page reload. The extension already handles page reloads via the Pending_Report stored in sessionStorage. The manual selection flow must work within this existing reload-based architecture.

## Glossary

- **Content_Script**: The extension script injected into the Paizo_Form page that has access to the page DOM and executes the phase-based workflow
- **Extension_Popup**: The browser extension popup UI that displays status messages, buttons, and instructions to the GM
- **Service_Worker**: The background service worker that routes messages between the Extension_Popup and the Content_Script
- **Session_Report**: The JSON data structure containing session reporting data, placed on the clipboard by pfs-chronicle-generator
- **Pending_Report**: The wrapper object stored in sessionStorage containing the Session_Report and a timestamp, used to persist state across page reloads
- **Paizo_Form**: The session reporting form on paizo.com where GMs report completed Pathfinder Society sessions
- **Scenario_Select**: The scenario dropdown element on the Paizo_Form, identified by the selector `[name="17.2.1.3.1.1.1.17"]`, which triggers a form submission and page reload when its value changes
- **Phase**: One of the three workflow stages: `session-type` (Phase 1), `scenario` (Phase 2), or `fill-fields` (Phase 3)
- **Scenario_Matcher**: The module (`scenario-matcher.ts`) that extracts scenario numbers and matches them against Scenario_Select options
- **Manual_Selection_Mode**: The state in which the extension is waiting for the user to manually select a scenario from the Scenario_Select dropdown and confirm the selection

## Requirements

### Requirement 1: Detect Scenario Match Failure and Enter Manual Selection Mode

**User Story:** As a GM, I want the extension to let me manually select the scenario when automatic matching fails, so that I can continue filling the form instead of starting over.

#### Acceptance Criteria

1. WHEN the Scenario_Matcher returns no match for the Session_Report scenario during Phase 2, THE Content_Script SHALL retain the Pending_Report in sessionStorage instead of clearing it
2. WHEN the Scenario_Matcher returns no match for the Session_Report scenario during Phase 2, THE Content_Script SHALL store a manual selection flag in sessionStorage indicating that Manual_Selection_Mode is active
3. WHEN the Scenario_Matcher returns no match during Phase 2, THE Content_Script SHALL send a message to the Extension_Popup indicating that manual scenario selection is required, including the scenario name that failed to match

### Requirement 2: Display Manual Selection Instructions in the Popup

**User Story:** As a GM, I want clear instructions in the extension popup telling me what to do when the scenario cannot be found automatically, so that I know how to proceed.

#### Acceptance Criteria

1. WHEN the Extension_Popup receives a manual selection required message, THE Extension_Popup SHALL display the scenario name that failed to match
2. WHEN the Extension_Popup receives a manual selection required message, THE Extension_Popup SHALL display instructions telling the GM to select the correct scenario from the Paizo_Form dropdown
3. WHEN the Extension_Popup receives a manual selection required message, THE Extension_Popup SHALL display a "Continue with Selected Scenario" button that the GM can click after manually selecting the scenario
4. WHILE Manual_Selection_Mode is active, THE Extension_Popup SHALL hide the original "Fill Form" button to prevent the GM from restarting the workflow

### Requirement 3: Confirm Manual Selection and Continue Workflow

**User Story:** As a GM, I want to tell the extension that I have selected the correct scenario so that it continues filling the rest of the form.

#### Acceptance Criteria

1. WHEN the GM clicks the "Continue with Selected Scenario" button, THE Extension_Popup SHALL send a continue message to the Content_Script via the Service_Worker
2. WHEN the Content_Script receives the continue message while Manual_Selection_Mode is active, THE Content_Script SHALL verify that the Scenario_Select value is no longer the default empty value
3. WHEN the Scenario_Select has a non-default value and the continue message is received, THE Content_Script SHALL clear the manual selection flag from sessionStorage
4. WHEN the Scenario_Select has a non-default value and the continue message is received, THE Content_Script SHALL execute Phase 3 (fill-fields) using the Pending_Report data
5. IF the Scenario_Select still has the default empty value when the continue message is received, THEN THE Content_Script SHALL send an error message to the Extension_Popup indicating that no scenario has been selected

### Requirement 4: Handle Page Reload After Manual Scenario Selection

**User Story:** As a GM, I want the extension to handle the page reload that occurs when I select a scenario from the dropdown, so that the workflow continues seamlessly after the page reloads.

#### Acceptance Criteria

1. WHEN the page reloads and a Pending_Report exists in sessionStorage with the manual selection flag set, THE Content_Script SHALL not attempt automatic scenario matching
2. WHEN the page reloads and a Pending_Report exists with the manual selection flag set, THE Content_Script SHALL send a message to the Extension_Popup indicating that Manual_Selection_Mode is still active and the GM should confirm the selection
3. WHEN the page reloads and a Pending_Report exists with the manual selection flag set, THE Content_Script SHALL not automatically execute any phase

### Requirement 5: Preserve Existing Automatic Workflow

**User Story:** As a GM, I want the existing automatic scenario matching to continue working when it finds a match, so that the manual selection flow is only a fallback.

#### Acceptance Criteria

1. WHEN the Scenario_Matcher returns a match for the Session_Report scenario during Phase 2, THE Content_Script SHALL continue the automatic workflow without entering Manual_Selection_Mode
2. THE Content_Script SHALL not modify the behavior of Phase 1 (session-type) or Phase 3 (fill-fields) for reports that did not enter Manual_Selection_Mode
3. WHEN Manual_Selection_Mode is not active, THE Extension_Popup SHALL display the original "Fill Form" button and hide the "Continue with Selected Scenario" button

### Requirement 6: Allow Cancellation of Manual Selection

**User Story:** As a GM, I want to cancel the manual selection process if I decide not to continue, so that the extension does not remain in a stuck state.

#### Acceptance Criteria

1. WHILE Manual_Selection_Mode is active, THE Extension_Popup SHALL display a "Cancel" button alongside the "Continue with Selected Scenario" button
2. WHEN the GM clicks the "Cancel" button, THE Extension_Popup SHALL send a cancel message to the Content_Script via the Service_Worker
3. WHEN the Content_Script receives the cancel message, THE Content_Script SHALL clear the Pending_Report from sessionStorage
4. WHEN the Content_Script receives the cancel message, THE Content_Script SHALL clear the manual selection flag from sessionStorage
5. WHEN the cancel message is processed, THE Extension_Popup SHALL return to the initial state showing the "Fill Form" button

### Requirement 7: Timeout for Manual Selection Mode

**User Story:** As a GM, I want the manual selection mode to expire after a reasonable time, so that stale pending reports do not interfere with future sessions.

#### Acceptance Criteria

1. WHEN the page loads and a Pending_Report exists with the manual selection flag set, THE Content_Script SHALL check the Pending_Report timestamp against the existing timeout threshold (30 seconds)
2. IF the Pending_Report has expired, THEN THE Content_Script SHALL clear the Pending_Report and the manual selection flag from sessionStorage
3. IF the Pending_Report has expired, THEN THE Content_Script SHALL not enter Manual_Selection_Mode

### Requirement 8: Message Types for Manual Selection Communication

**User Story:** As a developer, I want well-defined message types for the manual selection flow, so that communication between the Extension_Popup, Service_Worker, and Content_Script is consistent and maintainable.

#### Acceptance Criteria

1. THE Content_Script SHALL use a `manualScenarioRequired` message type when notifying the Extension_Popup that manual selection is needed, including the `scenario` field with the unmatched scenario name
2. THE Extension_Popup SHALL use a `continueWithScenario` message type when the GM confirms the manual selection
3. THE Extension_Popup SHALL use a `cancelManualSelection` message type when the GM cancels the manual selection
4. THE Content_Script SHALL use a `manualSelectionActive` message type when notifying the Extension_Popup on page reload that Manual_Selection_Mode is still active

### Requirement 9: Option-Key Override for Testing Manual Selection Flow

**User Story:** As a developer, I want to force the manual selection flow by holding the Option key (Alt on Windows/Linux) when clicking "Fill Form", so that I can test the manual selection workflow without needing a scenario that genuinely fails to match.

#### Acceptance Criteria

1. WHEN the GM clicks the "Fill Form" button while holding the Option key (Alt key), THE Extension_Popup SHALL include a `forceManualScenario` flag set to `true` in the `fillForm` message sent to the Content_Script
2. WHEN the GM clicks the "Fill Form" button without holding the Option key, THE Extension_Popup SHALL NOT include the `forceManualScenario` flag (or set it to `false`) in the `fillForm` message
3. WHEN the Content_Script receives a `fillForm` message with `forceManualScenario` set to `true`, THE Content_Script SHALL skip automatic scenario matching during Phase 2 and enter Manual_Selection_Mode as if the Scenario_Matcher returned no match
4. WHEN `forceManualScenario` is `true`, THE Content_Script SHALL store the flag in sessionStorage alongside the Pending_Report so that it persists across the Phase 1 page reload
