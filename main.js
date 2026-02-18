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

ipcMain.handle('get-latest-release', async (_, { owner, repo }) => {
  if (!owner || !repo) {
    return {
      ok: false,
      message: 'Owner and repo are required.'
    };
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AutoType-App',
        Accept: 'application/vnd.github+json'
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `GitHub API request failed (${response.status}).`
      };
    }

    const release = await response.json();
    const exeAsset = (release.assets || []).find((asset) => asset.name?.toLowerCase().endsWith('.exe'));

    if (!exeAsset) {
      return {
        ok: false,
        message: 'Latest release has no .exe asset yet.'
      };
    }

    return {
      ok: true,
      tag: release.tag_name,
      name: release.name,
      publishedAt: release.published_at,
      assetName: exeAsset.name,
      assetUrl: exeAsset.browser_download_url
    };
  } catch (error) {
    return {
      ok: false,
      message: `Failed to fetch latest release: ${error.message}`
    };
  }
});

ipcMain.handle('download-release-asset', async (_, { assetUrl, fileName }) => {
  if (!assetUrl || !fileName) {
    return { ok: false, message: 'Asset URL and filename are required.' };
  }

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save latest release setup',
    defaultPath: fileName,
    filters: [{ name: 'Windows executable', extensions: ['exe'] }]
  });

  if (canceled || !filePath) {
    return { ok: false, message: 'Download canceled.' };
  }

  try {
    const response = await fetch(assetUrl, {
      headers: {
        'User-Agent': 'AutoType-App'
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `Failed to download file (${response.status}).`
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    await fs.promises.writeFile(filePath, Buffer.from(arrayBuffer));

    return { ok: true, message: `Downloaded setup to ${filePath}` };
  } catch (error) {
    return {
      ok: false,
      message: `Failed to download release asset: ${error.message}`
    };
  }
});
