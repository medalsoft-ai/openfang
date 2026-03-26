// Hands Page - Claymorphism Design
// Left: Grouped Hand List | Right: Steps, Flowchart, Edit Form

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '@/api/client';
import type { Hand, HandInstance, HandRequirement, HandSetting, HandStep, ExecutionSummary, ExecutionDetail } from '@/api/types';
import { FlowCanvas } from '@/components/flow/FlowCanvas';
import { StepPalette } from '@/components/flow/StepPalette';
import { PropertyPanel } from '@/components/flow/PropertyPanel';
import { ValidationPanel } from '@/components/flow/ValidationPanel';
import { useHandDraft } from '@/hooks/useHandDraft';
import { useSessionWebSocket } from '@/hooks/useSessionWebSocket';
import { validateSteps, type ValidationResult } from '@/utils/stepValidation';
import { toLocalSteps, toApiSteps } from '@/utils/stepAdapter';
import { toaster } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { toggleFullscreen, isFullscreen } from '@/lib/tauri';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  HandIcon,
  Check,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  Play,
  Pause,
  Square,
  Settings,
  Plus,
  Minus,
  Edit3,
  Save,
  RotateCcw,
  List,
  GitBranch,
  Layout,
  Package,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Clock,
  CheckCircle,
  XCircle,
  PauseCircle,
  Zap,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface LocalHandStep {
  id: string;
  order: number;
  title: string;
  description?: string;
  tool?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  nextSteps?: string[];
}

interface HandFlow {
  id: string;
  from: string;
  to: string;
  condition?: string;
}

// ============================================
// GROUPED LIST COMPONENT
// ============================================

function GroupedHandList({
  hands,
  selectedHand,
  onSelect,
  activeInstances,
}: {
  hands: Hand[];
  selectedHand: Hand | null;
  onSelect: (hand: Hand) => void;
  activeInstances: HandInstance[];
}) {
  const { t } = useTranslation();

  // Group hands by category
  const groupedHands = useMemo(() => {
    const groups: Record<string, Hand[]> = {};
    hands.forEach((hand) => {
      const category = hand.category || 'General';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(hand);
    });
    return groups;
  }, [hands]);

  // Sort categories alphabetically
  const sortedCategories = useMemo(() => {
    return Object.keys(groupedHands).sort();
  }, [groupedHands]);

  // Category color mapping
  const categoryColors: Record<string, string> = {
    'Development': 'bg-blue-500',
    'DevOps': 'bg-orange-500',
    'Data': 'bg-emerald-500',
    'Research': 'bg-purple-500',
    'Automation': 'bg-pink-500',
    'General': 'bg-[var(--primary)]',
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]/50">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t('sop.title', 'Hands')}</h2>
        <span className="text-xs text-[var(--primary)] font-medium bg-[var(--primary-50)] px-2 py-0.5 rounded-full">
          {hands.length}
        </span>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {sortedCategories.map((category) => (
            <div key={category} className="space-y-1">
              {/* Category Header */}
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    categoryColors[category] || 'bg-[var(--text-muted)]'
                  )}
                />
                <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  {category}
                </span>
                <div className="flex-1 h-px bg-[var(--border-default)] ml-2" />
              </div>

              {/* Hand Items */}
              {groupedHands[category].map((hand) => {
                const isActive = activeInstances.some((inst) => inst.hand_id === hand.id);
                const isSelected = selectedHand?.id === hand.id;
                const allSatisfied = hand.requirements?.every((r) => r.satisfied) ?? true;

                return (
                  <motion.button
                    key={hand.id}
                    onClick={() => onSelect(hand)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200',
                      isSelected
                        ? 'bg-[var(--primary-100)] border border-[var(--primary-200)] shadow-sm'
                        : 'bg-white/50 hover:bg-white border border-transparent hover:shadow-sm'
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg',
                        isSelected
                          ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                          : 'bg-gradient-to-br from-gray-100 to-gray-200'
                      )}
                    >
                      {hand.icon ? (
                        <span>{hand.icon}</span>
                      ) : (
                        <HandIcon
                          className={cn(
                            'w-4 h-4',
                            isSelected ? 'text-white' : 'text-[var(--text-secondary)]'
                          )}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            'text-sm font-medium truncate',
                            isSelected ? 'text-[var(--primary-darker)]' : 'text-[var(--text-primary)]'
                          )}
                        >
                          {hand.display_name || hand.name}
                        </p>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {hand.tools?.length || 0} {t('sop.tools', 'tools')}
                      </p>
                    </div>

                    {/* Status */}
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        allSatisfied ? 'bg-emerald-400' : 'bg-amber-400'
                      )}
                      title={allSatisfied ? 'Ready' : 'Setup needed'}
                    />
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================
// STEPS DIAGRAM COMPONENT
// ============================================

function StepsDiagram({ steps }: { steps: LocalHandStep[] }) {
  if (!steps || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
        <List className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm">No steps defined</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {steps
        .sort((a, b) => a.order - b.order)
        .map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative"
          >
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="absolute left-5 top-10 w-0.5 h-6 bg-violet-200" />
            )}

            {/* Step Card */}
            <div className="flex gap-3">
              {/* Step Number */}
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-500/20">
                {step.order}
              </div>

              {/* Step Content */}
              <div className="flex-1 p-3 rounded-xl bg-white/80 border border-violet-100 shadow-sm">
                <h4 className="text-sm font-medium text-[var(--text-primary)]">{step.title}</h4>
                {step.description && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{step.description}</p>
                )}
                {step.tool && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Zap className="w-3 h-3 text-[var(--primary)]" />
                    <span className="text-xs text-[var(--primary-dark)] font-medium">
                      {step.tool}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
    </div>
  );
}

// ============================================
// REACT FLOW CUSTOM NODE
// ============================================

function FlowStepNode({ data }: { data: { label: string; description?: string; order: number; isFirst: boolean; isLast: boolean } }) {
  return (
    <>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-[var(--text-muted)]" />
      <div
        className={cn(
          'px-4 py-3 rounded-xl border-2 min-w-[140px] text-center shadow-sm transition-all hover:shadow-md',
          data.isFirst
            ? 'bg-emerald-50 border-emerald-300'
            : data.isLast
            ? 'bg-[var(--primary-50)] border-[var(--primary)]'
            : 'bg-white border-[var(--border-default)]'
        )}
      >
        <span
          className={cn(
            'text-xs font-medium block truncate',
            data.isFirst ? 'text-emerald-700' : data.isLast ? 'text-violet-700' : 'text-[var(--text-primary)]'
          )}
        >
          {data.label}
        </span>
        {data.description && (
          <span className="text-[10px] text-[var(--text-secondary)] mt-1 block truncate">{data.description}</span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-[var(--text-muted)]" />
    </>
  );
}

const nodeTypes: NodeTypes = {
  flowStep: FlowStepNode,
};

// ============================================
// FLOWCHART COMPONENT (React Flow)
// ============================================

function FlowchartDiagram({ steps }: { steps: LocalHandStep[]; flows?: HandFlow[] }) {
  const { t } = useTranslation();
  const [isFs, setIsFs] = useState(false);

  // Build nodes and edges from steps - Vertical layout (top to bottom)
  const initialNodes: Node[] = useMemo(() => {
    if (!steps || steps.length === 0) return [];

    const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
    const nodeWidth = 160;
    const nodeHeight = 80;
    const verticalGap = 50;
    const centerX = 100; // Center point for horizontal alignment

    return sortedSteps.map((step, index) => ({
      id: step.id,
      type: 'flowStep',
      position: {
        x: centerX - nodeWidth / 2, // Center the node
        y: 20 + index * (nodeHeight + verticalGap), // Stack vertically
      },
      data: {
        label: step.title,
        description: step.tool,
        order: step.order,
        isFirst: index === 0,
        isLast: index === sortedSteps.length - 1,
      },
    }));
  }, [steps]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!steps || steps.length < 2) return [];

    const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
    return sortedSteps.slice(0, -1).map((step, index) => ({
      id: `e${step.id}-${sortedSteps[index + 1].id}`,
      source: step.id,
      target: sortedSteps[index + 1].id,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#A78BFA', strokeWidth: 2 },
    }));
  }, [steps]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update when steps change
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle fullscreen toggle
  const handleToggleFullscreen = useCallback(async () => {
    const newState = await toggleFullscreen();
    setIsFs(newState);
  }, []);

  // Listen for fullscreen change events (for ESC key handling)
  useEffect(() => {
    const handleFullscreenChange = async () => {
      const fsState = await isFullscreen();
      setIsFs(fsState);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!steps || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-[var(--text-muted)]">
        <GitBranch className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm">{t('sop.noFlow', 'No flow defined')}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden border border-[var(--border-default)] bg-white transition-all duration-300',
        isFs
          ? 'fixed inset-0 z-50 w-screen h-screen rounded-none border-0'
          : 'h-full min-h-[280px] w-full'
      )}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#E5E7EB" gap={16} size={1} />
        <Controls className="!bg-white !border-[var(--border-default)] !shadow-sm" />
        {/* Fullscreen Toggle Button */}
        <div className="absolute top-3 right-3 z-10">
          <motion.button
            onClick={handleToggleFullscreen}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center w-8 h-8 bg-white border border-[var(--border-default)] rounded-lg shadow-sm hover:bg-[var(--surface-tertiary)] hover:border-[var(--border-hover)] transition-colors"
            title={isFs ? t('sop.exitFullscreen', 'Exit fullscreen') : t('sop.enterFullscreen', 'Enter fullscreen')}
          >
            {isFs ? (
              <Minimize2 className="w-4 h-4 text-[var(--text-secondary)]" />
            ) : (
              <Maximize2 className="w-4 h-4 text-[var(--text-secondary)]" />
            )}
          </motion.button>
        </div>
      </ReactFlow>
    </div>
  );
}

// ============================================
// HAND EDITOR COMPONENT
// ============================================

function HandEditor({
  hand,
  onSave,
  isSaving,
}: {
  hand: Hand;
  onSave: (updates: Partial<Hand>) => void;
  isSaving: boolean;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'basic' | 'steps' | 'config'>('basic');
  const [editedHand, setEditedHand] = useState<Hand>(hand);

  // Fetch real steps from API
  const { data: handStepsData, isLoading: isLoadingSteps } = useQuery({
    queryKey: ['hand-steps', hand.id],
    queryFn: () => api.getHandSteps(hand.id),
    enabled: !!hand.id,
  });

  // Convert API steps to local format
  const steps = useMemo(() => {
    if (handStepsData?.steps) {
      return toLocalSteps(handStepsData.steps);
    }
    // Fallback: generate from tools if no steps returned
    if (hand.tools) {
      return hand.tools.map((tool, index) => ({
        id: `step-${index}`,
        order: index + 1,
        title: `Execute ${tool}`,
        description: `Call ${tool} tool`,
        tool: tool,
      }));
    }
    return [];
  }, [handStepsData, hand.tools]);

  const handleSave = () => {
    onSave({
      display_name: editedHand.display_name,
      description: editedHand.description,
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--surface-secondary)]/50 rounded-xl mb-4">
        {[
          { id: 'basic', label: t('sop.basic', 'Basic'), icon: Layout },
          { id: 'steps', label: t('sop.steps', 'Steps'), icon: List },
          { id: 'config', label: t('sop.config', 'Config'), icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white text-[var(--primary-dark)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'basic' && (
            <motion.div
              key="basic"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Name */}
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                  {t('sop.name', 'Name')}
                </label>
                <input
                  type="text"
                  value={editedHand.display_name || editedHand.name}
                  onChange={(e) =>
                    setEditedHand({ ...editedHand, display_name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[var(--border-default)] text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                  {t('sop.description', 'Description')}
                </label>
                <textarea
                  value={editedHand.description || ''}
                  onChange={(e) =>
                    setEditedHand({ ...editedHand, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[var(--border-default)] text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                  {t('sop.category', 'Category')}
                </label>
                <input
                  type="text"
                  value={editedHand.category || 'General'}
                  disabled
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-secondary)]"
                />
              </div>

              {/* Tools */}
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                  {t('sop.tools', 'Tools')} ({editedHand.tools?.length || 0})
                </label>
                <div className="flex flex-wrap gap-2">
                  {editedHand.tools?.map((tool) => (
                    <span
                      key={tool}
                      className="px-2.5 py-1 rounded-lg bg-[var(--primary-50)] text-[var(--primary-dark)] text-xs font-medium"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'steps' && (
            <motion.div
              key="steps"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {isLoadingSteps ? (
                <div className="flex items-center justify-center p-8 text-[var(--text-secondary)]">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {t('common.loading', 'Loading...')}
                </div>
              ) : (
                <>
                  {/* Steps Diagram */}
                  <div>
                    <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                      {t('sop.stepsDiagram', 'Steps Diagram')}
                    </h4>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50/50 to-purple-50/30 border border-violet-100">
                      <StepsDiagram steps={steps} />
                    </div>
                  </div>

                  {/* Flowchart */}
                  <div>
                    <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                      {t('sop.flowchart', 'Flowchart')}
                    </h4>
                    <div className="p-4 rounded-2xl bg-white border border-[var(--border-default)]">
                      <FlowchartDiagram steps={steps} />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Agent Config */}
              {hand.agent && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50/50 to-purple-50/30 border border-violet-100">
                  <h4 className="text-xs font-medium text-[var(--primary-dark)] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" />
                    {t('sop.agentConfig', 'Agent Configuration')}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">{t('sop.provider', 'Provider')}</label>
                      <input
                        type="text"
                        value={hand.agent.provider || ''}
                        disabled
                        className="w-full px-3 py-2 rounded-lg bg-white border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">{t('sop.model', 'Model')}</label>
                      <input
                        type="text"
                        value={hand.agent.model || ''}
                        disabled
                        className="w-full px-3 py-2 rounded-lg bg-white border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Requirements */}
              <div>
                <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  {t('sop.requirements', 'Requirements')}
                </h4>
                <div className="space-y-2">
                  {hand.requirements?.map((req) => (
                    <div
                      key={req.key}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-xl border transition-all',
                        req.satisfied
                          ? 'bg-emerald-50/30 border-emerald-100'
                          : 'bg-amber-50/30 border-amber-200'
                      )}
                    >
                      <div
                        className={cn(
                          'w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                          req.satisfied ? 'bg-emerald-100' : 'bg-amber-100'
                        )}
                      >
                        {req.satisfied ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {req.label}
                          </p>
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                            req.satisfied
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-amber-100 text-amber-600'
                          )}>
                            {req.type || 'Binary'}
                          </span>
                        </div>
                        {req.description && (
                          <p className="text-xs text-[var(--text-muted)] mt-1">{req.description}</p>
                        )}
                        {req.check_value && (
                          <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">{req.check_value}</p>
                        )}
                        {/* Install Actions */}
                        {!req.satisfied && req.install && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {req.install.docs_url && (
                              <a
                                href={req.install.docs_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[var(--border-default)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] transition-colors"
                              >
                                <span>📖</span> {t('sop.docs', 'Docs')}
                              </a>
                            )}
                            {req.install.signup_url && (
                              <a
                                href={req.install.signup_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--primary-50)] border border-[var(--primary-200)] text-xs text-[var(--primary-dark)] hover:bg-[var(--primary-100)] transition-colors"
                              >
                                <span>🚀</span> {t('sop.signup', 'Sign Up')}
                              </a>
                            )}
                            {(req.install.macos || req.install.windows || req.install.linux_apt) && (
                              <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-600 hover:bg-emerald-100 transition-colors">
                                <span>📦</span> {t('sop.install', 'Install')}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings */}
              {hand.settings && hand.settings.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-[var(--primary)]" />
                    {t('sop.settings', 'Settings')} ({hand.settings.length})
                  </h4>
                  <div className="space-y-3">
                    {hand.settings.map((setting) => (
                      <div
                        key={setting.key}
                        className="p-3 rounded-xl bg-white border border-[var(--border-default)]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {setting.label}
                          </p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-secondary)] text-[var(--text-secondary)] font-medium">
                            {setting.setting_type}
                          </span>
                        </div>
                        {setting.description && (
                          <p className="text-xs text-[var(--text-muted)] mb-2">{setting.description}</p>
                        )}
                        {/* Setting Input based on type */}
                        <div className="mt-2">
                          {setting.setting_type === 'select' && setting.options ? (
                            <select
                              defaultValue={setting.default || ''}
                              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-default)] text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                            >
                              {setting.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                  {opt.available === false ? ' (unavailable)' : ''}
                                </option>
                              ))}
                            </select>
                          ) : setting.setting_type === 'toggle' ? (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                defaultChecked={setting.default === 'true'}
                                className="w-4 h-4 rounded border-gray-300 text-[var(--primary-dark)] focus:ring-violet-500"
                              />
                              <span className="text-xs text-[var(--text-secondary)]">
                                {setting.default === 'true' ? t('sop.enabled', 'Enabled') : t('sop.disabled', 'Disabled')}
                              </span>
                            </label>
                          ) : (
                            <input
                              type="text"
                              defaultValue={setting.default || ''}
                              placeholder={t('sop.enterValue', 'Enter value...')}
                              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-default)] text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dashboard Metrics */}
              {hand.dashboard && hand.dashboard.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Layout className="w-3.5 h-3.5 text-blue-500" />
                    {t('sop.dashboardMetrics', 'Dashboard Metrics')}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {hand.dashboard.map((metric) => (
                      <div
                        key={metric.memory_key}
                        className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100"
                      >
                        <p className="text-xs font-medium text-blue-700">{metric.label}</p>
                        <p className="text-[10px] text-blue-400 font-mono">{metric.memory_key}</p>
                        <p className="text-[10px] text-blue-400">{metric.format}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t border-[var(--border-subtle)]">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 disabled:opacity-50 transition-all"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t('sop.save', 'Save Changes')}
        </button>
      </div>
    </div>
  );
}

// ============================================
// ACTIVE INSTANCE CARD
// ============================================

function ActiveInstanceCard({
  instance,
  hand,
  onPause,
  onResume,
  onDeactivate,
}: {
  instance: HandInstance;
  hand?: Hand;
  onPause: () => void;
  onResume: () => void;
  onDeactivate: () => void;
}) {
  const isActive = instance.status === 'Active';

  return (
    <div className="p-4 rounded-xl bg-white border border-[var(--border-default)] shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-lg">
            {hand?.icon || '🖐️'}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {instance.agent_name || hand?.display_name || instance.hand_id}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {new Date(instance.activated_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2 py-1 rounded-lg text-xs font-medium',
              isActive
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-amber-100 text-amber-600'
            )}
          >
            {instance.status}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
        {isActive ? (
          <button
            onClick={onPause}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-xs font-medium hover:bg-[var(--border-default)] transition-colors"
          >
            <Pause className="w-3.5 h-3.5" />
            Pause
          </button>
        ) : (
          <button
            onClick={onResume}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-100 text-emerald-600 text-xs font-medium hover:bg-emerald-200 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Resume
          </button>
        )}
        <button
          onClick={onDeactivate}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
        >
          <Square className="w-3.5 h-3.5" />
          Stop
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function Hands() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedHand, setSelectedHand] = useState<Hand | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'flow'>('details');
  const [steps, setSteps] = useState<LocalHandStep[]>([]);
  const [stepsLoading, setStepsLoading] = useState(false);

  // Edit mode state (Wave 1a)
  const [isEditing, setIsEditing] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Validation state (Wave 2)
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [] });

  // Execution state for real-time step status (Wave 4)
  const [executionState, setExecutionState] = useState<{
    executionId?: string;
    stepStatuses: Record<string, 'pending' | 'running' | 'completed' | 'failed' | 'waiting'>;
  }>({ stepStatuses: {} });

  // Draft state management (Wave 1a)
  const {
    draftSteps,
    isDirty,
    updateStep,
    addStep,
    deleteStep,
    updateConnections,
    resetDraft,
    setSteps: setDraftSteps,
  } = useHandDraft(selectedHand?.id || '', steps);

  // Sync draft steps when steps change externally
  useEffect(() => {
    setDraftSteps(steps);
  }, [steps, setDraftSteps]);

  // Validate steps when draft changes (Wave 2)
  useEffect(() => {
    if (isEditing) {
      setValidation(validateSteps(draftSteps));
    }
  }, [draftSteps, isEditing]);

  // Fetch hands
  const { data: hands = [], isLoading, error, refetch } = useQuery<Hand[]>({
    queryKey: ['hands'],
    queryFn: async () => {
      const res = await api.get<{ hands: Hand[] }>('/api/hands');
      return res.hands || [];
    },
  });

  // Fetch full hand details when a hand is selected
  const { data: handDetail, isLoading: isDetailLoading } = useQuery<Hand>({
    queryKey: ['hand-detail', selectedHand?.id],
    queryFn: async () => {
      if (!selectedHand?.id) throw new Error('No hand selected');
      return api.getHandDetail(selectedHand.id);
    },
    enabled: !!selectedHand?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Use detailed hand data if available, otherwise fall back to list data
  const displayHand = handDetail || selectedHand;

  // Fetch active instances
  const { data: activeInstances = [], refetch: refetchActive } = useQuery<HandInstance[]>({
    queryKey: ['hands-active'],
    queryFn: async () => {
      const res = await api.getActiveHands();
      return res.instances || [];
    },
    refetchInterval: 5000,
  });

  // Mutations
  const activateMutation = useMutation({
    mutationFn: (handId: string) => api.activateHand(handId, {}),
    onSuccess: (_, handId) => {
      toaster.success(t('sop.activated', 'Hand activated'));
      refetchActive();
      const hand = hands.find((h) => h.id === handId);
      if (hand) setSelectedHand(hand);
    },
    onError: (err) => {
      toaster.error((err as Error).message);
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (instanceId: string) => api.pauseHandInstance(instanceId),
    onSuccess: () => {
      toaster.success(t('sop.paused', 'Hand paused'));
      refetchActive();
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (instanceId: string) => api.resumeHandInstance(instanceId),
    onSuccess: () => {
      toaster.success(t('sop.resumed', 'Hand resumed'));
      refetchActive();
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (instanceId: string) => api.deactivateHandInstance(instanceId),
    onSuccess: () => {
      toaster.success(t('sop.deactivated', 'Hand deactivated'));
      refetchActive();
    },
  });

  const startExecutionMutation = useMutation({
    mutationFn: (handId: string) => api.startHandExecution(handId),
    onSuccess: (data) => {
      toaster.success(t('sop.executionStarted', 'Execution started: {{executionId}}', { executionId: data.execution_id.slice(0, 8) }));
    },
    onError: (error: Error) => {
      toaster.error(t('sop.executionFailed', 'Failed to start: {{message}}', { message: error.message }));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (updates: { handId: string; data: Partial<Hand> }) => {
      // Mock save - replace with actual API call when available
      await new Promise((resolve) => setTimeout(resolve, 500));
      return updates.data;
    },
    onSuccess: () => {
      toaster.success(t('sop.saved', 'Changes saved'));
      refetch();
    },
  });

  // Get active instance for selected hand
  const activeInstance = useMemo(() => {
    if (!displayHand) return null;
    return activeInstances.find((inst) => inst.hand_id === displayHand.id);
  }, [displayHand, activeInstances]);

  // WebSocket connection for real-time execution updates (Wave 4)
  useSessionWebSocket({
    agentId: activeInstance?.agent_id || null,
    sessionId: activeInstance?.instance_id || null,
    onMessage: (message) => {
      if (message.type === 'step_status_change') {
        const { step_id, status } = message.data as { step_id: string; status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting' };
        setExecutionState((prev) => ({
          ...prev,
          stepStatuses: {
            ...prev.stepStatuses,
            [step_id]: status,
          },
        }));
      }
    },
  });

  // Select first hand on load
  useMemo(() => {
    if (hands.length > 0 && !selectedHand) {
      setSelectedHand(hands[0]);
    }
  }, [hands, selectedHand]);

  // Fetch steps when selected hand changes
  useEffect(() => {
    if (selectedHand) {
      setStepsLoading(true);
      api.getHandSteps(selectedHand.id)
        .then((response) => {
          setSteps(toLocalSteps(response.steps || []));
        })
        .catch((err) => {
          console.error('Failed to load steps:', err);
          setSteps([]);
        })
        .finally(() => setStepsLoading(false));
    }
  }, [selectedHand]);

  const handleActivate = () => {
    if (displayHand) {
      activateMutation.mutate(displayHand.id);
    }
  };

  // Edit mode handlers (Wave 1a)
  const handleEnterEditMode = () => {
    setIsEditing(true);
    setActiveTab('flow');
  };

  const handleExitEditMode = () => {
    setIsEditing(false);
    setSelectedNodeId(null);
  };

  const handleCancelEdit = () => {
    resetDraft();
    handleExitEditMode();
  };

  const handleSaveSteps = async () => {
    if (!displayHand) return;
    // Block save if validation fails (Wave 2)
    if (!validation.isValid) {
      toaster.error(t('sop.validationFailed', 'Please fix validation errors before saving'));
      return;
    }
    try {
      await api.updateHandSteps(displayHand.id, toApiSteps(draftSteps));
      setSteps(draftSteps);
      toaster.success(t('sop.stepsSaved', 'Steps saved successfully'));
      handleExitEditMode();
    } catch (err) {
      toaster.error((err as Error).message || t('sop.saveFailed', 'Failed to save steps'));
    }
  };

  const handleStepAdd = (step: LocalHandStep, _position: { x: number; y: number }) => {
    addStep(step);
  };

  const handleStepsChange = (newSteps: LocalHandStep[]) => {
    setDraftSteps(newSteps);
  };

  return (
    <div className="flex h-full gap-3 p-3">
      {/* Left Panel: Grouped Hand List */}
      <aside className="w-72 flex flex-col rounded-2xl bg-white shadow-[0_8px_32px_rgba(139,92,246,0.08)] border border-white/50 overflow-hidden">
        <GroupedHandList
          hands={hands}
          selectedHand={selectedHand}
          onSelect={(hand) => {
            setSelectedHand(hand);
            setShowEditor(false);
          }}
          activeInstances={activeInstances}
        />
      </aside>

      {/* Right Panel: Detail View */}
      <main className="flex-1 flex flex-col gap-3 min-w-0">
        {displayHand ? (
          <>
            {/* Header Card */}
            <div className="flex items-center justify-between px-5 py-3 rounded-2xl bg-white shadow-[0_4px_20px_rgba(139,92,246,0.06)] border border-white/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-lg shadow-lg shadow-violet-500/20">
                  {displayHand.icon || '🖐️'}
                </div>
                <div>
                  <h1 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    {displayHand.display_name || displayHand.name}
                    {isDetailLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--primary)]" />}
                  </h1>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {displayHand.category || 'General'} • {displayHand.tools?.length || 0} tools
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Active Badge */}
                {activeInstance && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-600 text-xs font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t('sop.running', 'Running')}
                  </span>
                )}

                {/* Edit Mode Buttons (Wave 1a) */}
                {activeTab === 'flow' && (
                  <>
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-xs font-medium hover:bg-[var(--border-default)] transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          {t('common.cancel', 'Cancel')}
                        </button>
                        <button
                          onClick={handleSaveSteps}
                          disabled={!isDirty || !validation.isValid}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 disabled:opacity-50 disabled:shadow-none transition-all"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {t('common.save', 'Save')}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleEnterEditMode}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--primary-100)] text-[var(--primary-dark)] text-xs font-medium hover:bg-violet-200 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {t('common.edit', 'Edit')}
                      </button>
                    )}
                  </>
                )}

                {/* Legacy Editor Button (hidden in flow edit mode) */}
                {!isEditing && (
                  <button
                    onClick={() => setShowEditor(!showEditor)}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      showEditor
                        ? 'bg-[var(--primary-100)] text-[var(--primary-dark)]'
                        : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
                    )}
                    title={t('sop.editor', 'Hand Editor')}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}

                {/* Activate/Stop Button */}
                {activeInstance ? (
                  <>
                    <button
                      onClick={() => startExecutionMutation.mutate(displayHand.id)}
                      disabled={startExecutionMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:shadow-none transition-all"
                    >
                      {startExecutionMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      {t('sop.startExecution', 'Start Execution')}
                    </button>
                    <button
                      onClick={() => deactivateMutation.mutate(activeInstance.instance_id)}
                      disabled={deactivateMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      <Square className="w-3.5 h-3.5" />
                      {t('sop.stop', 'Stop')}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleActivate}
                    disabled={
                      activateMutation.isPending ||
                      !displayHand.requirements?.every((r) => r.satisfied)
                    }
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 disabled:opacity-50 disabled:shadow-none transition-all"
                  >
                    {activateMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    {t('sop.activate', 'Activate')}
                  </button>
                )}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex gap-3 min-h-0">
              {/* Left: Steps & Flowchart */}
              <div className="flex-1 flex flex-col gap-3 min-w-0">
                {/* Description Card */}
                <div className="p-4 rounded-2xl bg-white shadow-[0_4px_20px_rgba(139,92,246,0.06)] border border-white/50">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {displayHand.description || t('sop.noDescription', 'No description')}
                  </p>
                </div>

                {/* Editor or View Mode */}
                {showEditor ? (
                  <div className="flex-1 p-5 rounded-2xl bg-white shadow-[0_4px_20px_rgba(139,92,246,0.06)] border border-white/50 overflow-hidden">
                    <HandEditor
                      hand={displayHand}
                      onSave={(updates) =>
                        saveMutation.mutate({ handId: displayHand.id, data: updates })
                      }
                      isSaving={saveMutation.isPending}
                    />
                  </div>
                ) : (
                  <>
                    {/* Tab Navigation */}
                    <div className="flex gap-1 p-1 bg-[var(--surface-secondary)]/50 rounded-xl mb-2">
                      <button
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                          activeTab === 'details'
                            ? 'bg-white text-[var(--primary-dark)] shadow-sm'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        )}
                        onClick={() => {
                          setActiveTab('details');
                          setIsEditing(false);
                        }}
                      >
                        <List className="w-4 h-4" />
                        {t('sop.details', 'Details')}
                      </button>
                      <button
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                          activeTab === 'flow'
                            ? 'bg-white text-[var(--primary-dark)] shadow-sm'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        )}
                        onClick={() => {
                          setActiveTab('flow');
                          setIsEditing(false);
                        }}
                      >
                        <GitBranch className="w-4 h-4" />
                        {t('sop.flow', 'Flow')}
                      </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'details' && (
                      <div className="flex-1 p-5 rounded-2xl bg-gradient-to-br from-violet-50/50 to-purple-50/30 border border-violet-100 overflow-auto">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                          <List className="w-4 h-4 text-[var(--primary)]" />
                          {t('sop.executionSteps', 'Execution Steps')}
                        </h3>
                        {stepsLoading ? (
                          <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" />
                            <span className="text-sm">{t('common.loading', 'Loading...')}</span>
                          </div>
                        ) : (
                          <StepsDiagram steps={steps} />
                        )}
                      </div>
                    )}

                    {activeTab === 'flow' && (
                      <div className="flex-1 rounded-2xl bg-white shadow-[0_4px_20px_rgba(139,92,246,0.06)] border border-white/50 flex flex-col overflow-hidden">
                        {isEditing ? (
                          /* 3-Panel Edit Mode Layout (Wave 1b) */
                          <div className="flex-1 flex min-h-0">
                            {/* Left: Step Palette */}
                            <StepPalette />

                            {/* Center: Flow Canvas */}
                            <div className="flex-1 flex flex-col min-w-0">
                              <div className="flex-1 p-4 min-h-0">
                                {stepsLoading ? (
                                  <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                    {t('sop.loadingFlow', 'Loading flow...')}
                                  </div>
                                ) : (
                                  <FlowCanvas
                                    steps={draftSteps}
                                    readOnly={false}
                                    isEditing={true}
                                    selectedNodeId={selectedNodeId}
                                    stepStatuses={executionState.stepStatuses}
                                    onStepsChange={handleStepsChange}
                                    onNodeSelect={setSelectedNodeId}
                                    onStepAdd={handleStepAdd}
                                    onStepDelete={deleteStep}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Right: Property Panel */}
                            <PropertyPanel
                              step={draftSteps.find(s => s.id === selectedNodeId) || null}
                              allSteps={draftSteps}
                              onUpdate={updateStep}
                            />

                            {/* Far Right: Validation Panel (Wave 2) */}
                            <ValidationPanel
                              validation={validation}
                              onErrorClick={(stepId) => setSelectedNodeId(stepId)}
                            />
                          </div>
                        ) : (
                          /* Read-Only Flow View */
                          <>
                            <div className="px-5 py-3 border-b border-[var(--border-subtle)]">
                              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                <GitBranch className="w-4 h-4 text-[var(--primary)]" />
                                {t('sop.processFlow', 'Process Flow')}
                              </h3>
                            </div>
                            <div className="flex-1 p-4 min-h-0">
                              {stepsLoading ? (
                                <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                  {t('sop.loadingFlow', 'Loading flow...')}
                                </div>
                              ) : (
                                <FlowCanvas steps={steps} readOnly stepStatuses={executionState.stepStatuses} />
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                  </>
                )}
              </div>

              {/* Right: Active Instance & Info */}
              <aside className="w-80 flex flex-col gap-3">
                {/* Active Instance Card */}
                {activeInstance && (
                  <ActiveInstanceCard
                    instance={activeInstance}
                    hand={displayHand}
                    onPause={() => pauseMutation.mutate(activeInstance.instance_id)}
                    onResume={() => resumeMutation.mutate(activeInstance.instance_id)}
                    onDeactivate={() =>
                      deactivateMutation.mutate(activeInstance.instance_id)
                    }
                  />
                )}

                {/* Requirements Card */}
                <div className="flex-1 p-4 rounded-2xl bg-white shadow-[0_4px_20px_rgba(139,92,246,0.06)] border border-white/50 overflow-hidden">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <Check className="w-4 h-4 text-[var(--primary)]" />
                    {t('sop.requirements', 'Requirements')}
                  </h3>
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-3">
                      {displayHand.requirements?.map((req) => (
                        <div
                          key={req.key}
                          className={cn(
                            'flex items-start gap-2.5 p-2.5 rounded-xl border transition-all',
                            req.satisfied
                              ? 'bg-emerald-50/30 border-emerald-100'
                              : 'bg-amber-50/30 border-amber-200'
                          )}
                        >
                          <div
                            className={cn(
                              'w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                              req.satisfied ? 'bg-emerald-100' : 'bg-amber-100'
                            )}
                          >
                            {req.satisfied ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-[var(--text-primary)]">
                                {req.label}
                              </p>
                              <span className={cn(
                                'text-[9px] px-1 py-0.5 rounded-full font-medium',
                                req.satisfied
                                  ? 'bg-emerald-100 text-emerald-600'
                                  : 'bg-amber-100 text-amber-600'
                              )}>
                                {req.type || 'Binary'}
                              </span>
                            </div>
                            {req.description && (
                              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                {req.description}
                              </p>
                            )}
                            {/* Install Actions for unsatisfied requirements */}
                            {!req.satisfied && req.install && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {req.install.docs_url && (
                                  <a
                                    href={req.install.docs_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white border border-[var(--border-default)] text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] transition-colors"
                                  >
                                    <span>📖</span> {t('sop.docs', 'Docs')}
                                  </a>
                                )}
                                {req.install.signup_url && (
                                  <a
                                    href={req.install.signup_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--primary-50)] border border-[var(--primary-200)] text-[10px] text-[var(--primary-dark)] hover:bg-[var(--primary-100)] transition-colors"
                                  >
                                    <span>🚀</span> {t('sop.signup', 'Sign Up')}
                                  </a>
                                )}
                                {(req.install.macos || req.install.windows || req.install.linux_apt) && (
                                  <button className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-600 hover:bg-emerald-100 transition-colors">
                                    <span>📦</span> {t('sop.install', 'Install')}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Tools Card */}
                <div className="p-4 rounded-2xl bg-white shadow-[0_4px_20px_rgba(139,92,246,0.06)] border border-white/50">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-[var(--primary)]" />
                    {t('sop.tools', 'Tools')} ({displayHand.tools?.length || 0})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {displayHand.tools?.map((tool) => (
                      <span
                        key={tool}
                        className="px-2 py-1 rounded-lg bg-[var(--primary-50)] text-[var(--primary-dark)] text-[10px] font-medium"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center rounded-2xl bg-white shadow-[0_4px_20px_rgba(139,92,246,0.06)] border border-white/50">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-4">
              <HandIcon className="w-8 h-8 text-[var(--primary)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              {t('sop.selectSOP', 'Select a Hand')}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              {t('sop.selectSOPDesc', 'Choose a Hand from the list to view details')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Hands;
