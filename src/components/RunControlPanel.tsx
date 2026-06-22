import { useState, useEffect, useRef } from 'react';
import { Play, Square, FileText } from 'lucide-react';
import { WorkflowRun } from '../types';

interface RunControlPanelProps {
  activeRun: WorkflowRun | null;
  onRun: () => void;
  onStop: () => void;
  onViewLogs: () => void;
}

function useElapsedTime(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      setElapsed(0);
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed(0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active]);

  const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function RunControlPanel({
  activeRun,
  onRun,
  onStop,
  onViewLogs,
}: RunControlPanelProps) {
  const isRunning = activeRun?.status === 'Running';
  const elapsed = useElapsedTime(isRunning);

  const progress = activeRun?.progress ?? 0;
  const totalSteps = activeRun?.totalSteps ?? 1;
  const currentStep = activeRun?.currentStep ?? 0;

  return (
    <div className="border-t border-border bg-surface-1 px-4 py-4 flex-shrink-0">
      {/* Running state */}
      {isRunning && activeRun && (
        <div className="mb-4 space-y-3 animate-fade-in">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-slate-400 font-medium">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-slate-500 font-mono">{elapsed}</span>
            </div>
            <div className="h-1.5 bg-surface-4 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700 progress-running"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] mt-1">
              <span className="text-slate-600">{Math.round(progress)}% complete</span>
              <button onClick={onViewLogs} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                <FileText size={10} />
                View logs
              </button>
            </div>
          </div>

          {/* Current step */}
          {activeRun.currentStepName && (
            <div className="bg-surface-3 border border-indigo-500/20 rounded-lg px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Currently running</div>
              <div className="text-xs text-slate-200 font-medium">{activeRun.currentStepName}</div>
              {activeRun.latestLog && (
                <div className="text-[11px] text-slate-500 font-mono mt-1 truncate">{activeRun.latestLog}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Completed state */}
      {activeRun?.status === 'Completed' && (
        <div className="mb-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2.5 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">Workflow completed</span>
          </div>
          <div className="text-[11px] text-emerald-500/70 mt-0.5">All {totalSteps} steps ran successfully</div>
        </div>
      )}

      {/* Failed state */}
      {activeRun?.status === 'Failed' && (
        <div className="mb-4 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2.5 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-sm font-medium text-red-400">Workflow failed</span>
          </div>
          <div className="text-[11px] text-red-400/70 mt-0.5">
            Failed at step {currentStep} — {activeRun.currentStepName}
          </div>
        </div>
      )}

      {/* Primary Run button */}
      {!isRunning ? (
        <button
          onClick={onRun}
          className="btn-primary w-full justify-center py-2.5 mb-3"
        >
          <Play size={15} fill="currentColor" />
          Run Workflow
        </button>
      ) : (
        <div className="flex gap-2 mb-3">
          <button
            onClick={onStop}
            className="flex items-center justify-center gap-1.5 flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg py-2 text-sm font-medium transition-colors"
          >
            <Square size={14} fill="currentColor" />
            Stop
          </button>
        </div>
      )}

      {/* Secondary buttons */}
      <div className="grid grid-cols-1 gap-2">
        <button onClick={onViewLogs} className="btn-ghost justify-center py-1.5 text-xs">
          <FileText size={13} />
          Logs
        </button>
      </div>
    </div>
  );
}
