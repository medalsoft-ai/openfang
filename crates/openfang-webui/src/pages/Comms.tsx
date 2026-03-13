// Comms - Agent Network Style
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { cyberColors } from '@/lib/animations';
import { useToast } from '@/hooks/useToast';
import { getApiBaseUrl } from '@/lib/tauri';
import {
  Send, Flag, RefreshCw, Network, MessageSquare, Activity,
  Zap, Radio, Wifi, WifiOff, AlertCircle, X, ChevronRight,
  Bot, GitBranch, MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface TopologyNode {
  id: string;
  name: string;
  state: string;
  model: string;
}

interface TopologyEdge {
  from: string;
  to: string;
  kind: 'parent_child' | 'peer';
}

interface Topology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

interface CommsEvent {
  id: string;
  kind: string;
  timestamp: string;
  source_name: string;
  target_name?: string;
  detail?: string;
}

// Neon colors for states - using CSS variables
const stateColors: Record<string, string> = {
  Running: 'var(--neon-green)',
  Suspended: 'var(--neon-amber)',
  Terminated: 'var(--neon-magenta)',
  Crashed: 'var(--neon-magenta)',
  default: 'var(--chart-gray)'
};

const eventColors: Record<string, string> = {
  agent_message: 'var(--neon-cyan)',
  agent_spawned: 'var(--neon-green)',
  agent_terminated: 'var(--neon-magenta)',
  task_posted: 'var(--neon-amber)',
  task_claimed: 'var(--neon-cyan)',
  task_completed: 'var(--neon-green)',
  default: 'var(--chart-gray)'
};

function eventLabel(kind: string): string {
  const labels: Record<string, string> = {
    agent_message: 'Message',
    agent_spawned: 'Spawned',
    agent_terminated: 'Terminated',
    task_posted: 'Task Posted',
    task_claimed: 'Task Claimed',
    task_completed: 'Task Done'
  };
  return labels[kind] || kind;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return secs + 's';
  if (secs < 3600) return Math.floor(secs / 60) + 'm';
  if (secs < 86400) return Math.floor(secs / 3600) + 'h';
  return Math.floor(secs / 86400) + 'd';
}

// Network node component
function NetworkNode({
  node,
  isRoot,
  peers,
  onClick
}: {
  node: TopologyNode;
  isRoot?: boolean;
  peers?: TopologyNode[];
  onClick?: () => void;
}) {
  const color = stateColors[node.state] || stateColors.default;

  return (
    <motion.div
      className={cn(
        'relative p-4 rounded-xl border cursor-pointer',
        isRoot ? 'bg-[var(--surface-secondary)]' : 'bg-[var(--text-primary)]/[0.02]'
      )}
      style={{ borderColor: `${color}30` }}
      whileHover={{ scale: 1.02, borderColor: `${color}60` }}
      onClick={onClick}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-xl opacity-20 blur-xl"
        style={{ background: `radial-gradient(circle at center, ${color}, transparent)` }}
      />

      <div className="relative flex items-center gap-3">
        {/* Status orb */}
        <div className="relative">
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-40"
            style={{ backgroundColor: color }}
          />
          <div
            className="w-3 h-3 rounded-full relative"
            style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{node.name}</div>
          <div className="text-xs text-[var(--text-muted)] font-mono truncate">{node.model}</div>
        </div>

        <span
          className="text-[10px] uppercase px-2 py-0.5 rounded-full font-mono"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {node.state}
        </span>
      </div>

      {/* Peer connections */}
      {peers && peers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex flex-wrap gap-1">
          {peers.map((peer) => (
            <span
              key={peer.id}
              className="text-[10px] text-[var(--text-muted)] px-2 py-0.5 rounded-full bg-[var(--surface-secondary)]"
            >
              ↔ {peer.name}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Event feed item
function EventItem({ event }: { event: CommsEvent }) {
  const color = eventColors[event.kind] || eventColors.default;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[var(--surface-secondary)] group"
    >
      <span className="text-xs text-[var(--text-muted)] font-mono w-12 shrink-0">
        {timeAgo(event.timestamp)}
      </span>

      <span
        className="text-[10px] uppercase px-1.5 py-0.5 rounded font-mono shrink-0"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {eventLabel(event.kind)}
      </span>

      <span className="text-sm text-[var(--text-primary)] font-medium">{event.source_name}</span>

      {event.target_name && (
        <>
          <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
          <span className="text-sm text-[var(--text-secondary)]">{event.target_name}</span>
        </>
      )}

      {event.detail && (
        <span className="text-xs text-[var(--text-muted)] truncate flex-1">{event.detail}</span>
      )}
    </motion.div>
  );
}

export function Comms() {
  const { success, error: showError } = useToast();
  const sseSourceRef = useRef<EventSource | null>(null);

  // Modal states
  const [showSendModal, setShowSendModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Forms
  const [sendFrom, setSendFrom] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [sendMsg, setSendMsg] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssign, setTaskAssign] = useState('unassigned');

  // Queries
  const {
    data: topology = { nodes: [], edges: [] },
    isLoading: topologyLoading,
    error: topologyError,
    refetch: refetchTopology
  } = useQuery<Topology>({
    queryKey: ['comms-topology'],
    queryFn: () => api.get('/api/comms/topology'),
  });

  const { data: initialEvents = [] } = useQuery<CommsEvent[]>({
    queryKey: ['comms-events'],
    queryFn: () => api.get('/api/comms/events?limit=200'),
  });

  const [events, setEvents] = useState<CommsEvent[]>([]);

  useEffect(() => {
    if (initialEvents.length > 0) setEvents(initialEvents);
  }, [initialEvents]);

  // SSE
  const startSSE = useCallback(async () => {
    if (sseSourceRef.current) sseSourceRef.current.close();

    const baseUrl = await getApiBaseUrl();
    let url = baseUrl + '/api/comms/events/stream';
    const token = localStorage.getItem('openfang_auth_token');
    if (token) url += '?token=' + encodeURIComponent(token);

    const sse = new EventSource(url);
    sseSourceRef.current = sse;

    sse.onmessage = (ev) => {
      if (ev.data === 'ping') return;
      try {
        const event = JSON.parse(ev.data) as CommsEvent;
        setEvents((prev) => {
          const newEvents = [event, ...prev];
          if (newEvents.length > 200) newEvents.length = 200;
          return newEvents;
        });
        if (event.kind === 'agent_spawned' || event.kind === 'agent_terminated') {
          refetchTopology();
        }
      } catch {}
    };

    sse.onerror = () => {};
  }, [refetchTopology]);

  useEffect(() => {
    startSSE();
    return () => sseSourceRef.current?.close();
  }, [startSSE]);

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: (data: { from_agent_id: string; to_agent_id: string; message: string }) =>
      api.post('/api/comms/send', data),
    onSuccess: () => {
      success('Message sent');
      setShowSendModal(false);
      setSendFrom('');
      setSendTo('');
      setSendMsg('');
    },
    onError: (err: Error) => showError(err.message || 'Send failed'),
  });

  const postTaskMutation = useMutation({
    mutationFn: (data: { title: string; description: string; assigned_to?: string }) =>
      api.post('/api/comms/task', data),
    onSuccess: () => {
      success('Task posted');
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssign('unassigned');
    },
    onError: (err: Error) => showError(err.message || 'Task failed'),
  });

  // Tree helpers
  const rootNodes = topology.nodes.filter((n) => {
    const childIds = new Set(topology.edges.filter((e) => e.kind === 'parent_child').map((e) => e.to));
    return !childIds.has(n.id);
  });

  const childrenOf = (id: string) => {
    const childIds = new Set(
      topology.edges.filter((e) => e.kind === 'parent_child' && e.from === id).map((e) => e.to)
    );
    return topology.nodes.filter((n) => childIds.has(n.id));
  };

  const peersOf = (id: string) => {
    const peerIds = new Set<string>();
    topology.edges
      .filter((e) => e.kind === 'peer')
      .forEach((e) => {
        if (e.from === id) peerIds.add(e.to);
        if (e.to === id) peerIds.add(e.from);
      });
    return topology.nodes.filter((n) => peerIds.has(n.id));
  };

  const handleSendSubmit = () => {
    if (!sendFrom || !sendTo || !sendMsg.trim()) return;
    sendMessageMutation.mutate({
      from_agent_id: sendFrom,
      to_agent_id: sendTo,
      message: sendMsg.trim(),
    });
  };

  const handleTaskSubmit = () => {
    if (!taskTitle.trim()) return;
    postTaskMutation.mutate({
      title: taskTitle.trim(),
      description: taskDesc,
      assigned_to: taskAssign !== 'unassigned' ? taskAssign : undefined,
    });
  };

  const isLoading = topologyLoading;

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
              <NeonText color="cyan">Comms</NeonText>
            </h1>
            <p className="text-[var(--text-muted)] mt-1">Agent topology and inter-agent communication</p>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setShowSendModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30 hover:bg-[var(--neon-cyan)]/20"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Send className="w-4 h-4" />
              Send Message
            </motion.button>

            <motion.button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--neon-amber)]/10 text-[var(--neon-amber)] border border-[var(--neon-amber)]/30 hover:bg-[var(--neon-amber)]/20"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Flag className="w-4 h-4" />
              Post Task
            </motion.button>

            <motion.button
              onClick={() => refetchTopology()}
              disabled={isLoading}
              className="p-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className={cn('w-5 h-5', isLoading && 'animate-spin')} />
            </motion.button>
          </div>
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[var(--neon-cyan)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {topologyError && !isLoading && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AlertCircle className="w-12 h-12 text-[var(--neon-magenta)] mx-auto mb-4" />
            <p className="text-[var(--text-muted)]">Failed to load topology</p>
            <button
              onClick={() => refetchTopology()}
              className="mt-4 px-4 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Content */}
        {!isLoading && !topologyError && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Network Topology */}
            <motion.div
              className="lg:col-span-2 space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <SpotlightCard glowColor="rgba(0, 240, 255, 0.1)">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                      <Network className="w-4 h-4 text-[var(--neon-cyan)]" />
                      Agent Topology
                    </h3>
                    <span className="text-xs text-[var(--text-muted)] font-mono">
                      {topology.nodes.length} agents
                    </span>
                  </div>

                  {topology.nodes.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-muted)]">
                      <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No agents running</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {rootNodes.map((root) => (
                        <div key={root.id} className="space-y-2">
                          <NetworkNode
                            node={root}
                            isRoot
                            peers={peersOf(root.id)}
                          />
                          {childrenOf(root.id).length > 0 && (
                            <div className="ml-6 pl-4 border-l-2 border-[var(--border-default)] space-y-2">
                              {childrenOf(root.id).map((child) => (
                                <NetworkNode
                                  key={child.id}
                                  node={child}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SpotlightCard>

              {/* Live Event Feed */}
              <SpotlightCard glowColor="rgba(0, 255, 136, 0.1)">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[var(--neon-green)]" />
                      Live Event Feed
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--neon-green)] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--neon-green)]" />
                      </span>
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        {events.length} events
                      </span>
                    </div>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto space-y-1">
                    <AnimatePresence>
                      {events.length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                          <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No inter-agent events yet</p>
                        </div>
                      ) : (
                        events.map((ev) => <EventItem key={ev.id} event={ev} />)
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>

            {/* Stats Panel */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <SpotlightCard glowColor="rgba(255, 184, 0, 0.1)">
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[var(--neon-amber)]/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-[var(--neon-amber)]" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                        {topology.nodes.filter((n) => n.state === 'Running').length}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">Active Agents</div>
                    </div>
                  </div>
                </div>
              </SpotlightCard>

              <SpotlightCard glowColor="rgba(0, 240, 255, 0.1)">
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[var(--neon-cyan)]/10 flex items-center justify-center">
                      <GitBranch className="w-5 h-5 text-[var(--neon-cyan)]" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                        {topology.edges.length}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">Connections</div>
                    </div>
                  </div>
                </div>
              </SpotlightCard>

              <SpotlightCard glowColor="rgba(0, 255, 136, 0.1)">
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[var(--neon-green)]/10 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-[var(--neon-green)]" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                        {events.filter((e) => e.kind === 'agent_message').length}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">Messages</div>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          </div>
        )}
      </div>

      {/* Send Modal */}
      <AnimatePresence>
        {showSendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[var(--void)]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSendModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12121A] border border-[var(--border-default)] rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Send Message</h2>
                <button
                  onClick={() => setShowSendModal(false)}
                  className="p-1 rounded-lg hover:bg-[var(--surface-secondary)]"
                >
                  <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-2">From Agent</label>
                  <select
                    value={sendFrom}
                    onChange={(e) => setSendFrom(e.target.value)}
                    className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)]"
                  >
                    <option value="" className="bg-[var(--surface-primary)]">Select agent...</option>
                    {topology.nodes.map((n) => (
                      <option key={n.id} value={n.id} className="bg-[var(--surface-primary)]">
                        {n.name} ({n.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-2">To Agent</label>
                  <select
                    value={sendTo}
                    onChange={(e) => setSendTo(e.target.value)}
                    className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)]"
                  >
                    <option value="" className="bg-[var(--surface-primary)]">Select agent...</option>
                    {topology.nodes.map((n) => (
                      <option key={n.id} value={n.id} className="bg-[var(--surface-primary)]">
                        {n.name} ({n.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-2">Message</label>
                  <textarea
                    value={sendMsg}
                    onChange={(e) => setSendMsg(e.target.value)}
                    rows={3}
                    className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] resize-none"
                    placeholder="Type a message..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowSendModal(false)}
                    className="flex-1 py-2.5 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleSendSubmit}
                    disabled={!sendFrom || !sendTo || !sendMsg.trim() || sendMessageMutation.isPending}
                    className="flex-1 py-2.5 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] font-medium disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {sendMessageMutation.isPending ? 'Sending...' : 'Send'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Modal */}
      <AnimatePresence>
        {showTaskModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[var(--void)]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTaskModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12121A] border border-[var(--border-default)] rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Post Task</h2>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="p-1 rounded-lg hover:bg-[var(--surface-secondary)]"
                >
                  <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-2">Title</label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)]"
                    placeholder="Task title..."
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-2">Description</label>
                  <textarea
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    rows={3}
                    className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] resize-none"
                    placeholder="Task description..."
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-2">Assign To (optional)</label>
                  <select
                    value={taskAssign}
                    onChange={(e) => setTaskAssign(e.target.value)}
                    className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)]"
                  >
                    <option value="unassigned" className="bg-[var(--surface-primary)]">Unassigned</option>
                    {topology.nodes.map((n) => (
                      <option key={n.id} value={n.id} className="bg-[var(--surface-primary)]">
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowTaskModal(false)}
                    className="flex-1 py-2.5 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleTaskSubmit}
                    disabled={!taskTitle.trim() || postTaskMutation.isPending}
                    className="flex-1 py-2.5 rounded-lg bg-[var(--neon-amber)] text-[var(--void)] font-medium disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {postTaskMutation.isPending ? 'Posting...' : 'Post Task'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Comms;
