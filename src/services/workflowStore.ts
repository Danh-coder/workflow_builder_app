import { Workflow } from '../types';

const STORAGE_KEY = 'wf_workflows_v1';

export function loadWorkflows(): Workflow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Workflow[]) : [];
  } catch {
    return [];
  }
}

export function upsertWorkflow(wf: Workflow): void {
  try {
    const workflows = loadWorkflows();
    const idx = workflows.findIndex((w) => w.id === wf.id);
    if (idx >= 0) {
      workflows[idx] = wf;
    } else {
      workflows.unshift(wf); // newest first
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
  } catch {
    // silently ignore storage quota errors
  }
}

export function removeWorkflow(id: string): void {
  try {
    const workflows = loadWorkflows().filter((w) => w.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
  } catch {
    // silently ignore
  }
}
