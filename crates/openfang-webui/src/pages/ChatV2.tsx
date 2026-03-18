// ChatV2 - OpenFang UI Evolution Style with Session Memory
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api, wsManager } from '@/api/client';
import type { Agent, Session, Message, ToolCall } from '@/api/types';
import { MessageContent } from '@/components/chat/MessageContent';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';
import {
  Send, Bot, User, Plus, MessageSquare,
  Loader2, Sparkles, Clock, MoreHorizontal,
  ChevronDown, Paperclip, X, Brain,
  Command, Settings, ArrowRight
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toaster } from '@/lib/toast';

interface ExtendedMessage extends Message {
  isStreaming?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  tools?: ToolCall[];
}

// Agent icon mapping based on profile/archetype
function getAgentIcon(agent: Agent) {
  const archetype = agent.identity?.archetype?.toLowerCase() || '';
  const profile = agent.profile?.toLowerCase() || '';
  const name = agent.name?.toLowerCase() || '';

  if (archetype.includes('code') || profile.includes('code') || name.includes('code')) return 'code';
  if (archetype.includes('brain') || profile.includes('brain') || name.includes('brain')) return 'brain';
  if (archetype.includes('terminal') || profile.includes('terminal') || name.includes('term')) return 'terminal';
  if (archetype.includes('spark') || profile.includes('spark')) return 'sparkles';
  if (archetype.includes('zap') || profile.includes('zap') || name.includes('fast')) return 'zap';

  return 'bot';
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

// Message bubble component - Soft UI style
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-3 px-4 py-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-xl bg-[var(--soft-surface)] flex items-center justify-center">
            <User className="w-4 h-4 text-[var(--soft-text-secondary)]" />
          </div>
        ) : (
          <div className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br',
            gradient
          )}>
            <Bot className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        'flex-1 max-w-[85%]',
        isUser ? 'text-right' : 'text-left'
      )}>
        <div
          className={cn(
            'inline-block px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-[var(--soft-blue)] text-white rounded-br-md'
              : 'bg-[var(--soft-surface)] text-[var(--soft-text-primary)] rounded-bl-md'
          )}
        >
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-2 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <MessageContent message={message} />
          )}
        </div>

        {/* Meta info */}
        <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--soft-text-muted)]">
          <span>{new Date(message.ts || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {message.inputTokens && message.outputTokens && (
            <span className="text-[var(--soft-text-tertiary)]">
              · {message.inputTokens + message.outputTokens} tokens
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
  const [showSessionPanel, setShowSessionPanel] = useState(false);

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

  // Update messages when session data changes - only when data actually changes
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

  // Auto-select first session or use most recent - use ref to prevent loop
  const hasAutoSelectedSession = useRef(false);
  useEffect(() => {
    if (sessions.length > 0 && !hasAutoSelectedSession.current) {
      hasAutoSelectedSession.current = true;
      // Sort by updated_at desc and pick most recent
      const sorted = [...sessions].sort((a, b) =>
        new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
      );
      setCurrentSession(sorted[0]);
    }
    // Reset when sessions array changes significantly (e.g., agent switch)
    return () => {
      if (sessions.length === 0) {
        hasAutoSelectedSession.current = false;
      }
    };
  }, [sessions]);

  // Scroll to bottom when message count changes (not on every message content change)
  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    if (messages.length !== prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Update URL when agent changes - only when agentId actually changes
  const prevAgentIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedAgentId && selectedAgentId !== prevAgentIdRef.current) {
      prevAgentIdRef.current = selectedAgentId;
      setLastSelectedAgentId(selectedAgentId);
      // Only update URL if agent param is different
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

    // Add user message immediately
    const userMessage: ExtendedMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      ts: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    setIsStreaming(true);

    try {
      // Connect WebSocket for streaming
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

      // Wait for WebSocket connection
      await wsManager.waitForConnection(5000);

      // Send the message
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
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
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
            'w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br',
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

      {/* Input Area */}
      <div className="p-4 border-t border-[var(--soft-divider)] bg-[var(--soft-bg)]">
        <div className="max-w-3xl mx-auto">
          {/* Input Container */}
          <div className="relative bg-[var(--soft-surface)] rounded-2xl border border-[var(--soft-divider)] focus-within:border-[var(--soft-blue)] focus-within:ring-2 focus-within:ring-[var(--soft-blue)]/20 transition-all">
            {/* Textarea */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${selectedAgent.name}...`}
              disabled={isStreaming}
              rows={1}
              className="w-full bg-transparent px-4 py-3.5 pr-12 text-[var(--soft-text-primary)] placeholder-[var(--soft-text-muted)] resize-none outline-none min-h-[52px] max-h-[120px]"
            />

            {/* Send Button */}
            <motion.button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className={cn(
                'absolute right-2 bottom-2 p-2 rounded-xl transition-colors',
                input.trim() && !isStreaming
                  ? 'bg-[var(--soft-blue)] text-white hover:bg-[var(--soft-blue-dark)]'
                  : 'bg-[var(--soft-surface-hover)] text-[var(--soft-text-muted)]'
              )}
              whileTap={input.trim() && !isStreaming ? { scale: 0.95 } : {}}
            >
              {isStreaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </motion.button>
          </div>

          {/* Footer hint */}
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-3 text-[11px] text-[var(--soft-text-muted)]">
              <span className="flex items-center gap-1">
                <Command className="w-3 h-3" />
                + Enter to send
              </span>
              <span>Shift + Enter for new line</span>
            </div>

            {isStreaming && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => {
                  wsManager.disconnect();
                  setIsStreaming(false);
                }}
                className="text-xs text-[var(--soft-text-muted)] hover:text-[var(--neon-magenta)] transition-colors"
              >
                Stop generating
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatV2;
