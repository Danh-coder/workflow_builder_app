import { AppSettings } from '../types';
import { defaultSettings } from '../data/mockData';

const STORAGE_KEY = 'wf-agent-settings-v2';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSettings };
    // Merge with defaults so new fields are always present
    const stored = JSON.parse(raw) as Partial<AppSettings>;
    return { ...defaultSettings, ...stored };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('[settingsStore] Failed to save:', err);
  }
}

export function clearSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}
