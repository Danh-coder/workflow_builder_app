export type NavPage = 'chat' | 'workflows' | 'runs' | 'logs' | 'settings';
export type OS = 'macOS' | 'Windows';
export type Adapter = 'Ghost OS' | 'Win Use' | 'Not Connected';
export type WorkflowStatus = 'Draft' | 'Ready' | 'Running' | 'Completed' | 'Failed' | 'Stopped';
export type StepStatus = 'Pending' | 'Running' | 'Success' | 'Failed' | 'Needs Confirmation';
export type LogLevel = 'info' | 'warning' | 'error';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type AIProvider = 'AIHoc' | 'OpenAI' | 'Gemini' | 'Claude' | 'Local Model';

/** A single model entry in the editable model list */
export interface ModelEntry {
  id: string;
  label: string;
  modelId: string;
}

export interface WorkflowStep {
  id: string;
  stepNumber: number;
  actionType: string;
  target: string;
  expectedResult: string;
  status: StepStatus;
}

export interface Workflow {
  id: string;
  name: string;
  goal: string;
  /** The verbatim user message that produced this workflow — used as the
   *  exact task string sent to the Windows-Use agent so no details are lost. */
  originalTask?: string;
  description: string;
  osAdapter: Adapter;
  requiredPermissions: string[];
  riskLevel: RiskLevel;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  supportedOS: OS[];
  createdAt: string;
  updatedAt: string;
  lastRunStatus?: WorkflowStatus;
  estimatedSteps: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  workflowPreview?: Workflow;
}

/** A saved conversation, persisted to localStorage */
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  workflow?: Workflow;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName: string;
  status: WorkflowStatus;
  startedAt: string;
  duration?: string;
  adapterUsed: Adapter;
  errorCount: number;
  currentStep?: number;
  totalSteps?: number;
  progress?: number;
  currentStepName?: string;
  latestLog?: string;
  elapsedSeconds?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  workflowId: string;
  workflowName: string;
  runId: string;
  stepId?: string;
  level: LogLevel;
  message: string;
  hasScreenshot?: boolean;
}

export interface AppSettings {
  aiProvider: AIProvider;
  apiKey: string;
  baseUrl: string;
  modelEntries: ModelEntry[];
  defaultModelId: string;
  fallbackModelId: string;
  tokenBudget: number;
  currentOS: OS;
  adapterStatus: Adapter;
  theme: 'dark' | 'light' | 'system' | 'blossom' | 'rainy' | 'cyberpunk';
  effectFrequency: number;
  askBeforeRiskyActions: boolean;
  blockDestructiveActions: boolean;
  saveScreenshotsOnError: boolean;
  storeApiKeySecurely: boolean;
  autoUpdate: boolean;
  localDataPath: string;
  customThemeColors?: Record<string, Record<string, string>>;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  granted: boolean;
}
