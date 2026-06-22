import { AppSettings } from './index';

export interface HttpRequestOptions {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface HttpResponse {
  status: number;
  ok: boolean;
  text: string;
  error: string | null;
}

/** Payload shapes emitted by the Windows-Use bridge over stdout. */
export type AgentEventType = 'thought' | 'tool_call' | 'tool_result' | 'done' | 'error' | 'close';

export interface AgentThoughtEvent  { type: 'thought';     step: number; thought: string }
export interface AgentToolCallEvent { type: 'tool_call';   step: number; tool: string; params: Record<string, unknown> }
export interface AgentToolResultEvent {
  type: 'tool_result';
  step: number;
  tool: string;
  result: string;
  isSuccess: boolean;
  /** JPEG screenshot taken immediately after the tool ran, base64-encoded. Optional — only present when PIL is available. */
  screenshot?: string;
}
export interface AgentDoneEvent     { type: 'done';          step: number; answer: string }
export interface AgentErrorEvent    { type: 'error';         step: number; error: string }
export interface AgentCloseEvent    { type: 'close';         exitCode: number }
/** Emitted every ~0.5 s while a slow drag is in progress. */
export interface AgentDragProgressEvent { type: 'drag_progress'; step: number; progress: number; screenshot: string }

export type AgentEvent =
  | AgentThoughtEvent
  | AgentToolCallEvent
  | AgentToolResultEvent
  | AgentDoneEvent
  | AgentErrorEvent
  | AgentCloseEvent
  | AgentDragProgressEvent;

export interface AgentStartResult {
  started: boolean;
  error: string | null;
}

export interface ElectronAPI {
  platform: 'darwin' | 'win32' | 'linux';
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
  httpRequest: (opts: HttpRequestOptions) => Promise<HttpResponse>;

  // Windows-Use agent IPC
  startAgent: (task: string, settings: AppSettings) => Promise<AgentStartResult>;
  stopAgent: () => void;
  onAgentEvent: (callback: (event: AgentEvent) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
