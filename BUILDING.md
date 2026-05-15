# Building & Releasing Chess Ultimate

## Build

```bash
npm install
npm run build
```

Output: `build-out/ChessUltimate-win32-x64/`

The build script (`build-strip.js`) runs automatically after packaging and:
- Strips all non-English locales (~48MB saved)
- Removes `LICENSES.chromium.html` (~20MB saved)

## Release to GitHub

```powershell
# Zip the build (PowerShell)
Compress-Archive -Path build-out\ChessUltimate-win32-x64\* -DestinationPath ChessUltimate-v1.x.x-win64.zip

# Create release (requires gh CLI — https://cli.github.com)
gh release create v1.x.x ChessUltimate-v1.x.x-win64.zip --title "Chess Ultimate v1.x.x" --notes "What changed"

# Clean up zip locally (gitignored but no need to keep it)
del ChessUltimate-v1.x.x-win64.zip
```

## What's gitignored

| Path | Reason |
|------|--------|
| `node_modules/` | Reinstall with `npm install` |
| `build-out/` | Regenerate with `npm run build` |
| `dist-pkg/` | Old build folder |
| `*.zip` | Upload to Releases, don't commit |
| `*.mp3`, `*.wav`, `*.ogg` | No audio files — all sound is synthesized |
| `.vscode/` | Editor config |
| `AGENTS.md` | Local AI context, not for the repo |
| `build-strip.js` | Dev build tool |
