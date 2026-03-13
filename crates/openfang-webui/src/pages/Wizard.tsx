// Wizard - Onboarding Flow Style
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { cyberColors } from '@/lib/animations';
import { useToast } from '@/hooks/useToast';
import {
  ChevronLeft, ChevronRight, Check, Loader2, AlertCircle,
  Sparkles, Bot, Key, MessageSquare, Zap, Target, Crown,
  Wand2, Cpu, Brain, Code, Palette, Shield, Rocket,
  Radio, Send, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface Provider {
  id: string;
  display_name: string;
  auth_status: string;
  api_key_env?: string;
  model_count?: number;
}

interface TestResult {
  status: 'ok' | 'error';
  latency_ms?: number;
  error?: string;
}

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof Bot;
  color: string;
  category: string;
  provider: string;
  model: string;
  profile: string;
  system_prompt: string;
}

const TOTAL_STEPS = 6;

const TEMPLATES: AgentTemplate[] = [
  {
    id: 'assistant',
    name: 'General Assistant',
    description: 'A versatile helper for everyday tasks and questions.',
    icon: Bot,
    color: 'var(--neon-cyan)',
    category: 'General',
    provider: 'groq',
    model: 'llama-3.1-70b-versatile',
    profile: 'Helpful Assistant',
    system_prompt: 'You are a helpful, friendly assistant. Answer questions clearly and concisely.'
  },
  {
    id: 'coder',
    name: 'Code Expert',
    description: 'Specialized in programming and technical tasks.',
    icon: Code,
    color: 'var(--neon-green)',
    category: 'Development',
    provider: 'groq',
    model: 'deepseek-r1-distill-llama-70b',
    profile: 'Senior Developer',
    system_prompt: 'You are an expert programmer. Write clean, well-documented code and explain your solutions.'
  },
  {
    id: 'creative',
    name: 'Creative Writer',
    description: 'Expert in creative writing and storytelling.',
    icon: Palette,
    color: 'var(--neon-amber)',
    category: 'Writing',
    provider: 'groq',
    model: 'llama-3.1-70b-versatile',
    profile: 'Creative Writer',
    system_prompt: 'You are a creative writing assistant. Help with stories, poems, and creative content.'
  },
  {
    id: 'analyst',
    name: 'Data Analyst',
    description: 'Analyzes data and provides insights.',
    icon: Brain,
    color: 'var(--neon-magenta)',
    category: 'Business',
    provider: 'groq',
    model: 'deepseek-r1-distill-llama-70b',
    profile: 'Data Analyst',
    system_prompt: 'You are a data analysis expert. Help interpret data and provide actionable insights.'
  },
  {
    id: 'security',
    name: 'Security Expert',
    description: 'Focuses on cybersecurity and best practices.',
    icon: Shield,
    color: 'var(--chart-purple)',
    category: 'Technical',
    provider: 'groq',
    model: 'llama-3.1-70b-versatile',
    profile: 'Security Consultant',
    system_prompt: 'You are a cybersecurity expert. Provide security advice and best practices.'
  },
  {
    id: 'researcher',
    name: 'Researcher',
    description: 'Deep research and information synthesis expert.',
    icon: Target,
    color: 'var(--neon-cyan)',
    category: 'Research',
    provider: 'groq',
    model: 'llama-3.1-70b-versatile',
    profile: 'Researcher',
    system_prompt: 'You are a research expert. Help gather, analyze, and synthesize information from various sources. Provide well-cited, thorough responses.'
  },
  {
    id: 'writer',
    name: 'Writer',
    description: 'Professional writing and editing assistant.',
    icon: Sparkles,
    color: 'var(--neon-amber)',
    category: 'Writing',
    provider: 'groq',
    model: 'llama-3.1-70b-versatile',
    profile: 'Professional Writer',
    system_prompt: 'You are a professional writer. Help with articles, blog posts, marketing copy, and any writing needs. Focus on clarity and engagement.'
  },
  {
    id: 'devops',
    name: 'DevOps Engineer',
    description: 'Infrastructure and deployment automation expert.',
    icon: Cpu,
    color: 'var(--neon-green)',
    category: 'Development',
    provider: 'groq',
    model: 'deepseek-r1-distill-llama-70b',
    profile: 'DevOps Engineer',
    system_prompt: 'You are a DevOps expert. Help with CI/CD, Docker, Kubernetes, cloud infrastructure, and automation. Provide practical, production-ready solutions.'
  },
  {
    id: 'support',
    name: 'Customer Support',
    description: 'Friendly and patient customer service agent.',
    icon: MessageSquare,
    color: 'var(--chart-teal)',
    category: 'Business',
    provider: 'groq',
    model: 'llama-3.1-70b-versatile',
    profile: 'Customer Support',
    system_prompt: 'You are a customer support specialist. Be empathetic, patient, and solution-oriented. Always strive to understand and resolve customer issues.'
  },
  {
    id: 'tutor',
    name: 'Tutor',
    description: 'Patient educational assistant for learning any topic.',
    icon: Crown,
    color: 'var(--chart-orange)',
    category: 'Education',
    provider: 'groq',
    model: 'llama-3.1-70b-versatile',
    profile: 'Educational Tutor',
    system_prompt: 'You are a patient tutor. Explain concepts clearly, encourage questions, and adapt to the student\'s level. Make learning engaging and effective.'
  }
];

const STEP_ICONS = [Key, Bot, Target, MessageSquare, Radio, Rocket];
const STEP_TITLES = ['API Key', 'Template', 'Configure', 'Try It', 'Channel', 'Launch'];

export function Wizard() {
  const { success, error: showError } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Form state
  const [apiKey, setApiKey] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null);
  const [agentName, setAgentName] = useState('');
  const [agentProfile, setAgentProfile] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('groq');
  const [selectedModel, setSelectedModel] = useState('');
  const [enableMemory, setEnableMemory] = useState(true);
  const [enablePlanning, setEnablePlanning] = useState(false);
  const [enableTools, setEnableTools] = useState(true);

  // Try It step state
  const [tryItMessages, setTryItMessages] = useState<Array<{role: 'user' | 'assistant'; content: string}>>([]);
  const [tryItInput, setTryItInput] = useState('');
  const [tryItSending, setTryItSending] = useState(false);
  const [tryItSessionId, setTryItSessionId] = useState('');

  // Channel step state
  const [channels, setChannels] = useState<Array<{name: string; display_name: string; icon: string; configured: boolean}>>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [channelConfig, setChannelConfig] = useState<Record<string, string>>({});
  const [channelFields, setChannelFields] = useState<Array<{key: string; label: string; type: string; required: boolean; value?: string}>>([]);
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelTestResult, setChannelTestResult] = useState<{success: boolean; message?: string} | null>(null);
  const [skipChannel, setSkipChannel] = useState(false);

  // Load providers
  useEffect(() => {
    api.get<{ providers: Provider[] }>('/api/providers').then((res) => {
      setProviders(res.providers || []);
    }).catch(() => {});
  }, []);

  // Load channels for step 5
  useEffect(() => {
    if (step === 5) {
      api.get<{ channels: typeof channels }>('/api/channels').then((res) => {
        const availableChannels = (res.channels || []).filter((c: typeof channels[0]) => !c.configured);
        setChannels(availableChannels);
      }).catch(() => {});
    }
  }, [step]);

  // Load channel fields when channel selected
  useEffect(() => {
    if (selectedChannel && step === 5) {
      api.get<{ channel: { fields?: typeof channelFields } }>(`/api/channels/${selectedChannel}`).then((res) => {
        setChannelFields(res.channel?.fields || []);
        // Initialize config with empty values
        const initialConfig: Record<string, string> = {};
        res.channel?.fields?.forEach((f: typeof channelFields[0]) => {
          if (f.value) initialConfig[f.key] = f.value;
        });
        setChannelConfig(initialConfig);
      }).catch(() => {});
    }
  }, [selectedChannel, step]);

  // Template selection
  const handleSelectTemplate = (template: typeof TEMPLATES[0]) => {
    setSelectedTemplate(template);
    setAgentName(template.name);
    setAgentProfile(template.profile);
    setSystemPrompt(template.system_prompt);
    setSelectedProvider(template.provider);
    setSelectedModel(template.model);
  };

  // API Key test
  const handleTestKey = async () => {
    if (!apiKey.trim()) return;
    setIsLoading(true);
    try {
      const result = await api.post<TestResult>('/api/wizard/test-key', {
        provider: selectedProvider,
        api_key: apiKey
      });
      setTestResult(result);
      if (result.status === 'ok') {
        success('API key is valid!');
      } else {
        showError(result.error || 'Invalid API key');
      }
    } catch (e) {
      showError('Failed to test API key');
    } finally {
      setIsLoading(false);
    }
  };

  // Create agent and configure channel
  const handleCreate = async () => {
    setIsLoading(true);
    try {
      // Create agent
      const agentRes = await api.post<{ id: string }>('/api/agents', {
        name: agentName,
        profile: agentProfile,
        system_prompt: systemPrompt,
        provider: selectedProvider,
        model: selectedModel,
        memory_enabled: enableMemory,
        planning_enabled: enablePlanning,
        tools_enabled: enableTools
      });

      // Configure channel if selected and not skipped
      if (!skipChannel && selectedChannel && Object.keys(channelConfig).length > 0) {
        try {
          await api.post(`/api/channels/${selectedChannel}/configure`, {
            fields: channelConfig
          });
        } catch (e) {
          console.error('Failed to configure channel:', e);
        }
      }

      success('Agent created successfully!');
      // Reset and go to step 1
      setStep(1);
      setApiKey('');
      setSelectedTemplate(null);
      setAgentName('');
      setAgentProfile('');
      setSystemPrompt('');
      setTryItMessages([]);
      setTryItInput('');
      setTryItSessionId('');
      setSelectedChannel('');
      setChannelConfig({});
      setSkipChannel(false);
    } catch (e) {
      showError('Failed to create agent');
    } finally {
      setIsLoading(false);
    }
  };

  // Try It - send message
  const handleTryItSend = async () => {
    if (!tryItInput.trim()) return;

    const userMessage = tryItInput.trim();
    setTryItMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setTryItInput('');
    setTryItSending(true);

    try {
      // Use a temporary session for try it
      const res = await api.post<{ response?: string; session_id?: string }>('/api/chat/try-it', {
        message: userMessage,
        agent_config: {
          name: agentName,
          profile: agentProfile,
          system_prompt: systemPrompt,
          provider: selectedProvider,
          model: selectedModel
        },
        session_id: tryItSessionId || undefined
      });

      if (res.session_id) {
        setTryItSessionId(res.session_id);
      }

      setTryItMessages(prev => [...prev, { role: 'assistant', content: res.response || 'No response' }]);
    } catch (e) {
      setTryItMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to get response' }]);
    } finally {
      setTryItSending(false);
    }
  };

  // Test channel connection
  const handleTestChannel = async () => {
    if (!selectedChannel) return;
    setChannelLoading(true);
    setChannelTestResult(null);
    try {
      const res = await api.post<{ success: boolean; message?: string }>(`/api/channels/${selectedChannel}/test`, {
        fields: channelConfig
      });
      setChannelTestResult(res);
    } catch (e) {
      setChannelTestResult({ success: false, message: 'Connection test failed' });
    } finally {
      setChannelLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return testResult?.status === 'ok';
      case 2: return selectedTemplate !== null;
      case 3: return agentName.trim() && agentProfile.trim() && systemPrompt.trim();
      case 4: return true; // Try It is optional
      case 5: return skipChannel || selectedChannel; // Channel is optional if skipped
      default: return true;
    }
  };

  const StepIcon = STEP_ICONS[step - 1];

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-2">
            <NeonText color="cyan">Create Agent</NeonText>
          </h1>
          <p className="text-[var(--text-muted)]">Set up your AI agent in {TOTAL_STEPS} simple steps</p>
        </motion.div>

        {/* Progress */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center justify-between">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
              const StepIcon = STEP_ICONS[i];
              const isActive = i + 1 === step;
              const isCompleted = i + 1 < step;
              return (
                <div key={i} className="flex items-center">
                  <motion.div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                      isActive && 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]',
                      isCompleted && 'bg-[var(--neon-green)]/20 text-[var(--neon-green)]',
                      !isActive && !isCompleted && 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
                    )}
                    animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </motion.div>
                  <span className={cn(
                    'ml-2 text-sm hidden sm:block',
                    isActive ? 'text-[var(--neon-cyan)]' : isCompleted ? 'text-[var(--neon-green)]' : 'text-[var(--text-muted)]'
                  )}>
                    {STEP_TITLES[i]}
                  </span>
                  {i < TOTAL_STEPS - 1 && (
                    <div className={cn(
                      'w-12 sm:w-20 h-0.5 mx-2 sm:mx-4',
                      isCompleted ? 'bg-[var(--neon-green)]' : 'bg-[var(--surface-tertiary)]'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: API Key */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SpotlightCard glowColor="rgba(0, 240, 255, 0.1)">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[var(--neon-cyan)]/10 flex items-center justify-center">
                      <Key className="w-6 h-6 text-[var(--neon-cyan)]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--text-primary)]">Enter API Key</h2>
                      <p className="text-sm text-[var(--text-muted)]">Your key is stored locally and securely</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-[var(--text-muted)] block mb-2">Provider</label>
                      <select
                        value={selectedProvider}
                        onChange={(e) => setSelectedProvider(e.target.value)}
                        className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)]"
                      >
                        {providers.map((p) => (
                          <option key={p.id} value={p.id} className="bg-[var(--surface-primary)]">
                            {p.display_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-[var(--text-muted)] block mb-2">API Key</label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => {
                            setApiKey(e.target.value);
                            setTestResult(null);
                          }}
                          placeholder="sk-..."
                          className="flex-1 bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-primary)]/20"
                        />
                        <motion.button
                          onClick={handleTestKey}
                          disabled={!apiKey.trim() || isLoading}
                          className="px-4 py-2 rounded-lg bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30 hover:bg-[var(--neon-cyan)]/20 disabled:opacity-50"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Test'}
                        </motion.button>
                      </div>
                    </div>

                    {testResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'p-4 rounded-lg border',
                          testResult.status === 'ok'
                            ? 'bg-[var(--neon-green)]/10 border-[var(--neon-green)]/30 text-[var(--neon-green)]'
                            : 'bg-[var(--neon-magenta)]/10 border-[var(--neon-magenta)]/30 text-[var(--neon-magenta)]'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {testResult.status === 'ok' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                          <span>
                            {testResult.status === 'ok'
                              ? `Connection successful (${testResult.latency_ms}ms)`
                              : testResult.error}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          )}

          {/* Step 2: Template */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {TEMPLATES.map((template) => {
                const Icon = template.icon;
                const isSelected = selectedTemplate?.id === template.id;
                return (
                  <motion.div
                    key={template.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <SpotlightCard
                      glowColor={isSelected ? `${template.color}40` : `${template.color}10`}
                      className={cn('cursor-pointer h-full', isSelected && 'ring-2')}
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${template.color}15` }}
                          >
                            <Icon className="w-6 h-6" style={{ color: template.color }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-[var(--text-primary)]">{template.name}</h3>
                              {isSelected && <Check className="w-4 h-4 text-[var(--neon-green)]" />}
                            </div>
                            <p className="text-sm text-[var(--text-muted)] mt-1">{template.description}</p>
                            <div className="flex gap-2 mt-3">
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: `${template.color}15`, color: template.color }}
                              >
                                {template.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SpotlightCard>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Step 3: Configure */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <SpotlightCard glowColor="rgba(255, 184, 0, 0.1)">
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-sm text-[var(--text-muted)] block mb-2">Agent Name</label>
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-[var(--text-muted)] block mb-2">Profile</label>
                    <input
                      type="text"
                      value={agentProfile}
                      onChange={(e) => setAgentProfile(e.target.value)}
                      className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-[var(--text-muted)] block mb-2">Model</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)]"
                    >
                      <option value="llama-3.1-70b-versatile" className="bg-[var(--surface-primary)]">Llama 3.1 70B</option>
                      <option value="deepseek-r1-distill-llama-70b" className="bg-[var(--surface-primary)]">DeepSeek R1</option>
                      <option value="mixtral-8x7b-32768" className="bg-[var(--surface-primary)]">Mixtral 8x7B</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-[var(--text-muted)] block mb-2">System Prompt</label>
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      rows={4}
                      className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] resize-none"
                    />
                  </div>
                </div>
              </SpotlightCard>

              {/* Toggles */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'memory', label: 'Memory', icon: Brain, value: enableMemory, setValue: setEnableMemory },
                  { key: 'planning', label: 'Planning', icon: Target, value: enablePlanning, setValue: setEnablePlanning },
                  { key: 'tools', label: 'Tools', icon: Wand2, value: enableTools, setValue: setEnableTools }
                ].map(({ key, label, icon: Icon, value, setValue }) => (
                  <SpotlightCard key={key} glowColor={value ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255,255,255,0.05)'}>
                    <div
                      className="p-4 text-center cursor-pointer"
                      onClick={() => setValue(!value)}
                    >
                      <Icon className={cn('w-6 h-6 mx-auto mb-2', value ? 'text-[var(--neon-green)]' : 'text-[var(--text-muted)]')} />
                      <div className="text-sm text-[var(--text-secondary)]">{label}</div>
                      <div className={cn('text-xs mt-1', value ? 'text-[var(--neon-green)]' : 'text-[var(--text-muted)]')}>
                        {value ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </SpotlightCard>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 4: Try It */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SpotlightCard glowColor="rgba(139, 92, 246, 0.1)">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[var(--neon-cyan)]/10 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-[var(--neon-cyan)]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--text-primary)]">Try It Out</h2>
                      <p className="text-sm text-[var(--text-muted)]">Test your agent before launching</p>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="bg-[var(--surface-secondary)] rounded-xl border border-[var(--border-default)] h-80 overflow-y-auto mb-4 p-4 space-y-3">
                    {tryItMessages.length === 0 ? (
                      <div className="text-center text-[var(--text-muted)] py-12">
                        <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Your agent is ready to chat!</p>
                        <p className="text-sm mt-1">Send a message to test the configuration</p>
                      </div>
                    ) : (
                      tryItMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'flex',
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-[80%] px-4 py-2 rounded-2xl text-sm',
                              msg.role === 'user'
                                ? 'bg-[var(--neon-cyan)] text-[var(--void)] rounded-br-md'
                                : 'bg-[var(--surface-tertiary)] text-[var(--text-primary)] rounded-bl-md'
                            )}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))
                    )}
                    {tryItSending && (
                      <div className="flex justify-start">
                        <div className="bg-[var(--surface-tertiary)] px-4 py-2 rounded-2xl rounded-bl-md">
                          <Loader2 className="w-4 h-4 animate-spin text-[var(--neon-cyan)]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tryItInput}
                      onChange={(e) => setTryItInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTryItSend()}
                      placeholder="Type a message..."
                      className="flex-1 bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-primary)]/20"
                    />
                    <motion.button
                      onClick={handleTryItSend}
                      disabled={!tryItInput.trim() || tryItSending}
                      className="px-4 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {tryItSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </motion.button>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          )}

          {/* Step 5: Channel */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SpotlightCard glowColor="rgba(255, 184, 0, 0.1)">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[var(--neon-amber)]/10 flex items-center justify-center">
                      <Radio className="w-5 h-5 text-[var(--neon-amber)]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--text-primary)]">Add Channel (Optional)</h2>
                      <p className="text-sm text-[var(--text-muted)]">Connect your agent to external platforms</p>
                    </div>
                  </div>

                  {/* Skip option */}
                  <div className="mb-6">
                    <label className="flex items-center gap-3 p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-default)] cursor-pointer hover:border-[var(--neon-cyan)]/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={skipChannel}
                        onChange={(e) => setSkipChannel(e.target.checked)}
                        className="w-5 h-5 accent-[var(--neon-cyan)]"
                      />
                      <div>
                        <div className="text-[var(--text-primary)] font-medium">Skip for now</div>
                        <div className="text-sm text-[var(--text-muted)]">Configure channels later from the Channels page</div>
                      </div>
                    </label>
                  </div>

                  {!skipChannel && (
                    <>
                      {/* Channel Selector */}
                      <div className="mb-6">
                        <label className="text-sm text-[var(--text-muted)] block mb-2">Select Channel</label>
                        {channels.length === 0 ? (
                          <div className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-default)] text-center text-[var(--text-muted)]">
                            <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p>No unconfigured channels available</p>
                            <p className="text-sm mt-1">All channels are already set up</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {channels.map((channel) => (
                              <motion.div
                                key={channel.name}
                                onClick={() => setSelectedChannel(channel.name)}
                                className={cn(
                                  'p-4 rounded-xl border cursor-pointer transition-all',
                                  selectedChannel === channel.name
                                    ? 'border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10'
                                    : 'border-[var(--border-default)] bg-[var(--surface-secondary)] hover:border-[var(--border-hover)]'
                                )}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{channel.icon}</span>
                                  <div>
                                    <div className="font-medium text-[var(--text-primary)]">{channel.display_name}</div>
                                    <div className="text-xs text-[var(--text-muted)]">{channel.name}</div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Channel Config Fields */}
                      {selectedChannel && channelFields.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-4 mb-6"
                        >
                          <div className="text-sm text-[var(--text-muted)]">Configuration</div>
                          {channelFields.map((field) => (
                            <div key={field.key}>
                              <label className="text-sm text-[var(--text-muted)] block mb-2">
                                {field.label}
                                {field.required && <span className="text-[var(--neon-magenta)] ml-1">*</span>}
                              </label>
                              {field.type === 'textarea' ? (
                                <textarea
                                  value={channelConfig[field.key] || ''}
                                  onChange={(e) => setChannelConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                                  placeholder={field.label}
                                  rows={3}
                                  className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)]"
                                />
                              ) : (
                                <input
                                  type={field.type === 'password' ? 'password' : 'text'}
                                  value={channelConfig[field.key] || ''}
                                  onChange={(e) => setChannelConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                                  placeholder={field.label}
                                  className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)]"
                                />
                              )}
                            </div>
                          ))}

                          {/* Test Connection */}
                          <motion.button
                            onClick={handleTestChannel}
                            disabled={channelLoading || channelFields.some(f => f.required && !channelConfig[f.key])}
                            className="w-full py-3 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-primary)] font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            {channelLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                Test Connection
                              </>
                            )}
                          </motion.button>

                          {channelTestResult && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                'p-3 rounded-lg text-sm',
                                channelTestResult.success
                                  ? 'bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/30'
                                  : 'bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)] border border-[var(--neon-magenta)]/30'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {channelTestResult.success ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    <span>{channelTestResult.message || 'Connection successful!'}</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-4 h-4" />
                                    <span>{channelTestResult.message || 'Connection failed'}</span>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              </SpotlightCard>
            </motion.div>
          )}

          {/* Step 6: Launch */}
          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-12"
            >
              <motion.div
                className="w-24 h-24 rounded-full bg-[var(--neon-green)]/10 flex items-center justify-center mx-auto mb-6"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Rocket className="w-12 h-12 text-[var(--neon-green)]" />
              </motion.div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Ready to Launch!</h2>
              <p className="text-[var(--text-muted)] mb-8">Your agent is configured and ready to go.</p>
              <motion.button
                onClick={handleCreate}
                disabled={isLoading}
                className="px-8 py-4 rounded-xl bg-[var(--neon-green)] text-[var(--void)] font-bold text-lg disabled:opacity-50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin inline mr-2" />
                ) : (
                  <Rocket className="w-6 h-6 inline mr-2" />
                )}
                Create Agent
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        {step < 6 && (
          <motion.div
            className="flex justify-between mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] disabled:opacity-30"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </motion.button>

            <motion.button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] font-medium disabled:opacity-30"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {step === 5 ? 'Launch' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default Wizard;
