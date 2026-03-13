// Usage - Metrics Dashboard Style
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '@/api/client';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { cyberColors } from '@/lib/animations';
import {
  BarChart3, Loader2, AlertCircle, RotateCcw, TrendingUp,
  Cpu, DollarSign, Activity, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageSummary {
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  call_count: number;
  total_tool_calls: number;
}

interface ModelUsage {
  model: string;
  call_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
}

interface AgentUsage {
  agent_id: string;
  name: string;
  total_tokens: number;
  tool_calls: number;
}

interface DailyCost {
  date: string;
  cost_usd: number;
  tokens: number;
  calls: number;
}

const CHART_COLORS = [
  'var(--neon-cyan)', 'var(--neon-amber)', 'var(--neon-magenta)', 'var(--neon-green)', 'var(--chart-purple)',
  'var(--chart-orange)', 'var(--chart-teal)', 'var(--chart-pink)', 'var(--chart-indigo)', 'var(--chart-lime)'
];

function formatTokens(n: number | undefined): string {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function formatCost(c: number | undefined): string {
  if (!c) return '$0.00';
  if (c < 0.01) return '$' + c.toFixed(4);
  return '$' + c.toFixed(2);
}

// Stat card with glow
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay = 0
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <SpotlightCard glowColor={`${color}15`}>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <span className="text-sm text-[var(--text-muted)]">{label}</span>
          </div>
          <div className="text-2xl font-bold font-mono" style={{ color }}>
            {value}
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

// Mini bar chart
function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((v, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-t"
          style={{
            backgroundColor: color,
            opacity: 0.3 + (i / data.length) * 0.7
          }}
          initial={{ height: 0 }}
          animate={{ height: `${(v / max) * 100}%` }}
          transition={{ delay: i * 0.05 }}
        />
      ))}
    </div>
  );
}

export function Usage() {
  const [activeTab, setActiveTab] = useState('summary');

  const { data: summary, isLoading, error, refetch } = useQuery<UsageSummary>({
    queryKey: ['usage', 'summary'],
    queryFn: async () => api.get('/api/usage/summary'),
  });

  const { data: byModelData } = useQuery<{ models: ModelUsage[] }>({
    queryKey: ['usage', 'by-model'],
    queryFn: async () => api.get('/api/usage/by-model'),
  });

  const { data: byAgentData } = useQuery<{ agents: AgentUsage[] }>({
    queryKey: ['usage', 'by-agent'],
    queryFn: async () => api.get('/api/usage'),
  });

  const { data: dailyData } = useQuery<{ days: DailyCost[] }>({
    queryKey: ['usage', 'daily'],
    queryFn: async () => api.get('/api/usage/daily'),
  });

  const byModel = byModelData?.models || [];
  const byAgent = byAgentData?.agents || [];
  const dailyCosts = dailyData?.days || [];

  const totalTokens = (summary?.total_input_tokens || 0) + (summary?.total_output_tokens || 0);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--neon-amber)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-[var(--neon-magenta)] mx-auto mb-4" />
          <p className="text-[var(--text-muted)] mb-4">Failed to load usage data</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
          >
            <RotateCcw className="w-4 h-4 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold">
              <NeonText color="amber">Usage</NeonText>
            </h1>
            <p className="text-[var(--text-muted)] mt-1">Track API usage and costs</p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Cpu}
            label="Total Tokens"
            value={formatTokens(totalTokens)}
            color="var(--neon-cyan)"
            delay={0}
          />
          <StatCard
            icon={DollarSign}
            label="Estimated Cost"
            value={formatCost(summary?.total_cost_usd)}
            color="var(--neon-amber)"
            delay={0.1}
          />
          <StatCard
            icon={Activity}
            label="API Calls"
            value={String(summary?.call_count || 0)}
            color="var(--neon-green)"
            delay={0.2}
          />
          <StatCard
            icon={Zap}
            label="Tool Calls"
            value={String(summary?.total_tool_calls || 0)}
            color="var(--neon-magenta)"
            delay={0.3}
          />
        </div>

        {/* Tabs */}
        <motion.div
          className="flex gap-1 mb-6 bg-[var(--surface-secondary)] rounded-xl p-1 w-fit"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {['summary', 'models', 'agents'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
                activeTab === tab
                  ? 'bg-[var(--neon-amber)]/20 text-[var(--neon-amber)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              {tab}
            </button>
          ))}
        </motion.div>

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <motion.div
            className="grid gap-4 md:grid-cols-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SpotlightCard glowColor="rgba(0, 240, 255, 0.1)">
              <div className="p-5">
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Token Breakdown</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--text-muted)]">Input</span>
                      <span className="text-[var(--neon-cyan)] font-mono">{formatTokens(summary?.total_input_tokens)}</span>
                    </div>
                    <div className="h-2 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-[var(--neon-cyan)]"
                        initial={{ width: 0 }}
                        animate={{ width: '60%' }}
                        transition={{ delay: 0.5 }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--text-muted)]">Output</span>
                      <span className="text-[var(--neon-green)] font-mono">{formatTokens(summary?.total_output_tokens)}</span>
                    </div>
                    <div className="h-2 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-[var(--neon-green)]"
                        initial={{ width: 0 }}
                        animate={{ width: '40%' }}
                        transition={{ delay: 0.6 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </SpotlightCard>

            <SpotlightCard glowColor="rgba(255, 184, 0, 0.1)">
              <div className="p-5">
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Daily Cost Trend</h3>
                {dailyCosts.length > 0 ? (
                  <MiniBarChart
                    data={dailyCosts.slice(-7).map(d => d.cost_usd)}
                    color="var(--neon-amber)"
                  />
                ) : (
                  <div className="h-12 flex items-center justify-center text-[var(--text-muted)] text-sm">
                    No data yet
                  </div>
                )}
              </div>
            </SpotlightCard>
          </motion.div>
        )}

        {/* Models Tab */}
        {activeTab === 'models' && (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {byModel.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)]">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No model usage data yet</p>
              </div>
            ) : (
              byModel.map((model, i) => (
                <SpotlightCard key={model.model} glowColor={`${CHART_COLORS[i % CHART_COLORS.length]}10`}>
                  <div className="p-4 flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${CHART_COLORS[i % CHART_COLORS.length]}15` }}
                    >
                      <Cpu className="w-5 h-5" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[var(--text-primary)] truncate">{model.model}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {model.call_count} calls • {formatTokens(model.total_input_tokens + model.total_output_tokens)} tokens
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[var(--neon-amber)]">{formatCost(model.total_cost_usd)}</div>
                    </div>
                  </div>
                </SpotlightCard>
              ))
            )}
          </motion.div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {byAgent.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)]">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No agent usage data yet</p>
              </div>
            ) : (
              byAgent.map((agent, i) => (
                <SpotlightCard key={agent.agent_id} glowColor={`${CHART_COLORS[i % CHART_COLORS.length]}10`}>
                  <div className="p-4 flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${CHART_COLORS[i % CHART_COLORS.length]}15` }}
                    >
                      <TrendingUp className="w-5 h-5" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[var(--text-primary)]">{agent.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {agent.tool_calls} tool calls
                      </div>
                    </div>
                    <div className="font-mono text-[var(--neon-cyan)]">{formatTokens(agent.total_tokens)}</div>
                  </div>
                </SpotlightCard>
              ))
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default Usage;
