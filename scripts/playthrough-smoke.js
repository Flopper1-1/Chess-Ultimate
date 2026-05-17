const http = require("http");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const EDITIONS = [
  { name: "Battle Edition", buttonId: "btnBattle", page: "index.html" },
  { name: "Joker's Gambit", buttonId: "btnBalatro", page: "index2.html", needsCards: true },
  { name: "Wilderness", buttonId: "btnDontStarve", page: "index3.html" },
  { name: "Terraria Chess", buttonId: "btnTerraria", page: "index4.html" },
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
      return {
        edition: ${JSON.stringify(edition.name)},
        url: location.href,
        played,
        status,
        statusText,
        historyLength: state.game.history.length,
        over: Boolean(status && status.over),
        result: status && status.result,
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

      const ok = result.over && /checkmate|wins/i.test(result.result || "") && result.errors.length === 0;
      const mark = ok ? "PASS" : "FAIL";
      console.log(`[${mark}] ${edition.name}: ${result.result || result.statusText}`);
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
