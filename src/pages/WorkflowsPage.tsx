import { useState } from 'react';
import { Search, LayoutGrid, List, Filter, Plus } from 'lucide-react';
import clsx from 'clsx';
import { Workflow, WorkflowStatus, OS } from '../types';
import WorkflowCard from '../components/WorkflowCard';
import StatusBadge from '../components/StatusBadge';
import ConfirmationModal from '../components/ConfirmationModal';

type ViewMode = 'grid' | 'list';
const statusFilters: Array<WorkflowStatus | 'All'> = ['All', 'Draft', 'Ready', 'Running', 'Completed', 'Failed'];
const osFilters: Array<OS | 'All'> = ['All', 'macOS', 'Windows'];

interface WorkflowsPageProps {
  workflows: Workflow[];
  onRunWorkflow: (workflow: Workflow) => void;
  onSelectWorkflow: (workflow: Workflow) => void;
  onDeleteWorkflow: (id: string) => void;
  onDuplicateWorkflow: (wf: Workflow) => void;
  onNewWorkflow: () => void;
}

export default function WorkflowsPage({
  workflows,
  onRunWorkflow,
  onSelectWorkflow,
  onDeleteWorkflow,
  onDuplicateWorkflow,
  onNewWorkflow,
}: WorkflowsPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'All'>('All');
  const [osFilter, setOsFilter] = useState<OS | 'All'>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);

  const filtered = workflows.filter((wf) => {
    const matchSearch = wf.name.toLowerCase().includes(search.toLowerCase()) ||
      wf.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || wf.status === statusFilter;
    const matchOS = osFilter === 'All' || wf.supportedOS.includes(osFilter);
    return matchSearch && matchStatus && matchOS;
  });

  const handleDelete = (wf: Workflow) => setDeleteTarget(wf);
  const confirmDelete = () => {
    if (deleteTarget) {
      onDeleteWorkflow(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-0">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-base font-semibold text-slate-100">Workflows</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {workflows.length} workflows · {filtered.length} shown
            </p>
          </div>
          <button onClick={onNewWorkflow} className="btn-primary text-sm py-1.5">
            <Plus size={15} />
            New Workflow
          </button>
        </div>

        {/* Search + filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search workflows…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base w-full pl-9 pr-3 py-2"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-lg p-1 flex-wrap">
            {statusFilters.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  'text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors',
                  statusFilter === s
                    ? 'bg-surface-4 text-slate-200'
                    : 'text-slate-500 hover:text-slate-300',
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* OS filter */}
          <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-lg p-1">
            {osFilters.map((o) => (
              <button
                key={o}
                onClick={() => setOsFilter(o)}
                className={clsx(
                  'text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors',
                  osFilter === o ? 'bg-surface-4 text-slate-200' : 'text-slate-500 hover:text-slate-300',
                )}
              >
                {o}
              </button>
            ))}
          </div>

          {/* View mode */}
          <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx('p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-surface-4 text-slate-200' : 'text-slate-500 hover:text-slate-300')}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-surface-4 text-slate-200' : 'text-slate-500 hover:text-slate-300')}
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48">
            <Filter size={24} className="text-slate-600 mb-3" />
            <p className="text-sm text-slate-500">No workflows match your filters</p>
            <button
              onClick={() => { setSearch(''); setStatusFilter('All'); setOsFilter('All'); }}
              className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filtered.map((wf) => (
              <WorkflowCard
                key={wf.id}
                workflow={wf}
                onRun={onRunWorkflow}
                onDuplicate={onDuplicateWorkflow}
                onDelete={handleDelete}
                onSelect={onSelectWorkflow}
              />
            ))}
          </div>
        ) : (
          /* Table / list view */
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] text-slate-500 font-medium uppercase tracking-widest px-4 py-3">Name</th>
                  <th className="text-left text-[11px] text-slate-500 font-medium uppercase tracking-widest px-4 py-3">Status</th>
                  <th className="text-left text-[11px] text-slate-500 font-medium uppercase tracking-widest px-4 py-3">Platform</th>
                  <th className="text-left text-[11px] text-slate-500 font-medium uppercase tracking-widest px-4 py-3">Steps</th>
                  <th className="text-left text-[11px] text-slate-500 font-medium uppercase tracking-widest px-4 py-3">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((wf, i) => (
                  <tr
                    key={wf.id}
                    className={clsx('cursor-pointer hover:bg-surface-3 transition-colors', i !== 0 && 'border-t border-border')}
                    onClick={() => onSelectWorkflow(wf)}
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-200">{wf.name}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[200px]">{wf.description}</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={wf.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{wf.supportedOS.join(', ')}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{wf.estimatedSteps}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(wf.updatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => onRunWorkflow(wf)} className="btn-ghost py-1 px-2 text-xs">
                          Run
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <ConfirmationModal
          title="Delete workflow?"
          message={`"${deleteTarget.name}" will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
