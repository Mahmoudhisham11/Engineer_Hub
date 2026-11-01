const { contextBridge, ipcRenderer } = require("electron");

// Expose safe desktop bridge API to window.electronAPI
contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,
});
