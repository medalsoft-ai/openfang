import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  ChevronDown,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolCall } from '@/api/types';

interface ToolCallsTimelineProps {
  toolCalls: ToolCall[];
}

interface ToolState {
  status: 'pending' | 'running' | 'success' | 'error';
  timestamp: Date;
  duration?: number;
}

// Get tool icon based on name
function getToolIcon(name: string) {
  if (name.includes('read') || name.includes('file')) return Terminal;
  if (name.includes('search')) return Zap;
  return Wrench;
}

// Get tool display name
function getToolDisplayName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// Format duration in ms to human readable
function formatDuration(ms?: number): string {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// Single Tool Card (for expanded view) - flat design, no 3D
function ToolDetailCard({
  tool,
  state,
  index,
  isExpanded,
  onToggle,
}: {
  tool: ToolCall;
  state: ToolState;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = getToolIcon(tool.name);

  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
    },
    running: {
      icon: Play,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    success: {
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
    },
    error: {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
    },
  }[state.status];

  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={cn(
        'relative rounded-xl border overflow-hidden transition-all duration-200',
        statusConfig.bgColor,
        statusConfig.borderColor,
        isExpanded && 'ring-2 ring-violet-500/20'
      )}
    >
      {/* Tool Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        {/* Step Number */}
        <div
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
            state.status === 'running'
              ? 'bg-blue-500 text-white animate-pulse'
              : state.status === 'success'
                ? 'bg-emerald-500 text-white'
                : state.status === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-amber-500 text-white'
          )}
        >
          {index + 1}
        </div>

        {/* Icon */}
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            'bg-white/50 dark:bg-black/20'
          )}
        >
          <Icon className={cn('w-4 h-4', statusConfig.color)} />
        </div>

        {/* Tool Name & Status */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {getToolDisplayName(tool.name)}
            </span>
            {state.duration && state.status !== 'pending' && (
              <span className="text-[10px] text-gray-400">{formatDuration(state.duration)}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <StatusIcon className={cn('w-3 h-3', statusConfig.color)} />
            <span className={cn('text-xs', statusConfig.color)}>
              {state.status === 'pending' && 'Waiting...'}
              {state.status === 'running' && 'Running...'}
              {state.status === 'success' && 'Completed'}
              {state.status === 'error' && 'Failed'}
            </span>
          </div>
        </div>

        {/* Expand Toggle */}
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-400 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-inherit"
          >
            <div className="p-4 space-y-3">
              {/* Input */}
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Input
                </span>
                <pre className="mt-1.5 text-xs bg-black/5 dark:bg-white/5 p-3 rounded-lg overflow-x-auto max-w-full whitespace-pre-wrap break-all">
                  {JSON.stringify(tool.input, null, 2)}
                </pre>
              </div>

              {/* Output / Result */}
              {tool.result && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </span>
                  <pre className="mt-1.5 text-xs bg-black/5 dark:bg-white/5 p-3 rounded-lg overflow-x-auto max-w-full whitespace-pre-wrap break-all">
                    {typeof tool.result === 'string'
                      ? tool.result
                      : JSON.stringify(tool.result, null, 2)}
                  </pre>
                </div>
              )}

              {/* Error */}
              {tool.is_error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-red-700 dark:text-red-300">Tool execution failed</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Timeline Header (collapsed view) - flat design, no 3D
function TimelineHeader({
  toolCalls,
  states,
  isExpanded,
  onToggle,
}: {
  toolCalls: ToolCall[];
  states: ToolState[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const completedCount = states.filter((s) => s.status === 'success').length;
  const errorCount = states.filter((s) => s.status === 'error').length;
  const runningCount = states.filter((s) => s.status === 'running').length;
  const totalDuration = states.reduce((acc, s) => acc + (s.duration || 0), 0);

  // Get status color
  const getStatusColor = () => {
    if (errorCount > 0) return 'text-red-500';
    if (runningCount > 0) return 'text-blue-500';
    if (completedCount === toolCalls.length) return 'text-emerald-500';
    return 'text-amber-500';
  };

  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-4 px-4 py-3',
        'bg-white/50 dark:bg-gray-800/50',
        'hover:bg-white dark:hover:bg-gray-800',
        'transition-all duration-200'
      )}
    >
      {/* Progress Circle */}
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
          {/* Background circle */}
          <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-200 dark:text-gray-700" />
          {/* Progress circle */}
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(completedCount / toolCalls.length) * 100} 100`}
            className={getStatusColor()}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {completedCount}/{toolCalls.length}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {toolCalls.length} Tools Executed
          </span>
          {totalDuration > 0 && (
            <span className="text-[10px] text-gray-400">{formatDuration(totalDuration)}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {runningCount > 0 && (
            <span className="text-blue-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {runningCount} running
            </span>
          )}
          {completedCount > 0 && (
            <span className="text-emerald-500">{completedCount} completed</span>
          )}
          {errorCount > 0 && <span className="text-red-500">{errorCount} failed</span>}
          {runningCount === 0 && completedCount === 0 && errorCount === 0 && (
            <span className="text-amber-500">Pending execution</span>
          )}
        </div>
      </div>

      {/* Toggle Icon */}
      <ChevronRight
        className={cn(
          'w-5 h-5 text-gray-400 transition-transform duration-200',
          isExpanded && 'rotate-90'
        )}
      />
    </button>
  );
}

// Main Timeline Component
export function ToolCallsTimeline({ toolCalls }: ToolCallsTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<number, boolean>>({});

  // Generate tool states based on tool calls
  const toolStates: ToolState[] = useMemo(() => {
    return toolCalls.map((tool, index) => {
      let status: ToolState['status'] = 'pending';
      if (tool.is_error) status = 'error';
      else if (tool.result) status = 'success';
      else if (tool.running) status = 'running';
      else if (index < toolCalls.findIndex((t) => t.running)) status = 'success';

      return {
        status,
        timestamp: new Date(Date.now() - (toolCalls.length - index) * 1000),
        duration: tool.result ? Math.random() * 1000 + 500 : undefined, // Mock duration for now
      };
    });
  }, [toolCalls]);

  const toggleTool = (index: number) => {
    setExpandedTools((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Get overall status for container styling
  const getOverallStatus = () => {
    const hasError = toolStates.some((s) => s.status === 'error');
    const hasRunning = toolStates.some((s) => s.status === 'running');
    const allSuccess = toolStates.every((s) => s.status === 'success');
    if (hasError) return { color: '#6366f1', soft: 'rgba(99,102,241,0.1)' };
    if (hasRunning) return { color: '#3b82f6', soft: 'rgba(59,130,246,0.1)' };
    if (allSuccess) return { color: '#10b981', soft: 'rgba(16,185,129,0.1)' };
    return { color: '#6366f1', soft: 'rgba(99,102,241,0.1)' };
  };

  const containerStatus = getOverallStatus();

  const [container3DStyle, setContainer3DStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    const baseShadow = isDark
      ? `3px 3px 0 0 ${containerStatus.color}50, 4px 6px 12px ${containerStatus.soft}`
      : `3px 3px 0 0 ${containerStatus.color}40, 4px 6px 12px ${containerStatus.soft}`;
    const innerHighlight = isDark
      ? 'inset 0 1px 0 rgba(255,255,255,0.1)'
      : 'inset 0 1px 0 rgba(255,255,255,0.6)';
    setContainer3DStyle({
      boxShadow: `${baseShadow}, ${innerHighlight}`,
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: isDark ? `${containerStatus.color}60` : `${containerStatus.color}30`,
      transform: 'translateY(-2px) translateX(-1px)',
    });
  }, [containerStatus.color, containerStatus.soft]);

  return (
    <div
      className={cn(
        'mt-3 rounded-2xl border overflow-hidden',
        'bg-white dark:bg-slate-800',
        'transition-all duration-200'
      )}
      style={container3DStyle}
    >
      {/* Timeline Header */}
      <TimelineHeader
        toolCalls={toolCalls}
        states={toolStates}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />

      {/* Expanded Timeline */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-t border-violet-100 dark:border-violet-800/30"
          >
            <div className="p-4">
              {/* Timeline Line */}
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[1.15rem] top-4 bottom-4 w-0.5 bg-gradient-to-b from-violet-200 via-purple-200 to-violet-200 dark:from-violet-800 dark:via-purple-800 dark:to-violet-800" />

                {/* Tool Steps */}
                <div className="space-y-3">
                  {toolCalls.map((tool, index) => (
                    <div key={`${tool.id}-${index}`} className="relative pl-10">
                      {/* Timeline Node */}
                      <div className="absolute left-0 top-3">
                        <div
                          className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center',
                            'border-2 transition-all duration-300',
                            toolStates[index].status === 'running'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                              : toolStates[index].status === 'success'
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                                : toolStates[index].status === 'error'
                                  ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                                  : 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                          )}
                        >
                          {toolStates[index].status === 'running' ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                            </motion.div>
                          ) : toolStates[index].status === 'success' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : toolStates[index].status === 'error' ? (
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                          )}
                        </div>
                      </div>

                      {/* Tool Content */}
                      <ToolDetailCard
                        tool={tool}
                        state={toolStates[index]}
                        index={index}
                        isExpanded={expandedTools[index] || false}
                        onToggle={() => toggleTool(index)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
