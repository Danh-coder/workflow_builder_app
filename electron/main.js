const { app, BrowserWindow, ipcMain, shell, Menu, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const isDev = process.env.NODE_ENV === 'development';

/** @type {BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: '#07090E',
    // Frameless — we draw our own title bar in React
    frame: false,
    titleBarStyle: 'hidden',
    // macOS: keep traffic lights but inset them into our custom bar
    ...(process.platform === 'darwin' && {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: 10 },
    }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    // Show only when ready to avoid flash
    show: false,
    icon: process.platform === 'linux'
      ? path.join(__dirname, 'icons', 'icon.png')
      : undefined,
  });

  // ── Load app ────────────────────────────────────────────────────
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // ── Show after paint ────────────────────────────────────────────
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // ── Open external links in system browser ───────────────────────
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // ── Notify renderer when maximized state changes ─────────────────
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized', false);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── IPC — window controls ──────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

// ── IPC — outbound HTTP (bypasses renderer CORS) ────────────────────
ipcMain.handle('http-request', async (_event, { method, url, headers, body }) => {
  try {
    const controller = new AbortController();
    // Longer timeout for local models (which may need time to generate responses)
    // Use 120s for inference requests, 12s for model listing
    const isInference = url.includes('/chat/completions') || url.includes('/completions');
    const timeoutMs = isInference ? 120000 : 12000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      method: method ?? 'GET',
      headers: headers ?? {},
      body: body ?? undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await response.text();
    return { status: response.status, ok: response.ok, text, error: null };
  } catch (err) {
    return { status: 0, ok: false, text: '', error: err.message };
  }
});

// ── IPC — Windows-Use agent process ───────────────────────────────
/** @type {import('child_process').ChildProcess | null} */
let agentProcess = null;

/** @type {string} Current workflow task label for notifications */
let currentTaskLabel = 'Workflow';

/**
 * Resolve the Python bridge to run.
 *
 * Dev:  runs `python bridge.py` from the Windows-Use source folder.
 * Prod: runs the self-contained windows-use-bridge.exe bundled under
 *       resources/ by electron-builder.
 */
function getBridgeCmd() {
  if (isDev) {
    const script = path.join(__dirname, '../Windows-Use/bridge.py');
    const winUseVenvPython = path.join(__dirname, '../Windows-Use/.venv/Scripts/python.exe');
    const appVenvPython = path.join(__dirname, '../.venv/Scripts/python.exe');
    const devCwd = path.join(__dirname, '../Windows-Use');

    // Prefer local virtualenvs so reboots/PATH changes do not switch interpreters.
    if (fs.existsSync(winUseVenvPython)) {
      return { cmd: winUseVenvPython, args: [script], cwd: devCwd };
    }
    if (fs.existsSync(appVenvPython)) {
      return { cmd: appVenvPython, args: [script], cwd: devCwd };
    }

    // Last resort: rely on shell-resolved python.
    return { cmd: 'python', args: [script], cwd: devCwd };
  }
  const exe = path.join(process.resourcesPath, 'windows-use-bridge.exe');
  // In packaged apps, use resources as cwd; dev-only Windows-Use path does not exist.
  return { cmd: exe, args: [], cwd: process.resourcesPath };
}

/**
 * Kill any running agent process cleanly.
 */
function killAgent() {
  if (!agentProcess) return;
  try { agentProcess.kill('SIGTERM'); } catch (_) {}
  agentProcess = null;
}

// agent:start — spawn bridge, forward stdout events to renderer
ipcMain.handle('agent:start', (_event, { task, settings }) => {
  killAgent();

  // Store a short label for use in finish notifications
  currentTaskLabel = task ? task.slice(0, 60) + (task.length > 60 ? '…' : '') : 'Workflow';

  const { cmd, args, cwd } = getBridgeCmd();

  // Map Electron settings → bridge config
  const providerMap = {
    OpenAI: 'openai',
    Claude: 'anthropic',
    Gemini: 'google',
    'Local Model': 'ollama',
    AIHoc: 'aihoc',
  };
  const provider = providerMap[settings.aiProvider] ?? 'openai';
  const modelEntry = (settings.modelEntries ?? []).find((m) => m.id === settings.defaultModelId);
  const modelId = modelEntry?.modelId ?? 'gpt-4o';

  const config = {
    task,
    provider,
    api_key: settings.apiKey ?? '',
    model: modelId,
    base_url: settings.baseUrl || null,
    max_steps: 30,
    browser: 'EDGE',
    use_vision: true,
  };

  try {
    agentProcess = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      cwd,
    });
  } catch (err) {
    return { started: false, error: `Failed to spawn bridge: ${err.message}` };
  }

  // Send config as first stdin line
  try {
    agentProcess.stdin.write(JSON.stringify(config) + '\n');
    agentProcess.stdin.end();
  } catch (err) {
    killAgent();
    return { started: false, error: `Failed to write config: ${err.message}` };
  }

  // ── Forward stdout events to renderer
  let lineBuffer = '';
  agentProcess.stdout.on('data', (chunk) => {
    lineBuffer += chunk.toString();
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop() ?? ''; // keep incomplete last line
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        mainWindow?.webContents.send('agent:event', event);

        // ── Per-step OS notification on tool_result ──────────────
        if (event.type === 'tool_result' && Notification.isSupported()) {
          const stepNum = (event.step ?? 0) + 1;
          const succeeded = event.is_success !== false; // default true when absent
          const title = succeeded
            ? `Step ${stepNum} completed`
            : `Step ${stepNum} failed`;
          const body = `${event.tool}: ${String(event.result ?? '').slice(0, 100)}`;
          new Notification({ title, body }).show();
        }
      } catch (_) {
        // not JSON — ignore (could be Python warnings)
      }
    }
  });

  // ── Buffer stderr and only forward it as a single error event on close
  // (avoids treating every Python log line as an error event in the UI)
  let stderrBuffer = '';
  agentProcess.stderr.on('data', (data) => {
    stderrBuffer += data.toString();
  });

  // ── Close → notify renderer; also forward any buffered stderr as one error
  agentProcess.on('close', (code) => {
    agentProcess = null;
    const stderr = stderrBuffer.trim();
    // Only surface stderr if the process failed AND it looks like a real Python
    // exception (not just a deprecation warning or blank line)
    if (stderr && code !== 0) {
      const lines = stderr.split('\n').filter(l => l.trim());
      const errorLine = lines[lines.length - 1] ?? stderr.slice(0, 300);
      mainWindow?.webContents.send('agent:event', { type: 'error', step: 0, error: errorLine });
    }
    mainWindow?.webContents.send('agent:event', { type: 'close', exitCode: code ?? 0 });

    // ── Focus app and send OS notification when workflow finishes ──
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }

    if (Notification.isSupported()) {
      const succeeded = code === 0;
      new Notification({
        title: succeeded ? 'Workflow Completed' : 'Workflow Stopped',
        body: succeeded
          ? `✅ ${currentTaskLabel}`
          : `⚠️ ${currentTaskLabel}`,
        urgency: succeeded ? 'normal' : 'critical',
      }).show();
    }
  });

  agentProcess.on('error', (err) => {
    agentProcess = null;
    mainWindow?.webContents.send('agent:event', { type: 'error', step: 0, error: err.message });
  });

  return { started: true, error: null };
});

// agent:stop — kill the running agent process
ipcMain.on('agent:stop', () => {
  killAgent();
  mainWindow?.webContents.send('agent:event', { type: 'close', exitCode: -1 });
});

// ── Remove default menu bar ────────────────────────────────────────
Menu.setApplicationMenu(null);

// ── App lifecycle ──────────────────────────────────────────────────
app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('Workflow Agent');
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  killAgent();
  if (process.platform !== 'darwin') app.quit();
});
