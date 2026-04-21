# Implementation Plan: Manual Scenario Selection

## Overview

Add a manual scenario selection fallback to the PFS Session Reporter extension. When automatic scenario matching fails during Phase 2, the extension enters Manual Selection Mode — notifying the user via the popup, waiting for the user to manually select the scenario from the Paizo form dropdown, and then continuing with Phase 3 upon confirmation. Includes an Option/Alt key modifier to force manual selection for testing.

## Tasks

- [x] 1. Add new constants and pure decision functions
  - [x] 1.1 Add storage key constants to `src/constants/selectors.ts`
    - Add `MANUAL_SELECTION_KEY = 'pfs_manual_selection'` and `FORCE_MANUAL_KEY = 'pfs_force_manual_scenario'` exports
    - _Requirements: 1.2, 8.1, 9.4_

  - [x] 1.2 Create pure decision functions in `src/content/manual-selection.ts`
    - Implement `isScenarioSelected(scenarioSelectValue: string): boolean` — returns `true` for any non-empty, non-`'0'` value
    - Implement `shouldEnterManualMode(manualSelectionFlag: string | null, isReportExpired: boolean): boolean` — returns `true` when flag is `'true'` and report is not expired
    - Implement `buildManualScenarioMessage(scenario: string): { type: string; scenario: string }` — returns the `manualScenarioRequired` message payload
    - _Requirements: 1.3, 3.2, 3.5, 4.1, 7.1, 8.1_

  - [x] 1.3 Write property tests for pure decision functions in `src/content/manual-selection.property.test.ts`
    - **Property 1: Manual scenario message includes the unmatched scenario name**
    - **Validates: Requirements 1.3, 8.1**
    - **Property 2: Scenario select validation accepts any non-default value and rejects default values**
    - **Validates: Requirements 3.2, 3.5**
    - **Property 3: Manual selection flag prevents automatic phase execution**
    - **Validates: Requirements 4.1, 4.3**

  - [x] 1.4 Write unit tests for pure decision functions in `src/content/manual-selection.test.ts`
    - Test `isScenarioSelected` with empty string, `'0'`, and valid values
    - Test `shouldEnterManualMode` with all flag/expiry combinations
    - Test `buildManualScenarioMessage` returns correct shape
    - _Requirements: 1.3, 3.2, 3.5, 4.1_

- [x] 2. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Modify content script for manual selection flow
  - [x] 3.1 Add `enterManualSelectionMode` and `clearAllWorkflowState` helper functions to `src/content/content-script.ts`
    - `enterManualSelectionMode(scenario: string)` — sets `MANUAL_SELECTION_KEY` in sessionStorage and sends `manualScenarioRequired` message
    - `clearAllWorkflowState()` — clears `STORAGE_KEY`, `MANUAL_SELECTION_KEY`, and `FORCE_MANUAL_KEY` from sessionStorage
    - Import `MANUAL_SELECTION_KEY` and `FORCE_MANUAL_KEY` from `src/constants/selectors.ts`
    - Import `isScenarioSelected` from `src/content/manual-selection.ts`
    - _Requirements: 1.1, 1.2, 1.3, 6.3, 6.4_

  - [x] 3.2 Modify `executePhase2` in `src/content/content-script.ts` to enter manual selection mode on match failure
    - Check for `FORCE_MANUAL_KEY` in sessionStorage; if `'true'`, remove it and call `enterManualSelectionMode`
    - When `findScenarioOption` returns `null`, call `enterManualSelectionMode` instead of clearing the pending report and sending an error
    - When `findScenarioOption` returns a match, proceed with the existing automatic workflow unchanged
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 9.3_

  - [x] 3.3 Modify `onPageLoad` in `src/content/content-script.ts` to handle manual selection flag on reload
    - After reading the pending report and checking expiry, check `MANUAL_SELECTION_KEY` in sessionStorage
    - If manual selection flag is set and report is not expired, send `manualSelectionActive` message and return without executing any phase
    - If report is expired, call `clearAllWorkflowState` instead of just `clearPendingReport`
    - _Requirements: 4.1, 4.2, 4.3, 7.1, 7.2, 7.3_

  - [x] 3.4 Add `handleContinueWithScenario` and `handleCancelManualSelection` message handlers to `src/content/content-script.ts`
    - `handleContinueWithScenario` — reads pending report, validates scenario selection via `isScenarioSelected`, clears manual selection flag, and calls `executePhase3`; sends error if no report or no scenario selected
    - `handleCancelManualSelection` — calls `clearAllWorkflowState`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.2, 6.3, 6.4_

  - [x] 3.5 Extend the `chrome.runtime.onMessage.addListener` in `src/content/content-script.ts` to handle new message types
    - Handle `continueWithScenario` → call `handleContinueWithScenario`
    - Handle `cancelManualSelection` → call `handleCancelManualSelection`
    - On `fillForm`, if `message.forceManualScenario === true`, store `FORCE_MANUAL_KEY` in sessionStorage
    - _Requirements: 8.2, 8.3, 9.3, 9.4_

  - [x] 3.6 Write property tests for force-manual and match-bypass behavior in `src/content/manual-selection.property.test.ts`
    - **Property 4: Matching scenario bypasses manual selection mode**
    - **Validates: Requirements 5.1**
    - **Property 5: Force-manual flag enters manual selection mode regardless of match availability**
    - **Validates: Requirements 9.3**

  - [x] 3.7 Extend unit tests in `src/content/content-script.test.ts` for manual selection flow
    - Test `executePhase2` enters manual mode when `findScenarioOption` returns null
    - Test `executePhase2` proceeds normally when `findScenarioOption` returns a match
    - Test `executePhase2` enters manual mode when `FORCE_MANUAL_KEY` is set, regardless of match
    - Test `onPageLoad` sends `manualSelectionActive` when manual selection flag is set
    - Test `onPageLoad` clears all state when pending report is expired with manual flag set
    - Test `handleContinueWithScenario` calls `executePhase3` when scenario is selected
    - Test `handleContinueWithScenario` sends error when no scenario selected
    - Test `handleCancelManualSelection` clears all workflow state
    - Test message listener handles `continueWithScenario` and `cancelManualSelection`
    - _Requirements: 1.1, 1.2, 1.3, 3.2, 3.4, 3.5, 4.1, 4.2, 4.3, 5.1, 6.3, 6.4, 7.2, 7.3, 9.3_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update popup UI for manual selection mode
  - [x] 5.1 Add manual selection HTML elements to `src/popup/popup.html`
    - Add a `<div id="manualSelection">` panel (hidden by default) containing: header ("Scenario not found"), scenario name display (`<p id="manualScenarioName">`), instructions paragraph, "Continue with Selected Scenario" button (`#continueButton`), and "Cancel" button (`#cancelButton`)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1_

  - [x] 5.2 Add manual selection CSS styles to `src/popup/popup.css`
    - Style `.manual-selection`, `.manual-selection-header`, `.manual-selection-scenario`, `.manual-selection-instructions`, `.continue-button`, and `.cancel-button` per the design document
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 5.3 Modify `src/popup/popup.ts` to handle manual selection UI states
    - Extend `PopupElements` interface with `manualSelection`, `manualScenarioName`, `continueButton`, `cancelButton`
    - Update `getPopupElements` to query the new elements
    - Add `showManualSelection(elements, scenario)` — hides fill button, loading, and status; shows manual selection panel with scenario name
    - Add `hideManualSelection(elements)` — hides manual selection panel, re-shows fill button
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.3, 6.5_

  - [x] 5.4 Add Option/Alt key detection to `handleFillClick` in `src/popup/popup.ts`
    - Change `handleFillClick` to accept `MouseEvent` parameter
    - Read `event.altKey` and include `forceManualScenario: true` in the `fillForm` message when held
    - Update `sendFillFormMessage` to accept an optional `forceManualScenario` boolean parameter
    - Update the click event listener to pass the `MouseEvent` to `handleFillClick`
    - _Requirements: 9.1, 9.2_

  - [x] 5.5 Wire up Continue and Cancel button handlers in `src/popup/popup.ts`
    - Continue button sends `{ type: 'continueWithScenario' }` via `chrome.runtime.sendMessage`
    - Cancel button sends `{ type: 'cancelManualSelection' }` via `chrome.runtime.sendMessage` and calls `hideManualSelection`
    - _Requirements: 3.1, 6.1, 6.2, 6.5, 8.2, 8.3_

  - [x] 5.6 Extend `listenForContentScriptMessages` in `src/popup/popup.ts` to handle manual selection messages
    - Handle `manualScenarioRequired` and `manualSelectionActive` messages by calling `showManualSelection`
    - Handle `error` messages during manual selection by hiding the manual selection panel and showing the error
    - _Requirements: 2.1, 2.2, 2.3, 4.2, 8.1, 8.4_

  - [x] 5.7 Extend unit tests in `src/popup/popup.test.ts` for manual selection UI
    - Test `showManualSelection` hides fill button and shows manual selection panel with scenario name
    - Test `hideManualSelection` hides manual selection panel and re-shows fill button
    - Test Continue button sends `continueWithScenario` message
    - Test Cancel button sends `cancelManualSelection` message and hides manual selection panel
    - Test `handleFillClick` includes `forceManualScenario: true` when `altKey` is true
    - Test `handleFillClick` does not include `forceManualScenario` when `altKey` is false
    - Test message listener shows manual selection panel for `manualScenarioRequired` and `manualSelectionActive`
    - Test error during manual selection hides manual selection panel
    - _Requirements: 2.1, 2.3, 2.4, 3.1, 5.3, 6.1, 6.5, 9.1, 9.2_

- [x] 6. Final checkpoint — Ensure all tests pass and build succeeds
  - Run `npm test` and `npm run build` to verify everything compiles and all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The service worker requires no changes — it already forwards all message types bidirectionally
