// Workflows - Node Pipeline Style
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { cyberColors } from '@/lib/animations';
import {
  GitBranch, Plus, Play, History, X, Loader2,
  ArrowRight, Box, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: Array<{
    name: string;
    agent_name: string;
    mode: string;
  }> | number;
  created_at: string;
}

interface WorkflowRun {
  id: string;
  workflow_id: string;
  input: string;
  output: string;
  status: string;
  created_at: string;
}

// Workflow card with pipeline visualization
function WorkflowCard({
  workflow,
  onRun,
  onHistory
}: {
  workflow: Workflow;
  onRun: () => void;
  onHistory: () => void;
}) {
  const stepCount = Array.isArray(workflow.steps) ? workflow.steps.length : workflow.steps;
  const steps = Array.isArray(workflow.steps) ? workflow.steps : [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <SpotlightCard glowColor="rgba(255, 0, 110, 0.1)">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--neon-magenta)]/10 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-[var(--neon-magenta)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{workflow.name}</h3>
                <p className="text-xs text-[var(--text-muted)]">{stepCount} step{stepCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-[var(--text-muted)] mb-4">{workflow.description || 'No description'}</p>

          {/* Pipeline visualization */}
          {steps.length > 0 && (
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
              {steps.slice(0, 4).map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 shrink-0">
                  <div className="px-3 py-1.5 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-default)]">
                    <span className="text-xs text-[var(--text-secondary)]">{step.name}</span>
                  </div>
                  {idx < Math.min(steps.length, 4) - 1 && (
                    <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                </div>
              ))}
              {steps.length > 4 && (
                <span className="text-xs text-[var(--text-muted)]">+{steps.length - 4} more</span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t border-[var(--border-subtle)]">
            <motion.button
              onClick={onRun}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/20 font-medium text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play className="w-4 h-4" /> Run
            </motion.button>
            <motion.button
              onClick={onHistory}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] font-medium text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <History className="w-4 h-4" /> History
            </motion.button>
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

export function Workflows() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [runModal, setRunModal] = useState<Workflow | null>(null);
  const [runInput, setRunInput] = useState('');
  const queryClient = useQueryClient();

  const { data: workflows = [], isLoading } = useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: () => api.get('/api/workflows'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      api.post('/api/workflows', { ...data, steps: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setShowCreateModal(false);
    },
  });

  const runMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: string }) =>
      api.post(`/api/workflows/${id}/run`, { input }),
    onSuccess: () => {
      setRunModal(null);
      setRunInput('');
    },
  });

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
              <NeonText color="magenta">Workflows</NeonText>
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
            </p>
          </div>

          <motion.button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--neon-magenta)] text-[var(--void)] font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-5 h-5" /> Create Workflow
          </motion.button>
        </motion.div>

        {/* Workflows Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[var(--neon-magenta)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : workflows.length === 0 ? (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-20 h-20 rounded-3xl bg-[var(--surface-secondary)] flex items-center justify-center mx-auto mb-6">
              <GitBranch className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No workflows</h3>
            <p className="text-[var(--text-muted)] mb-6">Create your first workflow to automate agent tasks</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-xl bg-[var(--neon-magenta)] text-[var(--void)] font-medium"
            >
              Create Workflow
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            layout
          >
            <AnimatePresence mode="popLayout">
              {workflows.map((workflow) => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onRun={() => setRunModal(workflow)}
                  onHistory={() => {}}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateWorkflowModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(name, desc) => createMutation.mutate({ name, description: desc })}
        />
      )}

      {/* Run Modal */}
      {runModal && (
        <RunWorkflowModal
          workflow={runModal}
          input={runInput}
          onInputChange={setRunInput}
          onClose={() => {
            setRunModal(null);
            setRunInput('');
          }}
          onRun={() => runMutation.mutate({ id: runModal.id, input: runInput })}
          isRunning={runMutation.isPending}
        />
      )}
    </div>
  );
}

// Create workflow modal
function CreateWorkflowModal({
  onClose,
  onCreate
}: {
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-md">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
          <NeonText color="magenta">Create Workflow</NeonText>
        </h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workflow name..."
          className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] mb-3"
          autoFocus
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description..."
          rows={3}
          className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (name.trim()) {
                onCreate(name.trim(), description);
              }
            }}
            disabled={!name.trim()}
            className="flex-1 py-2 rounded-lg bg-[var(--neon-magenta)] text-[var(--void)] font-medium disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// Run workflow modal
function RunWorkflowModal({
  workflow,
  input,
  onInputChange,
  onClose,
  onRun,
  isRunning
}: {
  workflow: Workflow;
  input: string;
  onInputChange: (v: string) => void;
  onClose: () => void;
  onRun: () => void;
  isRunning: boolean;
}) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Run <NeonText color="magenta">{workflow.name}</NeonText>
        </h2>
        <p className="text-[var(--text-muted)] text-sm mb-4">{workflow.description}</p>
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Enter input..."
          rows={5}
          className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-white/30 mb-4 font-mono text-sm"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
          >
            Cancel
          </button>
          <button
            onClick={onRun}
            disabled={!input.trim() || isRunning}
            className="flex-1 py-2 rounded-lg bg-[var(--neon-magenta)] text-[var(--text-primary)] font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isRunning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
            ) : (
              <><Play className="w-4 h-4" /> Run</>
            )}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// Modal overlay component
function ModalOverlay({
  children,
  onClose
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
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
        className="bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export default Workflows;
