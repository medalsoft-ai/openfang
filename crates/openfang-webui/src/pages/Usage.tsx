import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { api } from '@/api/client';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Chart colors for providers (stable palette)
const CHART_COLORS = [
  '#FF5C00', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#EF4444', '#84CC16', '#F97316',
  '#6366F1', '#14B8A6', '#E11D48', '#A855F7', '#22D3EE'
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

interface ByModelResponse {
  models: ModelUsage[];
}

interface ByAgentResponse {
  agents: AgentUsage[];
}

export function Usage() {
  const [activeTab, setActiveTab] = useState('summary');

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary
  } = useQuery<UsageSummary>({
    queryKey: ['usage', 'summary'],
    queryFn: async () => api.get('/api/usage/summary'),
  });

  const {
    data: byModelData,
    isLoading: byModelLoading,
    error: byModelError,
    refetch: refetchByModel
  } = useQuery<ByModelResponse>({
    queryKey: ['usage', 'by-model'],
    queryFn: async () => api.get('/api/usage/by-model'),
  });

  const {
    data: byAgentData,
    isLoading: byAgentLoading,
    error: byAgentError,
    refetch: refetchByAgent
  } = useQuery<ByAgentResponse>({
    queryKey: ['usage', 'by-agent'],
    queryFn: async () => api.get('/api/usage'),
  });

  const {
    data: dailyCostsData,
    isLoading: dailyCostsLoading,
    error: dailyCostsError,
    refetch: refetchDailyCosts
  } = useQuery<DailyCostsResponse>({
    queryKey: ['usage', 'daily'],
    queryFn: async () => api.get('/api/usage/daily'),
  });

  const byModel = byModelData?.models || [];
  const byAgent = byAgentData?.agents || [];
  const dailyCosts = dailyCostsData?.days || [];
  const todayCost = dailyCostsData?.today_cost_usd || 0;
  const firstEventDate = dailyCostsData?.first_event_date || null;

  const isLoading = summaryLoading || byModelLoading || byAgentLoading || dailyCostsLoading;
  const hasError = summaryError || byModelError || byAgentError || dailyCostsError;

  const handleRetry = () => {
    refetchSummary();
    refetchByModel();
    refetchByAgent();
    refetchDailyCosts();
  };

  const formatTokens = (n: number | undefined) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  };

  const formatCost = (c: number | undefined) => {
    if (!c) return '$0.00';
    if (c < 0.01) return '$' + c.toFixed(4);
    return '$' + c.toFixed(2);
  };

  const maxTokens = () => {
    let max = 0;
    byModel.forEach((m) => {
      const t = (m.total_input_tokens || 0) + (m.total_output_tokens || 0);
      if (t > max) max = t;
    });
    return max || 1;
  };

  const barWidth = (m: ModelUsage) => {
    const t = (m.total_input_tokens || 0) + (m.total_output_tokens || 0);
    return Math.max(2, Math.round((t / maxTokens()) * 100)) + '%';
  };

  const avgCostPerMessage = () => {
    const count = summary?.call_count || 0;
    if (count === 0) return 0;
    return (summary?.total_cost_usd || 0) / count;
  };

  const projectedMonthlyCost = () => {
    if (!firstEventDate || !summary?.total_cost_usd) return 0;
    const first = new Date(firstEventDate);
    const now = new Date();
    const diffMs = now.getTime() - first.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const days = diffDays < 1 ? 1 : diffDays;
    return (summary.total_cost_usd / days) * 30;
  };

  const extractProvider = (modelName: string | undefined) => {
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
    if (lower.includes('jamba')) return 'AI21';
    if (lower.includes('qwen')) return 'Together';
    return 'Other';
  };

  const costByProvider = () => {
    const providerMap: Record<string, { provider: string; cost: number; tokens: number; calls: number }> = {};
    byModel.forEach((m) => {
      const provider = extractProvider(m.model);
      if (!providerMap[provider]) {
        providerMap[provider] = { provider, cost: 0, tokens: 0, calls: 0 };
      }
      providerMap[provider].cost += (m.total_cost_usd || 0);
      providerMap[provider].tokens += (m.total_input_tokens || 0) + (m.total_output_tokens || 0);
      providerMap[provider].calls += (m.call_count || 0);
    });
    const result = Object.values(providerMap);
    result.sort((a, b) => b.cost - a.cost);
    return result;
  };

  const donutSegments = () => {
    const providers = costByProvider();
    const total = providers.reduce((sum, p) => sum + p.cost, 0);
    if (total === 0) return [];

    const segments = [];
    let offset = 0;
    const circumference = 2 * Math.PI * 60; // r=60
    for (let i = 0; i < providers.length; i++) {
      const pct = providers[i].cost / total;
      const dashLen = pct * circumference;
      segments.push({
        provider: providers[i].provider,
        cost: providers[i].cost,
        percent: Math.round(pct * 100),
        color: CHART_COLORS[i % CHART_COLORS.length],
        dasharray: `${dashLen} ${circumference - dashLen}`,
        dashoffset: -offset,
        circumference
      });
      offset += dashLen;
    }
    return segments;
  };

  const barChartData = () => {
    if (!dailyCosts || dailyCosts.length === 0) return [];
    const maxCost = Math.max(...dailyCosts.map(d => d.cost_usd), 0);
    const max = maxCost === 0 ? 1 : maxCost;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dailyCosts.map((d) => {
      const date = new Date(d.date + 'T12:00:00');
      const dayName = dayNames[date.getDay()] || '?';
      const heightPct = Math.max(2, Math.round((d.cost_usd / max) * 120));
      return {
        date: d.date,
        dayName,
        cost: d.cost_usd,
        tokens: d.tokens,
        calls: d.calls,
        barHeight: heightPct
      };
    });
  };

  const costByModelSorted = () => {
    const models = [...byModel];
    models.sort((a, b) => (b.total_cost_usd || 0) - (a.total_cost_usd || 0));
    return models;
  };

  const maxModelCost = () => {
    const max = Math.max(...byModel.map(m => m.total_cost_usd || 0), 0);
    return max || 1;
  };

  const costBarWidth = (m: ModelUsage) => {
    return Math.max(2, Math.round(((m.total_cost_usd || 0) / maxModelCost()) * 100)) + '%';
  };

  const modelTier = (modelName: string | undefined) => {
    if (!modelName) return 'unknown';
    const lower = modelName.toLowerCase();
    if (lower.includes('opus') || lower.includes('o1') || lower.includes('o3') || lower.includes('deepseek-r1')) return 'frontier';
    if (lower.includes('sonnet') || lower.includes('gpt-4') || lower.includes('gemini-2.5') || lower.includes('gemini-1.5-pro')) return 'smart';
    if (lower.includes('haiku') || lower.includes('gpt-3.5') || lower.includes('flash') || lower.includes('mixtral')) return 'balanced';
    if (lower.includes('llama') || lower.includes('groq') || lower.includes('gemma')) return 'fast';
    return 'balanced';
  };

  const getTierBadgeClass = (tier: string) => {
    switch (tier) {
      case 'frontier': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'smart': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'balanced': return 'bg-green-100 text-green-800 border-green-200';
      case 'fast': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading usage data...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 p-4 border border-destructive/50 rounded-lg bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-destructive">Failed to load usage data. Please try again.</p>
            <Button variant="outline" size="sm" onClick={handleRetry} className="ml-auto">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalTokens = (summary?.total_input_tokens || 0) + (summary?.total_output_tokens || 0);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Usage</h1>
          <p className="text-muted-foreground">Track API usage and costs</p>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold font-mono">{formatTokens(totalTokens)}</div>
              <div className="text-sm text-muted-foreground">Total Tokens</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold font-mono">{formatCost(summary?.total_cost_usd)}</div>
              <div className="text-sm text-muted-foreground">Estimated Cost</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold font-mono">{summary?.call_count || 0}</div>
              <div className="text-sm text-muted-foreground">API Calls</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold font-mono">{summary?.total_tool_calls || 0}</div>
              <div className="text-sm text-muted-foreground">Tool Calls</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="by-model">By Model</TabsTrigger>
            <TabsTrigger value="by-agent">By Agent</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Token Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Input Tokens</span>
                    <span className="font-mono font-medium">{formatTokens(summary?.total_input_tokens)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Output Tokens</span>
                    <span className="font-mono font-medium">{formatTokens(summary?.total_output_tokens)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Total Cost</span>
                    <span className="font-mono font-medium">{formatCost(summary?.total_cost_usd)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">API Calls</span>
                    <span className="font-mono font-medium">{summary?.call_count || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Tool Calls</span>
                    <span className="font-mono font-medium">{summary?.total_tool_calls || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* By Model Tab */}
          <TabsContent value="by-model">
            {byModel.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Model</th>
                          <th className="text-left p-3 font-medium">Calls</th>
                          <th className="text-left p-3 font-medium">Input Tokens</th>
                          <th className="text-left p-3 font-medium">Output Tokens</th>
                          <th className="text-left p-3 font-medium">Cost</th>
                          <th className="text-left p-3 font-medium w-[30%]">Usage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byModel.map((m) => (
                          <tr key={m.model} className="border-b last:border-0">
                            <td className="p-3 font-bold text-xs">{m.model}</td>
                            <td className="p-3 font-mono">{m.call_count}</td>
                            <td className="p-3 font-mono">{formatTokens(m.total_input_tokens)}</td>
                            <td className="p-3 font-mono">{formatTokens(m.total_output_tokens)}</td>
                            <td className="p-3 font-mono">{formatCost(m.total_cost_usd)}</td>
                            <td className="p-3">
                              <div className="bg-muted rounded h-4 overflow-hidden">
                                <div
                                  className="h-full rounded bg-primary transition-all duration-300"
                                  style={{ width: barWidth(m) }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No model usage data yet.</p>
              </div>
            )}
          </TabsContent>

          {/* By Agent Tab */}
          <TabsContent value="by-agent">
            {byAgent.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Agent</th>
                          <th className="text-left p-3 font-medium">Total Tokens</th>
                          <th className="text-left p-3 font-medium">Tool Calls</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byAgent.map((a) => (
                          <tr key={a.agent_id} className="border-b last:border-0">
                            <td className="p-3 font-bold">{a.name}</td>
                            <td className="p-3 font-mono">{a.total_tokens ? a.total_tokens.toLocaleString() : '0'}</td>
                            <td className="p-3 font-mono">{a.tool_calls || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No agent usage data yet.</p>
              </div>
            )}
          </TabsContent>

          {/* Costs Tab */}
          <TabsContent value="costs" className="space-y-4">
            {/* Cost Summary Cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold font-mono">{formatCost(summary?.total_cost_usd)}</div>
                  <div className="text-sm text-muted-foreground">Total Spend</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold font-mono">{formatCost(todayCost)}</div>
                  <div className="text-sm text-muted-foreground">Today&apos;s Spend</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold font-mono">{formatCost(projectedMonthlyCost())}</div>
                  <div className="text-sm text-muted-foreground">Projected Monthly</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold font-mono">{formatCost(avgCostPerMessage())}</div>
                  <div className="text-sm text-muted-foreground">Avg Cost / Message</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Donut Chart: Cost by Provider */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost by Provider</CardTitle>
                </CardHeader>
                <CardContent>
                  {donutSegments().length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">No cost data yet.</div>
                  ) : (
                    <div className="flex items-center gap-6">
                      <div className="relative w-40 h-40 shrink-0">
                        <svg viewBox="0 0 160 160" width="160" height="160" className="transform -rotate-90">
                          {donutSegments().map((seg) => (
                            <circle
                              key={seg.provider}
                              cx="80"
                              cy="80"
                              r="60"
                              fill="none"
                              stroke={seg.color}
                              strokeWidth="24"
                              strokeDasharray={seg.dasharray}
                              strokeDashoffset={seg.dashoffset}
                            >
                              <title>{`${seg.provider}: ${seg.percent}% (${formatCost(seg.cost)})`}</title>
                            </circle>
                          ))}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-sm font-bold font-mono">{formatCost(summary?.total_cost_usd)}</span>
                          <span className="text-xs text-muted-foreground font-mono">TOTAL</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        {donutSegments().map((seg) => (
                          <div key={seg.provider} className="flex items-center gap-2 text-sm">
                            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: seg.color }} />
                            <span className="flex-1 truncate">{seg.provider}</span>
                            <span className="font-medium">{seg.percent}%</span>
                            <span className="text-muted-foreground font-mono">{formatCost(seg.cost)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bar Chart: Daily Cost */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Cost (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  {barChartData().length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">No daily data yet.</div>
                  ) : (
                    <div className="h-44 flex items-end justify-center gap-2">
                      {barChartData().map((bar) => (
                        <div key={bar.date} className="flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground font-mono">{formatCost(bar.cost)}</span>
                          <div
                            className="w-8 bg-primary/85 rounded-t"
                            style={{ height: `${bar.barHeight}px` }}
                            title={`${bar.date}: ${formatCost(bar.cost)} (${bar.calls} calls)`}
                          />
                          <span className="text-xs text-muted-foreground font-mono">{bar.dayName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Cost by Model Table */}
            <Card>
              <CardHeader>
                <CardTitle>Cost by Model</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {costByModelSorted().length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Model</th>
                          <th className="text-left p-3 font-medium">Provider</th>
                          <th className="text-left p-3 font-medium">Tier</th>
                          <th className="text-left p-3 font-medium">Input Tokens</th>
                          <th className="text-left p-3 font-medium">Output Tokens</th>
                          <th className="text-left p-3 font-medium">Calls</th>
                          <th className="text-left p-3 font-medium">Cost</th>
                          <th className="text-left p-3 font-medium w-[20%]">Cost Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {costByModelSorted().map((m) => (
                          <tr key={`cost-${m.model}`} className="border-b last:border-0">
                            <td className="p-3 font-bold text-xs">{m.model}</td>
                            <td className="p-3">
                              <Badge variant="secondary" className="text-[9px]">
                                {extractProvider(m.model)}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className={`text-[9px] capitalize ${getTierBadgeClass(modelTier(m.model))}`}>
                                {modelTier(m.model)}
                              </Badge>
                            </td>
                            <td className="p-3 font-mono">{formatTokens(m.total_input_tokens)}</td>
                            <td className="p-3 font-mono">{formatTokens(m.total_output_tokens)}</td>
                            <td className="p-3 font-mono">{m.call_count}</td>
                            <td className="p-3 font-mono font-bold">{formatCost(m.total_cost_usd)}</td>
                            <td className="p-3">
                              <div className="bg-muted rounded h-4 overflow-hidden">
                                <div
                                  className="h-full rounded bg-primary transition-all duration-300"
                                  style={{ width: costBarWidth(m) }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-8">No model cost data yet.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Usage;
