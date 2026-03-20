/**
 * URL matching utilities for detecting the Paizo organized play reporting page.
 *
 * Checks whether a given URL matches the Paizo event reporter page pattern,
 * used by the popup to enable/disable the fill button based on the active tab.
 */

/**
 * Common path prefix for the Paizo WebObjects application.
 *
 * The Paizo reporting form uses WebObjects, which generates dynamic URLs.
 * The initial URL looks like:
 *   /cgi-bin/WebObjects/Store.woa/wa/PathfinderSociety/reportEvent?event=...
 * After selecting a game system and scenario, the URL changes to:
 *   /cgi-bin/WebObjects/Store.woa/160/wo/EtXfNp25Bq9yX4lrttbFJ0/2.17.2.1.3.1.1.1
 *
 * The stable prefix across all form pages is /cgi-bin/WebObjects/Store.woa/.
 */
const PAIZO_WEBOBJECTS_PATH_PREFIX = '/cgi-bin/WebObjects/Store.woa/';
const PAIZO_HOSTS = ['paizo.com', 'www.paizo.com'];

/**
 * Determines whether a URL is the Paizo organized play session reporting page.
 *
 * Matches any URL under the Paizo WebObjects Store application, since the
 * reporting form navigates through multiple dynamic URLs within that prefix.
 *
 * @param url - The URL string to check
 * @returns true if the URL matches the Paizo WebObjects application pattern
 */
export function isPaizoReportingPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      PAIZO_HOSTS.includes(parsed.hostname) &&
      parsed.pathname.startsWith(PAIZO_WEBOBJECTS_PATH_PREFIX)
    );
  } catch {
    return false;
  }
}
