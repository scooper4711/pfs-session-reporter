# Requirements Document

## Introduction

This feature extends the pfs-session-reporter browser extension to handle "special faction objectives" — extra reputation checkboxes that appear on the Paizo session reporting form for certain scenarios. These checkboxes are scenario-specific: they only appear after a scenario is selected, and the number and factions vary by scenario. The extension already receives `bonusRepEarned` data in the SessionReport (an array of `BonusRep` entries with faction and reputation), but currently does nothing with it. This feature adds the logic to detect these checkboxes on the form and check them based on the `bonusRepEarned` data. Additionally, the extension validates that the reputation value in the session report matches the prestige value displayed on the form label, warning the GM of any discrepancies that could indicate data entry errors in the chronicle generator.

The Paizo form renders two sets of special faction objective checkboxes:
1. **GM checkboxes** — "Special faction objectives fulfilled for GM" (name pattern `17.2.1.3.1.1.1.31.1.{index}.3`)
2. **Character checkboxes** — "Special faction objectives fulfilled for all characters" (name pattern `17.2.1.3.1.1.1.33.1.{index}.3`)

Each checkbox has a `title` attribute containing the faction name (e.g., `title="Verdant Wheel"`). The extension matches `bonusRepEarned` entries to checkboxes by comparing the `BonusRep.faction` value against the checkbox `title` attribute. Both sets of checkboxes (GM and character) are checked for each matching faction in `bonusRepEarned`.

Reference HTML: `6-04Reporting.html` — PFS2E scenario 6-04 with Verdant Wheel and Vigilant Seal special faction objectives (2 prestige each).

## Glossary

- **Content_Script**: The extension script injected into the Paizo_Form page that has access to the page DOM
- **Session_Report**: The JSON data structure containing session reporting data, placed on the clipboard by pfs-chronicle-generator
- **Paizo_Form**: The session reporting form on paizo.com where GMs report completed Pathfinder Society sessions
- **BonusRep**: An entry in the Session_Report `bonusRepEarned` array, containing a `faction` string and a `reputation` number
- **GM_Faction_Objective_Checkbox**: A checkbox in the "Special faction objectives fulfilled for GM" section of the Paizo_Form, identified by a `name` attribute matching the pattern `17.2.1.3.1.1.1.31.1.{index}.3` and a `title` attribute containing the faction name
- **Character_Faction_Objective_Checkbox**: A checkbox in the "Special faction objectives fulfilled for all characters" section of the Paizo_Form, identified by a `name` attribute matching the pattern `17.2.1.3.1.1.1.33.1.{index}.3` and a `title` attribute containing the faction name
- **Faction_Objective_Checkbox**: A general term for either a GM_Faction_Objective_Checkbox or a Character_Faction_Objective_Checkbox
- **Prestige_Label**: The `<td>` element adjacent to a Faction_Objective_Checkbox that displays the expected prestige value in the format "(N prestige)", where N is an integer (e.g., "(2 prestige)")
- **Extension_Popup**: The browser extension popup UI that displays status messages and warnings to the GM

## Requirements

### Requirement 1: Detect Special Faction Objective Checkboxes

**User Story:** As a GM, I want the extension to detect whether the current scenario has special faction objective checkboxes on the form, so that extra reputation can be reported when applicable.

#### Acceptance Criteria

1. WHEN filling the Paizo_Form in Phase 3, THE Content_Script SHALL query the DOM for GM_Faction_Objective_Checkbox elements using the selector `input[name^="17.2.1.3.1.1.1.31.1."]`
2. WHEN filling the Paizo_Form in Phase 3, THE Content_Script SHALL query the DOM for Character_Faction_Objective_Checkbox elements using the selector `input[name^="17.2.1.3.1.1.1.33.1."]`
3. IF no Faction_Objective_Checkbox elements are found on the form, THEN THE Content_Script SHALL skip extra reputation processing without error

### Requirement 2: Match Bonus Reputation to Checkboxes by Faction Name

**User Story:** As a GM, I want the extension to match the bonus reputation data from the session report to the correct checkboxes on the form, so that the right factions are checked.

#### Acceptance Criteria

1. FOR EACH BonusRep entry in the Session_Report `bonusRepEarned` array, THE Content_Script SHALL search the GM_Faction_Objective_Checkbox elements for one whose `title` attribute matches the BonusRep `faction` value (case-insensitive comparison)
2. FOR EACH BonusRep entry in the Session_Report `bonusRepEarned` array, THE Content_Script SHALL search the Character_Faction_Objective_Checkbox elements for one whose `title` attribute matches the BonusRep `faction` value (case-insensitive comparison)
3. WHEN a matching GM_Faction_Objective_Checkbox is found, THE Content_Script SHALL set the checkbox `.checked` property to `true`
4. WHEN a matching Character_Faction_Objective_Checkbox is found, THE Content_Script SHALL set the checkbox `.checked` property to `true`
5. IF a BonusRep `faction` value does not match any Faction_Objective_Checkbox `title` attribute, THEN THE Content_Script SHALL log a warning indicating the faction was not found among the special faction objective checkboxes

### Requirement 3: Handle Empty Bonus Reputation Array

**User Story:** As a GM, I want the extension to handle scenarios with no bonus reputation gracefully, so that the form-filling workflow completes without error when there are no special faction objectives.

#### Acceptance Criteria

1. IF the Session_Report `bonusRepEarned` array is empty, THEN THE Content_Script SHALL skip extra reputation processing without error
2. IF the Session_Report `bonusRepEarned` array is undefined, THEN THE Content_Script SHALL treat the array as empty and skip extra reputation processing without error

### Requirement 4: Integrate Extra Reputation into Phase 3 Workflow

**User Story:** As a GM, I want extra reputation checkboxes to be filled as part of the existing single-click form-filling workflow, so that I do not need to take any additional action.

#### Acceptance Criteria

1. WHEN executing Phase 3 (fill-fields), THE Content_Script SHALL populate the Faction_Objective_Checkbox elements after populating the reporting flags and before populating the player rows
2. THE Content_Script SHALL include the count of matched extra reputation factions in the success message sent to the Extension_Popup (e.g., "Form filled successfully. 4 player row(s) populated. 2 extra reputation faction(s) checked.")
3. IF extra reputation processing encounters a warning (unmatched faction), THE Content_Script SHALL continue filling the remaining form fields without interrupting the workflow

### Requirement 5: Selector Constants for Faction Objective Checkboxes

**User Story:** As a developer, I want the DOM selectors for special faction objective checkboxes to be defined as named constants alongside the existing selectors, so that the codebase remains consistent and maintainable.

#### Acceptance Criteria

1. THE Content_Script SHALL define the GM_Faction_Objective_Checkbox selector prefix as a named constant in the selectors module: `input[name^="17.2.1.3.1.1.1.31.1."]`
2. THE Content_Script SHALL define the Character_Faction_Objective_Checkbox selector prefix as a named constant in the selectors module: `input[name^="17.2.1.3.1.1.1.33.1."]`

### Requirement 6: Warn on Prestige Value Mismatch

**User Story:** As a GM, I want the extension to warn me when the session report's reputation value for a faction does not match the prestige value shown on the Paizo form, so that I can catch data entry errors in the chronicle generator before submitting the report.

#### Acceptance Criteria

1. WHEN a BonusRep entry is matched to a Faction_Objective_Checkbox, THE Content_Script SHALL parse the integer prestige value from the sibling Prestige_Label element by extracting the number from the "(N prestige)" text pattern
2. WHEN the BonusRep `reputation` value does not equal the parsed Prestige_Label integer value, THE Content_Script SHALL log a warning indicating the faction name, the BonusRep `reputation` value, and the Prestige_Label value
3. WHEN a prestige mismatch warning is generated, THE Content_Script SHALL include the warning text in the success message sent to the Extension_Popup so the GM is aware of the discrepancy (e.g., "Warning: Verdant Wheel reputation is 1 in session report but 2 on form")
4. WHEN a prestige mismatch is detected, THE Content_Script SHALL still set the matching Faction_Objective_Checkbox `.checked` property to `true` (the mismatch is a warning, not a blocker)
5. IF the Prestige_Label element is missing or its text does not match the "(N prestige)" pattern, THEN THE Content_Script SHALL log a warning that the prestige value could not be parsed and skip the mismatch check for that faction
