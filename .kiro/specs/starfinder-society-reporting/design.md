# Design Document

## Overview

This design adds Starfinder Society 2e (SFS2E) support to the pfs-session-reporter Chrome extension. The change is minimal because the existing architecture already handles missing DOM elements gracefully. The primary change is adding a single entry to the `GAME_SYSTEM_TO_SELECT_VALUE` map. Existing validation, phase detection, scenario matching, and field population code all work for SFS2E without modification.

## Architecture

### Current Architecture (Unchanged)

The extension follows a three-layer Chrome MV3 architecture:

```
Popup → Background Service Worker → Content Script → Paizo Form
```

The content script implements a stateless three-phase workflow:
1. **Phase 1 (session-type)**: Sets game system dropdown, submits form (page reloads)
2. **Phase 2 (scenario)**: Sets scenario dropdown, submits form (page reloads)
3. **Phase 3 (fill-fields)**: Fills all remaining fields (date, GM, players, flags, bonus rep)

### Change Summary

| Component | Change | Rationale |
|-----------|--------|-----------|
| `src/constants/selectors.ts` | Add `SFS2E: '5'` to `GAME_SYSTEM_TO_SELECT_VALUE` | Registers SFS2E as a supported game system with its Paizo form dropdown value |
| `README.md` | Add SFS2E to supported game systems list | Documents the new capability |
| Test files | Extend existing property tests to cover SFS2E | Verifies SFS2E works through the same code paths |

### Why No Other Code Changes Are Needed

The existing code handles SFS2E without modification because:

1. **Validation** (`validation.ts`): `validateGameSystem` checks `gameSystem in GAME_SYSTEM_TO_SELECT_VALUE`. Adding the mapping is sufficient.

2. **Phase detection** (`content-script.ts`): `determinePhase` and `detectPhase` use `GAME_SYSTEM_TO_SELECT_VALUE[report.gameSystem]` to get the expected dropdown value. Adding the mapping makes this work for SFS2E.

3. **Phase 1** (`executePhase1`): Sets `sessionTypeSelect.value = expectedValue` where `expectedValue` comes from the map. Works generically.

4. **Phase 2** (`executePhase2`): `findScenarioOption` extracts the trailing `N-MM` from the scenario string (e.g., "SFS2E 1-11" → "1-11") and searches for `#1-11:` in option text. The SFS2E dropdown options contain this pattern (e.g., "SFS2 #1-11: Friends of the Forest").

5. **Phase 3** (`executePhase3`): All field-setting functions handle missing elements:
   - `setSelectWithChangeEvent`: Returns early if `!selectElement` (handles missing faction dropdowns)
   - `setInputValue`: Checks `if (element)` (handles missing prestige/reputation fields)
   - `setCheckbox`: Checks `if (element)` (handles missing consume replay checkboxes)
   - `populateBonusReputation`: `querySelectorAll` returns empty NodeList when checkboxes don't exist; `processBonusReputation` handles empty arrays

6. **Scenario matching** (`scenario-matcher.ts`): The regex `\s(\d+-\d+)$` extracts the number from any prefix, including "SFS2E".

7. **Clipboard parsing** (`clipboard-parser.ts`): Parses any valid JSON object. Game system validation happens separately.

## Correctness Properties

### Property 1: Validation accepts valid SFS2E SessionReport objects

**Requirement refs:** 1.2, 1.1

**Type:** Property-based test (extend existing Property 4)

**Description:** For all valid SessionReport objects with `gameSystem: 'SFS2E'`, `validateSessionReport` returns `{ valid: true, errors: [] }`.

**Approach:** Extend the existing `validSessionReportArbitrary` to use `fc.constantFrom('PFS2E', 'SFS2E')` for the `gameSystem` field. The existing Property 4 test then covers both game systems.

### Property 2: Scenario number extraction works for SFS2E scenario strings

**Requirement refs:** 3.1

**Type:** Property-based test (extend existing Property 7)

**Description:** For all scenario strings in the format "SFS2E N-MM", `extractScenarioNumber` returns "N-MM". The existing property test uses "PFS2E N-MM" — extending the prefix arbitrary to include "SFS2E" verifies the same extraction logic works for both systems.

**Approach:** Modify the existing Property 7 test to use `fc.constantFrom('PFS2E', 'SFS2E')` as the scenario prefix instead of hardcoding "PFS2E".

### Property 3: Phase detection works for SFS2E game system value

**Requirement refs:** 6.1, 6.2, 6.3

**Type:** Property-based test (extend existing Property 6)

**Description:** The `determinePhase` function correctly returns the appropriate phase for SFS2E reports. When the session type value doesn't match "5", it returns `session-type`. When it matches "5" but scenario doesn't match, it returns `scenario`. When both match, it returns `fill-fields`.

**Approach:** Extend the existing Property 6 tests to also test with the SFS2E expected value ("5") from `GAME_SYSTEM_TO_SELECT_VALUE`. The `determinePhase` function is game-system-agnostic — it compares values, not system names — so the existing tests already implicitly cover this. Adding explicit SFS2E value tests provides documentation value.

## Test Strategy

### Property-Based Tests (extend existing)

1. **validation.property.test.ts**: Change `gameSystem` arbitrary from `fc.constant('PFS2E')` to `fc.constantFrom('PFS2E', 'SFS2E')` in `validSessionReportArbitrary`. Also update the "rejects unsupported gameSystem" test to remove 'SFS2E' from the invalid values list.

2. **scenario-matcher.property.test.ts**: Change scenario prefix from hardcoded `"PFS2E"` to `fc.constantFrom('PFS2E', 'SFS2E')` in Property 7.

3. **phase-detection.property.test.ts**: Add test cases using `GAME_SYSTEM_TO_SELECT_VALUE['SFS2E']` alongside existing PFS2E tests.

### Example Tests (existing coverage sufficient)

The existing example tests in `content-script.test.ts` cover the DOM manipulation behavior. Since the same code paths execute for SFS2E (just with different dropdown values), no new example tests are needed for field population or missing element handling.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Paizo changes SFS2E dropdown value from "5" | Low | High | Value is confirmed from the live form HTML. If changed, only the map entry needs updating. |
| SFS2E scenario option text format differs from expected `#N-MM:` pattern | Low | Medium | Confirmed from `starfinder-report.html` that options use "SFS2 #1-11: Title" format. Manual selection fallback handles mismatches. |
| Future SFS2E form adds new fields not present today | Low | Low | Extension fills what exists and skips what doesn't. New fields would require a separate feature. |
