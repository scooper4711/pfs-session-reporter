# Implementation Plan: Extra Reputation Reporting

## Overview

Add support for checking special faction objective checkboxes on the Paizo session reporting form during Phase 3. A new pure-function module (`bonus-rep.ts`) handles matching, parsing, and validation. The content script queries the DOM, delegates to the pure functions, and applies the results. Warnings (unmatched factions, prestige mismatches) are collected and surfaced in the success message without interrupting the workflow.

## Tasks

- [x] 1. Add faction objective checkbox selector constants
  - [x] 1.1 Add `gmFactionObjectiveCheckboxes` and `characterFactionObjectiveCheckboxes` selector constants to the `SELECTORS` object in `src/constants/selectors.ts`
    - `gmFactionObjectiveCheckboxes`: `'input[name^="17.2.1.3.1.1.1.31.1."]'`
    - `characterFactionObjectiveCheckboxes`: `'input[name^="17.2.1.3.1.1.1.33.1."]'`
    - _Requirements: 5.1, 5.2_

- [x] 2. Implement bonus reputation pure-function module
  - [x] 2.1 Create `src/shared/bonus-rep.ts` with interfaces and pure functions
    - Define `CheckboxData`, `CheckboxMatch`, and `BonusRepResult` interfaces
    - Implement `findMatchingCheckbox(faction, checkboxes)` — case-insensitive title match, returns matching `CheckboxData` or `null`
    - Implement `parsePrestigeValue(labelText)` — extracts integer N from `"(N prestige)"` pattern, returns `number | null`
    - Implement `processBonusReputation(bonusRepEarned, gmCheckboxes, characterCheckboxes)` — iterates `BonusRep` entries, matches against both checkbox sets, collects warnings for unmatched factions and prestige mismatches, returns `BonusRepResult`
    - Handle `undefined` and empty `bonusRepEarned` by returning an empty result
    - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 2.2 Write unit tests for `bonus-rep.ts` in `src/shared/bonus-rep.test.ts`
    - `findMatchingCheckbox`: exact case match, different casing, empty array, no match
    - `parsePrestigeValue`: valid `"(2 prestige)"`, zero `"(0 prestige)"`, empty string, missing parens `"2 prestige"`, non-numeric
    - `processBonusReputation`: undefined input, empty array, no checkboxes on form, one match, two matches, prestige mismatch warning, missing prestige label warning, unmatched faction warning
    - _Requirements: 2.1, 2.2, 2.5, 3.1, 3.2, 6.1, 6.2, 6.5_

  - [x] 2.3 Write property test: Case-insensitive faction matching finds correct checkbox
    - **Property 1: Case-insensitive faction matching finds correct checkbox**
    - Generate random faction name + random casing variation; create `CheckboxData[]` with one matching entry among decoys; assert `findMatchingCheckbox` returns the matching entry
    - **Validates: Requirements 2.1, 2.2**

  - [x] 2.4 Write property test: Unmatched faction returns null
    - **Property 2: Unmatched faction returns null**
    - Generate random faction name; create `CheckboxData[]` with no matching titles; assert `findMatchingCheckbox` returns `null`
    - **Validates: Requirements 2.5**

  - [x] 2.5 Write property test: Prestige label parsing round-trip
    - **Property 3: Prestige label parsing round-trip**
    - Generate random non-negative integer N → format as `"(N prestige)"` → parse → assert equals N. Also generate random non-matching strings → parse → assert `null`
    - **Validates: Requirements 6.1, 6.5**

  - [x] 2.6 Write property test: Prestige mismatch detection
    - **Property 4: Prestige mismatch detection**
    - Generate `BonusRep` with random reputation + `CheckboxData` with random prestige value → run `processBonusReputation` → assert warning present iff values differ
    - **Validates: Requirements 6.2, 6.4**

  - [x] 2.7 Write property test: Bonus reputation processing produces correct matched count
    - **Property 5: Bonus reputation processing produces correct matched count**
    - Generate random `BonusRep[]` and `CheckboxData[]` arrays with controlled overlap → run `processBonusReputation` → assert `matchedCount` equals expected count
    - **Validates: Requirements 4.2**

- [x] 3. Checkpoint
  - Ensure all tests pass (`npx jest --silent`), run lint (`npm run lint`), ask the user if questions arise.

- [x] 4. Integrate bonus reputation into Phase 3 workflow
  - [x] 4.1 Add `extractCheckboxData` and `populateBonusReputation` functions to `src/content/content-script.ts`
    - `extractCheckboxData`: reads `title` attribute and next sibling `<td>` text content from each checkbox input element, returns `CheckboxData[]`
    - `populateBonusReputation`: queries DOM for GM and character checkboxes using `SELECTORS`, extracts `CheckboxData`, calls `processBonusReputation`, sets `.checked = true` on matched checkboxes by identifier, logs warnings via `console.warn`, returns `BonusRepResult`
    - Import `CheckboxData`, `BonusRepResult`, `processBonusReputation` from `../shared/bonus-rep`
    - Import new selectors from `../constants/selectors`
    - _Requirements: 1.1, 1.2, 1.3, 2.3, 2.4, 4.1_

  - [x] 4.2 Modify `executePhase3` to call `populateBonusReputation` and update the success message
    - Call `populateBonusReputation(report)` after `populateDateAndFlags(report)` and before `populatePlayerRows(report)`
    - Include matched count in success message (e.g., `"2 extra reputation faction(s) checked."`)
    - Append any warnings from `BonusRepResult.warnings` to the success message
    - _Requirements: 4.1, 4.2, 4.3, 6.3_

  - [x] 4.3 Write unit tests for Phase 3 bonus reputation integration
    - Test that Phase 3 with `bonusRepEarned` checks the correct DOM checkboxes
    - Test that Phase 3 with empty `bonusRepEarned` completes without error
    - Test that Phase 3 with unmatched faction includes warning in success message
    - Test that Phase 3 with prestige mismatch includes warning in success message and checkbox is still checked
    - Test that success message includes bonus rep count
    - Test `extractCheckboxData` correctly reads title and sibling `<td>` text
    - _Requirements: 1.3, 2.5, 3.1, 4.1, 4.2, 4.3, 6.3, 6.4_

- [x] 5. Final checkpoint
  - Ensure all tests pass (`npx jest --silent`), run lint (`npm run lint`), ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` (already a devDependency) in `src/shared/bonus-rep.property.test.ts`
- Unit tests validate specific examples and edge cases
- All pure-function logic lives in `bonus-rep.ts`; DOM interaction stays in `content-script.ts`
