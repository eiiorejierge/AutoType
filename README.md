# AutoType Electron

Desktop app that:

- Accepts a pasted prompt.
- Types it at a configurable words-per-minute speed.
- Lets you export a locally built Windows setup `.exe` from inside the app UI.
- Lets you fetch and download the latest release `.exe` from GitHub after you push a release.

## Run locally

```bash
npm install
npm start
```

## Build Windows setup locally

```bash
npm run dist:win
```

Installer output:

- `dist/AutoType-Setup-1.0.0.exe`

Then click **Download Local Setup EXE** in the app.

## Download EXE from a pushed GitHub release

1. Create a release in your repo and upload your installer `.exe` as a release asset.
2. In the app, enter the GitHub owner and repo.
3. Click **Check Latest Release**.
4. Click **Download Release EXE** to save the setup file.
