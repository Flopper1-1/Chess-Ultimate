const http = require("http");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const EDITIONS = [
  { name: "Battle Edition", buttonId: "btnBattle", page: "index.html" },
  { name: "Joker's Gambit", buttonId: "btnBalatro", page: "index2.html", needsCards: true },
  { name: "Wilderness", buttonId: "btnDontStarve", page: "index3.html" },
  { name: "Terraria Chess", buttonId: "btnTerraria", page: "index4.html", terrariaRun: true },
];

const FOOLS_MATE = [
  { from: 53, to: 45, san: "f2-f3" },
  { from: 12, to: 28, san: "e7-e5" },
  { from: 54, to: 38, san: "g2-g4" },
  { from: 3, to: 39, san: "d8-h4#" },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getJson(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: "127.0.0.1", port, path }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(1000, () => req.destroy(new Error("CDP request timed out")));
  });
}

async function waitForTarget(port, match, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const targets = await getJson(port, "/json/list");
      const target = targets.find((entry) => entry.type === "page" && match(entry));
      if (target) return target;
    } catch (_) {
      // Electron may still be starting.
    }
    await sleep(250);
  }
  throw new Error("Timed out waiting for Electron target");
}

function connectDebugger(wsUrl) {
  let nextId = 1;
  const pending = new Map();
  const ws = new WebSocket(wsUrl);

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const callbacks = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) callbacks.reject(new Error(JSON.stringify(message.error)));
    else callbacks.resolve(message.result);
  });

  return new Promise((resolve, reject) => {
    ws.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          const id = nextId++;
          ws.send(JSON.stringify({ id, method, params }));
          return new Promise((resolve, reject) => {
            pending.set(id, { resolve, reject });
          });
        },
        close() {
          ws.close();
        },
      });
    });
    ws.addEventListener("error", reject);
  });
}

async function evalInPage(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
    throw new Error(detail);
  }
  return result.result.value;
}

function spawnElectron(port) {
  const command = require("electron");
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const userDataDir = path.join(os.tmpdir(), `chess-ultimate-smoke-${process.pid}-${port}`);

  return spawn(command, [`--remote-debugging-port=${port}`, `--user-data-dir=${userDataDir}`, "."], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

async function stopElectron(child) {
  if (!child || child.killed) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  child.kill("SIGTERM");
  await sleep(500);
  if (!child.killed) child.kill("SIGKILL");
}

async function clickEdition(port, edition) {
  const launcher = await waitForTarget(port, (target) => /launcher\.html/.test(target.url));
  const client = await connectDebugger(launcher.webSocketDebuggerUrl);
  try {
    try {
      await evalInPage(client, `(async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      for (let i = 0; i < 120; i += 1) {
        if (window.electronAPI && typeof window.electronAPI.openGame === "function") {
          window.electronAPI.openGame(${JSON.stringify(edition.page)});
          return true;
        }
        const button = document.getElementById(${JSON.stringify(edition.buttonId)});
        if (button) return true;
        await wait(50);
      }
      throw new Error("Launcher API not found for ${edition.buttonId}");
    })()`);
    } catch (err) {
      if (!/Execution context was destroyed/i.test(String(err && err.message))) throw err;
    }
  } finally {
    client.close();
  }
}

async function runEdition(port, edition) {
  await clickEdition(port, edition);
  let lastError = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const target = await waitForTarget(port, (entry) => entry.url.includes(edition.page));
    const client = await connectDebugger(target.webSocketDebuggerUrl);
    try {
      return await evalInPage(client, `(async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const movesToPlay = ${JSON.stringify(FOOLS_MATE)};
      const needsCards = ${edition.needsCards ? "true" : "false"};
      const needsTerrariaRun = ${edition.terrariaRun ? "true" : "false"};
      const pageErrors = [];

      window.addEventListener("error", (event) => {
        pageErrors.push(event.message || String(event.error || event));
      });
      window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason;
        pageErrors.push(String(reason && (reason.stack || reason.message || reason)));
      });

      while (document.readyState !== "complete") await wait(50);

      let modeSelect = null;
      let variantSelect = null;
      for (let i = 0; i < 200; i += 1) {
        modeSelect = document.getElementById("gameModeSelect");
        variantSelect = document.getElementById("variantSelect");
        if (modeSelect && variantSelect) break;
        await wait(50);
      }
      if (!modeSelect || !variantSelect) throw new Error("Game controls not found");

      let terrariaRunOk = !needsTerrariaRun;
      const terrariaRunChecks = [];
      if (needsTerrariaRun) {
        const assertTr = (name, condition) => {
          terrariaRunChecks.push({ name, ok: Boolean(condition) });
          if (!condition) throw new Error("Terraria run smoke failed: " + name);
        };
        modeSelect.value = "bot";
        modeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        variantSelect.value = "standard";
        variantSelect.dispatchEvent(new Event("change", { bubbles: true }));
        document.getElementById("newGameBtn").click();
        for (let i = 0; i < 160 && (!state.game || !state_tr || !state_tr.run); i += 1) await wait(50);
        assertTr("run state active", Boolean(state_tr && state_tr.run && state_tr.run.active));
        assertTr("standard only", state.variant === "standard" && variantSelect.value === "standard");
        assertTr("run panel visible", document.getElementById("trRunPanel")?.style.display !== "none");
        assertTr("starting armies applied", state.game.position.board.filter(Boolean).length >= 10);
        const beforePawns = state_tr.run.playerArmy.p || 0;
        state_tr.run.silver = 20;
        trBuyPiece("p");
        assertTr("shop buy pawn", (state_tr.run.playerArmy.p || 0) === beforePawns + 1);
        state_tr.run.shopOpen = true;
        const oldLevel = state_tr.run.level;
        trStartRunLevel();
        assertTr("next level keeps run", Boolean(state_tr.run && state_tr.run.level === oldLevel));
        terrariaRunOk = terrariaRunChecks.every((entry) => entry.ok);
      }

      modeSelect.value = "local_multiplayer";
      modeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      variantSelect.value = "standard";
      variantSelect.dispatchEvent(new Event("change", { bubbles: true }));

      const autoRotate = document.getElementById("autoRotateToggle");
      if (autoRotate) {
        autoRotate.checked = false;
        autoRotate.dispatchEvent(new Event("change", { bubbles: true }));
      }

      document.getElementById("newGameBtn").click();
      for (let i = 0; i < 120 && !state.game; i += 1) await wait(50);
      if (!state.game) throw new Error("Game did not start");

      let dsJokerOk = !needsCards;
      const dsJokerChecks = [];
      if (needsCards) {
        const assertDs = (name, condition) => {
          dsJokerChecks.push({ name, ok: Boolean(condition) });
          if (!condition) throw new Error("Don't Starve Joker smoke failed: " + name);
        };
        const resetCustom = (entries, turn = "w") => {
          state.game = new ChessGame("standard");
          state.variant = "standard";
          state.game.position.board = Array(64).fill(null);
          for (const [sq, piece] of entries) state.game.position.board[sq] = piece;
          state.game.position.turn = turn;
          state.game.history = [];
          state.game.positionCount = new Map();
          state.game.recordPosition();
          initCardGame();
          state.playerColor = "w";
          state.botColor = "b";
          state.gameMode = "local_multiplayer";
        };

        resetCustom([[60, "K"], [4, "k"], [36, "R"], [27, "b"]]);
        state.cardGame.players.w.jokers.push(makeJokerInstance(JOKER_BY_ID.wolfgang));
        assertDs("Wolfgang diagonal capture", generateBalatroLegalMoves(state.game).some((m) => m.from === 36 && m.to === 27 && m.dsJoker === "wolfgang"));

        resetCustom([[60, "K"], [4, "k"], [52, "P"]]);
        ensureDsEffects().activeMode = { color: "w", defId: "woodie" };
        assertDs("Woodie rook pawn move", generatePlayableBalatroMoves(state.game, "w").some((m) => m.from === 52 && m.to === 48 && m.dsJoker === "woodie"));

        resetCustom([[60, "K"], [4, "k"], [36, "N"]]);
        ensureDsEffects().activeMode = { color: "w", defId: "warly" };
        handleDsActiveSquareClick(36, "w");
        assertDs("Warly protection marker", ensureDsEffects().protected.some((entry) => entry.square === 36));

        resetCustom([[60, "K"], [4, "k"], [52, "P"]]);
        const oldPrompt = window.prompt;
        window.prompt = () => "R";
        ensureDsEffects().activeMode = { color: "w", defId: "wigfrid" };
        handleDsActiveSquareClick(52, "w");
        window.prompt = oldPrompt;
        assertDs("Wigfrid non-queen promotion", state.game.position.board[52] === "R");

        resetCustom([[60, "K"], [4, "k"], [57, "N"]]);
        ensureDsEffects().activeMode = { color: "w", defId: "wortox" };
        assertDs("Wortox safe teleport", generatePlayableBalatroMoves(state.game, "w").some((m) => m.from === 57 && m.to === 32 && m.dsJoker === "wortox"));

        resetCustom([[60, "K"], [4, "k"], [36, "R"]]);
        ensureDsEffects().activeMode = { color: "w", defId: "winona" };
        handleDsActiveSquareClick(35, "w");
        assertDs("Winona catapult placement", ensureDsEffects().catapults.some((entry) => entry.square === 35));

        resetCustom([[60, "K"], [4, "k"], [36, "R"]]);
        ensureDsEffects().activeMode = { color: "w", defId: "wendy" };
        handleDsActiveSquareClick(36, "w");
        assertDs("Wendy ghost marker", ensureDsEffects().ghosted.some((entry) => entry.square === 36));

        resetCustom([[60, "K"], [4, "k"], [36, "R"], [27, "b"]]);
        state.cardGame.players.w.jokers.push(makeJokerInstance(JOKER_BY_ID.webber));
        state.cardGame.players.w.jokers.push(makeJokerInstance(JOKER_BY_ID.wormwood));
        state.cardGame.players.w.jokers.push(makeJokerInstance(JOKER_BY_ID.wurt));
        state.game.position.board[27] = "R";
        applyDontStarveCaptureEffects({ from: 36, to: 27, piece: "R", captured: true }, "w", { capturedPiece: "b" });
        assertDs("Webber/Wormwood/Wurt terrain", ensureDsEffects().webs.length && ensureDsEffects().flowers.length && ensureDsEffects().tentacles.length);

        resetCustom([[60, "K"], [4, "k"], [36, "R"]]);
        state.cardGame.players.w.jokers.push(makeJokerInstance(JOKER_BY_ID.maxwell));
        useJokerAbility("w", state.cardGame.players.w.jokers[0].id);
        assertDs("Maxwell sanity effect", Boolean(ensureDsEffects().maxwell));

        resetCustom([[60, "K"], [4, "k"]]);
        state.cardGame.players.w.jokers.push(makeJokerInstance(JOKER_BY_ID.wanda));
        useJokerAbility("w", state.cardGame.players.w.jokers[0].id);
        assertDs("Wanda king timer", ensureDsEffects().wanda.w > currentPly());

        resetCustom([[60, "K"], [4, "k"]]);
        state.cardGame.players.w.jokers.push(makeJokerInstance(JOKER_BY_ID.wx78));
        useJokerAbility("w", state.cardGame.players.w.jokers[0].id);
        assertDs("WX-78 armed", Boolean(ensureDsEffects().wx78 && ensureDsEffects().wx78.pending));

        dsJokerOk = dsJokerChecks.every((entry) => entry.ok);
        document.getElementById("newGameBtn").click();
        for (let i = 0; i < 120 && (!state.game || state.game.history.length !== 0); i += 1) await wait(50);
      }

      const played = [];
      for (const planned of movesToPlay) {
        const legal = state.game.generateLegalMoves();
        const move = legal.find((candidate) => candidate.from === planned.from && candidate.to === planned.to);
        if (!move) {
          throw new Error("Missing legal move " + planned.san
            + "; turn=" + state.game.position.turn
            + "; history=" + state.game.history.map((entry) => entry.annotatedText || formatMove(entry.move)).join(" ")
            + "; legal moves: " + legal.map((m) => indexToCoord(m.from) + "-" + indexToCoord(m.to)).join(", "));
        }

        if (needsCards && state.cardGame) {
          const color = state.game.position.turn;
          const type = move.dropPiece || (move.piece ? pieceType(move.piece) : null);
          if (type && typeof makePieceCard === "function") {
            state.cardGame.players[color].hand.push(makePieceCard(type));
          }
        }

        await playHumanMove(move);

        const start = Date.now();
        while (Date.now() - start < 7000 && state.moveInFlight) await wait(50);

        played.push({
          planned: planned.san,
          actual: formatMove(move),
          historyLength: state.game.history.length,
        });
      }

      const status = state.game.getGameStatus();
      const statusText = document.getElementById("statusText")?.textContent || "";
      const editionKey = typeof APP_EDITION !== "undefined" ? APP_EDITION : "";
      const saves = window.ChessUltimateStorage && editionKey
        ? window.ChessUltimateStorage.listAllSaves(editionKey)
        : [];
      const exportedPgn = window.ChessUltimatePGN
        ? window.ChessUltimatePGN.exportHistory({
            history: state.game.history,
            formatMove,
            result: status.result,
            variant: state.variant,
            edition: editionKey
          })
        : "";
      let pgnRoundTrip = false;
      if (exportedPgn && window.ChessUltimatePGN) {
        const imported = new ChessGame("standard");
        const tokens = window.ChessUltimatePGN.tokenize(exportedPgn);
        for (const token of tokens) {
          const legal = imported.generateLegalMoves();
          const move = window.ChessUltimatePGN.findMatchingMove(legal, token, { formatMove, indexToCoord });
          if (!move) throw new Error("PGN round-trip failed on " + token + " from " + exportedPgn);
          imported.applyMove(move);
        }
        pgnRoundTrip = imported.history.length === state.game.history.length && imported.getGameStatus().over;
      }
      let reviewModeOk = false;
      if (typeof enterMoveReview === "function" && typeof exitMoveReview === "function") {
        enterMoveReview(2);
        await wait(50);
        const note = document.getElementById("reviewNote");
        reviewModeOk = state.reviewPly === 2
          && Array.isArray(state.lastLegalMoves)
          && state.lastLegalMoves.length === 0
          && note
          && note.style.display !== "none";
        exitMoveReview();
      }
      const newestSave = saves[0] || null;
      const expectedLoadedHistory = newestSave && newestSave.gameCore && newestSave.gameCore.game
        ? newestSave.gameCore.game.history.length
        : -1;
      const loadRestored = newestSave && typeof applySaveSnapshot === "function"
        ? Boolean(applySaveSnapshot(newestSave) && state.game.history.length === expectedLoadedHistory)
        : false;
      return {
        edition: ${JSON.stringify(edition.name)},
        url: location.href,
        played,
        status,
        statusText,
        historyLength: state.game.history.length,
        over: Boolean(status && status.over),
        result: status && status.result,
        saveCount: saves.length,
        autosaveCount: saves.filter((save) => save.type === "autosave").length,
        loadRestored,
        progressReady: Boolean(window.ChessUltimateProgress && document.getElementById("cuProgressOpen")),
        pgnRoundTrip,
        reviewModeOk,
        dsJokerOk,
        dsJokerChecks,
        terrariaRunOk,
        terrariaRunChecks,
        errors: pageErrors,
      };
    })()`);
    } catch (err) {
      lastError = err;
      if (!/Execution context was destroyed/i.test(String(err && err.message))) throw err;
      await sleep(500);
    } finally {
      client.close();
    }
  }
  throw lastError || new Error(`Failed to run ${edition.name}`);
}

async function main() {
  const basePort = Number(process.env.CHESS_ULTIMATE_TEST_PORT || 9400);
  const results = [];

  for (let i = 0; i < EDITIONS.length; i += 1) {
    const edition = EDITIONS[i];
    const port = basePort + i;
    const child = spawnElectron(port);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    try {
      const result = await runEdition(port, edition);
      results.push(result);

      const ok = result.over
        && /checkmate|wins/i.test(result.result || "")
        && result.autosaveCount > 0
        && result.loadRestored
        && result.progressReady
        && result.pgnRoundTrip
        && result.reviewModeOk
        && result.dsJokerOk
        && result.terrariaRunOk
        && result.errors.length === 0;
      const mark = ok ? "PASS" : "FAIL";
      console.log(`[${mark}] ${edition.name}: ${result.result || result.statusText} (${result.autosaveCount} autosaves)`);
      if (!ok) {
        console.log(JSON.stringify(result, null, 2));
        if (stderr.trim()) console.log(stderr.trim());
        process.exitCode = 1;
      }
    } catch (err) {
      process.exitCode = 1;
      console.log(`[FAIL] ${edition.name}: ${err.stack || err.message}`);
      if (stderr.trim()) console.log(stderr.trim());
    } finally {
      await stopElectron(child);
    }
  }

  if (process.exitCode) {
    throw new Error("One or more playthrough smoke tests failed");
  }

  console.log(`\nAll ${results.length} edition playthroughs completed a checkmate game.`);
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
