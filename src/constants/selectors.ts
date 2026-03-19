export const SELECTORS = {
  // Dropdowns with form.submit() onChange
  sessionTypeSelect: '#9',
  scenarioSelect: '[name="17.2.1.3.1.1.1.17"]',

  // Date field
  sessionDate: '#sessionDate',

  // GM fields
  gmNumber: '#gameMasterNumber',
  gmCharacterNumber: '#gameMasterCharacterNumber',
  gmName: '#gameMasterName',
  gmFactionSelect: '#gmFactionSelect',
  gmReputation: '[name*="35.15.5"]',

  // Reporting flags
  reportingA: '[name="17.2.1.3.1.1.1.27.1"]',
  reportingB: '[name="17.2.1.3.1.1.1.27.3"]',
  reportingC: '[name="17.2.1.3.1.1.1.27.5"]',
  reportingD: '[name="17.2.1.3.1.1.1.27.7"]',

  // Player row templates (N = 0-5)
  playerNumber: (n: number): string => `#${n}playerNumber`,
  characterNumber: (n: number): string => `#${n}characterNumber`,
  characterName: (n: number): string => `#${n}characterName`,
  factionSelect: (n: number): string => `#${n}FactionSelect`,
  prestigePoints: (n: number): string => `#${n}prestigePoints`,
  consumesReplay: (n: number): string =>
    `[name*="${n}consumesReplay"], [name*="43.${n}.1.9"]`,

  // Add Extra Character button
  addExtraCharacter: '[name="17.2.1.3.1.1.1.41"]',

  // Form element
  form: 'form[name="editObject"]',
} as const;

export const STORAGE_KEY = 'pfs_session_report_pending';

export const TIMEOUT_MS = 30_000;

export const GAME_SYSTEM_TO_SELECT_VALUE: Record<string, string> = {
  PFS2E: '4',
};
