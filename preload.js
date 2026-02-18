const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  downloadSetup: () => ipcRenderer.invoke('download-setup'),
  listWindows:   () => ipcRenderer.invoke('list-windows'),
  focusWindow:   (windowId) => ipcRenderer.invoke('focus-window', windowId),
  typeCharacter: (char) => ipcRenderer.invoke('type-character', char),
  typeBackspace: () => ipcRenderer.invoke('type-backspace')
});
