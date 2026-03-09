import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { api, wsManager } from '@/api/client';
import type { Agent, Session, Message, ToolCall } from '@/api/types';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/toast';
import {
  Send, Plus, Loader2, Bot, User, ChevronLeft, MessageSquare,
  Search, X, Copy, Check, Mic, Paperclip, StopCircle, Settings,
  ChevronDown, ChevronUp, Maximize, Minimize, ArrowDown, Pencil, Save, Trash2,
  ImageIcon, Terminal, Globe, FileText, Brain, Clock, Container, Image, Wrench
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// Tool icon helper function
const getToolIcon = (toolName: string) => {
  if (toolName.startsWith('file_') || toolName.startsWith('directory_')) return <FileText className="h-4 w-4" style={{ color: '#60A5FA' }} />;
  if (toolName.startsWith('web_') || toolName.startsWith('link_')) return <Globe className="h-4 w-4" style={{ color: '#34D399' }} />;
  if (toolName.startsWith('shell') || toolName.startsWith('exec_')) return <Terminal className="h-4 w-4" style={{ color: '#FBBF24' }} />;
  if (toolName.startsWith('agent_')) return <Bot className="h-4 w-4" style={{ color: '#A78BFA' }} />;
  if (toolName.startsWith('memory_') || toolName.startsWith('knowledge_')) return <Brain className="h-4 w-4" style={{ color: '#F472B6' }} />;
  if (toolName.startsWith('cron_') || toolName.startsWith('schedule_')) return <Clock className="h-4 w-4" style={{ color: '#FB923C' }} />;
  if (toolName.startsWith('browser_') || toolName.startsWith('playwright_')) return <Globe className="h-4 w-4" style={{ color: '#2DD4BF' }} />;
  if (toolName.startsWith('container_') || toolName.startsWith('docker_')) return <Container className="h-4 w-4" style={{ color: '#38BDF8' }} />;
  if (toolName.startsWith('image_') || toolName.startsWith('tts_')) return <Image className="h-4 w-4" style={{ color: '#E879F9' }} />;
  if (toolName.startsWith('hand_')) return <Wrench className="h-4 w-4" />;
  return <Wrench className="h-4 w-4" />;
};

// Tool border color helper
const getToolBorderColor = (toolName: string): string => {
  if (toolName.startsWith('file_') || toolName.startsWith('directory_')) return '#60A5FA';
  if (toolName.startsWith('web_') || toolName.startsWith('link_')) return '#34D399';
  if (toolName.startsWith('shell') || toolName.startsWith('exec_')) return '#FBBF24';
  if (toolName.startsWith('agent_')) return '#A78BFA';
  if (toolName.startsWith('memory_') || toolName.startsWith('knowledge_')) return '#F472B6';
  if (toolName.startsWith('cron_') || toolName.startsWith('schedule_')) return '#FB923C';
  if (toolName.startsWith('browser_') || toolName.startsWith('playwright_')) return '#2DD4BF';
  if (toolName.startsWith('container_') || toolName.startsWith('docker_')) return '#38BDF8';
  if (toolName.startsWith('image_') || toolName.startsWith('tts_')) return '#E879F9';
  return 'hsl(var(--primary))';
};

// Image URL regex for auto-detecting images in messages
const imageUrlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg))/gi;

// Slash commands definition
const SLASH_COMMANDS = [
  { cmd: '/help', desc: 'Show available commands' },
  { cmd: '/agents', desc: 'Switch to Agents page' },
  { cmd: '/new', desc: 'Reset session (clear history)' },
  { cmd: '/compact', desc: 'Trigger LLM session compaction' },
  { cmd: '/model', desc: 'Show or switch model (/model [name])' },
  { cmd: '/stop', desc: 'Cancel current agent run' },
  { cmd: '/usage', desc: 'Show session token usage & cost' },
  { cmd: '/think', desc: 'Toggle extended thinking (/think [on|off|stream])' },
  { cmd: '/context', desc: 'Show context window usage & pressure' },
  { cmd: '/verbose', desc: 'Cycle tool detail level (/verbose [off|on|full])' },
  { cmd: '/queue', desc: 'Check if agent is processing' },
  { cmd: '/status', desc: 'Show system status' },
  { cmd: '/clear', desc: 'Clear chat display' },
  { cmd: '/exit', desc: 'Disconnect from agent' },
  { cmd: '/budget', desc: 'Show spending limits and current costs' },
  { cmd: '/peers', desc: 'Show OFP peer network status' },
  { cmd: '/a2a', desc: 'List discovered external A2A agents' },
];

// Tips for the tip bar
const TIPS = [
  'Type / for commands',
  '/think on for reasoning',
  'Ctrl+Shift+F for focus mode',
  'Drag files to attach',
  '/model to switch models',
  '/context to check usage',
  '/verbose off to hide tool details',
];

interface ExtendedMessage extends Message {
  isStreaming?: boolean;
  _copied?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  iterations?: number;
  ts?: number;
  edited?: boolean;
}

interface Attachment {
  file: File;
  preview?: string;
  uploading?: boolean;
}

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

interface MessageResponse {
  response: string;
  input_tokens: number;
  output_tokens: number;
  iterations: number;
  cost_usd?: number;
}

export function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const agentIdFromUrl = searchParams.get('agent');

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agentIdFromUrl);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingMode, setThinkingMode] = useState<'off' | 'on' | 'stream'>('off');
  const [contextPressure, setContextPressure] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [messageQueue, setMessageQueue] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashIdx, setSlashIdx] = useState(0);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelPickerList, setModelPickerList] = useState<ModelInfo[]>([]);
  const [modelPickerFilter, setModelPickerFilter] = useState('');
  const [modelPickerIdx, setModelPickerIdx] = useState(0);
  const [showModelSwitcher, setShowModelSwitcher] = useState(false);
  const [modelSwitcherFilter, setModelSwitcherFilter] = useState('');
  const [modelSwitcherProviderFilter, setModelSwitcherProviderFilter] = useState('');
  const [modelSwitching, setModelSwitching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [dismissedTips, setDismissedTips] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('of-tips-off') === 'true';
    }
    return false;
  });
  const [verboseMode, setVerboseMode] = useState<'off' | 'on' | 'full'>('on');
  // Message editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  // Token count - calculated from input message length
  const tokenCount = useMemo(() => Math.round(inputMessage.length / 4), [inputMessage]);
  // Typing indicator state (used in full Alpine alignment)
  const [typingState, setTypingState] = useState<'idle' | 'start' | 'tool' | 'stop'>('idle');
  const [typingTool, setTypingTool] = useState<string>('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Phase progress state (used in full Alpine alignment)
  const [phaseInfo, setPhaseInfo] = useState<{ phase?: string; detail?: string } | null>(null);
  // WebSocket connection state
  const [wsConnectionState, setWsConnectionState] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('disconnected');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toasts, removeToast, success, warn, error } = useToast();

  // Smart scroll state
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
  const [pendingScrollToBottom, setPendingScrollToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageCountRef = useRef(0);

  // Fetch agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => api.listAgents(),
    retry: 1,
    staleTime: 10000,
    refetchOnWindowFocus: false,
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
    retry: 1,
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });

  // Fetch models
  const { data: modelsData } = useQuery<{ models: ModelInfo[] }>({
    queryKey: ['models'],
    queryFn: () => api.listModels(),
    retry: 1,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const models = modelsData?.models || [];

  // Get selected agent
  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  // Load agent sessions when agent changes (like Alpine)
  useEffect(() => {
    if (!selectedAgentId) return;

    // Load session and sessions list
    api.getAgentSession(selectedAgentId).then(data => {
      if (data.messages && data.messages.length > 0) {
        const loadedMessages: ExtendedMessage[] = data.messages.map((m: unknown, idx: number) => {
          const msg = m as { role?: string; content?: unknown; tools?: unknown[] };
          const role = msg.role === 'User' ? 'user' : (msg.role === 'System' ? 'system' : 'assistant');
          const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          return {
            id: `hist-${idx}`,
            role,
            content,
            text: content,
            timestamp: new Date().toISOString(),
          };
        });
        setMessages(loadedMessages);
      }
    }).catch(() => {});

    // Refresh sessions list
    queryClient.invalidateQueries({ queryKey: ['sessions', selectedAgentId] });
  }, [selectedAgentId]);

  // WebSocket connection
  useEffect(() => {
    if (!selectedAgentId) return;

    let isActive = true;
    console.log('[Chat] Connecting WebSocket for agent:', selectedAgentId);
    wsManager.connect(
      selectedAgentId,
      (data) => {
        if (isActive) handleWebSocketMessage(data);
      },
      {
        onStateChange: (state) => {
          console.log('[Chat] Connection state changed:', state);
          if (!isActive) return;
          setWsConnectionState(state);
          if (state === 'connected') {
            success('WebSocket connected');
          } else if (state === 'reconnecting') {
            warn('Connection lost, reconnecting...');
          } else if (state === 'disconnected') {
            error('Connection lost — switched to HTTP mode', 0);
          }
        },
        onError: (error) => {
          if (isActive) console.error('WebSocket error:', error);
        }
      }
    );

    return () => {
      isActive = false;
      wsManager.disconnect();
    };
  }, [selectedAgentId, success, warn, error]);

  // Ref for sendMessageContent to avoid circular dependency
  const sendMessageContentRef = useRef<((content: string) => Promise<void>) | undefined>(undefined);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data: unknown) => {
    const msg = data as {
      type: string;
      chunk?: string;
      text?: string;
      message?: string;
      content?: string;
      tool?: string;
      tools?: ToolCall[];
      thinking?: boolean;
      done?: boolean;
      error?: string;
      context_pressure?: 'low' | 'medium' | 'high' | 'critical';
      // typing message
      state?: 'start' | 'tool' | 'stop';
      // phase message
      phase?: string;
      detail?: string;
      // tool_start/tool_end/tool_result
      input?: string;
      result?: string;
      is_error?: boolean;
      // response
      input_tokens?: number;
      output_tokens?: number;
      cost_usd?: number;
      iterations?: number;
      // agents_updated
      agents?: Agent[];
      // canvas
      title?: string;
      canvas_id?: string;
      html?: string;
    };

    // Debug logging for WebSocket messages
    console.log('[WebSocket] Received:', msg.type, msg);

    // Handle streaming text deltas from backend (text_delta with content field)
    if (msg.type === 'text_delta' && msg.content) {
      console.log('[WebSocket] text_delta:', msg.content);
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        console.log('[WebSocket] lastMsg:', lastMsg?.role, lastMsg?.isStreaming, lastMsg?.thinking);
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
          const updated = [...prev];
          const newContent = (lastMsg.content || '') + msg.content;
          const newText = (lastMsg.text || '') + msg.content;

          // Detect function-call patterns streamed as text and convert to tool cards (like Alpine)
          let tools = lastMsg.tools || [];
          let content = newContent;
          let text = newText;
          const fcIdx = newText.search(/\w+<\/function[=,>]/);
          const fcIdx2 = newText.search(/<function=\w+>/);
          const foundIdx = fcIdx !== -1 ? fcIdx : fcIdx2;

          if (foundIdx !== -1 && !(lastMsg as unknown as Record<string, boolean>)._toolTextDetected) {
            const fcPart = newText.substring(foundIdx);
            const toolMatch = fcPart.match(/^(\w+)<\/function/) || fcPart.match(/^<function=(\w+)>/);
            if (toolMatch) {
              content = newText.substring(0, foundIdx).trim();
              text = content;
              const inputMatch = fcPart.match(/[=,>]\s*(\{[\s\S]*)/);
              const newTool: ToolCall = {
                id: `${toolMatch[1]}-txt-${Date.now()}`,
                name: toolMatch[1],
                running: true,
                expanded: false,
                input: inputMatch ? inputMatch[1].replace(/<\/function>?\s*$/, '').trim() : '',
                result: '',
                is_error: false,
              };
              tools = [...tools, newTool];
              (updated[updated.length - 1] as unknown as Record<string, boolean>)._toolTextDetected = true;
            }
          }

          updated[updated.length - 1] = {
            ...lastMsg,
            content,
            text,
            tools,
          };
          return updated;
        }
        return prev;
      });
    } else if (msg.type === 'chunk' && msg.chunk) {
      // Legacy chunk format (for backward compatibility)
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...lastMsg,
            content: (lastMsg.content || '') + msg.chunk,
            text: (lastMsg.text || '') + msg.chunk,
          };
          return updated;
        }
        return prev;
      });
    } else if (msg.type === 'thinking' && msg.text) {
      // Handle thinking mode messages
      if (thinkingMode !== 'off') {
        setMessages(prev => [...prev, {
          id: `thinking-${Date.now()}`,
          role: 'system',
          content: msg.text,
          text: msg.text,
          thinking: true,
          timestamp: new Date().toISOString(),
        }]);
      }
    } else if (msg.type === 'tool' && msg.tool) {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && msg.tool) {
          const updated = [...prev];
          const tools: ToolCall[] = [...(lastMsg.tools || []), (msg.tool as unknown) as ToolCall];
          updated[updated.length - 1] = { ...lastMsg, tools };
          return updated;
        }
        return prev;
      });
    } else if (msg.type === 'context_pressure') {
      if (msg.context_pressure) {
        setContextPressure(msg.context_pressure);
      }
    } else if (msg.type === 'response') {
      // Backend sends final response with content and metadata
      setIsStreaming(false);
      // Update context pressure from response (like Alpine does)
      if (msg.context_pressure) {
        setContextPressure(msg.context_pressure);
      }
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        const responseContent = msg.content || msg.text || '';
        if (lastMsg && lastMsg.isStreaming) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...lastMsg,
            content: responseContent,
            text: responseContent,
            isStreaming: false,
            streaming: false,
            inputTokens: msg.input_tokens,
            outputTokens: msg.output_tokens,
            cost: msg.cost_usd,
            iterations: msg.iterations,
          };
          return updated;
        }
        // If no streaming message exists, add as new message
        return [...prev, {
          id: `response-${Date.now()}`,
          role: 'assistant',
          content: responseContent,
          text: responseContent,
          timestamp: new Date().toISOString(),
          inputTokens: msg.input_tokens,
          outputTokens: msg.output_tokens,
          cost: msg.cost_usd,
          iterations: msg.iterations,
        }];
      });
      // Process queued messages
      if (messageQueue.length > 0) {
        const nextMessage = messageQueue[0];
        setMessageQueue(prev => prev.slice(1));
        sendMessageContentRef.current?.(nextMessage);
      }
    } else if (msg.type === 'done') {
      setIsStreaming(false);
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.isStreaming) {
          const updated = [...prev];
          updated[updated.length - 1] = { ...lastMsg, isStreaming: false, streaming: false };
          return updated;
        }
        return prev;
      });
      // Process queued messages
      if (messageQueue.length > 0) {
        const nextMessage = messageQueue[0];
        setMessageQueue(prev => prev.slice(1));
        sendMessageContentRef.current?.(nextMessage);
      }
    } else if (msg.type === 'error') {
      setIsStreaming(false);
      setMessages(prev => {
        // Remove thinking/streaming messages like Alpine does
        const filtered = prev.filter(m => !m.thinking && !m.streaming);
        return [...filtered, {
          id: `error-${Date.now()}`,
          role: 'system',
          content: msg.content || msg.error || 'An error occurred',
          text: msg.content || msg.error || 'An error occurred',
          timestamp: new Date().toISOString(),
        }];
      });
    } else if (msg.type === 'typing') {
      // Handle typing lifecycle: start/tool/stop
      console.log('[WebSocket] typing:', msg.state);
      if (msg.state === 'start') {
        setTypingState('start');
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (!lastMsg || !lastMsg.thinking) {
            return [...prev, {
              id: `typing-${Date.now()}`,
              role: 'assistant',
              content: 'Processing...',
              text: 'Processing...',
              thinking: true,
              streaming: true,
              isStreaming: true,
              timestamp: new Date().toISOString(),
            }];
          }
          return prev;
        });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingState('idle'), 30000);
      } else if (msg.state === 'tool') {
        setTypingState('tool');
        setTypingTool(msg.tool || 'tool');
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && (lastMsg.thinking || lastMsg.isStreaming)) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMsg,
              content: `Using ${msg.tool || 'tool'}...`,
              text: `Using ${msg.tool || 'tool'}...`,
            };
            return updated;
          }
          return prev;
        });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingState('idle'), 30000);
      } else if (msg.state === 'stop') {
        setTypingState('stop');
        // Remove thinking/streaming messages like Alpine does
        setMessages(prev => prev.filter(m => !m.thinking && !m.streaming));
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    } else if (msg.type === 'phase') {
      setPhaseInfo({ phase: msg.phase, detail: msg.detail });
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && (lastMsg.thinking || lastMsg.isStreaming)) {
          const detail = msg.detail || msg.phase || 'Working...';
          const updated = [...prev];
          if (msg.phase === 'context_warning') {
            return [...prev, {
              id: `phase-${Date.now()}`,
              role: 'system',
              content: detail,
              text: detail,
              timestamp: new Date().toISOString(),
            }];
          }
          updated[updated.length - 1] = {
            ...lastMsg,
            content: detail,
            text: detail,
          };
          return updated;
        }
        return prev;
      });
    } else if (msg.type === 'tool_start') {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.isStreaming) {
          const updated = [...prev];
          const newTool: ToolCall = {
            id: `${msg.tool}-${Date.now()}`,
            name: msg.tool || 'unknown',
            running: true,
            expanded: false,
            input: '',
            result: '',
            is_error: false,
          };
          updated[updated.length - 1] = {
            ...lastMsg,
            tools: [...(lastMsg.tools || []), newTool],
          };
          return updated;
        }
        return prev;
      });
    } else if (msg.type === 'tool_end') {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.tools) {
          const updated = [...prev];
          const tools = [...lastMsg.tools];
          for (let i = tools.length - 1; i >= 0; i--) {
            if (tools[i].name === msg.tool && tools[i].running) {
              tools[i] = { ...tools[i], input: msg.input || '' };
              break;
            }
          }
          updated[updated.length - 1] = { ...lastMsg, tools };
          return updated;
        }
        return prev;
      });
    } else if (msg.type === 'tool_result') {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.tools) {
          const updated = [...prev];
          const tools = [...lastMsg.tools];
          for (let i = tools.length - 1; i >= 0; i--) {
            if (tools[i].name === msg.tool && tools[i].running) {
              const toolUpdate: ToolCall = {
                ...tools[i],
                running: false,
                result: msg.result || '',
                is_error: !!msg.is_error,
              };
              if ((msg.tool === 'image_generate' || msg.tool === 'browser_screenshot') && !msg.is_error && msg.result) {
                try {
                  const parsed = JSON.parse(msg.result);
                  if (parsed.image_urls && parsed.image_urls.length) {
                    toolUpdate._imageUrls = parsed.image_urls;
                  }
                } catch { }
              }
              if (msg.tool === 'text_to_speech' && !msg.is_error && msg.result) {
                try {
                  const ttsResult = JSON.parse(msg.result);
                  if (ttsResult.saved_to) {
                    toolUpdate._audioFile = ttsResult.saved_to;
                    toolUpdate._audioDuration = ttsResult.duration_estimate_ms;
                  }
                } catch { }
              }
              tools[i] = toolUpdate;
              break;
            }
          }
          updated[updated.length - 1] = { ...lastMsg, tools };
          return updated;
        }
        return prev;
      });
    } else if (msg.type === 'silent_complete') {
      setIsStreaming(false);
      setTypingState('idle');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setMessages(prev => prev.filter(m => !m.thinking && !m.streaming));
    } else if (msg.type === 'agents_updated') {
      if (msg.agents) {
        queryClient.setQueryData(['agents'], msg.agents);
      }
    } else if (msg.type === 'command_result') {
      if (msg.context_pressure) {
        setContextPressure(msg.context_pressure);
      }
      setMessages(prev => [...prev, {
        id: `cmd-${Date.now()}`,
        role: 'system',
        content: msg.message || 'Command executed.',
        text: msg.message || 'Command executed.',
        timestamp: new Date().toISOString(),
      }]);
    } else if (msg.type === 'canvas') {
      const canvasHtml = `<div class="canvas-panel" style="border:1px solid var(--border);border-radius:8px;margin:8px 0;overflow:hidden;"><div style="padding:6px 12px;background:var(--surface);border-bottom:1px solid var(--border);font-size:0.85em;display:flex;justify-content:space-between;align-items:center;"><span>${msg.title || 'Canvas'}</span><span style="opacity:0.5;font-size:0.8em;">${(msg.canvas_id || '').substring(0, 8)}</span></div><iframe sandbox="allow-scripts" srcdoc="${(msg.html || '').replace(/"/g, '&quot;')}" style="width:100%;min-height:300px;border:none;background:#fff;" loading="lazy"></iframe></div>`;
      setMessages(prev => [...prev, {
        id: `canvas-${Date.now()}`,
        role: 'agent',
        content: canvasHtml,
        text: canvasHtml,
        isHtml: true,
        meta: 'canvas',
        timestamp: new Date().toISOString(),
      }]);
    } else if (msg.type === 'pong') {
      // Heartbeat response - no action needed
    }
  }, [thinkingMode, messageQueue]);

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: (agentId: string) => api.createSession(agentId, 'New Chat'),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', selectedAgentId] });
      setSelectedSessionId(session.session_id);
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ agentId, message }: { agentId: string; message: string }) => {
      return api.sendMessage(agentId, message) as Promise<MessageResponse>;
    },
    onSuccess: (data) => {
      refetchSessions();
      // Handle HTTP response (non-streaming fallback)
      setIsStreaming(false);
      setMessages(prev => {
        // Remove streaming/thinking placeholder messages
        const filtered = prev.filter(m => !m.isStreaming && !m.thinking);
        const meta = `${data.input_tokens} in / ${data.output_tokens} out` +
          (data.cost_usd != null ? ` | $${data.cost_usd.toFixed(4)}` : '') +
          (data.iterations ? ` | ${data.iterations} iter` : '');
        return [...filtered, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          text: data.response,
          meta,
          inputTokens: data.input_tokens,
          outputTokens: data.output_tokens,
          cost: data.cost_usd,
          iterations: data.iterations,
          timestamp: new Date().toISOString(),
        }];
      });
    },
    onError: (err) => {
      setIsStreaming(false);
      // Remove streaming message and show error
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isStreaming);
        return [...filtered, {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `Error: ${(err as Error).message}`,
          text: `Error: ${(err as Error).message}`,
          timestamp: new Date().toISOString(),
        }];
      });
    },
  });


  // Handle scroll events to detect user scrolling
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    const isAtTop = scrollTop < 100;

    // Show/hide scroll to top button
    setShowScrollToTop(!isAtTop && scrollTop > 200);

    if (isAtBottom) {
      setIsUserScrolling(false);
      setShowNewMessageIndicator(false);
      setUnreadCount(0);
    } else {
      setIsUserScrolling(true);
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
      userScrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 2000);
    }
  }, []);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsUserScrolling(false);
    setShowNewMessageIndicator(false);
    setUnreadCount(0);
  }, []);

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Check if scroll is near bottom
  const isNearBottom = useCallback(() => {
    if (!scrollRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  // Handle agent selection from URL
  useEffect(() => {
    if (agentIdFromUrl && agents.length > 0) {
      const agent = agents.find(a => a.id === agentIdFromUrl);
      if (agent) {
        setSelectedAgentId(agent.id);
      }
    }
  }, [agentIdFromUrl, agents]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+/ for command palette
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        setInputMessage('/');
        setShowSlashMenu(true);
      }
      // Ctrl+M for model switcher
      if ((e.ctrlKey || e.metaKey) && e.key === 'm' && selectedAgent) {
        e.preventDefault();
        toggleModelSwitcher();
      }
      // Ctrl+F for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && selectedAgent) {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
      // Ctrl+Shift+F for focus mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setFocusMode(prev => !prev);
      }
      // Escape to close menus
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
        setShowModelPicker(false);
        setShowModelSwitcher(false);
        setShowSearch(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedAgent]);

  // Tip rotation
  useEffect(() => {
    if (dismissedTips) return;
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % TIPS.length);
    }, 30000);
    return () => clearInterval(interval);
  }, [dismissedTips]);

  // Watch input for slash commands and model picker
  useEffect(() => {
    const modelMatch = inputMessage.match(/^\/model\s+(.*)$/i);
    if (modelMatch) {
      setShowSlashMenu(false);
      setModelPickerFilter(modelMatch[1].toLowerCase());
      if (models.length > 0) {
        setModelPickerList(models.filter(m => m.available));
        setShowModelPicker(true);
        setModelPickerIdx(0);
      }
    } else if (inputMessage.startsWith('/')) {
      setShowModelPicker(false);
      setSlashFilter(inputMessage.slice(1).toLowerCase());
      setShowSlashMenu(true);
      setSlashIdx(0);
    } else {
      setShowSlashMenu(false);
      setShowModelPicker(false);
    }
  }, [inputMessage, models]);

  const filteredSlashCommands = useMemo(() => {
    if (!slashFilter) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(c =>
      c.cmd.toLowerCase().includes(slashFilter) ||
      c.desc.toLowerCase().includes(slashFilter)
    );
  }, [slashFilter]);

  const filteredModelPicker = useMemo(() => {
    if (!modelPickerFilter) return modelPickerList.slice(0, 15);
    return modelPickerList.filter(m =>
      m.id.toLowerCase().includes(modelPickerFilter) ||
      (m.display_name || '').toLowerCase().includes(modelPickerFilter) ||
      m.provider.toLowerCase().includes(modelPickerFilter)
    ).slice(0, 15);
  }, [modelPickerList, modelPickerFilter]);

  // Filter messages based on search query (search content and tool names)
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter(m => {
      // Search message content
      const contentMatch = (m.content || m.text || '').toLowerCase().includes(query);
      // Search tool names
      const toolMatch = m.tools?.some(t => t.name.toLowerCase().includes(query));
      return contentMatch || toolMatch;
    });
  }, [messages, searchQuery]);

  // 判断消息是否应该分组显示（同一角色且时间间隔小于5分钟）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isGrouped = useCallback((idx: number): boolean => {
    if (idx === 0) return false;
    const curr = filteredMessages[idx];
    const prev = filteredMessages[idx - 1];
    if (!curr || !prev) return false;
    // 系统消息不分组
    if (curr.role === 'system' || prev.role === 'system') return false;
    // 思考中的消息不分组
    if (curr.thinking || prev.thinking) return false;
    // 同一角色且时间间隔小于5分钟（300000毫秒）
    const timeDiff = (curr.ts || 0) - (prev.ts || 0);
    return curr.role === prev.role && timeDiff < 300000;
  }, [filteredMessages]);

  const switcherProviders = useMemo(() => {
    const seen = new Set<string>();
    models.forEach(m => seen.add(m.provider));
    return Array.from(seen).sort();
  }, [models]);

  const filteredSwitcherModels = useMemo(() => {
    return models.filter(m => {
      if (modelSwitcherProviderFilter && m.provider !== modelSwitcherProviderFilter) return false;
      if (modelSwitcherFilter) {
        const filter = modelSwitcherFilter.toLowerCase();
        return m.id.toLowerCase().includes(filter) ||
               (m.display_name || '').toLowerCase().includes(filter) ||
               m.provider.toLowerCase().includes(filter);
      }
      return true;
    });
  }, [models, modelSwitcherProviderFilter, modelSwitcherFilter]);

  const groupedSwitcherModels = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {};
    filteredSwitcherModels.forEach(m => {
      if (!groups[m.provider]) groups[m.provider] = [];
      groups[m.provider].push(m);
    });
    return Object.entries(groups).map(([provider, models]) => ({
      provider: provider.charAt(0).toUpperCase() + provider.slice(1),
      models,
    }));
  }, [filteredSwitcherModels]);

  const executeSlashCommand = useCallback(async (cmd: string, args?: string) => {
    setShowSlashMenu(false);
    setInputMessage('');

    switch (cmd) {
      case '/help':
        setMessages(prev => [...prev, {
          id: `system-${Date.now()}`,
          role: 'system',
          content: SLASH_COMMANDS.map(c => `\`${c.cmd}\` — ${c.desc}`).join('\n'),
          text: SLASH_COMMANDS.map(c => `${c.cmd} — ${c.desc}`).join('\n'),
          timestamp: new Date().toISOString(),
        }]);
        break;
      case '/agents':
        window.location.href = '/agents';
        break;
      case '/new':
        if (selectedAgentId) {
          try {
            await api.resetSession(selectedAgentId);
            setMessages([]);
          } catch (e) {
            console.error('Failed to reset session:', e);
          }
        }
        break;
      case '/compact':
        if (selectedAgentId) {
          try {
            const result = await api.compactSession(selectedAgentId);
            setMessages(prev => [...prev, {
              id: `system-${Date.now()}`,
              role: 'system',
              content: result.message || 'Compaction complete',
              text: result.message || 'Compaction complete',
              timestamp: new Date().toISOString(),
            }]);
          } catch (e) {
            console.error('Failed to compact:', e);
          }
        }
        break;
      case '/stop':
        if (selectedAgentId) {
          try {
            await api.stopAgentRun(selectedAgentId);
            setIsStreaming(false);
          } catch (e) {
            console.error('Failed to stop:', e);
          }
        }
        break;
      case '/usage':
        const approxTokens = messages.reduce((sum, m) => sum + Math.round((m.content || m.text || '').length / 4), 0);
        setMessages(prev => [...prev, {
          id: `system-${Date.now()}`,
          role: 'system',
          content: `**Session Usage**\n- Messages: ${messages.length}\n- Approx tokens: ~${approxTokens}`,
          text: `Session Usage\n- Messages: ${messages.length}\n- Approx tokens: ~${approxTokens}`,
          timestamp: new Date().toISOString(),
        }]);
        break;
      case '/think': {
        let newMode: 'off' | 'on' | 'stream';
        if (args === 'on') newMode = 'on';
        else if (args === 'off') newMode = 'off';
        else if (args === 'stream') newMode = 'stream';
        else {
          // Cycle through modes: off -> on -> stream -> off
          newMode = thinkingMode === 'off' ? 'on' : thinkingMode === 'on' ? 'stream' : 'off';
        }
        setThinkingMode(newMode);
        const modeLabel = newMode === 'stream' ? 'enabled (streaming reasoning)' : newMode === 'on' ? 'enabled' : 'disabled';
        setMessages(prev => [...prev, {
          id: `system-${Date.now()}`,
          role: 'system',
          content: `Extended thinking **${modeLabel}**. ` +
            (newMode === 'stream' ? 'Reasoning tokens will appear in a collapsible panel.' :
             newMode === 'on' ? 'The agent will show its reasoning when supported by the model.' :
             'Normal response mode.'),
          text: `Extended thinking ${modeLabel}. ` +
            (newMode === 'stream' ? 'Reasoning tokens will appear in a collapsible panel.' :
             newMode === 'on' ? 'The agent will show its reasoning when supported by the model.' :
             'Normal response mode.'),
          timestamp: new Date().toISOString(),
        }]);
        break;
      }
      case '/context':
        if (selectedAgentId && wsManager.isConnected()) {
          wsManager.send({ type: 'command', command: 'context', args: '' });
        }
        break;
      case '/verbose': {
        let newVerbose: 'off' | 'on' | 'full';
        if (args === 'off') newVerbose = 'off';
        else if (args === 'on') newVerbose = 'on';
        else if (args === 'full') newVerbose = 'full';
        else {
          newVerbose = verboseMode === 'off' ? 'on' : verboseMode === 'on' ? 'full' : 'off';
        }
        setVerboseMode(newVerbose);
        const verboseLabel = newVerbose === 'full' ? 'full (all tool details)' : newVerbose === 'on' ? 'on (compact tools)' : 'off (hidden)';
        setMessages(prev => [...prev, {
          id: `system-${Date.now()}`,
          role: 'system',
          content: `Tool detail level: **${verboseLabel}**`,
          text: `Tool detail level: ${verboseLabel}`,
          timestamp: new Date().toISOString(),
        }]);
        break;
      }
      case '/queue':
        if (selectedAgentId && wsManager.isConnected()) {
          wsManager.send({ type: 'command', command: 'queue', args: '' });
        } else {
          setMessages(prev => [...prev, {
            id: `system-${Date.now()}`,
            role: 'system',
            content: 'Not connected.',
            text: 'Not connected.',
            timestamp: new Date().toISOString(),
          }]);
        }
        break;
      case '/clear':
        setMessages([]);
        break;
      case '/exit':
        wsManager.disconnect();
        setSelectedAgentId(null);
        setMessages([]);
        setSearchParams({});
        break;
      case '/budget':
        try {
          const budget = await api.getBudget();
          const fmt = (v: number) => v > 0 ? `$${v.toFixed(2)}` : 'unlimited';
          setMessages(prev => [...prev, {
            id: `system-${Date.now()}`,
            role: 'system',
            content: `**Budget Status**\n- Hourly: $${budget.hourly_spend.toFixed(4)} / ${fmt(budget.hourly_limit)}\n- Daily: $${budget.daily_spend.toFixed(4)} / ${fmt(budget.daily_limit)}\n- Monthly: $${budget.monthly_spend.toFixed(4)} / ${fmt(budget.monthly_limit)}`,
            text: `Budget Status\n- Hourly: $${budget.hourly_spend.toFixed(4)} / ${fmt(budget.hourly_limit)}\n- Daily: $${budget.daily_spend.toFixed(4)} / ${fmt(budget.daily_limit)}\n- Monthly: $${budget.monthly_spend.toFixed(4)} / ${fmt(budget.monthly_limit)}`,
            timestamp: new Date().toISOString(),
          }]);
        } catch (e) {
          console.error('Failed to get budget:', e);
        }
        break;
      case '/peers':
        try {
          const status = await api.getNetworkStatus();
          setMessages(prev => [...prev, {
            id: `system-${Date.now()}`,
            role: 'system',
            content: `**OFP Network**\n- Status: ${status.enabled ? 'Enabled' : 'Disabled'}\n- Connected peers: ${status.connected_peers} / ${status.total_peers}`,
            text: `OFP Network\n- Status: ${status.enabled ? 'Enabled' : 'Disabled'}\n- Connected peers: ${status.connected_peers} / ${status.total_peers}`,
            timestamp: new Date().toISOString(),
          }]);
        } catch (e) {
          console.error('Failed to get network status:', e);
        }
        break;
      case '/a2a':
        try {
          const result = await api.listA2AAgents();
          const agents = result.agents || [];
          if (!agents.length) {
            setMessages(prev => [...prev, {
              id: `system-${Date.now()}`,
              role: 'system',
              content: 'No external A2A agents discovered.',
              text: 'No external A2A agents discovered.',
              timestamp: new Date().toISOString(),
            }]);
          } else {
            const lines = agents.map(a => `- **${a.name}** — ${a.url}`);
            setMessages(prev => [...prev, {
              id: `system-${Date.now()}`,
              role: 'system',
              content: `**A2A Agents (${agents.length})**\n${lines.join('\n')}`,
              text: `A2A Agents (${agents.length})\n${lines.join('\n')}`,
              timestamp: new Date().toISOString(),
            }]);
          }
        } catch (e) {
          console.error('Failed to get A2A agents:', e);
        }
        break;
      case '/status':
        try {
          const status = await api.status();
          setMessages(prev => [...prev, {
            id: `system-${Date.now()}`,
            role: 'system',
            content: `**System Status**\n- Agents: ${(status as { agent_count?: number }).agent_count || 0}\n- Uptime: ${(status as { uptime_seconds?: number }).uptime_seconds || 0}s\n- Version: ${(status as { version?: string }).version || '?'}`,
            text: `System Status\n- Agents: ${(status as { agent_count?: number }).agent_count || 0}\n- Uptime: ${(status as { uptime_seconds?: number }).uptime_seconds || 0}s\n- Version: ${(status as { version?: string }).version || '?'}`,
            timestamp: new Date().toISOString(),
          }]);
        } catch (e) {
          console.error('Failed to get status:', e);
        }
        break;
      case '/model':
        if (selectedAgent) {
          if (args) {
            try {
              await api.changeAgentModel(selectedAgent.id, args);
              setMessages(prev => [...prev, {
                id: `system-${Date.now()}`,
                role: 'system',
                content: `Model switched to: \`${args}\``,
                text: `Model switched to: ${args}`,
                timestamp: new Date().toISOString(),
              }]);
            } catch (e) {
              console.error('Failed to switch model:', e);
            }
          } else {
            setMessages(prev => [...prev, {
              id: `system-${Date.now()}`,
              role: 'system',
              content: `**Current Model**\n- Provider: \`${selectedAgent.model_provider || '?'}\`\n- Model: \`${selectedAgent.model_name || '?'}\``,
              text: `Current Model\n- Provider: ${selectedAgent.model_provider || '?'}\n- Model: ${selectedAgent.model_name || '?'}`,
              timestamp: new Date().toISOString(),
            }]);
          }
        }
        break;
    }
  }, [selectedAgentId, selectedAgent, messages, messageQueue]);

  const sendMessageContent = async (content: string) => {
    if (!selectedAgentId) return;
    console.log('[Chat] sendMessageContent called');

    // Add user message
    const userMessage: ExtendedMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      text: content,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Add placeholder for assistant response
    const assistantMessage: ExtendedMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      text: '',
      isStreaming: true,
      streaming: true,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMessage]);
    setIsStreaming(true);

    try {
      // Try WebSocket first for streaming
      // Wait for connection to be ready (up to 5 seconds)
      console.log('[Chat] Waiting for WebSocket connection...');
      const connected = await wsManager.waitForConnection(5000);
      console.log('[Chat] WebSocket connection state:', connected);
      if (connected) {
        console.log('[Chat] Sending message via WebSocket');
        const sent = wsManager.send({ type: 'message', content });
        console.log('[Chat] WebSocket send result:', sent);
      } else {
        // Fallback to HTTP if WebSocket not connected
        console.log('[Chat] WebSocket not connected, using HTTP fallback');
        warn('Using HTTP mode (no streaming)');
        await sendMessageMutation.mutateAsync({ agentId: selectedAgentId, message: content });
      }
    } catch (err) {
      // Error already handled by mutation's onError, just log here
      console.error('[Chat] Failed to send message:', err);
    }
  };

  // Store sendMessageContent in ref for WebSocket callback
  sendMessageContentRef.current = sendMessageContent;

  const handleSend = useCallback(async () => {
    if (!inputMessage.trim() || !selectedAgentId || isStreaming) return;

    const content = inputMessage.trim();
    setInputMessage('');

    // Handle slash commands
    if (content.startsWith('/')) {
      const parts = content.slice(1).split(' ');
      const cmd = '/' + parts[0];
      const args = parts.slice(1).join(' ');
      const command = SLASH_COMMANDS.find(c => c.cmd === cmd);
      if (command) {
        await executeSlashCommand(command.cmd, args);
        return;
      }
    }

    // If already streaming, queue the message
    if (isStreaming) {
      setMessageQueue(prev => [...prev, content]);
      return;
    }

    await sendMessageContent(content);
  }, [inputMessage, selectedAgentId, isStreaming, executeSlashCommand, sendMessageContent]);

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId);
    setSearchParams({ agent: agentId });
    setMessages([]);
  };

  const handleBackToAgents = () => {
    setSelectedAgentId(null);
    setSearchParams({});
    setMessages([]);
    wsManager.disconnect();
  };

  // Kill agent (stop agent run completely)
  const killAgent = useCallback(async () => {
    if (!selectedAgent) return;

    const confirmed = window.confirm(`Stop agent "${selectedAgent.name}"? The agent will be shut down.`);
    if (!confirmed) return;

    try {
      await api.deleteAgent(selectedAgent.id);
      wsManager.disconnect();
      setMessages([]);
      setSelectedAgentId(null);
      setSearchParams({});
      success(`Agent "${selectedAgent.name}" stopped`);
      // Refresh agents list
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      error('Failed to stop agent: ' + message);
    }
  }, [selectedAgent, setSearchParams, success, error, queryClient]);

  const copyMessage = async (msg: ExtendedMessage) => {
    const text = msg.content || msg.text || '';
    await navigator.clipboard.writeText(text);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, _copied: true } : m));
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, _copied: false } : m));
    }, 2000);
  };

  const deleteMessage = (msg: ExtendedMessage) => {
    if (window.confirm('确定要删除这条消息吗？')) {
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      success('消息已删除');
    }
  };

  // Start editing a message
  const startEditMessage = (msg: ExtendedMessage) => {
    if (msg.role !== 'user') return;
    setEditingMessageId(msg.id);
    setEditText(msg.content || msg.text || '');
  };

  // Cancel editing
  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  // Save edited message
  const saveEditMessage = async () => {
    if (!editingMessageId || !selectedAgentId || !editText.trim()) return;

    const trimmedText = editText.trim();
    const messageIndex = messages.findIndex(m => m.id === editingMessageId);
    if (messageIndex === -1) return;

    // Update the message with edited content and mark as edited
    setMessages(prev => prev.map((m, idx) =>
      idx === messageIndex
        ? { ...m, content: trimmedText, text: trimmedText, edited: true }
        : m
    ));

    // Remove all messages after the edited message (AI responses to re-trigger)
    setMessages(prev => prev.slice(0, messageIndex + 1));

    // Reset editing state
    setEditingMessageId(null);
    setEditText('');

    // Show success toast
    success('消息已编辑');

    // Re-send the edited message to trigger new AI response
    setIsStreaming(true);

    // Add placeholder for assistant response
    const assistantMessage: ExtendedMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      text: '',
      isStreaming: true,
      streaming: true,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Try WebSocket first for streaming
      const connected = await wsManager.waitForConnection(5000);
      if (connected) {
        wsManager.send({ type: 'message', content: trimmedText });
      } else {
        // Fallback to HTTP if WebSocket not connected
        await sendMessageMutation.mutateAsync({ agentId: selectedAgentId, message: trimmedText });
      }
    } catch (err) {
      console.error('[Chat] Failed to send edited message:', err);
      error('发送编辑后的消息失败');
    }
  };

  // Handle edit textarea keydown
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEditMessage();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditMessage();
    }
  };

  const toggleModelSwitcher = () => {
    if (showModelSwitcher) {
      setShowModelSwitcher(false);
    } else {
      setModelSwitcherFilter('');
      setModelSwitcherProviderFilter('');
      setShowModelSwitcher(true);
    }
  };

  const switchModel = async (model: ModelInfo) => {
    if (!selectedAgent) return;
    if (model.id === selectedAgent.model_name) {
      setShowModelSwitcher(false);
      return;
    }
    setModelSwitching(true);
    try {
      await api.changeAgentModel(selectedAgent.id, model.id);
      setShowModelSwitcher(false);
    } catch (e) {
      console.error('Failed to switch model:', e);
    } finally {
      setModelSwitching(false);
    }
  };

  const pickModel = (modelId: string) => {
    setShowModelPicker(false);
    setInputMessage(`/model ${modelId}`);
    executeSlashCommand('/model', modelId);
  };

  const toggleSearch = () => {
    setShowSearch(prev => !prev);
    if (!showSearch) {
      setTimeout(() => {
        document.getElementById('chat-search-input')?.focus();
      }, 100);
    }
  };

  // File attachment handling
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || !selectedAgentId) return;

    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    setAttachments(prev => [...prev, ...newAttachments]);

    // Upload files
    for (const att of newAttachments) {
      try {
        setAttachments(prev => prev.map(a =>
          a.file === att.file ? { ...a, uploading: true } : a
        ));
        await api.upload(selectedAgentId, att.file);
        setAttachments(prev => prev.map(a =>
          a.file === att.file ? { ...a, uploading: false } : a
        ));
      } catch (e) {
        console.error('Failed to upload file:', e);
        setAttachments(prev => prev.filter(a => a.file !== att.file));
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and drop handlers (inline functions used in JSX)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'recording-`${Date.now()}`.webm', { type: 'audio/webm' });
        // Create a FileList-like object for handleFileSelect
        const dt = new DataTransfer();
        dt.items.add(file);
        await handleFileSelect(dt.files);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error("Failed to start recording:", e);
      error("无法访问麦克风，请检查权限设置");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // Toggle recording (click to start/stop)
  const toggleRecording = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get context pressure color
  const getContextPressureColor = () => {
    switch (contextPressure) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

    // Render markdown (simple version)
  const renderMarkdown = (text: string) => {
    // Simple markdown rendering - convert **bold**, *italic*, `code`, and code blocks
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded-lg overflow-x-auto my-2"><code>$1</code></pre>')
      .replace(/\n/g, '<br>');

    return html;
  };

  // Code block component with copy button
  const CodeBlockWithCopy = ({ code }: { code: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        success('代码已复制');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        error('复制失败');
      }
    };

    return (
      <div className="relative group my-2">
        <pre className="bg-muted p-3 pt-10 rounded-lg overflow-x-auto">
          <code>{code}</code>
        </pre>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    );
  };

  // Image component with preview dialog
  const MessageImage = ({ src }: { src: string }) => {
    const [error, setError] = useState(false);
    const [expanded, setExpanded] = useState(false);

    if (error) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground text-sm p-2 bg-muted rounded-lg">
          <ImageIcon className="h-4 w-4" />
          <span>[图片加载失败]</span>
        </div>
      );
    }

    return (
      <>
        <img
          src={src}
          alt="图片预览"
          className="max-w-full max-h-[200px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity border"
          onClick={() => setExpanded(true)}
          onError={() => setError(true)}
          loading="lazy"
        />
        <Dialog open={expanded} onOpenChange={setExpanded}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90 border-none">
            <div className="relative flex items-center justify-center min-h-[200px]">
              <img
                src={src}
                alt="大图预览"
                className="max-w-full max-h-[80vh] object-contain"
                onError={() => setError(true)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  // Helper function to render text with images
  const renderTextWithImages = (text: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    const parts = text.split(imageUrlRegex);
    const matches = text.match(imageUrlRegex) || [];

    let key = 0;
    for (let i = 0; i < parts.length; i++) {
      // Add text part
      if (parts[i]) {
        elements.push(<span key={key++}>{parts[i]}</span>);
      }
      // Add image if there's a match at this position
      if (matches[i]) {
        elements.push(<MessageImage key={key++} src={matches[i]} />);
      }
    }

    return elements;
  };

  // Render markdown with code block copy buttons and images
  const renderMarkdownElements = (text: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    const codeBlockRegex = /```([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block (with image support)
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        // Split by newlines and process each line/paragraph
        const lines = beforeText.split('\n');
        lines.forEach((line, idx) => {
          if (line.trim()) {
            // Check if line contains image URLs
            if (imageUrlRegex.test(line)) {
              imageUrlRegex.lastIndex = 0; // Reset regex
              const lineElements = renderTextWithImages(line);
              elements.push(<p key={key++} className="my-2">{lineElements}</p>);
            } else {
              // Regular markdown processing
              const processedHtml = line
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>');
              elements.push(<span key={key++} dangerouslySetInnerHTML={{ __html: processedHtml }} />);
            }
          }
          if (idx < lines.length - 1) {
            elements.push(<br key={key++} />);
          }
        });
      }

      // Add code block with copy button
      const code = match[1].trim();
      elements.push(<CodeBlockWithCopy key={key++} code={code} />);

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text (with image support)
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      const lines = remainingText.split('\n');
      lines.forEach((line, idx) => {
        if (line.trim()) {
          // Check if line contains image URLs
          if (imageUrlRegex.test(line)) {
            imageUrlRegex.lastIndex = 0; // Reset regex
            const lineElements = renderTextWithImages(line);
            elements.push(<p key={key++} className="my-2">{lineElements}</p>);
          } else {
            // Regular markdown processing
            const processedHtml = line
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>');
            elements.push(<span key={key++} dangerouslySetInnerHTML={{ __html: processedHtml }} />);
          }
        }
        if (idx < lines.length - 1) {
          elements.push(<br key={key++} />);
        }
      });
    }

    return elements.length > 0 ? elements : [<span key={0}>{text}</span>];
  };

  // Highlight search matches in text
  const highlightSearch = (text: string): string => {
    if (!searchQuery.trim() || !text) return text;
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<mark style="background:var(--warning);color:var(--bg);border-radius:2px;padding:0 2px">$1</mark>');
  };

  // Show agent selection if no agent selected
  if (!selectedAgentId || !selectedAgent) {
    return (
      <div className="flex flex-col h-full p-6">
        <h2 className="text-2xl font-bold mb-6">Chat</h2>

        {agentsLoading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No agents available</h3>
            <p className="text-muted-foreground">Create an agent first to start chatting</p>
            <Button className="mt-4" onClick={() => window.location.href = '/agents'}>
              Go to Agents
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Card
                key={agent.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleAgentSelect(agent.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback style={{ backgroundColor: agent.identity?.color || undefined }}>
                        {agent.identity?.emoji || <Bot className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{agent.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {agent.model_provider || agent.model?.provider || 'unknown'}:{agent.model_name || agent.model?.model || 'unknown'}
                      </p>
                    </div>
                    <Badge variant={agent.status === 'running' ? 'default' : 'secondary'}>
                      {agent.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex h-full ${focusMode ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Sidebar with sessions */}
      <div className={`${focusMode ? 'hidden' : 'w-64'} border-r bg-muted/30 flex flex-col`}>
        <div className="p-3 border-b">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={handleBackToAgents}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Agents
          </Button>
        </div>

        <div className="p-3 border-b">
          <h2 className="font-semibold text-sm mb-2">Sessions</h2>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => selectedAgentId && createSessionMutation.mutate(selectedAgentId)}
          >
            <Plus className="h-4 w-4" />
            New Session
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sessions.filter((s): s is Session => !!s && !!s.session_id).map((session) => (
              <Button
                key={session.session_id}
                variant={selectedSessionId === session.session_id ? 'secondary' : 'ghost'}
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => setSelectedSessionId(session.session_id)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                <span className="truncate">{session.title || 'Untitled'}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div
        className={`flex-1 flex flex-col relative ${dragOver ? 'bg-primary/5' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files);
          }
        }}
      >
        {/* Drag overlay */}
        {dragOver && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-primary border-dashed rounded-lg z-50 flex items-center justify-center pointer-events-none m-2">
            <div className="text-center">
              <div className="text-primary font-semibold text-lg">释放以上传文件</div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback style={{ backgroundColor: selectedAgent.identity?.color || undefined }}>
                {selectedAgent.identity?.emoji || <Bot className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{selectedAgent.name}</h2>
              <p className="text-xs text-muted-foreground">
                {selectedAgent.model_provider || selectedAgent.model?.provider || 'unknown'}:{selectedAgent.model_name || selectedAgent.model?.model || 'unknown'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* WebSocket Connection Status */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
              title={`WebSocket: ${wsConnectionState}`}
            >
              <span className={`w-2 h-2 rounded-full ${
                wsConnectionState === 'connected'
                  ? 'bg-green-500'
                  : wsConnectionState === 'connecting' || wsConnectionState === 'reconnecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
              }`} />
              <span className="text-muted-foreground hidden sm:inline">
                {wsConnectionState === 'connected'
                  ? 'Live'
                  : wsConnectionState === 'connecting'
                    ? 'Connecting...'
                    : wsConnectionState === 'reconnecting'
                      ? 'Reconnecting...'
                      : 'HTTP'}
              </span>
            </div>
            {!isStreaming ? (
              <Badge variant="default" className="gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${getContextPressureColor()}`} />
                Ready
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Generating...
              </Badge>
            )}
            {messageQueue.length > 0 && (
              <Badge variant="outline">+{messageQueue.length} queued</Badge>
            )}
            <Button variant="ghost" size="sm" onClick={toggleSearch} title="Search messages (Ctrl+F)">
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFocusMode(!focusMode)}
              title="Toggle focus mode (Ctrl+Shift+F)"
            >
              {focusMode ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
            <Button variant="destructive" size="sm" onClick={killAgent}>
              Stop
            </Button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="border-b p-2 flex items-center gap-2 bg-muted/50">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              id="chat-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="flex-1 h-8"
              onKeyDown={(e) => e.key === 'Escape' && setShowSearch(false)}
            />
            <span className="text-xs text-muted-foreground">
              {filteredMessages.length} of {messages.length}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setShowSearch(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 relative" ref={scrollRef}>
          <div className="h-full overflow-y-auto p-4" onScroll={handleScroll}>
            {/* New message indicator */}
            {showNewMessageIndicator && (
              <button
                onClick={scrollToBottom}
                className="sticky top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center gap-2 text-sm mx-auto mb-4 hover:bg-primary/90 transition-colors"
              >
                <span>{unreadCount > 0 ? `${unreadCount} 条新消息` : '新消息'}</span>
                <ArrowDown className="h-4 w-4" />
              </button>
            )}
            <div className="space-y-4 max-w-3xl mx-auto">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Start a conversation with {selectedAgent.name}</p>
                <div className="mt-4 text-sm">
                  <p className="text-xs text-muted-foreground mb-2">Available commands:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SLASH_COMMANDS.slice(0, 5).map(cmd => (
                      <code key={cmd.cmd} className="px-2 py-1 bg-muted rounded text-xs">{cmd.cmd}</code>
                    ))}
                    <span className="text-xs text-muted-foreground">...and more</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
              {filteredMessages.map((msg, idx) => {
                // Check if message should be grouped with previous
                const isGrouped = idx > 0 &&
                  filteredMessages[idx - 1].role === msg.role &&
                  msg.role !== 'system' &&
                  !msg.thinking &&
                  !filteredMessages[idx - 1].thinking;

                return (
                <div
                  key={msg.id}
                  className={`flex gap-3 group ${msg.role === 'user' ? 'flex-row-reverse' : ''} ${isGrouped ? 'mt-[-14px]' : ''}`}
                >
                  <Avatar className={`h-8 w-8 mt-1 shrink-0 ${isGrouped ? 'invisible' : ''}`}>
                    <AvatarFallback
                      style={{
                        backgroundColor: msg.role === 'user' ? undefined : (selectedAgent.identity?.color || undefined)
                      }}
                    >
                      {msg.role === 'user' ? <User className="h-4 w-4" /> :
                       (selectedAgent.identity?.emoji || <Bot className="h-4 w-4" />)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                    {msg.thinking && !msg.content ? (
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    ) : editingMessageId === msg.id ? (
                      <>
                        <div className="inline-block rounded-lg px-4 py-2 text-left max-w-full bg-primary text-primary-foreground">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            className="w-full min-w-[200px] bg-transparent border-none outline-none resize-none whitespace-pre-wrap text-left"
                            rows={Math.max(1, editText.split('\n').length)}
                            autoFocus
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <button
                            className="px-2 py-1 text-xs bg-primary-foreground text-primary rounded hover:bg-primary-foreground/90 transition-colors flex items-center gap-1"
                            onClick={saveEditMessage}
                          >
                            <Save className="h-3 w-3" />
                            保存
                          </button>
                          <button
                            className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors"
                            onClick={cancelEditMessage}
                          >
                            取消
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className={`inline-block px-4 py-2 text-left max-w-full ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-lg rounded-br-sm border border-[rgba(255,92,0,0.12)]'
                              : msg.role === 'system'
                              ? 'bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-md'
                              : `bg-muted rounded-lg rounded-bl-sm border border-border/50 ${msg.isStreaming ? 'streaming-bubble' : ''}`
                          }`}
                          style={msg.isStreaming ? {
                            borderLeft: '3px solid hsl(var(--primary))',
                            animation: 'stream-pulse 2s ease-in-out infinite'
                          } : {}}
                        >
                          {msg.role === 'agent' || msg.role === 'assistant' ? (
                            <div className="whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert">
                              {renderMarkdownElements(msg.content || msg.text || '')}
                            </div>
                          ) : (
                            <p
                              className="whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{ __html: highlightSearch(msg.content || msg.text || '') }}
                            />
                          )}

                          {/* Images */}
                          {msg.images && msg.images.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {msg.images.map(img => (
                                <a key={img.file_id} href={`/api/uploads/${img.file_id}`} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={`/api/uploads/${img.file_id}`}
                                    alt={img.filename || 'Uploaded image'}
                                    className="max-w-[200px] max-h-[200px] rounded-lg border"
                                  />
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Tool calls */}
                          {msg.tools && msg.tools.length > 0 && verboseMode !== 'off' && (
                            <div className="mt-3 space-y-2">
                              {msg.tools.map(tool => (
                                <div
                                  key={tool.id}
                                  className={`border rounded-lg overflow-hidden ${tool.is_error ? 'border-red-500/50 bg-red-500/10' : 'border-border'}`}
                                  style={{ borderLeftWidth: '3px', borderLeftColor: tool.is_error ? 'var(--red-500)' : getToolBorderColor(tool.name) }}
                                >
                                  <button
                                    className="w-full px-3 py-2 flex items-center gap-2 text-sm bg-muted/50 hover:bg-muted transition-colors"
                                    onClick={() => {
                                      setMessages(prev => prev.map(m => {
                                        if (m.id !== msg.id) return m;
                                        const tools = m.tools?.map(t =>
                                          t.id === tool.id ? { ...t, expanded: !t.expanded } : t
                                        );
                                        return { ...m, tools };
                                      }));
                                    }}
                                  >
                                    {tool.running ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : tool.is_error ? (
                                      <X className="h-3 w-3 text-red-500" />
                                    ) : (
                                      <>
                                        {getToolIcon(tool.name)}
                                      </>
                                    )}
                                    <span className="font-mono">{tool.name}</span>
                                    <span className="text-xs text-muted-foreground ml-auto">
                                      {tool.running ? 'running...' : tool.is_error ? 'error' : 'done'}
                                    </span>
                                    {tool.expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </button>
                                  {tool.expanded && verboseMode === 'full' && (
                                    <div className="p-3 text-sm">
                                      {/* Generated images */}
                                      {tool._imageUrls && tool._imageUrls.length > 0 && (
                                        <div className="mb-3 flex flex-wrap gap-2">
                                          {tool._imageUrls.map((url, idx) => (
                                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                              <img
                                                src={url}
                                                alt={`Generated ${idx + 1}`}
                                                className="max-w-[200px] max-h-[200px] rounded-lg border border-border hover:border-primary transition-colors"
                                                loading="lazy"
                                              />
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                      {/* Audio player */}
                                      {tool._audioFile && (
                                        <div className="mb-3 p-2 bg-muted rounded-lg flex items-center gap-3">
                                          <audio controls className="flex-1 h-8">
                                            <source src={tool._audioFile} />
                                          </audio>
                                          {tool._audioDuration && (
                                            <span className="text-xs text-muted-foreground">
                                              ~{Math.round(tool._audioDuration / 1000)}s
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {!!tool.input && (
                                        <div className="mb-2">
                                          <div className="text-xs text-muted-foreground mb-1">Input</div>
                                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                                            {JSON.stringify(tool.input, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                      {tool.result && (
                                        <div>
                                          <div className="text-xs text-muted-foreground mb-1">Result</div>
                                          <pre className={`p-2 rounded text-xs overflow-x-auto ${tool.is_error ? 'bg-red-500/10' : 'bg-muted'}`}>
                                            {tool.result}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                          </span>
                          {msg.meta && (
                            <span className="text-xs text-muted-foreground">{msg.meta}</span>
                          )}
                          {msg.edited && (
                            <span className="text-xs text-muted-foreground italic">已编辑</span>
                          )}
                          {(msg.content || msg.text) && (
                            <button
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => copyMessage(msg)}
                              title={msg._copied ? 'Copied!' : 'Copy message'}
                            >
                              {msg._copied ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              )}
                            </button>
                          )}
                          {msg.role === 'user' && (
                            <button
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => startEditMessage(msg)}
                              title="编辑消息"
                            >
                              <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
                            </button>
                          )}
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteMessage(msg)}
                            title="Delete message"
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Floating scroll buttons - fixed at bottom right */}
          {messages.length > 0 && (
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
              {/* Scroll to top button */}
              {showScrollToTop && (
                <button
                  onClick={scrollToTop}
                  className="p-2 bg-background/90 backdrop-blur-sm border rounded-full shadow-lg hover:bg-muted transition-all duration-200"
                  title="滚动到顶部"
                >
                  <ArrowDown className="h-4 w-4 rotate-180" />
                </button>
              )}
              {/* Scroll to bottom button with unread count */}
              {(showNewMessageIndicator || !isNearBottom()) && (
                <button
                  onClick={scrollToBottom}
                  className="p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all duration-200 flex items-center gap-1"
                  title="滚动到底部"
                >
                  {unreadCount > 0 && (
                    <span className="text-xs font-medium px-1">{unreadCount}</span>
                  )}
                  <ArrowDown className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          </div>
        </ScrollArea>

        {/* Tip bar */}
        {!dismissedTips && !isStreaming && (
          <div className="px-4 py-2 bg-muted/30 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>{TIPS[tipIndex]}</span>
            <button
              className="hover:text-foreground transition-colors"
              onClick={() => {
                setDismissedTips(true);
                localStorage.setItem('of-tips-off', 'true');
              }}
              title="Dismiss tips"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Input area */}
        <div
          className="border-t px-6 pt-3 pb-4"
          style={{
            background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background)) 60%, transparent 100%)'
          }}
        >
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-2 py-1 bg-muted rounded-lg text-sm"
                  >
                    {att.preview ? (
                      <img src={att.preview} alt="" className="w-6 h-6 rounded object-cover" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                    <span className="truncate max-w-[120px]">{att.file.name}</span>
                    {att.uploading && <Loader2 className="h-3 w-3 animate-spin" />}
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => removeAttachment(idx)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Slash command menu */}
            {showSlashMenu && filteredSlashCommands.length > 0 && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {filteredSlashCommands.map((cmd, idx) => (
                  <div
                    key={cmd.cmd}
                    className={`px-4 py-2 cursor-pointer flex flex-col ${
                      idx === slashIdx ? 'bg-accent' : 'hover:bg-accent/50'
                    }`}
                    onClick={() => {
                      setInputMessage(cmd.cmd + ' ');
                      setShowSlashMenu(false);
                      inputRef.current?.focus();
                    }}
                    onMouseEnter={() => setSlashIdx(idx)}
                  >
                    <span className="font-medium">{cmd.cmd}</span>
                    <span className="text-xs text-muted-foreground">{cmd.desc}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Model picker */}
            {showModelPicker && filteredModelPicker.length > 0 && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                  Available models — pick one or keep typing
                </div>
                {filteredModelPicker.map((m, idx) => (
                  <div
                    key={m.id}
                    className={`px-4 py-2 cursor-pointer ${
                      idx === modelPickerIdx ? 'bg-accent' : 'hover:bg-accent/50'
                    }`}
                    onClick={() => pickModel(m.id)}
                    onMouseEnter={() => setModelPickerIdx(idx)}
                  >
                    <div className="font-mono text-sm">{m.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.provider}{m.display_name && m.display_name !== m.id ? ` · ${m.display_name}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Input row */}
            <div className="flex gap-2 relative">
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*,.txt,.pdf,.md,.json,.csv,.mp3,.wav,.ogg,.webm,.m4a,.flac"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                variant={recording ? "destructive" : "ghost"}
                size="icon"
                onClick={toggleRecording}
                title={recording ? "点击停止录音" : "点击开始录音"}
              >
                {recording ? (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              {recording && (
                <div className="absolute -top-8 left-20 flex items-center gap-2 px-3 py-1 bg-red-500 text-white text-xs rounded-full">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  {formatTime(recordingTime)}
                </div>
              )}

              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !(e.nativeEvent as KeyboardEvent).isComposing) {
                      e.preventDefault();
                      if (showModelPicker && filteredModelPicker.length > 0) {
                        pickModel(filteredModelPicker[modelPickerIdx].id);
                      } else if (showSlashMenu && filteredSlashCommands.length > 0) {
                        const cmd = filteredSlashCommands[slashIdx];
                        setInputMessage(cmd.cmd + ' ');
                        setShowSlashMenu(false);
                      } else {
                        handleSend();
                      }
                    } else if (e.key === 'Escape') {
                      setShowSlashMenu(false);
                      setShowModelPicker(false);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (showModelPicker) {
                        setModelPickerIdx(prev => Math.max(0, prev - 1));
                      } else if (showSlashMenu) {
                        setSlashIdx(prev => Math.max(0, prev - 1));
                      }
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (showModelPicker) {
                        setModelPickerIdx(prev => Math.min(filteredModelPicker.length - 1, prev + 1));
                      } else if (showSlashMenu) {
                        setSlashIdx(prev => Math.min(filteredSlashCommands.length - 1, prev + 1));
                      }
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 150) + 'px';
                  }}
                  placeholder={recording ? 'Recording... release to send' : "Message OpenFang... (/ for commands)"}
                  disabled={isStreaming || recording}
                  className="w-full min-h-[44px] max-h-[150px] px-4 py-3 rounded-2xl border border-input bg-muted text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all duration-200"
                  style={{ lineHeight: '1.5' }}
                  rows={1}
                />
              </div>

              {isStreaming ? (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!selectedAgentId) return;
                    try {
                      await api.stopAgentRun(selectedAgentId);
                      // 清空当前 streaming 消息
                      setMessages(prev => prev.filter(m => !m.isStreaming));
                      // 设置 isStreaming 为 false
                      setIsStreaming(false);
                      // 显示 toast 提示
                      success('生成已停止');
                    } catch (e) {
                      console.error('Failed to stop:', e);
                      error('停止生成失败');
                    }
                  }}
                  title="Stop generating"
                >
                  <StopCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  disabled={(!inputMessage.trim() && attachments.length === 0) || isStreaming}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Input footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                {/* Model switcher */}
                <div className="relative">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors disabled:opacity-50"
                    onClick={toggleModelSwitcher}
                    disabled={isStreaming}
                  >
                    <Settings className="h-3 w-3" />
                    <span className="font-mono">
                      {selectedAgent.model_name ?
                        (selectedAgent.model_name.length > 24 ?
                          selectedAgent.model_name.substring(0, 22) + '...' :
                          selectedAgent.model_name
                        ) : 'Model'}
                    </span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${showModelSwitcher ? 'rotate-180' : ''}`} />
                  </button>

                  {showModelSwitcher && (
                    <div className="absolute bottom-full left-0 mb-2 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                      <div className="p-2 border-b flex items-center gap-2">
                        <Search className="h-3 w-3 text-muted-foreground" />
                        <Input
                          value={modelSwitcherFilter}
                          onChange={(e) => setModelSwitcherFilter(e.target.value)}
                          placeholder="Search models..."
                          className="h-7 text-xs flex-1"
                          autoFocus
                        />
                        <select
                          value={modelSwitcherProviderFilter}
                          onChange={(e) => setModelSwitcherProviderFilter(e.target.value)}
                          className="h-7 text-xs bg-muted border rounded px-2"
                        >
                          <option value="">All</option>
                          {switcherProviders.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      {modelSwitching ? (
                        <div className="p-4 flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs">Switching...</span>
                        </div>
                      ) : (
                        <div className="p-1">
                          {groupedSwitcherModels.length === 0 && (
                            <div className="p-4 text-center text-xs text-muted-foreground">No models found</div>
                          )}
                          {groupedSwitcherModels.map(group => (
                            <div key={group.provider}>
                              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">
                                {group.provider}
                              </div>
                              {group.models.map((m) => (
                                <div
                                  key={m.id}
                                  className={`px-3 py-2 cursor-pointer rounded flex items-center justify-between ${
                                    m.id === selectedAgent.model_name ? 'bg-accent' : 'hover:bg-accent/50'
                                  }`}
                                  onClick={() => switchModel(m)}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{m.display_name || m.id}</span>
                                      {m.tier && (
                                        <Badge variant="outline" className="text-[10px] h-4">
                                          {m.tier}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono">
                                      {m.id}
                                      {m.context_window && (
                                        <span className="ml-2">
                                          {m.context_window >= 1000000 ?
                                            (m.context_window/1000000).toFixed(1) + 'M' :
                                            Math.round(m.context_window/1000) + 'K'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {m.id === selectedAgent.model_name && (
                                    <Check className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <span>{tokenCount > 0 ? `~${tokenCount} tokens` : attachments.length ? `${attachments.length} file(s)` : ''}</span>
                {messageQueue.length > 0 && (
                  <Badge variant="outline" className="text-[10px]">{messageQueue.length} queued</Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {thinkingMode !== 'off' && (
                  <Badge variant="secondary" className="text-[10px]">
                    Think: {thinkingMode}
                  </Badge>
                )}
                {verboseMode !== 'on' && (
                  <Badge variant="outline" className="text-[10px]">
                    Verbose: {verboseMode}
                  </Badge>
                )}
                <button
                  onClick={scrollToTop}
                  className="p-1 hover:text-foreground transition-colors"
                  title="滚动到顶部"
                  disabled={!messages.length}
                >
                  <ArrowDown className="h-3 w-3 rotate-180" />
                </button>
                <button
                  onClick={scrollToBottom}
                  className="p-1 hover:text-foreground transition-colors"
                  title="滚动到底部"
                  disabled={!messages.length}
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}


export default Chat;

