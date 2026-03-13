// Runtime - System Status Style
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '@/api/client';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { cyberColors } from '@/lib/animations';
import {
  Cpu, Clock, Layers, Globe, Loader2, RefreshCw,
  Server, Database, Shield, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusData {
  uptime_seconds: number;
  default_model?: string;
  api_listen?: string;
  home_dir?: string;
  log_level?: string;
  network_enabled?: boolean;
}

interface VersionData {
  version?: string;
  platform?: string;
  arch?: string;
}

interface Provider {
  id: string;
  display_name?: string;
  auth_status: string;
  reachable?: boolean;
  is_local?: boolean;
  model_count?: number;
  latency_ms?: number;
}

function formatUptime(seconds: number): string {
  if (!seconds || seconds < 0) return '-';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${d}d ${h}h`;
}

function StatusIndicator({ status }: { status: 'online' | 'offline' | 'warning' }) {
  const colors = {
    online: 'var(--neon-green)',
    offline: 'var(--neon-magenta)',
    warning: 'var(--neon-amber)'
  };

  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: colors[status] }}
      />
      <span
        className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: colors[status] }}
      />
    </span>
  );
}

export function Runtime() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<StatusData>({
    queryKey: ['runtime-status'],
    queryFn: () => api.get('/api/status'),
  });

  const { data: version, isLoading: versionLoading, refetch: refetchVersion } = useQuery<VersionData>({
    queryKey: ['runtime-version'],
    queryFn: () => api.get('/api/version'),
  });

  const { data: providersData, isLoading: providersLoading, refetch: refetchProviders } = useQuery<{ providers: Provider[] }>({
    queryKey: ['runtime-providers'],
    queryFn: () => api.get('/api/providers'),
  });

  const { data: agents, isLoading: agentsLoading, refetch: refetchAgents } = useQuery<Array<{ id: string; name?: string }>>({
    queryKey: ['runtime-agents'],
    queryFn: () => api.listAgents(),
  });

  const isLoading = statusLoading || versionLoading || providersLoading || agentsLoading;
  const providers = providersData?.providers || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchStatus(),
      refetchVersion(),
      refetchProviders(),
      refetchAgents(),
    ]);
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--neon-cyan)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold">
              <NeonText color="cyan">Runtime</NeonText>
            </h1>
            <p className="text-[var(--text-muted)] mt-1">System status and diagnostics</p>
          </div>

          <motion.button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
          </motion.button>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <SpotlightCard glowColor="rgba(0, 240, 255, 0.1)">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[var(--neon-cyan)]" />
                  <span className="text-xs text-[var(--text-muted)] uppercase">Uptime</span>
                </div>
                <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                  {formatUptime(status?.uptime_seconds || 0)}
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <SpotlightCard glowColor="rgba(0, 255, 136, 0.1)">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-4 h-4 text-[var(--neon-green)]" />
                  <span className="text-xs text-[var(--text-muted)] uppercase">Agents</span>
                </div>
                <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                  {agents?.length || 0}
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SpotlightCard glowColor="rgba(255, 184, 0, 0.1)">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-[var(--neon-amber)]" />
                  <span className="text-xs text-[var(--text-muted)] uppercase">Version</span>
                </div>
                <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                  {version?.version || '-'}
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <SpotlightCard glowColor="rgba(255, 0, 110, 0.1)">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-[var(--neon-magenta)]" />
                  <span className="text-xs text-[var(--text-muted)] uppercase">Model</span>
                </div>
                <div className="text-lg font-bold font-mono text-[var(--text-primary)] truncate">
                  {status?.default_model?.split('/').pop() || '-'}
                </div>
              </div>
            </SpotlightCard>
          </motion.div>
        </div>

        {/* System Info */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* System Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <SpotlightCard glowColor="rgba(255, 255, 255, 0.05)">
              <div className="p-5">
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  System
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Platform', value: version?.platform || '-' },
                    { label: 'Architecture', value: version?.arch || '-' },
                    { label: 'API Listen', value: status?.api_listen || '-' },
                    { label: 'Log Level', value: status?.log_level || '-', badge: true },
                    { label: 'Network', value: status?.network_enabled ? 'Enabled' : 'Disabled' },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)] last:border-0">
                      <span className="text-sm text-[var(--text-muted)]">{item.label}</span>
                      {item.badge ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-[var(--surface-tertiary)] text-[var(--text-secondary)] font-mono">
                          {item.value}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--text-primary)] font-mono">{item.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Providers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <SpotlightCard glowColor="rgba(0, 240, 255, 0.1)">
              <div className="p-5">
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Providers
                </h3>
                {providers.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                    No providers configured
                  </div>
                ) : (
                  <div className="space-y-2">
                    {providers.map((provider) => (
                      <div
                        key={provider.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[var(--text-primary)]/[0.02] border border-[var(--border-subtle)]"
                      >
                        <div className="flex items-center gap-3">
                          <StatusIndicator status={provider.reachable ? 'online' : 'offline'} />
                          <span className="text-sm text-[var(--text-primary)]">{provider.display_name || provider.id}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                          {provider.model_count !== undefined && (
                            <span>{provider.model_count} models</span>
                          )}
                          {provider.latency_ms && (
                            <span className="font-mono">{provider.latency_ms}ms</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SpotlightCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default Runtime;
