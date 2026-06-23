import { useState, useRef, useEffect } from 'react';
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
    <aside className="w-[240px] flex-shrink-0 h-full bg-surface-1 border-r border-border flex flex-col select-none">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-2.5 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
          <Zap size={16} className="text-indigo-400" fill="currentColor" />
        </div>
        <div>
          <span className="text-sm font-semibold text-slate-100 tracking-tight">Workflow Agent</span>
          <div className="text-[10px] text-slate-500 -mt-0.5">AI Automation</div>
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
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={clsx('nav-item w-full text-left', currentPage === id ? 'nav-item-active' : 'nav-item-inactive')}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span>{label}</span>
            </button>
          ))}
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
      <div className="px-3 py-3 border-t border-border space-y-1.5">
        {/* OS / Adapter */}
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-2 border border-border">
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
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-2 border border-border hover:border-border-bright transition-colors text-left"
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
          {providerOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface-3 border border-border rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in">
              <div className="px-2 py-1.5 border-b border-border">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">AI Provider</div>
              </div>
              {allProviders.map(p => (
                <button
                  key={p}
                  onClick={() => { onProviderChange(p); setProviderOpen(false); }}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-4 text-xs',
                    p === aiProvider ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-300',
                  )}
                >
                  {p === aiProvider && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />}
                  {p !== aiProvider && <span className="w-1.5 h-1.5 flex-shrink-0" />}
                  {p}
                  {p === 'AIHoc' && (
                    <span className="ml-auto text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">free</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
