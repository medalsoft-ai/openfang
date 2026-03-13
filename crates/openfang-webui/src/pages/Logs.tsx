// Logs - System Console Style
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import { NeonText } from '@/components/motion/NeonText';
import { cyberColors } from '@/lib/animations';
import {
  Terminal, Loader2, Search, Pause, Play, Download, Trash2,
  RefreshCw, Shield, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditEntry {
  seq: number;
  timestamp: string;
  action: string;
  agent_id?: string;
  detail?: string;
  outcome?: string;
  prev_hash?: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  tip_hash?: string;
}

type ConnectionStatus = 'live' | 'paused' | 'polling' | 'disconnected';
type LogLevel = 'info' | 'warn' | 'error';

function classifyLevel(action: string): LogLevel {
  if (!action) return 'info';
  const a = action.toLowerCase();
  if (a.includes('error') || a.includes('fail') || a.includes('crash')) return 'error';
  if (a.includes('warn') || a.includes('deny') || a.includes('block')) return 'warn';
  return 'info';
}

function friendlyAction(action: string): string {
  if (!action) return 'Unknown';
  const map: Record<string, string> = {
    'AgentSpawn': 'Agent Created',
    'AgentKill': 'Agent Stopped',
    'AgentTerminated': 'Agent Stopped',
    'ToolInvoke': 'Tool Used',
    'ToolResult': 'Tool Completed',
    'AgentMessage': 'Message',
    'NetworkAccess': 'Network Access',
    'ShellExec': 'Shell Command',
    'FileAccess': 'File Access',
    'MemoryAccess': 'Memory Access',
    'AuthAttempt': 'Login Attempt',
    'AuthSuccess': 'Login Success',
    'AuthFailure': 'Login Failed',
    'CapabilityDenied': 'Permission Denied',
    'RateLimited': 'Rate Limited'
  };
  return map[action] || action.replace(/([A-Z])/g, ' $1').trim();
}

function getLevelColor(level: LogLevel): string {
  switch (level) {
    case 'error': return 'var(--neon-magenta)';
    case 'warn': return 'var(--neon-amber)';
    default: return 'var(--neon-cyan)';
  }
}

// Console log line
function LogLine({ entry, style }: { entry: AuditEntry; style: 'compact' | 'verbose' }) {
  const level = classifyLevel(entry.action);
  const color = getLevelColor(level);

  const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  if (style === 'compact') {
    return (
      <div className="flex items-center gap-3 py-0.5 font-mono text-xs hover:bg-[var(--surface-secondary)] px-2 rounded">
        <span className="text-[var(--text-muted)] shrink-0">{time}</span>
        <span
          className="uppercase text-[10px] px-1.5 py-0.5 rounded shrink-0"
          style={{ color, backgroundColor: `${color}15` }}
        >
          {level}
        </span>
        <span className="text-[var(--text-muted)] shrink-0">[{entry.action}]</span>
        <span className="text-[var(--text-secondary)] truncate">{entry.detail}</span>
      </div>
    );
  }

  return (
    <div className="py-2 px-3 border-b border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]"
    >
      <div className="flex items-center gap-2 mb-1"
      >
        <span className="text-[var(--text-muted)] text-xs font-mono">{time}</span>
        <span
          className="uppercase text-[10px] px-1.5 py-0.5 rounded"
          style={{ color, backgroundColor: `${color}15` }}
        >
          {friendlyAction(entry.action)}
        </span>
      </div>
      <div className="text-sm text-[var(--text-secondary)] pl-[72px]"
      >
        {entry.detail}
      </div>
      {entry.outcome && (
        <div className="text-xs text-[var(--text-muted)] pl-[72px] mt-0.5"
        >
          → {entry.outcome}
        </div>
      )}
    </div>
  );
}

export function Logs() {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'audit'>('live');
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [textFilter, setTextFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [streamPaused, setStreamPaused] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch audit entries
  const { data: auditData, isLoading: auditLoading, refetch: refetchAudit } = useQuery<AuditResponse>({
    queryKey: ['audit-entries'],
    queryFn: async () => {
      const res = await api.get<AuditResponse>('/api/audit/recent?n=200');
      return res;
    },
    enabled: activeTab === 'audit',
  });

  // Polling fallback
  const fetchLogs = useCallback(async () => {
    try {
      const data = await api.get<AuditResponse>('/api/audit/recent?n=200');
      setEntries(data.entries || []);
    } catch (e) {
      // Silent fail
    }
  }, []);

  const startPolling = useCallback(() => {
    setConnectionStatus('polling');
    fetchLogs();
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      if (!streamPaused && activeTab === 'live') {
        fetchLogs();
      }
    }, 2000);
  }, [fetchLogs, streamPaused, activeTab]);

  // SSE streaming
  const startStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    let url = '/api/logs/stream';
    const token = localStorage.getItem('openfang_token');
    if (token) {
      url += '?token=' + encodeURIComponent(token);
    }

    try {
      eventSourceRef.current = new EventSource(url);
    } catch (e) {
      startPolling();
      return;
    }

    eventSourceRef.current.onopen = () => {
      setConnectionStatus(streamPaused ? 'paused' : 'live');
    };

    eventSourceRef.current.onmessage = (event) => {
      if (streamPaused) return;
      try {
        const entry: AuditEntry = JSON.parse(event.data);
        setEntries((prev) => {
          if (prev.some((e) => e.seq === entry.seq)) return prev;
          const newEntries = [...prev, entry];
          if (newEntries.length > 500) {
            return newEntries.slice(newEntries.length - 500);
          }
          return newEntries;
        });
      } catch (e) {
        // Ignore
      }
    };

    eventSourceRef.current.onerror = () => {
      setConnectionStatus('disconnected');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      startPolling();
    };
  }, [streamPaused, startPolling]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  // Start/stop streaming based on tab
  useEffect(() => {
    if (activeTab === 'live') {
      startStreaming();
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
  }, [activeTab, startStreaming]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logContainerRef.current && activeTab === 'live') {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [entries, autoScroll, activeTab]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const entryLevel = classifyLevel(e.action);
      if (levelFilter !== 'all' && entryLevel !== levelFilter) return false;
      if (textFilter) {
        const q = textFilter.toLowerCase();
        const haystack = `${e.action} ${e.detail} ${e.agent_id}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [entries, levelFilter, textFilter]);

  const clearLogs = () => setEntries([]);

  const exportLogs = () => {
    const lines = filteredEntries.map((e) =>
      `${new Date(e.timestamp).toISOString()} [${e.action}] ${e.detail || ''}`
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openfang-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const verifyChain = useCallback(async () => {
    try {
      const data = await api.get<{ valid: boolean }>('/api/audit/verify');
      setChainValid(data.valid);
    } catch (e) {
      setChainValid(false);
    }
  }, []);

  return (
    <div className="h-full flex flex-col p-6"
    >
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col"
      >
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold"
            >
              <NeonText color="cyan">Logs</NeonText>
            </h1>
            <p className="text-[var(--text-muted)] mt-1"
            >
              System console and audit trail
            </p>
          </div>

          <div className="flex items-center gap-2"
          >
            {/* Connection status */}
            {activeTab === 'live' && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono uppercase"
                style={{
                  backgroundColor: connectionStatus === 'live' ? 'rgba(0, 255, 136, 0.1)' :
                                   connectionStatus === 'paused' ? 'rgba(255, 184, 0, 0.1)' :
                                   'rgba(107, 114, 128, 0.1)',
                  borderColor: connectionStatus === 'live' ? 'rgba(0, 255, 136, 0.3)' :
                              connectionStatus === 'paused' ? 'rgba(255, 184, 0, 0.3)' :
                              'rgba(107, 114, 128, 0.3)',
                  color: connectionStatus === 'live' ? 'var(--neon-green)' :
                        connectionStatus === 'paused' ? 'var(--neon-amber)' :
                        'var(--chart-gray)'
                }}
              >
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  connectionStatus === 'live' && 'animate-pulse'
                )}
                style={{
                  backgroundColor: connectionStatus === 'live' ? 'var(--neon-green)' :
                                  connectionStatus === 'paused' ? 'var(--neon-amber)' :
                                  'var(--chart-gray)'
                }}
                />
                {connectionStatus}
              </div>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="flex gap-1 mb-4 bg-[var(--surface-secondary)] rounded-xl p-1 w-fit"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => setActiveTab('live')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'live'
                ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            <Terminal className="w-4 h-4 inline mr-2" />
            Live Console
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'audit'
                ? 'bg-[var(--neon-green)]/20 text-[var(--neon-green)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Audit Trail
          </button>
        </motion.div>

        {/* Toolbar */}
        <motion.div
          className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-xl bg-[var(--text-primary)]/[0.02] border border-[var(--border-subtle)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Level filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'all')}
            className="bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="all" className="bg-[var(--surface-primary)]">All Levels</option>
            <option value="info" className="bg-[var(--surface-primary)]" style={{ color: 'var(--neon-cyan)' }}>INFO</option>
            <option value="warn" className="bg-[var(--surface-primary)]" style={{ color: 'var(--neon-amber)' }}>WARN</option>
            <option value="error" className="bg-[var(--surface-primary)]" style={{ color: 'var(--neon-magenta)' }}>ERROR</option>
          </select>

          {/* Search */}
          <div className="relative flex-1 max-w-xs"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={textFilter}
              onChange={(e) => setTextFilter(e.target.value)}
              placeholder="Filter..."
              className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-primary)]/30"
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          {activeTab === 'live' && (
            <>
              <button
                onClick={() => setStreamPaused(!streamPaused)}
                className="p-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
                title={streamPaused ? 'Resume' : 'Pause'}
              >
                {streamPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              <button
                onClick={clearLogs}
                className="p-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
                title="Clear"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {activeTab === 'audit' && (
            <button
              onClick={verifyChain}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] text-sm"
            >
              <Shield className="w-4 h-4" />
              Verify Chain
              {chainValid !== null && (
                chainValid ? (
                  <CheckCircle className="w-4 h-4 text-[var(--neon-green)]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[var(--neon-magenta)]" />
                )
              )}
            </button>
          )}
          <button
            onClick={exportLogs}
            className="p-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
            title="Export"
          >
            <Download className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Log Console */}
        <motion.div
          className="flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--void)]/50 overflow-hidden flex flex-col"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Console header */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border-default)] bg-[var(--text-primary)]/[0.02]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[var(--neon-magenta)]/50" />
              <div className="w-3 h-3 rounded-full bg-[var(--neon-amber)]/50" />
              <div className="w-3 h-3 rounded-full bg-[var(--neon-green)]/50" />
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono ml-2">
              {activeTab === 'live' ? 'system.log' : 'audit.log'}
            </span>
            <span className="text-xs text-[var(--text-muted)] font-mono ml-auto">
              {filteredEntries.length} entries
            </span>
          </div>

          {/* Log content */}
          <div
            ref={logContainerRef}
            className="flex-1 overflow-y-auto p-2 font-mono"
            onMouseEnter={() => setAutoScroll(false)}
            onMouseLeave={() => setAutoScroll(true)}
          >
            {activeTab === 'audit' && auditLoading ? (
              <div className="flex items-center justify-center h-32"
              >
                <Loader2 className="w-6 h-6 text-[var(--neon-green)] animate-spin" />
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)]"
              >
                <Terminal className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No log entries</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredEntries.map((entry) => (
                  <LogLine
                    key={entry.seq}
                    entry={entry}
                    style={activeTab === 'live' ? 'compact' : 'verbose'}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Logs;
