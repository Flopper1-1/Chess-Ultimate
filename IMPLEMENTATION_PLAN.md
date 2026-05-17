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
- ~~Terraria roguelike foundation: 3 lives, silver economy, shop buys, progressive bot ELO, random side per board, standard-chess-only run mode, saveable run state.~~

## Major Remaining Features

- ~~Terraria roguelike rework: boss-specific rule mutations, boss tier unlock requirements, manual board placement UI, boss music intensity, reload boss, reduce-ELO shop purchase, Moon Lord victory/Champion achievement.~~
- ~~Kerbal Space Chess: two-layer board (Surface/Orbit), vertical movement, inertia, Kerbin/Mun zones, science victory (20 points), Kerbals/stations/satellites, science tree upgrades.~~
- ~~Mergeable chess variants: combo selector with compatible rule composition (Chess960+Fog, Chess960+Atomic, Chess960+Crazyhouse, Crazyhouse+Atomic, Fog+Three-check, KotH+Three-check, etc.).~~
- ~~Full achievement/stat coverage tests: 61 assertions across all unlock paths, card rarities, variant exclusives, stat tracking, meta achievement, and qualification gates. Run via `npm run test:achievements`.~~

## Later Polish

- ~~Replace prompt-based save/load/import UX with full modal browsers (Save name, Load browser, PGN export, PGN import — all 4 editions).~~
- ~~Add searchable achievement/stat filters by name, difficulty, status, and source in the progress modal.~~
- ~~Add visual tutorials for complex DLC rules: variant help button in Battle Edition (Atomic, Crazyhouse, Fog, Three-check, KotH, Antichess, Chess960), boss mutation tutorials in Terraria, Joker tutorials in Don't Starve.~~
