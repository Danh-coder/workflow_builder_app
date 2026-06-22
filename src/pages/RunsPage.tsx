import { useState } from 'react';
import { Search, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { WorkflowRun, WorkflowStatus } from '../types';
import StatusBadge from '../components/StatusBadge';

const statusFilters: Array<WorkflowStatus | 'All'> = ['All', 'Running', 'Completed', 'Failed', 'Stopped'];

interface RunsPageProps {
  runs: WorkflowRun[];
  onViewLogs: (runId: string) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function RunsPage({ runs, onViewLogs }: RunsPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'All'>('All');

  const filtered = runs.filter((r) => {
    const matchSearch = r.workflowName.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col h-full bg-surface-0">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-base font-semibold text-slate-100">Run History</h1>
            <p className="text-xs text-slate-500 mt-0.5">{runs.length} total runs</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search runs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base w-full pl-9 pr-3 py-2"
            />
          </div>
          <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-lg p-1">
            {statusFilters.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  'text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors',
                  statusFilter === s ? 'bg-surface-4 text-slate-200' : 'text-slate-500 hover:text-slate-300',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Run ID', 'Workflow', 'Status', 'Started', 'Duration', 'Adapter', 'Errors', ''].map((h) => (
                  <th key={h} className="text-left text-[11px] text-slate-500 font-medium uppercase tracking-widest px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-sm text-slate-500">
                    No runs found
                  </td>
                </tr>
              ) : (
                filtered.map((run, i) => (
                  <tr
                    key={run.id}
                    className={clsx('hover:bg-surface-2 transition-colors', i !== 0 && 'border-t border-border')}
                  >
                    {/* Run ID */}
                    <td className="px-4 py-3">
                      <code className="text-[11px] text-slate-400 font-mono bg-surface-3 px-1.5 py-0.5 rounded">
                        {run.id}
                      </code>
                    </td>
                    {/* Workflow name */}
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-200 max-w-[180px] truncate">
                        {run.workflowName}
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={run.status} pulse={run.status === 'Running'} />
                    </td>
                    {/* Started */}
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {formatDate(run.startedAt)}
                    </td>
                    {/* Duration */}
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">
                      {run.duration ?? '—'}
                    </td>
                    {/* Adapter */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400 bg-surface-3 border border-border rounded px-2 py-0.5">
                        {run.adapterUsed}
                      </span>
                    </td>
                    {/* Error count */}
                    <td className="px-4 py-3">
                      {run.errorCount > 0 ? (
                        <span className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-0.5">
                          {run.errorCount} error{run.errorCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    {/* Logs button */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onViewLogs(run.id)}
                        className="btn-ghost py-1 px-2 text-xs"
                      >
                        <ExternalLink size={12} />
                        Logs
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mt-5">
          {[
            { label: 'Total Runs', value: runs.length, color: 'text-slate-300' },
            { label: 'Completed', value: runs.filter(r => r.status === 'Completed').length, color: 'text-emerald-400' },
            { label: 'Failed', value: runs.filter(r => r.status === 'Failed').length, color: 'text-red-400' },
            { label: 'Stopped', value: runs.filter(r => r.status === 'Stopped').length, color: 'text-orange-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card-elevated p-4 text-center">
              <div className={`text-2xl font-bold ${color} mb-0.5`}>{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
