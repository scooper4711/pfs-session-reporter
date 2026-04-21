# Requirements Document

## Introduction

Extend the pfs-session-reporter Chrome extension to support Starfinder Society (second edition) session reporting on the Paizo.com organized play form. The SFS2E reporting form shares the same structure as PFS2E (session type selection, scenario selection, field-filling phases) but lacks several PFS2E-specific fields: faction dropdowns, prestige/reputation fields, consume replay checkboxes, and special faction objective checkboxes. The extension must accept SFS2E session report JSON from pfs-chronicle-generator, select the correct game system and scenario on the Paizo form, and fill all applicable fields while gracefully skipping fields that do not exist on the SFS2E form.

## Glossary

- **Extension**: The pfs-session-reporter Chrome MV3 browser extension
- **Paizo_Form**: The Paizo.com organized play session reporting web form
- **Session_Report**: The JSON data structure containing session details, copied from pfs-chronicle-generator
- **Game_System_Map**: The `GAME_SYSTEM_TO_SELECT_VALUE` lookup table mapping game system identifiers to Paizo_Form dropdown values
- **Phase_Workflow**: The three-phase stateless content script workflow (session-type, scenario, fill-fields) that fills the Paizo_Form across page reloads
- **Scenario_Matcher**: The module that extracts a scenario number from the Session_Report scenario string and matches it against Paizo_Form dropdown options
- **Scenario_Select**: The scenario dropdown element on the Paizo_Form
- **Content_Script**: The content script injected into the Paizo_Form page that executes the Phase_Workflow
- **Popup**: The extension popup UI that reads clipboard data, validates it, and sends it to the Content_Script
- **Validation_Module**: The shared validation module that checks Session_Report objects for required fields and supported game systems

## Requirements

### Requirement 1: SFS2E Game System Registration

**User Story:** As a GM, I want the Extension to recognize "SFS2E" as a supported game system, so that I can report Starfinder Society 2e sessions.

#### Acceptance Criteria

1. THE Game_System_Map SHALL contain an entry mapping the key "SFS2E" to the Paizo_Form dropdown value "5"
2. WHEN a Session_Report with gameSystem "SFS2E" is validated, THE Validation_Module SHALL return a valid result with no game system errors
3. WHEN a Session_Report with gameSystem "SFS2E" is parsed from the clipboard, THE Popup SHALL accept the report and send it to the Content_Script

### Requirement 2: SFS2E Session Type Selection

**User Story:** As a GM, I want the Extension to select "Starfinder Society (second edition)" from the game system dropdown, so that the Paizo_Form loads the correct scenario list.

#### Acceptance Criteria

1. WHEN the Phase_Workflow executes the session-type phase for an SFS2E Session_Report, THE Content_Script SHALL set the game system dropdown to value "5"
2. WHEN the game system dropdown is set to value "5", THE Content_Script SHALL submit the Paizo_Form to trigger a page reload with the SFS2E scenario list

### Requirement 3: SFS2E Scenario Matching

**User Story:** As a GM, I want the Extension to automatically match my SFS2E scenario against the Paizo_Form dropdown options, so that the correct scenario is selected without manual intervention.

#### Acceptance Criteria

1. WHEN the Scenario_Matcher receives a scenario string in the format "SFS2E N-MM", THE Scenario_Matcher SHALL extract the scenario number "N-MM"
2. WHEN the extracted scenario number is "1-11", THE Scenario_Matcher SHALL find the Scenario_Select option whose text contains "#1-11:"
3. IF the Scenario_Matcher finds no matching option for the SFS2E scenario, THEN THE Content_Script SHALL enter manual selection mode and notify the Popup

### Requirement 4: SFS2E Field Population

**User Story:** As a GM, I want the Extension to fill all applicable fields on the SFS2E reporting form, so that I do not have to enter session details manually.

#### Acceptance Criteria

1. WHEN the Phase_Workflow executes the fill-fields phase for an SFS2E Session_Report, THE Content_Script SHALL set the session date field to the formatted game date
2. WHEN the Phase_Workflow executes the fill-fields phase for an SFS2E Session_Report, THE Content_Script SHALL set the GM number field to the GM org play number
3. WHEN the Phase_Workflow executes the fill-fields phase for an SFS2E Session_Report and a GM sign-up entry exists, THE Content_Script SHALL set the GM character number field
4. WHEN the Phase_Workflow executes the fill-fields phase for an SFS2E Session_Report, THE Content_Script SHALL set the reporting flag checkboxes (A, B, C, D) according to the Session_Report values
5. WHEN the Phase_Workflow executes the fill-fields phase for an SFS2E Session_Report, THE Content_Script SHALL populate each player row with the player number, character number, and character name from the Session_Report

### Requirement 5: Graceful Handling of Missing SFS2E Form Elements

**User Story:** As a GM, I want the Extension to skip fields that do not exist on the SFS2E form without errors, so that the form-filling workflow completes successfully.

#### Acceptance Criteria

1. WHEN the Content_Script attempts to set a faction dropdown that does not exist on the Paizo_Form, THE Content_Script SHALL skip the operation without raising an error
2. WHEN the Content_Script attempts to set a prestige or reputation field that does not exist on the Paizo_Form, THE Content_Script SHALL skip the operation without raising an error
3. WHEN the Content_Script attempts to set a consume replay checkbox that does not exist on the Paizo_Form, THE Content_Script SHALL skip the operation without raising an error
4. WHEN the Content_Script queries for special faction objective checkboxes that do not exist on the Paizo_Form, THE Content_Script SHALL process an empty result set without raising an error

### Requirement 6: SFS2E Phase Detection

**User Story:** As a GM, I want the Extension to correctly detect which workflow phase to execute on each SFS2E page load, so that the multi-page form-filling workflow proceeds without interruption.

#### Acceptance Criteria

1. WHEN the Paizo_Form game system dropdown value is not "5" and the Session_Report gameSystem is "SFS2E", THE Content_Script SHALL detect the session-type phase
2. WHEN the Paizo_Form game system dropdown value is "5" and the Scenario_Select value does not match the expected scenario, THE Content_Script SHALL detect the scenario phase
3. WHEN the Paizo_Form game system dropdown value is "5" and the Scenario_Select value matches the expected scenario, THE Content_Script SHALL detect the fill-fields phase

### Requirement 7: README Documentation Update

**User Story:** As a user, I want the README to list SFS2E as a supported game system, so that I know the Extension supports Starfinder Society 2e reporting.

#### Acceptance Criteria

1. THE README SHALL list "Starfinder Society (second edition) — SFS2E" in the supported game systems section
