import {
  Shield,
  Globe,
  Download,
  Monitor,
  CheckCircle,
  Play,
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
  onRunNow: (workflow: Workflow) => void;
}

export default function WorkflowPreviewCard({
  workflow,
  deleted = false,
  onPreviewSteps,
  onRunNow,
}: WorkflowPreviewCardProps) {
  const riskColor =
    workflow.riskLevel === 'High' ? 'text-red-400' :
    workflow.riskLevel === 'Medium' ? 'text-yellow-400' :
    'text-emerald-400';

  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-xl w-full max-w-[520px] animate-slide-up relative group">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 opacity-80 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-white/5 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Layers size={11} className="text-indigo-400" />
            </div>
            <span className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 uppercase tracking-widest font-heading">Generated Workflow</span>
          </div>
          <h3 className="text-base font-bold text-white leading-snug font-heading mt-1">{workflow.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{workflow.goal}</p>
        </div>
        <StatusBadge status={workflow.status} size="sm" />
      </div>

      {/* Metadata grid */}
      <div className="px-4 pb-4 grid grid-cols-3 gap-3">
        <div className="bg-surface-2/40 backdrop-blur-sm rounded-xl px-2.5 py-2 text-center border border-white/5 group-hover:border-white/10 transition-colors">
          <div className="text-lg font-bold text-slate-100 font-heading">{workflow.estimatedSteps}</div>
          <div className="text-[10px] text-slate-500 font-medium">Steps</div>
        </div>
        <div className="bg-surface-2/40 backdrop-blur-sm rounded-xl px-2.5 py-2 text-center border border-white/5 group-hover:border-white/10 transition-colors">
          <div className={clsx('text-xs font-semibold mt-1', riskColor)}>{workflow.riskLevel}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">Risk</div>
        </div>
        <div className="bg-surface-2/40 backdrop-blur-sm rounded-xl px-2.5 py-2 text-center border border-white/5 group-hover:border-white/10 transition-colors">
          <div className="text-xs font-semibold text-slate-300 mt-1">{workflow.supportedOS.length > 1 ? 'Both' : workflow.supportedOS[0]}</div>
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
              <span key={perm} className="inline-flex items-center gap-1.5 bg-surface-2/50 border border-white/5 backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] text-slate-300 shadow-sm transition-all hover:bg-surface-3/50">
                <Icon size={11} className="text-indigo-400" />
                {perm}
              </span>
            );
          })}
        </div>
      </div>

      {/* Risk warning for High risk */}
      {workflow.riskLevel === 'High' && (
        <div className="mx-4 mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 shadow-sm">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-400 leading-relaxed">
            This workflow performs sensitive actions. Review all steps carefully before running.
          </p>
        </div>
      )}

      {/* OS Adapter */}
      <div className="px-4 pb-4 flex items-center gap-2">
        <Monitor size={14} className="text-slate-500" />
        <span className="text-xs text-slate-500">Adapter:</span>
        <span className="text-xs font-medium text-slate-300">{workflow.osAdapter}</span>
        <ChevronRight size={12} className="text-slate-600" />
        <span className="text-xs text-slate-500">{workflow.supportedOS.join(', ')}</span>
      </div>

      {/* Actions */}
      <div className="px-4 pb-5 flex items-center gap-3">
        {deleted ? (
          <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-2/40 border border-white/5 backdrop-blur-sm text-xs text-slate-500">
            <Trash2 size={14} />
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
