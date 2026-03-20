# Implementation Plan: Paizo Session Report Browser Plugin

## Overview

Build a Chrome/Edge browser extension (Manifest V3) from scratch that reads SessionReport JSON from the clipboard and fills the Paizo.com PFS2E session reporting form across multiple page reloads. The project is greenfield — all scaffolding, build tooling, and source code must be created. Implementation follows the stateless phase detection approach defined in the design, with shared utility modules for parsing, validation, date conversion, faction mapping, and scenario matching.

## Tasks

- [x] 1. Scaffold project and configure build tooling
  - [x] 1.1 Create package.json with TypeScript, webpack, jest, fast-check, eslint dependencies
    - Initialize with `name: "pfs-session-reporter"`, set up scripts for build, test, lint
    - Include devDependencies: typescript, webpack, webpack-cli, ts-loader, copy-webpack-plugin, jest, ts-jest, @types/jest, @types/chrome, fast-check, eslint, @typescript-eslint/parser, @typescript-eslint/eslint-plugin
    - _Requirements: 1.1_
  - [x] 1.2 Create tsconfig.json for Chrome extension TypeScript compilation
    - Target ES2020, module ESNext, strict mode enabled, outDir dist/, rootDir src/
    - Include DOM lib for content script and popup code
    - _Requirements: 1.1_
  - [x] 1.3 Create webpack.config.js with multiple entry points
    - Entry points: popup/popup.ts, background/service-worker.ts, content/content-script.ts
    - Use copy-webpack-plugin to copy manifest.json, popup.html, popup.css to dist/
    - Output to dist/ directory
    - _Requirements: 1.1, 1.5, 1.6, 1.7_
  - [x] 1.4 Create eslint configuration aligned with coding standards
    - Configure @typescript-eslint, complexity rules, no-any warnings
    - _Requirements: 1.1_
  - [x] 1.5 Create jest.config.js for TypeScript testing with ts-jest
    - Configure ts-jest preset, testMatch for .test.ts and .property.test.ts files
    - _Requirements: 1.1_

- [x] 2. Create manifest.json and extension shell
  - [x] 2.1 Create src/manifest.json with Manifest V3 configuration
    - Declare permissions: clipboardRead, activeTab
    - Declare host_permissions for paizo.com session reporting URL pattern
    - Configure service_worker pointing to background/service-worker.js
    - Configure content_scripts targeting paizo.com reporting page with content/content-script.js
    - Configure browser_action/action with popup/popup.html
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  - [x] 2.2 Create src/popup/popup.html with basic extension popup structure
    - Include extension name, description, Fill Form button, status/error display area
    - Minimum width 300px, clean readable style
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - [x] 2.3 Create src/popup/popup.css with popup styles
    - Clean, readable visual style consistent with browser extension conventions
    - Loading indicator styles, error/success message styles
    - _Requirements: 13.3, 13.4, 12.4_

- [x] 3. Implement shared types and constants
  - [x] 3.1 Create src/shared/types.ts with SessionReport, SignUp, BonusRep, PendingReport, ValidationResult, Phase interfaces
    - Define all interfaces per the design data models section
    - Include PendingReport with report and timestamp fields
    - Define Phase type: 'session-type' | 'scenario' | 'fill-fields' | 'complete'
    - _Requirements: 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2_
  - [x] 3.2 Create src/constants/selectors.ts with all Paizo form DOM selectors
    - Define SELECTORS object with all form field selectors per design
    - Include player row template functions (playerNumber, characterNumber, etc.)
    - Define STORAGE_KEY, TIMEOUT_MS, GAME_SYSTEM_TO_SELECT_VALUE constants
    - _Requirements: 4.3, 4.5, 4.7, 7.1, 7.2, 7.3, 7.4, 9.1, 9.2, 9.3, 9.4, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
  - Git commit after completing tasks 2 and 3 with message: `feat: Add extension shell, manifest, types, and constants`

- [x] 4. Implement clipboard parser module
  - [x] 4.1 Create src/shared/clipboard-parser.ts with parseClipboardData, tryParseJson, tryBase64Decode
    - Try raw JSON parse first; on failure, try base64 decode then JSON parse
    - Return parsed SessionReport or null on failure
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 4.2 Write property tests for clipboard parser (src/shared/clipboard-parser.property.test.ts)
    - **Property 1: Clipboard data round-trip**
    - **Validates: Requirements 2.6**
  - [x] 4.3 Write property test for dual format acceptance (src/shared/clipboard-parser.property.test.ts)
    - **Property 2: Clipboard parser accepts both raw JSON and base64**
    - **Validates: Requirements 2.2, 2.3**
  - [x] 4.4 Write property test for invalid data rejection (src/shared/clipboard-parser.property.test.ts)
    - **Property 3: Invalid clipboard data rejection**
    - **Validates: Requirements 2.4**

- [x] 5. Implement validation module
  - [x] 5.1 Create src/shared/validation.ts with validateSessionReport, validateSignUp, validateSingleGmEntry, validateGameSystem
    - Validate all required fields per requirements 3.1-3.7
    - Collect all errors and return ValidationResult
    - Reject multiple isGM entries, unsupported gameSystem values
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_
  - [x] 5.2 Write property test for valid SessionReport acceptance (src/shared/validation.property.test.ts)
    - **Property 4: Validation accepts valid SessionReport objects**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
  - [x] 5.3 Write property test for invalid SessionReport rejection (src/shared/validation.property.test.ts)
    - **Property 5: Validation rejects SessionReport with missing required fields**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

- [x] 6. Checkpoint - Commit parsing and validation work
  - Ensure all tests pass. Git commit with message: `feat: Add clipboard parser and session report validation`

- [x] 7. Implement date utilities module
  - [x] 7.1 Create src/shared/date-utils.ts with convertToFormDate and extractDatePortion
    - Extract first 10 characters from ISO 8601 date string (handles time/timezone suffix)
    - Convert YYYY-MM-DD to MM/DD/YYYY format
    - _Requirements: 6.1, 6.3_
  - [x] 7.2 Write property test for date format conversion (src/shared/date-utils.property.test.ts)
    - **Property 8: Date format conversion**
    - **Validates: Requirements 6.1, 6.3**

- [x] 8. Implement faction map module
  - [x] 8.1 Create src/shared/faction-map.ts with FACTION_ABBREVIATION_MAP, getFactionAbbreviation, findFactionOptionValue
    - Map all six PFS2E factions to abbreviation codes
    - findFactionOptionValue searches select options for text starting with abbreviation + " - "
    - Return null for unknown factions
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 8.2 Write property test for faction abbreviation mapping (src/shared/faction-map.property.test.ts)
    - **Property 10: Faction abbreviation mapping**
    - **Validates: Requirements 8.1, 8.2**

- [x] 9. Implement scenario matcher module
  - [x] 9.1 Create src/shared/scenario-matcher.ts with findScenarioOption and extractScenarioNumber
    - Extract scenario number from format "PFS2E N-MM"
    - Search option text for "#N-MM:" pattern
    - Return matching option value or null
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 9.2 Write property test for scenario number extraction and matching (src/shared/scenario-matcher.property.test.ts)
    - **Property 7: Scenario number extraction and matching**
    - **Validates: Requirements 5.1, 5.2**

- [x] 10. Implement URL matcher and timeout utilities
  - [x] 10.1 Create src/shared/url-matcher.ts with isPaizoReportingPage function
    - Match Paizo organized play reporting URL pattern
    - _Requirements: 11.1, 11.2, 11.3_
  - [x] 10.2 Create src/shared/timeout-utils.ts with isExpired function for PendingReport timeout check
    - Return true if Date.now() - timestamp > 30000
    - _Requirements: 15.1_
  - [x] 10.3 Write property test for Paizo URL detection (src/shared/url-matcher.property.test.ts)
    - **Property 11: Paizo URL detection**
    - **Validates: Requirements 11.1**
  - [x] 10.4 Write property test for pending report timeout detection (src/shared/timeout-utils.property.test.ts)
    - **Property 12: Pending report timeout detection**
    - **Validates: Requirements 15.1**

- [x] 11. Implement signUp partitioning utility
  - [x] 11.1 Create src/shared/signup-utils.ts with extractGmSignUp and extractPlayerSignUps functions
    - extractGmSignUp returns the SignUp where isGM === true, or null
    - extractPlayerSignUps returns all SignUp entries where isGM === false, preserving order
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 10.1_
  - [x] 11.2 Write property test for GM and player partitioning (src/shared/signup-utils.property.test.ts)
    - **Property 9: GM and player partitioning from signUps**
    - **Validates: Requirements 7.2, 7.3, 7.4, 10.1, 10.2**

- [x] 12. Checkpoint - Commit all shared modules
  - Ensure all tests pass. Git commit with message: `feat: Add shared utility modules (date, faction, scenario, URL, timeout, signUp)`

- [x] 13. Implement content script with phase detection and form filling
  - [x] 13.1 Create src/content/content-script.ts with onPageLoad entry point
    - On load, check sessionStorage for Pending_Report
    - If present and not expired, call detectPhase and execute the appropriate phase
    - If expired, clear Pending_Report and stop
    - _Requirements: 4.2, 4.8, 15.1, 12.6_
  - [x] 13.2 Implement detectPhase function in content-script.ts
    - Inspect Session_Type_Select value against GAME_SYSTEM_TO_SELECT_VALUE for report's gameSystem
    - Inspect Scenario_Select against report's scenario using ScenarioMatcher
    - Return 'session-type', 'scenario', or 'fill-fields' accordingly
    - _Requirements: 4.2, 4.3, 4.5, 4.7_
  - [x] 13.3 Implement executePhase1 (session type selection) in content-script.ts
    - Set Session_Type_Select .value directly (no change event dispatch)
    - Call form.submit() programmatically
    - _Requirements: 4.3, 4.4, 14.1_
  - [x] 13.4 Implement executePhase2 (scenario selection) in content-script.ts
    - Use ScenarioMatcher to find matching option
    - Set Scenario_Select .value directly (no change event dispatch)
    - Call form.submit() programmatically
    - If no match found, clear Pending_Report and send error
    - _Requirements: 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 14.1_
  - [x] 13.5 Implement executePhase3 (field population) in content-script.ts
    - Set date field with change event dispatch (for jQuery datepicker)
    - Set GM fields: gmNumber with change event, gmCharacterNumber, gmFactionSelect with change event, gmReputation
    - Set reporting flag checkboxes via .checked property
    - Populate player rows: playerNumber with change event, characterNumber, characterName, factionSelect with change event, prestigePoints, consumesReplay .checked
    - Handle "Add Extra Character" button if more players than rows
    - Clear Pending_Report from sessionStorage on completion
    - Send success message to popup
    - _Requirements: 4.7, 6.1, 6.2, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 14.1, 14.2, 14.3, 14.4_
  - [x] 13.6 Write property test for phase detection (src/content/phase-detection.property.test.ts)
    - **Property 6: Phase detection correctness**
    - **Validates: Requirements 4.3, 4.5, 4.7**

- [x] 14. Implement background service worker
  - [x] 14.1 Create src/background/service-worker.ts with message routing
    - Listen for messages from popup, forward to content script via chrome.tabs.sendMessage
    - Listen for messages from content script, forward to popup via chrome.runtime.sendMessage
    - _Requirements: 1.5_

- [x] 15. Implement popup logic
  - [x] 15.1 Create src/popup/popup.ts with handleFillClick, readAndParseClipboard, updateUI
    - On Fill Form click: read clipboard, parse, validate, store Pending_Report in sessionStorage via content script, send fillForm message
    - Check active tab URL via url-matcher; disable button if not on Paizo page
    - Display loading indicator during multi-phase workflow
    - Display validation errors, scenario errors, success messages
    - Clear existing Pending_Report if starting new workflow
    - _Requirements: 2.1, 2.4, 2.5, 3.8, 4.1, 11.1, 11.2, 11.3, 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 15.2, 15.3_

- [x] 16. Checkpoint - Commit content script, service worker, and popup
  - Ensure all tests pass. Git commit with message: `feat: Add content script, service worker, and popup logic`

- [x] 17. Wire everything together and create .gitignore
  - [x] 17.1 Create .gitignore for the project
    - Ignore node_modules/, dist/, coverage/, *.js.map
    - _Requirements: 1.1_
  - [x] 17.2 Verify webpack build produces correct dist/ output
    - Ensure manifest.json, popup.html, popup.css are copied to dist/
    - Ensure all three entry points compile to dist/
    - _Requirements: 1.1, 1.5, 1.6, 1.7_

- [-] 18. Final checkpoint - Verify clean build and commit
  - Ensure all tests pass and extension builds cleanly. Git commit with message: `chore: Final wiring and build verification`

## Notes

- All tasks including property tests are required
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1-12)
- The design uses TypeScript throughout — all implementation uses TypeScript
- Git commits should happen at each checkpoint and after logical groupings of tasks (see commit messages in checkpoint tasks)
- All work should be done on a feature branch, not directly on main
- GM data comes from the signUp entry where isGM === true, not from top-level fields
- Phase detection is stateless — inspects form state vs Pending_Report data on each page load
