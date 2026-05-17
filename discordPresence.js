const fs = require("fs");
const path = require("path");

let DiscordRPC = null;
try {
  DiscordRPC = require("discord-rpc");
} catch (_) {
  DiscordRPC = null;
}

const GITHUB_URL = "https://github.com/Flopper1-1/Chess-Ultimate";
const RELEASES_URL = `${GITHUB_URL}/releases`;

const EDITIONS = {
  "index.html": {
    name: "Battle Edition",
    tagline: "Epic tactical chess",
  },
  "index2.html": {
    name: "Joker's Gambit",
    tagline: "Playing the card table",
  },
  "index3.html": {
    name: "Wilderness",
    tagline: "Surviving the dark board",
  },
  "index4.html": {
    name: "Terraria Chess",
    tagline: "Mining XP and bossing the board",
  },
};

function configuredClientId() {
  const fromEnv = process.env.CHESS_ULTIMATE_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID;
  if (fromEnv) return String(fromEnv).trim();

  for (const file of [
    path.join(__dirname, "discord-client-id.txt"),
    path.join(process.cwd(), "discord-client-id.txt"),
    path.join(path.dirname(process.execPath), "discord-client-id.txt"),
  ]) {
    try {
      if (fs.existsSync(file)) {
        const id = fs.readFileSync(file, "utf8").trim();
        if (id) return id;
      }
    } catch (_) {
      // Try the next location.
    }
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));
    return String(pkg.config && pkg.config.discordClientId ? pkg.config.discordClientId : "").trim();
  } catch (_) {
    return "";
  }
}

function cleanText(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim().slice(0, 128);
}

function modeLabel(mode) {
  const labels = {
    bot: "Vs Bot",
    local_multiplayer: "Local Multiplayer",
    p2p_multiplayer: "Online P2P",
  };
  return labels[mode] || cleanText(mode, "Playing");
}

class DiscordPresence {
  constructor() {
    this.clientId = configuredClientId();
    this.client = null;
    this.ready = false;
    this.enabled = Boolean(DiscordRPC && this.clientId);
    this.startedAt = Date.now();
    this.lastActivityKey = "";
    this.queuedActivity = null;
    this.currentEdition = null;
    this.loginTimer = null;
    this.reconnectMs = 15000;
    this.lastError = "";
    this.lastActivity = null;
    this.lastActivityAt = null;
    this.logPath = "";
  }

  setLogPath(file) {
    this.logPath = file || "";
  }

  log(message) {
    const line = `[${new Date().toISOString()}] ${message}`;
    console.log(`[DiscordPresence] ${message}`);
    if (!this.logPath) return;
    try {
      fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
      fs.appendFileSync(this.logPath, `${line}\n`, "utf8");
    } catch (_) {
      // Logging is best-effort.
    }
  }

  init() {
    if (!this.enabled || this.client) return;

    this.log(`Starting Discord RPC with client ID ${this.clientId}`);
    DiscordRPC.register(this.clientId);
    this.client = new DiscordRPC.Client({ transport: "ipc" });
    this.client.on("ready", () => {
      this.ready = true;
      this.lastError = "";
      this.log("Discord RPC ready");
      this.flush();
    });
    this.client.on("disconnected", () => {
      this.ready = false;
      this.lastError = "Discord RPC disconnected";
      this.log(this.lastError);
      this.scheduleReconnect();
    });
    this.client.on("error", (err) => {
      this.lastError = err && (err.message || String(err)) || "Discord RPC error";
      this.log(this.lastError);
    });
    this.client.login({ clientId: this.clientId }).catch(() => {
      this.lastError = "Discord RPC login failed. Is Discord open with Activity Status enabled?";
      this.log(this.lastError);
      try {
        if (this.client) this.client.destroy();
      } catch (_) {}
      this.client = null;
      this.ready = false;
      this.scheduleReconnect();
    });
  }

  scheduleReconnect() {
    if (!this.enabled || this.loginTimer) return;
    this.loginTimer = setTimeout(() => {
      this.loginTimer = null;
      this.client = null;
      this.ready = false;
      this.init();
    }, this.reconnectMs);
  }

  setLauncher(version) {
    this.currentEdition = null;
    this.setActivity({
      details: "Choosing an edition",
      state: `Chess Ultimate v${version || "unknown"}`,
    });
  }

  setGame(htmlFile, payload = {}) {
    const edition = EDITIONS[htmlFile] || { name: "Chess Ultimate", tagline: "Playing chess" };
    this.currentEdition = htmlFile;
    this.setActivity(this.gameActivity(edition, payload));
  }

  updateGame(payload = {}) {
    if (!this.currentEdition) return;
    this.setGame(this.currentEdition, payload);
  }

  gameActivity(edition, payload) {
    const variant = cleanText(payload.variant, "Standard Chess");
    const mode = cleanText(payload.mode || modeLabel(payload.gameMode), "Playing");
    const status = cleanText(payload.status, payload.isGameOver ? "Game complete" : edition.tagline);
    const moveCount = Number.isFinite(Number(payload.moveCount)) ? Number(payload.moveCount) : 0;
    const suffix = moveCount > 0 && !payload.isGameOver ? `Move ${Math.floor(moveCount / 2) + 1}` : status;

    return {
      details: `${edition.name} - ${variant}`,
      state: payload.isGameOver ? status : `${mode} - ${suffix}`,
    };
  }

  setActivity(activity) {
    if (!this.enabled) return;
    this.queuedActivity = {
      details: cleanText(activity.details, "Chess Ultimate"),
      state: cleanText(activity.state, "Playing"),
      startTimestamp: this.startedAt,
      buttons: [
        { label: "Download", url: RELEASES_URL },
        { label: "GitHub", url: GITHUB_URL },
      ],
    };
    this.flush();
  }

  flush() {
    if (!this.enabled || !this.ready || !this.client || !this.queuedActivity) return;
    const key = JSON.stringify(this.queuedActivity);
    if (key === this.lastActivityKey) return;
    this.client.setActivity(this.queuedActivity).then(() => {
      this.lastActivityKey = key;
      this.lastActivity = this.queuedActivity;
      this.lastActivityAt = Date.now();
      this.lastError = "";
      this.log(`Activity set: ${this.queuedActivity.details} | ${this.queuedActivity.state}`);
    }).catch((err) => {
      this.lastError = err && (err.message || String(err)) || "Discord RPC setActivity failed";
      this.log(this.lastError);
      const fallback = { ...this.queuedActivity };
      delete fallback.buttons;
      this.client.setActivity(fallback).then(() => {
        this.lastActivityKey = JSON.stringify(fallback);
        this.lastActivity = fallback;
        this.lastActivityAt = Date.now();
        this.lastError = "";
        this.log(`Activity set without buttons: ${fallback.details} | ${fallback.state}`);
      }).catch((fallbackErr) => {
        this.lastError = fallbackErr && (fallbackErr.message || String(fallbackErr)) || "Discord RPC fallback activity failed";
        this.log(this.lastError);
      });
    });
  }

  getStatus() {
    return {
      enabled: this.enabled,
      ready: this.ready,
      hasClient: Boolean(this.client),
      clientId: this.clientId,
      currentEdition: this.currentEdition,
      lastError: this.lastError,
      lastActivityAt: this.lastActivityAt,
      lastActivity: this.lastActivity,
      logPath: this.logPath,
    };
  }

  shutdown() {
    if (this.loginTimer) {
      clearTimeout(this.loginTimer);
      this.loginTimer = null;
    }
    if (!this.client) return;
    try {
      if (this.ready) this.client.clearActivity();
      this.client.destroy();
    } catch (_) {
      // Discord is optional; shutdown should never block app exit.
    }
    this.client = null;
    this.ready = false;
  }
}

module.exports = new DiscordPresence();
