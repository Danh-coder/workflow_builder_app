import { Shield, Monitor, Globe, Layers, ChevronRight, Zap } from 'lucide-react';
import { Workflow, WorkflowRun, WorkflowStep } from '../types';
import StatusBadge from './StatusBadge';
import WorkflowStepTimeline from './WorkflowStepTimeline';
import RunControlPanel from './RunControlPanel';

interface WorkflowInspectorProps {
  workflow: Workflow | null;
  activeRun: WorkflowRun | null;
  runningSteps: WorkflowStep[];
  activeStepIndex: number;
  onRunWorkflow: () => void;
  onStopWorkflow: () => void;
  onViewLogs: () => void;
}

function EmptyInspector() {
  return (
    <div className="flex flex-col items-center justify-center h-full pb-16 px-6 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-xl bg-surface-3 border border-border flex items-center justify-center mb-4">
        <Layers size={22} className="text-slate-600" />
      </div>
      <p className="text-sm font-medium text-slate-500 mb-1.5">No workflow selected</p>
      <p className="text-xs text-slate-600 leading-relaxed">
        Generate a workflow in the chat or select one from the Workflows page to inspect and run it here.
      </p>
    </div>
  );
}

const riskConfig = {
  Low:    { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  Medium: { color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20' },
  High:   { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
};

export default function WorkflowInspector({
  workflow,
  activeRun,
  runningSteps,
  activeStepIndex,
  onRunWorkflow,
  onStopWorkflow,
  onViewLogs,
}: WorkflowInspectorProps) {
  const steps = runningSteps.length > 0 ? runningSteps : (workflow?.steps ?? []);

  return (
    <aside className="w-[340px] flex-shrink-0 h-full bg-surface-1 border-l border-border flex flex-col">
      {!workflow ? (
        <EmptyInspector />
      ) : (
        <>
          {/* Header */}
          <div className="px-4 pt-5 pb-4 border-b border-border flex-shrink-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h2 className="text-sm font-semibold text-slate-100 leading-snug flex-1 min-w-0 truncate">
                {workflow.name}
              </h2>
              <StatusBadge
                status={activeRun?.status ?? workflow.status}
                pulse={activeRun?.status === 'Running'}
              />
            </div>
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{workflow.goal}</p>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Summary */}
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Workflow Summary
              </div>
              <div className="space-y-2.5">
                {/* OS Adapter */}
                <div className="flex items-center gap-2.5">
                  <Monitor size={13} className="text-slate-500 flex-shrink-0" />
                  <span className="text-xs text-slate-500 w-20 flex-shrink-0">Adapter</span>
                  <span className="text-xs font-medium text-slate-300">{workflow.osAdapter}</span>
                </div>
                {/* Platform */}
                <div className="flex items-center gap-2.5">
                  <Globe size={13} className="text-slate-500 flex-shrink-0" />
                  <span className="text-xs text-slate-500 w-20 flex-shrink-0">Platform</span>
                  <span className="text-xs text-slate-300">{workflow.supportedOS.join(', ')}</span>
                </div>
                {/* Risk level */}
                <div className="flex items-center gap-2.5">
                  <Shield size={13} className="text-slate-500 flex-shrink-0" />
                  <span className="text-xs text-slate-500 w-20 flex-shrink-0">Risk level</span>
                  <span className={`text-xs font-semibold ${riskConfig[workflow.riskLevel].color}`}>
                    {workflow.riskLevel}
                  </span>
                </div>
                {/* Permissions */}
                <div className="flex items-start gap-2.5">
                  <Layers size={13} className="text-slate-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-500 w-20 flex-shrink-0 mt-0.5">Permissions</span>
                  <div className="flex flex-wrap gap-1">
                    {workflow.requiredPermissions.map((p) => (
                      <span key={p} className="text-[10px] bg-surface-3 border border-border text-slate-400 rounded px-1.5 py-0.5">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  Workflow Steps
                </div>
                <span className="text-[11px] text-slate-600">{steps.length} steps</span>
              </div>
              <WorkflowStepTimeline steps={steps} activeStepIndex={activeStepIndex} />
            </div>
          </div>

          {/* Run controls — pinned at bottom */}
          <RunControlPanel
            activeRun={activeRun}
            onRun={onRunWorkflow}
            onStop={onStopWorkflow}
            onViewLogs={onViewLogs}
          />
        </>
      )}
    </aside>
  );
}
