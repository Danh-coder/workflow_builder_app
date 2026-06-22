import { ChatMessage, ChatSession } from '../types';

const STORAGE_KEY = 'wf-agent-chats-v1';
const MAX_SESSIONS = 50;

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch (err) {
    console.error('[chatStore] Failed to save:', err);
  }
}

/** Derive a readable title from the first user message. */
export function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return 'New chat';
  return first.content.length > 60
    ? first.content.slice(0, 57).trimEnd() + '...'
    : first.content;
}

/** Create or overwrite the session with the given id. */
export function upsertSession(session: ChatSession): void {
  const sessions = loadSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session); // newest first
  }
  saveSessions(sessions);
}

/** Delete a session by id. */
export function deleteSession(id: string): void {
  const sessions = loadSessions().filter((s) => s.id !== id);
  saveSessions(sessions);
}

/** Create a brand-new empty session object (not yet saved). */
export function newSession(): ChatSession {
  const ts = new Date().toISOString();
  return { id: uid(), title: 'New chat', messages: [], createdAt: ts, updatedAt: ts };
}
