/**
 * Bonus reputation matching, parsing, and validation utilities.
 *
 * Pure functions that match BonusRep entries from the SessionReport against
 * extracted checkbox data from the Paizo form. Handles case-insensitive
 * faction matching, prestige label parsing, and mismatch detection.
 *
 * All functions accept plain data parameters (no DOM elements) to enable
 * property-based testing without JSDOM.
 */

import type { BonusRep } from './types';

/**
 * Extracted checkbox data passed from the content script to pure functions.
 * Avoids passing DOM elements into the pure function layer.
 */
export interface CheckboxData {
  /** The faction name from the checkbox title attribute */
  title: string;
  /** The raw text content of the sibling prestige label <td>, e.g. "(2 prestige)" */
  prestigeLabelText: string | null;
  /** An identifier to correlate back to the DOM element (e.g., the name attribute) */
  identifier: string;
}

/**
 * A single match result for one BonusRep entry against one checkbox set.
 */
export interface CheckboxMatch {
  /** The identifier of the matched checkbox (from CheckboxData.identifier) */
  checkboxIdentifier: string;
  /** The faction name from the BonusRep entry */
  faction: string;
}

/**
 * The result of processing all BonusRep entries against both checkbox sets.
 */
export interface BonusRepResult {
  /** Number of BonusRep entries that matched at least one checkbox */
  matchedCount: number;
  /** Warning messages for unmatched factions and prestige mismatches */
  warnings: string[];
  /** Matched GM checkbox identifiers to set .checked = true */
  gmMatches: CheckboxMatch[];
  /** Matched Character checkbox identifiers to set .checked = true */
  characterMatches: CheckboxMatch[];
}

const PRESTIGE_PATTERN = /^\((\d+) prestige\)$/;

/**
 * Finds the CheckboxData entry whose title matches the given faction name
 * (case-insensitive comparison).
 *
 * @param faction - The faction name to search for
 * @param checkboxes - The checkbox data entries to search
 * @returns The matching CheckboxData, or null if no match is found
 */
export function findMatchingCheckbox(
  faction: string,
  checkboxes: CheckboxData[],
): CheckboxData | null {
  const lowerFaction = faction.toLowerCase();
  for (const checkbox of checkboxes) {
    if (checkbox.title.toLowerCase() === lowerFaction) {
      return checkbox;
    }
  }
  return null;
}

/**
 * Parses the integer prestige value from a prestige label string.
 * Expects the pattern "(N prestige)" where N is a non-negative integer.
 *
 * @param labelText - The raw text content of the prestige label element
 * @returns The parsed integer, or null if the string doesn't match the pattern
 */
export function parsePrestigeValue(labelText: string): number | null {
  const match = PRESTIGE_PATTERN.exec(labelText);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

/**
 * Collects prestige mismatch warnings for a matched BonusRep entry.
 *
 * Parses the prestige label from the matched checkbox and compares it
 * to the BonusRep reputation value. Adds appropriate warnings when the
 * label is unparseable or the values differ.
 */
function collectPrestigeWarnings(
  entry: BonusRep,
  matchedCheckbox: CheckboxData,
  warnings: string[],
): void {
  if (matchedCheckbox.prestigeLabelText === null) {
    warnings.push(
      `Could not parse prestige value for faction '${entry.faction}' — skipping mismatch check`,
    );
    return;
  }

  const parsedPrestige = parsePrestigeValue(matchedCheckbox.prestigeLabelText);
  if (parsedPrestige === null) {
    warnings.push(
      `Could not parse prestige value for faction '${entry.faction}' — skipping mismatch check`,
    );
    return;
  }

  if (entry.reputation !== parsedPrestige) {
    warnings.push(
      `Warning: ${entry.faction} reputation is ${entry.reputation} in session report but ${parsedPrestige} on form`,
    );
  }
}

/**
 * Processes all BonusRep entries against both GM and Character checkbox sets.
 *
 * For each BonusRep entry:
 * 1. Searches both checkbox sets for a title match (case-insensitive)
 * 2. If matched, parses the prestige label and compares to BonusRep.reputation
 * 3. Collects warnings for unmatched factions and prestige mismatches
 *
 * @param bonusRepEarned - The bonus reputation entries from the SessionReport
 * @param gmCheckboxes - Extracted data from GM faction objective checkboxes
 * @param characterCheckboxes - Extracted data from character faction objective checkboxes
 * @returns A BonusRepResult with matched checkbox identifiers and warnings
 */
export function processBonusReputation(
  bonusRepEarned: BonusRep[] | undefined,
  gmCheckboxes: CheckboxData[],
  characterCheckboxes: CheckboxData[],
): BonusRepResult {
  const result: BonusRepResult = {
    matchedCount: 0,
    warnings: [],
    gmMatches: [],
    characterMatches: [],
  };

  if (!bonusRepEarned || bonusRepEarned.length === 0) {
    return result;
  }

  for (const entry of bonusRepEarned) {
    const gmMatch = findMatchingCheckbox(entry.faction, gmCheckboxes);
    const charMatch = findMatchingCheckbox(entry.faction, characterCheckboxes);

    if (!gmMatch && !charMatch) {
      result.warnings.push(
        `Bonus reputation faction '${entry.faction}' not found among special faction objective checkboxes`,
      );
      continue;
    }

    result.matchedCount++;

    if (gmMatch) {
      result.gmMatches.push({
        checkboxIdentifier: gmMatch.identifier,
        faction: entry.faction,
      });
      collectPrestigeWarnings(entry, gmMatch, result.warnings);
    }

    if (charMatch) {
      result.characterMatches.push({
        checkboxIdentifier: charMatch.identifier,
        faction: entry.faction,
      });
    }
  }

  return result;
}
