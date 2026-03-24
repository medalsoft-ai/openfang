// SOP (Hands) Page - Claymorphism Design
// Left: Grouped SOP List | Right: Steps, Flowchart, Edit Form

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
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
import type { Hand, HandInstance, HandRequirement, HandSetting } from '@/api/types';
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
  Zap,
  Package,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface SOPStep {
  id: string;
  order: number;
  title: string;
  description?: string;
  tool?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

interface SOPFlow {
  id: string;
  from: string;
  to: string;
  condition?: string;
}

// ============================================
// GROUPED LIST COMPONENT
// ============================================

function GroupedSOPList({
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
    'General': 'bg-violet-500',
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100/50">
        <h2 className="text-sm font-semibold text-gray-700">{t('sop.title', 'SOP')}</h2>
        <span className="text-xs text-violet-500 font-medium bg-violet-50 px-2 py-0.5 rounded-full">
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
                    categoryColors[category] || 'bg-gray-400'
                  )}
                />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {category}
                </span>
                <div className="flex-1 h-px bg-gray-200 ml-2" />
              </div>

              {/* SOP Items */}
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
                        ? 'bg-violet-100 border border-violet-200 shadow-sm'
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
                            isSelected ? 'text-white' : 'text-gray-500'
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
                            isSelected ? 'text-violet-900' : 'text-gray-700'
                          )}
                        >
                          {hand.display_name || hand.name}
                        </p>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
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

function StepsDiagram({ steps }: { steps: SOPStep[] }) {
  if (!steps || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
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
                <h4 className="text-sm font-medium text-gray-800">{step.title}</h4>
                {step.description && (
                  <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                )}
                {step.tool && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Zap className="w-3 h-3 text-violet-500" />
                    <span className="text-xs text-violet-600 font-medium">
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
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-gray-400" />
      <div
        className={cn(
          'px-4 py-3 rounded-xl border-2 min-w-[140px] text-center shadow-sm transition-all hover:shadow-md',
          data.isFirst
            ? 'bg-emerald-50 border-emerald-300'
            : data.isLast
            ? 'bg-violet-50 border-violet-300'
            : 'bg-white border-gray-200'
        )}
      >
        <span
          className={cn(
            'text-xs font-medium block truncate',
            data.isFirst ? 'text-emerald-700' : data.isLast ? 'text-violet-700' : 'text-gray-700'
          )}
        >
          {data.label}
        </span>
        {data.description && (
          <span className="text-[10px] text-gray-500 mt-1 block truncate">{data.description}</span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-gray-400" />
    </>
  );
}

const nodeTypes: NodeTypes = {
  flowStep: FlowStepNode,
};

// ============================================
// FLOWCHART COMPONENT (React Flow)
// ============================================

function FlowchartDiagram({ steps }: { steps: SOPStep[]; flows?: SOPFlow[] }) {
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
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-gray-400">
        <GitBranch className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm">{t('sop.noFlow', 'No flow defined')}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden border border-gray-200 bg-white transition-all duration-300',
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
        <Controls className="!bg-white !border-gray-200 !shadow-sm" />
        {/* Fullscreen Toggle Button */}
        <div className="absolute top-3 right-3 z-10">
          <motion.button
            onClick={handleToggleFullscreen}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center w-8 h-8 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
            title={isFs ? t('sop.exitFullscreen', 'Exit fullscreen') : t('sop.enterFullscreen', 'Enter fullscreen')}
          >
            {isFs ? (
              <Minimize2 className="w-4 h-4 text-gray-600" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-600" />
            )}
          </motion.button>
        </div>
      </ReactFlow>
    </div>
  );
}

// ============================================
// SOP EDITOR COMPONENT
// ============================================

function SOPEditor({
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

  // Generate mock steps from hand data
  const mockSteps: SOPStep[] = useMemo(() => {
    const steps: SOPStep[] = [];
    if (hand.tools) {
      hand.tools.forEach((tool, index) => {
        steps.push({
          id: `step-${index}`,
          order: index + 1,
          title: `Execute ${tool}`,
          description: `Call ${tool} tool`,
          tool: tool,
        });
      });
    }
    return steps;
  }, [hand]);

  const handleSave = () => {
    onSave({
      display_name: editedHand.display_name,
      description: editedHand.description,
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100/50 rounded-xl mb-4">
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
                ? 'bg-white text-violet-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
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
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
                  {t('sop.name', 'Name')}
                </label>
                <input
                  type="text"
                  value={editedHand.display_name || editedHand.name}
                  onChange={(e) =>
                    setEditedHand({ ...editedHand, display_name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
                  {t('sop.description', 'Description')}
                </label>
                <textarea
                  value={editedHand.description || ''}
                  onChange={(e) =>
                    setEditedHand({ ...editedHand, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
                  {t('sop.category', 'Category')}
                </label>
                <input
                  type="text"
                  value={editedHand.category || 'General'}
                  disabled
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500"
                />
              </div>

              {/* Tools */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
                  {t('sop.tools', 'Tools')} ({editedHand.tools?.length || 0})
                </label>
                <div className="flex flex-wrap gap-2">
                  {editedHand.tools?.map((tool) => (
                    <span
                      key={tool}
                      className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-600 text-xs font-medium"
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
              {/* Steps Diagram */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  {t('sop.stepsDiagram', 'Steps Diagram')}
                </h4>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50/50 to-purple-50/30 border border-violet-100">
                  <StepsDiagram steps={mockSteps} />
                </div>
              </div>

              {/* Flowchart */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  {t('sop.flowchart', 'Flowchart')}
                </h4>
                <div className="p-4 rounded-2xl bg-white border border-gray-200">
                  <FlowchartDiagram steps={mockSteps} />
                </div>
              </div>
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
                  <h4 className="text-xs font-medium text-violet-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" />
                    {t('sop.agentConfig', 'Agent Configuration')}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">{t('sop.provider', 'Provider')}</label>
                      <input
                        type="text"
                        value={hand.agent.provider || ''}
                        disabled
                        className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">{t('sop.model', 'Model')}</label>
                      <input
                        type="text"
                        value={hand.agent.model || ''}
                        disabled
                        className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Requirements */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
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
                          <p className="text-sm font-medium text-gray-700">
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
                          <p className="text-xs text-gray-400 mt-1">{req.description}</p>
                        )}
                        {req.check_value && (
                          <p className="text-[10px] text-gray-400 mt-1 font-mono">{req.check_value}</p>
                        )}
                        {/* Install Actions */}
                        {!req.satisfied && req.install && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {req.install.docs_url && (
                              <a
                                href={req.install.docs_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                <span>📖</span> {t('sop.docs', 'Docs')}
                              </a>
                            )}
                            {req.install.signup_url && (
                              <a
                                href={req.install.signup_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-200 text-xs text-violet-600 hover:bg-violet-100 transition-colors"
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
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-violet-500" />
                    {t('sop.settings', 'Settings')} ({hand.settings.length})
                  </h4>
                  <div className="space-y-3">
                    {hand.settings.map((setting) => (
                      <div
                        key={setting.key}
                        className="p-3 rounded-xl bg-white border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-700">
                            {setting.label}
                          </p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                            {setting.setting_type}
                          </span>
                        </div>
                        {setting.description && (
                          <p className="text-xs text-gray-400 mb-2">{setting.description}</p>
                        )}
                        {/* Setting Input based on type */}
                        <div className="mt-2">
                          {setting.setting_type === 'select' && setting.options ? (
                            <select
                              defaultValue={setting.default || ''}
                              className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
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
                                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                              />
                              <span className="text-xs text-gray-500">
                                {setting.default === 'true' ? t('sop.enabled', 'Enabled') : t('sop.disabled', 'Disabled')}
                              </span>
                            </label>
                          ) : (
                            <input
                              type="text"
                              defaultValue={setting.default || ''}
                              placeholder={t('sop.enterValue', 'Enter value...')}
                              className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
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
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
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
      <div className="pt-4 border-t border-gray-100">
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
    <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-lg">
            {hand?.icon || '🖐️'}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">
              {instance.agent_name || hand?.display_name || instance.hand_id}
            </p>
            <p className="text-xs text-gray-400">
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
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        {isActive ? (
          <button
            onClick={onPause}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors"
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
      toaster.success(t('sop.activated', 'SOP activated'));
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
      toaster.success(t('sop.paused', 'SOP paused'));
      refetchActive();
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (instanceId: string) => api.resumeHandInstance(instanceId),
    onSuccess: () => {
      toaster.success(t('sop.resumed', 'SOP resumed'));
      refetchActive();
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (instanceId: string) => api.deactivateHandInstance(instanceId),
    onSuccess: () => {
      toaster.success(t('sop.deactivated', 'SOP deactivated'));
      refetchActive();
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

  // Select first hand on load
  useMemo(() => {
    if (hands.length > 0 && !selectedHand) {
      setSelectedHand(hands[0]);
    }
  }, [hands, selectedHand]);

  const handleActivate = () => {
    if (displayHand) {
      activateMutation.mutate(displayHand.id);
    }
  };

  return (
    <div className="flex h-full gap-3 p-3">
      {/* Left Panel: Grouped SOP List */}
      <aside className="w-72 flex flex-col rounded-2xl bg-white shadow-[0_8px_32px_rgba(139,92,246,0.08)] border border-white/50 overflow-hidden">
        <GroupedSOPList
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
                  <h1 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                    {displayHand.display_name || displayHand.name}
                    {isDetailLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />}
                  </h1>
                  <p className="text-xs text-gray-500">
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

                {/* Edit Button */}
                <button
                  onClick={() => setShowEditor(!showEditor)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    showEditor
                      ? 'bg-violet-100 text-violet-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                {/* Activate/Stop Button */}
                {activeInstance ? (
                  <button
                    onClick={() => deactivateMutation.mutate(activeInstance.instance_id)}
                    disabled={deactivateMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    <Square className="w-3.5 h-3.5" />
                    {t('sop.stop', 'Stop')}
                  </button>
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
                  <p className="text-sm text-gray-600">
                    {displayHand.description || t('sop.noDescription', 'No description')}
                  </p>
                </div>

                {/* Editor or View Mode */}
                {showEditor ? (
                  <div className="flex-1 p-5 rounded-2xl bg-white shadow-[0_4px_20px_rgba(139,92,246,0.06)] border border-white/50 overflow-hidden">
                    <SOPEditor
                      hand={displayHand}
                      onSave={(updates) =>
                        saveMutation.mutate({ handId: displayHand.id, data: updates })
                      }
                      isSaving={saveMutation.isPending}
                    />
                  </div>
                ) : (
                  <>
                    {/* Steps & Flowchart - Side by Side Layout */}
                    <div className="flex-1 flex gap-4 min-h-0">
                      {/* Left: Steps List */}
                      <div className="w-1/2 p-5 rounded-2xl bg-gradient-to-br from-violet-50/50 to-purple-50/30 border border-violet-100 overflow-auto">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                          <List className="w-4 h-4 text-violet-500" />
                          {t('sop.executionSteps', 'Execution Steps')}
                        </h3>
                        <StepsDiagram
                          steps={displayHand.tools?.map((tool, index) => ({
                            id: `step-${index}`,
                            order: index + 1,
                            title: `Execute ${tool}`,
                            description: `Call ${tool} tool`,
                            tool: tool,
                          })) || []}
                        />
                      </div>

                      {/* Right: Flowchart */}
                      <div className="w-1/2 p-5 rounded-2xl bg-white shadow-[0_4px_20px_rgba(139,92,246,0.06)] border border-white/50 flex flex-col">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-violet-500" />
                          {t('sop.processFlow', 'Process Flow')}
                        </h3>
                        <div className="flex-1 min-h-0">
                          <FlowchartDiagram
                            steps={displayHand.tools?.map((tool, index) => ({
                              id: `step-${index}`,
                              order: index + 1,
                              title: tool,
                              tool: tool,
                            })) || []}
                          />
                        </div>
                      </div>
                    </div>
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
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Check className="w-4 h-4 text-violet-500" />
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
                              <p className="text-xs font-medium text-gray-700">
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
                              <p className="text-[10px] text-gray-400 mt-0.5">
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
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[10px] text-gray-600 hover:bg-gray-50 transition-colors"
                                  >
                                    <span>📖</span> {t('sop.docs', 'Docs')}
                                  </a>
                                )}
                                {req.install.signup_url && (
                                  <a
                                    href={req.install.signup_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-50 border border-violet-200 text-[10px] text-violet-600 hover:bg-violet-100 transition-colors"
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
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-violet-500" />
                    {t('sop.tools', 'Tools')} ({displayHand.tools?.length || 0})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {displayHand.tools?.map((tool) => (
                      <span
                        key={tool}
                        className="px-2 py-1 rounded-lg bg-violet-50 text-violet-600 text-[10px] font-medium"
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
              <HandIcon className="w-8 h-8 text-violet-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              {t('sop.selectSOP', 'Select a SOP')}
            </h3>
            <p className="text-sm text-gray-400">
              {t('sop.selectSOPDesc', 'Choose a SOP from the list to view details')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Hands;
