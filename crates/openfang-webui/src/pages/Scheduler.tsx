// Scheduler - Chronos Clockwork Style
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { cyberColors } from '@/lib/animations';
import {
  Clock, Plus, Play, Trash2, CalendarDays, Loader2,
  Pause, Check, X, Timer, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
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

// Cron presets
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

// Helper functions
function describeCron(expr: string): string {
  if (!expr) return '';
  if (expr.startsWith('every ')) return expr;
  if (expr.startsWith('at ')) return 'One-time: ' + expr.substring(3);

  const map: Record<string, string> = {
    '* * * * *': 'Every minute',
    '*/5 * * * *': 'Every 5 minutes',
    '*/15 * * * *': 'Every 15 minutes',
    '*/30 * * * *': 'Every 30 minutes',
    '0 * * * *': 'Every hour',
    '0 */6 * * *': 'Every 6 hours',
    '0 0 * * *': 'Daily at midnight',
    '0 9 * * *': 'Daily at 9:00 AM',
    '0 9 * * 1-5': 'Weekdays at 9:00 AM',
    '0 9 * * 1': 'Mondays at 9:00 AM',
    '0 0 1 * *': '1st of every month',
  };
  if (map[expr]) return map[expr];
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
    content_match: 'Content Match',
  };
  return names[key] || key.replace(/_/g, ' ');
}

// Status badge with neon colors
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded text-[10px] font-mono uppercase',
        active
          ? 'bg-[var(--neon-green)]/15 text-[var(--neon-green)] border border-[var(--neon-green)]/30'
          : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] border border-[var(--border-default)]'
      )}
    >
      {active ? 'ACTIVE' : 'PAUSED'}
    </span>
  );
}

// Job card with gear animation
function JobCard({
  job,
  agentName,
  onToggle,
  onDelete,
  onRun,
  isRunning
}: {
  job: CronJob;
  agentName: string;
  onToggle: () => void;
  onDelete: () => void;
  onRun: () => void;
  isRunning: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <SpotlightCard glowColor={job.enabled ? 'rgba(255, 184, 0, 0.1)' : 'rgba(255,255,255,0.05)'}>
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-10 h-10 rounded-lg bg-[var(--neon-amber)]/10 flex items-center justify-center"
                animate={{ rotate: job.enabled ? 360 : 0 }}
                transition={{ duration: 20, repeat: job.enabled ? Infinity : 0, ease: 'linear' }}
              >
                <Clock className="w-5 h-5 text-[var(--neon-amber)]" />
              </motion.div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{job.name || '(unnamed)'}</h3>
                <StatusBadge active={job.enabled} />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <motion.button
                onClick={onRun}
                disabled={isRunning}
                className="p-2 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--neon-cyan)]/10 hover:text-[var(--neon-cyan)]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              </motion.button>
              <motion.button
                onClick={onToggle}
                className={cn(
                  'p-2 rounded-lg',
                  job.enabled
                    ? 'bg-[var(--neon-amber)]/10 text-[var(--neon-amber)]'
                    : 'bg-[var(--surface-tertiary)] text-[var(--text-muted)]'
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </motion.button>
              <motion.button
                onClick={onDelete}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/10"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="px-3 py-2 rounded-lg bg-[var(--surface-tertiary)]">
              <div className="text-[10px] text-[var(--text-muted)] uppercase font-mono mb-1">Schedule</div>
              <code className="text-xs text-[var(--neon-amber)] font-mono">{job.cron}</code>
              <div className="text-[10px] text-[var(--text-muted)]">{describeCron(job.cron)}</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-[var(--surface-tertiary)]">
              <div className="text-[10px] text-[var(--text-muted)] uppercase font-mono mb-1">Agent</div>
              <div className="text-xs text-[var(--text-secondary)]">{agentName}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Last: {relativeTime(job.last_run)}</span>
            <span>Next: {relativeTime(job.next_run)}</span>
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

export function Scheduler() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'triggers' | 'history'>('jobs');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string>('');
  const [newJob, setNewJob] = useState({
    name: '',
    cron: '',
    agent_id: '',
    message: '',
    enabled: true,
  });
  const queryClient = useQueryClient();

  // Fetch agents
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => api.get('/api/agents'),
  });

  // Fetch jobs
  const { data: jobsData, isLoading: jobsLoading } = useQuery<{ jobs: unknown[] }>({
    queryKey: ['cron-jobs'],
    queryFn: () => api.get('/api/cron/jobs'),
  });

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
  const { data: triggers = [], isLoading: triggersLoading } = useQuery<Trigger[]>({
    queryKey: ['triggers'],
    queryFn: () => api.get('/api/triggers'),
    enabled: activeTab === 'triggers',
  });

  // Build history
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
      setShowCreateModal(false);
      setNewJob({ name: '', cron: '', agent_id: '', message: '', enabled: true });
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

  const getAgentName = (agentId?: string): string => {
    if (!agentId) return '(any)';
    const agent = agents.find((a: Agent) => a.id === agentId);
    if (agent) return agent.name;
    return agentId.length > 12 ? agentId.substring(0, 8) + '...' : agentId;
  };

  const enabledJobCount = jobs.filter((j) => j.enabled).length;

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
              <NeonText color="amber">Scheduler</NeonText>
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              {jobs.length} job{jobs.length !== 1 ? 's' : ''} • {enabledJobCount} active
            </p>
          </div>
          {activeTab === 'jobs' && (
            <motion.button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--neon-amber)] text-[var(--void)] font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-5 h-5" /> New Job
            </motion.button>
          )}
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="flex gap-1 mb-6 bg-[var(--surface-secondary)] rounded-xl p-1 w-fit"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {(['jobs', 'triggers', 'history'] as const).map((tab) => (
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
              {tab === 'jobs' && jobs.length > 0 && (
                <span className="ml-2 text-xs opacity-60">{enabledJobCount}/{jobs.length}</span>
              )}
              {tab === 'triggers' && triggers.length > 0 && (
                <span className="ml-2 text-xs opacity-60">{triggers.length}</span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <AnimatePresence mode="wait">
            {jobsLoading ? (
              <motion.div
                key="loading"
                className="flex items-center justify-center h-64"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="w-8 h-8 border-2 border-[var(--neon-amber)] border-t-transparent rounded-full animate-spin" />
              </motion.div>
            ) : jobs.length === 0 ? (
              <motion.div
                key="empty"
                className="text-center py-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="w-20 h-20 rounded-3xl bg-[var(--surface-secondary)] flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-10 h-10 text-[var(--text-muted)]" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No scheduled jobs</h3>
                <p className="text-[var(--text-muted)] mb-6">Create cron jobs to run agents on a schedule</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 rounded-xl bg-[var(--neon-amber)] text-[var(--void)] font-medium"
                >
                  Create Job
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                layout
              >
                <AnimatePresence>
                  {jobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      agentName={getAgentName(job.agent_id)}
                      onToggle={() => toggleJobMutation.mutate({ id: job.id, enabled: !job.enabled })}
                      onDelete={() => {
                        if (confirm(`Delete job "${job.name}"?`)) {
                          deleteJobMutation.mutate(job.id);
                        }
                      }}
                      onRun={() => {
                        setRunningJobId(job.id);
                        runNowMutation.mutate(job.id);
                      }}
                      isRunning={runningJobId === job.id}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Triggers Tab */}
        {activeTab === 'triggers' && (
          <AnimatePresence mode="wait">
            {triggersLoading ? (
              <motion.div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-[var(--neon-amber)] border-t-transparent rounded-full animate-spin" />
              </motion.div>
            ) : triggers.length === 0 ? (
              <motion.div className="text-center py-20">
                <div className="w-20 h-20 rounded-3xl bg-[var(--surface-secondary)] flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-10 h-10 text-[var(--text-muted)]" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No triggers</h3>
                <p className="text-[var(--text-muted)]">Create event triggers on the Workflows page</p>
              </motion.div>
            ) : (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {triggers.map((trigger) => (
                  <SpotlightCard key={trigger.id} glowColor="rgba(255, 184, 0, 0.1)">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--neon-amber)]/10 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-[var(--neon-amber)]" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-[var(--text-primary)]">{triggerType(trigger.pattern)}</h3>
                            <StatusBadge active={trigger.enabled} />
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <motion.button
                            onClick={() => toggleTriggerMutation.mutate({ id: trigger.id, enabled: !trigger.enabled })}
                            className={cn(
                              'p-2 rounded-lg',
                              trigger.enabled
                                ? 'bg-[var(--neon-amber)]/10 text-[var(--neon-amber)]'
                                : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {trigger.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </motion.button>
                          <motion.button
                            onClick={() => {
                              if (confirm('Delete this trigger?')) {
                                deleteTriggerMutation.mutate(trigger.id);
                              }
                            }}
                            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/10"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                      <div className="text-sm text-[var(--text-muted)] mb-2 line-clamp-2">{trigger.prompt_template}</div>
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span>Fires: {trigger.fire_count}{trigger.max_fires > 0 ? '/' + trigger.max_fires : ''}</span>
                        <span>Agent: {getAgentName(trigger.agent_id)}</span>
                      </div>
                    </div>
                  </SpotlightCard>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div
            className="space-y-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {history.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-3xl bg-[var(--surface-secondary)] flex items-center justify-center mx-auto mb-6">
                  <CalendarDays className="w-10 h-10 text-[var(--text-muted)]" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No run history</h3>
                <p className="text-[var(--text-muted)]">History will appear after jobs run</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-4 p-3 rounded-xl bg-[var(--text-primary)]/[0.02] border border-[var(--border-subtle)]"
                  >
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      item.type === 'schedule' ? 'bg-[var(--neon-amber)]' : 'bg-[var(--neon-magenta)]'
                    )} />
                    <div className="flex-1">
                      <div className="text-sm text-[var(--text-primary)]">{item.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {item.type === 'schedule' ? 'Scheduled Job' : 'Event Trigger'}
                      </div>
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">{relativeTime(item.timestamp)}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <ModalOverlay onClose={() => setShowCreateModal(false)}>
          <div className="w-full max-w-lg">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              <NeonText color="amber">Create Scheduled Job</NeonText>
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                value={newJob.name}
                onChange={(e) => setNewJob(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Job name..."
                className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-primary)]/30"
              />
              <input
                type="text"
                value={newJob.cron}
                onChange={(e) => setNewJob(prev => ({ ...prev, cron: e.target.value }))}
                placeholder="Cron expression (e.g., 0 9 * * 1-5)"
                className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-primary)]/30 font-mono text-sm"
              />
              {newJob.cron && (
                <div className="text-xs text-[var(--neon-amber)]">{describeCron(newJob.cron)}</div>
              )}

              {/* Presets */}
              <div className="flex flex-wrap gap-2">
                {CRON_PRESETS.slice(0, 6).map((preset) => (
                  <button
                    key={preset.cron}
                    onClick={() => setNewJob(prev => ({ ...prev, cron: preset.cron }))}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs transition-colors',
                      newJob.cron === preset.cron
                        ? 'bg-[var(--neon-amber)]/20 text-[var(--neon-amber)] border border-[var(--neon-amber)]/30'
                        : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:bg-[var(--surface-tertiary)]'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <select
                value={newJob.agent_id}
                onChange={(e) => setNewJob(prev => ({ ...prev, agent_id: e.target.value }))}
                className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)]"
              >
                <option value="" className="bg-[var(--surface-primary)]">Any agent</option>
                {agents.map((agent: Agent) => (
                  <option key={agent.id} value={agent.id} className="bg-[var(--surface-primary)]">
                    {agent.name}
                  </option>
                ))}
              </select>

              <textarea
                value={newJob.message}
                onChange={(e) => setNewJob(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Message to send..."
                rows={3}
                className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-primary)]/30"
              />

              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => setNewJob(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={cn(
                    'w-12 h-6 rounded-full relative transition-colors',
                    newJob.enabled ? 'bg-[var(--neon-green)]' : 'bg-[var(--surface-tertiary)]'
                  )}
                >
                  <motion.div
                    className="absolute top-1 w-4 h-4 rounded-full bg-[var(--text-primary)] shadow-lg"
                    animate={{ left: newJob.enabled ? '28px' : '4px' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </motion.button>
                <span className="text-sm text-[var(--text-secondary)]">
                  {newJob.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!newJob.name || !newJob.cron || createMutation.isPending}
                  className="flex-1 py-2 rounded-lg bg-[var(--neon-amber)] text-[var(--void)] font-medium disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                    </span>
                  ) : (
                    'Create'
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// Modal overlay
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[var(--void)]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#12121A] border border-[var(--border-default)] rounded-2xl p-6 max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export default Scheduler;
