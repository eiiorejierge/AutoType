const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 820,
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

// ── Window management IPC handlers ───────────────────────────────────────────

ipcMain.handle('list-windows', async () => {
  try {
    if (process.platform === 'linux') {
      let idList;
      try {
        const { stdout } = await execFileAsync('xdotool', ['search', '--onlyvisible', '--name', '.*']);
        idList = stdout.trim().split('\n').filter(Boolean);
      } catch (e) {
        if (e.code === 'ENOENT') {
          return { ok: false, windows: [], error: 'xdotool is not installed. Install it with: sudo apt install xdotool' };
        }
        return { ok: false, windows: [], error: e.message };
      }

      const windows = [];
      for (const id of idList) {
        try {
          const { stdout: name } = await execFileAsync('xdotool', ['getwindowname', id]);
          const title = name.trim();
          if (title && title !== 'AutoType') {
            windows.push({ id, title });
          }
        } catch {
          // skip windows that can't be queried
        }
      }
      return { ok: true, windows };

    } else if (process.platform === 'win32') {
      const ps = `Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object Id,@{N='Title';E={$_.MainWindowTitle}} | ConvertTo-Json`;
      try {
        const { stdout } = await execFileAsync('powershell', ['-Command', ps]);
        const parsed = JSON.parse(stdout.trim());
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const windows = arr
          .filter(w => w.Title !== 'AutoType')
          .map(w => ({ id: String(w.Id), title: w.Title }));
        return { ok: true, windows };
      } catch (e) {
        return { ok: false, windows: [], error: e.message };
      }

    } else if (process.platform === 'darwin') {
      return { ok: false, windows: [], error: 'macOS window targeting is not yet supported.' };
    }

    return { ok: false, windows: [], error: 'Unsupported platform.' };
  } catch (e) {
    return { ok: false, windows: [], error: e.message };
  }
});

ipcMain.handle('focus-window', async (_, windowId) => {
  try {
    if (process.platform === 'linux') {
      await execFileAsync('xdotool', ['windowactivate', '--sync', windowId]);
      return { ok: true };

    } else if (process.platform === 'win32') {
      // Use AppActivate via PowerShell to bring a process window to foreground
      const ps = `$p = Get-Process | Where-Object { $_.Id -eq ${Number(windowId)} }; if ($p) { $app = New-Object -ComObject Shell.Application; $app.Windows() | Where-Object { $_.HWND -eq $p.MainWindowHandle } | ForEach-Object { $_.Visible = $true } }`;
      await execFileAsync('powershell', ['-Command', ps]);
      return { ok: true };
    }

    return { ok: false, error: 'Unsupported platform.' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('type-character', async (_, char) => {
  try {
    if (process.platform === 'linux') {
      if (char === '\n') {
        await execFileAsync('xdotool', ['key', '--clearmodifiers', 'Return']);
      } else if (char === '\t') {
        await execFileAsync('xdotool', ['key', '--clearmodifiers', 'Tab']);
      } else {
        await execFileAsync('xdotool', ['type', '--clearmodifiers', '--delay', '0', char]);
      }
      return { ok: true };

    } else if (process.platform === 'win32') {
      // Use PowerShell SendKeys for Windows
      let key = char;
      // Escape special SendKeys chars
      const sendKeysSpecial = ['+', '^', '%', '~', '(', ')', '[', ']', '{', '}'];
      if (sendKeysSpecial.includes(char)) {
        key = `{${char}}`;
      } else if (char === '\n') {
        key = '{ENTER}';
      } else if (char === '\t') {
        key = '{TAB}';
      }
      const ps = `[System.Windows.Forms.SendKeys]::SendWait('${key.replace(/'/g, "''")}')`;
      await execFileAsync('powershell', ['-Command', `Add-Type -AssemblyName System.Windows.Forms; ${ps}`]);
      return { ok: true };
    }

    return { ok: false, error: 'Unsupported platform.' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('type-backspace', async () => {
  try {
    if (process.platform === 'linux') {
      await execFileAsync('xdotool', ['key', '--clearmodifiers', 'BackSpace']);
      return { ok: true };

    } else if (process.platform === 'win32') {
      const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{BACKSPACE}')`;
      await execFileAsync('powershell', ['-Command', ps]);
      return { ok: true };
    }

    return { ok: false, error: 'Unsupported platform.' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
