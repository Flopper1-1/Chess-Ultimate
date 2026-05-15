# Building & Releasing Chess Ultimate

## 1. Build the exe

```bash
npm install
npm run build
```

Output: `build-out/ChessUltimate-win32-x64/ChessUltimate.exe`

The build script runs automatically and strips non-English locales + the Chromium license file (~68MB saved).

---

## 2. Release to GitHub

### Option A — GitHub CLI (recommended, one command)

**First time only:** install the GitHub CLI from https://cli.github.com, then run:
```bash
gh auth login
```
Follow the prompts — choose HTTPS and authenticate via browser.

**Every release:**

**Step 1 — Zip the build** (PowerShell):
```powershell
Compress-Archive -Path build-out\ChessUltimate-win32-x64\* -DestinationPath ChessUltimate-v1.0.0-win64.zip
```
Replace `v1.0.0` with the actual version number.

**Step 2 — Create the release and upload:**
```powershell
gh release create v1.0.0 ChessUltimate-v1.0.0-win64.zip --repo Flopper1-1/Chess-Ultimate --title "Chess Ultimate v1.0.0" --notes "What changed in this version"
```

**Step 3 — Delete the local zip** (it's gitignored but no need to keep it):
```powershell
del ChessUltimate-v1.0.0-win64.zip
```

---

### Option B — GitHub website (no CLI needed)

1. Go to https://github.com/Flopper1-1/Chess-Ultimate
2. Click **Releases** on the right sidebar
3. Click **Draft a new release**
4. Click **Choose a tag** → type `v1.0.0` → click **Create new tag**
5. Fill in the title and release notes
6. Click **Attach binaries** and upload the zip from `build-out\ChessUltimate-win32-x64\`
7. Click **Publish release**

---

## What's gitignored

| Path | Reason |
|------|--------|
| `node_modules/` | Reinstall with `npm install` |
| `build-out/` | Regenerate with `npm run build` |
| `*.zip` | Upload to Releases, don't commit |
| `*.mp3`, `*.wav`, `*.ogg` | No audio files — all sound is synthesized |
| `.vscode/` | Editor config |
| `AGENTS.md` | Local AI context file |
| `build-strip.js` | Dev build tool, auto-runs during `npm run build` |
