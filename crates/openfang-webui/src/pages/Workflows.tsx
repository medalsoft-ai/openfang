// Workflows - Claymorphism Design System
// Purple theme, soft 3D, rounded cards - consistent with Overview.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import {
  GitBranch, Plus, Play, History, X, Loader2,
  ArrowRight, Box, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

// ============================================
// CLAYMORPHISM DESIGN TOKENS
// ============================================
const clay = {
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  bgGradient: 'from-gray-50 via-violet-50/30 to-purple-50/20',
  card: 'bg-white border-[3px] border-white',
  cardShadow: 'shadow-[0_4px_16px_rgba(139,92,246,0.15),inset_0_1px_3px_rgba(255,255,255,0.8)]',
  cardHover: 'hover:shadow-[0_8px_24px_rgba(139,92,246,0.25)]',
  active: 'bg-violet-50 shadow-[inset_0_2px_4px_rgba(139,92,246,0.15)]',
  radius: 'rounded-2xl',
  radiusLg: 'rounded-3xl',
  textPrimary: 'text-gray-800',
  textMuted: 'text-gray-500',
  textViolet: 'text-violet-600',
};

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

// ============================================
// WORKFLOW CARD COMPONENT
// ============================================
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
      whileHover={{ y: -4 }}
      className={cn(
        clay.card,
        clay.cardShadow,
        clay.cardHover,
        clay.radius,
        'transition-all duration-300'
      )}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
              <GitBranch className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{workflow.name}</h3>
              <p className="text-xs text-gray-500">{stepCount} step{stepCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 mb-4">{workflow.description || 'No description'}</p>

        {/* Pipeline visualization */}
        {steps.length > 0 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            {steps.slice(0, 4).map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 shrink-0">
                <div className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-600">{step.name}</span>
                </div>
                {idx < Math.min(steps.length, 4) - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                )}
              </div>
            ))}
            {steps.length > 4 && (
              <span className="text-xs text-gray-400">+{steps.length - 4} more</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <motion.button
            onClick={onRun}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-100 text-violet-700 hover:bg-violet-200 font-medium text-sm transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Play className="w-4 h-4" /> Run
          </motion.button>
          <motion.button
            onClick={onHistory}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium text-sm transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <History className="w-4 h-4" /> History
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN WORKFLOWS COMPONENT
// ============================================
export function Workflows() {
  const { t } = useTranslation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [runModal, setRunModal] = useState<Workflow | null>(null);
  const [runInput, setRunInput] = useState('');
  const queryClient = useQueryClient();

  const { data: workflows = [], isLoading } = useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: async () => {
      const data = await api.get<Workflow[] | { workflows?: Workflow[] }>('/api/workflows');
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && Array.isArray(data.workflows)) return data.workflows;
      return [];
    },
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
            <h1 className="text-3xl font-bold text-gray-800">Workflows</h1>
            <p className="text-gray-500 mt-1">
              {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
            </p>
          </div>

          <motion.button
            onClick={() => setShowCreateModal(true)}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-xl font-medium',
              'bg-violet-500 text-white shadow-lg shadow-violet-500/25',
              'hover:bg-violet-600 transition-colors'
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-5 h-5" /> Create Workflow
          </motion.button>
        </motion.div>

        {/* Workflows Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : workflows.length === 0 ? (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className={cn(
              'w-20 h-20 rounded-3xl bg-white flex items-center justify-center mx-auto mb-6',
              clay.cardShadow
            )}>
              <GitBranch className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No workflows</h3>
            <p className="text-gray-500 mb-6">Create your first workflow to automate agent tasks</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className={cn(
                'px-6 py-3 rounded-xl bg-violet-500 text-white font-medium',
                'shadow-lg shadow-violet-500/25 hover:bg-violet-600 transition-colors'
              )}
            >
              Create Workflow
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
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
      <AnimatePresence>
        {showCreateModal && (
          <CreateWorkflowModal
            onClose={() => setShowCreateModal(false)}
            onCreate={(name, desc) => createMutation.mutate({ name, description: desc })}
            isCreating={createMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Run Modal */}
      <AnimatePresence>
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
      </AnimatePresence>
    </div>
  );
}

// ============================================
// CREATE WORKFLOW MODAL
// ============================================
function CreateWorkflowModal({
  onClose,
  onCreate,
  isCreating
}: {
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
  isCreating: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Create Workflow</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workflow name..."
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-violet-200 focus:bg-white transition-all text-gray-800 placeholder:text-gray-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-violet-200 focus:bg-white transition-all text-gray-800 placeholder:text-gray-400 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (name.trim()) {
                onCreate(name.trim(), description);
              }
            }}
            disabled={!name.trim() || isCreating}
            className="flex-1 py-3 rounded-xl bg-violet-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-violet-600 transition-colors shadow-lg shadow-violet-500/25"
          >
            {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ============================================
// RUN WORKFLOW MODAL
// ============================================
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
        <h2 className="text-xl font-bold text-gray-800 mb-2">Run {workflow.name}</h2>
        <p className="text-gray-500 text-sm mb-6">{workflow.description}</p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Input</label>
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Enter input..."
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-violet-200 focus:bg-white transition-all text-gray-800 placeholder:text-gray-400 font-mono text-sm resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onRun}
            disabled={!input.trim() || isRunning}
            className="flex-1 py-3 rounded-xl bg-violet-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-violet-600 transition-colors shadow-lg shadow-violet-500/25"
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

// ============================================
// MODAL OVERLAY COMPONENT
// ============================================
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
      className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={cn(
          'bg-white border-[3px] border-white rounded-3xl p-6 shadow-[0_20px_50px_rgba(139,92,246,0.3)]',
          'max-w-lg w-full'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export default Workflows;
