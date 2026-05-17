# Chess Ultimate Prompt Implementation Plan

This file tracks the large idea-board prompt as an implementation checklist. Completed work is crossed out; partial work stays unchecked until the feature is actually playable and tested.

## Already Shipped

- ~~Use `icon.png` as Electron window/dock icon.~~
- ~~Dynamic launcher version from Electron app version.~~
- ~~Roadmap image at the top of the README.~~
- ~~v1 screenshots and README rewrite.~~
- ~~Discord Rich Presence foundation.~~
- ~~Right-click planning arrows fixed for board orientation.~~
- ~~Terraria visual/theme cleanup and XP bar fixes.~~
- ~~Save system foundation: manual saves, per-edition autosaves, load prompt, save won/lost/stalemated games.~~
- ~~Launcher settings: autosave interval/count, Battle start variant/color, Joker start variant/color.~~
- ~~Electron power-save blocker and background throttling protection for monitor-off/audio stability.~~
- ~~Move-log auto-scroll only sticks if the user was already at the bottom.~~
- ~~Global achievements/stats foundation with search, toast, sound, and save-file persistence.~~
- ~~Achievements gated to bot games above 1000 ELO and player-owned moves.~~
- ~~Initial Don't Starve Joker unlock gate and first active/passive effects: Wilson, Walter, Wes, Wickerbottom.~~
- ~~Balatro balancing: reward modal pauses bot, Opening Theory can be skipped by choosing a card, Opening Theory removes itself when spent, bot duplicate non-stack jokers are discarded.~~
- ~~All four editions have playthrough smoke coverage that completes checkmate and verifies autosave/load/progress UI.~~

## Current Batch

- ~~PGN compatibility: export current game and import a PGN move list.~~
- ~~Move-log review mode: click a move to view that historical board without changing the real game; disable moves while reviewing.~~
- ~~Wilderness seasons/day-night: autumn/winter/spring/summer, 20-turn seasons, 4-turn day/night cycle, seasonal board effects.~~
- ~~Complete active implementations for every Don't Starve Joker: Woodie, Warly, Wigfrid, Wortox, Wolfgang, Webber, Winona, Wormwood, Wurt, Wendy, WX-78, Maxwell, Wanda.~~

## Major Remaining Features

- [ ] Terraria roguelike rework:
  lives, shop, silver economy, progressive ELO, player/enemy army placement, boss tiers, boss music intensity, run save/quit.
- [ ] Kerbal Space Chess:
  3D board, vertical movement, inertia, Kerbin/Mun zones, science victory, Kerbals, stations, satellites, science tree.
- [ ] Mergeable chess variants:
  variant-combo selector and compatible rule composition such as Chess960 + Fog of War or Crazyhouse + Atomic.
- [ ] Full achievement/stat coverage tests for special achievements, card rarities, and variant exclusives.

## Later Polish

- [ ] Replace prompt-based save/load/import UX with full modal browsers.
- [ ] Add searchable achievement/stat filters by edition, difficulty, rarity, and source.
- [ ] Add visual tutorials for complex DLC rules without blocking play.
