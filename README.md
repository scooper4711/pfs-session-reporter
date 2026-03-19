# PFS Session Reporter

A Chrome/Edge browser extension that automates filling in the [Paizo.com](https://paizo.com) Pathfinder Society session reporting form.

## What it does

After running a Pathfinder Society game, GMs need to report the session on paizo.com. The [pfs-chronicle-generator](https://github.com/bushonline/pfs-chronicle-generator) FoundryVTT module has a "Copy Session Report" button that puts the session data on your clipboard. This extension reads that data and fills in the Paizo reporting form automatically.

## Supported game systems

- Pathfinder Society (second edition) — PFS2E

Starfinder 2e support will be added in future releases.

## How to use

1. In FoundryVTT, use pfs-chronicle-generator's "Copy Session Report" button
2. Navigate to the Paizo session reporting page
3. Click the extension icon and press "Fill Form"
4. The extension handles the rest — including the page reloads triggered by session type and scenario selection

## Installation

### From source

```bash
npm install
npm run build
```

Then load the `dist/` directory as an unpacked extension in Chrome/Edge:
1. Go to `chrome://extensions` (or `edge://extensions`)
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` folder

## Development

```bash
npm install
npm run build    # Build the extension
npm run lint     # Run linter
npm test         # Run tests
```

## License

[MIT](LICENSE)
