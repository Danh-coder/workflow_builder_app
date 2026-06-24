import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Wand2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isGenerating: boolean;
}

export default function ChatInput({
  onSend,
  isGenerating,
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
    <div className="bg-gradient-to-t from-surface-0 via-surface-0/90 to-transparent px-6 pb-6 pt-4 relative z-20">
      {/* Input box */}
      <div className="glass-panel rounded-2xl shadow-2xl focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all duration-300">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); handleInput(); }}
          onKeyDown={handleKeyDown}
          disabled={isGenerating}
          rows={1}
          placeholder="Describe a task you want the AI to automate…"
          className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 px-5 pt-4 pb-2 resize-none outline-none leading-relaxed disabled:opacity-50"
          style={{ maxHeight: '200px', minHeight: '44px' }}
        />
        {/* Toolbar */}
        <div className="flex items-center justify-end px-3 pb-2.5 gap-2">
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
                  className="btn-primary px-4 py-1.5 text-xs rounded-xl shadow-md"
                >
                  <Wand2 size={13} />
                  Generate
                </button>
                <button
                  onClick={handleSend}
                  disabled={!value.trim()}
                  className="p-2 rounded-xl bg-surface-3/50 hover:bg-surface-4 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-all duration-200 hover:text-white backdrop-blur-sm"
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
      <p className="text-center text-[11px] text-slate-500 mt-3 drop-shadow-sm">
        Press <kbd className="bg-surface-3/50 border border-white/5 rounded px-1.5 py-0.5 text-[10px] font-mono shadow-sm">Enter</kbd> to send ·{' '}
        <kbd className="bg-surface-3/50 border border-white/5 rounded px-1.5 py-0.5 text-[10px] font-mono shadow-sm">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
