/**
 * Faction name to abbreviation mapping for PFS2E factions.
 *
 * Maps full faction names (as stored in SessionReport) to the abbreviation
 * codes used in Paizo_Form faction dropdowns. The Paizo form displays
 * factions as "XX - Full Name" (e.g., "EA - Envoy's Alliance").
 */

const FACTION_ABBREVIATION_SEPARATOR = ' - ';

/**
 * Maps full PFS2E faction names to their two-letter abbreviation codes.
 */
export const FACTION_ABBREVIATION_MAP: Record<string, string> = {
  "Envoy's Alliance": 'EA',
  'Grand Archive': 'GA',
  'Horizon Hunters': 'HH',
  'Radiant Oath': 'RO',
  'Verdant Wheel': 'VW',
  'Vigilant Seal': 'VS',
};

/**
 * Returns the abbreviation code for a given faction name.
 *
 * @param factionName - Full faction name (e.g., "Envoy's Alliance")
 * @returns The abbreviation code (e.g., "EA"), or null if the faction is unknown
 */
export function getFactionAbbreviation(factionName: string): string | null {
  if (!Object.prototype.hasOwnProperty.call(FACTION_ABBREVIATION_MAP, factionName)) {
    return null;
  }
  return FACTION_ABBREVIATION_MAP[factionName] ?? null;
}

/**
 * Searches a faction select element's options for one whose text starts
 * with the mapped abbreviation followed by " - ".
 *
 * @param selectElement - The faction HTMLSelectElement to search
 * @param factionName - The full faction name from the SessionReport
 * @returns The matching option's value, or null if no match is found
 */
export function findFactionOptionValue(
  selectElement: HTMLSelectElement,
  factionName: string,
): string | null {
  const abbreviation = getFactionAbbreviation(factionName);
  if (!abbreviation) {
    return null;
  }

  const prefix = `${abbreviation}${FACTION_ABBREVIATION_SEPARATOR}`;

  for (const option of Array.from(selectElement.options)) {
    if (option.text.startsWith(prefix)) {
      return option.value;
    }
  }

  return null;
}
