import { useEffect, useRef, useState } from 'react';
import { Bot, User, Sparkles, ChevronDown, Copy, Check } from 'lucide-react';
import { ChatMessage, Workflow, ModelEntry } from '../types';
import WorkflowPreviewCard from './WorkflowPreviewCard';
import ChatInput from './ChatInput';

const starterPrompts = [
  'Open a website and download today\'s report',
  'Fill a web form using data from an Excel file',
  'Open an app, extract information, and save it to a document',
  'Create a daily workflow to collect data and summarize it',
];

function BlossomEffect() {
  const petals = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 5}s`,
    animationDuration: `${5 + Math.random() * 5}s`,
    size: `${8 + Math.random() * 8}px`,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {petals.map((p) => (
        <div
          key={p.id}
          className="absolute top-[-20px] rounded-full bg-pink-300/40 blur-[1px] animate-blossom-fall"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.animationDelay,
            animationDuration: p.animationDuration,
          }}
        />
      ))}
    </div>
  );
}

function RainEffect() {
  const drops = Array.from({ length: 60 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 1.5}s`,
    animationDuration: `${0.4 + Math.random() * 0.3}s`,
    opacity: 0.2 + Math.random() * 0.5,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {drops.map((d) => (
        <div
          key={d.id}
          className="absolute w-[1px] h-12 bg-white/60 animate-rain-fall"
          style={{
            left: d.left,
            top: '-48px',
            opacity: 0,
            animationDelay: d.animationDelay,
            animationDuration: d.animationDuration,
            animationFillMode: 'none',
          }}
        />
      ))}
    </div>
  );
}

interface ChatPanelProps {
  theme?: string;
  messages: ChatMessage[];
  isGenerating: boolean;
  askBeforeRiskyActions: boolean;
  onToggleRiskyActions: () => void;
  onSend: (message: string) => void;
  onPreviewSteps: (workflow: Workflow) => void;
  onSaveWorkflow: (workflow: Workflow) => void;
  onRunNow: (workflow: Workflow) => void;
  deletedWorkflowIds: Set<string>;
  aiProvider: string;
  modelEntries: ModelEntry[];
  defaultModelId: string;
  onModelChange: (id: string) => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPanel({
  theme,
  messages,
  isGenerating,
  askBeforeRiskyActions,
  onToggleRiskyActions,
  onSend,
  onPreviewSteps,
  onSaveWorkflow,
  onRunNow,
  deletedWorkflowIds,
  aiProvider,
  modelEntries,
  defaultModelId,
  onModelChange,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const modelDropRef = useRef<HTMLDivElement>(null);

  const activeEntry = modelEntries.find(m => m.id === defaultModelId) ?? modelEntries[0];

  const handleCopyMessage = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  useEffect(() => {
    if (!modelOpen) return;
    function handleClick(e: MouseEvent) {
      if (modelDropRef.current && !modelDropRef.current.contains(e.target as Node)) {
        setModelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [modelOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const isEmpty = messages.length === 0 && !isGenerating;

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-white/5 flex items-start justify-between gap-4 flex-shrink-0 z-10 glass-panel border-x-0 border-t-0 shadow-none">
        <div>
          <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 font-heading tracking-tight">AI Workflow Chat</h1>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-md">
            Describe what you want to automate. The agent will generate a workflow for your computer.
          </p>
        </div>
        {/* Model picker badge */}
        <div className="relative flex-shrink-0" ref={modelDropRef}>
          <button
            onClick={() => setModelOpen(v => !v)}
            className="flex items-center gap-1.5 glass-card rounded-full px-3 py-1.5 transition-all duration-300 shadow-sm"
          >
            <Sparkles size={11} className="text-indigo-400" />
            <span className="text-[11px] font-medium text-slate-400">
              {aiProvider} · <span className="text-slate-300">{activeEntry?.label ?? activeEntry?.modelId ?? 'No model'}</span>
            </span>
            <ChevronDown size={11} className="text-slate-500" />
          </button>

          {modelOpen && modelEntries.length > 0 && (
            <div className="absolute top-full right-0 mt-2 w-72 glass-panel rounded-2xl overflow-hidden z-50 animate-scale-in">
              <div className="px-3 py-2 border-b border-border">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Select model</div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {modelEntries.map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => { onModelChange(m.id); setModelOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-4 ${
                      m.id === defaultModelId ? 'bg-indigo-500/10' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-200 truncate">{m.label || m.modelId}</span>
                        {i === 0 && <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/20 flex-shrink-0">Default</span>}
                        {i === 1 && <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-full border border-violet-500/20 flex-shrink-0">Fallback</span>}
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono truncate mt-0.5">{m.modelId}</div>
                    </div>
                    {m.id === defaultModelId && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 relative">
        {theme === 'blossom' && <BlossomEffect />}
        {theme === 'rainy' && <RainEffect />}
        
        {isEmpty ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full pb-12 animate-fade-in relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center mb-5 animate-float glow-indigo shadow-lg">
              <Sparkles size={28} className="text-indigo-400 drop-shadow-md" />
            </div>
            <h2 className="text-base font-semibold text-slate-200 mb-1.5">Start automating</h2>
            <p className="text-sm text-slate-500 text-center max-w-xs leading-relaxed mb-6">
              Describe any computer task in plain language. The AI will generate a step-by-step workflow to run it automatically.
            </p>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSend(prompt)}
                  className="text-left glass-card rounded-xl px-4 py-3 text-sm text-slate-300 transition-all duration-200 group flex items-center hover:scale-[1.01]"
                >
                  <span className="text-indigo-400 group-hover:text-indigo-300 mr-1.5">→</span>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="relative z-10 space-y-5">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-500 to-cyan-500'
                    : 'glass-card border border-white/5'
                }`}>
                  {msg.role === 'user' ? (
                    <User size={13} className="text-white" />
                  ) : (
                    <Bot size={13} className="text-indigo-400" />
                  )}
                </div>

                {/* Content */}
                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`message-content rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-600 to-indigo-500 text-white rounded-tr-sm shadow-indigo-500/20'
                      : 'glass-card text-slate-200 rounded-tl-sm'
                  }`}>
                    {msg.content.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < msg.content.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                  {/* Copy button for user messages */}
                  {msg.role === 'user' && (
                    <button
                      onClick={() => handleCopyMessage(msg.content, msg.id)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors hover:bg-surface-3/50 text-slate-400 hover:text-slate-200"
                      title="Copy message"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={12} className="text-green-400" />
                          <span className="text-green-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                  {/* Workflow preview card */}
                  {msg.workflowPreview && (
                    <WorkflowPreviewCard
                      workflow={msg.workflowPreview}
                      deleted={deletedWorkflowIds.has(msg.workflowPreview.id)}
                      onPreviewSteps={onPreviewSteps}
                      onRunNow={onRunNow}
                    />
                  )}
                  <span className="text-[10px] text-slate-600 px-1">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isGenerating && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-full glass-card flex items-center justify-center flex-shrink-0 shadow-md">
                  <Bot size={14} className="text-indigo-400" />
                </div>
                <div className="glass-card rounded-2xl rounded-tl-sm px-5 py-4">
                  <div className="flex gap-1 items-center">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={onSend}
        isGenerating={isGenerating}
      />
    </div>
  );
}
