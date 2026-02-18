const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  downloadSetup: () => ipcRenderer.invoke('download-setup'),
  getLatestRelease: (owner, repo) => ipcRenderer.invoke('get-latest-release', { owner, repo }),
  downloadReleaseAsset: (assetUrl, fileName) => ipcRenderer.invoke('download-release-asset', { assetUrl, fileName })
});
