import { Play, Copy, Trash2, Monitor } from 'lucide-react';
import { Workflow } from '../types';
import StatusBadge from './StatusBadge';
import clsx from 'clsx';

interface WorkflowCardProps {
  workflow: Workflow;
  onRun: (workflow: Workflow) => void;
  onDuplicate: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
  onSelect: (workflow: Workflow) => void;
}

const riskDotColor = { Low: 'bg-emerald-400', Medium: 'bg-yellow-400', High: 'bg-red-400' };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function WorkflowCard({
  workflow,
  onRun,
  onDuplicate,
  onDelete,
  onSelect,
}: WorkflowCardProps) {
  return (
    <div
      className="card p-4 hover:border-border-bright transition-all duration-150 cursor-pointer group animate-fade-in"
      onClick={() => onSelect(workflow)}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors truncate">
              {workflow.name}
            </h3>
            <StatusBadge status={workflow.status} size="sm" />
          </div>
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{workflow.description}</p>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-3 flex-wrap">
        <div className="flex items-center gap-1">
          <Monitor size={11} />
          <span>{workflow.osAdapter}</span>
        </div>
        <span>·</span>
        <span>{workflow.estimatedSteps} steps</span>
        <span>·</span>
        <div className="flex items-center gap-1">
          <span className={clsx('w-1.5 h-1.5 rounded-full', riskDotColor[workflow.riskLevel])} />
          <span>{workflow.riskLevel} risk</span>
        </div>
        <span>·</span>
        <span>Updated {formatDate(workflow.updatedAt)}</span>
      </div>

      {/* Platforms */}
      <div className="flex items-center gap-1.5 mb-3">
        {workflow.supportedOS.map((os) => (
          <span key={os} className="text-[10px] bg-surface-3 border border-border text-slate-500 rounded px-1.5 py-0.5">
            {os}
          </span>
        ))}
        {workflow.lastRunStatus && (
          <>
            <span className="text-slate-700">·</span>
            <span className="text-[11px] text-slate-600">Last run:</span>
            <StatusBadge status={workflow.lastRunStatus} size="sm" />
          </>
        )}
      </div>

      {/* Actions — revealed on hover */}
      <div
        className="flex items-center gap-2 pt-3 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onRun(workflow)}
          className="btn-primary text-xs py-1.5 px-3"
        >
          <Play size={12} fill="currentColor" />
          Run
        </button>
        <button onClick={() => onDuplicate(workflow)} className="btn-ghost text-xs py-1.5 px-2">
          <Copy size={12} />
        </button>
        <button onClick={() => onDelete(workflow)} className="btn-danger text-xs py-1.5 px-2 ml-auto">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
