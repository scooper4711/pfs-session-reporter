/**
 * URL matching utilities for detecting the Paizo organized play reporting page.
 *
 * Checks whether a given URL matches the Paizo event reporter page pattern,
 * used by the popup to enable/disable the fill button based on the active tab.
 */

const PAIZO_REPORTING_PATH = '/cgi-bin/WebObjects/Store.woa/wa/PathfinderSociety/reportEvent';
const PAIZO_HOSTS = ['paizo.com', 'www.paizo.com'];

/**
 * Determines whether a URL is the Paizo organized play session reporting page.
 *
 * The actual Paizo reporting URL uses the CGI path pattern:
 * https://paizo.com/cgi-bin/WebObjects/Store.woa/wa/PathfinderSociety/reportEvent
 *
 * @param url - The URL string to check
 * @returns true if the URL matches the Paizo event reporter page pattern
 */
export function isPaizoReportingPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      PAIZO_HOSTS.includes(parsed.hostname) &&
      parsed.pathname.startsWith(PAIZO_REPORTING_PATH)
    );
  } catch {
    return false;
  }
}
