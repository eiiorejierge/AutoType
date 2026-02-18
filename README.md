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

## Auto-release with GitHub Actions

This repo now includes `.github/workflows/windows-release.yml` to build and publish the Windows installer.

### Option 1: Push a tag

```bash
git tag v1.0.1
git push origin v1.0.1
```

That will:

- run the workflow on `windows-latest`
- build the NSIS installer using `npm run dist:win`
- create/update the GitHub Release for that tag
- upload `dist/*.exe` as release assets

### Option 2: Manual run from Actions tab

Run **Build and publish Windows setup** with:

- `tag_name` (required)
- `release_name` (optional)

The workflow will create/update that release and attach the installer EXE.
