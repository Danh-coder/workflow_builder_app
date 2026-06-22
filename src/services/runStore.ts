import { WorkflowRun } from '../types';

const STORAGE_KEY = 'wf_runs_v1';
const MAX_RUNS = 200;

export function loadRuns(): WorkflowRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WorkflowRun[]) : [];
  } catch {
    return [];
  }
}

export function upsertRun(run: WorkflowRun): void {
  try {
    const runs = loadRuns();
    const idx = runs.findIndex((r) => r.id === run.id);
    if (idx >= 0) {
      runs[idx] = run;
    } else {
      runs.unshift(run); // newest first
    }
    const trimmed = runs.length > MAX_RUNS ? runs.slice(0, MAX_RUNS) : runs;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // silently ignore storage quota errors
  }
}
