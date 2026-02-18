const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('download-setup', async () => {
  const possibleDistFile = path.join(process.cwd(), 'dist', `AutoType-Setup-${app.getVersion()}.exe`);

  if (!fs.existsSync(possibleDistFile)) {
    return {
      ok: false,
      message: 'Setup not found yet. Build it first with: npm run dist:win'
    };
  }

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save AutoType Windows Setup',
    defaultPath: `AutoType-Setup-${app.getVersion()}.exe`,
    filters: [{ name: 'Windows executable', extensions: ['exe'] }]
  });

  if (canceled || !filePath) {
    return { ok: false, message: 'Download canceled.' };
  }

  await fs.promises.copyFile(possibleDistFile, filePath);
  return { ok: true, message: `Setup saved to ${filePath}` };
});
