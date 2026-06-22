import { useState, useEffect } from 'react';
import { Search, Download, Image, ChevronDown, Filter, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { LogLevel, LogEntry } from '../types';

const levelFilters: Array<LogLevel | 'all'> = ['all', 'info', 'warning', 'error'];

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
    ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function safeFilePart(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'all';
}

function toCsvValue(input: unknown) {
  const str = String(input ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function stripIcons(text: string) {
  // Remove emoji and other pictographic characters from message text
  return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\u{1F000}-\u{1FFFF}\u2600-\u27FF\uFE00-\uFE0F]/gu, '').trim();
}

function logsToCsv(rows: LogEntry[]) {
  const headers = ['id', 'timestamp', 'level', 'workflowName', 'workflowId', 'runId', 'stepId', 'message'];

  const lines = rows.map((row) => [
    row.id,
    row.timestamp,
    row.level,
    row.workflowName,
    row.workflowId,
    row.runId,
    row.stepId ?? '',
    stripIcons(row.message),
  ].map(toCsvValue).join(','));

  return [headers.join(','), ...lines].join('\n');
}

const levelConfig: Record<LogLevel, { classes: string; label: string }> = {
  info:    { classes: 'text-blue-400 bg-blue-500/10 border-blue-500/20',    label: 'INFO' },
  warning: { classes: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', label: 'WARN' },
  error:   { classes: 'text-red-400 bg-red-500/10 border-red-500/20',       label: 'ERR ' },
};

interface LogsPageProps {
  logs: LogEntry[];
  onClearLogs?: () => void;
  /** Pre-select a run ID filter when navigating from the Runs page or after a run finishes */
  initialRunId?: string;
  /** Pre-select a workflow name filter when navigating from the inspector without an active run */
  initialWorkflowName?: string;
}

export default function LogsPage({ logs, onClearLogs, initialRunId, initialWorkflowName }: LogsPageProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [workflowFilter, setWorkflowFilter] = useState<string>(initialWorkflowName ?? 'all');
  const [runFilter, setRunFilter] = useState<string>(initialRunId ?? 'all');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [expandedScreenshot, setExpandedScreenshot] = useState<string | null>(null);

  // Sync filters when parent navigates here with specific context
  useEffect(() => {
    setRunFilter(initialRunId ?? 'all');
    setWorkflowFilter(initialWorkflowName ?? 'all');
  }, [initialRunId, initialWorkflowName]);

  const allWorkflows = Array.from(new Set(logs.map((l) => l.workflowName)));
  const allRunIds = Array.from(new Set(logs.map((l) => l.runId).filter(Boolean)));

  const filtered = logs.filter((log) => {
    const matchSearch = log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.workflowName.toLowerCase().includes(search.toLowerCase()) ||
      (log.stepId ?? '').toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchWorkflow = workflowFilter === 'all' || log.workflowName === workflowFilter;
    const matchRun = runFilter === 'all' || log.runId === runFilter;
    return matchSearch && matchLevel && matchWorkflow && matchRun;
  });

  const handleExportLogs = () => {
    if (filtered.length === 0) return;

    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g, '-');
    const scope = runFilter !== 'all'
      ? `run-${safeFilePart(runFilter)}`
      : workflowFilter !== 'all'
        ? `workflow-${safeFilePart(workflowFilter)}`
        : 'all';

    const isCsv = exportFormat === 'csv';
    const payload = {
      exportedAt: now.toISOString(),
      filters: {
        search,
        level: levelFilter,
        workflow: workflowFilter,
        runId: runFilter,
      },
      totalEntries: logs.length,
      exportedEntries: filtered.length,
      entries: filtered,
    };

    const blob = isCsv
      ? new Blob([logsToCsv(filtered)], { type: 'text/csv;charset=utf-8' })
      : new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-logs-${scope}-${stamp}.${isCsv ? 'csv' : 'json'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-surface-0">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-base font-semibold text-slate-100">Logs</h1>
            <p className="text-xs text-slate-500 mt-0.5">{logs.length} entries · {filtered.length} shown</p>
          </div>
          <div className="flex items-center gap-2">
            {onClearLogs && logs.length > 0 && (
              <button onClick={onClearLogs} className="btn-ghost text-xs py-1.5 text-red-400 hover:text-red-300">
                <Trash2 size={13} />
                Clear
              </button>
            )}
            <div className="relative">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                className="input-base pr-8 pl-3 py-1.5 text-xs appearance-none cursor-pointer"
                title="Export format"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            <button
              onClick={handleExportLogs}
              disabled={filtered.length === 0}
              className="btn-secondary text-xs py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title={filtered.length === 0 ? 'No logs to export' : `Export currently shown logs as ${exportFormat.toUpperCase()}`}
            >
              <Download size={13} />
              Export Logs
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search logs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base w-full pl-9 pr-3 py-2"
            />
          </div>

          {/* Level filter */}
          <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-lg p-1">
            {levelFilters.map((l) => (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                className={clsx(
                  'text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors capitalize',
                  levelFilter === l ? 'bg-surface-4 text-slate-200' : 'text-slate-500 hover:text-slate-300',
                )}
              >
                {l === 'all' ? 'All' : l}
              </button>
            ))}
          </div>

          {/* Workflow filter */}
          <div className="relative">
            <select
              value={workflowFilter}
              onChange={(e) => setWorkflowFilter(e.target.value)}
              className="input-base pr-8 pl-3 py-2 appearance-none cursor-pointer"
            >
              <option value="all">All workflows</option>
              {allWorkflows.map((wfName) => (
                <option key={wfName} value={wfName}>{wfName}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          {/* Run ID filter */}
          <div className="relative">
            <select
              value={runFilter}
              onChange={(e) => setRunFilter(e.target.value)}
              className={clsx(
                'input-base pr-8 pl-3 py-2 appearance-none cursor-pointer',
                runFilter !== 'all' && 'border-indigo-500/40 text-indigo-300',
              )}
            >
              <option value="all">All runs</option>
              {allRunIds.map((rid) => (
                <option key={rid} value={rid}>{rid}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Active run filter banner */}
        {runFilter !== 'all' && (
          <div className="mt-3 flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2">
            <span className="text-[11px] text-indigo-300 font-mono flex-1">
              Showing logs for run: <span className="font-semibold">{runFilter}</span>
            </span>
            <button
              onClick={() => setRunFilter('all')}
              className="text-[11px] text-indigo-400 hover:text-indigo-200 transition-colors"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Active workflow filter banner */}
        {workflowFilter !== 'all' && runFilter === 'all' && (
          <div className="mt-3 flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
            <span className="text-[11px] text-violet-300 font-mono flex-1">
              Showing logs for workflow: <span className="font-semibold">{workflowFilter}</span>
            </span>
            <button
              onClick={() => setWorkflowFilter('all')}
              className="text-[11px] text-violet-400 hover:text-violet-200 transition-colors"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>

      {/* Log table */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[160px_80px_120px_60px_1fr_80px] gap-0 border-b border-border px-4 py-2.5">
            {['Timestamp', 'Level', 'Workflow', 'Step', 'Message', ''].map((h) => (
              <div key={h} className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Filter size={24} className="text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">
                {logs.length === 0 ? 'No logs yet — run a workflow to see live logs here' : 'No log entries match your filters'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((log) => (
                <div key={log.id}>
                  <div
                    className={clsx(
                      'grid grid-cols-[160px_80px_120px_60px_1fr_80px] gap-0 px-4 py-2.5 hover:bg-surface-2 transition-colors',
                      log.level === 'error' && 'bg-red-500/3',
                      log.level === 'warning' && 'bg-yellow-500/3',
                    )}
                  >
                    {/* Timestamp */}
                    <div className="font-mono text-[11px] text-slate-500 self-center whitespace-nowrap overflow-hidden">
                      {formatTimestamp(log.timestamp)}
                    </div>
                    {/* Level badge */}
                    <div className="self-center">
                      <span className={clsx(
                        'text-[10px] font-mono font-bold border rounded px-1.5 py-0.5',
                        levelConfig[log.level].classes,
                      )}>
                        {levelConfig[log.level].label}
                      </span>
                    </div>
                    {/* Workflow */}
                    <div className="self-center text-[11px] text-slate-400 truncate pr-2">
                      {log.workflowName.split(' ').slice(0, 2).join(' ')}…
                    </div>
                    {/* Step */}
                    <div className="self-center">
                      {log.stepId && (
                        <code className="text-[10px] text-slate-600 font-mono">{log.stepId}</code>
                      )}
                    </div>
                    {/* Message */}
                    <div className={clsx(
                      'self-center text-xs font-mono truncate',
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warning' ? 'text-yellow-400/80' :
                      'text-slate-300',
                    )}>
                      {log.message}
                    </div>
                    {/* Screenshot */}
                    <div className="self-center flex justify-end">
                      {log.hasScreenshot && (
                        <button
                          onClick={() => setExpandedScreenshot(
                            expandedScreenshot === log.id ? null : log.id
                          )}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="View screenshot"
                        >
                          <Image size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded screenshot */}
                  {expandedScreenshot === log.id && (
                    <div className="px-4 py-3 bg-surface-2 border-t border-border animate-slide-up">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Error Screenshot</div>
                      <div className="h-28 bg-surface-3 border border-border rounded-lg flex items-center justify-center text-xs text-slate-600">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-12 h-8 bg-surface-4 rounded border border-border" />
                          <span>screenshot_step_{log.stepId}.png</span>
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] text-red-400 font-mono">{log.message}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mt-5">
          {[
            { label: 'Info',    count: logs.filter(l => l.level === 'info').length,    color: 'text-blue-400' },
            { label: 'Warning', count: logs.filter(l => l.level === 'warning').length, color: 'text-yellow-400' },
            { label: 'Error',   count: logs.filter(l => l.level === 'error').length,   color: 'text-red-400' },
          ].map(({ label, count, color }) => (
            <div key={label} className="card-elevated p-4 text-center">
              <div className={`text-2xl font-bold ${color} mb-0.5`}>{count}</div>
              <div className="text-xs text-slate-500">{label} entries</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
