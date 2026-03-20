/**
 * URL matching utilities for detecting the Paizo organized play reporting page.
 *
 * Checks whether a given URL matches the Paizo event reporter page pattern,
 * used by the popup to enable/disable the fill button based on the active tab.
 */

const PAIZO_REPORTING_PATH = '/organizedPlay/myAccount/eventReporter';
const PAIZO_HOST = 'www.paizo.com';

/**
 * Determines whether a URL is the Paizo organized play session reporting page.
 *
 * @param url - The URL string to check
 * @returns true if the URL matches the Paizo event reporter page pattern
 */
export function isPaizoReportingPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === PAIZO_HOST &&
      parsed.pathname.startsWith(PAIZO_REPORTING_PATH)
    );
  } catch {
    return false;
  }
}
