import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import { useSessionWebSocket } from '@/hooks/useSessionWebSocket';
import { useGenerationState, formatMessageTime, isAssistantRole, isSystemRole, isUserRole, type PartialGeneration, type StepStatus } from '@/hooks/useGenerationState';
import type { Agent, Session, Message, ToolCall } from '@/api/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';
import { ChatInput } from '@/components/chat/ChatInput';
import { ToolCallsTimeline } from '@/components/chat/ToolCallsTimeline';
import { useTranslation } from 'react-i18next';
import { CanvasCard } from '@/components/chat/CanvasCard';
import { StepStatusContainer } from '@/components/chat/StepStatusCard';
import {
  Send, Bot, User, Plus, MessageSquare,
  Loader2, Sparkles, Clock, MoreHorizontal,
  ChevronDown, Paperclip, X, Brain,
  Command, Settings, ArrowRight, Copy, Check,
  Cpu,
  Wifi, WifiOff, Loader,
  Wrench, AlertCircle, Image, Music,
  ChevronRight,
  ExternalLink, Maximize2, Minimize2,
  Trash2,
  Edit3,
  RotateCw,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toaster } from '@/lib/toast';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

// Reduced motion preference check
const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

// Extended Tool interface for UI state
interface ExtendedTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type?: 'mcp' | 'hand';
  mcp_server?: string;
  icon?: string;
}

// Agent details type
interface AgentDetails extends Agent {
  tools?: ExtendedTool[];
  mcp_servers?: string[];
  system_prompt?: string;
}

// Extended message for WebSocket streaming
interface ExtendedMessage extends Message {
  isStreaming?: boolean;
}

// Filter out system guidance messages from content
// These are LLM prompts injected by the backend, not user-facing content
function filterSystemGuidance(content: string): string {
  if (!content) return '';
  // Split by lines and filter out lines starting with [System:
  const lines = content.split('\n');
  const filteredLines = lines.filter(line => {
    const trimmed = line.replace(/^\s+/, '');
    return !trimmed.startsWith('[System:');
  });
  return filteredLines.join('\n').trim();
}

// Check if a message should be completely hidden (only contains system guidance)
function isSystemOnlyMessage(content: string): boolean {
  if (!content) return false;
  const filtered = filterSystemGuidance(content);
  return filtered.length === 0 && content.includes('[System:');
}

// Code block component
function CodeBlock({ language, value }: { language: string; value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toaster.error(t('chat.copyFailed'));
    }
  }, [value, t]);

  return (
    <div className="relative group rounded-xl overflow-hidden bg-[#1e1e1e] border border-white/10">
      <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d2d] border-b border-white/5">
        <span className="text-xs text-[var(--text-muted)] font-mono uppercase">{language}</span>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? t('chat.copied') : t('chat.copy')}
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language || 'text'}
        PreTag="div"
        customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

// Message content component
function MessageContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }: {
            inline?: boolean;
            className?: string;
            children?: React.ReactNode;
          } & React.HTMLAttributes<HTMLElement>) {
            const match = /language-(\w+)/.exec(className || '');
            const value = String(children).replace(/\n$/, '');

            // Fix: Check inline !== false to handle undefined safely
            // When inline is undefined, treat it as inline code to avoid div-inside-p errors
            if (inline !== false) {
              return (
                <code className="px-1.5 py-0.5 rounded-md bg-[var(--primary-100)] dark:bg-violet-900/30 text-[var(--primary-dark)] dark:text-violet-300 text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            }

            return <CodeBlock language={match?.[1] || 'text'} value={value} />;
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-violet-200 dark:border-violet-800">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-violet-200 dark:border-violet-800 px-3 py-2 bg-violet-50 dark:bg-violet-900/20 font-semibold text-left">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-violet-200 dark:border-violet-800 px-3 py-2">
                {children}
              </td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Tool calls display component - switches to timeline view for multiple tools
function ToolCallsDisplay({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const toggleTool = (toolId: string) => {
    setExpandedTools(prev => ({
      ...prev,
      [toolId]: !prev[toolId]
    }));
  };

  if (!toolCalls?.length) return null;

  // Always use timeline view for tool calls (even single one looks better in timeline)
  return <ToolCallsTimeline toolCalls={toolCalls} />;
}

// Grouped tool calls timeline component for consecutive tool messages
function ToolCallsTimelineGroup({
  messages,
  isLast
}: {
  messages: ExtendedMessage[];
  isLast: boolean;
}) {
  // Collect all tool calls from all messages in the group
  const allToolCalls = useMemo(() => {
    const calls: ToolCall[] = [];
    messages.forEach((msg, msgIndex) => {
      if (msg.tools && msg.tools.length > 0) {
        msg.tools.forEach((tool, toolIndex) => {
          calls.push({
            ...tool,
            id: tool.id || `tool-${msgIndex}-${toolIndex}`,
          });
        });
      }
    });
    return calls;
  }, [messages]);

  // Get the last message's text content (if any)
  const lastTextContent = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const content = messages[i].content || messages[i].text || '';
      if (content.trim()) return content;
    }
    return '';
  }, [messages]);

  if (allToolCalls.length === 0) return null;

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex gap-3 flex-row"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
        <Bot className="w-4 h-4 text-[var(--primary)] dark:text-violet-400" />
      </div>

      {/* Content - compact, no outer card wrapper */}
      <div className="flex-1 min-w-0 max-w-[85vw] md:max-w-[600px] lg:max-w-[700px]">
        {/* Tool Calls Timeline - has its own card styling */}
        <ToolCallsTimeline toolCalls={allToolCalls} />

        {/* Display text content if present */}
        {lastTextContent && (
          <div className="mt-3 rounded-2xl px-4 py-3 bg-white dark:bg-gray-800 border border-violet-100 dark:border-violet-900/50 shadow-sm">
            <MessageContent content={lastTextContent} />
          </div>
        )}

        {/* Show loading indicator for streaming */}
        {isLast && messages[messages.length - 1]?.isStreaming && (
          <div className="flex items-center gap-2 mt-2 text-violet-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Generating...</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Message bubble component - WebView2 compatible clean design
function MessageBubble({
  message,
  isLast,
  partialGeneration,
  stepStatuses
}: {
  message: Message;
  isLast: boolean;
  partialGeneration?: PartialGeneration | null;
  stepStatuses?: StepStatus[];
}) {
  const isUser = isUserRole(message.role || '');
  const isAssistant = isAssistantRole(message.role || '');
  const isSystem = isSystemRole(message.role || '');

  const showPartial = isLast && isAssistant && partialGeneration;
  const rawContent = showPartial ? partialGeneration!.content : (message.content || message.text || '');
  const displayContent = filterSystemGuidance(rawContent);
  const displayToolCalls = showPartial ? partialGeneration!.toolCalls : message.tools;
  const displayCanvas = showPartial ? partialGeneration!.canvas : null;
  const displayStepStatuses = showPartial && stepStatuses && stepStatuses.length > 0 ? stepStatuses : null;

  // Skip rendering if this is a system-only message (no visible content after filtering)
  if (isSystemOnlyMessage(rawContent) && !displayToolCalls?.length) {
    return null;
  }

  const timestamp = useMemo(() => formatMessageTime(message.timestamp), [message.timestamp]);

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <div className="px-3 py-1 rounded-full bg-[var(--primary-100)] dark:bg-violet-900/40 border border-violet-200 dark:border-violet-700">
          <span className="text-[10px] text-[var(--primary-dark)] dark:text-violet-300 font-medium">
            {displayContent}
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex gap-2',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar - 3D clay style */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center',
          isUser
            ? 'bg-indigo-500 border-2 border-indigo-400'
            : 'bg-slate-100 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600'
        )}
        style={{
          boxShadow: isUser
            ? '0 3px 0 0 #4338ca, 0 4px 8px rgba(99,102,241,0.3)'
            : '0 3px 0 0 #94a3b8, 0 4px 8px rgba(0,0,0,0.08)',
          transform: 'translateY(-1px)'
        }}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        'flex flex-col',
        isUser ? 'items-end' : 'items-start'
      )}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 w-fit max-w-[85vw] md:max-w-[550px] lg:max-w-[600px]',
            'transition-all duration-200',
            isUser
              ? 'bg-indigo-500 text-white'
              : 'bg-white dark:bg-slate-800'
          )}
          style={{
            boxShadow: isUser
              ? '3px 3px 0 0 #4338ca, 4px 6px 12px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.15)'
              : '3px 3px 0 0 #94a3b8, 4px 6px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: isUser ? '#818cf8' : '#e2e8f0',
            transform: 'translateY(-2px) translateX(-1px)'
          }}
        >
          {displayContent && (
            <div className={cn(
              'text-sm leading-relaxed',
              isUser ? 'text-white' : 'text-slate-700 dark:text-slate-100'
            )}>
              {isUser ? (
                <p className="whitespace-pre-wrap">{displayContent}</p>
              ) : (
                <MessageContent content={displayContent} />
              )}
            </div>
          )}

          {showPartial && (
            <div className="flex items-center gap-1.5 mt-2 text-indigo-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-[10px] font-medium">思考中...</span>
            </div>
          )}

          {!isUser && displayToolCalls && displayToolCalls.length > 0 && (
            <ToolCallsDisplay toolCalls={displayToolCalls} />
          )}

          {/* Canvas display */}
          {!isUser && displayCanvas && (
            <CanvasCard
              id={displayCanvas.id}
              title={displayCanvas.title}
              html={displayCanvas.html}
            />
          )}

          {/* Step status display */}
          {!isUser && displayStepStatuses && displayStepStatuses.length > 0 && (
            <StepStatusContainer
              steps={displayStepStatuses}
              isComplete={displayStepStatuses.every(s => s.status === 'completed' || s.status === 'failed' || s.status === 'skipped')}
            />
          )}
        </div>

        {timestamp && (
          <span className="text-[10px] text-slate-400 mt-1 px-0.5">
            {timestamp}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// Agent item in sidebar
function AgentItem({
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200',
        isSelected
          ? 'bg-[var(--primary-100)] dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800 shadow-sm'
          : 'bg-white/50 dark:bg-white/5 border border-transparent hover:bg-white hover:shadow-sm'
      )}
    >
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
        isSelected
          ? 'bg-gradient-to-br from-violet-500 to-purple-600'
          : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700'
      )}>
        <Bot className={cn(
          'w-4 h-4',
          isSelected ? 'text-white' : 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]'
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium truncate',
          isSelected ? 'text-violet-900 dark:text-violet-100' : 'text-[var(--text-primary)] dark:text-gray-200'
        )}>
          {agent.name}
        </p>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {agent.model_name || agent.model?.model || 'Default Model'}
        </p>
      </div>
    </motion.button>
  );
}

// Session item in sidebar
function SessionItem({
  session,
  isSelected,
  onClick
}: {
  session: Session;
  isSelected: boolean;
  onClick: () => void;
}) {
  const updatedAt = session.updated_at
    ? new Date(session.updated_at).toLocaleDateString()
    : new Date(session.created_at).toLocaleDateString();

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-200',
        isSelected
          ? 'bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800/50'
          : 'hover:bg-white/50 dark:hover:bg-white/5 border border-transparent'
      )}
    >
      <MessageSquare className={cn(
        'w-4 h-4 flex-shrink-0',
        isSelected ? 'text-violet-500' : 'text-[var(--text-muted)]'
      )} />
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm truncate',
          isSelected ? 'text-[var(--primary-dark)] dark:text-violet-300 font-medium' : 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]'
        )}>
          {session.title || 'New Session'}
        </p>
        <p className="text-[10px] text-[var(--text-muted)]">
          {updatedAt}
        </p>
      </div>
    </motion.button>
  );
}

// Empty state component
function EmptyState({ onCreateSession }: { onCreateSession: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-violet-500" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)] dark:text-gray-100 mb-2">
          {t('chat.welcomeTitle')}
        </h3>
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-6 max-w-sm">
          {t('chat.welcomeDesc')}
        </p>
        <motion.button
          onClick={onCreateSession}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'inline-flex items-center gap-2 px-6 py-3 rounded-xl',
            'bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium',
            'shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40',
            'transition-all duration-200'
          )}
        >
          <Plus className="w-5 h-5" />
          {t('chat.startNewChat')}
        </motion.button>
      </motion.div>
    </div>
  );
}

// ============================================
// MAIN CHAT PAGE - Three-Panel Layout
// ============================================
export default function Chat() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Get IDs from URL
  const agentId = searchParams.get('agent');
  const sessionId = searchParams.get('session');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pendingMessageRef = useRef<string | null>(null);

  // Generation State Management (centralized hook)
  const {
    state,
    isGenerating,
    pendingUserMessage,
    partialGeneration,
    stepStatuses,
    setPartialGeneration,
    startPending,
    startStreaming,
    updateStreamingContent,
    updateStepStatuses,
    clearStepStatuses,
    complete,
    setError,
    reset,
  } = useGenerationState();

  // ============================================
  // WEBSOCKET CONNECTION
  // ============================================

  const handleWebSocketMessage = useCallback((msg: unknown) => {
    const data = msg as Record<string, unknown>;

    switch (data.type) {
      case 'generation_start':
      case 'typing':
        // Backend sends 'typing' with state: 'start'/'stop'/'tool'
        if (data.state === 'start') {
          startStreaming();
        } else if (data.state === 'tool') {
          // Show tool usage in partial generation
          updateStreamingContent({
            statusMessage: `Using ${(data.tool as string) || 'tool'}...`,
          });
        } else if (data.state === 'stop') {
          complete();
        }
        break;

      case 'thinking':
        // Legacy thinking event (backward compat) - always start streaming
        startStreaming();
        updateStreamingContent({
          statusMessage: data.level ? `Thinking (${data.level})...` : 'Processing...',
        });
        break;

      case 'generation_chunk':
      case 'text_delta':
        // Stream chunk received (text_delta is Alpine-compatible format)
        setPartialGeneration((prev) => {
          let newContent = (prev?.content || '') + ((data.content as string) || '');
          let toolCalls = prev?.toolCalls || [];
          let toolTextDetected = prev?.toolTextDetected || false;

          // Detect function-call patterns streamed as text and convert to tool cards
          // Pattern: tool_name</function={...} or <function=tool_name>
          if (!toolTextDetected) {
            const fcIdx = newContent.search(/\w+<\/function[=,>]/) ?? newContent.search(/<function=\w+>/);
            if (fcIdx !== -1) {
              const fcPart = newContent.substring(fcIdx);
              const toolMatch = fcPart.match(/^(\w+)<\/function/) || fcPart.match(/^<function=(\w+)>/);
              if (toolMatch) {
                newContent = newContent.substring(0, fcIdx).trim();
                toolTextDetected = true;
                const inputMatch = fcPart.match(/[=,>]\s*(\{[\s\S]*)/);
                toolCalls = [...toolCalls, {
                  id: `${toolMatch[1]}-txt-${Date.now()}`,
                  name: toolMatch[1],
                  running: true,
                  expanded: true,
                  input: inputMatch ? inputMatch[1].replace(/<\/function>?\s*$/, '').trim() : '',
                  result: '',
                  is_error: false,
                }];
              }
            }
          }

          return {
            content: newContent,
            toolCalls,
            toolTextDetected,
            tool_calls: data.tool_calls as ToolCall[] | undefined,
          };
        });
        // Note: We don't clear pendingUserMessage here anymore.
        // It's now cleared on generation_complete/error or when messages are refreshed.
        // This prevents the user message from disappearing during the thinking phase.
        break;

      case 'tool_start':
        // Tool call started - add to partial generation
        setPartialGeneration((prev) => {
          const existingTools = prev?.toolCalls || [];
          const newTool: ToolCall = {
            id: `${data.tool as string}-${Date.now()}`,
            name: data.tool as string,
            running: true,
            expanded: true,
            input: '',
            result: '',
            is_error: false,
          };
          return {
            content: prev?.content || '',
            toolCalls: [...existingTools, newTool],
          };
        });
        break;

      case 'tool_end':
        // Tool call ended - update input params
        setPartialGeneration((prev) => {
          if (!prev?.toolCalls?.length) return prev;
          const updatedTools = [...prev.toolCalls];
          // Find the last running tool with matching name
          for (let i = updatedTools.length - 1; i >= 0; i--) {
            if (updatedTools[i].name === data.tool && updatedTools[i].running) {
              updatedTools[i] = {
                ...updatedTools[i],
                input: data.input as string | undefined,
              };
              break;
            }
          }
          return { ...prev, toolCalls: updatedTools };
        });
        break;

      case 'tool_result':
        // Tool execution completed - update result
        setPartialGeneration((prev) => {
          if (!prev?.toolCalls?.length) return prev;
          const updatedTools = [...prev.toolCalls];
          // Find the last running tool with matching name
          for (let i = updatedTools.length - 1; i >= 0; i--) {
            if (updatedTools[i].name === data.tool && updatedTools[i].running) {
              const result = data.result as string | undefined;
              let imageUrls: string[] | undefined;
              let audioFile: string | undefined;
              let audioDuration: number | undefined;

              // Extract image URLs from image_generate or browser_screenshot results
              if ((data.tool === 'image_generate' || data.tool === 'browser_screenshot') && !data.is_error) {
                try {
                  const parsed = JSON.parse(result || '{}');
                  if (parsed.image_urls && parsed.image_urls.length) {
                    imageUrls = parsed.image_urls;
                  }
                } catch { /* not JSON */ }
              }

              // Extract audio file path from text_to_speech results
              if (data.tool === 'text_to_speech' && !data.is_error) {
                try {
                  const ttsResult = JSON.parse(result || '{}');
                  if (ttsResult.saved_to) {
                    audioFile = ttsResult.saved_to;
                    audioDuration = ttsResult.duration_estimate_ms;
                  }
                } catch { /* not JSON */ }
              }

              updatedTools[i] = {
                ...updatedTools[i],
                running: false,
                result,
                is_error: !!data.is_error,
                _imageUrls: imageUrls,
                _audioFile: audioFile,
                _audioDuration: audioDuration,
              };
              break;
            }
          }
          return { ...prev, toolCalls: updatedTools };
        });
        break;

      case 'phase':
        // Phase progress updates - can be used to show thinking/tool_use states
        if (data.phase === 'context_warning') {
          toaster.error((data.detail as string) || 'Context limit reached');
        } else if (data.phase === 'thinking') {
          // Update status message during thinking phase
          updateStreamingContent({ statusMessage: 'Thinking...' });
        } else if (data.phase === 'tool_use') {
          updateStreamingContent({ statusMessage: `Using ${(data.detail as string) || 'tool'}...` });
        }
        // Other phases (streaming, done) are internal progress - skip
        break;

      case 'command_result':
        // Command execution result - show as system message
        toaster.info((data.message as string) || 'Command executed');
        break;

      case 'canvas':
        // Agent presented an interactive canvas - add to messages
        updateStreamingContent({
          canvas: {
            id: data.canvas_id as string,
            title: (data.title as string) || 'Canvas',
            html: data.html as string,
          },
        });
        break;

      case 'step_status_change':
        // Workflow step status update
        {
          const stepData = (data.data as unknown as StepStatus) || (data as unknown as StepStatus);
          updateStepStatuses(stepData);
        }
        break;

      case 'execution_complete':
        // Clear step statuses when execution completes
        clearStepStatuses();
        break;

      case 'generation_complete':
      case 'response':
        // Backend sends 'response' when complete
        complete();
        clearStepStatuses();
        // Force refetch messages
        queryClient.invalidateQueries({ queryKey: ['messages', agentId, sessionId] });
        queryClient.invalidateQueries({ queryKey: ['sessions', agentId] });
        break;

      case 'silent_complete':
        // Agent intentionally chose not to reply
        complete();
        clearStepStatuses();
        break;

      case 'generation_error':
      case 'error':
        // Backend sends 'error' on failure
        setError((data.content as string) || (data.error as string) || t('chat.sendFailed'));
        clearStepStatuses();
        break;

      case 'connected':
      case 'agents_updated':
      case 'pong':
        // Ignore these non-chat messages
        break;

      default:
        // Unknown message type - ignore
        break;
    }
  }, [agentId, sessionId, queryClient, t, startStreaming, updateStreamingContent, complete, updateStepStatuses, clearStepStatuses, setError]);

  const { connectionState, sendMessage: sendWsMessage, isConnected, reconnect } = useSessionWebSocket({
    agentId,
    sessionId,
    onMessage: handleWebSocketMessage,
  });

  // ============================================
  // DATA FETCHING
  // ============================================

  // Fetch all agents
  const { data: agents = [], isLoading: isLoadingAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.listAgents(),
    staleTime: 30000,
  });

  // Fetch selected agent details
  const { data: selectedAgent } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => agentId ? api.getAgent(agentId) : null,
    enabled: !!agentId,
    staleTime: 30000,
  });

  // Fetch sessions for selected agent
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['sessions', agentId],
    queryFn: () => agentId ? api.listAgentSessions(agentId) : [],
    enabled: !!agentId,
    staleTime: 10000,
  });

  // Fetch messages for selected session
  const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', agentId, sessionId],
    queryFn: () => {
      if (!agentId || !sessionId) return { messages: [] };
      return api.getAgentSession(agentId, sessionId);
    },
    enabled: !!agentId && !!sessionId,
    staleTime: 1000,
  });

  // Fetch available models
  const { data: modelsData } = useQuery({
    queryKey: ['models'],
    queryFn: () => api.listModels(),
    staleTime: 60000,
  });

  // Format models for the switcher
  const availableModels = useMemo(() => {
    if (!modelsData?.models) return [];
    return modelsData.models.map((m: { id?: string; name?: string; model?: string; provider?: string }) => ({
      id: m.id || `${m.provider}/${m.model}`,
      name: m.name || m.model || m.id || 'Unknown',
      provider: m.provider,
    }));
  }, [modelsData]);

  // Get current agent's model
  const currentModelId = useMemo(() => {
    if (!selectedAgent) return undefined;
    return selectedAgent.model_name ||
      (selectedAgent.model ? `${selectedAgent.model.provider}/${selectedAgent.model.model}` : undefined);
  }, [selectedAgent]);

  // Extract messages array with stable unique IDs
  const messages = useMemo(() => {
    // Handle different possible API response structures
    let msgs: Message[] = [];
    if (Array.isArray(messagesData)) {
      msgs = messagesData as Message[];
    } else if (messagesData?.messages && Array.isArray(messagesData.messages)) {
      msgs = messagesData.messages as Message[];
    } else if (messagesData && typeof messagesData === 'object') {
      // Try to find any array property that might be messages
      const possibleArrays = Object.values(messagesData).filter(v => Array.isArray(v));
      if (possibleArrays.length > 0) {
        msgs = possibleArrays[0] as Message[];
      }
    }

    // Generate stable unique IDs for each message to ensure proper rendering
    // and sort by timestamp to ensure correct chronological order
    return msgs
      .map((m, idx) => ({
        ...m,
        id: m.id || `${sessionId}-${idx}-${m.timestamp || Date.now()}`,
      }))
      .sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeA - timeB;
      });
  }, [messagesData, sessionId]);

  // Group consecutive tool-calling assistant messages for rendering
  const groupedMessages = useMemo(() => {
    const result: React.ReactElement[] = [];
    let i = 0;
    let keyCounter = 0;

    const isAssistantWithTools = (msg: ExtendedMessage) => {
      return isAssistantRole(msg.role || '') && msg.tools && msg.tools.length > 0;
    };

    while (i < messages.length) {
      const message = messages[i];

      // Check if this is the start of a consecutive tool message group
      if (isAssistantWithTools(message)) {
        // Collect all consecutive tool messages
        const toolGroup: ExtendedMessage[] = [message];
        let j = i + 1;
        while (j < messages.length && isAssistantWithTools(messages[j])) {
          toolGroup.push(messages[j]);
          j++;
        }

        // Render as a single timeline group
        const isLastGroup = j >= messages.length && !pendingUserMessage && !isGenerating;
        result.push(
          <div key={`tool-group-${keyCounter++}`} className="py-2">
            <ToolCallsTimelineGroup
              messages={toolGroup}
              isLast={isLastGroup}
            />
          </div>
        );

        i = j; // Skip the grouped messages
      } else {
        // Regular message - render normally
        result.push(
          <div key={message.id || `msg-${keyCounter++}`} className="py-2">
            <MessageBubble
              message={message}
              isLast={false}
              partialGeneration={null}
            />
          </div>
        );
        i++;
      }
    }

    return result;
  }, [messages, pendingUserMessage, isGenerating]);

  // ============================================
  // MUTATIONS
  // ============================================

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: (data: { agent_id: string; title?: string }) =>
      api.createSession(data.agent_id, data.title),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', agentId] });
      setSearchParams({ agent: agentId!, session: session.session_id });
    },
    onError: () => {
      toaster.error(t('chat.createSessionFailed'));
    },
  });

  // Send message mutation (uses WebSocket for streaming)
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      if (!agentId) throw new Error('No agent selected');

      const wsMessage = {
        type: 'message',
        agent_id: agentId,
        session_id: sessionId,
        content,
      };

      // Send via WebSocket for streaming support
      const sent = sendWsMessage(wsMessage);

      if (!sent) {
        throw new Error('Failed to send message via WebSocket');
      }

      return { sent: true, content, timestamp: new Date().toISOString() };
    },
    onSuccess: (data) => {
      // Optimistically add the user message to the cache immediately
      if (data.content && agentId && sessionId) {
        queryClient.setQueryData(['messages', agentId, sessionId], (oldData: unknown) => {
          const oldMessages = oldData && typeof oldData === 'object' && oldData !== null && 'messages' in oldData
            ? (oldData as { messages: Message[] }).messages
            : [];
          const newMessage: Message = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content: data.content,
            timestamp: data.timestamp,
          };
          return {
            ...(oldData && typeof oldData === 'object' && oldData !== null ? oldData : {}),
            messages: [...oldMessages, newMessage],
          };
        });
      }
      // Also invalidate to fetch from server
      queryClient.invalidateQueries({ queryKey: ['messages', agentId, sessionId] });
    },
    onError: () => {
      toaster.error(t('chat.sendFailed'));
      setError(t('chat.sendFailed'));
    },
  });

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: (sid: string) => api.deleteSession(sid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', agentId] });
      if (sessionId) {
        setSearchParams({ agent: agentId! });
      }
      toaster.success(t('chat.sessionDeleted'));
    },
  });

  // Change model mutation
  const changeModelMutation = useMutation({
    mutationFn: ({ agentId, model }: { agentId: string; model: string }) =>
      api.setAgentModel(agentId, model),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
      toaster.success(t('chat.modelChanged'));
    },
    onError: () => {
      toaster.error(t('chat.modelChangeFailed'));
    },
  });

  // ============================================
  // HANDLERS
  // ============================================

  // Handle agent selection
  const handleSelectAgent = useCallback((id: string) => {
    setSearchParams({ agent: id });
  }, [setSearchParams]);

  // Switch session mutation
  const switchSessionMutation = useMutation({
    mutationFn: ({ agentId, sessionId }: { agentId: string; sessionId: string }) =>
      api.switchSession(agentId, sessionId),
    onMutate: (variables) => {
      // Reset generating state when switching sessions to avoid showing thinking indicator from previous session
      reset();
      // Immediately clear old messages for the NEW session to prevent showing stale data during transition
      queryClient.setQueryData(['messages', variables.agentId, variables.sessionId], { messages: [] });
    },
    onSuccess: (_, variables) => {
      // After switching, update URL to show the selected session
      setSearchParams({ agent: agentId!, session: variables.sessionId });
      // Refresh messages for the new session
      queryClient.invalidateQueries({ queryKey: ['messages', agentId, variables.sessionId] });
    },
    onError: () => {
      toaster.error(t('chat.switchSessionFailed'));
    },
  });

  // Handle session selection
  const handleSelectSession = useCallback((id: string) => {
    if (agentId && id !== sessionId) {
      // Switch session first, then update URL (backend always returns current session)
      switchSessionMutation.mutate({ agentId, sessionId: id });
    }
  }, [agentId, sessionId, switchSessionMutation]);

  // Handle create new session
  const handleCreateSession = useCallback(() => {
    if (!agentId) {
      // Select first agent if none selected
      if (agents.length > 0) {
        handleSelectAgent(agents[0].id);
      }
      return;
    }

    createSessionMutation.mutate({
      agent_id: agentId,
      title: t('chat.newSession'),
    });
  }, [agentId, agents, createSessionMutation, handleSelectAgent, t]);

  // Handle send message
  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim() || isGenerating) return;

    // Create session if none exists
    if (!sessionId && agentId) {
      pendingMessageRef.current = content;
      createSessionMutation.mutate(
        { agent_id: agentId },
        {
          onSuccess: (session) => {
            setSearchParams({ agent: agentId, session: session.session_id });
          },
        }
      );
      return;
    }

    if (agentId && sessionId) {
      // Optimistically add user message to UI immediately
      startPending(content.trim());
      sendMessageMutation.mutate({ content });
    }
  }, [agentId, sessionId, isGenerating, createSessionMutation, sendMessageMutation, setSearchParams]);

  // Handle pending message after session creation
  useEffect(() => {
    if (pendingMessageRef.current && sessionId && agentId && !isGenerating) {
      const content = pendingMessageRef.current;
      pendingMessageRef.current = null;
      sendMessageMutation.mutate({ content });
    }
  }, [sessionId, agentId, isGenerating, sendMessageMutation]);

  // Handle model change
  const handleModelChange = useCallback((model: string) => {
    if (agentId && model !== currentModelId) {
      changeModelMutation.mutate({ agentId, model });
    }
  }, [agentId, currentModelId, changeModelMutation]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 || pendingUserMessage || partialGeneration) {
      const timeout = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [messages.length, pendingUserMessage, partialGeneration, scrollToBottom]);

  // Select first agent if none selected and agents loaded
  useEffect(() => {
    if (!agentId && agents.length > 0) {
      handleSelectAgent(agents[0].id);
    }
  }, [agentId, agents, handleSelectAgent]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex h-full gap-3 p-3">
      {/* ============================================
          LEFT PANEL: Agent Card + Session Card (Bento Grid)
          ============================================ */}
      <aside className="w-72 flex flex-col gap-3">
        {/* Agent Card - Bento Card */}
        <div className="flex-shrink-0 max-h-[45%] flex flex-col rounded-2xl bg-white shadow-[0_8px_32px_rgba(139,92,246,0.08)] border border-white/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]/50">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] dark:text-gray-200">
              {t('chat.agents')}
            </h2>
            <span className="text-xs text-violet-500 font-medium bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">
              {agents.length}
            </span>
          </div>

          {/* Agent List */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-1">
                {isLoadingAgents ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                  </div>
                ) : agents.length === 0 ? (
                  <div className="text-center py-4 text-sm text-[var(--text-muted)]">
                    {t('chat.noAgents')}
                  </div>
                ) : (
                  agents.map((agent) => (
                    <AgentItem
                      key={agent.id}
                      agent={agent}
                      isSelected={agentId === agent.id}
                      onClick={() => handleSelectAgent(agent.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Session Card - Bento Card */}
        <div className="flex-1 flex flex-col rounded-2xl bg-white shadow-[0_8px_32px_rgba(139,92,246,0.08)] border border-white/50 overflow-hidden min-h-0">
          {/* Sessions Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]/50">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              {t('chat.sessions')}
            </h3>
            <motion.button
              onClick={handleCreateSession}
              disabled={!agentId || createSessionMutation.isPending}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                agentId
                  ? 'text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/30'
                  : 'text-[var(--text-muted)] cursor-not-allowed'
              )}
            >
              {createSessionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </motion.button>
          </div>

          {/* Sessions List */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {isLoadingSessions ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                </div>
              ) : !agentId ? (
                <div className="text-center py-8 text-sm text-[var(--text-muted)]">
                  {t('chat.selectAgentFirst')}
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-muted)] mb-3">{t('chat.noSessions')}</p>
                  <button
                    onClick={handleCreateSession}
                    className="text-sm text-violet-500 hover:text-[var(--primary)] font-medium"
                  >
                    {t('chat.createFirstSession')}
                  </button>
                </div>
              ) : (
                sessions.map((session) => (
                  <SessionItem
                    key={session.session_id}
                    session={session}
                    isSelected={sessionId === session.session_id}
                    onClick={() => handleSelectSession(session.session_id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* ============================================
          RIGHT PANEL: Chat Area (Bento Grid)
          ============================================ */}
      <main className="flex-1 flex flex-col gap-3">
        {/* Chat Header - Bento Card */}
        <div className="flex items-center justify-between px-6 py-3 rounded-2xl bg-white shadow-[0_4px_20px_rgba(139,92,246,0.06)] border border-white/50 z-10">
          <div className="flex items-center gap-3">
            {selectedAgent ? (
              <>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-[var(--text-primary)] dark:text-gray-100">
                    {selectedAgent.name}
                  </h1>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {selectedAgent.model_name || selectedAgent.model?.model || 'Default Model'}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-sm text-[var(--text-muted)]">{t('chat.noAgentSelected')}</div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Status */}
            {sessionId && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--surface-secondary)] dark:bg-gray-800">
                {connectionState === 'connected' ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600">
                      {t('chat.connected')}
                    </span>
                  </>
                ) : connectionState === 'reconnecting' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                    <span className="text-xs font-medium text-amber-600">
                      {t('chat.reconnecting')}
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      {t('chat.disconnected')}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => reconnect()}
                      className="ml-1 p-1 rounded-md hover:bg-[var(--surface-tertiary)] dark:hover:bg-gray-700 text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                      title={t('common.retry')}
                    >
                      <RotateCw className="w-3 h-3" />
                    </motion.button>
                  </>
                )}
              </div>
            )}
            {sessionId && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => deleteSessionMutation.mutate(sessionId)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title={t('chat.deleteSession')}
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Messages Area - Subtle Background */}
        <div className="flex-1 rounded-2xl bg-gradient-to-br from-violet-50/30 to-purple-50/20 border border-white/30 overflow-hidden relative">
          {!sessionId ? (
            <EmptyState onCreateSession={handleCreateSession} />
          ) : isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-3 text-violet-500">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm">{t('chat.loadingMessages')}</span>
              </div>
            </div>
          ) : messages.length === 0 && !partialGeneration ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-violet-300" />
                <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">{t('chat.startConversation')}</p>
              </div>
            </div>
          ) : (
            <div ref={messagesContainerRef} className="absolute inset-0 p-3 overflow-y-auto">
              <div className="space-y-1.5 min-h-full">
                {groupedMessages}
                {/* Pending user message (optimistic update) */}
                {pendingUserMessage && (
                  <div className="py-2">
                    <MessageBubble
                      message={{
                        id: pendingUserMessage.id,
                        role: 'user',
                        content: pendingUserMessage.content,
                        timestamp: pendingUserMessage.timestamp,
                      }}
                      isLast={true}
                      partialGeneration={null}
                    />
                  </div>
                )}
                {/* Thinking indicator - shown ONLY when generating with empty partialGeneration */}
                {isGenerating && partialGeneration && !partialGeneration.content && !partialGeneration.toolCalls?.length && (
                  <div className="py-2">
                    <motion.div
                      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex gap-2 flex-row"
                    >
                      {/* Avatar */}
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600"
                        style={{
                          boxShadow: '0 3px 0 0 #94a3b8, 0 4px 8px rgba(0,0,0,0.08)',
                          transform: 'translateY(-1px)'
                        }}
                      >
                        <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      {/* Thinking content */}
                      <div className="flex flex-col items-start">
                        <div
                          className="rounded-2xl px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200"
                          style={{
                            boxShadow: '3px 3px 0 0 #94a3b8, 4px 6px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
                            transform: 'translateY(-2px) translateX(-1px)'
                          }}
                        >
                          <div className="flex items-center gap-2 text-slate-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">思考中...</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
                {/* Streaming AI response */}
                {partialGeneration && partialGeneration.content && (
                  <div className="py-2">
                    <MessageBubble
                      message={{
                        id: 'streaming',
                        role: 'assistant',
                        content: partialGeneration.content || '',
                        timestamp: new Date().toISOString(),
                      }}
                      isLast={true}
                      partialGeneration={partialGeneration}
                      stepStatuses={stepStatuses}
                    />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Input Area - Bento Card */}
        <div className="p-4 rounded-2xl bg-white shadow-[0_-4px_20px_rgba(139,92,246,0.06)] border border-white/50">
          <ChatInput
            agentName={selectedAgent?.name || 'Agent'}
            isStreaming={isGenerating}
            onSend={handleSendMessage}
            onStop={complete}
            models={availableModels}
            selectedModel={currentModelId}
            onModelChange={handleModelChange}
            isChangingModel={changeModelMutation.isPending}
          />
        </div>
      </main>
    </div>
  );
}
