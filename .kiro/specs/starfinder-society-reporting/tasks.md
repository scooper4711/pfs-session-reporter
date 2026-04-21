# Tasks

## Task 1: Add SFS2E to Game System Map

- [x] 1.1 Add `SFS2E: '5'` entry to `GAME_SYSTEM_TO_SELECT_VALUE` in `src/constants/selectors.ts`
- [x] 1.2 Update `validSessionReportArbitrary` in `src/shared/validation.property.test.ts` to use `fc.constantFrom('PFS2E', 'SFS2E')` for the `gameSystem` field
- [x] 1.3 Update the "rejects unsupported gameSystem" test in `src/shared/validation.property.test.ts` to remove `'SFS2E'` from the invalid values list
- [x] 1.4 Verify all validation tests pass

## Task 2: Extend Scenario Matcher Property Tests for SFS2E

- [x] 2.1 Update Property 7 in `src/shared/scenario-matcher.property.test.ts` to use `fc.constantFrom('PFS2E', 'SFS2E')` as the scenario prefix instead of hardcoded `"PFS2E"`
- [x] 2.2 Update Property 7a in `src/shared/scenario-matcher.property.test.ts` to use the same prefix arbitrary
- [x] 2.3 Verify all scenario matcher tests pass

## Task 3: Extend Phase Detection Property Tests for SFS2E

- [x] 3.1 Add SFS2E phase detection test cases in `src/content/phase-detection.property.test.ts` that use `GAME_SYSTEM_TO_SELECT_VALUE['SFS2E']` as the expected session type value
- [x] 3.2 Verify all phase detection tests pass

## Task 4: Update README

- [x] 4.1 Add "Starfinder Society (second edition) — SFS2E" to the supported game systems section in `README.md`
- [x] 4.2 Remove or update the "Starfinder 2e support will be added in future releases" note

## Task 5: Final Verification

- [x] 5.1 Run the full test suite and verify all tests pass
- [x] 5.2 Run the linter and verify no errors
- [x] 5.3 Run the build and verify it succeeds
