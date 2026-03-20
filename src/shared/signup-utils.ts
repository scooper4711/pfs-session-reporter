import { SignUp } from './types';

/**
 * Extract the GM sign-up entry from a signUps array.
 * Returns the first entry where isGM === true, or null if none exists.
 */
export function extractGmSignUp(signUps: SignUp[]): SignUp | null {
  return signUps.find((signUp) => signUp.isGM) ?? null;
}

/**
 * Extract all player sign-up entries from a signUps array.
 * Returns entries where isGM === false, preserving original order.
 */
export function extractPlayerSignUps(signUps: SignUp[]): SignUp[] {
  return signUps.filter((signUp) => !signUp.isGM);
}
