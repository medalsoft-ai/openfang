// Overview Dashboard - 100% Alpine.js feature parity
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { api } from '@/api/client';
import { useNavigate } from 'react-router';
import {
  Activity, Bot, Zap, DollarSign, Server,
  Radio, Puzzle, CheckCircle, XCircle, AlertCircle, Clock,
  TrendingUp, MessageSquare, Settings, Shield, Layers,
  ChevronRight, RefreshCw, CheckCircle2
} from 'lucide-react';

// Types matching Alpine implementation
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unreachable' | 'ok';
  version?: string;
  uptime?: number;
}

interface SystemStatus {
  uptime_seconds: number;
  agent_count: number;
  active_agents: number;
  default_provider?: string;
  default_model?: string;
  version?: string;
}

interface UsageSummary {
  total_tokens: number;
  total_tools: number;
  total_cost: number;
  agent_count: number;
}

interface Provider {
  id: string;
  display_name: string;
  auth_status: 'configured' | 'not_set' | 'missing' | 'no_key';
  health?: 'ok' | 'cooldown' | 'open' | 'error';
}

interface Channel {
  name: string;
  display_name: string;
  has_token: boolean;
  connected?: boolean;
  status?: string;
}

interface McpServer {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  tool_count?: number;
}

interface AuditEntry {
  seq?: number;
  timestamp: string;
  action: string;
  agent_id?: string;
  detail?: string;
  details?: string;
}

// Helper functions (matching Alpine)
function formatUptime(seconds: number): string {
  if (!seconds) return '-';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatNumber(n: number): string {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function formatCost(n: number): string {
  if (!n || n === 0) return '$0.00';
  if (n < 0.01) return '<$0.01';
  return '$' + n.toFixed(2);
}

function timeAgo(timestamp: string): string {
  if (!timestamp) return '';
  const now = Date.now();
  const ts = new Date(timestamp).getTime();
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 10) return 'just now';
  if (diff < 60) return diff + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function friendlyAction(action: string): string {
  if (!action) return 'Unknown';
  const map: Record<string, string> = {
    'AgentSpawn': 'Agent Created',
    'AgentKill': 'Agent Stopped',
    'AgentTerminated': 'Agent Stopped',
    'ToolInvoke': 'Tool Used',
    'ToolResult': 'Tool Completed',
    'MessageReceived': 'Message In',
    'MessageSent': 'Response Sent',
    'SessionReset': 'Session Reset',
    'SessionCompact': 'Compacted',
    'ModelSwitch': 'Model Changed',
    'AuthAttempt': 'Login Attempt',
    'AuthSuccess': 'Login OK',
    'AuthFailure': 'Login Failed',
    'CapabilityDenied': 'Denied',
    'RateLimited': 'Rate Limited',
    'WorkflowRun': 'Workflow Run',
    'TriggerFired': 'Trigger Fired',
    'SkillInstalled': 'Skill Installed',
    'McpConnected': 'MCP Connected'
  };
  return map[action] || action.replace(/([A-Z])/g, ' $1').trim();
}

function actionBadgeClass(action: string): string {
  if (!action) return 'bg-gray-100 text-gray-800';
  if (action === 'AgentSpawn' || action === 'AuthSuccess') return 'bg-green-100 text-green-800';
  if (action === 'AgentKill' || action === 'AgentTerminated' || action === 'AuthFailure' || action === 'CapabilityDenied') return 'bg-red-100 text-red-800';
  if (action === 'RateLimited' || action === 'ToolInvoke') return 'bg-yellow-100 text-yellow-800';
  return 'bg-blue-100 text-blue-800';
}

function providerBadgeClass(p: Provider): string {
  if (p.auth_status === 'configured') {
    if (p.health === 'cooldown' || p.health === 'open') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  }
  if (p.auth_status === 'not_set' || p.auth_status === 'missing') return 'bg-gray-100 text-gray-600 border-gray-300';
  return 'bg-gray-100 text-gray-500 border-gray-200';
}

function providerTooltip(p: Provider): string {
  if (p.health === 'cooldown') return `${p.display_name} — cooling down (rate limited)`;
  if (p.health === 'open') return `${p.display_name} — circuit breaker open`;
  if (p.auth_status === 'configured') return `${p.display_name} — ready`;
  return `${p.display_name} — not configured`;
}

// Action icon component
function ActionIcon({ action }: { action: string }) {
  const iconClass = "h-3 w-3";
  switch (action) {
    case 'AgentSpawn':
      return <CheckCircle className={iconClass} />;
    case 'AgentKill':
    case 'AgentTerminated':
      return <XCircle className={iconClass} />;
    case 'ToolInvoke':
      return <Zap className={iconClass} />;
    case 'MessageReceived':
      return <MessageSquare className={iconClass} />;
    case 'MessageSent':
      return <TrendingUp className={iconClass} />;
    default:
      return <Activity className={iconClass} />;
  }
}

export function Overview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(() =>
    localStorage.getItem('of-checklist-dismissed') === 'true'
  );

  // Fetch health status
  const { data: health, isLoading: healthLoading } = useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: async () => {
      try {
        return await api.get<HealthStatus>('/api/health');
      } catch {
        return { status: 'unreachable' };
      }
    },
    refetchInterval: 30000,
  });

  // Fetch system status
  const { data: status, isLoading: statusLoading } = useQuery<SystemStatus>({
    queryKey: ['status'],
    queryFn: () => api.get<SystemStatus>('/api/status'),
    refetchInterval: 30000,
  });

  // Fetch usage summary
  const { data: usage, isLoading: usageLoading } = useQuery<UsageSummary>({
    queryKey: ['usage-summary'],
    queryFn: async () => {
      const data = await api.get<{ agents: { total_tokens?: number; tool_calls?: number; cost_usd?: number }[] }>('/api/usage');
      const agents = data.agents || [];
      return agents.reduce<UsageSummary>(
        (acc, a) => ({
          total_tokens: acc.total_tokens + (a.total_tokens || 0),
          total_tools: acc.total_tools + (a.tool_calls || 0),
          total_cost: acc.total_cost + (a.cost_usd || 0),
          agent_count: agents.length,
        }),
        { total_tokens: 0, total_tools: 0, total_cost: 0, agent_count: 0 }
      );
    },
    refetchInterval: 30000,
  });

  // Fetch providers
  const { data: providers = [], isLoading: providersLoading } = useQuery<Provider[]>({
    queryKey: ['overview-providers'],
    queryFn: async () => {
      const res = await api.get<{ providers: Provider[] }>('/api/providers');
      return res.providers || [];
    },
    refetchInterval: 30000,
  });

  // Fetch channels
  const { data: channels = [], isLoading: channelsLoading } = useQuery<Channel[]>({
    queryKey: ['overview-channels'],
    queryFn: async () => {
      const res = await api.get<{ channels: Channel[] }>('/api/channels');
      return (res.channels || []).filter((c) => c.has_token);
    },
    refetchInterval: 30000,
  });

  // Fetch MCP servers
  const { data: mcpServers = [], isLoading: mcpLoading } = useQuery<McpServer[]>({
    queryKey: ['overview-mcp'],
    queryFn: async () => {
      try {
        const res = await api.get<{ servers: McpServer[] }>('/api/mcp/servers');
        return res.servers || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
  });

  // Fetch skills count
  const { data: skillCount = 0, isLoading: skillsLoading } = useQuery<number>({
    queryKey: ['overview-skills'],
    queryFn: async () => {
      try {
        const res = await api.get<{ skills: { name: string }[] }>('/api/skills');
        return (res.skills || []).length;
      } catch {
        return 0;
      }
    },
    refetchInterval: 60000,
  });

  // Fetch agents for checklist
  const { data: agents = [] } = useQuery<Array<{ id: string }>>({
    queryKey: ['overview-agents-count'],
    queryFn: async () => api.listAgents(),
    refetchInterval: 30000,
  });

  // Fetch recent audit entries
  const { data: auditEntries = [], isLoading: auditLoading } = useQuery<AuditEntry[]>({
    queryKey: ['audit-recent'],
    queryFn: async () => {
      try {
        const res = await api.get<{ entries: AuditEntry[] }>('/api/audit/recent?n=8');
        return res.entries || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
  });

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['health'] });
    await queryClient.invalidateQueries({ queryKey: ['status'] });
    await queryClient.invalidateQueries({ queryKey: ['usage-summary'] });
    await queryClient.invalidateQueries({ queryKey: ['overview-providers'] });
    await queryClient.invalidateQueries({ queryKey: ['overview-channels'] });
    await queryClient.invalidateQueries({ queryKey: ['overview-mcp'] });
    await queryClient.invalidateQueries({ queryKey: ['overview-skills'] });
    await queryClient.invalidateQueries({ queryKey: ['audit-recent'] });
    setIsRefreshing(false);
  };

  // Dismiss checklist
  const dismissChecklist = () => {
    setChecklistDismissed(true);
    localStorage.setItem('of-checklist-dismissed', 'true');
  };

  // Computed values
  const configuredProviders = useMemo(() =>
    providers.filter((p) => p.auth_status === 'configured'),
    [providers]
  );

  const connectedMcp = useMemo(() =>
    mcpServers.filter((s) => s.status === 'connected'),
    [mcpServers]
  );

  // Setup checklist
  const setupChecklist = useMemo(() => [
    { key: 'provider', label: 'Configure an LLM provider', done: configuredProviders.length > 0, action: '/settings' },
    { key: 'agent', label: 'Create your first agent', done: agents.length > 0, action: '/agents' },
    { key: 'chat', label: 'Send your first message', done: localStorage.getItem('of-first-msg') === 'true', action: '/chat' },
    { key: 'channel', label: 'Connect a messaging channel', done: channels.length > 0, action: '/channels' },
    { key: 'skill', label: 'Browse or install a skill', done: localStorage.getItem('of-skill-browsed') === 'true', action: '/skills' }
  ], [configuredProviders.length, agents.length, channels.length]);

  const setupProgress = useMemo(() => {
    const done = setupChecklist.filter(item => item.done).length;
    return (done / 5) * 100;
  }, [setupChecklist]);

  const setupDoneCount = useMemo(() =>
    setupChecklist.filter(item => item.done).length,
    [setupChecklist]
  );

  const isLoading = healthLoading || statusLoading || usageLoading || providersLoading ||
                    channelsLoading || mcpLoading || skillsLoading || auditLoading;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-muted-foreground">
            System overview and status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={health?.status === 'ok' || health?.status === 'healthy' ? 'default' : 'destructive'}>
            {health?.status === 'ok' || health?.status === 'healthy' ? (
              <><CheckCircle className="w-3 h-3 mr-1" /> Healthy</>
            ) : health?.status === 'unreachable' ? (
              <><XCircle className="w-3 h-3 mr-1" /> Unreachable</>
            ) : (
              <><AlertCircle className="w-3 h-3 mr-1" /> {health?.status || 'Unknown'}</>
            )}
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing || isLoading}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Setup Checklist */}
      {!checklistDismissed && setupProgress < 100 && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">Getting Started</CardTitle>
                <CardDescription>{setupDoneCount} of 5 steps completed</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => navigate('/wizard')}>Setup Wizard</Button>
                <Button variant="ghost" size="sm" onClick={dismissChecklist}>Dismiss</Button>
              </div>
            </div>
            <Progress value={setupProgress} className="mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {setupChecklist.map((item) => (
                <div key={item.key} className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-5 h-5 rounded-full ${item.done ? 'bg-green-500 text-white' : 'border-2 border-gray-300'}`}>
                    {item.done && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                  <span className={`flex-1 ${item.done ? 'line-through text-muted-foreground' : ''}`}>{item.label}</span>
                  {!item.done && (
                    <Button variant="ghost" size="sm" onClick={() => navigate(item.action)}>Go</Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Primary Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/agents')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{status?.agent_count || 0}</div>
                <div className="text-sm text-muted-foreground">Agents Running</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatNumber(usage?.total_tokens || 0)}</div>
                <div className="text-sm text-muted-foreground">Tokens Used</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{formatCost(usage?.total_cost || 0)}</div>
                <div className="text-sm text-muted-foreground">Total Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatUptime(status?.uptime_seconds || 0)}</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/channels')}>
          <CardContent className="p-4">
            <div className="text-lg font-bold">{channels.length}</div>
            <div className="text-xs text-muted-foreground">Channels</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/skills')}>
          <CardContent className="p-4">
            <div className="text-lg font-bold">{skillCount}</div>
            <div className="text-xs text-muted-foreground">Skills</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-lg font-bold">{connectedMcp.length}</div>
            <div className="text-xs text-muted-foreground">MCP Servers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-lg font-bold">{formatNumber(usage?.total_tools || 0)}</div>
            <div className="text-xs text-muted-foreground">Tool Calls</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/settings')}>
          <CardContent className="p-4">
            <div className="text-lg font-bold">{configuredProviders.length}</div>
            <div className="text-xs text-muted-foreground">Providers</div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Status */}
      {providers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4" />
                LLM Providers
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {configuredProviders.length}/{providers.length} configured
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {providers.map((p) => (
                <Badge
                  key={p.id}
                  variant="outline"
                  className={`cursor-pointer ${providerBadgeClass(p)}`}
                  title={providerTooltip(p)}
                  onClick={() => navigate('/settings')}
                >
                  {p.auth_status === 'configured' && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        p.health === 'cooldown' || p.health === 'open'
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                    />
                  )}
                  {p.display_name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Health & Security */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={health?.status === 'ok' || health?.status === 'healthy' ? 'default' : 'destructive'}>
                  {health?.status || 'unknown'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-mono">{status?.version || health?.version || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span>{status?.default_provider || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="font-mono text-xs">{status?.default_model || '-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              Security Systems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {['Merkle Audit', 'Taint Tracking', 'WASM Sandbox', 'GCRA Rate Limit', 'Ed25519 Signing',
                'SSRF Protection', 'Secret Zeroize', 'Loop Guard', 'Session Repair'].map((sys) => (
                <Badge key={sys} variant="secondary" className="text-xs">
                  {sys}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">9 defense-in-depth systems active</p>
          </CardContent>
        </Card>
      </div>

      {/* Connected Channels & MCP */}
      {channels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Connected Channels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {channels.map((ch) => (
                <Badge key={ch.name} variant="outline" className="capitalize">
                  {ch.display_name || ch.name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{channels.length} channel(s) connected</p>
          </CardContent>
        </Card>
      )}

      {mcpServers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4" />
              MCP Servers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {mcpServers.map((s) => (
                <Badge key={s.name} variant={s.status === 'connected' ? 'default' : 'secondary'} className="text-xs">
                  <span className={`w-1 h-1 rounded-full mr-1 ${s.status === 'connected' ? 'bg-green-400' : 'bg-gray-400'}`} />
                  {s.name}
                  {s.tool_count && <span className="text-muted-foreground ml-1">({s.tool_count})</span>}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/agents')}>
              <Bot className="h-4 w-4 mr-1" /> New Agent
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/skills')}>
              <Puzzle className="h-4 w-4 mr-1" /> Browse Skills
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/channels')}>
              <Radio className="h-4 w-4 mr-1" /> Add Channel
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/workflows')}>
              <Layers className="h-4 w-4 mr-1" /> Create Workflow
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4 mr-1" /> Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/logs')}>
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {auditEntries.length === 0 ? (
            <div className="text-center py-6">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No Recent Activity</p>
              <p className="text-xs text-muted-foreground">Activity will appear here once agents start processing.</p>
              <Button size="sm" className="mt-3" onClick={() => navigate('/agents')}>
                Chat with an Agent
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {auditEntries.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 py-2 border-b last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-muted-foreground">
                    <ActionIcon action={entry.action} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${actionBadgeClass(entry.action)}`}>
                        {friendlyAction(entry.action)}
                      </Badge>
                      {entry.agent_id && (
                        <span className="text-xs text-muted-foreground truncate">
                          {entry.agent_id.substring(0, 8)}…
                        </span>
                      )}
                    </div>
                    {entry.detail && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.detail}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(entry.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Action Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/agents')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">Create Agent</div>
              <div className="text-xs text-muted-foreground">Spawn a new agent</div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/settings')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Server className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <div className="font-medium">Configure Provider</div>
              <div className="text-xs text-muted-foreground">Set up an LLM provider</div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/skills')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Puzzle className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div className="font-medium">Browse Skills</div>
              <div className="text-xs text-muted-foreground">Explore available skills</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}

export default Overview;
