// NOTE: this file is intentionally CommonJS (.cjs), not ESM.
// Electron's sandboxed preload scripts (webPreferences.sandbox: true)
// do not support `import`/`export` syntax — only `require()` — even
// when the project's package.json sets "type": "module". Using ESM
// syntax here causes Electron to silently fail to load the preload
// script, which leaves `window.api` undefined in the renderer.
const { contextBridge, ipcRenderer, webUtils } = require('electron');

/**
 * Safe, minimal API surface exposed to the renderer process.
 * The renderer never touches Node.js or Electron internals directly.
 */
contextBridge.exposeInMainWorld('api', {
  selectTranscripts: () => ipcRenderer.invoke('dialog:selectTranscripts'),
  readFiles: (filePaths) => ipcRenderer.invoke('fs:readFiles', filePaths),
  generateReport: (payload) => ipcRenderer.invoke('meetings:generateReport', payload),
  openOutputFolder: () => ipcRenderer.invoke('shell:openOutputFolder'),
  /**
   * Electron's webUtils.getPathForFile resolves the absolute filesystem
   * path for a File object obtained from a drag-and-drop event, since
   * File.path was removed from renderer-side File objects in newer
   * Electron versions for security reasons.
   */
  getPathForFile: (file) => webUtils.getPathForFile(file),
});
