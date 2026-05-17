const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openGame:   (file) => ipcRenderer.send("open-game", file),
  backToMenu: ()     => ipcRenderer.send("back-to-menu"),
  closeApp:   ()     => ipcRenderer.send("close-app"),
  getAppVersion: ()  => ipcRenderer.invoke("get-app-version"),
  getDiscordPresenceStatus: () => ipcRenderer.invoke("get-discord-presence-status"),
  updateDiscordPresence: (payload) => ipcRenderer.send("discord-presence-update", payload),
});
