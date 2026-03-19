# Contributing

## Getting started

```bash
npm install
npm run build
npm run lint
npm test
```

## Testing

### Automated tests (Jest + fast-check)

The shared modules (clipboard parser, validation, date utils, faction map, scenario matcher, signUp partitioning, URL matcher, timeout utils) are pure functions with no Chrome API dependencies. They are tested with Jest and fast-check:

```bash
npm test              # Run all tests
npm test -- --silent  # Run without console output
```

Property-based tests use fast-check to generate random inputs and verify correctness properties hold across all valid inputs. Unit tests cover specific examples and edge cases.

### DOM interaction tests (JSDOM)

The content script's DOM manipulation logic (phase detection, field population, event dispatching) is tested using JSDOM with mock HTML based on the sample Paizo form pages in the spec directory. Chrome API calls (`chrome.runtime.sendMessage`, `chrome.tabs.sendMessage`, `navigator.clipboard.readText`) are mocked in these tests.

### Manual end-to-end testing

For testing the full extension in a real browser:

1. Build the extension: `npm run build`
2. Open Chrome and go to `chrome://extensions` (or `edge://extensions` for Edge)
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` folder
5. Navigate to the Paizo session reporting page
6. Use pfs-chronicle-generator's "Copy Session Report" button to put data on your clipboard
7. Click the extension icon and press "Fill Form"

This is the only way to test the full workflow including clipboard access, cross-script messaging, and the multi-phase page reload behavior.

## Branching and commits

All work for features, bugfixes, and refactors must be done on branches. Never commit directly to main.

Branch naming:
- `feat/<feature-name>` for new features
- `fix/<bug-name>` for bugfixes
- `refactor/<scope>` for refactoring

Commit after each meaningful unit of work — don't batch everything into one giant commit at the end. Follow [Conventional Commits](https://www.conventionalcommits.org/) format.

## Before pushing

1. `npm run lint` — no lint errors
2. `npm test -- --silent` — all tests pass
3. `npm run build` — extension builds cleanly

All three must pass before pushing. No exceptions.
