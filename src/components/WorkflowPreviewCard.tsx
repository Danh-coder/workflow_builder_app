import {
  Shield,
  Globe,
  Download,
  Monitor,
  CheckCircle,
  Play,
  Save,
  Eye,
  ChevronRight,
  Layers,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { Workflow } from '../types';
import StatusBadge from './StatusBadge';
import clsx from 'clsx';

const permissionIcons: Record<string, React.ElementType> = {
  'Browser control': Globe,
  'File download': Download,
  'Screen reading': Monitor,
  'File system access': Layers,
  'App control': Monitor,
  'File system': Layers,
  default: Shield,
};

interface WorkflowPreviewCardProps {
  workflow: Workflow;
  deleted?: boolean;
  onPreviewSteps: (workflow: Workflow) => void;
  onSaveWorkflow: (workflow: Workflow) => void;
  onRunNow: (workflow: Workflow) => void;
}

export default function WorkflowPreviewCard({
  workflow,
  deleted = false,
  onPreviewSteps,
  onSaveWorkflow,
  onRunNow,
}: WorkflowPreviewCardProps) {
  const riskColor =
    workflow.riskLevel === 'High' ? 'text-red-400' :
    workflow.riskLevel === 'Medium' ? 'text-yellow-400' :
    'text-emerald-400';

  return (
    <div className="bg-surface-3 border border-accent-200 rounded-xl overflow-hidden shadow-lg w-full max-w-[520px] animate-slide-up">
      {/* Top accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500" />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-md bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <Layers size={11} className="text-indigo-400" />
            </div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Generated Workflow</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-100 leading-snug">{workflow.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{workflow.goal}</p>
        </div>
        <StatusBadge status={workflow.status} size="sm" />
      </div>

      {/* Metadata grid */}
      <div className="px-4 pb-3 grid grid-cols-3 gap-2">
        <div className="bg-surface-2 rounded-lg px-2.5 py-2 text-center border border-border">
          <div className="text-lg font-bold text-slate-100">{workflow.estimatedSteps}</div>
          <div className="text-[10px] text-slate-500">Steps</div>
        </div>
        <div className="bg-surface-2 rounded-lg px-2.5 py-2 text-center border border-border">
          <div className={clsx('text-xs font-semibold', riskColor)}>{workflow.riskLevel}</div>
          <div className="text-[10px] text-slate-500">Risk</div>
        </div>
        <div className="bg-surface-2 rounded-lg px-2.5 py-2 text-center border border-border">
          <div className="text-xs font-semibold text-slate-300">{workflow.supportedOS.length > 1 ? 'Both' : workflow.supportedOS[0]}</div>
          <div className="text-[10px] text-slate-500">Platform</div>
        </div>
      </div>

      {/* Permissions */}
      <div className="px-4 pb-3">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Required Permissions</div>
        <div className="flex flex-wrap gap-1.5">
          {workflow.requiredPermissions.map((perm) => {
            const Icon = permissionIcons[perm] ?? permissionIcons.default;
            return (
              <span key={perm} className="inline-flex items-center gap-1 bg-surface-2 border border-border rounded-full px-2 py-0.5 text-[11px] text-slate-400">
                <Icon size={10} className="text-slate-500" />
                {perm}
              </span>
            );
          })}
        </div>
      </div>

      {/* Risk warning for High risk */}
      {workflow.riskLevel === 'High' && (
        <div className="mx-4 mb-3 flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertTriangle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-400 leading-relaxed">
            This workflow performs sensitive actions. Review all steps carefully before running.
          </p>
        </div>
      )}

      {/* OS Adapter */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <Monitor size={13} className="text-slate-500" />
        <span className="text-xs text-slate-500">Adapter:</span>
        <span className="text-xs font-medium text-slate-300">{workflow.osAdapter}</span>
        <ChevronRight size={12} className="text-slate-600" />
        <span className="text-xs text-slate-500">{workflow.supportedOS.join(', ')}</span>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex items-center gap-2">
        {deleted ? (
          <div className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-surface-2 border border-border text-xs text-slate-500">
            <Trash2 size={13} />
            Workflow deleted
          </div>
        ) : (
          <>
            <button
              onClick={() => onPreviewSteps(workflow)}
              className="btn-ghost text-xs py-1.5 px-3"
            >
              <Eye size={13} />
              Preview Steps
            </button>
            <button
              onClick={() => onSaveWorkflow(workflow)}
              className="btn-secondary text-xs py-1.5 flex-1 justify-center"
            >
              <Save size={13} />
              Save
            </button>
            <button
              onClick={() => onRunNow(workflow)}
              className="btn-primary text-xs py-1.5 flex-1 justify-center"
            >
              <Play size={13} fill="currentColor" />
              Run Now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
