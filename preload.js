const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  downloadSetup: () => ipcRenderer.invoke('download-setup')
});
