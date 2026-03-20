/**
 * Timeout utilities for PendingReport expiration checks.
 *
 * Determines whether a PendingReport has exceeded the maximum allowed
 * time (30 seconds) without the workflow completing.
 */

import { TIMEOUT_MS } from '../constants/selectors';

/**
 * Checks whether a PendingReport timestamp has expired.
 *
 * @param timestamp - The timestamp (from Date.now()) when the PendingReport was stored
 * @returns true if the elapsed time exceeds the timeout threshold (30 seconds)
 */
export function isExpired(timestamp: number): boolean {
  return Date.now() - timestamp > TIMEOUT_MS;
}
