# Chess Ultimate

A feature-rich chess desktop app with two distinct modes, original procedural soundtracks, dynamic music that reacts to gameplay, and a full Balatro-style card game layered on top of chess.

## Modes

### Battle Edition
Classic chess with a cinematic war theme. Original "Iron Throne" procedural march (A minor modal, 108–132 BPM) with timpani, string melody, horn counter-melody, and layered bass.

### Joker's Gambit
Balatro-inspired chess with a full card game system. Earn piece cards and jokers as you play, use them to unlock moves, and activate special abilities. Original procedural jazz soundtrack (Cm7–Fm7–Bb7–Ebmaj7, 92–116 BPM) with swung hi-hats, walking bass, and convolution reverb.

## Features

- **Balatro Card System** (Joker's Gambit) — Draw piece cards each turn to unlock moves. Earn jokers with passive effects and active abilities. Roll rewards after captures. Rarity system (Common → Rare → Legendary). P2P multiplayer via WebRTC.

- **Dynamic Music** — The soundtrack reacts to the board in real time:
  - Captures → tension rises by piece value (pawn < minor < rook < queen)
  - Check → sharp filter sweep and tension spike
  - Blunder (`??`/`?`) → volume dip + tension surge
  - Brilliant (`!!`) → tension peak with bloom effect
  - Promotion → tension spike
  - Win/Loss → swell-and-fade or fade-out
  - Tension decays slowly to baseline; BPM, filter, counter-melody, and percussion density all scale with it

- **Visual Music Reactivity** — Board glow, background saturation/brightness, and CSS event flashes all respond to tension in real time via CSS custom properties.

- **Achievements** — 12 unlockable achievements per mode, stored in localStorage, with animated toast popups and a gallery modal.

- **Annotation Engine** — Real-time move quality: Brilliant `!!`, Good `!`, Inaccuracy `?!`, Mistake `?`, Blunder `??` with per-side accuracy tracking.

- **Chess Variants** — Standard, Antichess, Atomic, Fog of War, Three-Check, King of the Hill, Crazyhouse, Checkers vs Chess, and more.

- **Cinematic FX** — Capture bursts, check pulses, Atomic explosions, KOTH hill approach, fog reveals, promotion fanfare.

- **Launcher** — Frameless mode-selection screen. Back-to-menu from any game with crossfade transition.

## Running from Source

Requires [Node.js](https://nodejs.org) (v18+) and npm.

```bash
npm install
npx electron .
```

## Building the Executable

```bash
npm install
npx @electron/packager . ChessUltimate --platform=win32 --arch=x64 --out=dist-pkg --overwrite
```

Output: `dist-pkg/ChessUltimate-win32-x64/ChessUltimate.exe`

## Project Structure

```
Chess Ultimate/
├── main.js          — Electron main process (window management, IPC)
├── preload.js       — Context bridge (exposes window.electronAPI)
├── launcher.html    — Mode selection launcher
├── index.html       — Battle Edition (~7000 lines)
├── index2.html      — Joker's Gambit (~9000 lines)
├── package.json
└── README.md
```

## Controls

- Click a piece to select, click destination to move
- Promotion picker appears automatically
- ESC — in-game menu (Back to Menu, settings)
- Settings: music volume, SFX volume, cinematic FX toggle, bot difficulty

## Music Architecture

All sound is procedurally synthesized via Web Audio API — no audio files. Loops schedule 1 beat ahead using absolute `AudioContext` time to prevent drift. A `_music` tension object (0–1) is updated on game events and decays ~0.010–0.012 per 400ms tick. Tension drives:

| Parameter | Calm | Peak |
|-----------|------|------|
| BPM | 108 / 92 | 132 / 116 |
| Chord filter cutoff | 700–800 Hz | 2500 Hz |
| Counter-melody gain | 0.04–0.05 | 0.10–0.13 |
| Perc fill bus | silent | active above 0.3 |
| Ominous drone | silent | active above 0.7 |
| Board glow radius | 70px | 160px |
| Background saturation | 1× | 1.55× |
