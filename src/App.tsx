import { useState, useEffect, useCallback, useRef } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import WorkflowInspector from './components/WorkflowInspector';
import WorkflowsPage from './pages/WorkflowsPage';
import RunsPage from './pages/RunsPage';
import LogsPage from './pages/LogsPage';
import SettingsPage from './pages/SettingsPage';
import ConfirmationModal from './components/ConfirmationModal';

import {
  NavPage,
  Workflow,
  ChatMessage,
  ChatSession,
  WorkflowRun,
  WorkflowStep,
  StepStatus,
  LogEntry,
  LogLevel,
} from './types';
import { AgentEvent } from './types/electron';
import { providerDefaults } from './data/mockData';
import { loadSettings, saveSettings } from './services/settingsStore';
import { loadSessions, upsertSession, deleteSession, newSession, deriveTitle } from './services/chatStore';
import { appendLog, loadLogs, clearLogs } from './services/logStore';
import { upsertRun, loadRuns } from './services/runStore';
import { loadWorkflows, upsertWorkflow, removeWorkflow } from './services/workflowStore';
import { planWorkflow, verifyCompletion, verifyStepResult } from './services/planWorkflow';
import { AppSettings } from './types';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function now() {
  return new Date().toISOString();
}

export default function App() {
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadSettings());
  const [currentPage, setCurrentPage] = useState<NavPage>('chat');
  const settingsDirty = useRef(false);
  const [unsavedModal, setUnsavedModal] = useState<NavPage | null>(null);
  const providerCache = useRef<Partial<Record<string, AppSettings>>>({});

  // ── Chat session persistence ──────────────────────────────────────
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => loadSessions());
  const [activeSession, setActiveSession] = useState<ChatSession>(() => newSession());
  // Convenience alias kept in sync with activeSession.messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [deletedWorkflowIds, setDeletedWorkflowIds] = useState<Set<string>>(new Set());
  const deletedWorkflowIdsRef = useRef<Set<string>>(new Set());
  const [activeRun, setActiveRun] = useState<WorkflowRun | null>(null);
  const [runningSteps, setRunningSteps] = useState<WorkflowStep[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [askBeforeRisky, setAskBeforeRisky] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Tracks whether a real Windows-Use agent is running (disables simulation)
  const isRealExecution = useRef(false);
  // Last task sent to the agent (for re-run after planning)
  const lastTaskRef = useRef('');
  // Always-current refs used inside the stale onAgentEvent closure
  const appSettingsRef = useRef(appSettings);
  const selectedWorkflowRef = useRef<Workflow | null>(null);
  // Max 1 auto-retry per workflow run; reset when a new run starts
  const autoRetryCountRef = useRef(0);
  // Always-current ref for activeSession — avoids stale closures in debounced saves
  const activeSessionRef = useRef(activeSession);
  // Always-current ref for activeRun — used inside the agent event closure for logging
  const activeRunRef = useRef<WorkflowRun | null>(null);
  // Timestamp when the current run started, for computing duration on finish
  const runStartTimeRef = useRef<number>(0);

  // ── Live logs and runs persisted to localStorage ─────────────────
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>(() => loadLogs());
  const [liveRuns, setLiveRuns] = useState<WorkflowRun[]>(() => loadRuns());
  /** Run ID to pre-filter when navigating from Runs → Logs or after a run finishes */
  const [logsRunFilter, setLogsRunFilter] = useState<string | undefined>(undefined);
  /** Workflow name to pre-filter when navigating to Logs without an active run */
  const [logsWorkflowFilter, setLogsWorkflowFilter] = useState<string | undefined>(undefined);
  const [liveWorkflows, setLiveWorkflows] = useState<Workflow[]>(() => {
    // Primary source: workflow store
    const stored = loadWorkflows();
    // Fallback / migration: collect workflows from all chat sessions so that
    // workflows created before workflowStore existed are not lost.
    const sessions = loadSessions();
    const storedIds = new Set(stored.map((w) => w.id));
    const fromSessions: Workflow[] = [];
    for (const s of sessions) {
      if (s.workflow && !storedIds.has(s.workflow.id)) {
        fromSessions.push(s.workflow);
        storedIds.add(s.workflow.id);
      }
      // Also check individual message previews
      for (const m of s.messages) {
        if (m.workflowPreview && !storedIds.has(m.workflowPreview.id)) {
          fromSessions.push(m.workflowPreview);
          storedIds.add(m.workflowPreview.id);
        }
      }
    }
    // Persist any migrated workflows so they appear immediately next load
    fromSessions.forEach((w) => upsertWorkflow(w));
    return [...stored, ...fromSessions];
  });

  // ── Persist messages into the active session on every change ──────
  // A debounce ref avoids saving on every keystroke when messages arrive quickly.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistMessages = useCallback(
    (msgs: ChatMessage[], workflow?: Workflow) => {
      if (msgs.length === 0) return; // don't save empty chats
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const session = activeSessionRef.current;
        const ts = new Date().toISOString();
        const updated: ChatSession = {
          ...session,
          title: deriveTitle(msgs),
          messages: msgs,
          workflow: workflow ?? session.workflow,
          updatedAt: ts,
        };
        setActiveSession(updated);
        upsertSession(updated);
        setChatSessions(loadSessions());
      }, 400);
    },
    [],
  );

  // ── Keep always-current refs in sync with state ──────────────────
  useEffect(() => { appSettingsRef.current = appSettings; }, [appSettings]);
  useEffect(() => { selectedWorkflowRef.current = selectedWorkflow; }, [selectedWorkflow]);
  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);
  useEffect(() => { activeRunRef.current = activeRun; }, [activeRun]);
  useEffect(() => { deletedWorkflowIdsRef.current = deletedWorkflowIds; }, [deletedWorkflowIds]);

  // ── Persist finished runs to runStore ────────────────────────────
  useEffect(() => {
    if (!activeRun) return;
    if (!['Completed', 'Failed', 'Stopped'].includes(activeRun.status)) return;
    const elapsedMs = Date.now() - runStartTimeRef.current;
    const m = Math.floor(elapsedMs / 60000);
    const s = Math.floor((elapsedMs % 60000) / 1000);
    const finishedRun: WorkflowRun = { ...activeRun, duration: `${m}m ${s}s` };
    upsertRun(finishedRun);
    setLiveRuns((prev) =>
      prev.some((r) => r.id === finishedRun.id)
        ? prev.map((r) => r.id === finishedRun.id ? finishedRun : r)
        : [finishedRun, ...prev],
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRun?.status, activeRun?.id]);

  // ── Agent event subscription ──────────────────────────────────────
  useEffect(() => {
    const unsub = window.electronAPI?.onAgentEvent((event: AgentEvent) => {
      // Helper: create and persist a log entry for the current run
      const addLog = (level: LogLevel, message: string, stepId?: string) => {
        const run = activeRunRef.current;
        if (!run) return;
        const entry: LogEntry = {
          id: `log-${generateId()}`,
          timestamp: new Date().toISOString(),
          workflowId: run.workflowId,
          workflowName: run.workflowName,
          runId: run.id,
          stepId,
          level,
          message,
        };
        appendLog(entry);
        setLiveLogs((prev) => [...prev, entry]);
      };

      switch (event.type) {
        case 'thought': {
          setActiveRun((prev) =>
            prev ? { ...prev, latestLog: `💭 ${event.thought}` } : null,
          );
          break;
        }

        case 'drag_progress': {
          // Mid-drag screenshot — update the latestLog with current progress percentage
          setActiveRun((prev) =>
            prev
              ? { ...prev, latestLog: `🖱️ Dragging… ${Math.round(event.progress * 100)}% of the way` }
              : null,
          );
          break;
        }

        case 'tool_call': {
          const step = event.step;
          addLog('info', `⚙️ ${event.tool}: ${JSON.stringify(event.params).slice(0, 160)}`, `s${step + 1}`);
          setActiveStepIndex(step);
          setRunningSteps((prev) => {
            const updated = [...prev];
            // Ensure the array has enough entries (agent may go beyond planned steps)
            while (updated.length <= step) {
              const n = updated.length + 1;
              updated.push({
                id: `dyn-${n}`,
                stepNumber: n,
                actionType: 'Action',
                target: '',
                expectedResult: '',
                status: 'Pending',
              });
            }
            return updated.map((s, i) => {
              if (i < step) return s.status === 'Running' ? { ...s, status: 'Success' as StepStatus } : s;
              if (i === step) return { ...s, actionType: event.tool, target: JSON.stringify(event.params).slice(0, 80), status: 'Running' as StepStatus };
              return s;
            });
          });
          const total = runningSteps.length || 1;
          const progress = Math.round(((step + 1) / Math.max(total, step + 1)) * 80);
          setActiveRun((prev) =>
            prev
              ? {
                  ...prev,
                  currentStep: step + 1,
                  progress,
                  currentStepName: event.tool,
                  latestLog: `⚙️ Calling ${event.tool}…`,
                }
              : null,
          );
          break;
        }

        case 'tool_result': {
          const step = event.step;
          const level: LogLevel = event.isSuccess === false ? 'warning' : 'info';
          addLog(level, `${event.tool}: ${event.result.slice(0, 200)}`, `s${step + 1}`);
          // Optimistically mark as Success; verification may downgrade to Needs Confirmation
          setRunningSteps((prev) =>
            prev.map((s, i) =>
              i === step ? { ...s, status: 'Success' as StepStatus } : s,
            ),
          );
          setActiveRun((prev) =>
            prev ? { ...prev, latestLog: `✅ ${event.tool}: ${event.result.slice(0, 120)}` } : null,
          );

          // Screenshot verification — async so it never blocks the event loop.
          // Uses the screenshot captured in bridge.py right after the tool ran.
          if (event.screenshot) {
            const { screenshot, tool, result } = event;
            const expectedResult =
              selectedWorkflowRef.current?.steps[step]?.expectedResult ?? '';
            (async () => {
              try {
                const { verified, note } = await verifyStepResult(
                  tool,
                  result,
                  expectedResult,
                  screenshot,
                  appSettingsRef.current,
                );
                if (!verified) {
                  setRunningSteps((prev) =>
                    prev.map((s, i) =>
                      i === step ? { ...s, status: 'Needs Confirmation' as StepStatus } : s,
                    ),
                  );
                  setActiveRun((prev) =>
                    prev
                      ? { ...prev, latestLog: `⚠️ Step ${step + 1} may not have worked: ${note}` }
                      : null,
                  );
                } else if (note) {
                  setActiveRun((prev) =>
                    prev
                      ? { ...prev, latestLog: `✅ Verified step ${step + 1}: ${note}` }
                      : null,
                  );
                }
              } catch {
                // Never block the run on verifier errors
              }
            })();
          }
          break;
        }

        case 'done': {
          // Mark all non-failed steps as Success immediately (UI feedback)
          setRunningSteps((prev) =>
            prev.map((s) => s.status !== 'Failed' ? { ...s, status: 'Success' as StepStatus } : s),
          );
          setActiveRun((prev) =>
            prev ? { ...prev, progress: 100, latestLog: '🔍 Verifying task completion…' } : null,
          );

          // Helper: finalize the run in the UI and post a chat message
          const finalise = (answer: string, complete: boolean, issue: string) => {
            isRealExecution.current = false;
            setActiveRun((prev) =>
              prev
                ? {
                    ...prev,
                    status: complete ? 'Completed' : 'Failed',
                    progress: 100,
                    latestLog: complete ? '✅ Workflow completed' : '⚠️ Workflow incomplete',
                  }
                : null,
            );
            setMessages((prev) => {
              const content = complete
                ? (answer || 'Workflow completed successfully.')
                : `⚠️ The workflow did not complete as expected.\n\n**Agent reported:** ${answer}${issue ? `\n\n**Issue detected:** ${issue}` : ''}\n\nYou can send a follow-up message to continue or adjust the task.`;
              const doneMsg: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                content,
                timestamp: now(),
              };
              const next = [...prev, doneMsg];
              persistMessages(next);
              return next;
            });
          };

          // Async: verify → complete or auto-retry once
          const answer = event.answer;
          (async () => {
            const wf = selectedWorkflowRef.current;
            const originalTask =
              wf?.originalTask || lastTaskRef.current || wf?.goal || '';

            let complete = true;
            let issue = '';

            // Only verify when we have both the original task and an agent answer
            if (originalTask && answer) {
              try {
                const check = await verifyCompletion(originalTask, answer, appSettingsRef.current);
                complete = check.complete;
                issue = check.issue;
              } catch {
                complete = true; // Never block on verifier errors
              }
            }

            if (!complete && autoRetryCountRef.current < 3) {
              // Auto-retry: re-invoke the agent with context about what went wrong
              autoRetryCountRef.current += 1;
              // Notify the user in chat that a retry is happening
              setMessages((prev) => {
                const retryMsg: ChatMessage = {
                  id: generateId(),
                  role: 'assistant',
                  content: `🔄 **Workflow incomplete — retrying automatically** (attempt ${autoRetryCountRef.current}/3)\n\n**Agent reported:** ${answer}${issue ? `\n\n**Issue detected:** ${issue}` : ''}\n\nPlease wait while the agent tries again…`,
                  timestamp: now(),
                };
                const next = [...prev, retryMsg];
                persistMessages(next);
                return next;
              });
              const wfSteps = selectedWorkflowRef.current?.steps ?? [];
              const retryStepsGuide = wfSteps.length
                ? '\n\nFOLLOW THESE STEPS EXACTLY IN ORDER:\n' +
                  wfSteps
                    .map(
                      (s, i) =>
                        `Step ${i + 1} (${s.actionType}): ${s.target}` +
                        (s.expectedResult ? ` → expected: ${s.expectedResult}` : ''),
                    )
                    .join('\n')
                : '';
              const retryTask =
                `${originalTask}${retryStepsGuide}\n\n` +
                `Your previous attempt did not fully complete the task. You reported: "${answer}"` +
                `${issue ? ` Identified issue: ${issue}.` : ''} Please re-attempt and complete the full original request.`;

              isRealExecution.current = true;
              setActiveRun((prev) =>
                prev
                  ? { ...prev, status: 'Running', progress: 50, latestLog: '🔄 Auto-retrying: task was incomplete…' }
                  : null,
              );

              const result = await window.electronAPI?.startAgent(retryTask, appSettingsRef.current);
              if (!result?.started) {
                // Retry failed to start → report as incomplete
                isRealExecution.current = false;
                finalise(answer, false, issue || 'Auto-retry could not start');
              }
              // If started: new agent events will arrive; a new 'done' will call finalise
            } else {
              finalise(answer, complete, issue);
            }
          })();
          break;
        }

        case 'error': {
          const step = event.step;
          addLog('error', `❌ ${event.error}`, `s${step + 1}`);
          setRunningSteps((prev) =>
            prev.map((s, i) =>
              i === step ? { ...s, status: 'Failed' as StepStatus } : s,
            ),
          );
          setActiveRun((prev) =>
            prev
              ? {
                  ...prev,
                  errorCount: (prev.errorCount ?? 0) + 1,
                  latestLog: `❌ ${event.error.slice(0, 150)}`,
                }
              : null,
          );
          break;
        }

        case 'close': {
          isRealExecution.current = false;
          addLog('info', event.exitCode === 0 ? 'Agent process exited normally.' : `Agent process exited with code ${event.exitCode}.`);
          setActiveRun((prev) => {
            // Don't overwrite any terminal state already set by finalise() or handleStop()
            if (!prev || prev.status === 'Completed' || prev.status === 'Failed' || prev.status === 'Stopped') return prev;
            // Non-zero exit = agent crashed/errored → Failed; clean exit = Completed
            return { ...prev, status: event.exitCode === 0 ? 'Completed' : 'Failed' };
          });
          break;
        }
      }
    });
    return () => unsub?.();
  }, [runningSteps.length]);

  // ── Simulation fallback (used only when no real agent is running) ──
  useEffect(() => {
    if (isRealExecution.current) return;
    if (!activeRun || activeRun.status !== 'Running' || !selectedWorkflow) return;

    const steps = selectedWorkflow.steps;
    const total = steps.length;

    if (activeStepIndex >= total) {
      setActiveRun((prev) =>
        prev ? { ...prev, status: 'Completed', progress: 100 } : null,
      );
      setRunningSteps((prev) =>
        prev.map((s) =>
          s.status !== 'Success' && s.status !== 'Failed' ? { ...s, status: 'Success' as StepStatus } : s,
        ),
      );
      return;
    }

    const timer = setTimeout(() => {
      const progress = Math.round(((activeStepIndex + 1) / total) * 100);
      const currentStepName = steps[activeStepIndex].actionType + ' → ' + steps[activeStepIndex].target;

      setActiveRun((prev) =>
        prev
          ? { ...prev, currentStep: activeStepIndex + 1, progress, currentStepName, latestLog: `Executing: ${steps[activeStepIndex].actionType} on "${steps[activeStepIndex].target}"` }
          : null,
      );
      setRunningSteps((prev) =>
        prev.map((s, i) => {
          if (i < activeStepIndex) return { ...s, status: 'Success' as StepStatus };
          if (i === activeStepIndex) return { ...s, status: 'Running' as StepStatus };
          return { ...s, status: 'Pending' as StepStatus };
        }),
      );
      setActiveStepIndex((i) => i + 1);
    }, 1600);

    return () => clearTimeout(timer);
  }, [activeRun, activeStepIndex, selectedWorkflow]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text: string) => {
      lastTaskRef.current = text;

      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: text,
        timestamp: now(),
      };
      const msgsWithUser = [...messages, userMsg];
      setMessages(msgsWithUser);
      setIsGenerating(true);

      try {
        // Pass prior messages as context so follow-up questions work correctly
        const workflow = await planWorkflow(text, appSettings, messages);
        const aiMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `I've analysed your request and planned a **${workflow.steps.length}-step** automation workflow.\n\nThe agent will use Windows UI Automation to execute each step on your desktop. Review the steps in the right panel, then click **Run Workflow** to execute.`,
          timestamp: now(),
          workflowPreview: workflow,
        };
        const finalMsgs = [...msgsWithUser, aiMsg];
        setMessages(finalMsgs);
        persistMessages(finalMsgs, workflow);
        setSelectedWorkflow(workflow);
        setRunningSteps(workflow.steps.map((s) => ({ ...s, status: 'Pending' as StepStatus })));
        setActiveStepIndex(0);
        setActiveRun(null);
        // Persist new workflow to the workflow store
        upsertWorkflow(workflow);
        setLiveWorkflows((prev) => {
          const idx = prev.findIndex((w) => w.id === workflow.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = workflow;
            return next;
          }
          return [workflow, ...prev];
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const fallbackMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `⚠️ Could not plan workflow: ${msg}\n\nMake sure your API key is configured in Settings.`,
          timestamp: now(),
        };
        const finalMsgs = [...msgsWithUser, fallbackMsg];
        setMessages(finalMsgs);
        persistMessages(finalMsgs);
      } finally {
        setIsGenerating(false);
      }
    },
    [appSettings, messages, persistMessages],
  );

  const startRun = useCallback(
    async (workflow: Workflow) => {
      if (askBeforeRisky && workflow.riskLevel === 'High') {
        setConfirmModal({
          title: 'Run high-risk workflow?',
          message: `"${workflow.name}" is marked as High Risk. It will perform sensitive actions on your computer. Are you sure you want to run it?`,
          onConfirm: () => {
            setConfirmModal(null);
            startRun({ ...workflow, riskLevel: 'Low' });
          },
        });
        return;
      }

      setSelectedWorkflow(workflow);
      setRunningSteps(workflow.steps.map((s) => ({ ...s, status: 'Pending' as StepStatus })));
      setActiveStepIndex(0);
      setCurrentPage('chat');
      autoRetryCountRef.current = 0; // Reset per-run retry counter

      const run: WorkflowRun = {
        id: `run-${generateId()}`,
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: 'Running',
        startedAt: now(),
        adapterUsed: 'Win Use',
        errorCount: 0,
        currentStep: 0,
        totalSteps: workflow.steps.length,
        progress: 0,
        currentStepName: workflow.steps[0]?.actionType ?? '',
        latestLog: 'Starting Windows-Use agent…',
      };
      runStartTimeRef.current = Date.now();
      setActiveRun(run);
      // Add the new run to the live list immediately so the Runs page shows it
      upsertRun(run);
      setLiveRuns((prev) => [run, ...prev]);

      // Prefer the verbatim user message (stored on the workflow so it
      // survives session saves/loads), then fall back to the generated goal.
      // Never let the agent receive a generic goal like "Open a YouTube video"
      // when the user actually said "Open Come My Way at 1:30".
      const baseTask = lastTaskRef.current || workflow.originalTask || workflow.goal;

      // Append the planned steps so the agent follows the exact sequence
      // decided in the planning phase instead of re-deriving its own approach.
      const stepsGuide = workflow.steps.length
        ? '\n\nFOLLOW THESE STEPS EXACTLY IN ORDER:\n' +
          workflow.steps
            .map(
              (s, i) =>
                `Step ${i + 1} (${s.actionType}): ${s.target}` +
                (s.expectedResult ? ` → expected: ${s.expectedResult}` : ''),
            )
            .join('\n')
        : '';

      const task = baseTask + stepsGuide;
      const result = await window.electronAPI?.startAgent(task, appSettings);

      if (result?.started) {
        isRealExecution.current = true;
      } else {
        // Fall back to simulation if agent not available
        isRealExecution.current = false;
        if (result?.error) {
          setActiveRun((prev) =>
            prev ? { ...prev, latestLog: `⚠️ Agent unavailable: ${result.error} — running simulation` } : null,
          );
        }
      }
    },
    [askBeforeRisky, appSettings],
  );

  const handleStop = useCallback(() => {
    setConfirmModal({
      title: 'Stop workflow?',
      message: 'The workflow will be stopped immediately. Any partial actions already performed will not be undone.',
      onConfirm: () => {
        setConfirmModal(null);
        window.electronAPI?.stopAgent();
        isRealExecution.current = false;
        setActiveRun((prev) => (prev ? { ...prev, status: 'Stopped' } : null));
        setRunningSteps((prev) =>
          prev.map((s) => (s.status === 'Running' ? { ...s, status: 'Pending' as StepStatus } : s)),
        );
      },
    });
  }, []);

  const handlePause = useCallback(() => {
    window.electronAPI?.stopAgent();
    isRealExecution.current = false;
    setActiveRun((prev) => (prev ? { ...prev, status: 'Stopped', currentStepName: 'Paused' } : null));
  }, []);

  const handleSelectWorkflow = useCallback((workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setRunningSteps(workflow.steps.map((s) => ({ ...s, status: 'Pending' as StepStatus })));
    setActiveStepIndex(0);
    setActiveRun(null);
  }, []);

  const handleNewWorkflow = useCallback(() => {
    const fresh = newSession();
    setActiveSession(fresh);
    setMessages([]);
    setCurrentPage('chat');
    setSelectedWorkflow(null);
    setActiveRun(null);
    setRunningSteps([]);
    lastTaskRef.current = '';
  }, []);

  const handleLoadChat = useCallback((session: ChatSession) => {
    setActiveSession(session);
    activeSessionRef.current = session;
    setMessages(session.messages);
    // Prefer session.workflow; fall back to the most recent workflowPreview in messages
    let workflow = session.workflow ?? null;
    if (!workflow) {
      for (let i = session.messages.length - 1; i >= 0; i--) {
        if (session.messages[i].workflowPreview) {
          workflow = session.messages[i].workflowPreview!;
          break;
        }
      }
    }
    // Don't restore a workflow that has been deleted
    if (workflow && deletedWorkflowIdsRef.current.has(workflow.id)) {
      workflow = null;
    }
    setSelectedWorkflow(workflow);
    setRunningSteps(workflow ? workflow.steps.map((s) => ({ ...s, status: 'Pending' as StepStatus })) : []);
    setActiveStepIndex(0);
    setActiveRun(null);
    setCurrentPage('chat');
    lastTaskRef.current = '';
  }, []);

  const handleDeleteChat = useCallback((id: string) => {
    deleteSession(id);
    setChatSessions(loadSessions());
    // If we deleted the active session, start a fresh one
    setActiveSession((prev) => {
      if (prev.id === id) {
        const fresh = newSession();
        setMessages([]);
        setSelectedWorkflow(null);
        setActiveRun(null);
        setRunningSteps([]);
        return fresh;
      }
      return prev;
    });
  }, []);

  // ── Navigation with unsaved-settings guard ───────────────────────
  const handleNavigate = useCallback(
    (page: NavPage) => {
      if (currentPage === 'settings' && settingsDirty.current && page !== 'settings') {
        setUnsavedModal(page);
      } else {
        // Clear run/workflow-specific log filters when navigating to logs via sidebar
        if (page === 'logs') { setLogsRunFilter(undefined); setLogsWorkflowFilter(undefined); }
        setCurrentPage(page);
      }
    },
    [currentPage],
  );

  // ── Render ───────────────────────────────────────────────────────
  const isChat = currentPage === 'chat';

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-surface-0">
      {/* Custom title bar */}
      <TitleBar />

      {/* App body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          chatSessions={chatSessions}
          activeChatId={activeSession.id}
          onLoadChat={handleLoadChat}
          onDeleteChat={handleDeleteChat}
          onNewWorkflow={handleNewWorkflow}
          currentOS={appSettings.currentOS}
          adapterStatus={appSettings.adapterStatus}
          aiConnected={!!appSettings.apiKey}
          aiProvider={appSettings.aiProvider}
          onProviderChange={(provider) => {
            providerCache.current[appSettings.aiProvider] = appSettings;

            if (providerCache.current[provider]) {
              setAppSettings(providerCache.current[provider]!);
              return;
            }

            const stored = loadSettings();
            if (stored.aiProvider === provider) {
              setAppSettings(stored);
              return;
            }

            const defs = providerDefaults[provider];
            const newModels = defs.models.map((m) => ({ ...m, id: Math.random().toString(36).slice(2, 10) }));
            setAppSettings({
              ...appSettings,
              aiProvider: provider,
              baseUrl: defs.baseUrl,
              modelEntries: newModels,
              defaultModelId: newModels[0]?.id ?? '',
              fallbackModelId: newModels[1]?.id ?? newModels[0]?.id ?? '',
              apiKey: '',
            });
          }}
        />

        {/* Center content */}
        <main className="flex-1 h-full overflow-hidden">
          {currentPage === 'chat' && (
            <ChatPanel
              messages={messages}
              isGenerating={isGenerating}
              askBeforeRiskyActions={askBeforeRisky}
              onToggleRiskyActions={() => setAskBeforeRisky((v) => !v)}
              onSend={handleSend}
              onPreviewSteps={handleSelectWorkflow}
              onSaveWorkflow={handleSelectWorkflow}
              onRunNow={(wf) => { handleSelectWorkflow(wf); startRun(wf); }}
              deletedWorkflowIds={deletedWorkflowIds}
              aiProvider={appSettings.aiProvider}
              modelEntries={appSettings.modelEntries}
              defaultModelId={appSettings.defaultModelId}
              onModelChange={(id) => {
                const updated = { ...appSettings, defaultModelId: id };
                setAppSettings(updated);
                saveSettings(updated);
              }}
            />
          )}
          {currentPage === 'workflows' && (
            <WorkflowsPage
              workflows={liveWorkflows}
              onRunWorkflow={(wf) => { handleSelectWorkflow(wf); startRun(wf); }}
              onSelectWorkflow={(wf) => {
                // Find the chat session that owns this workflow and load it,
                // so the user sees the conversation that produced it.
                const session = chatSessions.find(
                  (s) =>
                    s.workflow?.id === wf.id ||
                    s.messages.some((m) => m.workflowPreview?.id === wf.id),
                );
                if (session) {
                  handleLoadChat(session);
                  // Override with the exact clicked workflow so its steps are shown
                  setSelectedWorkflow(wf);
                  setRunningSteps(wf.steps.map((s) => ({ ...s, status: 'Pending' as StepStatus })));
                } else {
                  handleSelectWorkflow(wf);
                  setCurrentPage('chat');
                }
              }}
              onDeleteWorkflow={(id) => {
                removeWorkflow(id);
                setLiveWorkflows((prev) => prev.filter((w) => w.id !== id));
                setSelectedWorkflow((prev) => (prev?.id === id ? null : prev));
                setDeletedWorkflowIds((prev) => new Set([...prev, id]));
              }}
              onDuplicateWorkflow={(wf) => {
                const copy: Workflow = {
                  ...wf,
                  id: `wf-copy-${Date.now()}`,
                  name: `${wf.name} (Copy)`,
                  status: 'Draft',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  lastRunStatus: undefined,
                };
                upsertWorkflow(copy);
                setLiveWorkflows((prev) => [copy, ...prev]);
              }}
              onNewWorkflow={handleNewWorkflow}
            />
          )}
          {currentPage === 'runs' && <RunsPage runs={liveRuns} onViewLogs={(runId) => { setLogsRunFilter(runId); setCurrentPage('logs'); }} />}
          {currentPage === 'logs' && (
            <LogsPage
              logs={liveLogs}
              initialRunId={logsRunFilter}
              initialWorkflowName={logsWorkflowFilter}
              onClearLogs={() => {
                clearLogs();
                setLiveLogs([]);
              }}
            />
          )}
          {currentPage === 'settings' && (
            <SettingsPage
              onDirtyChange={(dirty) => { settingsDirty.current = dirty; }}
              onSave={(saved) => {
                setAppSettings(saved);
                providerCache.current[saved.aiProvider] = saved;
              }}
            />
          )}
        </main>

        {/* Right inspector — only on chat page */}
        {isChat && (
          <WorkflowInspector
            workflow={selectedWorkflow}
            activeRun={activeRun}
            runningSteps={runningSteps}
            activeStepIndex={activeStepIndex}
            onRunWorkflow={() => selectedWorkflow && startRun(selectedWorkflow)}
            onStopWorkflow={handleStop}
            onViewLogs={() => {
              const run = activeRun;
              if (run && ['Running', 'Completed', 'Failed', 'Stopped'].includes(run.status)) {
                // Show logs for this specific run
                setLogsRunFilter(run.id);
                setLogsWorkflowFilter(undefined);
              } else if (selectedWorkflow) {
                // No active run — show all logs for this workflow
                setLogsRunFilter(undefined);
                setLogsWorkflowFilter(selectedWorkflow.name);
              } else {
                setLogsRunFilter(undefined);
                setLogsWorkflowFilter(undefined);
              }
              setCurrentPage('logs');
            }}
          />
        )}
      </div>

      {/* Unsaved settings modal */}
      {unsavedModal && (
        <ConfirmationModal
          title="Unsaved changes"
          message="You have unsaved changes in Settings. Do you want to save before leaving, or discard them?"
          confirmLabel="Save & leave"
          cancelLabel="Discard & leave"
          danger={false}
          onClose={() => setUnsavedModal(null)}
          onConfirm={() => {
            document.getElementById('settings-save-btn')?.click();
            settingsDirty.current = false;
            setCurrentPage(unsavedModal);
            setUnsavedModal(null);
          }}
          onCancel={() => {
            settingsDirty.current = false;
            setCurrentPage(unsavedModal);
            setUnsavedModal(null);
          }}
        />
      )}

      {/* Confirmation modal */}
      {confirmModal && (
        <ConfirmationModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel="Confirm"
          danger={confirmModal.title.includes('Stop') || confirmModal.title.includes('Delete')}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
