const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");

let launcherWin = null;

function createGameWindow(htmlFile) {
  const titles = {
    "index.html":  "Chess Ultimate — Battle Edition",
    "index2.html": "Chess Balatro — The Joker's Gambit",
  };
  const win = new BrowserWindow({
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
    width: 780,
    height: 540,
    resizable: false,
    frame: false,
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
  createLauncher();

  ipcMain.on("open-game", (event, file) => {
    createGameWindow(file);
    if (launcherWin && !launcherWin.isDestroyed()) launcherWin.hide();
  });

  ipcMain.on("close-app", () => app.quit());

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
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createLauncher();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
