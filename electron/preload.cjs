const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  minimize: () => ipcRenderer.send("win:minimize"),
  maximize: () => ipcRenderer.send("win:maximize"),
  close: () => ipcRenderer.send("win:close"),
  isMaximized: () => ipcRenderer.invoke("win:isMaximized"),
  version: () => ipcRenderer.invoke("app:version"),
  openExternal: (url) => ipcRenderer.send("open:external", url),
  openFolder: (dir) => ipcRenderer.invoke("app:openFolder", dir),
});

// Also expose as studio for complete DIGI LABS compatibility
contextBridge.exposeInMainWorld("studio", {
  minimize: () => ipcRenderer.send("win:minimize"),
  maximize: () => ipcRenderer.send("win:maximize"),
  close: () => ipcRenderer.send("win:close"),
  version: () => ipcRenderer.invoke("app:version"),
  openExternal: (url) => ipcRenderer.send("open:external", url),
});
