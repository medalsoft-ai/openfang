// Sessions - Timeline Style with Memory KV
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cyberColors } from '@/lib/animations';
import {
  MessageSquare, Plus, Trash2, Bot, Clock, Search,
  ChevronRight, Database, Brain, Save, X, Edit2, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Session {
  session_id: string;
  agent_id: string;
  title: string;
  created_at: string;
  message_count?: number;
}

interface Agent {
  id: string;
  name: string;
}

// Timeline item component
function TimelineItem({
  session,
  agent,
  onDelete
}: {
  session: Session;
  agent?: Agent;
  onDelete: () => void;
}) {
  return (
    <motion.div
      className="relative pl-8 pb-8 last:pb-0"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* Timeline line */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--neon-cyan)]/50 to-transparent" />

      {/* Timeline dot */}
      <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-[var(--surface-primary)] border-2 border-[var(--neon-cyan)]/50 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-[var(--neon-cyan)]" />
      </div>

      {/* Content */}
      <SpotlightCard glowColor="rgba(0, 240, 255, 0.1)">
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-[var(--text-primary)] mb-1">{session.title}</h3>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  {agent?.name || session.agent_id.slice(0, 8)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(session.created_at).toLocaleDateString()}
                </span>
                {session.message_count !== undefined && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {session.message_count} messages
                  </span>
                )}
              </div>
            </div>

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
      </SpotlightCard>
    </motion.div>
  );
}

function SessionsPanel() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await api.get<{ sessions: Session[] }>('/api/sessions');
      return res.sessions || [];
    },
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => api.listAgents(),
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) =>
      api.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const filteredSessions = sessions
    .filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.session_id.toLowerCase().includes(q)
      );
    })
    .sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sessions..."
          className="bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-xl pl-12 pr-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] w-full max-w-md"
        />
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[var(--neon-cyan)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <motion.div
          className="text-center py-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-20 h-20 rounded-3xl bg-[var(--surface-secondary)] flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-10 h-10 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No sessions</h3>
          <p className="text-[var(--text-muted)]">Start chatting to create sessions</p>
        </motion.div>
      ) : (
        <div className="space-y-0">
          {filteredSessions.map((session) => (
            <TimelineItem
              key={session.session_id}
              session={session}
              agent={agents.find((a) => a.id === session.agent_id)}
              onDelete={() => {
                if (confirm('Delete this session?')) {
                  deleteMutation.mutate(session.session_id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MemoryPanel() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => api.listAgents(),
  });

  const { data: kvData, isLoading } = useQuery({
    queryKey: ['agent-memory', selectedAgentId],
    queryFn: () => api.getAgentMemoryKV(selectedAgentId),
    enabled: !!selectedAgentId,
  });

  const setMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      api.setAgentMemoryKV(selectedAgentId, key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-memory', selectedAgentId] });
      setEditingKey(null);
      setShowAddForm(false);
      setNewKey('');
      setNewValue('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => api.deleteAgentMemoryKV(selectedAgentId, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-memory', selectedAgentId] });
    },
  });

  const handleEdit = (key: string, value: unknown) => {
    setEditingKey(key);
    setEditValue(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  };

  const handleSave = (key: string) => {
    let parsedValue: unknown = editValue;
    try {
      parsedValue = JSON.parse(editValue);
    } catch {
      // Keep as string if not valid JSON
    }
    setMutation.mutate({ key, value: parsedValue });
  };

  const handleAdd = () => {
    if (!newKey.trim()) return;
    let parsedValue: unknown = newValue;
    try {
      parsedValue = JSON.parse(newValue);
    } catch {
      // Keep as string
    }
    setMutation.mutate({ key: newKey, value: parsedValue });
  };

  const formatValue = (value: unknown): string => {
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  };

  return (
    <div className="space-y-4">
      {/* Agent Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-[var(--text-muted)]">Select Agent:</label>
        <select
          value={selectedAgentId}
          onChange={(e) => setSelectedAgentId(e.target.value)}
          className="bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm flex-1 max-w-md"
        >
          <option value="">-- Select an agent --</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      {/* Add Button */}
      {selectedAgentId && (
        <motion.button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] text-sm font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Key
        </motion.button>
      )}

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-default)]"
          >
            <div className="space-y-3">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Key name"
                className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
              />
              <textarea
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Value (string or JSON)"
                rows={3}
                className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm font-mono"
              />
              <div className="flex gap-2">
                <motion.button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-primary)] text-sm"
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleAdd}
                  disabled={!newKey.trim() || setMutation.isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] text-sm font-medium disabled:opacity-50"
                  whileTap={{ scale: 0.98 }}
                >
                  {setMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KV List */}
      {selectedAgentId ? (
        isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-[var(--neon-cyan)] animate-spin" />
          </div>
        ) : kvData?.kv_pairs?.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">
            No memory entries for this agent
          </div>
        ) : (
          <div className="space-y-2">
            {kvData?.kv_pairs?.map(({ key, value }) => (
              <motion.div
                key={key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="font-mono text-sm text-[var(--neon-cyan)]">{key}</div>
                  <div className="flex items-center gap-1">
                    <motion.button
                      onClick={() => handleEdit(key, value)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      onClick={() => deleteMutation.mutate(key)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/10"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
                {editingKey === key ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={4}
                      className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm font-mono"
                    />
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => setEditingKey(null)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-primary)] text-sm"
                        whileTap={{ scale: 0.98 }}
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        onClick={() => handleSave(key)}
                        disabled={setMutation.isPending}
                        className="px-3 py-1.5 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] text-sm font-medium"
                        whileTap={{ scale: 0.98 }}
                      >
                        {setMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <pre className="mt-2 text-sm text-[var(--text-muted)] font-mono whitespace-pre-wrap overflow-x-auto">
                    {formatValue(value)}
                  </pre>
                )}
              </motion.div>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-12 text-[var(--text-muted)]">
          Select an agent to view and manage memory
        </div>
      )}
    </div>
  );
}

export function Sessions() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold">
            <NeonText color="cyan">Sessions</NeonText>
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Manage sessions and agent memory
          </p>
        </motion.div>

        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="bg-[var(--surface-secondary)] border border-[var(--border-default)] p-1 rounded-xl">
            <TabsTrigger
              value="sessions"
              className="data-[state=active]:bg-[var(--neon-cyan)]/20 data-[state=active]:text-[var(--neon-cyan)]"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Sessions
            </TabsTrigger>
            <TabsTrigger
              value="memory"
              className="data-[state=active]:bg-[var(--neon-magenta)]/20 data-[state=active]:text-[var(--neon-magenta)]"
            >
              <Brain className="w-4 h-4 mr-2" />
              Memory
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <SessionsPanel />
          </TabsContent>

          <TabsContent value="memory">
            <MemoryPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Sessions;
