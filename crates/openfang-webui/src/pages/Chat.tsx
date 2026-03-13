// Chat - Immersive Terminal Style with Sessions
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api, wsManager } from '@/api/client';
import type { Agent, Session, Message, ToolCall, SlashCommand, ThinkingMode, Attachment } from '@/api/types';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { cyberColors } from '@/lib/animations';
import { MessageContent } from '@/components/chat/MessageContent';
import {
  Send, Bot, User, ChevronLeft, Terminal, Plus, MessageSquare,
  Loader2, Settings, Sparkles, Trash2, Clock, MoreHorizontal,
  RefreshCw, ChevronDown, Search, Command, Mic, Paperclip, X,
  Brain, HelpCircle, Users, FileText, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

// Terminal-style message component
function TerminalMessage({
  message,
  index,
  id,
  isSearchResult,
  isCurrentSearch,
  searchQuery
}: {
  message: ExtendedMessage;
  index: number;
  id?: string;
  isSearchResult?: boolean;
  isCurrentSearch?: boolean;
  searchQuery?: string;
}) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={cn(
        'mb-4 p-2 rounded-lg transition-colors',
        isUser && 'ml-auto max-w-[80%]',
        isCurrentSearch && 'bg-[var(--neon-cyan)]/20 ring-1 ring-[var(--neon-cyan)]',
        isSearchResult && !isCurrentSearch && 'bg-[var(--neon-amber)]/10'
      )}
    >
      {/* Message header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            'w-6 h-6 rounded flex items-center justify-center text-xs font-mono',
            isUser && 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]',
            isAssistant && 'bg-[var(--neon-green)]/20 text-[var(--neon-green)]',
            isSystem && 'bg-[var(--neon-amber)]/20 text-[var(--neon-amber)]'
          )}
        >
          {isUser ? <User className="w-3 h-3" /> : isAssistant ? <Bot className="w-3 h-3" /> : <Terminal className="w-3 h-3" />}
        </div>
        <span className="text-xs font-mono text-[var(--text-muted)]">
          {isUser ? 'USER' : isAssistant ? 'AGENT' : 'SYSTEM'}
        </span>
        <span className="text-xs font-mono text-[var(--text-muted)]">
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
        </span>
        {message.thinking && (
          <span className="text-xs font-mono text-[var(--neon-magenta)]">
            <Brain className="w-3 h-3 inline mr-1" />THINKING
          </span>
        )}
        {message.cost != null && (
          <span className="text-xs font-mono text-[var(--neon-amber)]">
            ${message.cost.toFixed(4)}
          </span>
        )}
      </div>

      {/* Message content */}
      <MessageContent
        message={message}
        isStreaming={message.isStreaming}
        searchQuery={isSearchResult ? searchQuery : undefined}
      />

      {/* Meta info */}
      {(message.inputTokens || message.outputTokens) && (
        <div className="flex gap-3 mt-1 text-[10px] font-mono text-[var(--text-muted)]">
          {message.inputTokens && <span>IN: {message.inputTokens}</span>}
          {message.outputTokens && <span>OUT: {message.outputTokens}</span>}
        </div>
      )}
    </motion.div>
  );
}

// Session card component
function SessionCard({
  session,
  isSelected,
  onClick,
  onDelete
}: {
  session: Session;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={cn(
        'w-full p-3 rounded-lg text-left transition-all duration-200 group relative cursor-pointer',
        'border border-[var(--border-subtle)] hover:border-[var(--border-default)]',
        isSelected
          ? 'bg-[var(--neon-cyan)]/10 border-[var(--neon-cyan)]/30'
          : 'bg-[var(--text-primary)]/[0.02] hover:bg-[var(--text-primary)]/[0.04]'
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center gap-2">
        <MessageSquare
          className={cn(
            'w-4 h-4 shrink-0',
            isSelected ? 'text-[var(--neon-cyan)]' : 'text-[var(--text-muted)]'
          )}
        />
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              'text-sm truncate',
              isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
            )}
          >
            {session.title || 'Untitled Session'}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {session.created_at
              ? new Date(session.created_at).toLocaleDateString()
              : 'Unknown'}
          </div>
        </div>

        {/* Actions */}
        <AnimatePresence>
          {showActions && onDelete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1"
            >
              <button
                onClick={onDelete}
                className="p-1.5 rounded hover:bg-[var(--neon-magenta)]/20 text-[var(--text-muted)] hover:text-[var(--neon-magenta)]"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {isSelected && (
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)] shadow-[0_0_6px_var(--neon-cyan)]" />
        )}
      </div>
    </motion.div>
  );
}

// Agent selector card
function AgentCard({
  agent,
  isSelected,
  onClick
}: {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'w-full p-3 rounded-lg text-left transition-all duration-200',
        'border border-[var(--border-subtle)] hover:border-[var(--border-default)]',
        isSelected
          ? 'bg-[var(--neon-cyan)]/10 border-[var(--neon-cyan)]/30'
          : 'bg-[var(--text-primary)]/[0.02] hover:bg-[var(--text-primary)]/[0.04]'
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center',
            isSelected ? 'bg-[var(--neon-cyan)]/20' : 'bg-[var(--surface-secondary)]'
          )}
        >
          <Bot
            className={cn(
              'w-4 h-4',
              isSelected ? 'text-[var(--neon-cyan)]' : 'text-[var(--text-muted)]'
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              'text-sm font-medium truncate',
              isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
            )}
          >
            {agent.name}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">
            {typeof agent.model === 'string' ? agent.model : agent.model?.model || 'No model'}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const agentIdFromUrl = searchParams.get('agent');
  const queryClient = useQueryClient();

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agentIdFromUrl);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewMode, setViewMode] = useState<'agents' | 'sessions'>('agents');

  // Slash commands state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashIdx, setSlashIdx] = useState(0);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [searchCurrentIdx, setSearchCurrentIdx] = useState(0);

  // Thinking mode & attachments
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>('off');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Message queue for messages sent while streaming (like Alpine)
  const messageQueueRef = useRef<Array<{ text: string; attachments?: Attachment[]; thinkingMode?: ThinkingMode }>>([]);
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'disconnected' | 'connecting'>('disconnected');
  const wasConnectedRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Slash commands definition
  const slashCommands: SlashCommand[] = [
    { cmd: '/help', desc: 'Show available commands' },
    { cmd: '/agents', desc: 'Switch to Agents page' },
    { cmd: '/new', desc: 'Reset session (clear history)' },
    { cmd: '/compact', desc: 'Trigger LLM session compaction' },
    { cmd: '/model', desc: 'Show or switch model (/model [name])' },
    { cmd: '/stop', desc: 'Cancel current agent run' },
    { cmd: '/usage', desc: 'Show session token usage & cost' },
    { cmd: '/thinking', desc: 'Toggle thinking mode (/thinking off|on|stream)' },
    { cmd: '/search', desc: 'Search message history' },
  ];

  const filteredSlashCommands = useMemo(() => {
    if (!slashFilter) return slashCommands;
    const q = slashFilter.toLowerCase();
    return slashCommands.filter(c => c.cmd.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
  }, [slashFilter]);

  // Search messages
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const indices: number[] = [];
    messages.forEach((m, idx) => {
      const content = (m.content || m.text || '').toLowerCase();
      if (content.includes(q)) indices.push(idx);
    });
    setSearchResults(indices);
    setSearchCurrentIdx(indices.length > 0 ? 0 : -1);
  }, [messages]);

  // Navigate to search result
  const navigateSearch = useCallback((direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    if (direction === 'next') {
      setSearchCurrentIdx(prev => (prev + 1) % searchResults.length);
    } else {
      setSearchCurrentIdx(prev => (prev - 1 + searchResults.length) % searchResults.length);
    }
  }, [searchResults.length]);

  // Effect to perform search when query changes
  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  // Effect to scroll to current search result
  useEffect(() => {
    if (searchCurrentIdx >= 0 && searchResults[searchCurrentIdx] !== undefined) {
      const msgIdx = searchResults[searchCurrentIdx];
      const msgElement = document.getElementById(`msg-${msgIdx}`);
      msgElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchCurrentIdx, searchResults]);

  // Handle file drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!selectedAgentId) return;

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      try {
        const result = await api.upload(selectedAgentId, file);
        const newAttachment: Attachment = {
          id: result.file_id,
          file_id: result.file_id,
          filename: result.filename,
          content_type: result.content_type,
          size: result.size,
          transcription: result.transcription,
        };
        setAttachments(prev => [...prev, newAttachment]);
        toaster.success(`Uploaded: ${result.filename}`);
      } catch (err) {
        toaster.error(`Failed to upload ${file.name}: ${(err as Error).message}`);
      }
    }
  }, [selectedAgentId]);

  // Handle file select
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedAgentId || !e.target.files) return;

    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        const result = await api.upload(selectedAgentId, file);
        const newAttachment: Attachment = {
          id: result.file_id,
          file_id: result.file_id,
          filename: result.filename,
          content_type: result.content_type,
          size: result.size,
          transcription: result.transcription,
        };
        setAttachments(prev => [...prev, newAttachment]);
        toaster.success(`Uploaded: ${result.filename}`);
      } catch (err) {
        toaster.error(`Failed to upload ${file.name}: ${(err as Error).message}`);
      }
    }
    e.target.value = '';
  }, [selectedAgentId]);

  // Voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (!selectedAgentId) return;

        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        try {
          const result = await api.upload(selectedAgentId, file);
          const newAttachment: Attachment = {
            id: result.file_id,
            file_id: result.file_id,
            filename: result.filename,
            content_type: result.content_type,
            size: result.size,
            transcription: result.transcription,
          };
          setAttachments(prev => [...prev, newAttachment]);
          if (result.transcription) {
            setInputMessage(prev => prev + (prev ? ' ' : '') + result.transcription);
          }
          toaster.success('Recording uploaded');
        } catch (err) {
          toaster.error(`Failed to upload recording: ${(err as Error).message}`);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      toaster.error('Could not start recording: ' + (err as Error).message);
    }
  }, [selectedAgentId]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  // Model type
  interface ModelInfo {
    id: string;
    display_name?: string;
    provider: string;
    available: boolean;
    tier?: string;
    context_window?: number;
    supports_vision?: boolean;
    supports_tools?: boolean;
  }

  // Fetch available models (cache 5 minutes like Alpine)
  const { data: rawModels } = useQuery<{ models: ModelInfo[] }>({
    queryKey: ['models'],
    queryFn: async () => {
      const res = await api.listModels();
      // Handle different response formats
      if (Array.isArray(res)) {
        return { models: res.filter((m: ModelInfo) => m.available) };
      }
      // Response is { models: [...] }
      const modelList = res?.models || [];
      return { models: modelList.filter((m: ModelInfo) => m.available) };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Extract models array safely
  const models = rawModels?.models || [];

  // Fetch agents
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => api.listAgents(),
  });

  // Fetch sessions
  const { data: sessions = [], refetch: refetchSessions } = useQuery<Session[]>({
    queryKey: ['sessions', selectedAgentId],
    queryFn: async () => {
      if (!selectedAgentId) return [];
      const allSessions = await api.listSessions();
      return allSessions.filter(s => s.agent_id === selectedAgentId);
    },
    enabled: !!selectedAgentId,
  });

  const selectedAgent = useMemo(() =>
    agents.find(a => a.id === selectedAgentId),
    [agents, selectedAgentId]
  );

  // Get current model ID (priority: model_name > model.model)
  const currentModelId = useMemo(() => {
    return selectedAgent?.model_name ||
           (typeof selectedAgent?.model === 'string' ? selectedAgent.model : selectedAgent?.model?.model) ||
           '';
  }, [selectedAgent]);

  // Get current model display name (align with Alpine: truncate at 24 chars)
  const currentModelDisplay = useMemo(() => {
    if (!currentModelId) return '';
    const model = models.find(m => m.id === currentModelId);
    const name = model?.display_name || currentModelId;
    // Truncate like Alpine does
    const short = name.replace(/-\d{8}$/, '');
    return short.length > 24 ? short.substring(0, 22) + '…' : short;
  }, [currentModelId, models]);

  // Change model mutation (align with Alpine)
  const changeModelMutation = useMutation({
    mutationFn: async ({ agentId, modelId, provider }: { agentId: string; modelId: string; provider: string }) => {
      await api.changeAgentModel(agentId, modelId);
      return { agentId, modelId, provider };
    },
    onSuccess: (data) => {
      // Update local agent cache immediately (like Alpine does)
      queryClient.setQueryData<Agent[]>(['agents'], (old) => {
        if (!old) return old;
        return old.map(a =>
          a.id === data.agentId
            ? { ...a, model_name: data.modelId, model_provider: data.provider }
            : a
        );
      });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  // Handle model change (align with Alpine)
  const handleModelChange = useCallback((modelId: string) => {
    if (!selectedAgentId || modelId === currentModelId) return;
    const model = models.find(m => m.id === modelId);
    changeModelMutation.mutate({
      agentId: selectedAgentId,
      modelId,
      provider: model?.provider || selectedAgent?.model_provider || ''
    });
  }, [selectedAgentId, currentModelId, models, selectedAgent, changeModelMutation]);

  const selectedSession = useMemo(() =>
    sessions.find(s => s.session_id === selectedSessionId),
    [sessions, selectedSessionId]
  );

  // Load session messages when session changes
  useEffect(() => {
    if (!selectedAgentId || !selectedSessionId) {
      setMessages([]);
      return;
    }

    api.getMessages(selectedAgentId, selectedSessionId).then((data: Message[]) => {
      setMessages(data.map((m, idx) => ({
        ...m,
        id: m.id || `msg-${selectedSessionId}-${idx}-${Date.now()}`,
        isStreaming: false
      })));
    }).catch(() => {
      setMessages([]);
    });
  }, [selectedAgentId, selectedSessionId]);

  // WebSocket connection with Toast notifications
  useEffect(() => {
    if (!selectedAgentId) return;

    let isActive = true;

    wsManager.connect(
      selectedAgentId,
      (data) => {
        if (isActive) handleWebSocketMessage(data);
      },
      {
        onStateChange: (state) => {
          setConnectionState(state);
          // Toast notifications aligned with Alpine
          if (state === 'connected') {
            if (wasConnectedRef.current) {
              toaster.success('Reconnected');
            }
            wasConnectedRef.current = true;
          } else if (state === 'reconnecting') {
            if (!wasConnectedRef.current) {
              toaster.warn('Connection lost, reconnecting...');
            }
          } else if (state === 'disconnected') {
            if (wasConnectedRef.current) {
              toaster.error('Connection lost — switched to HTTP mode', 0);
            }
          }
        },
        onError: (err) => {
          console.error('[Chat] WS error:', err);
        }
      }
    );

    return () => {
      isActive = false;
      wasConnectedRef.current = false;
      wsManager.disconnect();
    };
  }, [selectedAgentId, selectedSessionId]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data: unknown) => {
    const msg = data as {
      type: string;
      chunk?: string;
      content?: string;
      done?: boolean;
      error?: string;
      input_tokens?: number;
      output_tokens?: number;
      cost_usd?: number;
    };

    if (msg.type === 'text_delta' && msg.content) {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...lastMsg,
            content: (lastMsg.content || '') + msg.content,
            text: (lastMsg.text || '') + msg.content,
          };
          return updated;
        }
        return prev;
      });
    } else if (msg.type === 'response') {
      setIsStreaming(false);
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.isStreaming) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...lastMsg,
            isStreaming: false,
            content: msg.content || lastMsg.content,
            text: msg.content || lastMsg.text,
            inputTokens: msg.input_tokens,
            outputTokens: msg.output_tokens,
            cost: msg.cost_usd,
          };
          return updated;
        }
        return prev;
      });
      // Process queued messages after response (like Alpine)
      setTimeout(() => processMessageQueue(), 0);
    } else if (msg.type === 'error') {
      setIsStreaming(false);
      // Align with Alpine: use data.content for error message
      const errorContent = (data as { content?: string }).content || 'Unknown error';
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isStreaming);
        return [...filtered, {
          id: `error-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role: 'system',
          content: `Error: ${errorContent}`,
          text: `Error: ${errorContent}`,
          timestamp: new Date().toISOString(),
        }];
      });
      // Process queue after error (like Alpine)
      setTimeout(() => processMessageQueue(), 0);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const result = await api.createSession(agentId, 'New Chat');
      return result;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', selectedAgentId] });
      setSelectedSessionId(session.session_id);
      setMessages([]);
    },
  });

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await api.deleteSession(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', selectedAgentId] });
      if (sessions.length > 1) {
        const remaining = sessions.filter(s => s.session_id !== selectedSessionId);
        setSelectedSessionId(remaining[0]?.session_id || null);
      } else {
        setSelectedSessionId(null);
      }
    },
  });

  // Handle agent selection
  const handleSelectAgent = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    setSearchParams({ agent: agentId });
    setViewMode('sessions');

    // Auto-select first session or create new one
    const agentSessions = sessions.filter(s => s.agent_id === agentId);
    if (agentSessions.length > 0) {
      setSelectedSessionId(agentSessions[0].session_id);
    } else {
      createSessionMutation.mutate(agentId);
    }
  }, [setSearchParams, sessions, createSessionMutation]);

  // Process queued messages (like Alpine _processQueue)
  const processMessageQueue = useCallback(() => {
    if (messageQueueRef.current.length === 0 || isStreaming) return;
    const next = messageQueueRef.current.shift();
    if (next) {
      sendPayload(next.text, next.attachments, next.thinkingMode);
    }
  }, [isStreaming]);

  // Send payload via WebSocket or HTTP (aligned with Alpine _sendPayload)
  const sendPayload = useCallback(async (text: string, msgAttachments?: Attachment[], msgThinkingMode?: ThinkingMode) => {
    if (!selectedAgentId) return;

    setIsStreaming(true);

    // Try WebSocket first
    const wsPayload: { type: string; content: string; thinking?: ThinkingMode; attachments?: string[] } = {
      type: 'message',
      content: text,
    };
    if (msgThinkingMode && msgThinkingMode !== 'off') {
      wsPayload.thinking = msgThinkingMode;
    }
    if (msgAttachments && msgAttachments.length > 0) {
      wsPayload.attachments = msgAttachments.map(a => a.file_id);
    }
    if (wsManager.send(wsPayload)) {
      // WebSocket success - message will be streamed back
      setMessages(prev => [...prev, {
        id: `streaming-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: 'assistant',
        content: '',
        text: '',
        isStreaming: true,
        timestamp: new Date().toISOString(),
        thinking: msgThinkingMode === 'stream',
      }]);
      return;
    }

    // WebSocket not available - use HTTP fallback
    if (!wsManager.isConnected()) {
      toaster.info('Using HTTP mode (no streaming)');
    }

    setMessages(prev => [...prev, {
      id: `streaming-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'assistant',
      content: '',
      text: '',
      isStreaming: true,
      timestamp: new Date().toISOString(),
    }]);

    try {
      const res = await api.sendMessage(selectedAgentId, text, selectedSessionId || undefined);
      setIsStreaming(false);
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isStreaming);
        // Handle different response formats from HTTP API
        const responseData = res as unknown as {
          content?: string;
          response?: string;
          text?: string;
          input_tokens?: number;
          output_tokens?: number;
          cost_usd?: number;
        };
        return [...filtered, {
          id: `agent-${Date.now()}`,
          role: 'assistant',
          content: responseData.content || responseData.response || responseData.text || '',
          text: responseData.content || responseData.response || responseData.text || '',
          inputTokens: responseData.input_tokens,
          outputTokens: responseData.output_tokens,
          cost: responseData.cost_usd,
          timestamp: new Date().toISOString(),
        }];
      });
    } catch (err) {
      setIsStreaming(false);
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isStreaming);
        return [...filtered, {
          id: `error-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role: 'system',
          content: `Error: ${(err as Error).message}`,
          text: `Error: ${(err as Error).message}`,
          timestamp: new Date().toISOString(),
        }];
      });
    }
  }, [selectedAgentId, selectedSessionId]);

  // Execute slash command
  const executeSlashCommand = useCallback((cmd: string, args?: string) => {
    switch (cmd) {
    case '/help':
      setShowSlashMenu(true);
      break;
    case '/agents':
      window.location.href = '/agents';
      break;
    case '/new':
      if (selectedAgentId) {
        api.resetSession(selectedAgentId);
        setMessages([]);
        toaster.success('Session reset');
      }
      break;
    case '/compact':
      if (selectedAgentId) {
        api.compactSession(selectedAgentId).then(() => {
          toaster.success('Session compacted');
        }).catch((e) => {
          toaster.error('Failed to compact: ' + e.message);
        });
      }
      break;
    case '/model':
      if (args) {
        // Extract model ID from args
        const modelId = args.trim().split(' ')[0];
        if (selectedAgentId && modelId) {
          api.changeAgentModel(selectedAgentId, modelId).then(() => {
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            toaster.success('Model changed to ' + modelId);
          }).catch((e) => {
            toaster.error('Failed to change model: ' + e.message);
          });
        }
      } else {
        toaster.info('Current model: ' + currentModelDisplay);
      }
      break;
    case '/stop':
      if (selectedAgentId) {
        api.stopAgentRun(selectedAgentId).then(() => {
          toaster.success('Agent run stopped');
        }).catch((e) => {
          toaster.error('Failed to stop: ' + e.message);
        });
      }
      break;
    case '/thinking':
      if (args) {
        const mode = args.trim().toLowerCase() as ThinkingMode;
        if (['off', 'on', 'stream'].includes(mode)) {
          setThinkingMode(mode);
          toaster.success('Thinking mode set to: ' + mode);
        } else {
          toaster.error('Invalid mode. Use: off, on, stream');
        }
      } else {
        toaster.info('Current thinking mode: ' + thinkingMode);
      }
      break;
    case '/search':
      setShowSearch(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
      break;
    case '/usage':
      // Show usage info from last message
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.inputTokens || lastMsg?.outputTokens) {
        toaster.info(`Tokens: ${lastMsg.inputTokens || 0} in / ${lastMsg.outputTokens || 0} out${lastMsg.cost ? ` | Cost: $${lastMsg.cost.toFixed(4)}` : ''}`);
      } else {
        toaster.info('No usage data available yet');
      }
      break;
    default:
      toaster.warn('Unknown command: ' + cmd);
    }
  }, [selectedAgentId, currentModelDisplay, messages, thinkingMode, queryClient]);

  // Send message (aligned with Alpine sendMessage)
  const handleSend = useCallback(async () => {
    if (!inputMessage.trim() || !selectedAgentId || !selectedSessionId) return;

    const text = inputMessage.trim();

    // Check for slash command
    if (text.startsWith('/')) {
      const parts = text.slice(1).split(' ');
      const cmd = '/' + parts[0];
      const args = parts.slice(1).join(' ');
      if (slashCommands.some(c => c.cmd === cmd)) {
        setInputMessage('');
        executeSlashCommand(cmd, args);
        return;
      }
    }

    // If streaming, queue the message (like Alpine)
    if (isStreaming) {
      messageQueueRef.current.push({ text, attachments: [...attachments], thinkingMode });
      toaster.info('Message queued');
      setInputMessage('');
      return;
    }

    // Clear input and attachments immediately (like Alpine)
    setInputMessage('');
    const currentAttachments = [...attachments];
    setAttachments([]);

    // Show user message immediately with attachments
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      content: text,
      text: text,
      timestamp: new Date().toISOString(),
      images: currentAttachments.map(a => ({ file_id: a.file_id, filename: a.filename })),
    }]);

    // Send the payload with thinking mode and attachments
    await sendPayload(text, currentAttachments, thinkingMode);
  }, [inputMessage, selectedAgentId, selectedSessionId, isStreaming, attachments, thinkingMode, sendPayload, executeSlashCommand]);

  // Handle input change for slash commands
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputMessage(value);

    // Check for slash command trigger
    if (value.startsWith('/')) {
      const query = value.slice(1);
      setSlashFilter(query);
      setShowSlashMenu(true);
      setSlashIdx(0);
    } else {
      setShowSlashMenu(false);
    }
  }, []);

  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Slash menu navigation
    if (showSlashMenu) {
      switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSlashIdx(prev => (prev + 1) % filteredSlashCommands.length);
        return;
      case 'ArrowUp':
        e.preventDefault();
        setSlashIdx(prev => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
        return;
      case 'Enter':
        e.preventDefault();
        if (filteredSlashCommands[slashIdx]) {
          const cmd = filteredSlashCommands[slashIdx];
          setInputMessage(cmd.cmd + ' ');
          setShowSlashMenu(false);
          inputRef.current?.focus();
        }
        return;
      case 'Escape':
        setShowSlashMenu(false);
        return;
      }
    }

    // Search navigation
    if (showSearch) {
      switch (e.key) {
      case 'Enter':
        e.preventDefault();
        navigateSearch(e.shiftKey ? 'prev' : 'next');
        return;
      case 'Escape':
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        return;
      }
    }

    // Global shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
      case 'f':
        if (e.shiftKey) {
          e.preventDefault();
          setShowSearch(true);
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }
        return;
      case 'k':
        e.preventDefault();
        setShowSlashMenu(true);
        setInputMessage('/');
        setSlashFilter('');
        setSlashIdx(0);
        return;
      }
    }

    // Send message
    if (e.key === 'Enter' && !e.shiftKey && !showSlashMenu) {
      e.preventDefault();
      handleSend();
    }
  }, [showSlashMenu, showSearch, filteredSlashCommands, slashIdx, handleSend, navigateSearch]);

  // Reset session
  const handleResetSession = useCallback(async () => {
    if (!selectedAgentId || !selectedSessionId) return;
    try {
      await api.resetSession(selectedAgentId);
      setMessages([]);
    } catch (e) {
      console.error('Failed to reset session:', e);
    }
  }, [selectedAgentId, selectedSessionId]);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 border-r border-[var(--border-subtle)] bg-[var(--void)]/20 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-3">
            <Terminal className="w-4 h-4" />
            <span className="text-sm font-mono">
              {viewMode === 'agents' ? 'AGENTS' : 'SESSIONS'}
            </span>
          </div>

          {/* View Toggle */}
          {selectedAgentId && (
            <div className="flex gap-1 bg-[var(--surface-secondary)] rounded-lg p-1">
              <button
                onClick={() => setViewMode('agents')}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors',
                  viewMode === 'agents'
                    ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                )}
              >
                Agents
              </button>
              <button
                onClick={() => setViewMode('sessions')}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors',
                  viewMode === 'sessions'
                    ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                )}
              >
                Sessions
              </button>
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <AnimatePresence mode="wait">
            {viewMode === 'agents' ? (
              <motion.div
                key="agents"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    isSelected={agent.id === selectedAgentId}
                    onClick={() => handleSelectAgent(agent.id)}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="sessions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {/* New Session Button */}
                <motion.button
                  onClick={() => selectedAgentId && createSessionMutation.mutate(selectedAgentId)}
                  disabled={createSessionMutation.isPending}
                  className="w-full p-3 rounded-lg border border-dashed border-[var(--border-default)] hover:border-[var(--neon-cyan)]/30 hover:bg-[var(--neon-cyan)]/5 text-[var(--text-muted)] hover:text-[var(--neon-cyan)] transition-all flex items-center gap-2"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {createSessionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span className="text-sm">New Session</span>
                </motion.button>

                {/* Session List */}
                {sessions
                  .filter((s): s is Session => !!s && !!s.session_id)
                  .map((session) => (
                    <SessionCard
                      key={session.session_id}
                      session={session}
                      isSelected={session.session_id === selectedSessionId}
                      onClick={async () => {
                        if (!selectedAgentId || session.session_id === selectedSessionId) return;
                        // Switch session on backend first
                        await api.switchSession(selectedAgentId, session.session_id);
                        setSelectedSessionId(session.session_id);
                        // Clear messages (will reload via useEffect)
                        setMessages([]);
                      }}
                      onDelete={(e) => {
                        e.stopPropagation();
                        deleteSessionMutation.mutate(session.session_id);
                      }}
                    />
                  ))}

                {sessions.length === 0 && (
                  <div className="text-center py-8 text-[var(--text-muted)]">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No sessions yet</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)]">
          {viewMode === 'sessions' && selectedAgent ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('agents')}
                className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <ChevronLeft className="w-3 h-3" />
                Back to Agents
              </button>
              <span className="text-[var(--text-muted)]">|</span>
              <span className="text-xs text-[var(--text-muted)] font-mono">
                {sessions.length} session{sessions.length !== 1 ? 's' : ''}
              </span>
            </div>
          ) : (
            <div className="text-xs font-mono text-[var(--text-muted)]">
              {agents.length} AGENT{agents.length !== 1 ? 'S' : ''} ONLINE
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div
        className="flex-1 flex flex-col bg-[var(--void)]/10 relative"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {dragOver && (
          <div className="absolute inset-0 bg-[var(--neon-cyan)]/10 border-2 border-dashed border-[var(--neon-cyan)] z-50 flex items-center justify-center">
            <div className="text-center">
              <Paperclip className="w-12 h-12 text-[var(--neon-cyan)] mx-auto mb-2" />
              <p className="text-[var(--neon-cyan)] font-medium">Drop files to attach</p>
            </div>
          </div>
        )}

        {/* Search Modal */}
        {showSearch && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-md">
            <div className="bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-xl shadow-lg p-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[var(--text-muted)]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] text-sm"
                />
                {searchResults.length > 0 && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {searchCurrentIdx + 1} / {searchResults.length}
                  </span>
                )}
                <button
                  onClick={() => navigateSearch('prev')}
                  disabled={searchResults.length === 0}
                  className="p-1 rounded hover:bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                >
                  <ChevronDown className="w-4 h-4 rotate-180" />
                </button>
                <button
                  onClick={() => navigateSearch('next')}
                  disabled={searchResults.length === 0}
                  className="p-1 rounded hover:bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}
                  className="p-1 rounded hover:bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedAgent && selectedSession ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--neon-cyan)]/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[var(--neon-cyan)]" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--text-primary)]">{selectedAgent.name}</h2>
                  <p className="text-xs text-[var(--text-muted)] font-mono">
                    {selectedSession.title || 'Untitled'} • {currentModelDisplay}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Model Selector */}
                <Select
                  value={currentModelId}
                  onValueChange={handleModelChange}
                  disabled={changeModelMutation.isPending}
                >
                  <SelectTrigger className="w-[200px] h-9 bg-[var(--surface-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] text-xs font-mono">
                    <SelectValue>
                      {currentModelDisplay || 'Select model'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--surface-primary)] border-[var(--border-default)] max-h-[280px]">
                    <ScrollArea className="h-full max-h-[260px]">
                      {models.map((model) => (
                        <SelectItem
                          key={model.id}
                          value={model.id}
                          className="text-xs font-mono text-[var(--text-secondary)] focus:bg-[var(--neon-cyan)]/10 focus:text-[var(--neon-cyan)]"
                          disabled={!model.available}
                        >
                          <div className="flex items-center gap-2">
                            <span>{model.display_name || model.id}</span>
                            {!model.available && (
                              <span className="text-[10px] text-[var(--text-muted)]">(unavailable)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>

                <motion.button
                  onClick={handleResetSession}
                  className="p-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)]"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Reset Session"
                >
                  <RefreshCw className="w-4 h-4" />
                </motion.button>
                <motion.button
                  className="p-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)]"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Settings className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Slash Command Menu */}
              {showSlashMenu && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 w-full max-w-sm">
                  <div className="bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-xl shadow-lg overflow-hidden">
                    <div className="px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
                      <span className="text-xs text-[var(--text-muted)]">Commands</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredSlashCommands.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-[var(--text-muted)] text-center">
                          No commands found
                        </div>
                      ) : (
                        filteredSlashCommands.map((cmd, idx) => (
                          <button
                            key={cmd.cmd}
                            onClick={() => {
                              setInputMessage(cmd.cmd + ' ');
                              setShowSlashMenu(false);
                              inputRef.current?.focus();
                            }}
                            className={cn(
                              'w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-[var(--surface-secondary)] transition-colors',
                              idx === slashIdx && 'bg-[var(--neon-cyan)]/10'
                            )}
                          >
                            <Command className="w-4 h-4 text-[var(--neon-cyan)]" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-[var(--text-primary)]">{cmd.cmd}</div>
                              <div className="text-xs text-[var(--text-muted)]">{cmd.desc}</div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--neon-cyan)]/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-[var(--neon-cyan)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                    Start a conversation
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] max-w-sm">
                    Send a message to begin chatting with {selectedAgent.name}
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const searchResultIdx = searchResults.indexOf(idx);
                    return (
                      <TerminalMessage
                        key={msg.id}
                        id={`msg-${idx}`}
                        message={msg}
                        index={idx}
                        isSearchResult={searchResultIdx !== -1}
                        isCurrentSearch={searchResultIdx === searchCurrentIdx}
                        searchQuery={searchQuery}
                      />
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[var(--border-subtle)]">
              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-xs"
                    >
                      <Paperclip className="w-3 h-3 text-[var(--neon-cyan)]" />
                      <span className="text-[var(--text-secondary)] truncate max-w-[120px]">
                        {att.filename}
                      </span>
                      <button
                        onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                        className="p-0.5 rounded hover:bg-[var(--neon-magenta)]/20 text-[var(--text-muted)] hover:text-[var(--neon-magenta)]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <SpotlightCard glowColor="rgba(0, 240, 255, 0.1)">
                <div className="flex items-center gap-3 p-3">
                  {/* File Upload */}
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileSelect}
                    multiple
                  />
                  <label
                    htmlFor="file-upload"
                    className="p-2 rounded-lg cursor-pointer text-[var(--text-muted)] hover:text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10 transition-colors"
                    title="Attach files"
                  >
                    <Paperclip className="w-4 h-4" />
                  </label>

                  {/* Voice Recording */}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      isRecording
                        ? 'bg-[var(--neon-magenta)]/20 text-[var(--neon-magenta)] animate-pulse'
                        : 'text-[var(--text-muted)] hover:text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10'
                    )}
                    title={isRecording ? 'Stop recording' : 'Record voice'}
                  >
                    {isRecording ? (
                      <span className="flex items-center gap-1">
                        <Mic className="w-4 h-4" />
                        <span className="text-xs font-mono">{recordingTime}s</span>
                      </span>
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message... (Enter to send, / for commands)"
                    className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-primary)]/30 font-mono text-sm"
                    disabled={isStreaming || isRecording}
                  />

                  {/* Thinking Mode Toggle */}
                  <button
                    onClick={() => {
                      const modes: ThinkingMode[] = ['off', 'on', 'stream'];
                      const nextIdx = (modes.indexOf(thinkingMode) + 1) % modes.length;
                      setThinkingMode(modes[nextIdx]);
                    }}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      thinkingMode !== 'off'
                        ? 'bg-[var(--neon-magenta)]/20 text-[var(--neon-magenta)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/10'
                    )}
                    title={`Thinking mode: ${thinkingMode}`}
                  >
                    <Brain className="w-4 h-4" />
                  </button>

                  <motion.button
                    onClick={handleSend}
                    disabled={!inputMessage.trim() || isStreaming || isRecording}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      inputMessage.trim() && !isStreaming && !isRecording
                        ? 'bg-[var(--neon-cyan)] text-[var(--void)]'
                        : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isStreaming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </motion.button>
                </div>
              </SpotlightCard>
              <div className="flex justify-between mt-2 text-[10px] font-mono text-[var(--text-muted)] px-2">
                <span className="flex items-center gap-2">
                  <span>Press Enter to send</span>
                  {thinkingMode !== 'off' && (
                    <span className="text-[var(--neon-magenta)]">
                      Thinking: {thinkingMode}
                    </span>
                  )}
                  {attachments.length > 0 && (
                    <span className="text-[var(--neon-cyan)]">
                      {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <span>Session: {(selectedSessionId || 'none').slice(0, 8)}...</span>
                  <span className="text-[var(--text-muted)]/50">|</span>
                  <button
                    onClick={() => { setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 100); }}
                    className="hover:text-[var(--neon-cyan)] flex items-center gap-1"
                  >
                    <Search className="w-3 h-3" />
                    Ctrl+Shift+F
                  </button>
                </span>
              </div>
            </div>
          </>
        ) : selectedAgent ? (
          /* No Session Selected */
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <motion.div
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--neon-cyan)]/20 to-[var(--neon-cyan)]/5 flex items-center justify-center mb-6 border border-[var(--neon-cyan)]/20"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <MessageSquare className="w-12 h-12 text-[var(--neon-cyan)]" />
            </motion.div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Select or Create a Session
            </h2>
            <p className="text-[var(--text-muted)] max-w-sm mb-6">
              Choose an existing session or create a new one to start chatting
            </p>
            <motion.button
              onClick={() => selectedAgentId && createSessionMutation.mutate(selectedAgentId)}
              className="px-6 py-3 rounded-xl bg-[var(--neon-cyan)] text-[var(--void)] font-medium flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-5 h-5" />
              New Session
            </motion.button>
          </div>
        ) : (
          /* No Agent Selected */
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <motion.div
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--neon-cyan)]/20 to-[var(--neon-cyan)]/5 flex items-center justify-center mb-6 border border-[var(--neon-cyan)]/20"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Bot className="w-12 h-12 text-[var(--neon-cyan)]" />
            </motion.div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Select an Agent
            </h2>
            <p className="text-[var(--text-muted)] max-w-sm mb-6">
              Choose an agent from the sidebar to start a conversation
            </p>
            <div className="flex gap-3">
              {agents.slice(0, 3).map((agent) => (
                <motion.button
                  key={agent.id}
                  onClick={() => handleSelectAgent(agent.id)}
                  className="px-4 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] hover:text-[var(--text-primary)]"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {agent.name}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
