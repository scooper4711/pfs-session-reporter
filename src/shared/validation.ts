import { SignUp, ValidationResult } from './types';
import { GAME_SYSTEM_TO_SELECT_VALUE } from '../constants/selectors';

const ISO_DATE_PREFIX_PATTERN = /^\d{4}-\d{2}-\d{2}/;

/**
 * Validate that a gameSystem value is supported.
 * Returns an error message if unsupported, or null if valid.
 */
export function validateGameSystem(gameSystem: string): string | null {
  if (!(gameSystem in GAME_SYSTEM_TO_SELECT_VALUE)) {
    return `Game system '${gameSystem}' is not supported at this time.`;
  }
  return null;
}

/**
 * Validate that at most one SignUp entry has isGM set to true.
 * Returns an error message if multiple GM entries found, or null if valid.
 */
export function validateSingleGmEntry(signUps: SignUp[]): string | null {
  const gmCount = signUps.filter((s) => s.isGM).length;
  if (gmCount > 1) {
    return 'Session report has multiple sign-up entries marked as GM.';
  }
  return null;
}

/**
 * Validate a single SignUp entry has all required non-empty string fields.
 * Returns an array of error messages (empty if valid).
 */
export function validateSignUp(signUp: SignUp, index: number): string[] {
  const errors: string[] = [];
  const requiredFields: Array<{ field: keyof SignUp; label: string }> = [
    { field: 'orgPlayNumber', label: 'orgPlayNumber' },
    { field: 'characterNumber', label: 'characterNumber' },
    { field: 'characterName', label: 'characterName' },
    { field: 'faction', label: 'faction' },
  ];

  for (const { field, label } of requiredFields) {
    const value = signUp[field];
    if (typeof value !== 'string' || value.length === 0) {
      errors.push(`Sign-up entry ${index}: missing ${label}.`);
    }
  }

  return errors;
}

/**
 * Validate a SessionReport object.
 * Checks all required fields per requirements 3.1-3.7.
 * Returns a ValidationResult with collected errors.
 */
export function validateSessionReport(report: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof report !== 'object' || report === null) {
    return { valid: false, errors: ['Session report is not a valid object.'] };
  }

  const r = report as Record<string, unknown>;

  if (typeof r.gameDate !== 'string' || !ISO_DATE_PREFIX_PATTERN.test(r.gameDate)) {
    errors.push('Session report is missing the game date.');
  }

  if (typeof r.scenario !== 'string' || r.scenario.length === 0) {
    errors.push('Session report is missing the scenario.');
  }

  if (typeof r.gmOrgPlayNumber !== 'string' || r.gmOrgPlayNumber.length === 0) {
    errors.push('Session report is missing the GM org play number.');
  }

  if (typeof r.gameSystem !== 'string') {
    errors.push("Game system '' is not supported at this time.");
  } else {
    const gameSystemError = validateGameSystem(r.gameSystem);
    if (gameSystemError) {
      errors.push(gameSystemError);
    }
  }

  if (!Array.isArray(r.signUps) || r.signUps.length === 0) {
    errors.push('Session report has no sign-up entries.');
  } else {
    const signUps = r.signUps as SignUp[];
    const gmError = validateSingleGmEntry(signUps);
    if (gmError) {
      errors.push(gmError);
    }
    for (let i = 0; i < signUps.length; i++) {
      const signUpErrors = validateSignUp(signUps[i], i);
      errors.push(...signUpErrors);
    }
  }

  return { valid: errors.length === 0, errors };
}
