const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("splash", {
  onStage: (cb) => ipcRenderer.on("splash:stage", (_e, text) => cb(text)),
});
