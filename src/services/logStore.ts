import { LogEntry } from '../types';

const STORAGE_KEY = 'wf_logs_v1';
const MAX_LOGS = 2000;

export function loadLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LogEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendLog(entry: LogEntry): void {
  try {
    const logs = loadLogs();
    logs.push(entry);
    const trimmed = logs.length > MAX_LOGS ? logs.slice(logs.length - MAX_LOGS) : logs;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // silently ignore storage quota errors
  }
}

export function clearLogs(): void {
  localStorage.removeItem(STORAGE_KEY);
}
