import { useState, useEffect } from 'react';
import { Zap, Minus, Square, X, Maximize2 } from 'lucide-react';

const api = window.electronAPI;
const platform = api?.platform ?? 'web';
const isMac = platform === 'darwin';
const isElectron = !!api;

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!api) return;
    const unsub = api.onMaximizedChange(setIsMaximized);
    return unsub;
  }, []);

  // ── macOS: native traffic lights handle themselves; just render a
  //    draggable bar with app name centered (traffic lights live at x:14)
  if (isMac) {
    return (
      <div
        className="h-9 flex items-center justify-center flex-shrink-0 bg-surface-1 border-b border-border select-none relative"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* App name — centered */}
        <div className="flex items-center gap-1.5 pointer-events-none">
          <Zap size={12} className="text-indigo-400" fill="currentColor" />
          <span className="text-[12px] font-semibold text-slate-400 tracking-tight">Workflow Agent</span>
        </div>
      </div>
    );
  }

  // ── Windows / Linux / web: full custom title bar ─────────────────
  return (
    <div
      className="h-9 flex items-center flex-shrink-0 bg-surface-1 border-b border-border select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App icon + name */}
      <div className="flex items-center gap-2 px-4 pointer-events-none">
        <div className="w-4 h-4 rounded flex items-center justify-center bg-indigo-600/20">
          <Zap size={9} className="text-indigo-400" fill="currentColor" />
        </div>
        <span className="text-[12px] font-semibold text-slate-500 tracking-tight">Workflow Agent</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Window controls — no-drag zone */}
      {isElectron && (
        <div
          className="flex items-stretch h-full"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Minimize */}
          <button
            onClick={api!.minimize}
            className="w-11 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-surface-4 transition-colors"
            aria-label="Minimize"
          >
            <Minus size={14} />
          </button>

          {/* Maximize / Restore */}
          <button
            onClick={api!.maximize}
            className="w-11 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-surface-4 transition-colors"
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Square size={11} strokeWidth={1.5} /> : <Maximize2 size={12} />}
          </button>

          {/* Close */}
          <button
            onClick={api!.close}
            className="w-11 flex items-center justify-center text-slate-500 hover:text-white hover:bg-red-600 transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
