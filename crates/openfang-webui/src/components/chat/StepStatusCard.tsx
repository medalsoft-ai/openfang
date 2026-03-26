// StepStatusCard - Renders workflow step execution status updates
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Check,
  X,
  ChevronRight,
  Play,
  Clock,
  RotateCcw,
  AlertCircle,
  Workflow,
  ListOrdered,
  Pause
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepStatus {
  execution_id: string;
  hand_id?: string;
  agent_id?: string;
  step_id: string;
  step_name?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting' | 'skipped';
  timestamp?: string;
  output?: unknown;
  error?: string;
  retry_count?: number;
}

interface StepStatusCardProps {
  step: StepStatus;
  index?: number;
  isCompact?: boolean;
}

// Get icon for step status
function getStatusIcon(status: StepStatus['status'], isSmall = false) {
  const sizeClass = isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4';

  switch (status) {
    case 'running':
      return <Loader2 className={cn(sizeClass, 'animate-spin text-[var(--neon-amber)]')} />;
    case 'completed':
      return <Check className={cn(sizeClass, 'text-[var(--neon-green)]')} />;
    case 'failed':
      return <X className={cn(sizeClass, 'text-[var(--neon-magenta)]')} />;
    case 'waiting':
      return <Pause className={cn(sizeClass, 'text-[var(--neon-cyan)]')} />;
    case 'skipped':
      return <ListOrdered className={cn(sizeClass, 'text-[var(--text-muted)]')} />;
    case 'pending':
    default:
      return <Clock className={cn(sizeClass, 'text-[var(--text-muted)]')} />;
  }
}

// Get status color classes
function getStatusColor(status: StepStatus['status']) {
  switch (status) {
    case 'running':
      return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300';
    case 'completed':
      return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300';
    case 'failed':
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
    case 'waiting':
      return 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300';
    case 'skipped':
      return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-500';
    case 'pending':
    default:
      return 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500';
  }
}

// Format timestamp to relative time
function formatRelativeTime(timestamp: string | undefined): string {
  if (!timestamp) return 'just now';
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 5) return 'just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return date.toLocaleDateString();
  } catch {
    return timestamp;
  }
}

export function StepStatusCard({ step, index = 0, isCompact = false }: StepStatusCardProps) {
  const [expanded, setExpanded] = useState(step.status === 'failed');

  const displayName = step.step_name || step.step_id;
  const hasOutput = step.output !== undefined && step.output !== null;
  const hasError = step.error && step.error.length > 0;
  const showRetry = (step.retry_count || 0) > 0;

  if (isCompact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05, duration: 0.2 }}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm',
          getStatusColor(step.status)
        )}
      >
        {getStatusIcon(step.status, true)}
        <span className="font-medium truncate flex-1">{displayName}</span>
        <span className="text-xs opacity-70">{formatRelativeTime(step.timestamp)}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className={cn(
        'step-card my-2 rounded-2xl border-2 overflow-hidden',
        getStatusColor(step.status)
      )}
      data-step-id={step.step_id}
      data-execution-id={step.execution_id}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        {/* Status icon */}
        <div className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
          step.status === 'running' && 'bg-amber-100 dark:bg-amber-900/40',
          step.status === 'completed' && 'bg-green-100 dark:bg-green-900/40',
          step.status === 'failed' && 'bg-red-100 dark:bg-red-900/40',
          step.status === 'waiting' && 'bg-violet-100 dark:bg-violet-900/40',
          step.status === 'pending' && 'bg-slate-100 dark:bg-slate-800',
        )}>
          {getStatusIcon(step.status)}
        </div>

        {/* Step info */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{displayName}</span>
            {showRetry && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                Retry {step.retry_count}
              </span>
            )}
          </div>
          <div className="text-xs opacity-70">
            {step.status === 'running' ? 'Executing...' : formatRelativeTime(step.timestamp)}
          </div>
        </div>

        {/* Expand chevron */}
        <ChevronRight
          className={cn(
            'w-4 h-4 transition-transform duration-200',
            expanded && 'rotate-90'
          )}
        />
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (hasOutput || hasError) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-current/10"
          >
            <div className="p-4 space-y-3 bg-black/5 dark:bg-white/5">
              {/* Error display */}
              {hasError && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider opacity-70 mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Error
                  </div>
                  <pre className="text-xs font-mono p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 overflow-x-auto whitespace-pre-wrap">
                    {step.error}
                  </pre>
                </div>
              )}

              {/* Output display */}
              {hasOutput && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider opacity-70 mb-1">
                    Output
                  </div>
                  <pre className="text-xs font-mono p-3 rounded-xl bg-black/5 dark:bg-white/10 border border-current/10 overflow-x-auto whitespace-pre-wrap">
                    {typeof step.output === 'string'
                      ? step.output
                      : JSON.stringify(step.output, null, 2)}
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

// Container for multiple step status cards - shows as a workflow timeline
interface StepStatusContainerProps {
  steps: StepStatus[];
  title?: string;
  isComplete?: boolean;
}

export function StepStatusContainer({
  steps,
  title = 'Workflow Execution',
  isComplete = false
}: StepStatusContainerProps) {
  if (!steps || steps.length === 0) return null;

  const runningCount = steps.filter(s => s.status === 'running').length;
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const failedCount = steps.filter(s => s.status === 'failed').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="workflow-container my-4 rounded-2xl border-2 border-violet-100 dark:border-violet-900/50 overflow-hidden bg-white dark:bg-slate-800 shadow-[0_4px_20px_rgba(139,92,246,0.08)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-50/50 to-purple-50/50 dark:from-violet-900/20 dark:to-purple-900/20 border-b border-violet-100 dark:border-violet-900/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Workflow className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-sm text-violet-900 dark:text-violet-100">{title}</span>
            <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400">
              <span>{completedCount}/{steps.length} completed</span>
              {runningCount > 0 && (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {runningCount} running
                </span>
              )}
              {failedCount > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  {failedCount} failed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Overall status */}
        {isComplete ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
            <Check className="w-3.5 h-3.5" />
            Complete
          </div>
        ) : runningCount > 0 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Running
          </div>
        ) : null}
      </div>

      {/* Steps list */}
      <div className="p-3 space-y-1">
        {steps.map((step, index) => (
          <StepStatusCard
            key={step.step_id}
            step={step}
            index={index}
            isCompact={steps.length > 3}
          />
        ))}
      </div>
    </motion.div>
  );
}
