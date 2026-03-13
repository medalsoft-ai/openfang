// ToolCallCard - Cyberpunk styled tool execution card
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Check,
  X,
  ChevronRight,
  Wrench,
  Image as ImageIcon,
  Music,
  Terminal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolCall } from '@/api/types';

interface ToolCallCardProps {
  tool: ToolCall;
  index?: number;
}

// Tool icon mapping
function getToolIcon(name: string) {
  const iconMap: Record<string, React.ReactNode> = {
    'image': <ImageIcon className="w-4 h-4" />,
    'generate_image': <ImageIcon className="w-4 h-4" />,
    'tts': <Music className="w-4 h-4" />,
    'audio': <Music className="w-4 h-4" />,
    'shell': <Terminal className="w-4 h-4" />,
    'bash': <Terminal className="w-4 h-4" />,
    'python': <Terminal className="w-4 h-4" />,
  };

  // Match by partial name
  for (const [key, icon] of Object.entries(iconMap)) {
    if (name.toLowerCase().includes(key)) return icon;
  }

  return <Wrench className="w-4 h-4" />;
}

// Format JSON for display
function formatToolJson(data: unknown): string {
  if (!data) return '';
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return data;
    }
  }
  return JSON.stringify(data, null, 2);
}

export function ToolCallCard({ tool, index = 0 }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(tool.expanded ?? false);

  const isRunning = tool.running;
  const isError = tool.is_error;
  const hasResult = tool.result !== undefined && tool.result !== null;

  // Get status display
  const getStatusDisplay = () => {
    if (isRunning) return { text: 'running...', color: 'text-[var(--neon-amber)]' };
    if (isError) return { text: 'error', color: 'text-[var(--neon-magenta)]' };
    if (hasResult) {
      const resultLen = String(tool.result).length;
      if (resultLen > 500) {
        return { text: `${Math.round(resultLen / 1024)}KB`, color: 'text-[var(--neon-green)]' };
      }
      return { text: 'done', color: 'text-[var(--neon-green)]' };
    }
    return { text: 'done', color: 'text-[var(--neon-green)]' };
  };

  const status = getStatusDisplay();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className={cn(
        'tool-card my-2 rounded-lg border overflow-hidden',
        isError
          ? 'bg-[var(--neon-magenta)]/5 border-[var(--neon-magenta)]/30'
          : 'bg-[var(--surface-secondary)] border-[var(--border-default)]'
      )}
      data-tool={tool.name}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-tertiary)]/50 transition-colors"
      >
        {/* Status indicator */}
        {isRunning ? (
          <Loader2 className="w-4 h-4 animate-spin text-[var(--neon-amber)]" />
        ) : isError ? (
          <X className="w-4 h-4 text-[var(--neon-magenta)]" />
        ) : (
          <Check className="w-4 h-4 text-[var(--neon-green)]" />
        )}

        {/* Tool icon */}
        <span className={cn(
          'w-6 h-6 rounded flex items-center justify-center text-xs',
          isError ? 'text-[var(--neon-magenta)]' : 'text-[var(--neon-cyan)]'
        )}>
          {getToolIcon(tool.name)}
        </span>

        {/* Tool name */}
        <span className={cn(
          'font-mono text-sm',
          isError ? 'text-[var(--neon-magenta)]' : 'text-[var(--text-primary)]'
        )}>
          {tool.name}
        </span>

        {/* Status text */}
        <span className={cn('text-xs ml-auto', status.color)}>
          {status.text}
        </span>

        {/* Expand chevron */}
        <ChevronRight
          className={cn(
            'w-4 h-4 text-[var(--text-muted)] transition-transform duration-150',
            expanded && 'rotate-90'
          )}
        />
      </button>

      {/* Generated images */}
      {tool._imageUrls && tool._imageUrls.length > 0 && (
        <div className="px-3 py-2 flex flex-wrap gap-2 border-t border-[var(--border-subtle)]">
          {tool._imageUrls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={url}
                alt="Generated"
                className="max-w-[200px] max-h-[200px] rounded-lg border border-[var(--border-default)] hover:border-[var(--neon-cyan)] transition-colors cursor-pointer"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}

      {/* Audio player */}
      {tool._audioFile && (
        <div className="px-3 py-2 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 p-2 rounded bg-[var(--surface-tertiary)]">
            <Music className="w-4 h-4 text-[var(--neon-cyan)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              Audio: {tool._audioFile.split('/').pop()}
            </span>
            {tool._audioDuration && (
              <span className="text-xs text-[var(--text-muted)]">
                ~{Math.round(tool._audioDuration / 1000)}s
              </span>
            )}
          </div>
        </div>
      )}

      {/* Expandable content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-[var(--border-subtle)]"
          >
            <div className="p-3 space-y-3">
              {/* Input section */}
              {tool.input !== undefined && tool.input !== null && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Input
                  </div>
                  <pre className="text-xs font-mono bg-[var(--void)] p-2 rounded border border-[var(--border-default)] text-[var(--text-secondary)] overflow-x-auto">
                    {formatToolJson(tool.input)}
                  </pre>
                </div>
              )}

              {/* Result section */}
              {hasResult && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                      Result
                    </div>
                    {String(tool.result).length > 200 && (
                      <span className="text-[10px] text-[var(--text-muted)]">
                        ({String(tool.result).length} chars)
                      </span>
                    )}
                  </div>
                  <pre
                    className={cn(
                      'text-xs font-mono p-2 rounded border overflow-x-auto whitespace-pre-wrap break-all',
                      isError
                        ? 'bg-[var(--neon-magenta)]/10 border-[var(--neon-magenta)]/30 text-[var(--neon-magenta)]'
                        : 'bg-[var(--void)] border-[var(--border-default)] text-[var(--neon-green)]'
                    )}
                  >
                    {formatToolJson(tool.result)}
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

// Container for multiple tool calls
interface ToolCallsContainerProps {
  tools: ToolCall[];
}

export function ToolCallsContainer({ tools }: ToolCallsContainerProps) {
  if (!tools || tools.length === 0) return null;

  return (
    <div className="space-y-1 mt-2">
      {tools.map((tool, index) => (
        <ToolCallCard key={tool.id || index} tool={tool} index={index} />
      ))}
    </div>
  );
}
