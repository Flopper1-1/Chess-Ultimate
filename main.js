const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const discordPresence = require("./discordPresence");

let launcherWin = null;
const APP_ICON = path.join(__dirname, "icon.png");
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

if (process.platform === "win32") {
  app.setAppUserModelId("com.flopper.chessultimate");
}

function createGameWindow(htmlFile) {
  const titles = {
    "index3.html": "Wilderness Chess - Don't Starve",
    "index.html":  "Chess Ultimate — Battle Edition",
    "index2.html": "Chess Balatro — The Joker's Gambit",
    "index4.html": "Terraria Chess — Mine. Fight. Conquer.",
  };
  const win = new BrowserWindow({
    icon: APP_ICON,
    title: titles[htmlFile] || "Chess Ultimate",
    fullscreen: true,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    backgroundColor: "#07050f",
    show: false,
  });
  win.loadFile(htmlFile);
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => {
    const gameStillOpen = BrowserWindow.getAllWindows().some(w => w !== launcherWin && !w.isDestroyed());
    if (!gameStillOpen) discordPresence.setLauncher(app.getVersion());
  });
  discordPresence.setGame(htmlFile);
  Menu.setApplicationMenu(null);

  /* ESC exits fullscreen (optional UX) */
  win.webContents.on("before-input-event", (event, input) => {
    if (input.key === "Escape" && input.type === "keyDown") {
      /* Let the game handle ESC internally; don't force exit */
    }
  });
}

function createLauncher() {
  launcherWin = new BrowserWindow({
    width: 820,
    height: 660,
    resizable: false,
    frame: false,
    icon: APP_ICON,
    title: "Chess Ultimate",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    backgroundColor: "#07050f",
    show: false,
  });
  launcherWin.loadFile("launcher.html");
  launcherWin.once("ready-to-show", () => launcherWin.show());
  Menu.setApplicationMenu(null);
}

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) return;

  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(APP_ICON);
  }

  discordPresence.setLogPath(path.join(app.getPath("userData"), "discord-presence.log"));
  discordPresence.init();
  discordPresence.setLauncher(app.getVersion());

  ipcMain.handle("get-app-version", () => app.getVersion());
  ipcMain.handle("get-discord-presence-status", () => discordPresence.getStatus());
  ipcMain.on("discord-presence-update", (event, payload) => {
    if (!payload || typeof payload !== "object") return;
    discordPresence.updateGame(payload);
  });

  createLauncher();

  ipcMain.on("open-game", (event, file) => {
    createGameWindow(file);
    if (launcherWin && !launcherWin.isDestroyed()) launcherWin.hide();
  });

  ipcMain.on("close-app", () => {
    discordPresence.shutdown();
    app.quit();
  });

  ipcMain.on("back-to-menu", () => {
    /* Close all game windows, show/recreate launcher */
    BrowserWindow.getAllWindows().forEach(w => {
      if (w !== launcherWin) w.close();
    });
    if (launcherWin && !launcherWin.isDestroyed()) {
      launcherWin.show();
      launcherWin.webContents.reload();
    } else {
      createLauncher();
    }
    discordPresence.setLauncher(app.getVersion());
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createLauncher();
  });
});

app.on("second-instance", () => {
  if (launcherWin && !launcherWin.isDestroyed()) {
    launcherWin.show();
    launcherWin.focus();
  }
});

app.on("before-quit", () => {
  discordPresence.shutdown();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
