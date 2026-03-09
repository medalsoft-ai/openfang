import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { api } from '@/api/client';
import { Plus, Loader2, Play, Trash2, Clock, CalendarDays } from 'lucide-react';

// Types matching Alpine.js scheduler.js
interface CronJob {
  id: string;
  name: string;
  cron: string;
  agent_id?: string;
  message?: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
  delivery?: string;
  created_at?: string;
}

interface Trigger {
  id: string;
  agent_id: string;
  pattern: Record<string, unknown> | string;
  prompt_template: string;
  fire_count: number;
  max_fires: number;
  enabled: boolean;
  created_at: string;
}

interface HistoryItem {
  timestamp: string;
  name: string;
  type: 'schedule' | 'trigger';
  status: string;
  run_count: number;
}

interface Agent {
  id: string;
  name: string;
  model_provider?: string;
  model_name?: string;
}

// Cron presets from scheduler.js
const CRON_PRESETS = [
  { label: 'Every minute', cron: '* * * * *' },
  { label: 'Every 5 minutes', cron: '*/5 * * * *' },
  { label: 'Every 15 minutes', cron: '*/15 * * * *' },
  { label: 'Every 30 minutes', cron: '*/30 * * * *' },
  { label: 'Every hour', cron: '0 * * * *' },
  { label: 'Every 6 hours', cron: '0 */6 * * *' },
  { label: 'Daily at midnight', cron: '0 0 * * *' },
  { label: 'Daily at 9am', cron: '0 9 * * *' },
  { label: 'Weekdays at 9am', cron: '0 9 * * 1-5' },
  { label: 'Every Monday 9am', cron: '0 9 * * 1' },
  { label: 'First of month', cron: '0 0 1 * *' },
];

// Utility functions from scheduler.js
function describeCron(expr: string): string {
  if (!expr) return '';
  if (expr.startsWith('every ')) return expr;
  if (expr.startsWith('at ')) return 'One-time: ' + expr.substring(3);

  const map: Record<string, string> = {
    '* * * * *': 'Every minute',
    '*/2 * * * *': 'Every 2 minutes',
    '*/5 * * * *': 'Every 5 minutes',
    '*/10 * * * *': 'Every 10 minutes',
    '*/15 * * * *': 'Every 15 minutes',
    '*/30 * * * *': 'Every 30 minutes',
    '0 * * * *': 'Every hour',
    '0 */2 * * *': 'Every 2 hours',
    '0 */4 * * *': 'Every 4 hours',
    '0 */6 * * *': 'Every 6 hours',
    '0 */12 * * *': 'Every 12 hours',
    '0 0 * * *': 'Daily at midnight',
    '0 6 * * *': 'Daily at 6:00 AM',
    '0 9 * * *': 'Daily at 9:00 AM',
    '0 12 * * *': 'Daily at noon',
    '0 18 * * *': 'Daily at 6:00 PM',
    '0 9 * * 1-5': 'Weekdays at 9:00 AM',
    '0 9 * * 1': 'Mondays at 9:00 AM',
    '0 0 * * 0': 'Sundays at midnight',
    '0 0 1 * *': '1st of every month',
    '0 0 * * 1': 'Mondays at midnight',
  };
  if (map[expr]) return map[expr];

  const parts = expr.split(' ');
  if (parts.length !== 5) return expr;

  const [min, hour, dom, mon, dow] = parts;

  if (min.startsWith('*/') && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return 'Every ' + min.substring(2) + ' minutes';
  }
  if (min === '0' && hour.startsWith('*/') && dom === '*' && mon === '*' && dow === '*') {
    return 'Every ' + hour.substring(2) + ' hours';
  }

  const dowNames: Record<string, string> = {
    '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat', '7': 'Sun',
    '1-5': 'Weekdays', '0,6': 'Weekends', '6,0': 'Weekends'
  };

  if (dom === '*' && mon === '*' && /^\d+$/.test(min) && /^\d+$/.test(hour)) {
    const h = parseInt(hour, 10);
    const m = parseInt(min, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    const mStr = m < 10 ? '0' + m : '' + m;
    const timeStr = h12 + ':' + mStr + ' ' + ampm;
    if (dow === '*') return 'Daily at ' + timeStr;
    const dowLabel = dowNames[dow] || ('DoW ' + dow);
    return dowLabel + ' at ' + timeStr;
  }

  return expr;
}

function formatTime(ts?: string): string {
  if (!ts) return '-';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString();
  } catch {
    return '-';
  }
}

function relativeTime(ts?: string): string {
  if (!ts) return 'never';
  try {
    const diff = Date.now() - new Date(ts).getTime();
    if (isNaN(diff)) return 'never';
    if (diff < 0) {
      const absDiff = Math.abs(diff);
      if (absDiff < 60000) return 'in <1m';
      if (absDiff < 3600000) return 'in ' + Math.floor(absDiff / 60000) + 'm';
      if (absDiff < 86400000) return 'in ' + Math.floor(absDiff / 3600000) + 'h';
      return 'in ' + Math.floor(absDiff / 86400000) + 'd';
    }
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
  } catch {
    return 'never';
  }
}

function triggerType(pattern: Record<string, unknown> | string): string {
  if (!pattern) return 'unknown';
  if (typeof pattern === 'string') return pattern;
  const keys = Object.keys(pattern);
  if (keys.length === 0) return 'unknown';
  const key = keys[0];
  const names: Record<string, string> = {
    lifecycle: 'Lifecycle',
    agent_spawned: 'Agent Spawned',
    agent_terminated: 'Agent Terminated',
    system: 'System',
    system_keyword: 'System Keyword',
    memory_update: 'Memory Update',
    memory_key_pattern: 'Memory Key',
    all: 'All Events',
    content_match: 'Content Match',
  };
  return names[key] || key.replace(/_/g, ' ');
}

export function Scheduler() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'triggers' | 'history'>('jobs');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newJob, setNewJob] = useState({
    name: '',
    cron: '',
    agent_id: '',
    message: '',
    enabled: true,
  });
  const [runningJobId, setRunningJobId] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch agents for dropdown
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => api.get('/api/agents'),
  });

  // Fetch scheduled jobs
  const {
    data: jobsData,
    isLoading: jobsLoading,
    error: jobsError,
  } = useQuery<{ jobs: unknown[] }>({
    queryKey: ['cron-jobs'],
    queryFn: () => api.get('/api/cron/jobs'),
  });

  // Normalize jobs to match UI expectations
  const jobs: CronJob[] = useMemo(() => {
    const raw = jobsData?.jobs || [];
    return raw.map((j: unknown) => {
      const job = j as {
        id: string;
        name: string;
        schedule?: { kind: string; expr?: string; every_secs?: number; at?: string };
        agent_id?: string;
        action?: { message?: string };
        enabled: boolean;
        last_run?: string;
        next_run?: string;
        delivery?: { kind?: string };
        created_at?: string;
      };
      let cron = '';
      if (job.schedule) {
        if (job.schedule.kind === 'cron') cron = job.schedule.expr || '';
        else if (job.schedule.kind === 'every') cron = 'every ' + job.schedule.every_secs + 's';
        else if (job.schedule.kind === 'at') cron = 'at ' + (job.schedule.at || '');
      }
      return {
        id: job.id,
        name: job.name,
        cron,
        agent_id: job.agent_id,
        message: job.action?.message || '',
        enabled: job.enabled,
        last_run: job.last_run,
        next_run: job.next_run,
        delivery: job.delivery?.kind || '',
        created_at: job.created_at,
      };
    });
  }, [jobsData]);

  // Fetch triggers
  const {
    data: triggers = [],
    isLoading: triggersLoading,
    error: triggersError,
  } = useQuery<Trigger[]>({
    queryKey: ['triggers'],
    queryFn: () => api.get('/api/triggers'),
    enabled: activeTab === 'triggers',
  });

  // Build history from jobs and triggers
  const history: HistoryItem[] = useMemo(() => {
    const items: HistoryItem[] = [];
    jobs.forEach((job) => {
      if (job.last_run) {
        items.push({
          timestamp: job.last_run,
          name: job.name || '(unnamed)',
          type: 'schedule',
          status: 'completed',
          run_count: 0,
        });
      }
    });
    triggers.forEach((t) => {
      if (t.fire_count > 0) {
        items.push({
          timestamp: t.created_at,
          name: 'Trigger: ' + triggerType(t.pattern),
          type: 'trigger',
          status: 'fired',
          run_count: t.fire_count,
        });
      }
    });
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return items;
  }, [jobs, triggers]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => {
      const body = {
        agent_id: newJob.agent_id === '__any__' ? undefined : newJob.agent_id,
        name: newJob.name,
        schedule: { kind: 'cron', expr: newJob.cron },
        action: { kind: 'agent_turn', message: newJob.message || 'Scheduled task: ' + newJob.name },
        delivery: { kind: 'last_channel' },
        enabled: newJob.enabled,
      };
      return api.post('/api/cron/jobs', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      setShowCreateForm(false);
      setNewJob({ name: '', cron: '', agent_id: '__any__', message: '', enabled: true });
    },
  });

  const toggleJobMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.put(`/api/cron/jobs/${id}/enable`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cron-jobs'] }),
  });

  const deleteJobMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/cron/jobs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cron-jobs'] }),
  });

  const runNowMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/schedules/${id}/run`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      setRunningJobId('');
    },
    onError: () => setRunningJobId(''),
  });

  const toggleTriggerMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.put(`/api/triggers/${id}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['triggers'] }),
  });

  const deleteTriggerMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/triggers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['triggers'] }),
  });

  // Helpers
  const agentName = (agentId?: string): string => {
    if (!agentId) return '(any)';
    const agent = agents.find((a) => a.id === agentId);
    if (agent) return agent.name;
    if (agentId.length > 12) return agentId.substring(0, 8) + '...';
    return agentId;
  };

  const enabledJobCount = jobs.filter((j) => j.enabled).length;

  const handleCreateJob = () => {
    if (!newJob.name.trim()) return;
    if (!newJob.cron.trim()) return;
    createMutation.mutate();
  };

  const handleRunNow = (job: CronJob) => {
    setRunningJobId(job.id);
    runNowMutation.mutate(job.id);
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Scheduler</h1>
            <p className="text-muted-foreground">Schedule automated tasks and workflows</p>
          </div>
          {activeTab === 'jobs' && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Job
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'jobs'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('jobs')}
          >
            Scheduled Jobs
            {jobs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {enabledJobCount}/{jobs.length} active
              </Badge>
            )}
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'triggers'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('triggers')}
          >
            Event Triggers
            {triggers.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {triggers.length}
              </Badge>
            )}
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('history')}
          >
            Run History
          </button>
        </div>

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            {jobsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-3 text-muted-foreground">Loading scheduled jobs...</span>
              </div>
            ) : jobsError ? (
              <div className="text-center py-12 text-destructive">
                <p>Failed to load jobs</p>
                <p className="text-sm text-muted-foreground">{(jobsError as Error).message}</p>
                <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['cron-jobs'] })}>
                  Retry
                </Button>
              </div>
            ) : (
              <>
                {/* Explainer Card */}
                <Card className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="font-semibold text-sm mb-1">Scheduled Jobs</div>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      Create cron-based scheduled jobs that send messages to agents on a recurring schedule.
                      Use cron expressions like <code className="text-primary">*/5 * * * *</code> (every 5 min) or
                      <code className="text-primary"> 0 9 * * 1-5</code> (weekdays at 9am). You can also run any job
                      manually with the &quot;Run Now&quot; button.
                    </div>
                  </CardContent>
                </Card>

                {/* Jobs Table */}
                {jobs.length > 0 ? (
                  <Card>
                    <CardContent className="p-0">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-4 font-medium">Name</th>
                            <th className="text-left p-4 font-medium">Schedule</th>
                            <th className="text-left p-4 font-medium">Agent</th>
                            <th className="text-left p-4 font-medium">Status</th>
                            <th className="text-left p-4 font-medium">Last Run</th>
                            <th className="text-left p-4 font-medium">Next Run</th>
                            <th className="text-left p-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobs.map((job) => (
                            <tr key={job.id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="p-4">
                                <div className="font-semibold">{job.name || job.message || '(unnamed)'}</div>
                                {job.message && (
                                  <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={job.message}>
                                    {job.message.substring(0, 60) + (job.message.length > 60 ? '...' : '')}
                                  </div>
                                )}
                              </td>
                              <td className="p-4">
                                <code className="text-xs text-primary font-mono">{job.cron}</code>
                                <div className="text-xs text-muted-foreground">{describeCron(job.cron)}</div>
                              </td>
                              <td className="p-4 truncate max-w-[120px]" title={job.agent_id}>
                                {agentName(job.agent_id)}
                              </td>
                              <td className="p-4">
                                <Badge variant={job.enabled ? 'default' : 'secondary'}>
                                  {job.enabled ? 'Active' : 'Paused'}
                                </Badge>
                              </td>
                              <td className="p-4 text-xs" title={formatTime(job.last_run)}>
                                {relativeTime(job.last_run)}
                              </td>
                              <td className="p-4 text-xs" title={formatTime(job.next_run)}>
                                {relativeTime(job.next_run)}
                              </td>
                              <td className="p-4">
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleRunNow(job)}
                                    disabled={runningJobId === job.id}
                                  >
                                    {runningJobId === job.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Play className="h-3 w-3" />
                                    )}
                                    <span className="ml-1">Run</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleJobMutation.mutate({ id: job.id, enabled: !job.enabled })}
                                  >
                                    {job.enabled ? 'Pause' : 'Enable'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteJobMutation.mutate(job.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No scheduled jobs</h3>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                      Create a cron job to run agents on a recurring schedule. Jobs are stored persistently and survive restarts.
                    </p>
                    <Button onClick={() => setShowCreateForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Scheduled Job
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Triggers Tab */}
        {activeTab === 'triggers' && (
          <div className="space-y-6">
            {triggersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-3 text-muted-foreground">Loading triggers...</span>
              </div>
            ) : triggersError ? (
              <div className="text-center py-12 text-destructive">
                <p>Failed to load triggers</p>
                <p className="text-sm text-muted-foreground">{(triggersError as Error).message}</p>
                <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['triggers'] })}>
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <Card className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="font-semibold text-sm mb-1">Event Triggers</div>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      Event triggers fire agents in response to system events (agent lifecycle, memory updates, custom events).
                      Create and manage triggers on the <a href="#/workflows" className="text-primary hover:underline">Workflows</a> page.
                      This view shows all active triggers for monitoring.
                    </div>
                  </CardContent>
                </Card>

                {triggers.length > 0 ? (
                  <Card>
                    <CardContent className="p-0">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-4 font-medium">Agent</th>
                            <th className="text-left p-4 font-medium">Pattern</th>
                            <th className="text-left p-4 font-medium">Prompt</th>
                            <th className="text-left p-4 font-medium">Fires</th>
                            <th className="text-left p-4 font-medium">Enabled</th>
                            <th className="text-left p-4 font-medium">Created</th>
                            <th className="text-left p-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {triggers.map((t) => (
                            <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="p-4 font-semibold truncate max-w-[120px]" title={t.agent_id}>
                                {agentName(t.agent_id)}
                              </td>
                              <td className="p-4">
                                <Badge variant="outline">{triggerType(t.pattern)}</Badge>
                              </td>
                              <td className="p-4 text-xs text-muted-foreground truncate max-w-[180px]" title={t.prompt_template}>
                                {t.prompt_template}
                              </td>
                              <td className="p-4">
                                {t.fire_count}{t.max_fires > 0 ? '/' + t.max_fires : ''}
                              </td>
                              <td className="p-4">
                                <Switch
                                  checked={t.enabled}
                                  onCheckedChange={() => toggleTriggerMutation.mutate({ id: t.id, enabled: !t.enabled })}
                                />
                              </td>
                              <td className="p-4 text-xs">
                                {new Date(t.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-4">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteTriggerMutation.mutate(t.id)}
                                >
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-semibold mb-2">No event triggers</h3>
                    <p className="text-muted-foreground mb-4">
                      Create event triggers on the <a href="#/workflows" className="text-primary hover:underline">Workflows page</a> to fire agents in response to system events.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-4">
                <div className="font-semibold text-sm mb-1">Run History</div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  Recent executions of scheduled jobs and event trigger fires. History is aggregated from schedule run counts and trigger fire counts.
                </div>
              </CardContent>
            </Card>

            {history.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium">Time</th>
                        <th className="text-left p-4 font-medium">Name</th>
                        <th className="text-left p-4 font-medium">Type</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Total Runs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-4 text-xs whitespace-nowrap">{formatTime(h.timestamp)}</td>
                          <td className="p-4 font-semibold">{h.name}</td>
                          <td className="p-4">
                            <Badge variant={h.type === 'schedule' ? 'default' : 'secondary'}>
                              {h.type === 'schedule' ? 'Cron Job' : 'Trigger'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-green-600">{h.status}</Badge>
                          </td>
                          <td className="p-4">{h.run_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <CalendarDays className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No run history yet</h3>
                <p className="text-muted-foreground">
                  Run history will appear here after scheduled jobs or triggers execute.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Create Job Modal */}
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Scheduled Job</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Job Name</Label>
                <Input
                  value={newJob.name}
                  onChange={(e) => setNewJob((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="daily-report"
                />
              </div>

              <div className="space-y-2">
                <Label>Cron Expression</Label>
                <Input
                  value={newJob.cron}
                  onChange={(e) => setNewJob((prev) => ({ ...prev, cron: e.target.value }))}
                  placeholder="0 9 * * 1-5"
                  className="font-mono"
                />
                {newJob.cron && (
                  <div className="text-xs text-muted-foreground">{describeCron(newJob.cron)}</div>
                )}
                <div className="text-xs text-muted-foreground">
                  Format: <code>minute hour day-of-month month day-of-week</code>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quick Presets</Label>
                <div className="flex gap-1 flex-wrap">
                  {CRON_PRESETS.map((preset) => (
                    <Button
                      key={preset.cron}
                      size="sm"
                      variant={newJob.cron === preset.cron ? 'default' : 'ghost'}
                      onClick={() => setNewJob((prev) => ({ ...prev, cron: preset.cron }))}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target Agent</Label>
                <Select
                  value={newJob.agent_id}
                  onValueChange={(v) => setNewJob((prev) => ({ ...prev, agent_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any available agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">Any available agent</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.model_provider || 'unknown'}:{a.model_name || 'unknown'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {agents.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    No agents running. <a href="#/agents" className="text-primary hover:underline">Spawn one first.</a>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Message to Send</Label>
                <Textarea
                  value={newJob.message}
                  onChange={(e) => setNewJob((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Generate and email the daily status report..."
                  rows={3}
                />
                <div className="text-xs text-muted-foreground">
                  The message sent to the agent each time this job runs.
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={newJob.enabled}
                  onCheckedChange={(v) => setNewJob((prev) => ({ ...prev, enabled: v }))}
                />
                <span className="text-sm">
                  {newJob.enabled ? 'Enabled (will start running immediately)' : 'Disabled (create paused)'}
                </span>
              </div>

              <Button
                className="w-full mt-4"
                onClick={handleCreateJob}
                disabled={!newJob.name || !newJob.cron || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default Scheduler;
