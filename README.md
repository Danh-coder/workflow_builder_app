# Workflow Builder App

Desktop workflow builder built with Electron + React (Vite) and a bundled Python bridge for Windows UI automation.

## Requirements

- Windows 10 or 11 (64-bit)
- Node.js 18+
- npm 9+
- Python 3.10+ (recommended for bridge workflows)

## Quick Start (Development)

1. Install Node dependencies:

```powershell
npm install
```

2. (Recommended) Create Python virtual environment for the bridge:

```powershell
cd Windows-Use
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
python -m pip install -e .
cd ..
```

3. Run the app in development mode:

```powershell
npm run dev
```

The app starts Electron and Vite together. In development, the bridge uses the local Python environment when available.

## Build and Package

### Full Windows installer (recommended)

```powershell
npm run dist:full
```

This performs:

- Python bridge build via `build-bridge.ps1`
- Frontend build (`tsc && vite build`)
- Electron packaging (`electron-builder`)

Installer output:

- `release/Workflow Agent Setup 0.1.0.exe`

Generated bridge artifact (not committed to git):

- `electron/resources/windows-use-bridge.exe`

The bridge executable is intentionally build-generated and ignored by git to keep repository size manageable. Run `npm run build-bridge` (or `npm run dist:full`) before packaging.

### Build in separate steps

```powershell
npm run build-bridge
npm run build
npm run dist
```

## Git Bash Note

If `npm` is not recognized in Git Bash:

```bash
export PATH="/c/Program Files/nodejs:$PATH"
```

Or use:

```bash
"/c/Program Files/nodejs/npm.cmd" run dev
```

## Repository Layout

- `src/`: React UI
- `electron/`: Electron main/preload process
- `Windows-Use/`: Python bridge and automation runtime
- `build-bridge.ps1`: Bridge build orchestration

## Notes

- Detailed Windows packaging docs are in `BUILD_WINDOWS_EXE.md`.
- This project is optimized for Windows builds and runtime behavior.
