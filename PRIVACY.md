# Privacy Policy — PFS Session Reporter

**Last updated:** April 21, 2026

## Summary

PFS Session Reporter does not collect, store, or transmit any personal data or user information. All processing happens locally in your browser.

## What the extension accesses

- **Clipboard:** Read once when you click "Fill Form," to get session report data you copied from pfs-chronicle-generator. The clipboard content is parsed, used to fill the Paizo form, and then discarded. It is never stored persistently or sent anywhere.

- **Page content on paizo.com:** The extension reads form element values (dropdown selections, field states) on the Paizo session reporting page to determine which workflow step to execute. It then writes session data into those same form fields. No page content is extracted, recorded, or transmitted.

- **Session storage:** The extension temporarily stores session report data in your browser's sessionStorage to persist state across the page reloads triggered by the Paizo form. This data is automatically cleared when the form is filled or after a 30-second timeout. It never leaves your browser.

## What the extension does NOT do

- Collect personal information
- Track browsing activity
- Send data to any server, analytics service, or third party
- Store data beyond the current browser session
- Access any website other than paizo.com session reporting pages

## Permissions explained

| Permission | Why it's needed |
|---|---|
| `clipboardRead` | Read session report data from clipboard on user action |
| `activeTab` | Check if the current tab is the Paizo reporting page |
| Host access to `paizo.com/cgi-bin/WebObjects/Store.woa/*` | Interact with the session reporting form DOM |

## Changes to this policy

If the extension's data practices change, this policy will be updated and the "Last updated" date revised. Since the extension auto-updates through the Chrome Web Store, users will always have the version matching the current policy.

## Contact

For questions about this privacy policy, open an issue on the [GitHub repository](https://github.com/scooper4711/pfs-session-reporter).
