// ChatV2 - Redesigned with improved message bubbles and input
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Virtuoso } from 'react-virtuoso';
import { api, wsManager } from '@/api/client';
import type { Agent, Session, Message, ToolCall } from '@/api/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { ChatInput } from '@/components/chat/ChatInput';
import { useTranslation } from 'react-i18next';
import {
  Send, Bot, User, Plus, MessageSquare,
  Loader2, Sparkles, Clock, MoreHorizontal,
  ChevronDown, Paperclip, X, Brain,
  Command, Settings, ArrowRight, Copy, Check,
  Cpu,
  Wifi, WifiOff, Loader,
  Wrench, AlertCircle, Image, Music,
  ChevronRight
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toaster } from '@/lib/toast';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

// Extended Tool interface for UI state
interface ExtendedTool {
  id: string;
  name: string;
  running: boolean;
  expanded: boolean;
  input: string;
  result: string;
  is_error: boolean;
  _imageUrls?: string[];
  _audioFile?: string;
  _audioDuration?: number;
  _toolTextDetected?: boolean;
}

interface ExtendedMessage extends Message {
  isStreaming?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  tools?: ExtendedTool[];
  thinking?: boolean;
  _reasoning?: string;
  meta?: string;
  canvasData?: {
    title: string;
    canvasId: string;
    html: string;
  };
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
  const { t } = useTranslation();
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
        {agent.description || agent.profile || t('chat.startConversation')}
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
        {t('chat.startConversation')}
      </motion.button>
    </motion.div>
  );
}

// Tool Card component for displaying tool calls
function ToolCard({ tool }: { tool: ExtendedTool }) {
  const [expanded, setExpanded] = useState(tool.expanded);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'my-2 rounded-lg border overflow-hidden',
        tool.is_error
          ? 'border-red-500/30 bg-red-500/5'
          : tool.running
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-green-500/30 bg-green-500/5'
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Wrench className={cn(
            'w-4 h-4',
            tool.is_error ? 'text-red-400' : tool.running ? 'text-amber-400' : 'text-green-400'
          )} />
          <span className="text-sm font-medium text-[var(--soft-text-primary)]">
            {tool.name}
          </span>
          {tool.running && (
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
          )}
          {tool.is_error && (
            <AlertCircle className="w-3 h-3 text-red-400" />
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-[var(--soft-text-muted)]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--soft-text-muted)]" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-[var(--soft-divider)]">
          {/* Input params */}
          {tool.input && (
            <div className="mt-2">
              <div className="text-xs text-[var(--soft-text-muted)] mb-1">Input:</div>
              <pre className="text-xs bg-[var(--soft-surface)] rounded p-2 overflow-x-auto text-[var(--soft-text-secondary)]">
                {tool.input}
              </pre>
            </div>
          )}

          {/* Result */}
          {!tool.running && tool.result && (
            <div className="mt-2">
              <div className={cn(
                'text-xs mb-1',
                tool.is_error ? 'text-red-400' : 'text-green-400'
              )}>
                {tool.is_error ? 'Error:' : 'Result:'}
              </div>
              {tool._imageUrls && tool._imageUrls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tool._imageUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Generated ${idx + 1}`}
                      className="max-w-[200px] max-h-[200px] rounded-lg border border-[var(--soft-divider)]"
                    />
                  ))}
                </div>
              ) : tool._audioFile ? (
                <div className="flex items-center gap-2 text-sm text-[var(--soft-text-secondary)]">
                  <Music className="w-4 h-4" />
                  <span>Audio saved to: {tool._audioFile}</span>
                  {tool._audioDuration && (
                    <span className="text-xs text-[var(--soft-text-muted)]">
                      (~{Math.round(tool._audioDuration / 1000)}s)
                    </span>
                  )}
                </div>
              ) : (
                <pre className={cn(
                  'text-xs rounded p-2 overflow-x-auto',
                  tool.is_error
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-green-500/10 text-green-400'
                )}>
                  {tool.result}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Canvas component for rendering agent canvas
function CanvasPanel({ title, canvasId, html }: { title: string; canvasId: string; html: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-2 rounded-lg border border-[var(--soft-divider)] overflow-hidden"
    >
      <div className="px-3 py-2 bg-[var(--soft-surface)] border-b border-[var(--soft-divider)] flex justify-between items-center">
        <span className="text-sm font-medium text-[var(--soft-text-primary)]">{title || 'Canvas'}</span>
        <span className="text-xs text-[var(--soft-text-muted)] font-mono">{canvasId.substring(0, 8)}</span>
      </div>
      <iframe
        sandbox="allow-scripts"
        srcDoc={html}
        className="w-full min-h-[300px] border-none bg-white"
        loading="lazy"
        title={canvasId}
      />
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
        // Handle pre tags to avoid nested pre issues
        pre({ children }) {
          return <>{children}</>;
        },
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          // Ensure children is converted to string safely
          const code = String(children ?? '').replace(/\n$/, '');

          if (match) {
            return <CodeBlock code={code} language={match[1]} />;
          }

          return (
            <code
              className="px-1.5 py-0.5 rounded-md bg-[var(--soft-surface)] text-[var(--soft-text-primary)] text-sm font-mono"
              {...props}
            >
              {code}
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
function ToolCallCard({ tool }: { tool: ExtendedTool }) {
  const [expanded, setExpanded] = useState(tool.expanded ?? false);

  // Determine status from tool fields
  const getStatus = () => {
    if (tool.is_error) return 'error';
    if (tool.running) return 'running';
    if (tool.result !== undefined && tool.result !== '') return 'completed';
    return 'pending';
  };

  const status = getStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mt-2 rounded-xl border overflow-hidden",
        tool.is_error ? "border-red-500/30 bg-red-500/5" :
        tool.running ? "border-amber-500/30 bg-amber-500/5" :
        "border-green-500/30 bg-green-500/5"
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--soft-surface)]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {tool.is_error ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : tool.running ? (
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          ) : (
            <Wrench className="w-4 h-4 text-green-400" />
          )}
          <span className="text-sm font-medium text-[var(--soft-text-primary)]">
            {tool.name}
          </span>
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full",
            status === 'completed' && "bg-green-500/10 text-green-500",
            status === 'running' && "bg-amber-500/10 text-amber-500",
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
              {/* Input params */}
              {tool.input && (
                <div>
                  <div className="text-xs text-[var(--soft-text-muted)] mb-1">Input</div>
                  <pre className="text-xs bg-[var(--soft-surface)] rounded-lg p-2 overflow-x-auto font-mono text-[var(--soft-text-secondary)]">
                    {typeof tool.input === 'string' ? tool.input : JSON.stringify(tool.input, null, 2)}
                  </pre>
                </div>
              )}

              {/* Result */}
              {!tool.running && tool.result && (
                <div>
                  <div className={cn(
                    "text-xs mb-1",
                    tool.is_error ? "text-red-400" : "text-green-400"
                  )}>
                    {tool.is_error ? 'Error:' : 'Result:'}
                  </div>

                  {/* Special rendering for image generation */}
                  {tool._imageUrls && tool._imageUrls.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {tool._imageUrls.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Generated ${idx + 1}`}
                          className="max-w-[200px] max-h-[200px] rounded-lg border border-[var(--soft-divider)]"
                        />
                      ))}
                    </div>
                  ) : tool._audioFile ? (
                    /* Special rendering for text-to-speech */
                    <div className="flex items-center gap-2 text-sm text-[var(--soft-text-secondary)] bg-[var(--soft-surface)] rounded-lg p-2">
                      <Music className="w-4 h-4" />
                      <span>Audio saved to: {tool._audioFile}</span>
                      {tool._audioDuration && (
                        <span className="text-xs text-[var(--soft-text-muted)]">
                          (~{Math.round(tool._audioDuration / 1000)}s)
                        </span>
                      )}
                    </div>
                  ) : (
                    <pre className={cn(
                      "text-xs rounded-lg p-2 overflow-x-auto font-mono",
                      tool.is_error
                        ? "bg-red-500/10 text-red-400"
                        : "bg-green-500/10 text-green-400"
                    )}>
                      {typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result, null, 2)}
                    </pre>
                  )}
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
  // Ensure content is always a string (handle object case from backend)
  const rawContent = message.content;
  const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent || '');

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
              ) : message.thinking ? (
                /* Thinking/Processing state */
                <div className="flex items-center gap-2 py-3 px-1 text-[var(--soft-text-muted)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{content}</span>
                </div>
              ) : message.canvasData ? (
                /* Canvas rendering */
                <CanvasPanel
                  title={message.canvasData.title}
                  canvasId={message.canvasData.canvasId}
                  html={message.canvasData.html}
                />
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
          {message.cost != null && (
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
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Local storage for last selected agent
  const [lastSelectedAgentId, setLastSelectedAgentId] = useLocalStorage<string | null>('chatv2-last-agent', null);

  // Wait for auth to be ready before making API calls
  const authReady = useAuthStore((state) => state.authReady);

  // Get agent from URL or localStorage
  const agentIdFromUrl = searchParams.get('agent');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agentIdFromUrl || lastSelectedAgentId);

  // UI State - input moved to ChatInput component for performance
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  // WebSocket connection state
  const [wsConnectionState, setWsConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const wsMessageHandlerRef = useRef<((data: unknown) => void) | null>(null);

  // Model change dialog state
  const [modelChangeOpen, setModelChangeOpen] = useState(false);
  const [newModelValue, setNewModelValue] = useState('');
  const [modelChanging, setModelChanging] = useState(false);

  // Fetch agents
  const { data: agents = [], isLoading: isLoadingAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: api.listAgents,
    enabled: authReady,
  });

  // Fetch available models
  const { data: modelsData } = useQuery({
    queryKey: ['models'],
    queryFn: () => api.listModels(),
    enabled: authReady,
  });

  const models = useMemo(() => {
    if (!modelsData) return [];
    if (Array.isArray(modelsData)) return modelsData;
    return (modelsData as { models?: unknown[] }).models || [];
  }, [modelsData]);

  // Get selected agent
  const selectedAgent = useMemo(() => {
    return agents.find(a => a.id === selectedAgentId);
  }, [agents, selectedAgentId]);

  // Fetch sessions for selected agent
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['agent-sessions', selectedAgentId],
    queryFn: () => selectedAgentId ? api.listAgentSessions(selectedAgentId) : Promise.resolve([]),
    enabled: authReady && !!selectedAgentId,
  });

  // Fetch messages for current session
  const { data: sessionMessages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['session-messages', selectedAgentId, currentSession?.session_id],
    queryFn: async () => {
      if (!selectedAgentId || !currentSession?.session_id) return [];
      const res = await api.getAgentSession(selectedAgentId, currentSession.session_id);
      return res.messages as ExtendedMessage[];
    },
    enabled: authReady && !!selectedAgentId && !!currentSession?.session_id,
  });

  // Update messages when session data changes
  const prevSessionMessagesRef = useRef<ExtendedMessage[]>([]);
  useEffect(() => {
    const hasChanged = sessionMessages.length !== prevSessionMessagesRef.current.length ||
      JSON.stringify(sessionMessages.map(m => m.id)) !== JSON.stringify(prevSessionMessagesRef.current.map(m => m.id));

    if (hasChanged) {
      prevSessionMessagesRef.current = sessionMessages;
      setMessages(sessionMessages);
    }
  }, [sessionMessages]);

  // Auto-select first session
  const hasAutoSelectedSession = useRef(false);
  useEffect(() => {
    if (sessions.length > 0 && !hasAutoSelectedSession.current && selectedAgentId) {
      hasAutoSelectedSession.current = true;
      const sorted = [...sessions].sort((a, b) =>
        new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
      );
      const firstSession = sorted[0];
      setCurrentSession(firstSession);
      // Notify backend to switch to this session
      api.switchSession(selectedAgentId, firstSession.session_id).catch(() => {
        // Silently fail, messages will still be fetched via query param
      });
    }
    return () => {
      if (sessions.length === 0) {
        hasAutoSelectedSession.current = false;
      }
    };
  }, [sessions, selectedAgentId]);

  // Scroll to bottom
  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    if (messages.length !== prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Sync URL agent param to state (for when user clicks aside agent)
  const lastUrlAgentRef = useRef<string | null>(null);
  useEffect(() => {
    const agentFromUrl = searchParams.get('agent');
    // Only process if URL agent changed (not when selectedAgentId changes)
    if (agentFromUrl !== lastUrlAgentRef.current) {
      lastUrlAgentRef.current = agentFromUrl;
      if (agentFromUrl && agentFromUrl !== selectedAgentId) {
        setSelectedAgentId(agentFromUrl);
        setCurrentSession(null);
        setMessages([]);
        hasAutoSelectedSession.current = false;
        prevSessionMessagesRef.current = [];
        // Invalidate queries to force re-fetch for new agent
        queryClient.invalidateQueries({ queryKey: ['agent-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['session-messages'] });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

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

  // WebSocket connection management
  useEffect(() => {
    if (!selectedAgentId || !authReady) return;

    // Store the message handler so we can update it when streaming state changes
    const messageHandler = (data: unknown) => {
      if (typeof data === 'object' && data !== null) {
        const msg = data as {
          type?: string;
          content?: string | unknown;
          done?: boolean;
          error?: string;
          input_tokens?: number;
          output_tokens?: number;
          cost_usd?: number;
          tools?: ToolCall[];
          // Extended message fields
          tool?: string;
          input?: string;
          result?: string;
          is_error?: boolean;
          state?: string;
          phase?: string;
          detail?: string;
          context_pressure?: string;
          level?: string;
          title?: string;
          canvas_id?: string;
          html?: string;
          message?: string;
          iterations?: number;
          fallback_model?: string;
        };

        if (msg.error) {
          toaster.error(msg.error);
          setIsStreaming(false);
          return;
        }

        // Align with Alpine: use switch-case, unrecognized types are silently ignored
        switch (msg.type) {
          case 'connected':
            break;

          case 'typing':
            if (msg.state === 'start') {
              setMessages(prev => {
                const last = prev[prev.length - 1];
                // Align with Alpine: check for any streaming/indicator message to prevent duplicates
                if (last && (last.thinking || last.isStreaming)) return prev;
                return [...prev, {
                  id: `typing-${Date.now()}`,
                  role: 'assistant',
                  content: 'Processing...',
                  thinking: true,
                  isStreaming: true,
                  ts: Date.now(),
                }];
              });
            } else if (msg.state === 'tool') {
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.thinking) {
                  return [...prev.slice(0, -1), { ...last, content: `Using ${msg.tool || 'tool'}...` }];
                }
                return prev;
              });
            }
            break;

          case 'phase':
            if (msg.phase === 'streaming' || msg.phase === 'done') break;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (!last || (!last.thinking && !last.isStreaming)) return prev;
              if (msg.phase === 'context_warning') {
                return [...prev, {
                  id: `warning-${Date.now()}`,
                  role: 'system',
                  content: msg.detail || 'Context limit reached.',
                  ts: Date.now(),
                }];
              }
              let phaseText = t('chat.thinking');
              if (msg.phase === 'tool_use') {
                phaseText = `Using ${msg.detail || 'tool'}...`;
              } else if (msg.phase === 'thinking') {
                phaseText = t('chat.thinking');
              } else if (msg.detail) {
                phaseText = msg.detail;
              }
              return [...prev.slice(0, -1), { ...last, content: phaseText }];
            });
            break;

          case 'chunk':
          case 'text_delta':
            if (!msg.content) break;
            {
              const chunkContent = typeof msg.content === 'string' ? msg.content : String(msg.content);
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'assistant' && (last.isStreaming || last.thinking)) {
                  const currentText = (last.content || '') + chunkContent;
                  const fcMatch = currentText.match(/(\w+)<\/function[=>]|\<function=(\w+)>/);
                  if (fcMatch && !last.tools?.some(t => t._toolTextDetected)) {
                    const toolName = fcMatch[1] || fcMatch[2];
                    const fcIndex = currentText.search(/\w+<\/function[=>]|\<function=\w+>/);
                    const textBefore = currentText.substring(0, fcIndex).trim();
                    const fcPart = currentText.substring(fcIndex);
                    const inputMatch = fcPart.match(/[=,>]\s*(\{[\s\S]*)/);
                    const newTool: ExtendedTool = {
                      id: `${toolName}-txt-${Date.now()}`,
                      name: toolName,
                      running: true,
                      expanded: true,
                      input: inputMatch ? inputMatch[1].replace(/<\/function>?\s*$/, '').trim() : '',
                      result: '',
                      is_error: false,
                      _toolTextDetected: true,
                    };
                    return [...prev.slice(0, -1), {
                      ...last,
                      content: textBefore,
                      thinking: false,
                      tools: [...(last.tools || []), newTool],
                    }];
                  }
                  return [...prev.slice(0, -1), { ...last, content: currentText, thinking: false }];
                }
                return [...prev, {
                  id: `stream-${Date.now()}`,
                  role: 'assistant',
                  content: chunkContent,
                  isStreaming: true,
                  ts: Date.now(),
                }];
              });
            }
            break;

          case 'tool_start':
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && (last.isStreaming || last.thinking)) {
                const newTool: ExtendedTool = {
                  id: `${msg.tool}-${Date.now()}`,
                  name: msg.tool || 'unknown',
                  running: true,
                  expanded: true,
                  input: '',
                  result: '',
                  is_error: false,
                };
                return [...prev.slice(0, -1), {
                  ...last,
                  thinking: false,
                  tools: [...(last.tools || []), newTool],
                }];
              }
              return prev;
            });
            break;

          case 'tool_end':
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.tools) {
                const updatedTools = [...last.tools];
                for (let i = updatedTools.length - 1; i >= 0; i--) {
                  if (updatedTools[i].name === msg.tool && updatedTools[i].running) {
                    updatedTools[i] = { ...updatedTools[i], input: msg.input || '' };
                    break;
                  }
                }
                return [...prev.slice(0, -1), { ...last, tools: updatedTools }];
              }
              return prev;
            });
            break;

          case 'tool_result':
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.tools) {
                const updatedTools = [...last.tools];
                for (let i = updatedTools.length - 1; i >= 0; i--) {
                  if (updatedTools[i].name === msg.tool && updatedTools[i].running) {
                    const tool = updatedTools[i];
                    const result = msg.result || '';
                    let imageUrls: string[] | undefined;
                    let audioFile: string | undefined;
                    let audioDuration: number | undefined;
                    if ((msg.tool === 'image_generate' || msg.tool === 'browser_screenshot') && !msg.is_error) {
                      try {
                        const parsed = JSON.parse(result);
                        imageUrls = parsed.image_urls;
                      } catch { /* not JSON */ }
                    }
                    if (msg.tool === 'text_to_speech' && !msg.is_error) {
                      try {
                        const parsed = JSON.parse(result);
                        audioFile = parsed.saved_to;
                        audioDuration = parsed.duration_estimate_ms;
                      } catch { /* not JSON */ }
                    }
                    updatedTools[i] = {
                      ...tool,
                      running: false,
                      result,
                      is_error: msg.is_error || false,
                      _imageUrls: imageUrls,
                      _audioFile: audioFile,
                      _audioDuration: audioDuration,
                    };
                    break;
                  }
                }
                return [...prev.slice(0, -1), { ...last, tools: updatedTools }];
              }
              return prev;
            });
            break;

          case 'canvas':
            setMessages(prev => [...prev, {
              id: `canvas-${Date.now()}`,
              role: 'assistant',
              content: '__CANVAS__',
              canvasData: {
                title: msg.title || 'Canvas',
                canvasId: msg.canvas_id || '',
                html: msg.html || '',
              },
              ts: Date.now(),
            }]);
            break;

          case 'command_result':
            setMessages(prev => [...prev, {
              id: `cmd-${Date.now()}`,
              role: 'system',
              content: msg.message || 'Command executed.',
              ts: Date.now(),
            }]);
            break;

          case 'response':
            {
              const responseContent = typeof msg.content === 'string' ? msg.content : '';
              setMessages(prev => {
                const streamingMessages = prev.filter(m => (m.isStreaming || m.thinking) && m.role === 'assistant');
                const streamedText = streamingMessages.map(m => m.content).join('');
                const streamedTools = streamingMessages.flatMap(m => m.tools || []);
                const nonStreaming = prev.filter(m => !m.isStreaming && !m.thinking);
                let finalText = responseContent.trim() ? responseContent : streamedText;
                finalText = finalText.replace(/\w+<\/function[=,>][\s\S]*?<\/function>/g, '');
                finalText = finalText.replace(/<function=\w+>[\s\S]*?<\/function>/g, '');
                const finalTools = streamedTools.map(t => {
                  if (t.id?.includes('-txt-') && !t.result) {
                    return {
                      ...t,
                      running: false,
                      result: 'Model attempted this call as text (not executed via tool system)',
                      is_error: true,
                    };
                  }
                  return { ...t, running: false };
                });
                const metaParts: string[] = [];
                if (msg.input_tokens) metaParts.push(`${msg.input_tokens} in`);
                if (msg.output_tokens) metaParts.push(`${msg.output_tokens} out`);
                if (msg.cost_usd != null) metaParts.push(`$${msg.cost_usd.toFixed(4)}`);
                if (msg.iterations) metaParts.push(`${msg.iterations} iter`);
                if (msg.fallback_model) metaParts.push(`fallback: ${msg.fallback_model}`);
                return [...nonStreaming, {
                  id: `response-${Date.now()}`,
                  role: 'assistant',
                  content: finalText,
                  isStreaming: false,
                  inputTokens: msg.input_tokens,
                  outputTokens: msg.output_tokens,
                  cost: msg.cost_usd,
                  tools: finalTools.length > 0 ? finalTools : undefined,
                  meta: metaParts.join(' | '),
                  ts: Date.now(),
                }];
              });
              setIsStreaming(false);
              queryClient.invalidateQueries({ queryKey: ['agent-sessions', selectedAgentId] });
            }
            break;

          case 'silent_complete':
            setMessages(prev => prev.filter(m => !m.isStreaming && !m.thinking));
            setIsStreaming(false);
            break;

          case 'error':
            {
              let errorMessage: string;
              if (typeof msg.content === 'string') {
                errorMessage = msg.content;
              } else if (msg.content && typeof msg.content === 'object') {
                const nestedError = (msg.content as { error?: { message?: string; code?: string } }).error;
                errorMessage = nestedError?.message || JSON.stringify(msg.content);
              } else {
                errorMessage = 'Unknown error';
              }
              setMessages(prev => {
                const filtered = prev.filter(m => !(m.isStreaming && m.role === 'assistant') && !(m.role === 'assistant' && !m.content));
                return [...filtered, {
                  id: `error-${Date.now()}`,
                  role: 'system',
                  content: `Error: ${errorMessage}`,
                  isStreaming: false,
                  ts: Date.now(),
                }];
              });
              toaster.error(errorMessage);
              setIsStreaming(false);
            }
            break;

          case 'agents_updated':
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            break;

          case 'pong':
            break;

          // Unrecognized types are silently ignored (like Alpine)
          default:
            break;
        }
      }
    };

    wsMessageHandlerRef.current = messageHandler;

    wsManager.connect(
      selectedAgentId,
      messageHandler,
      {
        onStateChange: (state) => {
          setWsConnectionState(state);
        }
      }
    );

    return () => {
      wsManager.disconnect();
    };
  }, [selectedAgentId, authReady, queryClient]);

  // Handle agent selection
  const handleAgentSelect = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentSession(null);
    setMessages([]);
    hasAutoSelectedSession.current = false;
    prevSessionMessagesRef.current = [];
    // Clear old queries to prevent stale data
    queryClient.removeQueries({ queryKey: ['session-messages'] });
    queryClient.removeQueries({ queryKey: ['agent-sessions'] });
  }, [queryClient]);

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
      return api.createSession(selectedAgentId, t('chat.newChat'));
    },
    onSuccess: (session) => {
      if (session) {
        setCurrentSession(session);
        setMessages([]);
        queryClient.invalidateQueries({ queryKey: ['agent-sessions', selectedAgentId] });
      }
    },
  });

  // Handle model change
  const handleModelChange = useCallback(async () => {
    if (!selectedAgent || !newModelValue.trim()) return;
    setModelChanging(true);
    try {
      await api.setAgentModel(selectedAgent.id, newModelValue.trim());
      toaster.success('Model changed (memory reset)');
      setModelChangeOpen(false);
      // Refresh agents list
      await queryClient.invalidateQueries({ queryKey: ['agents'] });
    } catch (err) {
      toaster.error('Failed to change model: ' + (err as Error).message);
    } finally {
      setModelChanging(false);
    }
  }, [selectedAgent, newModelValue, queryClient]);

  // Open model change dialog
  const openModelChange = useCallback(() => {
    if (!selectedAgent) return;
    const currentModel = `${selectedAgent.model_provider || ''}/${selectedAgent.model_name || ''}`.replace(/^\//, '').replace(/\/$/, '');
    setNewModelValue(currentModel);
    setModelChangeOpen(true);
  }, [selectedAgent]);

  // Handle send message - now receives content from ChatInput component
  const handleSend = useCallback(async (content: string) => {
    if (!content || !selectedAgentId || isStreaming) return;

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
      // Try WebSocket first
      const wsPayload: { type: string; content: string; session_id?: string } = {
        type: 'message',
        content
      };
      if (currentSession?.session_id) {
        wsPayload.session_id = currentSession.session_id;
      }

      if (wsManager.send(wsPayload)) {
        // WebSocket send success - message will stream back via onMessage handler
        // Add placeholder assistant message
        setMessages(prev => [...prev, {
          id: `streaming-${Date.now()}`,
          role: 'assistant',
          content: '',
          isStreaming: true,
          ts: Date.now(),
        }]);
        return;
      }

      // WebSocket not available - use HTTP fallback
      toaster.info('Using HTTP mode (no streaming)');

      const response = await api.sendMessage(selectedAgentId, content, currentSession?.session_id) as {
        response?: string;
        error?: string;
        session_id?: string;
      };

      if (response.error) {
        throw new Error(response.error);
      }

      setMessages(prev => [...prev, {
        id: `http-${Date.now()}`,
        role: 'assistant',
        content: response.response || '',
        isStreaming: false,
        ts: Date.now(),
      }]);

      // Update session if new one was created
      if (response.session_id && response.session_id !== currentSession?.session_id) {
        queryClient.invalidateQueries({ queryKey: ['agent-sessions', selectedAgentId] });
      }

      setIsStreaming(false);

    } catch (error) {
      toaster.error(error instanceof Error ? error.message : 'Failed to send message');
      setIsStreaming(false);
    }
  }, [selectedAgentId, currentSession, isStreaming, queryClient]);

  // If no agent selected, show agent selector
  if (!selectedAgentId) {
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
      {/* Loading state when agent data is not ready */}
      {!selectedAgent ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[var(--soft-blue)] animate-spin" />
        </div>
      ) : (
        <>
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
              {/* Model indicator */}
              <button
                onClick={openModelChange}
                className="flex items-center gap-1 text-xs text-[var(--soft-text-muted)] hover:text-[var(--soft-text-secondary)] transition-colors"
                title="Click to change model"
              >
                <Cpu className="w-3 h-3" />
                <span className="max-w-[120px] truncate">
                  {selectedAgent.model_provider || 'default'}/{selectedAgent.model_name || 'auto'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Connection Status Badge */}
          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors',
              wsConnectionState === 'connected'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : wsConnectionState === 'reconnecting'
                ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
            )}
            title={wsConnectionState === 'connected' ? t('chat.online') : wsConnectionState === 'connecting' ? t('chat.connecting') : wsConnectionState === 'reconnecting' ? t('chat.connecting') : t('chat.offline')}
          >
            {wsConnectionState === 'connected' ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>WS</span>
              </>
            ) : wsConnectionState === 'reconnecting' || wsConnectionState === 'connecting' ? (
              <>
                <Loader className="w-3.5 h-3.5 animate-spin" />
                <span>{wsConnectionState === 'connecting' ? '...' : '...'}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>HTTP</span>
              </>
            )}
          </div>

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
            onClick={openModelChange}
            className="p-2 rounded-lg hover:bg-[var(--soft-surface)] text-[var(--soft-text-secondary)] transition-colors"
            whileTap={{ scale: 0.95 }}
            title="Change Model"
          >
            <Cpu className="w-5 h-5" />
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

      {/* Messages Area - Virtual List */}
      <div className="flex-1 overflow-hidden relative">
        {messages.length === 0 && !isLoadingMessages ? (
          <WelcomeScreen
            agent={selectedAgent}
            onStartChat={() => {}}
          />
        ) : (
          <Virtuoso
            key={selectedAgentId}
            data={messages}
            className="h-full"
            followOutput="smooth"
            initialTopMostItemIndex={Math.max(0, messages.length - 1)}
            itemContent={(_index, message) => {
              // Align with Alpine: simple role mapping (backend returns "User"/"Assistant"/"System")
              const roleLower = message.role?.toLowerCase() || '';
              const isUser = roleLower === 'user';
              return (
                <MessageBubble
                  message={message}
                  isUser={isUser}
                  agent={selectedAgent}
                />
              );
            }}
          />
        )}
      </div>

      {/* Input Area - Isolated component for performance */}
      <ChatInput
        agentName={selectedAgent.name}
        isStreaming={isStreaming}
        onSend={handleSend}
        onStop={() => {
          wsManager.disconnect();
          setIsStreaming(false);
        }}
      />

      {/* Model Change Dialog */}
      <AnimatePresence>
        {modelChangeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setModelChangeOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--soft-bg)] border border-[var(--soft-divider)] rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--soft-text-primary)]">
                  Change Model
                </h3>
                <button
                  onClick={() => setModelChangeOpen(false)}
                  className="p-2 rounded-lg hover:bg-[var(--soft-surface)] transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--soft-text-muted)]" />
                </button>
              </div>

              <p className="text-sm text-[var(--soft-text-muted)] mb-4">
                Enter new model in format: <code className="bg-[var(--soft-surface)] px-1 rounded">provider/model</code> or just <code className="bg-[var(--soft-surface)] px-1 rounded">model</code>
              </p>

              <div className="space-y-3 mb-6">
                <input
                  type="text"
                  value={newModelValue}
                  onChange={(e) => setNewModelValue(e.target.value)}
                  placeholder="e.g. groq/llama-3.3-70b-versatile"
                  className="w-full bg-[var(--soft-surface)] border border-[var(--soft-divider)] rounded-xl px-4 py-3 text-[var(--soft-text-primary)] font-mono text-sm focus:outline-none focus:border-[var(--soft-blue)] transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newModelValue.trim() && !modelChanging) {
                      handleModelChange();
                    }
                  }}
                />

                {/* Quick select from available models */}
                <div className="max-h-[200px] overflow-y-auto border border-[var(--soft-divider)] rounded-xl">
                  {models.filter((m: { available?: boolean }) => m.available).length === 0 ? (
                    <div className="p-3 text-sm text-[var(--soft-text-muted)]">No available models</div>
                  ) : (
                    models.filter((m: { available?: boolean }) => m.available).map((model: { id: string; provider?: string; display_name?: string }) => (
                      <button
                        key={model.id}
                        onClick={() => setNewModelValue(`${model.provider}/${model.id}`)}
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm hover:bg-[var(--soft-surface)] transition-colors',
                          newModelValue === `${model.provider}/${model.id}`
                            ? 'bg-[var(--soft-blue)]/10 text-[var(--soft-blue)]'
                            : 'text-[var(--soft-text-secondary)]'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span>{model.display_name || model.id}</span>
                          <span className="text-xs text-[var(--soft-text-muted)]">{model.provider}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setModelChangeOpen(false)}
                  className="flex-1 py-2 px-4 rounded-xl border border-[var(--soft-divider)] text-[var(--soft-text-secondary)] hover:bg-[var(--soft-surface)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModelChange}
                  disabled={!newModelValue.trim() || modelChanging}
                  className={cn(
                    'flex-1 py-2 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2',
                    !newModelValue.trim() || modelChanging
                      ? 'bg-[var(--soft-surface)] text-[var(--soft-text-muted)] cursor-not-allowed'
                      : 'bg-[var(--soft-blue)] text-white hover:bg-[var(--soft-blue-dark)]'
                  )}
                >
                  {modelChanging && <Loader2 className="w-4 h-4 animate-spin" />}
                  {modelChanging ? 'Changing...' : 'Change Model'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}

export default ChatV2;
