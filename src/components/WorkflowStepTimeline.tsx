import clsx from 'clsx';
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Globe,
  MousePointer,
  Keyboard,
  Eye,
  Download,
  FolderOpen,
  Bell,
  RefreshCw,
  Database,
  FileText,
  Terminal,
} from 'lucide-react';
import { WorkflowStep, StepStatus } from '../types';

const actionIcons: Record<string, React.ElementType> = {
  'Open Browser': Globe,
  'Navigate': Globe,
  'Click': MousePointer,
  'Type': Keyboard,
  'Wait': Clock,
  'Select': MousePointer,
  'Download': Download,
  'Save File': FolderOpen,
  'Notify': Bell,
  'Read File': FileText,
  'Write File': FileText,
  'Extract': Database,
  'Loop': RefreshCw,
  'Open App': Terminal,
  'Login': Eye,
  'Fill Form': Keyboard,
  'Upload': FolderOpen,
  'Confirm': AlertTriangle,
  'Log': FileText,
  default: Terminal,
};

function StepIcon({ status, actionType }: { status: StepStatus; actionType: string }) {
  if (status === 'Success') return <CheckCircle size={14} className="text-emerald-400" />;
  if (status === 'Failed') return <XCircle size={14} className="text-red-400" />;
  if (status === 'Running') return <Loader2 size={14} className="text-indigo-400 animate-spin" />;
  if (status === 'Needs Confirmation') return <AlertTriangle size={14} className="text-yellow-400" />;

  const Icon = actionIcons[actionType] ?? actionIcons.default;
  return <Icon size={14} className="text-slate-500" />;
}

interface WorkflowStepTimelineProps {
  steps: WorkflowStep[];
  activeStepIndex: number;
}

export default function WorkflowStepTimeline({ steps, activeStepIndex }: WorkflowStepTimelineProps) {
  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isDone = step.status === 'Success';
        const isFailed = step.status === 'Failed';
        const isRunning = step.status === 'Running';
        const isActive = index === activeStepIndex;

        return (
          <div key={step.id} className="flex gap-3">
            {/* Timeline connector */}
            <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
              {/* Step icon circle */}
              <div
                className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all duration-300',
                  isDone ? 'bg-emerald-500/10 border-emerald-500/40' :
                  isFailed ? 'bg-red-500/10 border-red-500/40' :
                  isRunning ? 'bg-indigo-500/10 border-indigo-500/60 glow-indigo' :
                  isActive ? 'bg-surface-4 border-indigo-500/30' :
                  'bg-surface-2 border-border',
                )}
              >
                <StepIcon status={step.status} actionType={step.actionType} />
              </div>
              {/* Vertical line */}
              {!isLast && (
                <div
                  className={clsx(
                    'w-0.5 flex-1 mt-1 mb-0 min-h-[20px]',
                    isDone ? 'bg-emerald-500/30' : 'bg-border',
                  )}
                />
              )}
            </div>

            {/* Step content */}
            <div
              className={clsx(
                'flex-1 pb-4 min-w-0',
                isLast && 'pb-1',
              )}
            >
              <div
                className={clsx(
                  'rounded-lg border px-3 py-2.5 transition-all duration-300',
                  isDone ? 'bg-emerald-500/5 border-emerald-500/15' :
                  isFailed ? 'bg-red-500/5 border-red-500/20' :
                  isRunning ? 'bg-indigo-500/5 border-indigo-500/25 glow-indigo' :
                  'bg-surface-2 border-border',
                )}
              >
                {/* Step number + action */}
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] text-slate-600 font-mono flex-shrink-0">
                      {String(step.stepNumber).padStart(2, '0')}
                    </span>
                    <span
                      className={clsx(
                        'text-xs font-semibold truncate',
                        isDone ? 'text-emerald-400' :
                        isFailed ? 'text-red-400' :
                        isRunning ? 'text-indigo-300' :
                        'text-slate-300',
                      )}
                    >
                      {step.actionType}
                    </span>
                  </div>
                  {isRunning && (
                    <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5 flex-shrink-0 font-medium">
                      Running
                    </span>
                  )}
                  {isDone && (
                    <span className="text-[10px] text-emerald-400 flex-shrink-0">✓</span>
                  )}
                  {isFailed && (
                    <span className="text-[10px] text-red-400 flex-shrink-0">✗</span>
                  )}
                </div>
                {/* Target */}
                <p className="text-[11px] text-slate-500 truncate">{step.target}</p>
                {/* Expected result — show when done or running */}
                {(isDone || isRunning) && (
                  <p className={clsx('text-[11px] mt-1 truncate', isDone ? 'text-emerald-500' : 'text-slate-500')}>
                    → {step.expectedResult}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
