const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  // Listen for maximize state changes from main process
  onMaximizedChange: (callback) => {
    const sub = (_event, isMaximized) => callback(isMaximized);
    ipcRenderer.on('window-maximized', sub);
    return () => ipcRenderer.removeListener('window-maximized', sub);
  },

  // Outbound HTTP — runs in Node.js main process, no CORS
  httpRequest: (opts) => ipcRenderer.invoke('http-request', opts),

  // ── Windows-Use agent process control ───────────────────────────

  /**
   * Start the Windows-Use agent subprocess.
   * @param {string} task  Natural-language task description.
   * @param {object} settings  AppSettings object (provider, apiKey, model, etc.)
   * @returns {Promise<{started: boolean, error: string|null}>}
   */
  startAgent: (task, settings) => ipcRenderer.invoke('agent:start', { task, settings }),

  /**
   * Kill the running agent process immediately.
   */
  stopAgent: () => ipcRenderer.send('agent:stop'),

  /**
   * Subscribe to agent events streamed from the subprocess.
   * @param {(event: AgentEvent) => void} callback
   * @returns {() => void}  Unsubscribe function.
   */
  onAgentEvent: (callback) => {
    const sub = (_ipcEvent, agentEvent) => callback(agentEvent);
    ipcRenderer.on('agent:event', sub);
    return () => ipcRenderer.removeListener('agent:event', sub);
  },
});

