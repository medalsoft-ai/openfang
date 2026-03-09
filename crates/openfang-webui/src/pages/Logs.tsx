// OpenFang Logs Page — Real-time log viewer (SSE streaming + polling fallback) + Audit Trail tab
// 100% Alpine.js feature parity
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/api/client';
import type { Agent } from '@/api/types';
import { Loader2, Search, Pause, Play, Download, Trash2, RefreshCw, Shield, CheckCircle, XCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

// Types matching Alpine implementation
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

interface VerifyResponse {
  valid: boolean;
  entries?: number;
}

type ConnectionStatus = 'live' | 'paused' | 'polling' | 'disconnected';

// Helper functions (matching Alpine)
function classifyLevel(action: string): 'info' | 'warn' | 'error' {
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

function getLevelBadgeClass(level: string): string {
  switch (level) {
    case 'error':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'warn':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'info':
    default:
      return 'bg-blue-100 text-blue-800 border-blue-300';
  }
}

function getConnectionBadgeClass(status: ConnectionStatus): string {
  switch (status) {
    case 'live':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'paused':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'polling':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'disconnected':
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

export function Logs() {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'live' | 'audit'>('live');

  // Live logs state
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [textFilter, setTextFilter] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [hovering, setHovering] = useState<boolean>(false);
  const [streamPaused, setStreamPaused] = useState<boolean>(false);
  const [streamConnected, setStreamConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  // Audit state
  const [filterAction, setFilterAction] = useState<string>('all');
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [tipHash, setTipHash] = useState<string>('');

  // SSE ref
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch agents for name resolution
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => api.listAgents(),
  });

  // Fetch audit entries for audit tab
  const {
    data: auditData,
    isLoading: auditLoading,
    error: auditError,
    refetch: refetchAudit
  } = useQuery<AuditResponse>({
    queryKey: ['audit-entries'],
    queryFn: async () => {
      const res = await api.get<AuditResponse>('/api/audit/recent?n=200');
      return res;
    },
    enabled: activeTab === 'audit',
  });

  // Fetch logs for polling fallback
  const fetchLogs = useCallback(async () => {
    try {
      const data = await api.get<AuditResponse>('/api/audit/recent?n=200');
      setEntries(data.entries || []);
      if (autoRefresh && !hovering && logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    } catch (e) {
      // Silent fail for polling
    }
  }, [autoRefresh, hovering]);

  // Start polling fallback
  const startPolling = useCallback(() => {
    setStreamConnected(false);
    setConnectionStatus('polling');
    fetchLogs();
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }
    pollTimerRef.current = setInterval(() => {
      if (autoRefresh && !hovering && activeTab === 'live' && !streamPaused) {
        fetchLogs();
      }
    }, 2000);
  }, [fetchLogs, autoRefresh, hovering, activeTab, streamPaused]);

  // Start SSE streaming
  const startStreaming = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Build URL with token
    let url = '/api/logs/stream';
    const token = localStorage.getItem('openfang_token');
    if (token) {
      url += '?token=' + encodeURIComponent(token);
    }

    try {
      eventSourceRef.current = new EventSource(url);
    } catch (e) {
      // EventSource not supported or blocked; fall back to polling
      setConnectionStatus('polling');
      startPolling();
      return;
    }

    eventSourceRef.current.onopen = () => {
      setStreamConnected(true);
      setConnectionStatus(streamPaused ? 'paused' : 'live');
    };

    eventSourceRef.current.onmessage = (event) => {
      if (streamPaused) return;
      try {
        const entry: AuditEntry = JSON.parse(event.data);
        // Avoid duplicate entries by checking seq
        setEntries((prev) => {
          if (prev.some((e) => e.seq === entry.seq)) {
            return prev;
          }
          const newEntries = [...prev, entry];
          // Cap at 500 entries (remove oldest)
          if (newEntries.length > 500) {
            return newEntries.slice(newEntries.length - 500);
          }
          return newEntries;
        });
        // Auto-scroll to bottom
        if (autoRefresh && !hovering && logContainerRef.current) {
          requestAnimationFrame(() => {
            if (logContainerRef.current) {
              logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
            }
          });
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    eventSourceRef.current.onerror = () => {
      setStreamConnected(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      // Fall back to polling
      startPolling();
    };
  }, [streamPaused, autoRefresh, hovering, startPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  // Start streaming when live tab is active
  useEffect(() => {
    if (activeTab === 'live') {
      startStreaming();
    } else {
      // Close SSE when not on live tab
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

  // Update connection status when paused changes
  useEffect(() => {
    if (streamConnected) {
      setConnectionStatus(streamPaused ? 'paused' : 'live');
    }
  }, [streamPaused, streamConnected]);

  // Filtered entries for live logs
  const filteredEntries = useMemo(() => {
    const levelF = levelFilter;
    const textF = textFilter.toLowerCase();
    return entries.filter((e) => {
      const entryLevel = classifyLevel(e.action);
      if (levelF && entryLevel !== levelF) return false;
      if (textF) {
        const haystack = ((e.action || '') + ' ' + (e.detail || '') + ' ' + (e.agent_id || '')).toLowerCase();
        if (!haystack.includes(textF)) return false;
      }
      return true;
    });
  }, [entries, levelFilter, textFilter]);

  // Audit entries
  const auditEntries = useMemo(() => {
    return auditData?.entries || [];
  }, [auditData]);

  // Filtered audit entries
  const filteredAuditEntries = useMemo(() => {
    if (filterAction === 'all') return auditEntries;
    return auditEntries.filter((e) => e.action === filterAction);
  }, [auditEntries, filterAction]);

  // Get agent name from ID
  const getAgentName = useCallback((agentId?: string) => {
    if (!agentId) return '-';
    const agent = agents.find((a: Agent) => a.id === agentId);
    return agent ? agent.name : agentId.substring(0, 8) + '...';
  }, [agents]);

  // Toggle pause
  const togglePause = useCallback(() => {
    setStreamPaused((prev) => {
      const newPaused = !prev;
      if (!newPaused && logContainerRef.current) {
        requestAnimationFrame(() => {
          if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
          }
        });
      }
      return newPaused;
    });
  }, []);

  // Clear logs
  const clearLogs = useCallback(() => {
    setEntries([]);
  }, []);

  // Export logs
  const exportLogs = useCallback(() => {
    const lines = filteredEntries.map((e) => {
      return new Date(e.timestamp).toISOString() + ' [' + e.action + '] ' + (e.detail || '');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openfang-logs-' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredEntries]);

  // Verify chain
  const verifyChain = useCallback(async () => {
    try {
      const data = await api.get<VerifyResponse>('/api/audit/verify');
      setChainValid(data.valid === true);
      if (data.valid) {
        // Show success toast would go here
      }
    } catch (e) {
      setChainValid(false);
    }
  }, []);

  // Load audit data when switching to audit tab
  useEffect(() => {
    if (activeTab === 'audit' && !auditData && !auditLoading) {
      refetchAudit();
    }
  }, [activeTab, auditData, auditLoading, refetchAudit]);

  // Update tip hash when audit data loads
  useEffect(() => {
    if (auditData?.tip_hash) {
      setTipHash(auditData.tip_hash);
    }
  }, [auditData]);

  // Connection label
  const connectionLabel = useMemo(() => {
    switch (connectionStatus) {
      case 'live':
        return 'Live';
      case 'paused':
        return 'Paused';
      case 'polling':
        return 'Polling';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  }, [connectionStatus]);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Logs</h1>

          {/* Live tab controls */}
          {activeTab === 'live' && (
            <div className="flex items-center gap-2">
              {/* Connection status indicator */}
              <Badge variant="outline" className={getConnectionBadgeClass(connectionStatus)}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  connectionStatus === 'live' ? 'bg-green-500 animate-pulse' :
                  connectionStatus === 'paused' ? 'bg-yellow-500' :
                  connectionStatus === 'polling' ? 'bg-blue-500' : 'bg-gray-500'
                }`} />
                {connectionLabel}
              </Badge>

              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="info">INFO</SelectItem>
                  <SelectItem value="warn">WARN</SelectItem>
                  <SelectItem value="error">ERROR</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={textFilter}
                  onChange={(e) => setTextFilter(e.target.value)}
                  className="w-[180px] pl-7 h-9"
                />
              </div>

              <Button variant="ghost" size="sm" onClick={togglePause}>
                {streamPaused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                {streamPaused ? 'Resume' : 'Pause'}
              </Button>

              <Button variant="ghost" size="sm" onClick={clearLogs}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>

              <Button variant="ghost" size="sm" onClick={exportLogs}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>

              <div className="flex items-center gap-2 ml-2">
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                  id="auto-scroll"
                />
                <label htmlFor="auto-scroll" className="text-xs text-muted-foreground cursor-pointer">
                  {autoRefresh ? 'Auto-scroll' : 'Scroll locked'}
                </label>
              </div>
            </div>
          )}

          {/* Audit tab controls */}
          {activeTab === 'audit' && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={verifyChain}>
                <Shield className="h-4 w-4 mr-1" />
                Verify Chain
              </Button>
              {chainValid !== null && (
                <Badge className={chainValid === true ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {chainValid === true ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> VALID</>
                  ) : (
                    <><XCircle className="h-3 w-3 mr-1" /> BROKEN</>
                  )}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'live' | 'audit')}>
          <TabsList>
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          {/* Live logs tab */}
          <TabsContent value="live" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div
                  ref={logContainerRef}
                  className="font-mono text-sm max-h-[70vh] overflow-y-auto p-4"
                  onMouseEnter={() => setHovering(true)}
                  onMouseLeave={() => setHovering(false)}
                >
                  {filteredEntries.map((entry) => {
                    const level = classifyLevel(entry.action);
                    return (
                      <div key={entry.seq} className="flex gap-2 py-1 hover:bg-muted/50 rounded px-1">
                        <span className="text-muted-foreground whitespace-nowrap">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                        <Badge className={`text-xs ${getLevelBadgeClass(level)}`}>
                          {level.toUpperCase()}
                        </Badge>
                        <span className="text-muted-foreground text-xs">[{entry.action}]</span>
                        <span className="text-xs">{entry.detail}</span>
                      </div>
                    );
                  })}

                  {filteredEntries.length === 0 && (
                    <div className="text-center py-8">
                      <h4 className="text-sm font-medium">No log entries yet</h4>
                      <p className="text-xs text-muted-foreground mt-1">Activity will appear here as agents run.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit trail tab */}
          <TabsContent value="audit" className="mt-4 space-y-4">
            {/* Info card */}
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="font-bold text-sm mb-1">Tamper-Evident Audit Trail</div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  Every agent action is logged with a cryptographic hash chain. Use "Verify Chain" to confirm no entries have been altered or deleted.
                </div>
              </CardContent>
            </Card>

            {/* Loading state */}
            {auditLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading audit log...</span>
              </div>
            )}

            {/* Error state */}
            {auditError && !auditLoading && (
              <div className="text-center py-8">
                <XCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {auditError instanceof Error ? auditError.message : 'Could not load audit log.'}
                </p>
                <Button variant="ghost" size="sm" onClick={() => refetchAudit()} className="mt-2">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              </div>
            )}

            {/* Content */}
            {!auditLoading && !auditError && (
              <>
                {/* Filters */}
                <div className="flex gap-2 items-center">
                  <Select value={filterAction} onValueChange={setFilterAction}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="AgentSpawn">Agent Created</SelectItem>
                      <SelectItem value="AgentKill">Agent Stopped</SelectItem>
                      <SelectItem value="AgentMessage">Message</SelectItem>
                      <SelectItem value="ToolInvoke">Tool Used</SelectItem>
                      <SelectItem value="NetworkAccess">Network Access</SelectItem>
                      <SelectItem value="ShellExec">Shell Command</SelectItem>
                      <SelectItem value="FileAccess">File Access</SelectItem>
                      <SelectItem value="MemoryAccess">Memory Access</SelectItem>
                      <SelectItem value="AuthAttempt">Login Attempt</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    {filteredAuditEntries.length} of {auditEntries.length} entries
                  </span>
                  {tipHash && (
                    <span className="text-xs text-muted-foreground">
                      tip: {tipHash.substring(0, 16)}...
                    </span>
                  )}
                </div>

                {/* Table */}
                {filteredAuditEntries.length > 0 && (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 font-medium">#</th>
                          <th className="text-left p-2 font-medium">Timestamp</th>
                          <th className="text-left p-2 font-medium">Agent</th>
                          <th className="text-left p-2 font-medium">Action</th>
                          <th className="text-left p-2 font-medium">Detail</th>
                          <th className="text-left p-2 font-medium">Outcome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAuditEntries.map((e) => (
                          <tr key={e.seq} className="border-t hover:bg-muted/50">
                            <td className="p-2">{e.seq}</td>
                            <td className="p-2 text-xs whitespace-nowrap">
                              {new Date(e.timestamp).toLocaleString()}
                            </td>
                            <td className="p-2 truncate max-w-[120px]" title={e.agent_id}>
                              {getAgentName(e.agent_id)}
                            </td>
                            <td className="p-2">
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                {friendlyAction(e.action)}
                              </Badge>
                            </td>
                            <td className="p-2 truncate max-w-[200px]" title={e.detail}>
                              {e.detail}
                            </td>
                            <td className="p-2">{e.outcome}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Empty state */}
                {auditEntries.length === 0 && (
                  <div className="text-center py-8">
                    <h4 className="text-sm font-medium">No audit entries yet</h4>
                    <p className="text-xs text-muted-foreground mt-1">Activity will appear here as agents operate.</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Logs;
