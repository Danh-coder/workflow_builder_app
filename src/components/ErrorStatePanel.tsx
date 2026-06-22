import { XCircle, RefreshCw, Wand2, FileText } from 'lucide-react';
import { Workflow, WorkflowStep } from '../types';
import StatusBadge from './StatusBadge';

interface ErrorStatePanelProps {
  workflow: Workflow;
  failedStep: WorkflowStep;
  screenshotAvailable?: boolean;
  onRetryStep: () => void;
  onAskAIToFix: () => void;
  onStopWorkflow: () => void;
  onOpenLogs: () => void;
}

export default function ErrorStatePanel({
  workflow,
  failedStep,
  screenshotAvailable = true,
  onRetryStep,
  onAskAIToFix,
  onStopWorkflow,
  onOpenLogs,
}: ErrorStatePanelProps) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <XCircle size={18} className="text-red-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-red-400 mb-0.5">Workflow Failed</div>
          <div className="text-xs text-slate-400">{workflow.name}</div>
        </div>
        <div className="ml-auto">
          <StatusBadge status="Failed" />
        </div>
      </div>

      {/* Failed step */}
      <div className="bg-surface-2 border border-border rounded-lg p-3 mb-4">
        <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">Failed at step {failedStep.stepNumber}</div>
        <div className="text-sm font-medium text-slate-200 mb-1">
          {failedStep.actionType} → {failedStep.target}
        </div>
        <div className="text-xs text-red-400 font-mono bg-red-500/5 border border-red-500/10 rounded px-2 py-1.5 mt-2">
          Element not found: "{failedStep.target}" — page layout may have changed.
        </div>
      </div>

      {/* Screenshot preview */}
      {screenshotAvailable && (
        <div className="bg-surface-1 border border-border rounded-lg overflow-hidden mb-4">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-[11px] text-slate-500 font-medium">Error Screenshot</span>
            <span className="text-[10px] text-slate-600">Step {failedStep.stepNumber} · {new Date().toLocaleTimeString()}</span>
          </div>
          <div className="h-24 bg-gradient-to-br from-surface-3 to-surface-1 flex items-center justify-center">
            <div className="text-xs text-slate-600 flex flex-col items-center gap-1.5">
              <div className="w-8 h-6 bg-surface-4 rounded border border-border" />
              <span>screenshot_error.png</span>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onRetryStep} className="btn-secondary justify-center text-xs py-1.5">
          <RefreshCw size={13} />
          Retry Step
        </button>
        <button onClick={onAskAIToFix} className="btn-primary justify-center text-xs py-1.5">
          <Wand2 size={13} />
          Ask AI to Fix
        </button>
        <button onClick={onOpenLogs} className="btn-ghost justify-center text-xs py-1.5 col-span-1">
          <FileText size={13} />
          Open Logs
        </button>
        <button onClick={onStopWorkflow} className="btn-danger justify-center text-xs py-1.5">
          Stop Workflow
        </button>
      </div>
    </div>
  );
}
