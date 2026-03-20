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

### From a release (recommended)

1. Go to the [Releases](../../releases) page and download the `.zip` file from the latest release
2. Unzip the file to a folder on your computer (remember where you put it)
3. Open your browser's extension management page:
   - Chrome: navigate to `chrome://extensions`
   - Edge: navigate to `edge://extensions`
4. Enable "Developer mode" using the toggle in the top-right corner
5. Click "Load unpacked"
6. Select the folder you unzipped in step 2 (the one containing `manifest.json`)
7. The extension icon should appear in your browser toolbar

To update to a new version, download the new release zip, unzip it to the same folder (overwriting the old files), then click the reload button on the extension card in `chrome://extensions`.

### From source

If you want to build it yourself:

```bash
git clone <repo-url>
cd pfs-session-reporter
npm install
npm run build
```

Then load the `dist/` directory as an unpacked extension using the steps above (starting from step 3).

## How releases are built

When a version tag (e.g. `v0.2.0`) is pushed to the repository, GitHub Actions automatically builds the extension, packages the `dist/` folder into a zip, and attaches it to a GitHub Release. No manual build step needed.

To create a release:

```bash
git tag v0.2.0
git push origin v0.2.0
```

## Development

```bash
npm install
npm run build    # Build the extension
npm run lint     # Run linter
npm test         # Run tests
```

## License

[MIT](LICENSE)
