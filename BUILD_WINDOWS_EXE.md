# Building the Windows Installer (.exe)

The final installer bundles two executables:
- **Workflow Agent.exe** — the Electron desktop app (NSIS installer)
- **windows-use-bridge.exe** — the Python bridge for Windows UI automation (bundled inside the installer)

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Windows 10/11 (64-bit) | Only platform supported for build |
| Node.js 18+ | `node` and `npm` must be accessible |
| Python 3.10+ | With `pip` included |
| PowerShell 5.1+ | Already present on Windows 10/11 |

---

## Step 1 — Install Node Dependencies (One Time)

Open a terminal in the project root and run:

```powershell
npm install
```

> **Git Bash note:** If `npm` is not recognized, prepend the Node.js bin directory to your PATH first:
> ```bash
> export PATH="/c/Program Files/nodejs:$PATH"
> ```
> Then run all subsequent `npm` commands with that PATH active, or use the full path:
> ```bash
> "/c/Program Files/nodejs/npm.cmd" install
> ```

---

## Step 2 — Create the Python Virtual Environment (Recommended)

The bridge build and dev mode both prefer `Windows-Use/.venv` over any system Python. Creating it once ensures stable, reproducible builds across reboots.

```powershell
cd Windows-Use
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
python -m pip install -e .
cd ..
```

If you skip this step, [build-bridge.ps1](build-bridge.ps1) will auto-detect a suitable Python interpreter (system `py` or `python`) and install dependencies automatically — but results may vary between machines.

---

## Step 3 — Build Everything

Run the single command that performs all three build phases in order:

```powershell
npm run dist:full
```

**Git Bash:**
```bash
"/c/Program Files/nodejs/npm.cmd" run dist:full
```

### What this does internally

| Phase | Script | Output |
|---|---|---|
| 1. Build Python bridge | [build-bridge.ps1](build-bridge.ps1) via PowerShell | `Windows-Use/dist/windows-use-bridge.exe` → copied to `electron/resources/` |
| 2. Compile TypeScript + Vite | `tsc && vite build` | `dist/` folder (frontend bundle) |
| 3. Package installer | `electron-builder` | `release/Workflow Agent Setup 0.1.0.exe` |

#### What build-bridge.ps1 does

1. Auto-detects Python: checks `Windows-Use/.venv` → `.venv` → system `py` → system `python`
2. Installs `PyInstaller` if not present
3. Runs `pip install -e .` in `Windows-Use/` to ensure all runtime deps are present
4. Invokes `PyInstaller bridge.spec --noconfirm` from the `Windows-Use/` directory
5. Copies the resulting `dist/windows-use-bridge.exe` to `electron/resources/`

---

## Output

```
release/
  Workflow Agent Setup 0.1.0.exe   ← installer to distribute

electron/resources/
  windows-use-bridge.exe           ← bridge artifact (auto-included in installer)
```

---

## Building in Separate Steps

If you want to build phases independently (e.g. to iterate on only the frontend):

```powershell
# Bridge only
npm run build-bridge

# Frontend only (TypeScript + Vite, no installer)
npm run build

# Installer only (requires bridge and frontend already built)
npm run dist
```

---

## How the Bridge Is Bundled

[package.json](package.json) tells electron-builder to include the bridge exe as an extra resource:

```json
"extraResources": [
  { "from": "electron/resources/windows-use-bridge.exe", "to": "windows-use-bridge.exe" }
]
```

At runtime, [electron/main.js](electron/main.js) locates it via:

```js
// Production
const exe = path.join(process.resourcesPath, 'windows-use-bridge.exe');

// Development (falls back to running bridge.py with local venv)
const winUseVenvPython = path.join(__dirname, '../Windows-Use/.venv/Scripts/python.exe');
```

---

## Troubleshooting

### Bridge build fails — missing Python packages

```powershell
cd Windows-Use
.\.venv\Scripts\Activate.ps1
python -m pip install -e .
cd ..
npm run build-bridge
```

### Bridge build fails — PyInstaller not found

`build-bridge.ps1` installs PyInstaller automatically. If it still fails, install manually:

```powershell
cd Windows-Use
.\.venv\Scripts\Activate.ps1
pip install pyinstaller
```

### Installer build fails — TypeScript or Vite errors

```powershell
npm run build
```

Fix any errors printed, then re-run `npm run dist`.

### App installs but agent never starts

After installing, verify the bridge exe exists inside the installed app:

```
C:\Users\<You>\AppData\Local\Programs\Workflow Agent\resources\windows-use-bridge.exe
```

If it is missing, the `electron/resources/windows-use-bridge.exe` was not present when `npm run dist` ran. Re-run `npm run dist:full` to build everything from scratch.

### Dev mode agent fails after reboot

The app uses `Windows-Use/.venv/Scripts/python.exe` in dev mode. As long as that venv exists, reboots will not break it. If the venv is missing, recreate it (Step 2 above).
