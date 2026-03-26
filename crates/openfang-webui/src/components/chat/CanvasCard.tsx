// CanvasCard - Renders interactive canvas HTML content from canvas_present tool
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Maximize2,
  Minimize2,
  ExternalLink,
  Palette,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CanvasCardProps {
  id: string;
  title: string;
  html: string;
  isExpanded?: boolean;
  status?: 'idle' | 'loading' | 'success' | 'error';
}

export function CanvasCard({
  id,
  title,
  html,
  isExpanded: initialExpanded = false,
  status = 'success'
}: CanvasCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  // Prepare HTML content with proper sandboxing
  const sandboxedHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 16px;
      background: transparent;
      color: #1a1d23;
    }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
  </style>
</head>
<body>
  ${html}
</body>
</html>
  `.trim();

  const handleOpenInNewTab = () => {
    const blob = new Blob([sandboxedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--neon-amber)]" />;
      case 'error':
        return <X className="w-3.5 h-3.5 text-[var(--neon-magenta)]" />;
      case 'success':
        return <Check className="w-3.5 h-3.5 text-[var(--neon-green)]" />;
      default:
        return <Palette className="w-3.5 h-3.5 text-[var(--neon-cyan)]" />;
    }
  };

  // Fullscreen overlay
  if (isFullscreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && setIsFullscreen(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col w-full max-w-5xl h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] bg-[var(--surface-secondary)]">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium text-sm text-[var(--text-primary)]">{title}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleOpenInNewTab}
                className="p-2 hover:bg-[var(--surface-tertiary)] rounded-lg transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 hover:bg-[var(--surface-tertiary)] rounded-lg transition-colors"
                title="Exit fullscreen"
              >
                <Minimize2 className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>
          </div>
          {/* Content */}
          <div className="flex-1 bg-white">
            <iframe
              ref={iframeRef}
              srcDoc={sandboxedHtml}
              className="w-full h-full border-0"
              sandbox="allow-scripts"
              title={title}
            />
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="canvas-card my-3 rounded-2xl border-2 border-violet-100 dark:border-violet-900/50 overflow-hidden bg-white dark:bg-slate-800 shadow-[0_4px_20px_rgba(139,92,246,0.08)]"
      data-canvas-id={id}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-violet-50/50 to-purple-50/50 dark:from-violet-900/20 dark:to-purple-900/20 border-b border-violet-100 dark:border-violet-900/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Palette className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-medium text-sm text-violet-900 dark:text-violet-100">{title}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleOpenInNewTab}
            className="p-1.5 hover:bg-violet-100 dark:hover:bg-violet-800/50 rounded-lg transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </button>
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 hover:bg-violet-100 dark:hover:bg-violet-800/50 rounded-lg transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </button>
        </div>
      </div>

      {/* Canvas Content */}
      <div
        className={cn(
          'bg-white dark:bg-slate-900 transition-all duration-300',
          isExpanded ? 'h-auto' : 'max-h-80 overflow-hidden relative'
        )}
      >
        <iframe
          ref={iframeRef}
          srcDoc={sandboxedHtml}
          className="w-full min-h-[160px] border-0"
          sandbox="allow-scripts"
          title={title}
        />

        {/* Fade overlay when collapsed */}
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Expand/Collapse button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-2 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors border-t border-violet-100 dark:border-violet-900/30"
      >
        {isExpanded ? 'Show less' : 'Show more'}
      </button>
    </motion.div>
  );
}

// Container for canvas cards
interface CanvasContainerProps {
  canvases: Array<{
    id: string;
    title: string;
    html: string;
  }>;
}

export function CanvasContainer({ canvases }: CanvasContainerProps) {
  if (!canvases || canvases.length === 0) return null;

  return (
    <div className="canvas-container space-y-2">
      {canvases.map((canvas, index) => (
        <CanvasCard
          key={canvas.id}
          id={canvas.id}
          title={canvas.title}
          html={canvas.html}
          isExpanded={index === canvases.length - 1} // Expand the last one by default
        />
      ))}
    </div>
  );
}
