import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/api/client';
import {
  Bot, Plus, Loader2, Trash2, Play, Pause, Square,
  Copy, X, ChevronRight, ChevronLeft, Settings, FileText, Wrench, Cpu,
  Search, Save, XCircle, User, Send
} from 'lucide-react';

// Types from API
interface Agent {
  id: string;
  name: string;
  description?: string;
  status: 'idle' | 'running' | 'paused' | 'crashed' | 'stopped';
  state?: string;
  model_provider?: string;
  model_name?: string;
  model?: {
    provider: string;
    model: string;
  };
  identity?: {
    emoji?: string;
    color?: string;
    archetype?: string;
    vibe?: string;
  };
  system_prompt?: string;
  profile?: string;
  capabilities?: {
    memory_read?: boolean | string[];
    memory_write?: boolean | string[];
    network?: boolean | string[];
    shell?: boolean | string[];
    agent_spawn?: boolean;
    tools?: string[];
  };
  fallback_models?: Array<{ provider: string; model: string }>;
  created_at?: string;
}

interface Template {
  name: string;
  description?: string;
  category?: string;
  provider?: string;
  model?: string;
  profile?: string;
  system_prompt?: string;
  manifest_toml?: string;
}

// Note: Profile and Provider types are used via API response typing

// Constants from Alpine agents.js
const EMOJI_OPTIONS = [
  '🤖', '💻', '🔍', '✍️', '📊', '🛠️',
  '💬', '🎓', '🌐', '🔒', '⚡', '🚀',
  '🧪', '🎯', '📖', '👨‍💻', '📧', '🏢',
  '❤️', '🌟', '🔧', '📝', '💡', '🎨'
];

const ARCHETYPE_OPTIONS = ['Assistant', 'Researcher', 'Coder', 'Writer', 'DevOps', 'Support', 'Analyst', 'Custom'];

const PERSONALITY_PRESETS = [
  { id: 'professional', label: 'Professional', soul: 'Communicate in a clear, professional tone. Be direct and structured. Use formal language and data-driven reasoning. Prioritize accuracy over personality.' },
  { id: 'friendly', label: 'Friendly', soul: 'Be warm, approachable, and conversational. Use casual language and show genuine interest in the user. Add personality to your responses while staying helpful.' },
  { id: 'technical', label: 'Technical', soul: 'Focus on technical accuracy and depth. Use precise terminology. Show your work and reasoning. Prefer code examples and structured explanations.' },
  { id: 'creative', label: 'Creative', soul: 'Be imaginative and expressive. Use vivid language, analogies, and unexpected connections. Encourage creative thinking and explore multiple perspectives.' },
  { id: 'concise', label: 'Concise', soul: 'Be extremely brief and to the point. No filler, no pleasantries. Answer in the fewest words possible while remaining accurate and complete.' },
  { id: 'mentor', label: 'Mentor', soul: 'Be patient and encouraging like a great teacher. Break down complex topics step by step. Ask guiding questions. Celebrate progress and build confidence.' }
];

const BUILTIN_TEMPLATES: Template[] = [
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

const PROFILE_DESCRIPTIONS: Record<string, { label: string; desc: string }> = {
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

// Status badge component
function getStatusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case 'running':
      return <Badge className="bg-green-500">Running</Badge>;
    case 'idle':
      return <Badge variant="secondary">Idle</Badge>;
    case 'paused':
      return <Badge variant="outline">Paused</Badge>;
    case 'crashed':
      return <Badge variant="destructive">Crashed</Badge>;
    case 'stopped':
      return <Badge variant="secondary">Stopped</Badge>;
    default:
      return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  }
}

export function Agents() {
  const queryClient = useQueryClient();

  // State: Filter and search
  const [filterState, setFilterState] = useState<'all' | 'running' | 'paused' | 'stopped'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // State: Spawn wizard
  const [showSpawnModal, setShowSpawnModal] = useState(false);
  const [spawnStep, setSpawnStep] = useState(1);
  const [spawnMode, setSpawnMode] = useState<'wizard' | 'toml'>('wizard');
  const [spawning, setSpawning] = useState(false);

  // Form state
  const [spawnForm, setSpawnForm] = useState({
    name: '',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    systemPrompt: 'You are a helpful assistant.',
    profile: 'full',
    caps: { memory_read: true, memory_write: true, network: false, shell: false, agent_spawn: false }
  });

  const [spawnIdentity, setSpawnIdentity] = useState({ emoji: '', color: '#FF5C00', archetype: '' });
  const [selectedPreset, setSelectedPreset] = useState('');
  const [soulContent, setSoulContent] = useState('');
  const [spawnToml, setSpawnToml] = useState('');

  // State: Templates and providers
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [templateSearch, setTemplateSearch] = useState('');

  // State: Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailAgent, setDetailAgent] = useState<Agent | null>(null);
  const [detailTab, setDetailTab] = useState('info');

  // State: Files tab
  const [agentFiles, setAgentFiles] = useState<Array<{ name: string; exists: boolean }>>([]);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [fileSaving, setFileSaving] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);

  // State: Config tab
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [configSaving, setConfigSaving] = useState(false);

  // State: Tools tab
  const [toolFilters, setToolFilters] = useState({ tool_allowlist: [] as string[], tool_blocklist: [] as string[] });
  const [newAllowTool, setNewAllowTool] = useState('');
  const [newBlockTool, setNewBlockTool] = useState('');

  // State: Model tab
  const [editingModel, setEditingModel] = useState(false);
  const [newModelValue, setNewModelValue] = useState('');
  const [modelSaving, setModelSaving] = useState(false);
  const [fallbacks, setFallbacks] = useState<Array<{ provider: string; model: string }>>([]);
  const [editingFallback, setEditingFallback] = useState(false);
  const [newFallbackValue, setNewFallbackValue] = useState('');

  // State: Inline chat
  const [activeChatAgent, setActiveChatAgent] = useState<Agent | null>(null);

  // Data fetching
  const { data: agents = [], isLoading, refetch } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => api.listAgents(),
  });

  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.listTemplates(),
    enabled: showSpawnModal,
  });


  const { data: profilesData } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => api.listProfiles(),
    enabled: showSpawnModal,
  });

  const templates = templatesData?.templates || [];
  // Note: providers data available via providersData
  const profiles = profilesData?.profiles || [];

  // Mutations
  const spawnMutation = useMutation({
    mutationFn: (id: string) => api.spawnAgent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.pauseAgent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });

  // Note: resumeMutation, stopMutation, deleteMutation available via api client directly

  // Computed: Filtered agents
  const filteredAgents = useMemo(() => {
    let result = agents;
    if (filterState !== 'all') {
      result = result.filter(a => (a.state || a.status)?.toLowerCase() === filterState);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [agents, filterState, searchQuery]);

  const runningCount = agents.filter(a => (a.state || a.status) === 'Running').length;
  const stoppedCount = agents.filter(a => (a.state || a.status) !== 'Running').length;

  // Computed: Template categories
  const categories = useMemo(() => {
    const cats = new Set(['All']);
    BUILTIN_TEMPLATES.forEach(t => t.category && cats.add(t.category));
    templates.forEach(t => t.category && cats.add(t.category));
    return Array.from(cats);
  }, [templates]);

  const filteredBuiltins = useMemo(() => {
    return BUILTIN_TEMPLATES.filter(t => {
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
      if (templateSearch) {
        const q = templateSearch.toLowerCase();
        if (!t.name.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [selectedCategory, templateSearch]);

  // Filter custom templates from API
  const filteredCustom = useMemo(() => {
    return templates.filter((t: Template) => {
      if (templateSearch) {
        const q = templateSearch.toLowerCase();
        if (!t.name?.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [templates, templateSearch]);

  // Computed: Selected profile tools
  const selectedProfileTools = useMemo(() => {
    const match = profiles.find(p => p.name === spawnForm.profile);
    return match?.tools?.slice(0, 15) || [];
  }, [profiles, spawnForm.profile]);


  // Actions: Wizard navigation
  const openSpawnWizard = () => {
    setShowSpawnModal(true);
    setSpawnStep(1);
    setSpawnMode('wizard');
    setSpawnIdentity({ emoji: '', color: '#FF5C00', archetype: '' });
    setSelectedPreset('');
    setSoulContent('');
    setSpawnForm({
      name: '',
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      systemPrompt: 'You are a helpful assistant.',
      profile: 'full',
      caps: { memory_read: true, memory_write: true, network: false, shell: false, agent_spawn: false }
    });
  };

  const nextStep = () => {
    if (spawnStep === 1 && !spawnForm.name.trim()) {
      alert('Please enter an agent name');
      return;
    }
    if (spawnStep < 4) setSpawnStep(s => s + 1);
  };

  const prevStep = () => {
    if (spawnStep > 1) setSpawnStep(s => s - 1);
  };

  const selectPreset = (preset: typeof PERSONALITY_PRESETS[0]) => {
    setSelectedPreset(preset.id);
    setSoulContent(preset.soul);
  };

  // Actions: Generate TOML
  const generateToml = () => {
    const lines = [
      `name = "${spawnForm.name}"`,
      'module = "builtin:chat"'
    ];
    if (spawnForm.profile && spawnForm.profile !== 'custom') {
      lines.push(`profile = "${spawnForm.profile}"`);
    }
    lines.push('', '[model]');
    lines.push(`provider = "${spawnForm.provider}"`);
    lines.push(`model = "${spawnForm.model}"`);
    lines.push(`system_prompt = "${spawnForm.systemPrompt.replace(/"/g, '\\"')}"`);
    if (spawnForm.profile === 'custom') {
      lines.push('', '[capabilities]');
      if (spawnForm.caps.memory_read) lines.push('memory_read = ["*"]');
      if (spawnForm.caps.memory_write) lines.push('memory_write = ["self.*"]');
      if (spawnForm.caps.network) lines.push('network = ["*"]');
      if (spawnForm.caps.shell) lines.push('shell = ["*"]');
      if (spawnForm.caps.agent_spawn) lines.push('agent_spawn = true');
    }
    return lines.join('\n');
  };

  // Actions: Spawn agent
  const spawnAgent = async () => {
    setSpawning(true);
    const toml = spawnMode === 'wizard' ? generateToml() : spawnToml;
    if (!toml.trim()) {
      setSpawning(false);
      alert('Manifest is empty — enter agent config first');
      return;
    }

    try {
      const res = await api.createAgentFromTOML(toml);
      if (res.agent_id) {
        // Post-spawn: update identity + write SOUL.md if personality preset selected
        const patchBody: Record<string, unknown> = {};
        if (spawnIdentity.emoji) patchBody.emoji = spawnIdentity.emoji;
        if (spawnIdentity.color) patchBody.color = spawnIdentity.color;
        if (spawnIdentity.archetype) patchBody.archetype = spawnIdentity.archetype;
        if (selectedPreset) patchBody.vibe = selectedPreset;

        if (Object.keys(patchBody).length) {
          api.updateAgentConfig(res.agent_id, patchBody).catch(() => {});
        }
        if (soulContent.trim()) {
          api.saveAgentFile(res.agent_id, 'SOUL.md', `# Soul\n${soulContent}`).catch(() => {});
        }

        setShowSpawnModal(false);
        setSpawnStep(1);
        setSpawnToml('');
        await refetch();
      }
    } catch (e: unknown) {
      alert('Failed to spawn agent: ' + (e as Error).message);
    }
    setSpawning(false);
  };

  // Actions: Spawn from template
  const spawnFromTemplate = async (t: Template) => {
    const toml = `name = "${t.name}"
description = "${t.description?.replace(/"/g, '\\"') || ''}"
module = "builtin:chat"
profile = "${t.profile || 'full'}"

[model]
provider = "${t.provider || 'groq'}"
model = "${t.model || 'llama-3.3-70b-versatile'}"
system_prompt = """
${t.system_prompt || ''}
"""
`;
    try {
      const res = await api.createAgentFromTOML(toml);
      if (res.agent_id) {
        await refetch();
        setShowSpawnModal(false);
      }
    } catch (e: unknown) {
      alert('Failed to spawn from template: ' + (e as Error).message);
    }
  };

  // Actions: Show detail
  const showDetail = async (agent: Agent) => {
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
    setShowDetailModal(true);

    // Load fallback models
    try {
      const full = await api.getAgent(agent.id);
      setFallbacks(full.fallback_models || []);
    } catch {}
  };

  // Actions: Files tab
  const loadAgentFiles = async () => {
    if (!detailAgent) return;
    setFilesLoading(true);
    try {
      const data = await api.listAgentFiles(detailAgent.id);
      setAgentFiles(data.files || []);
    } catch (e: unknown) {
      setAgentFiles([]);
    }
    setFilesLoading(false);
  };

  const openFile = async (file: { name: string; exists: boolean }) => {
    if (!detailAgent) return;
    if (!file.exists) {
      setEditingFile(file.name);
      setFileContent('');
      return;
    }
    try {
      const data = await api.getAgentFile(detailAgent.id, file.name);
      setEditingFile(file.name);
      setFileContent(data.content || '');
    } catch (e: unknown) {
      alert('Failed to read file: ' + (e as Error).message);
    }
  };

  const saveFile = async () => {
    if (!editingFile || !detailAgent) return;
    setFileSaving(true);
    try {
      await api.saveAgentFile(detailAgent.id, editingFile, fileContent);
      await loadAgentFiles();
      setEditingFile(null);
      setFileContent('');
    } catch (e: unknown) {
      alert('Failed to save file: ' + (e as Error).message);
    }
    setFileSaving(false);
  };

  // Actions: Config tab
  const saveConfig = async () => {
    if (!detailAgent) return;
    setConfigSaving(true);
    try {
      await api.updateAgentConfig(detailAgent.id, configForm);
      await refetch();
    } catch (e: unknown) {
      alert('Failed to save config: ' + (e as Error).message);
    }
    setConfigSaving(false);
  };

  // Actions: Tools tab
  const loadToolFilters = async () => {
    if (!detailAgent) return;
    try {
      const data = await api.getAgentTools(detailAgent.id);
      setToolFilters(data);
    } catch {
      setToolFilters({ tool_allowlist: [], tool_blocklist: [] });
    }
  };

  const addAllowTool = () => {
    const t = newAllowTool.trim();
    if (t && !toolFilters.tool_allowlist.includes(t)) {
      const updated = { ...toolFilters, tool_allowlist: [...toolFilters.tool_allowlist, t] };
      setToolFilters(updated);
      setNewAllowTool('');
      saveToolFilters(updated);
    }
  };

  const removeAllowTool = (tool: string) => {
    const updated = { ...toolFilters, tool_allowlist: toolFilters.tool_allowlist.filter(t => t !== tool) };
    setToolFilters(updated);
    saveToolFilters(updated);
  };

  const addBlockTool = () => {
    const t = newBlockTool.trim();
    if (t && !toolFilters.tool_blocklist.includes(t)) {
      const updated = { ...toolFilters, tool_blocklist: [...toolFilters.tool_blocklist, t] };
      setToolFilters(updated);
      setNewBlockTool('');
      saveToolFilters(updated);
    }
  };

  const removeBlockTool = (tool: string) => {
    const updated = { ...toolFilters, tool_blocklist: toolFilters.tool_blocklist.filter(t => t !== tool) };
    setToolFilters(updated);
    saveToolFilters(updated);
  };

  const saveToolFilters = async (filters = toolFilters) => {
    if (!detailAgent) return;
    try {
      await api.updateAgentTools(detailAgent.id, filters);
    } catch (e: unknown) {
      alert('Failed to update tool filters: ' + (e as Error).message);
    }
  };

  // Actions: Model tab
  const changeModel = async () => {
    if (!detailAgent || !newModelValue.trim()) return;
    setModelSaving(true);
    try {
      await api.changeAgentModel(detailAgent.id, newModelValue.trim());
      setEditingModel(false);
      await refetch();
    } catch (e: unknown) {
      alert('Failed to change model: ' + (e as Error).message);
    }
    setModelSaving(false);
  };

  const addFallback = async () => {
    if (!detailAgent || !newFallbackValue.trim()) return;
    const parts = newFallbackValue.trim().split('/');
    const provider = parts.length > 1 ? parts[0] : (detailAgent.model_provider || 'groq');
    const model = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
    const newFallbacks = [...fallbacks, { provider, model }];
    setFallbacks(newFallbacks);
    try {
      await api.updateAgentConfig(detailAgent.id, { fallback_models: newFallbacks });
      setEditingFallback(false);
      setNewFallbackValue('');
    } catch (e: unknown) {
      setFallbacks(fallbacks);
      alert('Failed to add fallback: ' + (e as Error).message);
    }
  };

  const removeFallback = async (idx: number) => {
    if (!detailAgent) return;
    const newFallbacks = fallbacks.filter((_, i) => i !== idx);
    setFallbacks(newFallbacks);
    try {
      await api.updateAgentConfig(detailAgent.id, { fallback_models: newFallbacks });
    } catch (e: unknown) {
      setFallbacks(fallbacks);
      alert('Failed to remove fallback: ' + (e as Error).message);
    }
  };

  // Actions: Agent operations
  const cloneAgent = async (agent: Agent) => {
    const newName = (agent.name || 'agent') + '-copy';
    try {
      await api.cloneAgent(agent.id, newName);
      await refetch();
      setShowDetailModal(false);
    } catch (e: unknown) {
      alert('Clone failed: ' + (e as Error).message);
    }
  };

  const clearHistory = async (agent: Agent) => {
    if (!confirm(`Clear all conversation history for "${agent.name}"? This cannot be undone.`)) return;
    try {
      await api.clearAgentHistory(agent.id);
    } catch (e: unknown) {
      alert('Failed to clear history: ' + (e as Error).message);
    }
  };

  const killAgent = async (agent: Agent) => {
    if (!confirm(`Stop agent "${agent.name}"? The agent will be shut down.`)) return;
    try {
      await api.stopAgent(agent.id);
      await refetch();
      setShowDetailModal(false);
    } catch (e: unknown) {
      alert('Failed to stop agent: ' + (e as Error).message);
    }
  };

  const killAllAgents = async () => {
    if (!filteredAgents.length) return;
    if (!confirm(`Stop ${filteredAgents.length} agent(s)? All agents will be shut down.`)) return;
    for (const agent of filteredAgents) {
      try {
        await api.stopAgent(agent.id);
      } catch {}
    }
    await refetch();
  };

  // Chat with agent inline
  const chatWithAgent = (agent: Agent) => {
    setActiveChatAgent(agent);
  };

  const closeChat = () => {
    setActiveChatAgent(null);
  };

  // Effects
  useEffect(() => {
    if (detailTab === 'files' && detailAgent) {
      loadAgentFiles();
    }
  }, [detailTab, detailAgent]);

  useEffect(() => {
    if (detailTab === 'tools' && detailAgent) {
      loadToolFilters();
    }
  }, [detailTab, detailAgent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground">Manage your OpenFang agents</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={killAllAgents} disabled={!filteredAgents.length}>
            <Square className="w-4 h-4 mr-2" /> Stop All
          </Button>
          <Button onClick={openSpawnWizard}>
            <Plus className="w-4 h-4 mr-2" /> New Agent
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          <Button
            variant={filterState === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterState('all')}
          >
            All ({agents.length})
          </Button>
          <Button
            variant={filterState === 'running' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterState('running')}
          >
            Running ({runningCount})
          </Button>
          <Button
            variant={filterState === 'paused' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterState('paused')}
          >
            Paused
          </Button>
          <Button
            variant={filterState === 'stopped' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterState('stopped')}
          >
            Stopped ({stoppedCount})
          </Button>
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAgents.map((agent) => (
          <Card
            key={agent.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => showDetail(agent)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{agent.identity?.emoji || '🤖'}</span>
                  <CardTitle className="text-base">{agent.name}</CardTitle>
                </div>
                {getStatusBadge(agent.state || agent.status)}
              </div>
              <CardDescription className="line-clamp-2">
                {agent.identity?.archetype || agent.description || 'No description'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">
                {agent.model_provider || agent.model?.provider} / {agent.model_name || agent.model?.model}
              </div>
              <div className="flex gap-2 pt-2 flex-wrap">
                {(agent.state || agent.status)?.toLowerCase() === 'running' ? (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={(e) => { e.stopPropagation(); chatWithAgent(agent); }}
                    >
                      <Bot className="w-3 h-3 mr-1" /> Chat
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); pauseMutation.mutate(agent.id); }}
                    >
                      <Pause className="w-3 h-3 mr-1" /> Pause
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); killAgent(agent); }}
                    >
                      <Square className="w-3 h-3 mr-1" /> Stop
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); spawnMutation.mutate(agent.id); }}
                  >
                    <Play className="w-3 h-3 mr-1" /> Start
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAgents.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? 'No agents match your search' : 'No agents yet. Create one to get started!'}
          </p>
        </div>
      )}

      {/* Spawn Wizard Modal */}
      <Dialog open={showSpawnModal} onOpenChange={setShowSpawnModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>
              {spawnMode === 'wizard' ? `Step ${spawnStep} of 4` : 'Advanced: TOML Configuration'}
            </DialogDescription>
          </DialogHeader>

          {spawnMode === 'wizard' ? (
            <>
              {/* Step 1: Identity */}
              {spawnStep === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Agent Name *</label>
                    <Input
                      placeholder="My Assistant"
                      value={spawnForm.name}
                      onChange={(e) => setSpawnForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Emoji</label>
                    <div className="flex flex-wrap gap-2">
                      {EMOJI_OPTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => setSpawnIdentity(i => ({ ...i, emoji }))}
                          className={`text-2xl p-2 rounded hover:bg-muted transition-colors ${spawnIdentity.emoji === emoji ? 'bg-primary/20 ring-2 ring-primary' : ''}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={spawnIdentity.color}
                        onChange={(e) => setSpawnIdentity(i => ({ ...i, color: e.target.value }))}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">{spawnIdentity.color}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Archetype</label>
                    <div className="flex flex-wrap gap-2">
                      {ARCHETYPE_OPTIONS.map(arch => (
                        <button
                          key={arch}
                          onClick={() => setSpawnIdentity(i => ({ ...i, archetype: arch }))}
                          className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                            spawnIdentity.archetype === arch
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'hover:bg-muted'
                          }`}
                        >
                          {arch}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Personality */}
              {spawnStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Personality Preset</label>
                    <div className="grid grid-cols-2 gap-3">
                      {PERSONALITY_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => selectPreset(preset)}
                          className={`p-3 text-left rounded-lg border transition-all ${
                            selectedPreset === preset.id
                              ? 'bg-primary/10 border-primary ring-2 ring-primary'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <div className="font-medium">{preset.label}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{preset.soul}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Custom Soul (optional)</label>
                    <Textarea
                      placeholder="Enter custom personality instructions..."
                      value={soulContent}
                      onChange={(e) => setSoulContent(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Capabilities */}
              {spawnStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Profile</label>
                    <select
                      value={spawnForm.profile}
                      onChange={(e) => setSpawnForm(f => ({ ...f, profile: e.target.value }))}
                      className="w-full rounded-md border px-3 py-2"
                    >
                      {Object.entries(PROFILE_DESCRIPTIONS).map(([key, info]) => (
                        <option key={key} value={key}>{info.label} — {info.desc}</option>
                      ))}
                    </select>
                  </div>

                  {spawnForm.profile === 'custom' && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Custom Capabilities</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={spawnForm.caps.memory_read}
                          onChange={(e) => setSpawnForm(f => ({ ...f, caps: { ...f.caps, memory_read: e.target.checked } }))}
                        />
                        <span>Memory Read</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={spawnForm.caps.memory_write}
                          onChange={(e) => setSpawnForm(f => ({ ...f, caps: { ...f.caps, memory_write: e.target.checked } }))}
                        />
                        <span>Memory Write</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={spawnForm.caps.network}
                          onChange={(e) => setSpawnForm(f => ({ ...f, caps: { ...f.caps, network: e.target.checked } }))}
                        />
                        <span>Network</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={spawnForm.caps.shell}
                          onChange={(e) => setSpawnForm(f => ({ ...f, caps: { ...f.caps, shell: e.target.checked } }))}
                        />
                        <span>Shell</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={spawnForm.caps.agent_spawn}
                          onChange={(e) => setSpawnForm(f => ({ ...f, caps: { ...f.caps, agent_spawn: e.target.checked } }))}
                        />
                        <span>Agent Spawn</span>
                      </div>
                    </div>
                  )}

                  {selectedProfileTools.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Available Tools (Preview)</label>
                      <div className="flex flex-wrap gap-1">
                        {selectedProfileTools.map(tool => (
                          <Badge key={tool} variant="outline" className="text-xs">{tool}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Model & Templates */}
              {spawnStep === 4 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Provider</label>
                      <select
                        value={spawnForm.provider}
                        onChange={(e) => setSpawnForm(f => ({ ...f, provider: e.target.value }))}
                        className="w-full rounded-md border px-3 py-2"
                      >
                        <option value="groq">Groq</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="openai">OpenAI</option>
                        <option value="ollama">Ollama</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Model</label>
                      <Input
                        value={spawnForm.model}
                        onChange={(e) => setSpawnForm(f => ({ ...f, model: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">System Prompt</label>
                    <Textarea
                      value={spawnForm.systemPrompt}
                      onChange={(e) => setSpawnForm(f => ({ ...f, systemPrompt: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  {/* Templates */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Or choose a Template</label>
                      <div className="flex gap-2">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="text-sm rounded border px-2 py-1"
                        >
                          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <Input
                          placeholder="Search..."
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          className="w-32 h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {filteredBuiltins.map(t => (
                        <button
                          key={t.name}
                          onClick={() => spawnFromTemplate(t)}
                          className="p-3 text-left rounded-lg border hover:bg-muted transition-colors"
                        >
                          <div className="font-medium text-sm">{t.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{t.description}</div>
                          <Badge variant="outline" className="mt-1 text-xs">{t.category}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Templates */}
                  {filteredCustom.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Custom Templates</div>
                      <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                        {filteredCustom.map(t => (
                          <button
                            key={t.name}
                            onClick={() => spawnFromTemplate(t)}
                            className="p-3 text-left rounded-lg border border-dashed hover:bg-muted transition-colors"
                          >
                            <div className="font-medium text-sm">{t.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2">{t.description}</div>
                            {t.category && <Badge variant="outline" className="mt-1 text-xs">{t.category}</Badge>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setSpawnMode('toml')}>
                  Advanced (TOML)
                </Button>
                <div className="flex gap-2">
                  {spawnStep > 1 && (
                    <Button variant="outline" onClick={prevStep}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                  )}
                  {spawnStep < 4 ? (
                    <Button onClick={nextStep}>
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button onClick={spawnAgent} disabled={spawning}>
                      {spawning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Agent
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* TOML Mode */
            <div className="space-y-4">
              <Textarea
                placeholder="Enter TOML manifest..."
                value={spawnToml}
                onChange={(e) => setSpawnToml(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setSpawnMode('wizard')}>
                  Back to Wizard
                </Button>
                <Button onClick={spawnAgent} disabled={spawning}>
                  {spawning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Agent
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailAgent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{detailAgent.identity?.emoji || '🤖'}</span>
                  <div>
                    <DialogTitle>{detailAgent.name}</DialogTitle>
                    <DialogDescription>
                      {detailAgent.identity?.archetype} • {getStatusBadge(detailAgent.state || detailAgent.status)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="info"><User className="w-4 h-4 mr-1" /> Info</TabsTrigger>
                  <TabsTrigger value="files"><FileText className="w-4 h-4 mr-1" /> Files</TabsTrigger>
                  <TabsTrigger value="config"><Settings className="w-4 h-4 mr-1" /> Config</TabsTrigger>
                  <TabsTrigger value="tools"><Wrench className="w-4 h-4 mr-1" /> Tools</TabsTrigger>
                  <TabsTrigger value="model"><Cpu className="w-4 h-4 mr-1" /> Model</TabsTrigger>
                </TabsList>

                {/* Info Tab */}
                <TabsContent value="info" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">ID</label>
                      <p className="text-sm text-muted-foreground font-mono">{detailAgent.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Profile</label>
                      <p className="text-sm text-muted-foreground">{detailAgent.profile || 'full'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Provider</label>
                      <p className="text-sm text-muted-foreground">{detailAgent.model_provider || detailAgent.model?.provider}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Model</label>
                      <p className="text-sm text-muted-foreground">{detailAgent.model_name || detailAgent.model?.model}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Color</label>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: detailAgent.identity?.color || '#FF5C00' }}
                        />
                        <span className="text-sm text-muted-foreground">{detailAgent.identity?.color}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Vibe</label>
                      <p className="text-sm text-muted-foreground">{detailAgent.identity?.vibe || 'Default'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4">
                    <Button variant="outline" onClick={() => cloneAgent(detailAgent)}>
                      <Copy className="w-4 h-4 mr-1" /> Clone
                    </Button>
                    <Button variant="outline" onClick={() => clearHistory(detailAgent)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Clear History
                    </Button>
                    <Button variant="destructive" onClick={() => killAgent(detailAgent)}>
                      <Square className="w-4 h-4 mr-1" /> Stop Agent
                    </Button>
                  </div>
                </TabsContent>

                {/* Files Tab */}
                <TabsContent value="files" className="space-y-4">
                  {editingFile ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{editingFile}</h4>
                        <Button variant="ghost" size="sm" onClick={() => setEditingFile(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={fileContent}
                        onChange={(e) => setFileContent(e.target.value)}
                        rows={12}
                        className="font-mono text-sm"
                      />
                      <Button onClick={saveFile} disabled={fileSaving}>
                        {fileSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <Save className="w-4 h-4 mr-1" /> Save
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filesLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          {agentFiles.map(file => (
                            <button
                              key={file.name}
                              onClick={() => openFile(file)}
                              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted text-left"
                            >
                              <span className="font-mono text-sm">{file.name}</span>
                              <Badge variant={file.exists ? 'default' : 'outline'}>
                                {file.exists ? 'Exists' : 'New'}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* Config Tab */}
                <TabsContent value="config" className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={configForm.name || ''}
                        onChange={(e) => setConfigForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">System Prompt</label>
                      <Textarea
                        value={configForm.system_prompt || ''}
                        onChange={(e) => setConfigForm(f => ({ ...f, system_prompt: e.target.value }))}
                        rows={4}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Emoji</label>
                      <Input
                        value={configForm.emoji || ''}
                        onChange={(e) => setConfigForm(f => ({ ...f, emoji: e.target.value }))}
                        placeholder="🤖"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={configForm.color || '#FF5C00'}
                          onChange={(e) => setConfigForm(f => ({ ...f, color: e.target.value }))}
                          className="w-10 h-10 rounded"
                        />
                        <Input
                          value={configForm.color || ''}
                          onChange={(e) => setConfigForm(f => ({ ...f, color: e.target.value }))}
                          className="w-32"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Archetype</label>
                      <select
                        value={configForm.archetype || ''}
                        onChange={(e) => setConfigForm(f => ({ ...f, archetype: e.target.value }))}
                        className="w-full rounded-md border px-3 py-2"
                      >
                        <option value="">None</option>
                        {ARCHETYPE_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <Button onClick={saveConfig} disabled={configSaving}>
                      {configSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Config
                    </Button>
                  </div>
                </TabsContent>

                {/* Tools Tab */}
                <TabsContent value="tools" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Allowlist (only these tools)</label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="Add tool..."
                          value={newAllowTool}
                          onChange={(e) => setNewAllowTool(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addAllowTool()}
                        />
                        <Button onClick={addAllowTool}>Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {toolFilters.tool_allowlist.map(tool => (
                          <Badge key={tool} variant="secondary" className="cursor-pointer" onClick={() => removeAllowTool(tool)}>
                            {tool} <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Blocklist (never these tools)</label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="Add tool..."
                          value={newBlockTool}
                          onChange={(e) => setNewBlockTool(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addBlockTool()}
                        />
                        <Button onClick={addBlockTool}>Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {toolFilters.tool_blocklist.map(tool => (
                          <Badge key={tool} variant="destructive" className="cursor-pointer" onClick={() => removeBlockTool(tool)}>
                            {tool} <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Model Tab */}
                <TabsContent value="model" className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Current Model</label>
                      <p className="text-sm text-muted-foreground">
                        {detailAgent.model_provider || detailAgent.model?.provider} / {detailAgent.model_name || detailAgent.model?.model}
                      </p>
                    </div>

                    {editingModel ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="provider/model"
                          value={newModelValue}
                          onChange={(e) => setNewModelValue(e.target.value)}
                        />
                        <Button onClick={changeModel} disabled={modelSaving}>
                          {modelSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change'}
                        </Button>
                        <Button variant="outline" onClick={() => setEditingModel(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button variant="outline" onClick={() => setEditingModel(true)}>
                        Change Model
                      </Button>
                    )}

                    <div className="pt-4">
                      <label className="text-sm font-medium">Fallback Chain</label>
                      <p className="text-xs text-muted-foreground mb-2">Used when primary model fails</p>
                      <div className="space-y-2">
                        {fallbacks.map((fb, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted">
                            <span className="text-sm">{fb.provider}/{fb.model}</span>
                            <Button variant="ghost" size="sm" onClick={() => removeFallback(idx)}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      {editingFallback ? (
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="provider/model"
                            value={newFallbackValue}
                            onChange={(e) => setNewFallbackValue(e.target.value)}
                          />
                          <Button onClick={addFallback}>Add</Button>
                          <Button variant="outline" onClick={() => setEditingFallback(false)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button variant="outline" className="mt-2" onClick={() => setEditingFallback(true)}>
                          <Plus className="w-4 h-4 mr-1" /> Add Fallback
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Inline Chat Panel */}
      {activeChatAgent && (
        <AgentChatPanel agent={activeChatAgent} onClose={closeChat} />
      )}
    </div>
  );
}

// Agent Chat Panel Component
interface AgentChatPanelProps {
  agent: Agent;
  onClose: () => void;
}

function AgentChatPanel({ agent, onClose }: AgentChatPanelProps) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const content = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content }]);
    setSending(true);
    try {
      const response = await api.sendMessage(agent.id, content);
      setMessages(prev => [...prev, { role: 'assistant', content: response.content ?? '' }]);
    } catch (e: unknown) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + (e as Error).message }]);
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-background border-t shadow-lg">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">{agent.identity?.emoji || '🤖'}</span>
            <span className="font-medium">{agent.name}</span>
            <Badge variant="default" className="text-xs">Running</Badge>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="h-80 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Start a conversation with {agent.name}</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex gap-2">
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={!input.trim() || sending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Agents;
