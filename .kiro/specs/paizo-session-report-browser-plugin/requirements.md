# Requirements Document

## Introduction

This feature is a Chrome/Edge browser extension (Manifest V3) that automates filling in the Paizo.com Pathfinder Society (second edition) session reporting form. The extension reads a SessionReport JSON string from the clipboard (produced by the "Copy Session Report" button in the pfs-chronicle-generator project), which may be either raw JSON or base64-encoded JSON. It decodes/parses the data and populates the corresponding form fields on the Paizo session reporting page. The extension lives as a standalone project in a sibling directory to pfs-chronicle-generator.

The first release supports PFS2E (Pathfinder Society second edition) only. Starfinder and PFS1E are out of scope.

The Paizo form uses server-side rendering with `onChange="this.form.submit()"` on both the session type and scenario dropdowns. Selecting either triggers a full page reload. The extension handles this via a stateless phase detection approach: on each page load, it inspects the current form state (session type selected, scenario selected) against the Session_Report data to determine which phase to execute next. The Session_Report data is persisted in sessionStorage across reloads, making the entire operation appear as a single click to the user.

Reference HTML samples used for form analysis:
- #[[file:sample_report_form_pfs2e.html]] — PFS2E form before scenario selection (no consume replay checkboxes)
- #[[file:sample_report_form_pfs2e_scenario.html]] — PFS2E form after scenario selection (consume replay checkboxes present)

## Glossary

- **Extension**: The Chrome/Edge browser extension (Manifest V3) that reads clipboard data and fills the Paizo session reporting form
- **Session_Report**: The JSON data structure containing session reporting data, placed on the clipboard by pfs-chronicle-generator (as raw JSON or base64-encoded JSON)
- **Paizo_Form**: The session reporting form on paizo.com where GMs report completed Pathfinder Society sessions
- **Extension_Popup**: The browser action popup UI displayed when the user clicks the extension icon in the browser toolbar
- **Content_Script**: The extension script injected into the Paizo_Form page that has access to the page DOM
- **Background_Script**: The Manifest V3 service worker that coordinates between the popup and content scripts
- **Sign_Up**: A single entry in the Session_Report signUps array representing either a player or the GM. Contains org play number, character number, character name, faction, reputation earned, consume replay flag, and an isGM boolean flag. The entry where isGM is true represents the GM's character data.
- **Reporting_Flag**: One of four boolean flags (A through D) indicating scenario missions accomplished
- **Clipboard_Data**: The SessionReport data read from the system clipboard via the Clipboard API, which may be either raw JSON or base64-encoded JSON
- **Pending_Report**: The Session_Report data stored in sessionStorage while the multi-phase workflow is in progress; its presence indicates the extension should check form state and continue filling
- **Session_Type_Select**: The dropdown (`id="9"`) for selecting the game system type, with `onChange="this.form.submit()"`
- **Scenario_Select**: The dropdown (`name="17.2.1.3.1.1.1.17"`) for selecting the scenario, with `onChange="this.form.submit()"`
- **Faction_Abbreviation_Map**: The mapping from full faction names (as stored in Session_Report) to the abbreviation codes used in Paizo_Form faction dropdowns (e.g., "Envoy's Alliance" → "EA")

## Requirements

### Requirement 1: Extension Structure and Manifest

**User Story:** As a developer, I want the extension to use Manifest V3 and follow Chrome extension best practices, so that it works on both Chrome and Edge browsers.

#### Acceptance Criteria

1. THE Extension SHALL use a Manifest V3 manifest.json file
2. THE Extension SHALL declare the "clipboardRead" permission to access clipboard data
3. THE Extension SHALL declare the "activeTab" permission to interact with the current tab
4. THE Extension SHALL declare a host permission pattern matching the Paizo session reporting page URL
5. THE Extension SHALL include a Background_Script implemented as a service worker
6. THE Extension SHALL include a Content_Script that targets the Paizo session reporting page
7. THE Extension SHALL include an Extension_Popup with a button to trigger the form-filling operation
8. THE Extension SHALL scope its functionality to PFS2E (Pathfinder Society second edition) only

### Requirement 2: Clipboard Reading and Decoding

**User Story:** As a GM, I want the extension to read the base64-encoded session report from my clipboard, so that I can transfer data from pfs-chronicle-generator to the Paizo form without manual entry.

#### Acceptance Criteria

1. WHEN the GM clicks the fill button in the Extension_Popup, THE Extension SHALL read the Clipboard_Data from the system clipboard using the Clipboard API
2. THE Extension SHALL attempt to parse the Clipboard_Data as raw JSON first; if that fails, THE Extension SHALL attempt to base64-decode the Clipboard_Data and then parse the result as JSON
3. THE Extension SHALL parse the resulting JSON string into a Session_Report object
4. IF the Clipboard_Data is neither valid JSON nor valid base64-encoded JSON, THEN THE Extension SHALL display an error message in the Extension_Popup indicating the clipboard does not contain valid session report data
5. IF the parsed JSON does not conform to the Session_Report structure, THEN THE Extension SHALL display an error message in the Extension_Popup indicating the data is not a valid session report
6. FOR ALL valid Session_Report objects, base64-encoding then decoding then JSON-parsing SHALL produce an equivalent object (round-trip property)

### Requirement 3: Session Report Validation

**User Story:** As a GM, I want the extension to validate the session report data before filling the form, so that I don't submit incomplete or malformed reports.

#### Acceptance Criteria

1. THE Extension SHALL validate that the Session_Report contains a non-empty gameDate string that starts with a valid date in ISO 8601 format (YYYY-MM-DD), optionally followed by a time and timezone component (e.g., `"2026-01-25"` or `"2026-01-25T12:30:00+00:00"`)
2. THE Extension SHALL validate that the Session_Report contains a non-empty scenario string
3. THE Extension SHALL validate that the Session_Report contains a non-empty gmOrgPlayNumber string
4. THE Extension SHALL validate that the Session_Report contains a signUps array with at least one entry
5. FOR EACH Sign_Up entry, THE Extension SHALL validate that orgPlayNumber is a non-empty string, characterNumber is a non-empty string, characterName is a non-empty string, and faction is a non-empty string
6. THE Extension SHALL validate that at most one Sign_Up entry has isGM set to true; IF more than one Sign_Up entry has isGM set to true, THEN validation SHALL fail with an error indicating multiple GM entries were found
7. THE Extension SHALL validate that the Session_Report gameSystem field is a supported value; IF gameSystem is not "PFS2E", THEN validation SHALL fail with an error indicating the game system is not supported at this time
8. IF validation fails, THEN THE Extension SHALL display the specific validation errors in the Extension_Popup and prevent form filling

### Requirement 4: Multi-Phase Form-Filling Workflow

**User Story:** As a GM, I want the extension to handle the Paizo form's server-side rendering across page reloads, so that session type and scenario selection happen automatically as a single-click operation.

#### Acceptance Criteria

1. WHEN the GM clicks the fill button, THE Extension SHALL store the Session_Report data in sessionStorage as the Pending_Report and begin the form-filling workflow
2. WHEN the Content_Script loads and a Pending_Report exists in sessionStorage, THE Content_Script SHALL inspect the current form state to determine which phase to execute
3. IF the Session_Type_Select does not have the value corresponding to the Session_Report gameSystem selected (e.g., value "4" for PFS2E), THE Content_Script SHALL set the Session_Type_Select to the correct value and programmatically call `this.form.submit()` on the form element (Phase 1 — session type selection)
4. THE Content_Script SHALL set the Session_Type_Select value without dispatching a DOM change event, to avoid triggering the inline `onChange="this.form.submit()"` handler prematurely
5. IF the Session_Type_Select already has the correct session type selected BUT the Scenario_Select does not have the correct scenario selected (matched per Requirement 5), THE Content_Script SHALL match and set the Scenario_Select value, then programmatically call `this.form.submit()` on the form element (Phase 2 — scenario selection)
6. THE Content_Script SHALL set the Scenario_Select value without dispatching a DOM change event, to avoid triggering the inline `onChange="this.form.submit()"` handler prematurely
7. IF both the Session_Type_Select and Scenario_Select already have the correct values selected, THE Content_Script SHALL fill all remaining form fields (date, GM info, player rows, reporting flags, consume replay) and clear the Pending_Report from sessionStorage (Phase 3 — field population)
8. THE Content_Script SHALL automatically continue the workflow on each page reload without requiring additional user interaction, as long as a Pending_Report exists in sessionStorage

### Requirement 5: Scenario Matching

**User Story:** As a GM, I want the extension to match the scenario identifier from the session report to the correct dropdown option, so that the right scenario is selected on the Paizo form.

#### Acceptance Criteria

1. THE Content_Script SHALL extract the scenario number from the Session_Report scenario string (e.g., extract "7-02" from "PFS2E 7-02")
2. THE Content_Script SHALL search the Scenario_Select option text values for an option containing the extracted scenario number in the format `#N-NN:` (e.g., `#7-02:`)
3. WHEN a matching option is found, THE Content_Script SHALL set the Scenario_Select to that option's value
4. IF no matching option is found, THEN THE Content_Script SHALL clear the Pending_Report from sessionStorage, display an error message indicating the scenario was not found in the dropdown, and stop the workflow

### Requirement 6: Date Format Conversion

**User Story:** As a GM, I want the extension to convert the ISO 8601 date from the session report to the Paizo form's expected format, so that the date field is populated correctly.

#### Acceptance Criteria

1. WHEN filling the date field (`#sessionDate`), THE Content_Script SHALL extract the date portion (first 10 characters, YYYY-MM-DD) from the Session_Report gameDate, discarding any time and timezone suffix, and convert it to the Paizo_Form date format (MM/DD/YYYY)
2. WHEN setting the date field value, THE Content_Script SHALL dispatch a change event so the jQuery UI datepicker recognizes the populated value
3. FOR ALL valid ISO 8601 date strings (with or without time/timezone suffix), extracting the date portion and converting to MM/DD/YYYY SHALL produce a valid date matching the original date component

### Requirement 7: GM Fields Population

**User Story:** As a GM, I want the extension to fill in the GM information fields on the Paizo form, so that my GM data is populated automatically.

#### Acceptance Criteria

1. WHEN filling the Paizo_Form in Phase 3, THE Content_Script SHALL set the `#gameMasterNumber` field to the Session_Report gmOrgPlayNumber value and dispatch a change event to trigger the `getGameMasterInfo()` AJAX lookup
2. WHEN filling the Paizo_Form in Phase 3, THE Content_Script SHALL find the Sign_Up entry where isGM is true and use its characterNumber to set the `#gameMasterCharacterNumber` field
3. WHEN filling the Paizo_Form in Phase 3, THE Content_Script SHALL find the Sign_Up entry where isGM is true and use its faction value to select the GM faction in the `#gmFactionSelect` dropdown using the Faction_Abbreviation_Map
4. WHEN filling the Paizo_Form in Phase 3, THE Content_Script SHALL find the Sign_Up entry where isGM is true and use its repEarned value to set the GM reputation field (identified by `name` attribute containing `35.15.5`)
5. IF no Sign_Up entry has isGM set to true, THEN THE Content_Script SHALL leave the GM character number, GM faction, and GM reputation fields empty

### Requirement 8: Faction Abbreviation Mapping

**User Story:** As a GM, I want the extension to correctly map faction names from the session report to the Paizo form's abbreviation-prefixed format, so that faction dropdowns are populated accurately.

#### Acceptance Criteria

1. THE Content_Script SHALL maintain a Faction_Abbreviation_Map that maps full faction names to their abbreviation codes: "Envoy's Alliance" → "EA", "Grand Archive" → "GA", "Horizon Hunters" → "HH", "Radiant Oath" → "RO", "Verdant Wheel" → "VW", "Vigilant Seal" → "VS"
2. WHEN selecting a faction in a dropdown, THE Content_Script SHALL find the option whose text starts with the mapped abbreviation code followed by " - " (e.g., "EA - Envoy's Alliance")
3. IF the Session_Report faction value does not match any entry in the Faction_Abbreviation_Map, THEN THE Content_Script SHALL leave the faction dropdown at its default selection and log a warning

### Requirement 9: Reporting Flags Population

**User Story:** As a GM, I want the extension to set the reporting flag checkboxes on the Paizo form, so that the scenario missions accomplished are captured accurately.

#### Acceptance Criteria

1. WHEN filling the Paizo_Form in Phase 3, THE Content_Script SHALL set reporting flag checkbox A (identified by `name="17.2.1.3.1.1.1.27.1"`) to the Session_Report reportingA value by setting the `.checked` property
2. WHEN filling the Paizo_Form in Phase 3, THE Content_Script SHALL set reporting flag checkbox B (identified by `name="17.2.1.3.1.1.1.27.3"`) to the Session_Report reportingB value by setting the `.checked` property
3. WHEN filling the Paizo_Form in Phase 3, THE Content_Script SHALL set reporting flag checkbox C (identified by `name="17.2.1.3.1.1.1.27.5"`) to the Session_Report reportingC value by setting the `.checked` property
4. WHEN filling the Paizo_Form in Phase 3, THE Content_Script SHALL set reporting flag checkbox D (identified by `name="17.2.1.3.1.1.1.27.7"`) to the Session_Report reportingD value by setting the `.checked` property

### Requirement 10: Player Sign-Up Population

**User Story:** As a GM, I want the extension to fill in each player's sign-up row on the Paizo form, so that all player data is populated automatically.

#### Acceptance Criteria

1. THE Content_Script SHALL filter the Session_Report signUps array to exclude the entry where isGM is true, producing a list of player Sign_Up entries
2. FOR EACH player Sign_Up entry (0-indexed), THE Content_Script SHALL populate the corresponding player row on the Paizo_Form using the row index N (0 through 5 by default)
2. FOR EACH player row, THE Content_Script SHALL set the `#{N}playerNumber` field to the Sign_Up orgPlayNumber value and dispatch a change event to trigger the `getCharacterInfo()` AJAX lookup
3. FOR EACH player row, THE Content_Script SHALL set the `#{N}characterNumber` field to the Sign_Up characterNumber value
4. FOR EACH player row, THE Content_Script SHALL set the `#{N}characterName` field to the Sign_Up characterName value
5. FOR EACH player row, THE Content_Script SHALL select the faction in the `#{N}FactionSelect` dropdown by matching the Sign_Up faction value using the Faction_Abbreviation_Map
6. FOR EACH player row, THE Content_Script SHALL set the `#{N}prestigePoints` field to the Sign_Up repEarned value
7. FOR EACH player row, THE Content_Script SHALL set the `#{N}consumesReplay` checkbox to the Sign_Up consumeReplay value by setting the `.checked` property (this checkbox only exists in Phase 3 after scenario selection)
8. WHEN setting text input fields (player number, character number, character name, prestige), THE Content_Script SHALL dispatch a change event so the Paizo_Form recognizes the populated values
9. IF the Paizo_Form has fewer player rows than Sign_Up entries, THEN THE Content_Script SHALL click the "Add Extra Character" submit button to add additional rows before populating them

### Requirement 11: Page Detection

**User Story:** As a GM, I want the extension to detect whether I'm on the Paizo session reporting page, so that it only attempts to fill the form on the correct page.

#### Acceptance Criteria

1. WHEN the Extension_Popup is opened, THE Extension SHALL check whether the active tab URL matches the Paizo event reporter page URL pattern
2. IF the active tab is not the Paizo session reporting page, THEN THE Extension_Popup SHALL display a message indicating the GM should navigate to the Paizo session reporting page and disable the fill button
3. IF the active tab is the Paizo session reporting page, THEN THE Extension_Popup SHALL enable the fill button

### Requirement 12: User Feedback and Status

**User Story:** As a GM, I want clear feedback about the form-filling operation, so that I know whether it succeeded or what went wrong.

#### Acceptance Criteria

1. WHEN the form-filling operation completes Phase 3 successfully, THE Extension_Popup SHALL display a success message indicating the number of player rows populated
2. IF the Content_Script cannot find expected form fields on the current page, THEN THE Extension_Popup SHALL display an error message indicating the current page does not appear to be the Paizo session reporting form
3. IF the clipboard is empty or inaccessible, THEN THE Extension_Popup SHALL display an error message indicating the clipboard could not be read
4. WHILE the multi-phase form-filling operation is in progress (session type and scenario selection involve page reloads), THE Extension_Popup SHALL display a loading indicator when open
5. THE Extension_Popup SHALL display the scenario name from the Session_Report after successful form filling, so the GM can verify the correct report was applied
6. IF a Pending_Report is present in sessionStorage when the Content_Script loads, THE Content_Script SHALL automatically continue the workflow without requiring additional user interaction

### Requirement 13: Extension Popup Interface

**User Story:** As a GM, I want a simple popup interface with a single action button, so that filling the form is a one-click operation.

#### Acceptance Criteria

1. THE Extension_Popup SHALL display the extension name and a brief description of its purpose
2. THE Extension_Popup SHALL display a "Fill Form" button as the primary action
3. THE Extension_Popup SHALL have a minimum width of 300 pixels for readability
4. THE Extension_Popup SHALL use a clean, readable visual style consistent with browser extension conventions

### Requirement 14: Event Dispatching Safety

**User Story:** As a developer, I want the extension to use the correct DOM interaction strategy for each field type, so that form submissions are not triggered prematurely and onChange handlers fire correctly.

#### Acceptance Criteria

1. WHEN setting the Session_Type_Select or Scenario_Select value, THE Content_Script SHALL set the `.value` property directly and call `form.submit()` programmatically, without dispatching a change event
2. WHEN setting text input fields (date, GM number, GM character number, GM name, player numbers, character numbers, character names, prestige/reputation), THE Content_Script SHALL set the `.value` property and dispatch a change event
3. WHEN setting faction select dropdowns (`#gmFactionSelect`, `#{N}FactionSelect`), THE Content_Script SHALL set the `.value` property and dispatch a change event (these dropdowns do not have `form.submit()` onChange handlers)
4. WHEN setting checkbox fields (reporting flags, consume replay), THE Content_Script SHALL set the `.checked` property directly

### Requirement 15: Workflow Resilience

**User Story:** As a GM, I want the extension to handle interruptions gracefully, so that a failed or abandoned workflow does not leave stale state.

#### Acceptance Criteria

1. IF the Pending_Report has been in sessionStorage for longer than 30 seconds without the workflow completing, THEN THE Content_Script SHALL clear the Pending_Report and stop the workflow
2. WHEN the GM clicks the fill button while a Pending_Report already exists in sessionStorage, THE Extension SHALL clear the existing Pending_Report and start a new workflow
3. IF an error occurs during any phase, THEN THE Content_Script SHALL clear the Pending_Report from sessionStorage and display the error in the Extension_Popup
