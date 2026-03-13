// MessageContent - Unified message content renderer (Markdown, Text, HTML, Tools, Images)
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MarkdownContent } from './MarkdownContent';
import { ToolCallsContainer } from './ToolCallCard';
import { ImageAttachments } from './ImageAttachments';
import type { Message, ToolCall } from '@/api/types';

interface MessageContentProps {
  message: Message;
  searchQuery?: string;
  isStreaming?: boolean;
}

// Escape HTML for plain text display
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Highlight search matches
function highlightSearch(text: string, query: string): string {
  if (!query || query.trim().length < 2) return escapeHtml(text);
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return escapeHtml(text).replace(
    regex,
    '<mark style="background:var(--neon-amber);color:var(--void);border-radius:2px;padding:0 2px">$1</mark>'
  );
}

export function MessageContent({ message, searchQuery, isStreaming }: MessageContentProps) {
  const content = message.content || message.text || '';
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant' || message.role === 'agent';
  const isSystem = message.role === 'system';
  const isHtml = message.isHtml;

  // Determine if we should render markdown
  const shouldRenderMarkdown = useMemo(() => {
    // Only render markdown for assistant/agent/system messages
    if (isUser) return false;
    // Don't render markdown for HTML content
    if (isHtml) return false;
    // Don't render markdown during streaming (wait for completion)
    if (message.thinking) return false;
    return true;
  }, [isUser, isHtml, message.thinking]);

  // Process content based on type
  const renderedContent = useMemo(() => {
    if (!content) return null;

    // HTML content
    if (isHtml) {
      return (
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{
            __html: searchQuery ? highlightSearch(content, searchQuery) : content
          }}
        />
      );
    }

    // Markdown content (for assistant/agent/system)
    if (shouldRenderMarkdown) {
      return <MarkdownContent content={content} searchQuery={searchQuery} />;
    }

    // Plain text (user messages or fallback)
    return (
      <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
        {searchQuery ? (
          <span
            dangerouslySetInnerHTML={{
              __html: highlightSearch(content, searchQuery)
            }}
          />
        ) : (
          content
        )}
      </div>
    );
  }, [content, isHtml, shouldRenderMarkdown, searchQuery]);

  return (
    <div className="message-content">
      {/* Main content */}
      {content && (
        <div
          className={`
            p-3 rounded-lg
            ${isUser
              ? 'bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]'
              : isSystem
                ? 'bg-[var(--neon-amber)]/5 border border-[var(--neon-amber)]/20 text-[var(--neon-amber)]/80'
                : 'bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)]'
            }
            ${isStreaming ? 'animate-pulse' : ''}
          `}
        >
          {renderedContent}

          {/* Streaming cursor */}
          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="inline-block w-2 h-4 bg-[var(--neon-green)] ml-1 align-middle"
            />
          )}
        </div>
      )}

      {/* Image attachments */}
      <ImageAttachments images={message.images || []} />

      {/* Tool calls */}
      <ToolCallsContainer tools={message.tools || []} />
    </div>
  );
}
