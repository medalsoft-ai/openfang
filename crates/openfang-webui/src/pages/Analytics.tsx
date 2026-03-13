// Analytics - Data Visualization Style
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { cyberColors } from '@/lib/animations';
import {
  BarChart3, PieChart, TrendingUp, Users, Loader2,
  AlertCircle, RotateCcw, Cpu, DollarSign, Activity,
  Zap, Layers, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Chart colors - cyber neon palette using CSS variables
const CHART_COLORS = [
  'var(--neon-cyan)', 'var(--neon-amber)', 'var(--neon-magenta)', 'var(--neon-green)', 'var(--chart-purple)',
  'var(--chart-orange)', 'var(--chart-teal)', 'var(--chart-pink)', 'var(--chart-indigo)', 'var(--chart-lime)'
];

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

interface DailyCostsResponse {
  days: DailyCost[];
  today_cost_usd: number;
  first_event_date: string | null;
}

// Format helpers
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

function extractProvider(modelName: string | undefined): string {
  if (!modelName) return 'Unknown';
  const lower = modelName.toLowerCase();
  if (lower.includes('claude') || lower.includes('haiku') || lower.includes('sonnet') || lower.includes('opus')) return 'Anthropic';
  if (lower.includes('gemini') || lower.includes('gemma')) return 'Google';
  if (lower.includes('gpt') || lower.includes('o1') || lower.includes('o3') || lower.includes('o4')) return 'OpenAI';
  if (lower.includes('llama') || lower.includes('mixtral') || lower.includes('groq')) return 'Groq';
  if (lower.includes('deepseek')) return 'DeepSeek';
  if (lower.includes('mistral')) return 'Mistral';
  if (lower.includes('command') || lower.includes('cohere')) return 'Cohere';
  if (lower.includes('grok')) return 'xAI';
  return 'Other';
}

// Neon stat card
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

// Animated bar chart
function AnimatedBarChart({ data, max }: { data: { label: string; value: number; color: string }[]; max: number }) {
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">{item.label}</span>
            <span className="font-mono" style={{ color: item.color }}>
              {formatCost(item.value)}
            </span>
          </div>
          <div className="h-2 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: item.color }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Donut chart with neon glow
function NeonDonut({ segments, total }: { segments: { label: string; value: number; color: string; percent: number }[]; total: number }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 120 120" className="transform -rotate-90">
        {segments.map((seg) => {
          const dashLen = (seg.percent / 100) * circumference;
          const dashOffset = -offset;
          offset += dashLen;
          return (
            <circle
              key={seg.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="16"
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={dashOffset}
              className="drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-mono text-[var(--text-primary)]">{formatCost(total)}</span>
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Total</span>
      </div>
    </div>
  );
}

export function Analytics() {
  const [activeTab, setActiveTab] = useState('summary');

  const { data: summary, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useQuery<UsageSummary>({
    queryKey: ['usage', 'summary'],
    queryFn: () => api.get('/api/usage/summary'),
  });

  const { data: byModelData, isLoading: byModelLoading, error: byModelError, refetch: refetchByModel } = useQuery<{ models: ModelUsage[] }>({
    queryKey: ['usage', 'by-model'],
    queryFn: () => api.get('/api/usage/by-model'),
  });

  const { data: byAgentData, isLoading: byAgentLoading, error: byAgentError, refetch: refetchByAgent } = useQuery<{ agents: AgentUsage[] }>({
    queryKey: ['usage', 'by-agent'],
    queryFn: () => api.get('/api/usage'),
  });

  const { data: dailyCostsData, isLoading: dailyCostsLoading, error: dailyCostsError, refetch: refetchDailyCosts } = useQuery<DailyCostsResponse>({
    queryKey: ['usage', 'daily'],
    queryFn: () => api.get('/api/usage/daily'),
  });

  const byModel = byModelData?.models || [];
  const byAgent = byAgentData?.agents || [];
  const dailyCosts = dailyCostsData?.days || [];
  const todayCost = dailyCostsData?.today_cost_usd || 0;

  const isLoading = summaryLoading || byModelLoading || byAgentLoading || dailyCostsLoading;
  const hasError = summaryError || byModelError || byAgentError || dailyCostsError;

  const handleRetry = () => {
    refetchSummary();
    refetchByModel();
    refetchByAgent();
    refetchDailyCosts();
  };

  // Calculated data
  const totalTokens = (summary?.total_input_tokens || 0) + (summary?.total_output_tokens || 0);

  const costByProvider = useMemo(() => {
    const providerMap: Record<string, { cost: number; tokens: number }> = {};
    byModel.forEach((m) => {
      const provider = extractProvider(m.model);
      if (!providerMap[provider]) providerMap[provider] = { cost: 0, tokens: 0 };
      providerMap[provider].cost += m.total_cost_usd || 0;
      providerMap[provider].tokens += m.total_input_tokens + m.total_output_tokens;
    });
    return Object.entries(providerMap)
      .map(([name, data], i) => ({
        label: name,
        value: data.cost,
        color: CHART_COLORS[i % CHART_COLORS.length],
        percent: 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [byModel]);

  const providerTotal = costByProvider.reduce((sum, p) => sum + p.value, 0);
  const providerSegments = costByProvider.map(p => ({ ...p, percent: providerTotal > 0 ? (p.value / providerTotal) * 100 : 0 }));

  const avgCostPerCall = summary?.call_count ? (summary.total_cost_usd || 0) / summary.call_count : 0;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--neon-cyan)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-[var(--neon-magenta)] mx-auto mb-4" />
          <p className="text-[var(--text-muted)] mb-4">Failed to load analytics</p>
          <button
            onClick={handleRetry}
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
              <NeonText color="cyan">Analytics</NeonText>
            </h1>
            <p className="text-[var(--text-muted)] mt-1">Usage insights and cost breakdown</p>
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
            label="Total Cost"
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
          {[
            { id: 'summary', label: 'Summary' },
            { id: 'models', label: 'By Model' },
            { id: 'agents', label: 'By Agent' },
            { id: 'cost', label: 'Cost' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'summary' && (
            <motion.div
              key="summary"
              className="grid gap-6 md:grid-cols-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Token Breakdown */}
              <SpotlightCard glowColor="rgba(0, 240, 255, 0.1)">
                <div className="p-5">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-6 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[var(--neon-cyan)]" />
                    Token Breakdown
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[var(--text-muted)]">Input Tokens</span>
                        <span className="text-[var(--neon-cyan)] font-mono">{formatTokens(summary?.total_input_tokens)}</span>
                      </div>
                      <div className="h-3 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-[var(--neon-cyan)]"
                          initial={{ width: 0 }}
                          animate={{ width: '60%' }}
                          transition={{ delay: 0.3 }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[var(--text-muted)]">Output Tokens</span>
                        <span className="text-[var(--neon-green)] font-mono">{formatTokens(summary?.total_output_tokens)}</span>
                      </div>
                      <div className="h-3 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-[var(--neon-green)]"
                          initial={{ width: 0 }}
                          animate={{ width: '40%' }}
                          transition={{ delay: 0.4 }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-[var(--border-default)] space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)]">Avg Cost / Call</span>
                      <span className="font-mono text-[var(--neon-amber)]">{formatCost(avgCostPerCall)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)]">Today's Spend</span>
                      <span className="font-mono text-[var(--text-primary)]">{formatCost(todayCost)}</span>
                    </div>
                  </div>
                </div>
              </SpotlightCard>

              {/* Cost by Provider Chart */}
              <SpotlightCard glowColor="rgba(255, 184, 0, 0.1)">
                <div className="p-5">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-6 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-[var(--neon-amber)]" />
                    Cost by Provider
                  </h3>
                  {providerSegments.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-muted)]">
                      <PieChart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No cost data yet</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-6">
                      <NeonDonut segments={providerSegments} total={providerTotal} />
                      <div className="flex-1 space-y-2">
                        {providerSegments.map((seg) => (
                          <div key={seg.label} className="flex items-center gap-2 text-sm">
                            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: seg.color }} />
                            <span className="flex-1 text-[var(--text-secondary)] truncate">{seg.label}</span>
                            <span className="font-medium text-[var(--text-primary)]">{seg.percent.toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SpotlightCard>
            </motion.div>
          )}

          {activeTab === 'cost' && (
            <motion.div
              key="cost"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Monthly Forecast */}
              <SpotlightCard glowColor="rgba(0, 240, 255, 0.1)">
                <div className="p-5">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[var(--neon-cyan)]" />
                    Monthly Cost Forecast
                  </h3>
                  {dailyCosts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Calculate forecast based on daily average */}
                      {(() => {
                        const totalCost = dailyCosts.reduce((sum, d) => sum + d.cost_usd, 0);
                        const avgDailyCost = totalCost / dailyCosts.length;
                        const daysInMonth = 30;
                        const projectedCost = avgDailyCost * daysInMonth;
                        const currentSpend = dailyCosts[dailyCosts.length - 1]?.cost_usd || 0;
                        const daysRemaining = daysInMonth - dailyCosts.length;
                        const remainingBudget = projectedCost - totalCost;

                        return (
                          <>
                            <div className="p-4 rounded-xl bg-[var(--surface-tertiary)]">
                              <div className="text-xs text-[var(--text-muted)] mb-1">Current Month</div>
                              <div className="text-2xl font-bold font-mono text-[var(--neon-cyan)]">{formatCost(totalCost)}</div>
                              <div className="text-xs text-[var(--text-muted)] mt-1">{dailyCosts.length} days tracked</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--surface-tertiary)]">
                              <div className="text-xs text-[var(--text-muted)] mb-1">Projected Total</div>
                              <div className="text-2xl font-bold font-mono text-[var(--neon-amber)]">{formatCost(projectedCost)}</div>
                              <div className="text-xs text-[var(--text-muted)] mt-1">Based on daily avg</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--surface-tertiary)]">
                              <div className="text-xs text-[var(--text-muted)] mb-1">Avg Daily Cost</div>
                              <div className="text-2xl font-bold font-mono text-[var(--neon-green)]">{formatCost(avgDailyCost)}</div>
                              <div className="text-xs text-[var(--text-muted)] mt-1">Per day</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[var(--text-muted)]">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Not enough data for forecast</p>
                    </div>
                  )}
                </div>
              </SpotlightCard>

              {/* Daily Cost Chart */}
              <SpotlightCard glowColor="rgba(255, 184, 0, 0.1)">
                <div className="p-5">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-6 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[var(--neon-amber)]" />
                    Daily Cost Trend
                  </h3>
                  {dailyCosts.length > 0 ? (
                    <div className="space-y-3">
                      {dailyCosts.slice(-14).map((day, i) => {
                        const maxCost = Math.max(...dailyCosts.map(d => d.cost_usd), 0.01);
                        const percent = (day.cost_usd / maxCost) * 100;
                        return (
                          <div key={day.date} className="flex items-center gap-3">
                            <span className="text-xs text-[var(--text-muted)] w-16 shrink-0">
                              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <div className="flex-1 h-6 bg-[var(--surface-tertiary)] rounded-full overflow-hidden relative">
                              <motion.div
                                className="h-full bg-gradient-to-r from-[var(--neon-amber)] to-[var(--neon-cyan)] rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(percent, 2)}%` }}
                                transition={{ delay: i * 0.05, duration: 0.3 }}
                              />
                            </div>
                            <span className="text-xs font-mono text-[var(--text-primary)] w-16 text-right">
                              {formatCost(day.cost_usd)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[var(--text-muted)]">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No daily cost data yet</p>
                    </div>
                  )}
                </div>
              </SpotlightCard>

              {/* Cost by Provider */}
              <SpotlightCard glowColor="rgba(0, 255, 136, 0.1)">
                <div className="p-5">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-6">Cost by Provider</h3>
                  {costByProvider.length > 0 ? (
                    <AnimatedBarChart
                      data={costByProvider}
                      max={Math.max(...costByProvider.map(p => p.value), 0.01)}
                    />
                  ) : (
                    <div className="text-center py-8 text-[var(--text-muted)]">
                      <PieChart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No provider cost data yet</p>
                    </div>
                  )}
                </div>
              </SpotlightCard>
            </motion.div>
          )}

          {activeTab === 'models' && (
            <motion.div
              key="models"
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {byModel.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)]">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
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
                        <div className="text-xs text-[var(--text-muted)]">{extractProvider(model.model)}</div>
                      </div>
                    </div>
                  </SpotlightCard>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'agents' && (
            <motion.div
              key="agents"
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {byAgent.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)]">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No agent usage data yet</p>
                </div>
              ) : (
                byAgent.map((agent, idx) => (
                  <SpotlightCard key={agent.agent_id} glowColor={`${CHART_COLORS[idx % CHART_COLORS.length]}10`}>
                    <div className="p-4 flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${CHART_COLORS[idx % CHART_COLORS.length]}15` }}
                      >
                        <Users className="w-5 h-5" style={{ color: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[var(--text-primary)]">{agent.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{agent.tool_calls} tool calls</div>
                      </div>
                      <div className="font-mono text-[var(--neon-cyan)]">{formatTokens(agent.total_tokens)}</div>
                    </div>
                  </SpotlightCard>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Analytics;
