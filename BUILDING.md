# Building Chess Ultimate

## Prerequisites

- [Node.js](https://nodejs.org) v18 or later (includes npm)
- Windows 10/11 (for building the Windows exe)

## Setup

Clone the repo and install dependencies:

```bash
git clone https://github.com/Flopper1-1/Chess-Ultimate.git
cd Chess-Ultimate
npm install
```

## Run from source (no build needed)

```bash
npm start
```

This opens the launcher directly. No internet required, no build step.

## Build the exe

```bash
npm run build
```

This does three things automatically:
1. Packages the app with `@electron/packager`
2. Strips all non-English locales (~48MB saved)
3. Removes the Chromium license HTML (~20MB saved)

Output is at:
```
build-out/ChessUltimate-win32-x64/ChessUltimate.exe
```

The folder contains everything needed — just zip it and share, or run the exe directly.

## Expected sizes

| Item | Size |
|------|------|
| Full build folder | ~300MB |
| Zipped for distribution | ~220MB |

The size is normal — Electron bundles its own copy of Chromium (same as VS Code, Discord, Slack).

## Releasing to GitHub

After building:

```bash
# zip the build
Compress-Archive -Path build-out\ChessUltimate-win32-x64\* -DestinationPath ChessUltimate-v1.0.x-win64.zip

# create GitHub release (requires gh CLI — https://cli.github.com)
gh release create v1.0.x ChessUltimate-v1.0.x-win64.zip --title "Chess Ultimate v1.0.x" --notes "Release notes here"
```

Then delete the local zip (it's gitignored but no need to keep it):
```bash
del ChessUltimate-v1.0.x-win64.zip
```

## What NOT to commit

The `.gitignore` already excludes these — just be aware:
- `node_modules/` — reinstall with `npm install`
- `build-out/` and `dist-pkg/` — regenerate with `npm run build`
- `*.zip` — upload to GitHub Releases, don't commit
- `*.mp3` / `*.wav` — no audio files in this project (all sound is synthesized)
- `AGENTS.md` — local AI context file, not for the repo
