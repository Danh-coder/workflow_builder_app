import clsx from 'clsx';
import { WorkflowStatus, StepStatus, LogLevel, RiskLevel } from '../types';

type BadgeVariant = WorkflowStatus | StepStatus | LogLevel | RiskLevel | 'Connected' | 'Disconnected' | 'Missing API Key';

interface StatusBadgeProps {
  status: BadgeVariant;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

const badgeConfig: Record<string, { label: string; classes: string; dotColor: string }> = {
  // Workflow statuses
  Draft:      { label: 'Draft',      classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20',    dotColor: 'bg-slate-400' },
  Ready:      { label: 'Ready',      classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20',       dotColor: 'bg-blue-400' },
  Running:    { label: 'Running',    classes: 'bg-violet-500/10 text-violet-400 border-violet-500/20', dotColor: 'bg-violet-400' },
  Completed:  { label: 'Completed',  classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dotColor: 'bg-emerald-400' },
  Failed:     { label: 'Failed',     classes: 'bg-red-500/10 text-red-400 border-red-500/20',          dotColor: 'bg-red-400' },
  Stopped:    { label: 'Stopped',    classes: 'bg-orange-500/10 text-orange-400 border-orange-500/20', dotColor: 'bg-orange-400' },
  // Step statuses
  Pending:    { label: 'Pending',    classes: 'bg-slate-500/10 text-slate-500 border-slate-500/20',    dotColor: 'bg-slate-500' },
  Success:    { label: 'Success',    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dotColor: 'bg-emerald-400' },
  'Needs Confirmation': { label: 'Confirm', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', dotColor: 'bg-yellow-400' },
  // Log levels
  info:       { label: 'Info',       classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20',       dotColor: 'bg-blue-400' },
  warning:    { label: 'Warning',    classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', dotColor: 'bg-yellow-400' },
  error:      { label: 'Error',      classes: 'bg-red-500/10 text-red-400 border-red-500/20',          dotColor: 'bg-red-400' },
  // Risk levels
  Low:        { label: 'Low Risk',   classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dotColor: 'bg-emerald-400' },
  Medium:     { label: 'Med Risk',   classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', dotColor: 'bg-yellow-400' },
  High:       { label: 'High Risk',  classes: 'bg-red-500/10 text-red-400 border-red-500/20',          dotColor: 'bg-red-400' },
  // Connection
  Connected:     { label: 'Connected',      classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dotColor: 'bg-emerald-400' },
  Disconnected:  { label: 'Disconnected',   classes: 'bg-slate-500/10 text-slate-500 border-slate-500/20',       dotColor: 'bg-slate-500' },
  'Missing API Key': { label: 'No API Key', classes: 'bg-red-500/10 text-red-400 border-red-500/20',             dotColor: 'bg-red-400' },
};

export default function StatusBadge({ status, size = 'sm', pulse = false }: StatusBadgeProps) {
  const config = badgeConfig[status] ?? badgeConfig['Draft'];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium border rounded-full',
        config.classes,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
      )}
    >
      <span
        className={clsx(
          'rounded-full flex-shrink-0',
          config.dotColor,
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
          (pulse || status === 'Running') && 'animate-pulse-dot',
        )}
      />
      {config.label}
    </span>
  );
}
