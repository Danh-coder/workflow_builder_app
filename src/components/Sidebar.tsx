import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  Zap,
  MessageSquare,
  GitBranch,
  Play,
  FileText,
  Settings,
  Plus,
  Monitor,
  Cpu,
  Key,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { NavPage, ChatSession, AIProvider } from '../types';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  chatSessions: ChatSession[];
  activeChatId: string | null;
  onLoadChat: (session: ChatSession) => void;
  onDeleteChat: (id: string) => void;
  onNewWorkflow: () => void;
  currentOS: string;
  adapterStatus: string;
  aiConnected: boolean;
  aiProvider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
}

const navItems: { id: NavPage; label: string; icon: React.ElementType }[] = [
  { id: 'chat',      label: 'Chat',      icon: MessageSquare },
  { id: 'workflows', label: 'Workflows', icon: GitBranch },
  { id: 'runs',      label: 'Runs',      icon: Play },
  { id: 'logs',      label: 'Logs',      icon: FileText },
  { id: 'settings',  label: 'Settings',  icon: Settings },
];

export default function Sidebar({
  currentPage,
  onNavigate,
  chatSessions,
  activeChatId,
  onLoadChat,
  onDeleteChat,
  onNewWorkflow,
  currentOS,
  adapterStatus,
  aiConnected,
  aiProvider,
  onProviderChange,
}: SidebarProps) {
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const [providerOpen, setProviderOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allProviders: AIProvider[] = ['AIHoc', 'OpenAI', 'Gemini', 'Claude', 'Local Model'];

  useEffect(() => {
    if (!providerOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProviderOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [providerOpen]);

  function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <aside className="w-[240px] flex-shrink-0 h-full glass-panel border-r-0 flex flex-col select-none z-10 relative">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-3 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-lg glow-indigo">
          <Zap size={18} className="text-indigo-400" fill="currentColor" />
        </div>
        <div>
          <span className="text-[15px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight font-heading">Workflow Agent</span>
          <div className="text-[10px] font-medium text-slate-500 -mt-0.5 uppercase tracking-wider">AI Automation</div>
        </div>
      </div>

      {/* New Workflow button */}
      <div className="px-3 pt-4 pb-3">
        <button
          onClick={onNewWorkflow}
          className="w-full btn-primary justify-center py-2 text-sm"
        >
          <Plus size={15} />
          New Workflow
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-2 flex-1 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = currentPage === id;
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={clsx(
                  'nav-item w-full text-left relative overflow-hidden group',
                  isActive ? 'text-indigo-300' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-2'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 bg-indigo-500/10 border-l-2 border-indigo-500 shadow-[inset_4px_0_15px_rgba(99,102,241,0.2)]"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-3 w-full">
                  <Icon size={16} className={clsx("flex-shrink-0 transition-colors", isActive ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" : "")} />
                  <span className="flex-1">{label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Recent Chats */}
        {chatSessions.length > 0 && (
          <div className="mt-5">
            <div className="section-header">Recent</div>
            <div className="space-y-0.5">
              {chatSessions.slice(0, 12).map((session) => (
                <div
                  key={session.id}
                  className={clsx(
                    'group w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                    session.id === activeChatId
                      ? 'bg-indigo-500/10 border border-indigo-500/20'
                      : 'hover:bg-surface-3',
                  )}
                  onMouseEnter={() => setHoveredSession(session.id)}
                  onMouseLeave={() => setHoveredSession(null)}
                >
                  <button
                    onClick={() => { onLoadChat(session); onNavigate('chat'); }}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <MessageSquare size={11} className={clsx('flex-shrink-0', session.id === activeChatId ? 'text-indigo-400' : 'text-slate-600')} />
                    <div className="flex-1 min-w-0">
                      <div className={clsx('text-xs truncate transition-colors', session.id === activeChatId ? 'text-slate-200' : 'text-slate-400 group-hover:text-slate-200')}>
                        {session.title}
                      </div>
                      <div className="text-[10px] text-slate-600">{relativeTime(session.updatedAt)}</div>
                    </div>
                  </button>
                  {hoveredSession === session.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteChat(session.id); }}
                      className="flex-shrink-0 p-0.5 rounded text-slate-600 hover:text-red-400 transition-colors"
                      title="Delete chat"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Status footer */}
      <div className="px-3 py-4 border-t border-white/5 space-y-2">
        {/* OS / Adapter */}
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-surface-2/40 border border-white/5 backdrop-blur-md">
          <Monitor size={12} className="text-slate-500 flex-shrink-0" />
          <span className="text-[11px] text-slate-500 flex-1 truncate">
            {currentOS === 'macOS' ? 'Ghost OS' : 'Win Use'}
          </span>
          <span
            className={clsx(
              'w-1.5 h-1.5 rounded-full flex-shrink-0',
              adapterStatus !== 'Not Connected' ? 'bg-emerald-400' : 'bg-red-400',
            )}
          />
          <span className={clsx('text-[10px]', adapterStatus !== 'Not Connected' ? 'text-emerald-400' : 'text-red-400')}>
            {adapterStatus !== 'Not Connected' ? 'Connected' : 'Offline'}
          </span>
        </div>

        {/* AI Provider picker */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProviderOpen(v => !v)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl bg-surface-2/40 border border-white/5 hover:border-white/10 hover:bg-surface-3/50 transition-all duration-300 text-left backdrop-blur-md group"
          >
            <Cpu size={12} className="text-slate-500 flex-shrink-0" />
            <span className="text-[11px] text-slate-500 flex-1 truncate">{aiProvider}</span>
            {aiConnected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse-dot" />
                <span className="text-[10px] text-emerald-400">Active</span>
              </>
            ) : (
              <>
                <Key size={10} className="text-amber-400 flex-shrink-0" />
                <span className="text-[10px] text-amber-400">No Key</span>
              </>
            )}
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {providerOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 right-0 mb-2 glass-panel rounded-xl overflow-hidden z-50 shadow-[0_0_20px_rgba(0,0,0,0.6)] border border-indigo-500/20"
              >
                <div className="px-3 py-2 border-b border-white/5">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest">AI Provider</div>
                </div>
                {allProviders.map(p => (
                  <button
                    key={p}
                    onClick={() => { onProviderChange(p); setProviderOpen(false); }}
                    className={clsx(
                      'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-4 text-xs',
                      p === aiProvider ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-300 hover:text-indigo-200',
                    )}
                  >
                    {p === aiProvider && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 shadow-[0_0_5px_rgba(99,102,241,1)]" />}
                    {p !== aiProvider && <span className="w-1.5 h-1.5 flex-shrink-0" />}
                    {p}
                    {p === 'AIHoc' && (
                      <span className="ml-auto text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">free</span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
