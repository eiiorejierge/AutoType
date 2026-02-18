# AutoType Electron

Desktop app that:

- Accepts a pasted prompt.
- Types it at a configurable words-per-minute speed.
- Lets you export a built Windows setup `.exe` from inside the app UI.

## Run locally

```bash
npm install
npm start
```

## Build Windows setup

```bash
npm run dist:win
```

Installer output:

- `dist/AutoType-Setup-1.0.0.exe`

After building, launch the app and click **Download Setup EXE** to save a copy anywhere you want.
