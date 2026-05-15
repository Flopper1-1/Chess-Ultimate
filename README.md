# Chess Ultimate

A chess desktop app with two distinct modes, original procedural soundtracks, dynamic music that reacts to gameplay, and a full Balatro-style card game layered on top of chess.

## Modes

### ⚔️ Battle Edition
Classic chess with a cinematic war theme. Original "Iron Throne" procedural march (A minor modal, 108–132 BPM) with timpani, string melody, horn counter-melody, layered bass, and screen shake on captures.

### 🃏 Joker's Gambit
Balatro-inspired chess with a full card game system. Draw piece cards each turn, earn jokers with passive and active abilities, roll rewards after captures. Original procedural jazz soundtrack (Cm7–Fm7–Bb7–Ebmaj7, 92–116 BPM).

## Features

- **Dynamic Music** — Soundtrack reacts to the board in real time. Captures, checks, blunders, brilliant moves, and promotions all shift the tension level, which drives BPM, filter cutoff, counter-melody volume, and percussion density.
- **Visual Music Reactivity** — Board glow, background saturation/brightness, and CSS flash animations all respond to tension via CSS custom properties.
- **Screen Shake** — Captures shake the board proportional to piece value. Queen capture = big shake.
- **Cinematic Piece Movement** — 5-keyframe arc with motion tilt, peak blur, and landing settle.
- **Balatro Card System** — Piece cards, jokers, rarity rolls (Common → Legendary), P2P multiplayer via WebRTC.
- **Achievements** — 12 unlockable per mode, stored in localStorage, with toast popups and a gallery modal.
- **Annotation Engine** — Real-time move quality: Brilliant `!!`, Good `!`, Inaccuracy `?!`, Mistake `?`, Blunder `??` with per-side accuracy tracking.
- **Chess Variants** — Standard, Antichess, Atomic, Fog of War, Three-Check, King of the Hill, Crazyhouse, Checkers vs Chess, Bughouse, and more.
- **Launcher** — Frameless mode-selection screen with crossfade transition and back-to-menu from any game.

## Getting Started

### Requirements
- [Node.js](https://nodejs.org) v18 or later

### Run from source
```bash
git clone https://github.com/Flopper1-1/Chess-Ultimate.git
cd Chess-Ultimate
npm install
npm start
```

### Build the exe
```bash
npm run build
```

Output: `build-out/ChessUltimate-win32-x64/ChessUltimate.exe`

The build script automatically strips non-English locales and the Chromium license file, bringing the size from ~360MB down to ~300MB. The size is normal — Electron bundles its own Chromium (same as VS Code, Discord, Slack).

## Download

Grab the latest release from [Releases](https://github.com/Flopper1-1/Chess-Ultimate/releases).

## Project Structure

```
Chess Ultimate/
├── main.js          — Electron main process (window management, IPC)
├── preload.js       — Context bridge (exposes window.electronAPI)
├── launcher.html    — Mode selection launcher
├── index.html       — Battle Edition
├── index2.html      — Joker's Gambit
├── package.json
├── README.md
└── BUILDING.md      — Detailed build & release instructions
```

## Controls

| Action | Input |
|--------|-------|
| Select piece | Click |
| Move piece | Click destination |
| Promote pawn | Picker appears automatically |
| Open menu | ESC |
| Back to launcher | ESC → Back to Menu |

Settings panel: music volume, SFX volume, cinematic FX toggle, bot difficulty.

## Music Architecture

All sound is procedurally synthesized via Web Audio API — no audio files. A `_music` tension object (0–1) updates on game events and decays ~0.010–0.012 per 400ms tick.

| Parameter | Calm | Peak |
|-----------|------|------|
| BPM (Battle) | 108 | 132 |
| BPM (Balatro) | 92 | 116 |
| Chord filter cutoff | 700–800 Hz | 2500 Hz |
| Counter-melody gain | low | high |
| Percussion fills | off | on above 0.3 |
| Ominous drone | off | on above 0.7 |
| Board glow radius | 70px | 160px |

## Contributing

Pull requests welcome. Check [BUILDING.md](BUILDING.md) for the build setup. Keep PRs focused — one feature or fix per PR.

## License

MIT — see [LICENSE](LICENSE).
