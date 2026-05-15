# Chess Ultimate

A feature-rich chess game packaged as a desktop app with two distinct modes, original procedural soundtracks, and dynamic music that responds to gameplay.

## Modes

### Battle Edition (`index.html`)
Classic chess with a cinematic war theme. Original "Iron Throne" procedural march (A minor modal, 108–132 BPM) with timpani, string melody, horn counter-melody, and layered bass. Fullscreen borderless window.

### Joker's Gambit (`index2.html`)
Balatro-inspired chess with a jazz theme. Original procedural jazz (Cm7–Fm7–Bb7–Ebmaj7, 92–116 BPM) with swung hi-hats, walking bass, chord pads, counter-melody, and convolution reverb.

## Features

- **Dynamic Music System** — The soundtrack reacts to what's happening on the board:
  - Captures: tension rises proportional to piece value (pawn < knight/bishop < rook < queen)
  - Check: sharp tension spike + chord filter opens
  - Blunder (`??` / `?`): brief volume dip then tension surge
  - Brilliant move (`!!`): tension peak with filter sweep
  - Promotion: tension spike
  - Game over (win): music swells then fades; (loss): music fades out
  - Tension decays slowly back to baseline between events
  - BPM, filter cutoff, counter-melody volume, and percussion density all scale with tension

- **Achievements** — 12 unlockable achievements per mode, stored in localStorage, with toast popups and a gallery modal. Battle and Balatro have separate achievement sets.

- **Annotation Engine** — Moves are annotated in real-time (Brilliant `!!`, Good `!`, Inaccuracy `?!`, Mistake `?`, Blunder `??`) with accuracy tracking per side.

- **Multiple Variants** — Standard chess plus Antichess, Atomic, Fog of War, Three-Check, King of the Hill, Crazyhouse, Checkers vs Chess, and more.

- **Cinematic FX** — Capture bursts, check pulses, explosion effects (Atomic), hill approach effects (KOTH), fog reveals, promotion fanfare.

- **Back to Menu** — Return to the launcher mid-game without restarting the app.

- **Launcher** — Frameless launcher window to choose your mode.

## Running from Source

Requires [Node.js](https://nodejs.org) (v18+) and npm.

```bash
npm install
npx electron .
```

## Building an Executable

```bash
npm install
npx @electron/packager . ChessUltimate --platform=win32 --arch=x64 --out=dist-pkg --overwrite --icon=icon.ico
```

The built exe will be at `dist-pkg/ChessUltimate-win32-x64/ChessUltimate.exe`.

## Project Structure

```
Chess Ultimate/
├── main.js          — Electron main process (window management, IPC)
├── preload.js       — Context bridge (exposes electronAPI to renderer)
├── launcher.html    — Mode selection launcher
├── index.html       — Battle Edition
├── index2.html      — Joker's Gambit (Balatro mode)
├── package.json
└── README.md
```

## Controls

- Click a piece to select, click a destination to move
- Promotion picker appears automatically on pawn promotion
- ESC — opens in-game menu (Back to Menu, settings)
- Settings panel: music volume, SFX volume, cinematic FX toggle, bot difficulty

## Music Architecture

Both modes use the Web Audio API with fully procedural synthesis — no audio files. Music loops schedule 1 beat ahead using absolute `AudioContext` time to prevent drift. A persistent `_music` tension object (0–1) is updated on game events and decays at ~0.012/400ms back to 0. Tension drives:

- Low-pass filter cutoff on chord pads (opens with tension)
- Counter-melody gain bus (louder with tension)
- Off-beat percussion fill gain bus (appears above 0.3 tension)
- Ominous low drone (appears above 0.7 tension)
- BPM multiplier (Battle: 108→132, Balatro: 92→116 at peak tension)
