import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, Monitor, Wand2, AlertTriangle } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isGenerating: boolean;
  askBeforeRiskyActions: boolean;
  onToggleRiskyActions: () => void;
}

export default function ChatInput({
  onSend,
  isGenerating,
  askBeforeRiskyActions,
  onToggleRiskyActions,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isGenerating) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  return (
    <div className="border-t border-border bg-surface-0 px-4 py-3">
      {/* Input box */}
      <div className="bg-surface-2 border border-border rounded-xl focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); handleInput(); }}
          onKeyDown={handleKeyDown}
          disabled={isGenerating}
          rows={1}
          placeholder="Describe a task you want the AI to automate…"
          className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 px-4 pt-3 pb-2 resize-none outline-none leading-relaxed disabled:opacity-50"
          style={{ maxHeight: '200px', minHeight: '44px' }}
        />
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 pb-2.5 gap-2">
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-surface-4 transition-colors"
              title="Attach file"
            >
              <Paperclip size={15} />
            </button>
            <button
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-surface-4 transition-colors"
              title="Use current screen context"
            >
              <Monitor size={15} />
            </button>
            <button
              onClick={onToggleRiskyActions}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                askBeforeRiskyActions
                  ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                  : 'text-slate-500 hover:text-slate-400 hover:bg-surface-4'
              }`}
              title="Ask before risky actions"
            >
              <AlertTriangle size={11} />
              Ask before risky
            </button>
          </div>
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <div className="flex items-center gap-2 text-xs text-indigo-400">
                <div className="flex gap-1">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
                <span>Generating…</span>
              </div>
            ) : (
              <>
                <button
                  onClick={handleSend}
                  disabled={!value.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <Wand2 size={13} />
                  Generate
                </button>
                <button
                  onClick={handleSend}
                  disabled={!value.trim()}
                  className="p-1.5 rounded-lg bg-surface-4 hover:bg-surface-5 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
                  title="Send"
                >
                  <Send size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hint */}
      <p className="text-center text-[11px] text-slate-600 mt-2">
        Press <kbd className="bg-surface-3 border border-border rounded px-1 py-0.5 text-[10px] font-mono">Enter</kbd> to send ·{' '}
        <kbd className="bg-surface-3 border border-border rounded px-1 py-0.5 text-[10px] font-mono">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
