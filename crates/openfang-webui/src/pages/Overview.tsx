// Overview Dashboard - Bento Grid Style with Cyber-Neon Theme
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/api/client';
import { useNavigate } from 'react-router';
import { useAuthQuery } from '@/hooks/useAuthQuery';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { NeonText } from '@/components/motion/NeonText';
import { AnimatedList } from '@/components/motion/AnimatedList';
import { staggerContainer, staggerItem, cyberColors } from '@/lib/animations';
import {
  Activity, Bot, Zap, DollarSign, Server,
  Radio, Puzzle, CheckCircle, XCircle, AlertCircle, Clock,
  TrendingUp, MessageSquare, Settings, Shield, Layers,
  ChevronRight, RefreshCw, CheckCircle2, Command
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types (unchanged)
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

// Helper functions (unchanged)
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

// Bento Card Component
function BentoCard({
  children,
  className,
  glowColor = cyberColors.cyan,
  onClick,
  colSpan = 1,
  rowSpan = 1
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  onClick?: () => void;
  colSpan?: number;
  rowSpan?: number;
}) {
  // Handle CSS variables - use color-mix for transparency
  const processedGlowColor = glowColor.startsWith('var(')
    ? glowColor
    : glowColor.replace(')', ', 0.15)');

  return (
    <motion.div
      className={cn(
        'relative rounded-2xl overflow-hidden',
        colSpan === 2 && 'md:col-span-2',
        rowSpan === 2 && 'md:row-span-2',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <SpotlightCard
        glowColor={processedGlowColor}
        onClick={onClick}
        className="h-full"
      >
        {children}
      </SpotlightCard>
    </motion.div>
  );
}

// Stat Card with animated number
function StatCard({
  value,
  label,
  icon: Icon,
  color = 'cyan',
  onClick
}: {
  value: string | number;
  label: string;
  icon: React.ElementType;
  color?: 'cyan' | 'amber' | 'green' | 'magenta';
  onClick?: () => void;
}) {
  const colorMap = {
    cyan: 'text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10',
    amber: 'text-[var(--neon-amber)] bg-[var(--neon-amber)]/10',
    green: 'text-[var(--neon-green)] bg-[var(--neon-green)]/10',
    magenta: 'text-[var(--neon-magenta)] bg-[var(--neon-magenta)]/10',
  };

  return (
    <BentoCard onClick={onClick} glowColor={cyberColors[color]}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <motion.div
              className="text-3xl font-bold text-[var(--text-primary)] mb-1"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              {value}
            </motion.div>
            <div className="text-sm text-[var(--text-muted)]">{label}</div>
          </div>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </div>
    </BentoCard>
  );
}

// Provider Badge
function ProviderBadge({ provider }: { provider: Provider }) {
  const getStatusColor = () => {
    if (provider.auth_status !== 'configured') return 'bg-[var(--surface-secondary)] text-[var(--text-muted)] border-[var(--border-default)]';
    if (provider.health === 'cooldown' || provider.health === 'open') {
      return 'bg-[var(--neon-amber)]/10 text-[var(--neon-amber)] border-[var(--neon-amber)]/30';
    }
    return 'bg-[var(--neon-green)]/10 text-[var(--neon-green)] border-[var(--neon-green)]/30';
  };

  return (
    <motion.span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border',
        getStatusColor()
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {provider.auth_status === 'configured' && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          provider.health === 'cooldown' || provider.health === 'open'
            ? 'bg-[var(--neon-amber)]'
            : 'bg-[var(--neon-green)]'
        )} />
      )}
      {provider.display_name}
    </motion.span>
  );
}

// Activity Item
function ActivityItem({ entry, index }: { entry: AuditEntry; index: number }) {
  const getActionColor = (action: string) => {
    if (action.includes('Spawn') || action.includes('Success')) return 'var(--neon-green)';
    if (action.includes('Kill') || action.includes('Terminated') || action.includes('Failure')) return 'var(--neon-magenta)';
    if (action.includes('Rate') || action.includes('Tool')) return 'var(--neon-amber)';
    return 'var(--neon-cyan)';
  };

  return (
    <motion.div
      className="flex items-center gap-3 py-3 border-b border-[var(--border-subtle)] last:border-0"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: getActionColor(entry.action), boxShadow: `0 0 8px ${getActionColor(entry.action)}` }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">{friendlyAction(entry.action)}</span>
          {entry.agent_id && (
            <span className="text-xs text-[var(--text-muted)] font-mono">
              {entry.agent_id.substring(0, 8)}…
            </span>
          )}
        </div>
        {entry.detail && (
          <p className="text-xs text-[var(--text-muted)] truncate">{entry.detail}</p>
        )}
      </div>
      <span className="text-xs text-[var(--text-muted)] whitespace-nowrap font-mono">{timeAgo(entry.timestamp)}</span>
    </motion.div>
  );
}

export function Overview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(() =>
    localStorage.getItem('of-checklist-dismissed') === 'true'
  );

  // All data queries - wait for authReady before fetching (handled by useAuthQuery)
  const { data: health } = useAuthQuery<HealthStatus>({
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

  const { data: status } = useAuthQuery<SystemStatus>({
    queryKey: ['status'],
    queryFn: () => api.get<SystemStatus>('/api/status'),
    refetchInterval: 30000,
  });

  const { data: usage } = useAuthQuery<UsageSummary>({
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

  const { data: providers = [] } = useAuthQuery<Provider[]>({
    queryKey: ['overview-providers'],
    queryFn: async () => {
      const res = await api.get<{ providers: Provider[] }>('/api/providers');
      return res.providers || [];
    },
    refetchInterval: 30000,
  });

  const { data: channels = [] } = useAuthQuery<Channel[]>({
    queryKey: ['overview-channels'],
    queryFn: async () => {
      const res = await api.get<{ channels: Channel[] }>('/api/channels');
      return (res.channels || []).filter((c) => c.has_token);
    },
    refetchInterval: 30000,
  });

  const { data: mcpServers = [] } = useAuthQuery<McpServer[]>({
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

  const { data: skillCount = 0 } = useAuthQuery<number>({
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

  const { data: agents = [] } = useAuthQuery<Array<{ id: string }>>({
    queryKey: ['overview-agents-count'],
    queryFn: async () => api.listAgents(),
    refetchInterval: 30000,
  });

  const { data: auditEntries = [] } = useAuthQuery<AuditEntry[]>({
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

  const dismissChecklist = () => {
    setChecklistDismissed(true);
    localStorage.setItem('of-checklist-dismissed', 'true');
  };

  const configuredProviders = useMemo(() =>
    providers.filter((p) => p.auth_status === 'configured'),
    [providers]
  );

  const connectedMcp = useMemo(() =>
    mcpServers.filter((s) => s.status === 'connected'),
    [mcpServers]
  );

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

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h1 className="text-3xl font-bold">
              <NeonText color="cyan">Dashboard</NeonText>
            </h1>
            <p className="text-[var(--text-muted)] mt-1">System overview and real-time metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
            </motion.button>
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium',
              health?.status === 'ok' || health?.status === 'healthy'
                ? 'bg-[var(--neon-green)]/10 text-[var(--neon-green)] border-[var(--neon-green)]/30'
                : 'bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)] border-[var(--neon-magenta)]/30'
            )}>
              <span className={cn(
                'w-2 h-2 rounded-full',
                health?.status === 'ok' || health?.status === 'healthy' ? 'bg-[var(--neon-green)]' : 'bg-[var(--neon-magenta)]'
              )} style={{ boxShadow: health?.status === 'ok' || health?.status === 'healthy' ? '0 0 8px var(--neon-green)' : '0 0 8px var(--neon-magenta)' }} />
              {health?.status === 'ok' || health?.status === 'healthy' ? 'System Online' : health?.status || 'Unknown'}
            </div>
          </div>
        </motion.div>

        {/* Setup Progress (if not complete) */}
        {!checklistDismissed && setupProgress < 100 && (
          <BentoCard colSpan={2} glowColor={cyberColors.amber}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Getting Started</h3>
                  <p className="text-sm text-[var(--text-muted)]">{setupDoneCount} of 5 steps completed</p>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => navigate('/wizard')}
                    className="px-4 py-2 rounded-xl bg-[var(--neon-amber)] text-black font-medium text-sm"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Setup Wizard
                  </motion.button>
                  <motion.button
                    onClick={dismissChecklist}
                    className="px-4 py-2 rounded-xl bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-sm hover:bg-[var(--surface-tertiary)]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Dismiss
                  </motion.button>
                </div>
              </div>
              <div className="h-2 bg-[var(--surface-secondary)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--neon-amber)] to-[var(--neon-magenta)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${setupProgress}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <div className="grid grid-cols-5 gap-2 mt-4">
                {setupChecklist.map((item, idx) => (
                  <motion.div
                    key={item.key}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border',
                      item.done
                        ? 'bg-[var(--neon-green)]/10 border-[var(--neon-green)]/30 text-[var(--neon-green)]'
                        : 'bg-[var(--surface-secondary)] border-[var(--border-default)] text-[var(--text-muted)]'
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    {item.done ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                    <span className="text-xs">{item.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </BentoCard>
        )}

        {/* Bento Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            value={status?.agent_count || 0}
            label="Active Agents"
            icon={Bot}
            color="cyan"
            onClick={() => navigate('/agents')}
          />
          <StatCard
            value={formatNumber(usage?.total_tokens || 0)}
            label="Tokens Used"
            icon={Layers}
            color="amber"
          />
          <StatCard
            value={formatCost(usage?.total_cost || 0)}
            label="Total Cost"
            icon={DollarSign}
            color="green"
          />
          <StatCard
            value={formatUptime(status?.uptime_seconds || 0)}
            label="System Uptime"
            icon={Clock}
            color="magenta"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Channels', value: channels.length, path: '/channels' },
            { label: 'Skills', value: skillCount, path: '/skills' },
            { label: 'MCP Servers', value: connectedMcp.length },
            { label: 'Tool Calls', value: formatNumber(usage?.total_tools || 0) },
            { label: 'Providers', value: configuredProviders.length, path: '/settings' },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              className={cn(
                'p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)]',
                stat.path && 'cursor-pointer hover:border-[var(--border-default)] hover:bg-[var(--surface-tertiary)]'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => stat.path && navigate(stat.path)}
            >
              <div className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</div>
              <div className="text-xs text-[var(--text-muted)]">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Providers & System */}
          <div className="lg:col-span-2 space-y-6">
            {/* Providers */}
            {providers.length > 0 && (
              <BentoCard glowColor={cyberColors.cyan}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Server className="w-5 h-5 text-[var(--neon-cyan)]" />
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">LLM Providers</h3>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{configuredProviders.length}/{providers.length} configured</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {providers.map((p) => (
                      <ProviderBadge key={p.id} provider={p} />
                    ))}
                  </div>
                </div>
              </BentoCard>
            )}

            {/* System Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BentoCard glowColor={cyberColors.green}>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-[var(--neon-green)]" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">System Info</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    {[
                      { label: 'Version', value: status?.version || health?.version || '-' },
                      { label: 'Provider', value: status?.default_provider || '-' },
                      { label: 'Model', value: status?.default_model || '-' },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between">
                        <span className="text-[var(--text-muted)]">{item.label}</span>
                        <span className="text-[var(--text-secondary)] font-mono">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </BentoCard>

              <BentoCard glowColor={cyberColors.magenta}>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-[var(--neon-magenta)]" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Security</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {['Merkle Audit', 'Taint Tracking', 'WASM Sandbox', 'GCRA Rate Limit', 'Ed25519 Signing'].map((sys) => (
                      <span key={sys} className="px-2 py-1 rounded-lg bg-[var(--surface-secondary)] text-xs text-[var(--text-secondary)] border border-[var(--border-default)]">
                        {sys}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-3">Defense-in-depth active</p>
                </div>
              </BentoCard>
            </div>

            {/* Channels & MCP */}
            {channels.length > 0 && (
              <BentoCard glowColor={cyberColors.amber}>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Radio className="w-5 h-5 text-[var(--neon-amber)]" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Connected Channels</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {channels.map((ch) => (
                      <span key={ch.name} className="px-3 py-1.5 rounded-full bg-[var(--surface-secondary)] text-sm text-[var(--text-secondary)] border border-[var(--border-default)]">
                        {ch.display_name || ch.name}
                      </span>
                    ))}
                  </div>
                </div>
              </BentoCard>
            )}
          </div>

          {/* Right Column - Activity */}
          <div className="space-y-6">
            <BentoCard glowColor={cyberColors.cyan} className="h-full min-h-[400px]">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[var(--neon-cyan)]" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Recent Activity</h3>
                  </div>
                  <motion.button
                    onClick={() => navigate('/logs')}
                    className="text-xs text-[var(--neon-cyan)] hover:text-[var(--neon-cyan-dim)] flex items-center gap-1"
                    whileHover={{ x: 2 }}
                  >
                    View All <ChevronRight className="w-3 h-3" />
                  </motion.button>
                </div>

                {auditEntries.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" />
                    <p className="text-[var(--text-muted)] text-sm">No Recent Activity</p>
                    <p className="text-[var(--text-muted)]/50 text-xs mt-1">Activity will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {auditEntries.map((entry, idx) => (
                      <ActivityItem key={idx} entry={entry} index={idx} />
                    ))}
                  </div>
                )}
              </div>
            </BentoCard>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Create Agent', desc: 'Spawn a new agent', icon: Bot, color: 'var(--neon-cyan)', path: '/agents' },
            { label: 'Configure Provider', desc: 'Set up LLM provider', icon: Server, color: 'var(--neon-green)', path: '/settings' },
            { label: 'Browse Skills', desc: 'Explore skills', icon: Puzzle, color: 'var(--neon-amber)', path: '/skills' },
          ].map((action, idx) => (
            <motion.div
              key={action.label}
              className="group cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
              onClick={() => navigate(action.path)}
            >
              <div className="p-6 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all duration-300 group-hover:bg-[var(--surface-tertiary)]">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${action.color}15` }}
                  >
                    <action.icon className="w-6 h-6" style={{ color: action.color }} />
                  </div>
                  <div>
                    <div className="font-medium text-[var(--text-primary)] group-hover:text-[var(--text-secondary)]">{action.label}</div>
                    <div className="text-xs text-[var(--text-muted)]">{action.desc}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--text-muted)] ml-auto group-hover:text-[var(--text-secondary)] transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Overview;
