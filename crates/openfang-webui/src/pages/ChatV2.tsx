// ChatV2 - Redesigned with improved message bubbles and input
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api, wsManager } from '@/api/client';
import type { Agent, Session, Message, ToolCall } from '@/api/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';
import {
  Send, Bot, User, Plus, MessageSquare,
  Loader2, Sparkles, Clock, MoreHorizontal,
  ChevronDown, Paperclip, X, Brain,
  Command, Settings, ArrowRight, Copy, Check
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toaster } from '@/lib/toast';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface ExtendedMessage extends Message {
  isStreaming?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  tools?: ToolCall[];
}

// Agent gradient colors based on identity
function getAgentGradient(agent: Agent): string {
  const color = agent.identity?.color?.toLowerCase() || '';

  const gradients: Record<string, string> = {
    cyan: 'from-cyan-500 to-blue-600',
    blue: 'from-blue-500 to-indigo-600',
    purple: 'from-purple-500 to-pink-600',
    pink: 'from-pink-500 to-rose-600',
    rose: 'from-rose-500 to-red-600',
    red: 'from-red-500 to-orange-600',
    orange: 'from-orange-500 to-amber-600',
    amber: 'from-amber-500 to-yellow-600',
    yellow: 'from-yellow-500 to-lime-600',
    lime: 'from-lime-500 to-green-600',
    green: 'from-green-500 to-emerald-600',
    emerald: 'from-emerald-500 to-teal-600',
    teal: 'from-teal-500 to-cyan-600',
    indigo: 'from-indigo-500 to-violet-600',
    violet: 'from-violet-500 to-purple-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
  };

  return gradients[color] || 'from-[var(--soft-blue)] to-blue-600';
}

// Welcome screen component
function WelcomeScreen({
  agent,
  onStartChat
}: {
  agent: Agent;
  onStartChat: () => void;
}) {
  const gradient = getAgentGradient(agent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col items-center justify-center p-8"
    >
      {/* Agent Avatar */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className={cn(
          'w-20 h-20 rounded-2xl flex items-center justify-center mb-6',
          'bg-gradient-to-br shadow-lg',
          gradient
        )}
      >
        <Bot className="w-10 h-10 text-white" />
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-semibold text-[var(--soft-text-primary)] mb-2"
      >
        {agent.name}
      </motion.h2>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-[var(--soft-text-muted)] text-center max-w-md mb-8"
      >
        {agent.description || agent.profile || 'Ready to help you with any task'}
      </motion.p>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap gap-3 justify-center max-w-lg"
      >
        {['What can you do?', 'Help me get started', 'Explain your capabilities'].map((suggestion, i) => (
          <motion.button
            key={suggestion}
            onClick={() => onStartChat()}
            className="px-4 py-2 rounded-xl bg-[var(--soft-surface)] text-[var(--soft-text-secondary)] text-sm font-medium hover:bg-[var(--soft-surface-hover)] hover:text-[var(--soft-text-primary)] transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.05 }}
          >
            {suggestion}
          </motion.button>
        ))}
      </motion.div>

      {/* Start Button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={onStartChat}
        className={cn(
          'mt-8 px-6 py-3 rounded-xl text-white font-medium flex items-center gap-2',
          'bg-gradient-to-r shadow-lg hover:shadow-xl transition-shadow',
          gradient
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <MessageSquare className="w-5 h-5" />
        Start Conversation
      </motion.button>
    </motion.div>
  );
}

// Code block component with copy functionality
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden bg-[#1e1e1e] border border-[var(--soft-divider)]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[var(--soft-divider)]">
        <span className="text-xs text-[var(--soft-text-muted)] font-mono">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[var(--soft-text-muted)] hover:text-[var(--soft-text-primary)] hover:bg-[var(--soft-surface-hover)] transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'transparent',
          fontSize: '0.875rem',
          lineHeight: '1.6',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

// Markdown content renderer
function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const code = String(children).replace(/\n$/, '');

          if (match) {
            return <CodeBlock code={code} language={match[1]} />;
          }

          return (
            <code
              className="px-1.5 py-0.5 rounded-md bg-[var(--soft-surface)] text-[var(--soft-text-primary)] text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
        },
        ul({ children }) {
          return <ul className="mb-3 last:mb-0 pl-5 space-y-1 list-disc">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-3 last:mb-0 pl-5 space-y-1 list-decimal">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>;
        },
        h1({ children }) {
          return <h1 className="text-xl font-semibold mb-3 mt-4 first:mt-0">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-lg font-semibold mb-2 mt-3 first:mt-0">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h3>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-[var(--soft-blue)] pl-4 py-1 my-3 bg-[var(--soft-surface)]/50 rounded-r-lg">
              {children}
            </blockquote>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-3">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-[var(--soft-surface)]">{children}</thead>;
        },
        th({ children }) {
          return (
            <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--soft-text-secondary)] border border-[var(--soft-divider)]">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="px-3 py-2 text-sm border border-[var(--soft-divider)]">
              {children}
            </td>
          );
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--soft-blue)] hover:underline"
            >
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// Tool call card component
function ToolCallCard({ tool }: { tool: ToolCall }) {
  const [expanded, setExpanded] = useState(false);

  // Determine status from tool fields
  const getStatus = () => {
    if (tool.is_error) return 'error';
    if (tool.running) return 'running';
    if (tool.result !== undefined) return 'completed';
    return 'pending';
  };

  const status = getStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 rounded-xl border border-[var(--soft-divider)] bg-[var(--soft-surface)]/30 overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--soft-surface)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[var(--soft-blue)]/10 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-[var(--soft-blue)]" />
          </div>
          <span className="text-sm font-medium text-[var(--soft-text-primary)]">
            {tool.name}
          </span>
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full",
            status === 'completed' && "bg-green-500/10 text-green-500",
            status === 'running' && "bg-[var(--soft-blue)]/10 text-[var(--soft-blue)]",
            status === 'error' && "bg-red-500/10 text-red-500",
            status === 'pending' && "bg-[var(--soft-surface)] text-[var(--soft-text-muted)]"
          )}>
            {status}
          </span>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-[var(--soft-text-muted)] transition-transform",
          expanded && "rotate-180"
        )} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {tool.input !== undefined && tool.input !== null && (
                <div>
                  <div className="text-xs text-[var(--soft-text-muted)] mb-1">Input</div>
                  <pre className="text-xs bg-[var(--soft-bg)] rounded-lg p-2 overflow-x-auto font-mono">
                    {JSON.stringify(tool.input, null, 2)}
                  </pre>
                </div>
              )}
              {tool.result && (
                <div>
                  <div className="text-xs text-[var(--soft-text-muted)] mb-1">Result</div>
                  <pre className="text-xs bg-[var(--soft-bg)] rounded-lg p-2 overflow-x-auto font-mono">
                    {typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Improved message bubble component
function MessageBubble({
  message,
  isUser,
  agent,
}: {
  message: ExtendedMessage;
  isUser: boolean;
  agent?: Agent;
}) {
  const gradient = agent ? getAgentGradient(agent) : 'from-[var(--soft-blue)] to-blue-600';
  const content = message.content || '';

  // Check if content looks like code (contains triple backticks)
  const hasCodeBlock = content.includes('```');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex gap-4 px-4 py-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-xl bg-[var(--soft-surface)] flex items-center justify-center border border-[var(--soft-divider)]">
            <User className="w-4 h-4 text-[var(--soft-text-secondary)]" />
          </div>
        ) : (
          <div className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-md',
            gradient
          )}>
            <Bot className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        'flex-1 min-w-0',
        isUser ? 'flex flex-col items-end' : ''
      )}>
        {/* Bubble */}
        <div
          className={cn(
            'relative max-w-[85%]',
            isUser ? 'ml-auto' : 'mr-auto'
          )}
        >
          {/* User Message - Simple bubble */}
          {isUser ? (
            <div className="bg-[var(--soft-blue)] text-white px-5 py-3 rounded-2xl rounded-tr-sm shadow-sm">
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>
            </div>
          ) : (
            /* Assistant Message - Rich content */
            <div className="text-[var(--soft-text-primary)]">
              {message.isStreaming && !content ? (
                <div className="flex items-center gap-2 py-3 px-1">
                  <div className="w-2 h-2 rounded-full bg-[var(--soft-blue)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[var(--soft-blue)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[var(--soft-blue)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <MarkdownRenderer content={content} />
                </div>
              )}

              {/* Tool calls */}
              {message.tools && message.tools.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.tools.map((tool, idx) => (
                    <ToolCallCard key={idx} tool={tool} />
                  ))}
                </div>
              )}

              {/* Streaming cursor */}
              {message.isStreaming && content && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="inline-block w-2 h-4 bg-[var(--soft-blue)] ml-1 align-middle rounded-sm"
                />
              )}
            </div>
          )}
        </div>

        {/* Meta info */}
        <div className={cn(
          "mt-2 flex items-center gap-3 text-[11px] text-[var(--soft-text-muted)]",
          isUser && "justify-end"
        )}>
          <span>{new Date(message.ts || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {message.inputTokens !== undefined && message.outputTokens !== undefined && (
            <span className="flex items-center gap-1">
              <span>·</span>
              <span>{message.inputTokens + message.outputTokens} tokens</span>
            </span>
          )}
          {message.cost !== undefined && (
            <span className="flex items-center gap-1">
              <span>·</span>
              <span>${message.cost.toFixed(4)}</span>
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Session selector dropdown
function SessionSelector({
  sessions,
  currentSession,
  onSelect,
  onNewSession
}: {
  sessions: Session[];
  currentSession?: Session;
  onSelect: (sessionId: string) => void;
  onNewSession: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--soft-surface)] hover:bg-[var(--soft-surface-hover)] text-[var(--soft-text-secondary)] text-sm transition-colors"
        whileTap={{ scale: 0.98 }}
      >
        <Clock className="w-4 h-4" />
        <span className="max-w-[150px] truncate">
          {currentSession?.title || 'Current Session'}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180')} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-72 bg-[var(--soft-main)] border border-[var(--soft-divider)] rounded-xl shadow-lg z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="px-3 py-2 border-b border-[var(--soft-divider)] flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--soft-text-muted)] uppercase tracking-wider">
                  Sessions
                </span>
                <motion.button
                  onClick={onNewSession}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--soft-blue)] text-white text-xs font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="w-3 h-3" />
                  New
                </motion.button>
              </div>

              {/* Session List */}
              <div className="max-h-64 overflow-y-auto">
                {sessions.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-[var(--soft-text-muted)]">
                    No sessions yet
                  </div>
                ) : (
                  sessions.map((session) => (
                    <motion.button
                      key={session.session_id}
                      onClick={() => {
                        onSelect(session.session_id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        'w-full px-3 py-2.5 text-left hover:bg-[var(--soft-surface)] transition-colors flex items-center gap-3',
                        currentSession?.session_id === session.session_id && 'bg-[var(--soft-surface)]'
                      )}
                    >
                      <MessageSquare className={cn(
                        'w-4 h-4',
                        currentSession?.session_id === session.session_id
                          ? 'text-[var(--soft-blue)]'
                          : 'text-[var(--soft-text-muted)]'
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          'text-sm truncate',
                          currentSession?.session_id === session.session_id
                            ? 'text-[var(--soft-text-primary)] font-medium'
                            : 'text-[var(--soft-text-secondary)]'
                        )}>
                          {session.title}
                        </div>
                        <div className="text-xs text-[var(--soft-text-tertiary)]">
                          {new Date(session.created_at).toLocaleDateString()} · {session.message_count} messages
                        </div>
                      </div>
                      {currentSession?.session_id === session.session_id && (
                        <motion.div
                          layoutId="activeSessionIndicator"
                          className="w-1.5 h-1.5 rounded-full bg-[var(--soft-blue)]"
                        />
                      )}
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Main Chat V2 Component
export function ChatV2() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Local storage for last selected agent
  const [lastSelectedAgentId, setLastSelectedAgentId] = useLocalStorage<string | null>('chatv2-last-agent', null);

  // Get agent from URL or localStorage
  const agentIdFromUrl = searchParams.get('agent');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agentIdFromUrl || lastSelectedAgentId);

  // UI State
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  // Fetch agents
  const { data: agents = [], isLoading: isLoadingAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: api.listAgents,
  });

  // Get selected agent
  const selectedAgent = useMemo(() => {
    return agents.find(a => a.id === selectedAgentId);
  }, [agents, selectedAgentId]);

  // Fetch sessions for selected agent
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['agent-sessions', selectedAgentId],
    queryFn: () => selectedAgentId ? api.listAgentSessions(selectedAgentId) : Promise.resolve([]),
    enabled: !!selectedAgentId,
  });

  // Fetch messages for current session
  const { data: sessionMessages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['session-messages', selectedAgentId, currentSession?.session_id],
    queryFn: async () => {
      if (!selectedAgentId) return [];
      const res = await api.getAgentSession(selectedAgentId);
      return res.messages as ExtendedMessage[];
    },
    enabled: !!selectedAgentId,
  });

  // Update messages when session data changes
  const prevSessionMessagesRef = useRef<ExtendedMessage[]>([]);
  useEffect(() => {
    const hasChanged = sessionMessages.length !== prevSessionMessagesRef.current.length ||
      JSON.stringify(sessionMessages.map(m => m.id)) !== JSON.stringify(prevSessionMessagesRef.current.map(m => m.id));

    if (hasChanged) {
      prevSessionMessagesRef.current = sessionMessages;
      if (sessionMessages.length > 0) {
        setMessages(sessionMessages);
      } else {
        setMessages([]);
      }
    }
  }, [sessionMessages]);

  // Auto-select first session
  const hasAutoSelectedSession = useRef(false);
  useEffect(() => {
    if (sessions.length > 0 && !hasAutoSelectedSession.current) {
      hasAutoSelectedSession.current = true;
      const sorted = [...sessions].sort((a, b) =>
        new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
      );
      setCurrentSession(sorted[0]);
    }
    return () => {
      if (sessions.length === 0) {
        hasAutoSelectedSession.current = false;
      }
    };
  }, [sessions]);

  // Scroll to bottom
  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    if (messages.length !== prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Update URL when agent changes
  const prevAgentIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedAgentId && selectedAgentId !== prevAgentIdRef.current) {
      prevAgentIdRef.current = selectedAgentId;
      setLastSelectedAgentId(selectedAgentId);
      const currentAgentInUrl = searchParams.get('agent');
      if (currentAgentInUrl !== selectedAgentId) {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('agent', selectedAgentId);
        setSearchParams(newParams, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgentId]);

  // Handle agent selection
  const handleAgentSelect = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentSession(null);
    setMessages([]);
  }, []);

  // Handle session selection
  const handleSessionSelect = useCallback(async (sessionId: string) => {
    if (!selectedAgentId) return;

    try {
      await api.switchSession(selectedAgentId, sessionId);
      const session = sessions.find(s => s.session_id === sessionId);
      if (session) {
        setCurrentSession(session);
      }
      queryClient.invalidateQueries({ queryKey: ['session-messages', selectedAgentId] });
    } catch (error) {
      toaster.error('Failed to switch session');
    }
  }, [selectedAgentId, sessions, queryClient]);

  // Create new session
  const handleNewSession = useMutation({
    mutationFn: async () => {
      if (!selectedAgentId) return null;
      return api.createSession(selectedAgentId, 'New Chat');
    },
    onSuccess: (session) => {
      if (session) {
        setCurrentSession(session);
        setMessages([]);
        queryClient.invalidateQueries({ queryKey: ['agent-sessions', selectedAgentId] });
      }
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedAgentId) throw new Error('No agent selected');
      return api.sendMessage(selectedAgentId, content, currentSession?.session_id);
    },
  });

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || !selectedAgentId || isStreaming) return;

    const content = input.trim();
    setInput('');

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Add user message
    const userMessage: ExtendedMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      ts: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    setIsStreaming(true);

    try {
      wsManager.connect(
        selectedAgentId,
        (data) => {
          if (typeof data === 'object' && data !== null) {
            const msg = data as { type?: string; content?: string; done?: boolean; error?: string };

            if (msg.error) {
              toaster.error(msg.error);
              setIsStreaming(false);
              return;
            }

            if (msg.type === 'chunk' && msg.content) {
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'assistant' && last.isStreaming) {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, content: (last.content || '') + msg.content }
                  ];
                }
                return [...prev, {
                  id: `stream-${Date.now()}`,
                  role: 'assistant',
                  content: msg.content,
                  isStreaming: true,
                  ts: Date.now(),
                }];
              });
            }

            if (msg.done) {
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.isStreaming) {
                  return [...prev.slice(0, -1), { ...last, isStreaming: false }];
                }
                return prev;
              });
              setIsStreaming(false);
              queryClient.invalidateQueries({ queryKey: ['agent-sessions', selectedAgentId] });
            }
          }
        },
        {
          onStateChange: (state) => {
            if (state === 'disconnected') {
              setIsStreaming(false);
            }
          }
        }
      );

      await wsManager.waitForConnection(5000);
      await sendMessageMutation.mutateAsync(content);

    } catch (error) {
      toaster.error(error instanceof Error ? error.message : 'Failed to send message');
      setIsStreaming(false);
    }
  }, [input, selectedAgentId, currentSession, isStreaming, queryClient]);

  // Handle input keydown
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle input change with auto-resize
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }, []);

  // If no agent selected, show agent selector
  if (!selectedAgentId || !selectedAgent) {
    return (
      <div className="h-full flex flex-col bg-[var(--soft-main)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--soft-divider)]">
          <h1 className="text-xl font-semibold text-[var(--soft-text-primary)]">Chat</h1>
          <p className="text-sm text-[var(--soft-text-muted)]">Select an agent to start chatting</p>
        </div>

        {/* Agent List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingAgents ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-[var(--soft-blue)] animate-spin" />
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--soft-surface)] flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-[var(--soft-text-muted)]" />
              </div>
              <h3 className="text-lg font-medium text-[var(--soft-text-primary)] mb-2">No agents available</h3>
              <p className="text-sm text-[var(--soft-text-muted)] max-w-sm">
                Create your first agent to start chatting
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {agents.map((agent, index) => (
                <motion.button
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleAgentSelect(agent.id)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--soft-surface)] hover:bg-[var(--soft-surface-hover)] border border-transparent hover:border-[var(--soft-divider)] transition-all text-left group"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {/* Agent Avatar */}
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br',
                    getAgentGradient(agent)
                  )}>
                    <Bot className="w-6 h-6 text-white" />
                  </div>

                  {/* Agent Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[var(--soft-text-primary)] truncate">{agent.name}</h3>
                    <p className="text-sm text-[var(--soft-text-muted)] truncate">
                      {agent.description || agent.profile || 'Agent'}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="w-5 h-5 text-[var(--soft-text-tertiary)] group-hover:text-[var(--soft-blue)] transition-colors" />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--soft-main)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--soft-divider)] flex items-center justify-between bg-[var(--soft-bg)]">
        {/* Left: Agent Info */}
        <div className="flex items-center gap-3">
          {/* Back button (mobile) */}
          <motion.button
            onClick={() => {
              setSelectedAgentId(null);
              setCurrentSession(null);
            }}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--soft-surface)] text-[var(--soft-text-secondary)]"
            whileTap={{ scale: 0.95 }}
          >
            <ChevronDown className="w-5 h-5 rotate-90" />
          </motion.button>

          {/* Agent Avatar */}
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-sm',
            getAgentGradient(selectedAgent)
          )}>
            <Bot className="w-5 h-5 text-white" />
          </div>

          {/* Agent Name & Session */}
          <div>
            <h2 className="font-semibold text-[var(--soft-text-primary)] text-sm">{selectedAgent.name}</h2>
            <div className="flex items-center gap-2">
              <SessionSelector
                sessions={sessions}
                currentSession={currentSession || undefined}
                onSelect={handleSessionSelect}
                onNewSession={() => handleNewSession.mutate()}
              />
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => handleNewSession.mutate()}
            disabled={handleNewSession.isPending}
            className="p-2 rounded-lg hover:bg-[var(--soft-surface)] text-[var(--soft-text-secondary)] transition-colors"
            whileTap={{ scale: 0.95 }}
            title="New Session"
          >
            {handleNewSession.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </motion.button>

          <motion.button
            onClick={() => navigate(`/agents?edit=${selectedAgent.id}`)}
            className="p-2 rounded-lg hover:bg-[var(--soft-surface)] text-[var(--soft-text-secondary)] transition-colors"
            whileTap={{ scale: 0.95 }}
            title="Agent Settings"
          >
            <Settings className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden relative">
        {messages.length === 0 && !isLoadingMessages ? (
          <WelcomeScreen
            agent={selectedAgent}
            onStartChat={() => inputRef.current?.focus()}
          />
        ) : (
          <ScrollArea className="h-full">
            <div className="py-4">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id || index}
                  message={message}
                  isUser={message.role === 'user'}
                  agent={selectedAgent}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Input Area - Redesigned */}
      <div className="p-4 border-t border-[var(--soft-divider)] bg-[var(--soft-bg)]">
        <div className="max-w-3xl mx-auto">
          {/* Input Container - Clean floating design */}
          <div className="relative group">
            <div
              className={cn(
                "relative flex flex-col rounded-2xl border bg-[var(--soft-main)] shadow-sm transition-shadow duration-200",
                "focus-within:shadow-md",
                input.trim()
                  ? "border-[var(--soft-blue)]/50"
                  : "border-[var(--soft-divider)]"
              )}
            >
              {/* Textarea Container */}
              <div className="relative flex-1 min-h-[56px] max-h-[200px]">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${selectedAgent.name}...`}
                  disabled={isStreaming}
                  rows={1}
                  className={cn(
                    "w-full min-h-[56px] max-h-[200px] bg-transparent resize-none",
                    "text-[var(--soft-text-primary)] placeholder-[var(--soft-text-muted)]",
                    "focus:outline-none focus:ring-0 focus:border-transparent",
                    "border-none outline-none",
                    "py-4 px-4 pr-14 leading-relaxed text-[15px]"
                  )}
                  style={{
                    overflow: 'auto',
                    scrollbarWidth: 'thin',
                  }}
                />
              </div>

              {/* Bottom Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--soft-divider)]/50">
                {/* Left: Action buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isStreaming}
                    className="p-2 rounded-lg text-[var(--soft-text-muted)] hover:text-[var(--soft-text-secondary)] hover:bg-[var(--soft-surface)] transition-colors disabled:opacity-40"
                    title="Attach file"
                  >
                    <Paperclip className="w-[18px] h-[18px]" />
                  </button>
                </div>

                {/* Right: Send button */}
                <div className="flex items-center gap-2">
                  {/* Keyboard hint - subtle */}
                  <span className="hidden sm:flex items-center gap-1 text-[11px] text-[var(--soft-text-tertiary)]">
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--soft-surface)] font-sans text-[10px]">↵</kbd>
                    <span>to send</span>
                  </span>

                  {/* Send Button */}
                  <motion.button
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming}
                    className={cn(
                      'flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200',
                      input.trim() && !isStreaming
                        ? 'bg-[var(--soft-blue)] text-white hover:bg-[var(--soft-blue-dark)] shadow-sm'
                        : 'bg-[var(--soft-surface)] text-[var(--soft-text-muted)]'
                    )}
                    whileTap={input.trim() && !isStreaming ? { scale: 0.92 } : {}}
                  >
                    {isStreaming ? (
                      <Loader2 className="w-[18px] h-[18px] animate-spin" />
                    ) : (
                      <Send className="w-[18px] h-[18px]" />
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center mt-2">
            {isStreaming ? (
              <motion.button
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  wsManager.disconnect();
                  setIsStreaming(false);
                }}
                className="flex items-center gap-1.5 text-xs text-[var(--soft-text-muted)] hover:text-red-500 transition-colors px-3 py-1.5 rounded-full hover:bg-red-500/5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Stop generating
              </motion.button>
            ) : (
              <span className="text-[11px] text-[var(--soft-text-tertiary)]">
                AI-generated content may be inaccurate
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatV2;
