// Agents - 3D Gallery Style
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '@/api/client';
import { toaster } from '@/lib/toast';
import type { Agent, AgentFile, ToolFilters, Profile, Template, PersonalityPreset } from '@/api/types';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { cyberColors } from '@/lib/animations';
import {
  Bot, Plus, Play, Pause, Trash2, Settings, Search,
  Cpu, MessageSquare, ChevronRight, X, Copy, History,
  FileText, Wrench, Terminal, Palette, LayoutGrid,
  Sparkles, Check, ChevronLeft, Brain, Shield, Zap,
  Code, Pencil, Save, Filter, RotateCcw, PowerOff,
  GitBranch, Eye, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Agent status badge
function StatusBadge({ status, state }: { status?: Agent['status']; state?: string }) {
  const rawStatus = state || status || '';
  const normalizedStatus = rawStatus.toLowerCase() as Agent['status'];

  const statusConfig = {
    idle: { color: 'var(--neon-green)', label: 'IDLE' },
    running: { color: 'var(--neon-cyan)', label: 'RUNNING' },
    paused: { color: 'var(--neon-amber)', label: 'PAUSED' },
    crashed: { color: 'var(--neon-magenta)', label: 'CRASHED' },
    stopped: { color: 'var(--text-muted)', label: 'STOPPED' },
  };

  const config = statusConfig[normalizedStatus] || statusConfig.idle;

  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-mono font-medium"
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
    >
      {config.label}
    </span>
  );
}

// Agent card with 3D hover effect
function AgentCard({
  agent,
  onSelect,
  onDelete,
  onDetail
}: {
  agent: Agent;
  onSelect: () => void;
  onDelete: () => void;
  onDetail: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const isRunning = agent.status === 'running';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <SpotlightCard
        glowColor={isRunning ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)'}
        onClick={onSelect}
        className="cursor-pointer h-full"
      >
        <div className="p-5 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300',
                  isRunning
                    ? 'bg-[var(--neon-cyan)]/20 shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                    : 'bg-[var(--surface-tertiary)]'
                )}
              >
                <Bot
                  className={cn(
                    'w-6 h-6 transition-colors duration-300',
                    isRunning ? 'text-[var(--neon-cyan)]' : 'text-[var(--text-muted)]'
                  )}
                />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{agent.name}</h3>
                <StatusBadge status={agent.status} state={agent.state} />
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-[var(--text-muted)] mb-4 flex-1 line-clamp-2">
            {agent.description || 'No description'}
          </p>

          {/* Model & Capabilities */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-mono text-[var(--text-muted)] px-2 py-1 rounded bg-[var(--surface-tertiary)]">
              {typeof agent.model === 'string' ? agent.model : agent.model_name || agent.model?.model || 'No model'}
            </span>
            {agent.capabilities?.tools?.length && agent.capabilities.tools.length > 0 && (
              <span className="text-xs font-mono text-[var(--neon-amber)] px-2 py-1 rounded bg-[var(--neon-amber)]/10">
                {agent.capabilities.tools.length} TOOLS
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t border-[var(--border-subtle)]">
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onDetail();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--neon-cyan)]/10 hover:text-[var(--neon-cyan)] text-sm font-medium transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Settings className="w-4 h-4" /> Configure
            </motion.button>

            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-muted)] hover:bg-[var(--neon-magenta)]/10 hover:text-[var(--neon-magenta)]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Stop agent"
            >
              <PowerOff className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

// Create agent modal
function CreateAgentModal({
  isOpen,
  onClose,
  onCreate,
  models
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, modelId: string) => void;
  models: Array<{
    id: string;
    display_name?: string;
    provider: string;
    available: boolean;
  }>;
}) {
  const [name, setName] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  // Set default model when models load
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      const defaultModel = models.find(m => m.available && m.id.includes('gpt')) ||
                           models.find(m => m.available) ||
                           models[0];
      setSelectedModel(defaultModel?.id || '');
    }
  }, [models, selectedModel]);

  const handleCreate = () => {
    if (name.trim() && selectedModel) {
      onCreate(name.trim(), selectedModel);
      setName('');
      setSelectedModel('');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="w-full max-w-md bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-2xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
            <NeonText color="cyan">Create Agent</NeonText>
          </h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Agent name..."
            className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] mb-4"
            autoFocus
          />

          {/* Model Selector */}
          <div className="mb-4">
            <label className="text-xs font-mono text-[var(--text-muted)] mb-2 block">
              MODEL
            </label>
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
            >
              <SelectTrigger className="w-full h-10 bg-[var(--surface-tertiary)] border-[var(--border-default)] text-[var(--text-secondary)] font-mono text-sm">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--surface-primary)] border-[var(--border-default)] max-h-[280px]">
                <ScrollArea className="h-full max-h-[260px]">
                  {models.map((model) => (
                    <SelectItem
                      key={model.id}
                      value={model.id}
                      className="text-sm font-mono text-[var(--text-secondary)] focus:bg-[var(--neon-cyan)]/10 focus:text-[var(--neon-cyan)]"
                      disabled={!model.available}
                    >
                      <div className="flex items-center gap-2">
                        <span>{model.display_name || model.id}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          ({model.provider})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || !selectedModel}
              className="flex-1 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] font-medium disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Built-in templates (align with Alpine)
const builtinTemplates: Template[] = [
  {
    name: 'General Assistant',
    description: 'A versatile conversational agent that can help with everyday tasks, answer questions, and provide recommendations.',
    category: 'General',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    profile: 'full',
    system_prompt: 'You are a helpful, friendly assistant. Provide clear, accurate, and concise responses. Ask clarifying questions when needed.'
  },
  {
    name: 'Code Helper',
    description: 'A programming-focused agent that writes, reviews, and debugs code across multiple languages.',
    category: 'Development',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    profile: 'coding',
    system_prompt: 'You are an expert programmer. Help users write clean, efficient code. Explain your reasoning. Follow best practices and conventions for the language being used.'
  },
  {
    name: 'Researcher',
    description: 'An analytical agent that breaks down complex topics, synthesizes information, and provides cited summaries.',
    category: 'Research',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    profile: 'research',
    system_prompt: 'You are a research analyst. Break down complex topics into clear explanations. Provide structured analysis with key findings. Cite sources when available.'
  },
  {
    name: 'Writer',
    description: 'A creative writing agent that helps with drafting, editing, and improving written content of all kinds.',
    category: 'Writing',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    profile: 'full',
    system_prompt: 'You are a skilled writer and editor. Help users create polished content. Adapt your tone and style to match the intended audience. Offer constructive suggestions for improvement.'
  },
  {
    name: 'Data Analyst',
    description: 'A data-focused agent that helps analyze datasets, create queries, and interpret statistical results.',
    category: 'Development',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    profile: 'coding',
    system_prompt: 'You are a data analysis expert. Help users understand their data, write SQL/Python queries, and interpret results. Present findings clearly with actionable insights.'
  },
  {
    name: 'DevOps Engineer',
    description: 'A systems-focused agent for CI/CD, infrastructure, Docker, and deployment troubleshooting.',
    category: 'Development',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    profile: 'automation',
    system_prompt: 'You are a DevOps engineer. Help with CI/CD pipelines, Docker, Kubernetes, infrastructure as code, and deployment. Prioritize reliability and security.'
  },
  {
    name: 'Customer Support',
    description: 'A professional, empathetic agent for handling customer inquiries and resolving issues.',
    category: 'Business',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    profile: 'messaging',
    system_prompt: 'You are a professional customer support representative. Be empathetic, patient, and solution-oriented. Acknowledge concerns before offering solutions. Escalate complex issues appropriately.'
  },
  {
    name: 'Tutor',
    description: 'A patient educational agent that explains concepts step-by-step and adapts to the learner\'s level.',
    category: 'General',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    profile: 'full',
    system_prompt: 'You are a patient and encouraging tutor. Explain concepts step by step, starting from fundamentals. Use analogies and examples. Check understanding before moving on. Adapt to the learner\'s pace.'
  },
  {
    name: 'API Designer',
    description: 'An agent specialized in RESTful API design, OpenAPI specs, and integration architecture.',
    category: 'Development',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    profile: 'coding',
    system_prompt: 'You are an API design expert. Help users design clean, consistent RESTful APIs following best practices. Cover endpoint naming, request/response schemas, error handling, and versioning.'
  },
  {
    name: 'Meeting Notes',
    description: 'Summarizes meeting transcripts into structured notes with action items and key decisions.',
    category: 'Business',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    profile: 'minimal',
    system_prompt: 'You are a meeting summarizer. When given a meeting transcript or notes, produce a structured summary with: key decisions, action items (with owners), discussion highlights, and follow-up questions.'
  }
];

// Personality presets (align with Alpine)
const personalityPresets: PersonalityPreset[] = [
  { id: 'professional', label: 'Professional', soul: 'Communicate in a clear, professional tone. Be direct and structured. Use formal language and data-driven reasoning. Prioritize accuracy over personality.' },
  { id: 'friendly', label: 'Friendly', soul: 'Be warm, approachable, and conversational. Use casual language and show genuine interest in the user. Add personality to your responses while staying helpful.' },
  { id: 'technical', label: 'Technical', soul: 'Focus on technical accuracy and depth. Use precise terminology. Show your work and reasoning. Prefer code examples and structured explanations.' },
  { id: 'creative', label: 'Creative', soul: 'Be imaginative and expressive. Use vivid language, analogies, and unexpected connections. Encourage creative thinking and explore multiple perspectives.' },
  { id: 'concise', label: 'Concise', soul: 'Be extremely brief and to the point. No filler, no pleasantries. Answer in the fewest words possible while remaining accurate and complete.' },
  { id: 'mentor', label: 'Mentor', soul: 'Be patient and encouraging like a great teacher. Break down complex topics step by step. Ask guiding questions. Celebrate progress and build confidence.' }
];

// Profile descriptions
const profileDescriptions: Record<string, { label: string; desc: string }> = {
  minimal: { label: 'Minimal', desc: 'Read-only file access' },
  coding: { label: 'Coding', desc: 'Files + shell + web fetch' },
  research: { label: 'Research', desc: 'Web search + file read/write' },
  messaging: { label: 'Messaging', desc: 'Agents + memory access' },
  automation: { label: 'Automation', desc: 'All tools except custom' },
  balanced: { label: 'Balanced', desc: 'General-purpose tool set' },
  precise: { label: 'Precise', desc: 'Focused tool set for accuracy' },
  creative: { label: 'Creative', desc: 'Full tools with creative emphasis' },
  full: { label: 'Full', desc: 'All 35+ tools' }
};

// Emoji options (24 emojis)
const emojiOptions = [
  '🤖', '💻', '🔍', '✍️', '📊', '🛠️',
  '💬', '🎓', '🌐', '🔒', '⚡', '🚀',
  '🧪', '🎯', '📖', '👨‍💻', '📧', '🏢',
  '❤️', '🌟', '🔧', '📝', '💡', '🎨'
];

// Archetype options
const archetypeOptions = ['Assistant', 'Researcher', 'Coder', 'Writer', 'DevOps', 'Support', 'Analyst', 'Custom'];

export function Agents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'running' | 'stopped'>('all');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Create wizard state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [spawnMode, setSpawnMode] = useState<'wizard' | 'toml'>('wizard');
  const [spawnStep, setSpawnStep] = useState(1);
  const [spawnForm, setSpawnForm] = useState({
    name: '',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    systemPrompt: 'You are a helpful assistant.',
    profile: 'full',
    caps: {
      memory_read: true,
      memory_write: true,
      network: false,
      shell: false,
      agent_spawn: false
    }
  });
  const [spawnIdentity, setSpawnIdentity] = useState({
    emoji: '',
    color: '#FF5C00',
    archetype: 'Assistant'
  });
  const [selectedPreset, setSelectedPreset] = useState('');
  const [soulContent, setSoulContent] = useState('');
  const [spawning, setSpawning] = useState(false);
  const [spawnToml, setSpawnToml] = useState('');

  // Template selection
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Detail modal state
  const [detailAgent, setDetailAgent] = useState<Agent | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'files' | 'config'>('info');
  const [agentFiles, setAgentFiles] = useState<AgentFile[]>([]);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [fileSaving, setFileSaving] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [configForm, setConfigForm] = useState({
    name: '',
    system_prompt: '',
    emoji: '',
    color: '#FF5C00',
    archetype: '',
    vibe: ''
  });
  const [configSaving, setConfigSaving] = useState(false);
  const [toolFilters, setToolFilters] = useState<ToolFilters>({ tool_allowlist: [], tool_blocklist: [] });
  const [toolFiltersLoading, setToolFiltersLoading] = useState(false);
  const [newAllowTool, setNewAllowTool] = useState('');
  const [newBlockTool, setNewBlockTool] = useState('');
  const [fallbacks, setFallbacks] = useState<Array<{ provider: string; model: string }>>([]);
  const [newFallbackValue, setNewFallbackValue] = useState('');
  const [editingFallback, setEditingFallback] = useState(false);
  const [modelChangeOpen, setModelChangeOpen] = useState(false);
  const [newModelValue, setNewModelValue] = useState('');
  const [modelChanging, setModelChanging] = useState(false);

  // Confirmation dialog states
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogTitle, setConfirmDialogTitle] = useState('');
  const [confirmDialogMessage, setConfirmDialogMessage] = useState('');
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [stopAllConfirmOpen, setStopAllConfirmOpen] = useState(false);

  // Fetch agents
  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => api.listAgents(),
  });

  // Fetch available models and providers
  const { data: modelsData } = useQuery({
    queryKey: ['models'],
    queryFn: () => api.listModels(),
  });

  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: () => api.listProviders(),
  });

  const models = useMemo(() => {
    if (!modelsData) return [];
    if (Array.isArray(modelsData)) return modelsData;
    return modelsData.models || [];
  }, [modelsData]);

  const providers = useMemo(() => {
    if (!providersData) return [];
    return providersData.providers || [];
  }, [providersData]);

  // Check if a provider is configured
  const isProviderConfigured = useCallback((providerName: string) => {
    if (!providerName) return false;
    const p = providers.find(pr => pr.id === providerName);
    return p ? p.auth_status === 'configured' : false;
  }, [providers]);

  // Create agent mutation
  const createMutation = useMutation({
    mutationFn: ({ name, modelId }: { name: string; modelId: string }) => {
      const model = models.find(m => m.id === modelId);
      return api.createAgent({
        name,
        model: {
          provider: model?.provider || 'openai',
          model: modelId,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setShowCreateModal(false);
    },
  });

  // Stop agent mutation
  const stopAgentMutation = useMutation({
    mutationFn: (id: string) => api.stopAgent(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      const agent = agents.find(a => a.id === id);
      toaster.success(`Agent "${agent?.name || id}" stopped`);
    },
    onError: (err) => toaster.error('Failed to stop agent: ' + (err as Error).message),
  });

  // Clone agent mutation
  const cloneMutation = useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) => api.cloneAgent(id, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toaster.success('Agent cloned successfully');
    },
    onError: (err) => toaster.error('Failed to clone: ' + (err as Error).message),
  });

  // Clear history mutation
  const clearHistoryMutation = useMutation({
    mutationFn: (id: string) => api.clearAgentHistory(id),
    onSuccess: () => toaster.success('History cleared'),
    onError: (err) => toaster.error('Failed to clear history: ' + (err as Error).message),
  });

  // Stop all agents
  const stopAllAgents = useCallback(async () => {
    const running = agents.filter(a => a.status === 'running');
    if (running.length === 0) return;
    setStopAllConfirmOpen(true);
  }, [agents]);

  // Actually stop all agents after confirmation
  const doStopAllAgents = useCallback(async () => {
    const running = agents.filter(a => a.status === 'running');
    const errors: string[] = [];
    for (const agent of running) {
      try {
        await api.stopAgent(agent.id);
      } catch (e) {
        errors.push(agent.name);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['agents'] });
    if (errors.length > 0) {
      toaster.error(`Failed to stop: ${errors.join(', ')}`);
    } else {
      toaster.success(`${running.length} agent(s) stopped`);
    }
    setStopAllConfirmOpen(false);
  }, [agents, queryClient]);

  // Default TOML template
  const defaultTomlTemplate = useMemo(() => `name = "My Assistant"
module = "builtin:chat"
profile = "full"

[model]
provider = "groq"
model = "llama-3.3-70b-versatile"
system_prompt = """
You are a helpful assistant.
"""`, []);

  // Chat with agent - navigate to chat page
  const chatWithAgent = useCallback((agent: Agent) => {
    navigate(`/chat?agent=${agent.id}`);
  }, [navigate]);

  // Open spawn wizard with dynamic default provider/model
  const openSpawnWizard = useCallback(async () => {
    setShowCreateModal(true);
    setSpawnMode('wizard');
    setSpawnStep(1);

    // Fetch default provider/model from status
    let defaultProvider = 'groq';
    let defaultModel = 'llama-3.3-70b-versatile';
    try {
      const status = await api.status() as { default_provider?: string; default_model?: string };
      if (status.default_provider) defaultProvider = status.default_provider;
      if (status.default_model) defaultModel = status.default_model;
    } catch (e) {
      // Keep hardcoded defaults
    }

    setSpawnForm({
      name: '',
      provider: defaultProvider,
      model: defaultModel,
      systemPrompt: 'You are a helpful assistant.',
      profile: 'full',
      caps: {
        memory_read: true,
        memory_write: true,
        network: false,
        shell: false,
        agent_spawn: false
      }
    });
    setSpawnIdentity({ emoji: '', color: '#FF5C00', archetype: '' });
    setSelectedPreset('');
    setSoulContent('');
    setSpawnToml(defaultTomlTemplate);
  }, [defaultTomlTemplate]);

  // Generate TOML for wizard
  const generateToml = useCallback(() => {
    const lines = [
      `name = "${spawnForm.name}"`,
      'module = "builtin:chat"'
    ];
    if (spawnForm.profile && spawnForm.profile !== 'custom') {
      lines.push(`profile = "${spawnForm.profile}"`);
    }
    // Add caps section for custom profile
    if (spawnForm.profile === 'custom' && spawnForm.caps) {
      lines.push('', '[caps]');
      lines.push(`memory_read = ${spawnForm.caps.memory_read}`);
      lines.push(`memory_write = ${spawnForm.caps.memory_write}`);
      lines.push(`network = ${spawnForm.caps.network}`);
      lines.push(`shell = ${spawnForm.caps.shell}`);
      lines.push(`agent_spawn = ${spawnForm.caps.agent_spawn}`);
    }
    lines.push('', '[model]');
    lines.push(`provider = "${spawnForm.provider}"`);
    lines.push(`model = "${spawnForm.model}"`);
    lines.push(`system_prompt = """${spawnForm.systemPrompt}"""`);
    return lines.join('\n');
  }, [spawnForm]);

  // Spawn agent from wizard
  const spawnAgent = useCallback(async () => {
    if (spawnMode === 'wizard' && !spawnForm.name.trim()) {
      toaster.warn('Please enter an agent name');
      return;
    }
    if (spawnMode === 'toml' && !spawnToml.trim()) {
      toaster.warn('Please enter TOML configuration');
      return;
    }
    setSpawning(true);
    try {
      const toml = spawnMode === 'wizard' ? generateToml() : spawnToml;
      const res = await api.createAgentFromTOML(toml);
      if (res.agent_id) {
        // Post-spawn: update identity + write SOUL.md if preset selected (wizard mode only)
        if (spawnMode === 'wizard') {
          const patchBody: Record<string, string> = {};
          if (spawnIdentity.emoji) patchBody.emoji = spawnIdentity.emoji;
          if (spawnIdentity.color) patchBody.color = spawnIdentity.color;
          if (spawnIdentity.archetype) patchBody.archetype = spawnIdentity.archetype;
          if (selectedPreset) patchBody.vibe = selectedPreset;

          if (Object.keys(patchBody).length > 0) {
            api.patchAgentConfig(res.agent_id, patchBody).catch(() => {});
          }
          if (soulContent.trim()) {
            api.saveAgentFile(res.agent_id, 'SOUL.md', '# Soul\n' + soulContent).catch(() => {});
          }
        }

        setShowCreateModal(false);
        queryClient.invalidateQueries({ queryKey: ['agents'] });
        toaster.success(`Agent "${res.name || 'new'}" spawned`);
      }
    } catch (err) {
      toaster.error('Failed to spawn agent: ' + (err as Error).message);
    }
    setSpawning(false);
  }, [spawnMode, spawnForm, spawnIdentity, selectedPreset, soulContent, spawnToml, generateToml, queryClient]);

  // Spawn from template
  const spawnFromTemplate = useCallback(async (templateName: string) => {
    try {
      const data = await api.getTemplate(templateName);
      if (data.manifest_toml) {
        const res = await api.createAgentFromTOML(data.manifest_toml);
        if (res.agent_id) {
          queryClient.invalidateQueries({ queryKey: ['agents'] });
          toaster.success(`Agent "${res.name || templateName}" spawned from template`);
        }
      }
    } catch (err) {
      toaster.error('Failed to spawn from template: ' + (err as Error).message);
    }
  }, [queryClient]);

  // Spawn built-in template
  const spawnBuiltin = useCallback(async (t: Template) => {
    const toml = `name = "${t.name}"
description = "${t.description?.replace(/"/g, '\\"') || ''}"
module = "builtin:chat"
profile = "${t.profile}"

[model]
provider = "${t.provider}"
model = "${t.model}"
system_prompt = """
${t.system_prompt}
"""
`;
    try {
      const res = await api.createAgentFromTOML(toml);
      if (res.agent_id) {
        queryClient.invalidateQueries({ queryKey: ['agents'] });
        toaster.success(`Agent "${t.name}" spawned`);
      }
    } catch (err) {
      toaster.error('Failed to spawn agent: ' + (err as Error).message);
    }
  }, [queryClient]);

  // Detail modal functions
  const showDetail = useCallback(async (agent: Agent) => {
    setDetailAgent(agent);
    setDetailTab('info');
    setFallbacks(agent.fallback_models || []);
    setConfigForm({
      name: agent.name || '',
      system_prompt: agent.system_prompt || '',
      emoji: agent.identity?.emoji || '',
      color: agent.identity?.color || '#FF5C00',
      archetype: agent.identity?.archetype || '',
      vibe: agent.identity?.vibe || ''
    });
    // Fetch full agent detail
    try {
      const full = await api.getAgentDetail(agent.id);
      setDetailAgent(full);
      setFallbacks(full.fallback_models || []);
    } catch { /* ignore */ }
  }, []);

  // Load agent files
  const loadAgentFiles = useCallback(async () => {
    if (!detailAgent) return;
    setFilesLoading(true);
    try {
      const data = await api.getAgentFiles(detailAgent.id);
      setAgentFiles(data.files || []);
    } catch (err) {
      toaster.error('Failed to load files: ' + (err as Error).message);
    }
    setFilesLoading(false);
  }, [detailAgent]);

  // Open file for editing
  const openFile = useCallback(async (filename: string) => {
    if (!detailAgent) return;
    try {
      const data = await api.getAgentFile(detailAgent.id, filename);
      setEditingFile(filename);
      setFileContent(data.content || '');
    } catch (err) {
      // File doesn't exist, create empty
      setEditingFile(filename);
      setFileContent('');
    }
  }, [detailAgent]);

  // Save file
  const saveFile = useCallback(async () => {
    if (!detailAgent || !editingFile) return;
    setFileSaving(true);
    try {
      await api.saveAgentFile(detailAgent.id, editingFile, fileContent);
      toaster.success(`${editingFile} saved`);
      await loadAgentFiles();
    } catch (err) {
      toaster.error('Failed to save file: ' + (err as Error).message);
    }
    setFileSaving(false);
  }, [detailAgent, editingFile, fileContent, loadAgentFiles]);

  // Save config
  const saveConfig = useCallback(async () => {
    if (!detailAgent) return;
    setConfigSaving(true);
    try {
      await api.patchAgentConfig(detailAgent.id, configForm);
      toaster.success('Config updated');
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    } catch (err) {
      toaster.error('Failed to save config: ' + (err as Error).message);
    }
    setConfigSaving(false);
  }, [detailAgent, configForm, queryClient]);

  // Load tool filters
  const loadToolFilters = useCallback(async () => {
    if (!detailAgent) return;
    setToolFiltersLoading(true);
    try {
      const data = await api.getAgentTools(detailAgent.id);
      setToolFilters(data);
    } catch {
      setToolFilters({ tool_allowlist: [], tool_blocklist: [] });
    }
    setToolFiltersLoading(false);
  }, [detailAgent]);

  // Save tool filters
  const saveToolFilters = useCallback(async (filters: ToolFilters) => {
    if (!detailAgent) return;
    try {
      await api.setAgentTools(detailAgent.id, filters);
    } catch (err) {
      toaster.error('Failed to update tool filters: ' + (err as Error).message);
    }
  }, [detailAgent]);

  // Add fallback
  const addFallback = useCallback(async () => {
    if (!detailAgent || !newFallbackValue.trim()) return;
    const parts = newFallbackValue.trim().split('/');
    const provider = parts.length > 1 ? parts[0] : detailAgent.model_provider || 'groq';
    const model = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
    const newFallbacks = [...fallbacks, { provider, model }];
    try {
      await api.patchAgentConfig(detailAgent.id, { fallback_models: newFallbacks });
      setFallbacks(newFallbacks);
      toaster.success(`Fallback added: ${provider}/${model}`);
    } catch (err) {
      toaster.error('Failed to add fallback: ' + (err as Error).message);
    }
    setNewFallbackValue('');
    setEditingFallback(false);
  }, [detailAgent, fallbacks, newFallbackValue]);

  // Remove fallback
  const removeFallback = useCallback(async (idx: number) => {
    if (!detailAgent) return;
    const newFallbacks = fallbacks.filter((_, i) => i !== idx);
    try {
      await api.patchAgentConfig(detailAgent.id, { fallback_models: newFallbacks });
      setFallbacks(newFallbacks);
      toaster.success('Fallback removed');
    } catch (err) {
      toaster.error('Failed to remove fallback: ' + (err as Error).message);
    }
  }, [detailAgent, fallbacks]);

  // Handle model change
  const handleModelChange = useCallback(async () => {
    if (!detailAgent || !newModelValue.trim()) return;
    setModelChanging(true);
    try {
      await api.setAgentModel(detailAgent.id, newModelValue.trim());
      toaster.success('Model changed (memory reset)');
      setModelChangeOpen(false);
      // Refresh agents list and get fresh agent data
      await queryClient.invalidateQueries({ queryKey: ['agents'] });
      // Get full agent detail
      const updated = await api.getAgentDetail(detailAgent.id);
      setDetailAgent(updated);
    } catch (err) {
      toaster.error('Failed to change model: ' + (err as Error).message);
    } finally {
      setModelChanging(false);
    }
  }, [detailAgent, newModelValue, queryClient]);

  // Filter agents by status and search
  const filteredAgents = useMemo(() => {
    let result = agents;
    // Status filter
    if (filterState !== 'all') {
      result = result.filter(a => filterState === 'running' ? a.status === 'running' : a.status !== 'running');
    }
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.description?.toLowerCase().includes(query)
      );
    }
    return result;
  }, [agents, searchQuery, filterState]);

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
              <NeonText color="cyan">Agents</NeonText>
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              {agents.length} agent{agents.length !== 1 ? 's' : ''} •{' '}
              {agents.filter((a) => a.status === 'running').length} running
            </p>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => setShowTemplates(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LayoutGrid className="w-4 h-4" />
              Templates
            </motion.button>
            <motion.button
              onClick={openSpawnWizard}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--neon-cyan)] text-[var(--void)] font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-5 h-5" />
              Create Agent
            </motion.button>
          </div>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          className="mb-6 flex flex-wrap items-center gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-xl pl-12 pr-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)]"
            />
          </div>

          {/* Status Filter */}
          <div className="flex bg-[var(--surface-secondary)] rounded-lg p-1">
            {(['all', 'running', 'stopped'] as const).map((state) => (
              <button
                key={state}
                onClick={() => setFilterState(state)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm capitalize transition-colors',
                  filterState === state
                    ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                )}
              >
                {state}
              </button>
            ))}
          </div>

          {/* Stop All Button */}
          {agents.some(a => a.status === 'running') && (
            <motion.button
              onClick={stopAllAgents}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/10"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <PowerOff className="w-4 h-4" />
              Stop All
            </motion.button>
          )}
        </motion.div>

        {/* Agent Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[var(--neon-cyan)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredAgents.length === 0 ? (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-20 h-20 rounded-3xl bg-[var(--surface-secondary)] flex items-center justify-center mx-auto mb-6">
              <Bot className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              No agents found
            </h3>
            <p className="text-[var(--text-muted)] mb-6">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first agent to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 rounded-xl bg-[var(--neon-cyan)] text-[var(--void)] font-medium"
              >
                Create Agent
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            layout
          >
            <AnimatePresence mode="popLayout">
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onSelect={() => chatWithAgent(agent)}
                  onDelete={() => {
                    setAgentToDelete(agent);
                    setConfirmDialogTitle('Stop Agent');
                    setConfirmDialogMessage(`Stop agent "${agent.name}"? The agent will be shut down.`);
                    setConfirmDialogOpen(true);
                  }}
                  onDetail={() => showDetail(agent)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Create Wizard Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateWizardModal
            spawnMode={spawnMode}
            setSpawnMode={setSpawnMode}
            spawnStep={spawnStep}
            setSpawnStep={setSpawnStep}
            spawnForm={spawnForm}
            setSpawnForm={setSpawnForm}
            spawnIdentity={spawnIdentity}
            setSpawnIdentity={setSpawnIdentity}
            selectedPreset={selectedPreset}
            setSelectedPreset={setSelectedPreset}
            soulContent={soulContent}
            setSoulContent={setSoulContent}
            spawnToml={spawnToml}
            setSpawnToml={setSpawnToml}
            spawning={spawning}
            onClose={() => setShowCreateModal(false)}
            onSpawn={spawnAgent}
            providers={providers}
          />
        )}
      </AnimatePresence>

      {/* Templates Modal */}
      <AnimatePresence>
        {showTemplates && (
          <TemplatesModal
            templates={builtinTemplates}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            onClose={() => setShowTemplates(false)}
            onSpawn={spawnBuiltin}
            providers={providers}
          />
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailAgent && (
          <DetailModal
            agent={detailAgent}
            detailTab={detailTab}
            setDetailTab={setDetailTab}
            onClose={() => setDetailAgent(null)}
            agentFiles={agentFiles}
            loadAgentFiles={loadAgentFiles}
            editingFile={editingFile}
            setEditingFile={setEditingFile}
            fileContent={fileContent}
            setFileContent={setFileContent}
            fileSaving={fileSaving}
            saveFile={saveFile}
            filesLoading={filesLoading}
            configForm={configForm}
            setConfigForm={setConfigForm}
            configSaving={configSaving}
            saveConfig={saveConfig}
            toolFilters={toolFilters}
            setToolFilters={setToolFilters}
            loadToolFilters={loadToolFilters}
            saveToolFilters={saveToolFilters}
            toolFiltersLoading={toolFiltersLoading}
            fallbacks={fallbacks}
            newFallbackValue={newFallbackValue}
            setNewFallbackValue={setNewFallbackValue}
            editingFallback={editingFallback}
            setEditingFallback={setEditingFallback}
            addFallback={addFallback}
            removeFallback={removeFallback}
            onClone={() => cloneMutation.mutate({ id: detailAgent.id, newName: detailAgent.name + '-copy' })}
            onClearHistory={() => clearHistoryMutation.mutate(detailAgent.id)}
            onStop={() => {
              setAgentToDelete(detailAgent);
              setConfirmDialogTitle('Stop Agent');
              setConfirmDialogMessage(`Stop agent "${detailAgent.name}"? The agent will be shut down.`);
              setConfirmDialogOpen(true);
            }}
            openFile={openFile}
            onChangeModel={() => {
              setNewModelValue(`${detailAgent.model_provider || ''}/${detailAgent.model_name || ''}`.replace(/^\//, '').replace(/\/$/, ''));
              setModelChangeOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Model Change Modal */}
      <AnimatePresence>
        {modelChangeOpen && detailAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[var(--void)]/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setModelChangeOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  <NeonText color="cyan">Change Model</NeonText>
                </h3>
                <button
                  onClick={() => setModelChangeOpen(false)}
                  className="p-2 rounded-lg hover:bg-[var(--surface-secondary)]"
                >
                  <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>

              <p className="text-sm text-[var(--text-muted)] mb-4">
                Enter new model in format: <code className="bg-[var(--surface-tertiary)] px-1 rounded">provider/model</code> or just <code className="bg-[var(--surface-tertiary)] px-1 rounded">model</code>
              </p>

              <div className="space-y-3 mb-6">
                <input
                  type="text"
                  value={newModelValue}
                  onChange={(e) => setNewModelValue(e.target.value)}
                  placeholder="e.g. groq/llama-3.3-70b-versatile"
                  className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] font-mono text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newModelValue.trim() && !modelChanging) {
                      handleModelChange();
                    }
                  }}
                />

                {/* Quick select from available models */}
                <div className="max-h-[200px] overflow-y-auto border border-[var(--border-default)] rounded-lg">
                  {models.filter(m => m.available).length === 0 ? (
                    <div className="p-3 text-sm text-[var(--text-muted)]">No available models</div>
                  ) : (
                    models.filter(m => m.available).map((model) => (
                      <button
                        key={model.id}
                        onClick={() => setNewModelValue(`${model.provider}/${model.id}`)}
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-secondary)] transition-colors',
                          newModelValue === `${model.provider}/${model.id}`
                            ? 'bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)]'
                            : 'text-[var(--text-secondary)]'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span>{model.display_name || model.id}</span>
                          <span className="text-xs text-[var(--text-muted)]">{model.provider}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setModelChangeOpen(false)}
                  className="flex-1 py-2 px-4 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModelChange}
                  disabled={!newModelValue.trim() || modelChanging}
                  className={cn(
                    'flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
                    !newModelValue.trim() || modelChanging
                      ? 'bg-[var(--surface-tertiary)] text-[var(--text-muted)] cursor-not-allowed'
                      : 'bg-[var(--neon-cyan)] text-[var(--void)] hover:bg-[var(--neon-cyan)]/90'
                  )}
                >
                  {modelChanging && <Loader2 className="w-4 h-4 animate-spin" />}
                  {modelChanging ? 'Changing...' : 'Change Model'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stop Agent Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmDialogTitle}</DialogTitle>
            <DialogDescription>{confirmDialogMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (agentToDelete) {
                  stopAgentMutation.mutate(agentToDelete.id);
                  if (detailAgent?.id === agentToDelete.id) {
                    setDetailAgent(null);
                  }
                  setAgentToDelete(null);
                }
                setConfirmDialogOpen(false);
              }}
            >
              Stop Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stop All Agents Confirmation Dialog */}
      <Dialog open={stopAllConfirmOpen} onOpenChange={setStopAllConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stop All Agents</DialogTitle>
            <DialogDescription>
              Stop {agents.filter(a => a.status === 'running').length} running agent(s)? All agents will be shut down.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setStopAllConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={doStopAllAgents}
            >
              Stop All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

}

// Create Wizard Modal Component
function CreateWizardModal({
  spawnMode, setSpawnMode,
  spawnStep, setSpawnStep, spawnForm, setSpawnForm,
  spawnIdentity, setSpawnIdentity, selectedPreset, setSelectedPreset,
  soulContent, setSoulContent, spawnToml, setSpawnToml,
  spawning, onClose, onSpawn, providers
}: {
  spawnMode: 'wizard' | 'toml';
  setSpawnMode: (m: 'wizard' | 'toml') => void;
  spawnStep: number;
  setSpawnStep: (s: number) => void;
  spawnForm: { name: string; provider: string; model: string; systemPrompt: string; profile: string; caps: { memory_read: boolean; memory_write: boolean; network: boolean; shell: boolean; agent_spawn: boolean } };
  setSpawnForm: (f: typeof spawnForm) => void;
  spawnIdentity: { emoji: string; color: string; archetype: string };
  setSpawnIdentity: (i: typeof spawnIdentity) => void;
  selectedPreset: string;
  setSelectedPreset: (p: string) => void;
  soulContent: string;
  setSoulContent: (s: string) => void;
  spawnToml: string;
  setSpawnToml: (t: string) => void;
  spawning: boolean;
  onClose: () => void;
  onSpawn: () => void;
  providers: Array<{ id: string; auth_status: string }>;
}) {
  // Check if current provider is configured
  const isCurrentProviderConfigured = useMemo(() => {
    const p = providers.find(pr => pr.id === spawnForm.provider);
    return p ? p.auth_status === 'configured' : false;
  }, [providers, spawnForm.provider]);
  const stepTitles = ['Basic Info', 'Personality', 'Identity', 'Capabilities', 'Confirm'];

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
        className="w-full max-w-2xl bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              <NeonText color="cyan">Create Agent</NeonText>
            </h2>
            {spawnMode === 'wizard' && (
              <p className="text-sm text-[var(--text-muted)]">Step {spawnStep} of 5: {stepTitles[spawnStep - 1]}</p>
            )}
            {spawnMode === 'toml' && (
              <p className="text-sm text-[var(--text-muted)]">Raw TOML Configuration</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--surface-secondary)]">
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg bg-[var(--surface-secondary)]">
          <button
            onClick={() => setSpawnMode('wizard')}
            className={cn(
              'flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all',
              spawnMode === 'wizard'
                ? 'bg-[var(--neon-cyan)] text-[var(--void)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            Wizard
          </button>
          <button
            onClick={() => setSpawnMode('toml')}
            className={cn(
              'flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all',
              spawnMode === 'toml'
                ? 'bg-[var(--neon-cyan)] text-[var(--void)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            Raw TOML
          </button>
        </div>

        {/* Progress Bar - only show in wizard mode */}
        {spawnMode === 'wizard' && (
          <div className="flex gap-1 mb-8">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  step <= spawnStep ? 'bg-[var(--neon-cyan)]' : 'bg-[var(--surface-secondary)]'
                )}
              />
            ))}
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[300px]">
          {/* TOML Mode */}
          {spawnMode === 'toml' && (
            <div className="space-y-4">
              <div className="form-group">
                <label className="block text-sm text-[var(--text-secondary)] mb-2">Agent Manifest (TOML)</label>
                <textarea
                  value={spawnToml}
                  onChange={(e) => setSpawnToml(e.target.value)}
                  rows={12}
                  className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] font-mono text-sm resize-none"
                  placeholder={'name = "my-agent"\nmodule = "builtin:chat"\n[model]\nprovider = "groq"\nmodel = "llama-3.3-70b-versatile"\nsystem_prompt = "You are helpful."'}
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {/* Wizard Mode Steps */}
          {/* Step 1: Name + Identity */}
          {spawnMode === 'wizard' && spawnStep === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">Agent Name *</label>
                <input
                  type="text"
                  value={spawnForm.name}
                  onChange={(e) => setSpawnForm({ ...spawnForm, name: e.target.value })}
                  placeholder="my-agent"
                  className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-3">Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setSpawnIdentity({ ...spawnIdentity, emoji })}
                      className={cn(
                        'w-10 h-10 rounded-lg text-lg transition-all',
                        spawnIdentity.emoji === emoji
                          ? 'bg-[var(--neon-cyan)]/20 ring-2 ring-[var(--neon-cyan)]'
                          : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)]'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={spawnIdentity.color}
                    onChange={(e) => setSpawnIdentity({ ...spawnIdentity, color: e.target.value })}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <span className="text-sm text-[var(--text-muted)] font-mono">{spawnIdentity.color}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">Archetype</label>
                <Select
                  value={spawnIdentity.archetype}
                  onValueChange={(value) => setSpawnIdentity({ ...spawnIdentity, archetype: value })}
                >
                  <SelectTrigger className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] h-auto">
                    <SelectValue placeholder="Choose archetype..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--surface-secondary)] border-[var(--border-default)]">
                    {archetypeOptions.map((a) => (
                      <SelectItem
                        key={a}
                        value={a.toLowerCase()}
                        className="text-[var(--text-primary)] focus:bg-[var(--surface-tertiary)] focus:text-[var(--text-primary)]"
                      >
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Model Selection */}
          {spawnMode === 'wizard' && spawnStep === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">Provider</label>
                <Select
                  value={spawnForm.provider}
                  onValueChange={(value) => setSpawnForm({ ...spawnForm, provider: value })}
                >
                  <SelectTrigger
                    className={cn(
                      "w-full bg-[var(--surface-tertiary)] border rounded-lg px-4 py-3 text-[var(--text-primary)] h-auto",
                      isCurrentProviderConfigured ? "border-[var(--border-default)]" : "border-amber-500/50"
                    )}
                  >
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--surface-secondary)] border-[var(--border-default)]">
                    {providers.map((p) => (
                      <SelectItem
                        key={p.id}
                        value={p.id}
                        className="text-[var(--text-primary)] focus:bg-[var(--surface-tertiary)] focus:text-[var(--text-primary)]"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            p.auth_status === 'configured' ? "bg-green-500" : "bg-amber-500"
                          )} />
                          <span className="capitalize">{p.id}</span>
                          {p.auth_status === 'configured' && (
                            <span className="text-xs text-green-400 ml-1">(configured)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Provider status indicator */}
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    isCurrentProviderConfigured ? "bg-green-500" : "bg-amber-500"
                  )} />
                  <span className={isCurrentProviderConfigured ? "text-green-400" : "text-amber-400"}>
                    {isCurrentProviderConfigured
                      ? `${spawnForm.provider} is configured`
                      : `${spawnForm.provider} is not configured. Go to Settings > Providers to configure.`}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">Model</label>
                <input
                  type="text"
                  value={spawnForm.model}
                  onChange={(e) => setSpawnForm({ ...spawnForm, model: e.target.value })}
                  placeholder="e.g. llama-3.3-70b-versatile"
                  className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">System Prompt</label>
                <textarea
                  value={spawnForm.systemPrompt}
                  onChange={(e) => setSpawnForm({ ...spawnForm, systemPrompt: e.target.value })}
                  placeholder="You are a helpful assistant."
                  rows={4}
                  className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: Personality Presets */}
          {spawnMode === 'wizard' && spawnStep === 3 && (
            <div className="space-y-5">
              <label className="block text-sm text-[var(--text-secondary)] mb-2">Personality</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {personalityPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      setSoulContent(preset.soul);
                    }}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium transition-all border',
                      selectedPreset === preset.id
                        ? 'border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)]'
                        : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--neon-cyan)]/50'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">
                  Soul / Persona <span className="text-xs text-[var(--text-muted)]">(editable)</span>
                </label>
                <textarea
                  value={soulContent}
                  onChange={(e) => setSoulContent(e.target.value)}
                  placeholder="Describe this agent's personality and communication style..."
                  rows={6}
                  className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 4: Tools & Capabilities */}
          {spawnMode === 'wizard' && spawnStep === 4 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-3">Tool Profile</label>
                <Select
                  value={spawnForm.profile}
                  onValueChange={(value) => setSpawnForm({ ...spawnForm, profile: value })}
                >
                  <SelectTrigger className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] h-auto">
                    <SelectValue placeholder="Select profile" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--surface-secondary)] border-[var(--border-default)] max-h-[300px]">
                    <SelectItem value="minimal" className="text-[var(--text-primary)] focus:bg-[var(--surface-tertiary)] focus:text-[var(--text-primary)]">
                      <div className="flex flex-col items-start">
                        <span>Minimal</span>
                        <span className="text-xs text-[var(--text-muted)]">Read-only file access</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="coding" className="text-[var(--text-primary)] focus:bg-[var(--surface-tertiary)] focus:text-[var(--text-primary)]">
                      <div className="flex flex-col items-start">
                        <span>Coding</span>
                        <span className="text-xs text-[var(--text-muted)]">Files + shell + web fetch</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="research" className="text-[var(--text-primary)] focus:bg-[var(--surface-tertiary)] focus:text-[var(--text-primary)]">
                      <div className="flex flex-col items-start">
                        <span>Research</span>
                        <span className="text-xs text-[var(--text-muted)]">Web search + file read/write</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="messaging" className="text-[var(--text-primary)] focus:bg-[var(--surface-tertiary)] focus:text-[var(--text-primary)]">
                      <div className="flex flex-col items-start">
                        <span>Messaging</span>
                        <span className="text-xs text-[var(--text-muted)]">Agents + memory access</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="automation" className="text-[var(--text-primary)] focus:bg-[var(--surface-tertiary)] focus:text-[var(--text-primary)]">
                      <div className="flex flex-col items-start">
                        <span>Automation</span>
                        <span className="text-xs text-[var(--text-muted)]">All tools except custom</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="full" className="text-[var(--text-primary)] focus:bg-[var(--surface-tertiary)] focus:text-[var(--text-primary)]">
                      <div className="flex flex-col items-start">
                        <span>Full</span>
                        <span className="text-xs text-[var(--text-muted)]">All 35+ tools</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="custom" className="text-[var(--text-primary)] focus:bg-[var(--surface-tertiary)] focus:text-[var(--text-primary)]">
                      <div className="flex flex-col items-start">
                        <span>Custom</span>
                        <span className="text-xs text-[var(--text-muted)]">Manual capabilities</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom capabilities checkboxes */}
              {spawnForm.profile === 'custom' && (
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-3">Capabilities</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={spawnForm.caps.memory_read}
                        onChange={(e) => setSpawnForm({
                          ...spawnForm,
                          caps: { ...spawnForm.caps, memory_read: e.target.checked }
                        })}
                        className="w-4 h-4 rounded border-[var(--border-default)]"
                      />
                      <span className="text-sm text-[var(--text-secondary)]">Memory Read</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={spawnForm.caps.memory_write}
                        onChange={(e) => setSpawnForm({
                          ...spawnForm,
                          caps: { ...spawnForm.caps, memory_write: e.target.checked }
                        })}
                        className="w-4 h-4 rounded border-[var(--border-default)]"
                      />
                      <span className="text-sm text-[var(--text-secondary)]">Memory Write</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={spawnForm.caps.network}
                        onChange={(e) => setSpawnForm({
                          ...spawnForm,
                          caps: { ...spawnForm.caps, network: e.target.checked }
                        })}
                        className="w-4 h-4 rounded border-[var(--border-default)]"
                      />
                      <span className="text-sm text-[var(--text-secondary)]">Network</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={spawnForm.caps.shell}
                        onChange={(e) => setSpawnForm({
                          ...spawnForm,
                          caps: { ...spawnForm.caps, shell: e.target.checked }
                        })}
                        className="w-4 h-4 rounded border-[var(--border-default)]"
                      />
                      <span className="text-sm text-[var(--text-secondary)]">Shell</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={spawnForm.caps.agent_spawn}
                        onChange={(e) => setSpawnForm({
                          ...spawnForm,
                          caps: { ...spawnForm.caps, agent_spawn: e.target.checked }
                        })}
                        className="w-4 h-4 rounded border-[var(--border-default)]"
                      />
                      <span className="text-sm text-[var(--text-secondary)]">Agent Spawn</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review & Spawn */}
          {spawnMode === 'wizard' && spawnStep === 5 && (
            <div className="space-y-4">
              <div className="bg-[var(--surface-secondary)] rounded-lg p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                    style={{
                      backgroundColor: spawnIdentity.color + '22',
                      border: `2px solid ${spawnIdentity.color}`
                    }}
                  >
                    {spawnIdentity.emoji || '🤖'}
                  </div>
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">{spawnForm.name || 'Unnamed'}</div>
                    <div className="text-xs text-[var(--text-muted)] capitalize">{spawnIdentity.archetype || 'agent'}</div>
                  </div>
                </div>                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Provider:</span>
                    <span className="text-[var(--text-primary)]">{spawnForm.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Model:</span>
                    <span className="text-[var(--text-primary)]">{spawnForm.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Profile:</span>
                    <span className="text-[var(--text-primary)] capitalize">{spawnForm.profile}</span>
                  </div>
                  {selectedPreset && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Personality:</span>
                      <span className="text-[var(--text-primary)] capitalize">{selectedPreset}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-4 border-t border-[var(--border-subtle)]">
          {spawnMode === 'wizard' ? (
            <>
              <button
                onClick={spawnStep > 1 ? () => setSpawnStep(spawnStep - 1) : onClose}
                className="px-6 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
              >
                {spawnStep > 1 ? 'Back' : 'Cancel'}
              </button>
              {spawnStep < 5 ? (
                <button
                  onClick={() => setSpawnStep(spawnStep + 1)}
                  disabled={spawnStep === 1 && !spawnForm.name.trim()}
                  className="px-6 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] font-medium disabled:opacity-50"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={onSpawn}
                  disabled={spawning}
                  className="px-6 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {spawning && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Agent
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
              >
                Cancel
              </button>
              <button
                onClick={onSpawn}
                disabled={spawning || !spawnToml.trim()}
                className="px-6 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {spawning && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Agent
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Templates Modal Component
function TemplatesModal({
  templates, selectedCategory, setSelectedCategory, onClose, onSpawn, providers
}: {
  templates: Template[];
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  onClose: () => void;
  onSpawn: (t: Template) => void;
  providers: Array<{ id: string; auth_status: string }>;
}) {
  const categories = ['All', ...Array.from(new Set(templates.map(t => t.category).filter(Boolean))).filter((c): c is string => typeof c === 'string')];
  const filtered = selectedCategory === 'All'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  // Check if a provider is configured
  const isProviderConfigured = (providerName: string) => {
    if (!providerName) return false;
    const p = providers.find(pr => pr.id === providerName);
    return p ? p.auth_status === 'configured' : false;
  };

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
        className="w-full max-w-4xl bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            <NeonText color="cyan">Built-in Templates</NeonText>
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--surface-secondary)]">
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                selectedCategory === cat
                  ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]'
                  : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((template) => {
            const providerConfigured = isProviderConfigured(template.provider || 'groq');
            return (
              <div
                key={template.name}
                className={cn(
                  "p-4 rounded-xl border transition-all group",
                  providerConfigured
                    ? "border-[var(--border-default)] hover:border-[var(--neon-cyan)]/50"
                    : "border-[var(--border-default)]/50 opacity-75"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-[var(--text-primary)]">{template.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                    {template.category}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-muted)] mb-3 line-clamp-2">{template.description}</p>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-3">
                  <Cpu className="w-3 h-3" />
                  <span>{template.model}</span>
                  <span className="text-[var(--border-subtle)]">|</span>
                  <Shield className="w-3 h-3" />
                  <span>{profileDescriptions[template.profile || 'full']?.label}</span>
                </div>
                {/* Provider status indicator */}
                <div className="flex items-center gap-2 text-xs mb-3">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    providerConfigured ? "bg-green-500" : "bg-amber-500"
                  )} />
                  <span className={providerConfigured ? "text-green-400" : "text-amber-400"}>
                    {providerConfigured
                      ? `Provider: ${template.provider || 'groq'} (configured)`
                      : `Provider: ${template.provider || 'groq'} (not configured)`}
                  </span>
                </div>
                <button
                  onClick={() => onSpawn(template)}
                  disabled={!providerConfigured}
                  className={cn(
                    "w-full py-2 rounded-lg font-medium text-sm transition-all",
                    providerConfigured
                      ? "bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/20 opacity-0 group-hover:opacity-100"
                      : "bg-[var(--surface-secondary)] text-[var(--text-muted)] cursor-not-allowed"
                  )}
                  title={providerConfigured ? '' : 'Provider not configured. Go to Settings > Providers to configure.'}
                >
                  {providerConfigured ? 'Create from Template' : 'Provider Not Configured'}
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Detail Modal Component
function DetailModal({
  agent, detailTab, setDetailTab, onClose, agentFiles, loadAgentFiles,
  editingFile, setEditingFile, fileContent, setFileContent, fileSaving, saveFile, filesLoading,
  configForm, setConfigForm, configSaving, saveConfig,
  toolFilters, setToolFilters, loadToolFilters, saveToolFilters, toolFiltersLoading,
  fallbacks, newFallbackValue, setNewFallbackValue, editingFallback, setEditingFallback,
  addFallback, removeFallback, onClone, onClearHistory, onStop,
  openFile, onChangeModel
}: {
  agent: Agent;
  detailTab: 'info' | 'files' | 'config';
  setDetailTab: (t: typeof detailTab) => void;
  onClose: () => void;
  agentFiles: AgentFile[];
  loadAgentFiles: () => void;
  editingFile: string | null;
  setEditingFile: (f: string | null) => void;
  fileContent: string;
  setFileContent: (c: string) => void;
  fileSaving: boolean;
  saveFile: () => void;
  filesLoading: boolean;
  configForm: { name: string; system_prompt: string; emoji: string; color: string; archetype: string; vibe: string };
  setConfigForm: (f: typeof configForm) => void;
  configSaving: boolean;
  saveConfig: () => void;
  toolFilters: ToolFilters;
  setToolFilters: (f: ToolFilters) => void;
  loadToolFilters: () => void;
  saveToolFilters: (f: ToolFilters) => void;
  toolFiltersLoading: boolean;
  fallbacks: Array<{ provider: string; model: string }>;
  newFallbackValue: string;
  setNewFallbackValue: (v: string) => void;
  editingFallback: boolean;
  setEditingFallback: (v: boolean) => void;
  addFallback: () => void;
  removeFallback: (idx: number) => void;
  onClone: () => void;
  onClearHistory: () => void;
  onStop: () => void;
  openFile: (filename: string) => void;
  onChangeModel: () => void;
}) {
  const [newAllowTool, setNewAllowTool] = useState('');
  const [newBlockTool, setNewBlockTool] = useState('');

  useEffect(() => {
    if (detailTab === 'files' && agentFiles.length === 0) loadAgentFiles();
    if (detailTab === 'config') loadToolFilters();
  }, [detailTab]);

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
        className="w-full max-w-3xl bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--neon-cyan)]/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-[var(--neon-cyan)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{agent.name}</h2>
              <p className="text-sm text-[var(--text-muted)]">ID: {agent.id.slice(0, 8)}...</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onStop}
              className="p-2 rounded-lg hover:bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)]"
              title="Stop agent"
            >
              <PowerOff className="w-5 h-5" />
            </button>
            <button
              onClick={onClone}
              className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-muted)]"
              title="Clone agent"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={onClearHistory}
              className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-muted)]"
              title="Clear history"
            >
              <History className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--surface-secondary)]">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-subtle)]">
          {[
            { id: 'info', label: 'Info', icon: FileText },
            { id: 'files', label: 'Files', icon: Terminal },
            { id: 'config', label: 'Config', icon: Palette }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setDetailTab(id as typeof detailTab)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                detailTab === id
                  ? 'text-[var(--neon-cyan)] border-b-2 border-[var(--neon-cyan)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Info Tab */}
          {detailTab === 'info' && (
            <div className="space-y-5">
              {/* Detail Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
                  <div className="text-xs text-[var(--text-muted)] mb-1">ID</div>
                  <div className="text-xs font-mono text-[var(--text-secondary)] break-all">{agent.id}</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
                  <div className="text-xs text-[var(--text-muted)] mb-1">State</div>
                  <span className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    (agent.state || agent.status || '').toLowerCase() === 'running' ? 'bg-[var(--neon-green)]/20 text-[var(--neon-green)]' :
                    (agent.state || agent.status || '').toLowerCase() === 'idle' ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]' :
                    (agent.state || agent.status || '').toLowerCase() === 'crashed' ? 'bg-[var(--neon-magenta)]/20 text-[var(--neon-magenta)]' :
                    'bg-[var(--text-muted)]/20 text-[var(--text-muted)]'
                  )}>
                    {(agent.state || agent.status || 'unknown').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Mode</div>
                  <select
                    value={agent.mode || 'full'}
                    onChange={(e) => api.setAgentMode(agent.id, e.target.value).then(() => {
                      toaster.success('Mode updated');
                    }).catch((err) => toaster.error('Failed to update mode: ' + err.message))}
                    className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded px-2 py-1 text-sm text-[var(--text-primary)]"
                  >
                    <option value="observe">Observe</option>
                    <option value="assist">Assist</option>
                    <option value="full">Full</option>
                  </select>
                </div>
                {agent.profile && (
                  <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
                    <div className="text-xs text-[var(--text-muted)] mb-1">Profile</div>
                    <div className="text-sm text-[var(--text-secondary)] capitalize">{agent.profile}</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Provider</div>
                  <div className="text-sm text-[var(--text-secondary)]">{agent.model_provider || agent.model?.provider || '-'}</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Created</div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {agent.created_at ? new Date(agent.created_at).toLocaleString() : '-'}
                  </div>
                </div>
              </div>

              {/* Model with Change button */}
              <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
                <div className="text-xs text-[var(--text-muted)] mb-1">Model</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--text-secondary)]">{agent.model_name || agent.model?.model || 'Unknown'}</span>
                  <button
                    onClick={() => onChangeModel()}
                    className="text-xs px-2 py-1 rounded bg-[var(--surface-tertiary)] text-[var(--text-muted)] hover:text-[var(--neon-cyan)]"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Fallback Chain */}
              <div className="p-3 rounded-lg bg-[var(--surface-secondary)]">
                <div className="text-xs text-[var(--text-muted)] mb-2">Fallbacks</div>
                <div className="space-y-1">
                  {fallbacks.length > 0 ? (
                    fallbacks.map((fb, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-xs font-mono px-2 py-1 rounded bg-[var(--surface-tertiary)] text-[var(--text-secondary)]">
                          {idx + 1}. {fb.provider}/{fb.model}
                        </span>
                        <button
                          onClick={() => removeFallback(idx)}
                          className="text-xs px-1 py-0.5 rounded text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/10"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">None — add a fallback chain</span>
                  )}
                </div>                {!editingFallback ? (
                  <button
                    onClick={() => setEditingFallback(true)}
                    className="mt-2 text-xs px-2 py-1 rounded bg-[var(--surface-tertiary)] text-[var(--text-muted)] hover:text-[var(--neon-cyan)]"
                  >
                    + Add
                  </button>
                ) : (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newFallbackValue}
                      onChange={(e) => setNewFallbackValue(e.target.value)}
                      placeholder="provider/model"
                      className="flex-1 bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded px-2 py-1 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && addFallback()}
                    />
                    <button
                      onClick={addFallback}
                      className="px-2 py-1 rounded bg-[var(--neon-cyan)] text-[var(--void)] text-xs"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setEditingFallback(false); setNewFallbackValue(''); }}
                      className="px-2 py-1 rounded bg-[var(--surface-tertiary)] text-[var(--text-muted)] text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    // Navigate to chat with this agent
                    window.location.href = `/chat?agent=${agent.id}`;
                  }}
                  className="px-4 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] text-sm font-medium"
                >
                  Chat
                </button>
                <button
                  onClick={onClone}
                  className="px-4 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-sm hover:bg-[var(--surface-tertiary)]"
                >
                  Clone
                </button>
                <button
                  onClick={onClearHistory}
                  className="px-4 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-sm hover:bg-[var(--surface-tertiary)]"
                >
                  Clear History
                </button>
                <button
                  onClick={onStop}
                  className="px-4 py-2 rounded-lg bg-[var(--neon-magenta)]/20 text-[var(--neon-magenta)] text-sm hover:bg-[var(--neon-magenta)]/30"
                >
                  Stop
                </button>
              </div>
            </div>
          )}

          {/* Files Tab */}
          {detailTab === 'files' && (
            <div className="space-y-4">
              {editingFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-[var(--text-primary)]">{editingFile}</h4>
                    <button
                      onClick={() => setEditingFile(null)}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    >
                      Close
                    </button>
                  </div>
                  <textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    className="w-full h-64 bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg p-3 text-sm font-mono text-[var(--text-primary)] resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={saveFile}
                      disabled={fileSaving}
                      className="px-4 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] font-medium flex items-center gap-2"
                    >
                      {fileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {filesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[var(--neon-cyan)]" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {agentFiles.map((file) => (
                        <div
                          key={file.name}
                          className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] cursor-pointer"
                          onClick={() => openFile(file.name)}
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-[var(--text-muted)]" />
                            <span className="text-[var(--text-secondary)]">{file.name}</span>
                            {!file.exists && (
                              <span className="text-xs text-[var(--text-muted)]">(new)</span>
                            )}
                          </div>
                          <Pencil className="w-4 h-4 text-[var(--text-muted)]" />
                        </div>
                      ))}
                      {agentFiles.length === 0 && (
                        <p className="text-center text-[var(--text-muted)] py-8">No files</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Config Tab */}
          {detailTab === 'config' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">Name</label>
                <input
                  type="text"
                  value={configForm.name}
                  onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                  className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">System Prompt</label>
                <textarea
                  value={configForm.system_prompt}
                  onChange={(e) => setConfigForm({ ...configForm, system_prompt: e.target.value })}
                  rows={4}
                  className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)] resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-3">Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setConfigForm({ ...configForm, emoji })}
                      className={cn(
                        'w-10 h-10 rounded-lg text-lg transition-all',
                        configForm.emoji === emoji
                          ? 'bg-[var(--neon-cyan)]/20 ring-2 ring-[var(--neon-cyan)]'
                          : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)]'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-2">Archetype</label>
                  <select
                    value={configForm.archetype}
                    onChange={(e) => setConfigForm({ ...configForm, archetype: e.target.value })}
                    className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)]"
                  >
                    <option value="">None</option>
                    {archetypeOptions.map((a) => (
                      <option key={a} value={a.toLowerCase()}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-2">Vibe</label>
                  <select
                    value={configForm.vibe}
                    onChange={(e) => setConfigForm({ ...configForm, vibe: e.target.value })}
                    className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)]"
                  >
                    <option value="">None</option>
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="technical">Technical</option>
                    <option value="creative">Creative</option>
                    <option value="concise">Concise</option>
                    <option value="mentor">Mentor</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={configForm.color}
                    onChange={(e) => setConfigForm({ ...configForm, color: e.target.value })}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <span className="text-sm text-[var(--text-muted)] font-mono">{configForm.color}</span>
                </div>
              </div>
              {/* Tool Filters */}
              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Tool Filters</h4>
                <p className="text-xs text-[var(--text-muted)] mb-4">
                  Allowlist: only these tools available (empty = all). Blocklist: these tools excluded.
                </p>
                {toolFiltersLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--neon-cyan)]" />
                  </div>
                ) : (
                  <>
                    {/* Allowlist */}
                    <div className="mb-4">
                      <label className="text-xs text-[var(--text-secondary)] mb-1 block">
                        Allowlist <span className="text-[var(--text-muted)]">({toolFilters.tool_allowlist.length})</span>
                      </label>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {toolFilters.tool_allowlist.map((tool) => (
                          <span
                            key={tool}
                            className="px-2 py-0.5 rounded text-xs bg-[var(--surface-tertiary)] text-[var(--text-secondary)] flex items-center gap-1 cursor-pointer hover:bg-[var(--neon-magenta)]/10"
                            onClick={() => {
                              const updated = { ...toolFilters, tool_allowlist: toolFilters.tool_allowlist.filter(t => t !== tool) };
                              setToolFilters(updated);
                              saveToolFilters(updated);
                            }}
                            title={`Click to remove ${tool}`}
                          >
                            {tool} ×
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newAllowTool}
                          onChange={(e) => setNewAllowTool(e.target.value)}
                          placeholder="tool name"
                          className="flex-1 bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded px-2 py-1.5 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newAllowTool) {
                              const updated = { ...toolFilters, tool_allowlist: [...toolFilters.tool_allowlist, newAllowTool] };
                              setToolFilters(updated);
                              saveToolFilters(updated);
                              setNewAllowTool('');
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            if (newAllowTool) {
                              const updated = { ...toolFilters, tool_allowlist: [...toolFilters.tool_allowlist, newAllowTool] };
                              setToolFilters(updated);
                              saveToolFilters(updated);
                              setNewAllowTool('');
                            }
                          }}
                          className="px-3 py-1.5 rounded bg-[var(--surface-tertiary)] text-[var(--text-secondary)] text-sm hover:bg-[var(--surface-secondary)]"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Blocklist */}
                    <div>
                      <label className="text-xs text-[var(--text-secondary)] mb-1 block">
                        Blocklist <span className="text-[var(--text-muted)]">({toolFilters.tool_blocklist.length})</span>
                      </label>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {toolFilters.tool_blocklist.map((tool) => (
                          <span
                            key={tool}
                            className="px-2 py-0.5 rounded text-xs bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)] flex items-center gap-1 cursor-pointer hover:bg-[var(--neon-magenta)]/20"
                            onClick={() => {
                              const updated = { ...toolFilters, tool_blocklist: toolFilters.tool_blocklist.filter(t => t !== tool) };
                              setToolFilters(updated);
                              saveToolFilters(updated);
                            }}
                            title={`Click to remove ${tool}`}
                          >
                            {tool} ×
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newBlockTool}
                          onChange={(e) => setNewBlockTool(e.target.value)}
                          placeholder="tool name"
                          className="flex-1 bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded px-2 py-1.5 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newBlockTool) {
                              const updated = { ...toolFilters, tool_blocklist: [...toolFilters.tool_blocklist, newBlockTool] };
                              setToolFilters(updated);
                              saveToolFilters(updated);
                              setNewBlockTool('');
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            if (newBlockTool) {
                              const updated = { ...toolFilters, tool_blocklist: [...toolFilters.tool_blocklist, newBlockTool] };
                              setToolFilters(updated);
                              saveToolFilters(updated);
                              setNewBlockTool('');
                            }
                          }}
                          className="px-3 py-1.5 rounded bg-[var(--surface-tertiary)] text-[var(--text-secondary)] text-sm hover:bg-[var(--surface-secondary)]"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-4">
                <button
                  onClick={saveConfig}
                  disabled={configSaving}
                  className="px-6 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] font-medium flex items-center gap-2"
                >
                  {configSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Config
                </button>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </motion.div>
  );
}

export default Agents;
