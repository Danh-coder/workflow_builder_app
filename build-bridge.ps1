<#
.SYNOPSIS
    Build the windows-use-bridge.exe for bundling with the Electron app.

.DESCRIPTION
    1. Ensures PyInstaller is available in the active Python env.
    2. Runs PyInstaller with bridge.spec inside Windows-Use/.
    3. Copies the resulting EXE to electron/resources/ so electron-builder
       can bundle it in the final installer.

.NOTES
    Run from the repo root:  .\build-bridge.ps1
    Requires: Python 3.10+, windows-use installed (pip install windows-use or uv sync)
#>

$ErrorActionPreference = "Stop"
$root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$winUse  = Join-Path $root "Windows-Use"
$outDir  = Join-Path $root "electron\resources"
$distExe = Join-Path $winUse "dist\windows-use-bridge.exe"

function Test-PipAvailable {
    param([string]$PythonExe)
    try {
        & $PythonExe -m pip --version *> $null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Resolve-PythonExe {
    $candidates = @(
        (Join-Path $winUse ".venv\Scripts\python.exe"),
        (Join-Path $root ".venv\Scripts\python.exe")
    )

    foreach ($candidate in $candidates) {
        if ((Test-Path $candidate) -and (Test-PipAvailable -PythonExe $candidate)) {
            return $candidate
        }
    }

    $pyCmd = Get-Command py -ErrorAction SilentlyContinue
    if ($pyCmd -and (Test-PipAvailable -PythonExe "py")) {
        return "py"
    }

    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCmd -and (Test-PipAvailable -PythonExe "python")) {
        return "python"
    }

    throw "No Python interpreter with pip was found. Install Python 3.10+ with pip, or create Windows-Use/.venv with pip enabled."
}

$pythonExe = Resolve-PythonExe
Write-Host "==> Using Python: $pythonExe" -ForegroundColor Cyan

Write-Host "==> Checking PyInstaller..." -ForegroundColor Cyan
$hasPyInstaller = $false
try {
    & $pythonExe -m PyInstaller --version *> $null
    $hasPyInstaller = ($LASTEXITCODE -eq 0)
} catch {
    $hasPyInstaller = $false
}

if (-not $hasPyInstaller) {
    Write-Host "    Installing PyInstaller..."
    & $pythonExe -m pip install pyinstaller --quiet
}

Write-Host "==> Ensuring Windows-Use runtime dependencies are installed..." -ForegroundColor Cyan
Push-Location $winUse
try {
    & $pythonExe -m pip install -e . --quiet
} finally {
    Pop-Location
}

Write-Host "==> Building windows-use-bridge.exe with PyInstaller..." -ForegroundColor Cyan
Push-Location $winUse
try {
    & $pythonExe -m PyInstaller bridge.spec --noconfirm
} finally {
    Pop-Location
}

if (-not (Test-Path $distExe)) {
    Write-Error "Build failed - dist/windows-use-bridge.exe not found."
    exit 1
}

# Copy to electron/resources/
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Copy-Item $distExe (Join-Path $outDir "windows-use-bridge.exe") -Force

Write-Host "==> Done! EXE copied to electron/resources/windows-use-bridge.exe" -ForegroundColor Green
Write-Host "    You can now run:  npm run dist" -ForegroundColor Green
