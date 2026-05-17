/**
 * Achievement & stat coverage tests for Chess Ultimate — progress.js
 *
 * Runs in plain Node.js (no Electron, no DOM). Stubs out the DOM/localStorage
 * surfaces that progress.js touches, then drives every achievement unlock path
 * and verifies the result.
 *
 * Run with: node scripts/achievement-coverage.test.js
 */

"use strict";

/* ── DOM / browser stubs ─────────────────────────────────────────────────── */
const _store = {};
global.localStorage = {
  getItem:  (k)    => _store[k] ?? null,
  setItem:  (k, v) => { _store[k] = v; },
  removeItem:(k)   => { delete _store[k]; },
};
global.document = {
  createElement: () => ({
    className: "", innerHTML: "", textContent: "",
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {},
    remove: () => {},
    style: {},
    addEventListener: () => {},
  }),
  getElementById: () => null,
  body: { appendChild: () => {} },
  addEventListener: () => {},
};
global.window = {
  setTimeout: setTimeout,
  AudioContext: null,
  webkitAudioContext: null,
};

/* ── Load progress.js ────────────────────────────────────────────────────── */
// progress.js wraps itself in an IIFE and attaches to window.ChessUltimateProgress
eval(require("fs").readFileSync(require("path").join(__dirname, "../progress.js"), "utf8"));
const P = global.window.ChessUltimateProgress;
if (!P) throw new Error("ChessUltimateProgress not found on window after loading progress.js");

/* ── Test harness ────────────────────────────────────────────────────────── */
let passed = 0;
let failed = 0;
const failures = [];

function assert(label, cond) {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.error(`  [FAIL] ${label}`);
  }
}

function describe(suite, fn) {
  console.log(`\n${suite}`);
  fn();
}

/** Fresh progress state — wipes localStorage and reloads the module state */
function reset() {
  for (const k of Object.keys(_store)) delete _store[k];
  P.importData({ achievements: {}, counters: {}, stats: {} });
}

/** Minimal qualifying move context */
function ctx(overrides = {}) {
  return {
    gameMode:    "bot",
    elo:         1500,
    actor:       "human",
    color:       "w",
    playerColor: "w",
    variant:     "standard",
    edition:     "battle",
    move:        { piece: "p", from: 52, to: 44 },
    checkNow:    false,
    annotation:  null,
    capturedPiece: null,
    historyLength: 10,
    status:      { over: false, result: "" },
    ...overrides,
  };
}

function gameOver(overrides = {}) {
  return ctx({
    status: { over: true, result: "White wins by checkmate." },
    historyLength: 20,
    ...overrides,
  });
}

/* ── Tests ───────────────────────────────────────────────────────────────── */

describe("Qualification gate", () => {
  reset();
  // Should NOT unlock if gameMode is not bot
  P.recordMove(ctx({ gameMode: "local_multiplayer", move: { piece: "p", captured: "p" } }));
  assert("no unlock below ELO gate (local_multiplayer)", !P.exportData().achievements.first_blood);

  reset();
  P.recordMove(ctx({ elo: 800, move: { piece: "p", captured: "p" } }));
  assert("no unlock below ELO 1000", !P.exportData().achievements.first_blood);

  reset();
  P.recordMove(ctx({ actor: "bot", move: { piece: "p", captured: "p" } }));
  assert("no unlock for bot actor", !P.exportData().achievements.first_blood);
});

describe("Standard move achievements", () => {
  reset();
  P.recordMove(ctx({ move: { piece: "p", captured: "p" } }));
  assert("first_blood on capture", P.exportData().achievements.first_blood);

  reset();
  P.recordMove(ctx({ move: { piece: "K", castleKing: true } }));
  assert("castle_king on castleKing move", P.exportData().achievements.castle_king);

  reset();
  P.recordMove(ctx({ move: { piece: "p", promotion: "q" } }));
  assert("promotion on pawn promotion", P.exportData().achievements.promotion);

  reset();
  P.recordMove(ctx({ move: { piece: "p", enPassant: true } }));
  assert("en_passant on enPassant move", P.exportData().achievements.en_passant);

  reset();
  P.recordMove(ctx({ move: { piece: "p", flags: ["e"] } }));
  assert("en_passant via flags array", P.exportData().achievements.en_passant);

  reset();
  P.recordMove(ctx({ annotation: { symbol: "!!" }, move: { piece: "n" } }));
  assert("brilliant on !! annotation object", P.exportData().achievements.brilliant);

  reset();
  P.recordMove(ctx({ annotation: "!!", move: { piece: "n" } }));
  assert("brilliant on !! annotation string", P.exportData().achievements.brilliant);
});

describe("Queen sacrifice", () => {
  reset();
  // Pawn captures a queen
  P.recordMove(ctx({ move: { piece: "p", captured: "q" } }));
  assert("sacrifice — pawn takes queen", P.exportData().achievements.sacrifice);

  reset();
  // Knight captures a queen
  P.recordMove(ctx({ move: { piece: "n", captured: "q" } }));
  assert("sacrifice — knight takes queen", P.exportData().achievements.sacrifice);

  reset();
  // Queen takes queen should NOT unlock sacrifice
  P.recordMove(ctx({ move: { piece: "q", captured: "q" } }));
  assert("sacrifice — queen takes queen does NOT unlock", !P.exportData().achievements.sacrifice);
});

describe("Check counter achievements", () => {
  reset();
  for (let i = 0; i < 9; i++) {
    P.recordMove(ctx({ checkNow: true, move: { piece: "q" } }));
  }
  assert("check10 not yet at 9 checks", !P.exportData().achievements.check10);
  P.recordMove(ctx({ checkNow: true, move: { piece: "q" } }));
  assert("check10 at 10 checks", P.exportData().achievements.check10);

  reset();
  P.recordMove(ctx({ checkNow: true, move: { piece: "q" }, historyLength: 18 }));
  assert("quick_check — check within 10 full turns (historyLength=18)", P.exportData().achievements.quick_check);

  reset();
  P.recordMove(ctx({ checkNow: true, move: { piece: "q" }, historyLength: 22 }));
  assert("quick_check NOT triggered after 10 full turns (historyLength=22)", !P.exportData().achievements.quick_check);
});

describe("Resourceful — 10 lossless moves", () => {
  reset();
  for (let i = 0; i < 9; i++) {
    P.recordMove(ctx({ move: { piece: "n" } }));
  }
  assert("resourceful not yet at 9 moves", !P.exportData().achievements.resourceful);
  P.recordMove(ctx({ move: { piece: "n" } }));
  assert("resourceful at 10 lossless player moves", P.exportData().achievements.resourceful);

  reset();
  for (let i = 0; i < 9; i++) {
    P.recordMove(ctx({ move: { piece: "n" } }));
  }
  // Bot captures a player piece — resets counter
  P.recordMove(ctx({ actor: "bot", color: "b", move: { piece: "n", captured: "p" }, capturedPiece: "p" }));
  P.recordMove(ctx({ move: { piece: "n" } }));
  assert("resourceful resets after player loses a piece", !P.exportData().achievements.resourceful);
});

describe("Game over — standard win achievements", () => {
  reset();
  P.recordGameOver(gameOver());
  assert("checkmate unlocked on first win", P.exportData().achievements.checkmate);

  reset();
  for (let i = 0; i < 4; i++) P.recordGameOver(gameOver());
  assert("win5 not at 4 wins", !P.exportData().achievements.win5);
  P.recordGameOver(gameOver());
  assert("win5 at 5 wins", P.exportData().achievements.win5);

  reset();
  for (let i = 0; i < 49; i++) P.recordGameOver(gameOver());
  assert("win50 not at 49 wins", !P.exportData().achievements.win50);
  P.recordGameOver(gameOver());
  assert("win50 at 50 wins", P.exportData().achievements.win50);

  reset();
  P.recordGameOver(gameOver({ historyLength: 80 }));
  assert("long_game — 80 move history", P.exportData().achievements.long_game);

  reset();
  P.recordGameOver(gameOver({ historyLength: 79 }));
  assert("long_game NOT at 79 moves", !P.exportData().achievements.long_game);

  reset();
  P.recordGameOver(gameOver({ historyLength: 28 }));
  assert("speedrun — won in 28 half-moves (< 30)", P.exportData().achievements.speedrun);

  reset();
  P.recordGameOver(gameOver({ historyLength: 30 }));
  assert("speedrun NOT at exactly 30 half-moves", !P.exportData().achievements.speedrun);
});

describe("Blunder and lose", () => {
  reset();
  P.recordMove(ctx({ annotation: { symbol: "??" }, move: { piece: "q" } }));
  P.recordGameOver(gameOver({
    status: { over: true, result: "Black wins by checkmate." },
  }));
  assert("blunder_lose — blundered then lost", P.exportData().achievements.blunder_lose);

  reset();
  P.recordMove(ctx({ annotation: { symbol: "??" }, move: { piece: "q" } }));
  P.recordGameOver(gameOver()); // player won — should NOT unlock
  assert("blunder_lose NOT when blundered but won", !P.exportData().achievements.blunder_lose);
});

describe("Variant-exclusive achievements", () => {
  reset();
  P.recordGameOver(gameOver({ variant: "chess960" }));
  assert("chess960_win", P.exportData().achievements.chess960_win);

  reset();
  P.recordGameOver(gameOver({
    variant: "three_check",
    playerChecksAgainst: 2,
  }));
  assert("three_check_win", P.exportData().achievements.three_check_win);
  assert("five_check — won with 2 of 3 checks remaining", P.exportData().achievements.five_check);

  reset();
  P.recordGameOver(gameOver({ variant: "three_check", playerChecksAgainst: 0 }));
  assert("three_check_win without five_check", P.exportData().achievements.three_check_win);
  assert("five_check NOT when playerChecksAgainst=0", !P.exportData().achievements.five_check);

  reset();
  P.recordGameOver(gameOver({ variant: "atomic" }));
  assert("atomic_win", P.exportData().achievements.atomic_win);

  reset();
  P.recordGameOver(gameOver({ variant: "king_of_the_hill" }));
  assert("hill_win", P.exportData().achievements.hill_win);

  reset();
  P.recordGameOver(gameOver({ variant: "fog_of_war" }));
  assert("fog_win", P.exportData().achievements.fog_win);

  reset();
  P.recordGameOver(gameOver({ variant: "antichess" }));
  assert("antichess_win", P.exportData().achievements.antichess_win);

  reset();
  P.recordGameOver(gameOver({ variant: "crazyhouse" }));
  assert("crazyhouse_win", P.exportData().achievements.crazyhouse_win);

  reset();
  P.recordGameOver(gameOver({ variant: "crazyhouse", lastMoveWasDrop: true }));
  assert("crazycheck — checkmate by drop in crazyhouse", P.exportData().achievements.crazycheck);
});

describe("Atomic nuclear explosion", () => {
  reset();
  P.recordMove(ctx({ variant: "atomic", explodedCount: 3, move: { piece: "q" } }));
  assert("nuclear_explosion NOT at 3 pieces", !P.exportData().achievements.nuclear_explosion);

  reset();
  P.recordMove(ctx({ variant: "atomic", explodedCount: 4, move: { piece: "q" } }));
  assert("nuclear_explosion at 4 pieces", P.exportData().achievements.nuclear_explosion);
});

describe("Edition achievements", () => {
  reset();
  P.recordGameOver(gameOver({ edition: "balatro", variant: "standard" }));
  assert("jokers_gambit_win for balatro edition", P.exportData().achievements.jokers_gambit_win);

  reset();
  P.recordCard({
    gameMode: "bot", elo: 1500, color: "w", playerColor: "w",
    kind: "joker", rarity: "legendary", edition: "balatro",
  });
  assert("legendary_card from legendary joker", P.exportData().achievements.legendary_card);

  reset();
  P.recordCard({
    gameMode: "bot", elo: 1500, color: "w", playerColor: "w",
    kind: "joker", rarity: "ultra", edition: "balatro",
  });
  assert("ultra_card from ultra rarity joker", P.exportData().achievements.ultra_card);

  reset();
  // Below ELO — should not unlock
  P.recordCard({
    gameMode: "bot", elo: 800, color: "w", playerColor: "w",
    kind: "joker", rarity: "legendary", edition: "balatro",
  });
  assert("legendary_card NOT below ELO gate", !P.exportData().achievements.legendary_card);
});

describe("Stat tracking", () => {
  reset();
  P.recordMove(ctx({ move: { piece: "r", captured: "q" }, capturedPiece: "q" }));
  const stats = P.exportData().stats;
  assert("stat: captures_by_Rook recorded", stats?.battle?.you_vs_bot?.captures_by_Rook === 1);
  assert("stat: Queens_taken recorded", stats?.battle?.you_vs_bot?.Queens_taken === 1);

  reset();
  P.recordMove(ctx({ move: { piece: "p", enPassant: true } }));
  const ep = P.exportData().stats;
  assert("stat: en_passants recorded", ep?.battle?.you_vs_bot?.en_passants === 1);

  reset();
  P.recordMove(ctx({ checkNow: true, move: { piece: "q" } }));
  const chk = P.exportData().stats;
  assert("stat: checks recorded", chk?.battle?.you_vs_bot?.checks === 1);

  reset();
  // checkmate stat is recorded via recordMove when the move ends the game
  P.recordMove(ctx({
    move: { piece: "q" },
    checkNow: false,
    status: { over: true, result: "White wins by checkmate." },
  }));
  const go = P.exportData().stats;
  assert("stat: checkmates recorded on final move", go?.battle?.you_vs_bot?.checkmates === 1);

  reset();
  P.recordGameOver(ctx({
    gameMode: "bot", elo: 1500, playerColor: "w",
    status: { over: true, result: "Draw by stalemate." },
    edition: "battle", variant: "standard",
  }));
  const stale = P.exportData().stats;
  assert("stat: stalemates recorded", stale?.battle?.you_vs_bot?.stalemates === 1);

  reset();
  P.recordCard({
    gameMode: "bot", elo: 1500, color: "w", playerColor: "w",
    kind: "joker", rarity: "common", edition: "balatro",
  });
  const crd = P.exportData().stats;
  assert("stat: jokers_gained recorded", crd?.balatro?.you_vs_bot?.jokers_gained === 1);
  assert("stat: common_jokers_obtained recorded", crd?.balatro?.you_vs_bot?.common_jokers_obtained === 1);
});

describe("Meta achievement — We are Chess", () => {
  reset();
  // Import all achievements except first_blood (leave it for normal unlock to trigger maybeUnlockMeta)
  const ALL_EXCEPT_FIRST = [
    "brilliant","checkmate","castle_king","promotion","check10",
    "win5","blunder_lose","long_game","sacrifice","en_passant","speedrun",
    "resourceful","quick_check","win50","chess960_win","three_check_win",
    "five_check","atomic_win","nuclear_explosion","hill_win","fog_win",
    "antichess_win","crazyhouse_win","crazycheck","jokers_gambit_win",
    "legendary_card","ultra_card"
  ];
  const fakeData = { achievements: {}, counters: {}, stats: {} };
  for (const id of ALL_EXCEPT_FIRST) {
    fakeData.achievements[id] = { unlockedAt: new Date().toISOString() };
  }
  P.importData(fakeData);
  assert("we_are_chess not yet (one missing)", !P.exportData().achievements.we_are_chess);
  // Unlock the last remaining achievement via normal path — triggers maybeUnlockMeta
  P.recordMove(ctx({ move: { piece: "p", captured: "p" } }));
  assert("we_are_chess unlocked after all others collected", P.exportData().achievements.we_are_chess);
});

describe("Double-unlock guard", () => {
  reset();
  P.recordMove(ctx({ move: { piece: "p", captured: "p" } }));
  const ts1 = P.exportData().achievements.first_blood?.unlockedAt;
  P.recordMove(ctx({ move: { piece: "p", captured: "p" } }));
  const ts2 = P.exportData().achievements.first_blood?.unlockedAt;
  assert("second capture does not re-stamp first_blood", ts1 === ts2);
});

describe("importData / exportData round-trip", () => {
  reset();
  P.recordMove(ctx({ move: { piece: "p", captured: "p" } }));
  const exported = P.exportData();
  reset();
  assert("after reset first_blood gone", !P.exportData().achievements.first_blood);
  P.importData(exported);
  assert("after importData first_blood restored", P.exportData().achievements.first_blood);
});

/* ── Summary ─────────────────────────────────────────────────────────────── */
console.log(`\n${"─".repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailed assertions:");
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
} else {
  console.log("All achievement/stat coverage tests passed.");
}
