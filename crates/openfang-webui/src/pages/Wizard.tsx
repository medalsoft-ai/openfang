import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/api/client';
import { useToast } from '@/hooks/useToast';
import {
  Loader2, Check, ChevronLeft, AlertCircle,
  Send
} from 'lucide-react';

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
  icon: string;
  category: string;
  provider: string;
  model: string;
  profile: string;
  system_prompt: string;
}

interface ChannelOption {
  name: string;
  display_name: string;
  icon: string;
  description: string;
  token_label: string;
  token_placeholder: string;
  token_env: string;
  help: string;
}

interface CreatedAgent {
  id: string;
  name: string;
}

interface TryItMessage {
  role: 'user' | 'agent';
  text: string;
}

const TOTAL_STEPS = 6;

const TEMPLATES: AgentTemplate[] = [
  {
    id: 'assistant',
    name: 'General Assistant',
    description: 'A versatile helper for everyday tasks, answering questions, and providing recommendations.',
    icon: 'GA',
    category: 'General',
    provider: 'deepseek',
    model: 'deepseek-chat',
    profile: 'balanced',
    system_prompt: 'You are a helpful, friendly assistant. Provide clear, accurate, and concise responses. Ask clarifying questions when needed.'
  },
  {
    id: 'coder',
    name: 'Code Helper',
    description: 'A programming-focused agent that writes, reviews, and debugs code across multiple languages.',
    icon: 'CH',
    category: 'Development',
    provider: 'deepseek',
    model: 'deepseek-chat',
    profile: 'precise',
    system_prompt: 'You are an expert programmer. Help users write clean, efficient code. Explain your reasoning. Follow best practices and conventions for the language being used.'
  },
  {
    id: 'researcher',
    name: 'Researcher',
    description: 'An analytical agent that breaks down complex topics, synthesizes information, and provides cited summaries.',
    icon: 'RS',
    category: 'Research',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    profile: 'balanced',
    system_prompt: 'You are a research analyst. Break down complex topics into clear explanations. Provide structured analysis with key findings. Cite sources when available.'
  },
  {
    id: 'writer',
    name: 'Writer',
    description: 'A creative writing agent that helps with drafting, editing, and improving written content of all kinds.',
    icon: 'WR',
    category: 'Writing',
    provider: 'deepseek',
    model: 'deepseek-chat',
    profile: 'creative',
    system_prompt: 'You are a skilled writer and editor. Help users create polished content. Adapt your tone and style to match the intended audience. Offer constructive suggestions for improvement.'
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'A data-focused agent that helps analyze datasets, create queries, and interpret statistical results.',
    icon: 'DA',
    category: 'Development',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    profile: 'precise',
    system_prompt: 'You are a data analysis expert. Help users understand their data, write SQL/Python queries, and interpret results. Present findings clearly with actionable insights.'
  },
  {
    id: 'devops',
    name: 'DevOps Engineer',
    description: 'A systems-focused agent for CI/CD, infrastructure, Docker, and deployment troubleshooting.',
    icon: 'DO',
    category: 'Development',
    provider: 'deepseek',
    model: 'deepseek-chat',
    profile: 'precise',
    system_prompt: 'You are a DevOps engineer. Help with CI/CD pipelines, Docker, Kubernetes, infrastructure as code, and deployment. Prioritize reliability and security.'
  },
  {
    id: 'support',
    name: 'Customer Support',
    description: 'A professional, empathetic agent for handling customer inquiries and resolving issues.',
    icon: 'CS',
    category: 'Business',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    profile: 'balanced',
    system_prompt: 'You are a professional customer support representative. Be empathetic, patient, and solution-oriented. Acknowledge concerns before offering solutions. Escalate complex issues appropriately.'
  },
  {
    id: 'tutor',
    name: 'Tutor',
    description: "A patient educational agent that explains concepts step-by-step and adapts to the learner's level.",
    icon: 'TU',
    category: 'General',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    profile: 'balanced',
    system_prompt: "You are a patient and encouraging tutor. Explain concepts step by step, starting from fundamentals. Use analogies and examples. Check understanding before moving on. Adapt to the learner's pace."
  },
  {
    id: 'api-designer',
    name: 'API Designer',
    description: 'An agent specialized in RESTful API design, OpenAPI specs, and integration architecture.',
    icon: 'AD',
    category: 'Development',
    provider: 'deepseek',
    model: 'deepseek-chat',
    profile: 'precise',
    system_prompt: 'You are an API design expert. Help users design clean, consistent RESTful APIs following best practices. Cover endpoint naming, request/response schemas, error handling, and versioning.'
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Summarizes meeting transcripts into structured notes with action items and key decisions.',
    icon: 'MN',
    category: 'Business',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    profile: 'precise',
    system_prompt: 'You are a meeting summarizer. When given a meeting transcript or notes, produce a structured summary with: key decisions, action items (with owners), discussion highlights, and follow-up questions.'
  }
];

const CHANNEL_OPTIONS: ChannelOption[] = [
  {
    name: 'telegram',
    display_name: 'Telegram',
    icon: 'TG',
    description: 'Connect your agent to a Telegram bot for messaging.',
    token_label: 'Bot Token',
    token_placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    token_env: 'TELEGRAM_BOT_TOKEN',
    help: 'Create a bot via @BotFather on Telegram to get your token.'
  },
  {
    name: 'discord',
    display_name: 'Discord',
    icon: 'DC',
    description: 'Connect your agent to a Discord server via bot token.',
    token_label: 'Bot Token',
    token_placeholder: 'MTIz...abc',
    token_env: 'DISCORD_BOT_TOKEN',
    help: 'Create a Discord application at discord.com/developers and add a bot.'
  },
  {
    name: 'slack',
    display_name: 'Slack',
    icon: 'SL',
    description: 'Connect your agent to a Slack workspace.',
    token_label: 'Bot Token',
    token_placeholder: 'xoxb-...',
    token_env: 'SLACK_BOT_TOKEN',
    help: 'Create a Slack app at api.slack.com/apps and install it to your workspace.'
  }
];

const PROFILE_DESCRIPTIONS: Record<string, { label: string; desc: string }> = {
  minimal: { label: 'Minimal', desc: 'Read-only file access' },
  coding: { label: 'Coding', desc: 'Files + shell + web fetch' },
  research: { label: 'Research', desc: 'Web search + file read/write' },
  balanced: { label: 'Balanced', desc: 'General-purpose tool set' },
  precise: { label: 'Precise', desc: 'Focused tool set for accuracy' },
  creative: { label: 'Creative', desc: 'Full tools with creative emphasis' },
  full: { label: 'Full', desc: 'All 35+ tools' }
};

const SUGGESTED_MESSAGES: Record<string, string[]> = {
  'General': ['What can you help me with?', 'Tell me a fun fact', 'Summarize the latest AI news'],
  'Development': ['Write a Python hello world', 'Explain async/await', 'Review this code snippet'],
  'Research': ['Explain quantum computing simply', 'Compare React vs Vue', 'What are the latest trends in AI?'],
  'Writing': ['Help me write a professional email', 'Improve this paragraph', 'Write a blog intro about AI'],
  'Business': ['Draft a meeting agenda', 'How do I handle a complaint?', 'Create a project status update']
};

const PROVIDER_HELP: Record<string, { url: string; text: string }> = {
  anthropic: { url: 'https://console.anthropic.com/settings/keys', text: 'Get your key from the Anthropic Console' },
  openai: { url: 'https://platform.openai.com/api-keys', text: 'Get your key from the OpenAI Platform' },
  gemini: { url: 'https://aistudio.google.com/apikey', text: 'Get your key from Google AI Studio' },
  groq: { url: 'https://console.groq.com/keys', text: 'Get your key from the Groq Console (free tier available)' },
  deepseek: { url: 'https://platform.deepseek.com/api_keys', text: 'Get your key from the DeepSeek Platform (very affordable)' },
  openrouter: { url: 'https://openrouter.ai/keys', text: 'Get your key from OpenRouter (access 100+ models with one key)' },
  mistral: { url: 'https://console.mistral.ai/api-keys', text: 'Get your key from the Mistral Console' },
  together: { url: 'https://api.together.xyz/settings/api-keys', text: 'Get your key from Together AI' },
  fireworks: { url: 'https://fireworks.ai/account/api-keys', text: 'Get your key from Fireworks AI' },
  perplexity: { url: 'https://www.perplexity.ai/settings/api', text: 'Get your key from Perplexity Settings' },
  cohere: { url: 'https://dashboard.cohere.com/api-keys', text: 'Get your key from the Cohere Dashboard' },
  xai: { url: 'https://console.x.ai/', text: 'Get your key from the xAI Console' },
  'claude-code': { url: 'https://docs.anthropic.com/en/docs/claude-code', text: 'Install: npm install -g @anthropic-ai/claude-code && claude auth (no API key needed)' }
};

const POPULAR_PROVIDERS = ['anthropic', 'openai', 'gemini', 'groq', 'deepseek', 'openrouter', 'claude-code'];

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  gemini: 'gemini-2.5-flash',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-chat',
  openrouter: 'openrouter/auto',
  mistral: 'mistral-large-latest',
  together: 'meta-llama/Llama-3-70b-chat-hf',
  fireworks: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
  perplexity: 'llama-3.1-sonar-large-128k-online',
  cohere: 'command-r-plus',
  xai: 'grok-2',
  'claude-code': 'claude-code/sonnet'
};

export function Wizard() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 2: Provider setup
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [testingProvider, setTestingProvider] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [savingKey, setSavingKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  // Step 3: Agent creation
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [agentName, setAgentName] = useState('my-assistant');
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [createdAgent, setCreatedAgent] = useState<CreatedAgent | null>(null);
  const [templateCategory, setTemplateCategory] = useState('All');

  // Step 4: Try It chat
  const [tryItMessages, setTryItMessages] = useState<TryItMessage[]>([]);
  const [tryItInput, setTryItInput] = useState('');
  const [tryItSending, setTryItSending] = useState(false);

  // Step 5: Channel setup
  const [channelType, setChannelType] = useState('');
  const [channelToken, setChannelToken] = useState('');
  const [configuringChannel, setConfiguringChannel] = useState(false);
  const [channelConfigured, setChannelConfigured] = useState(false);

  // Step 6: Summary
  const [setupSummary, setSetupSummary] = useState({
    provider: '',
    agent: '',
    channel: ''
  });

  // Load providers on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      await loadProviders();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load setup data.');
    }
    setLoading(false);
  };

  const loadProviders = async () => {
    try {
      const data = await api.listProviders();
      const providerList = data.providers || [];
      setProviders(providerList);

      // Pre-select first unconfigured provider, or first one
      const unconfigured = providerList.filter((p: Provider) =>
        p.auth_status !== 'configured' && p.api_key_env
      );
      if (unconfigured.length > 0) {
        setSelectedProvider(unconfigured[0].id);
      } else if (providerList.length > 0) {
        setSelectedProvider(providerList[0].id);
      }
    } catch (e) {
      setProviders([]);
    }
  };

  const hasConfiguredProvider = useMemo(() => {
    return providers.some(p => p.auth_status === 'configured');
  }, [providers]);

  const selectedProviderObj = useMemo(() => {
    return providers.find(p => p.id === selectedProvider) || null;
  }, [providers, selectedProvider]);

  const popularProviders = useMemo(() => {
    return providers
      .filter(p => POPULAR_PROVIDERS.includes(p.id))
      .sort((a, b) => POPULAR_PROVIDERS.indexOf(a.id) - POPULAR_PROVIDERS.indexOf(b.id));
  }, [providers]);

  const otherProviders = useMemo(() => {
    return providers.filter(p => !POPULAR_PROVIDERS.includes(p.id));
  }, [providers]);

  const templateCategories = useMemo(() => {
    const cats = new Set(['All']);
    TEMPLATES.forEach(t => cats.add(t.category));
    return Array.from(cats);
  }, []);

  const filteredTemplates = useMemo(() => {
    if (templateCategory === 'All') return TEMPLATES;
    return TEMPLATES.filter(t => t.category === templateCategory);
  }, [templateCategory]);

  const currentSuggestions = useMemo(() => {
    const tpl = TEMPLATES[selectedTemplate];
    const cat = tpl ? tpl.category : 'General';
    return SUGGESTED_MESSAGES[cat] || SUGGESTED_MESSAGES['General'];
  }, [selectedTemplate]);

  const selectedChannelObj = useMemo(() => {
    return CHANNEL_OPTIONS.find(ch => ch.name === channelType) || null;
  }, [channelType]);

  const canGoNext = useMemo(() => {
    if (step === 2) return keySaved || hasConfiguredProvider;
    if (step === 3) return agentName.trim().length > 0;
    return true;
  }, [step, keySaved, hasConfiguredProvider, agentName]);

  const stepLabel = (n: number) => {
    const labels = ['Welcome', 'Provider', 'Agent', 'Try It', 'Channel', 'Done'];
    return labels[n - 1] || '';
  };

  const nextStep = () => {
    if (step === 3 && !createdAgent) {
      // Skip "Try It" if no agent was created
      setStep(5);
    } else if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step === 5 && !createdAgent) {
      // Skip back past "Try It" if no agent was created
      setStep(3);
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  const goToStep = (n: number) => {
    if (n >= 1 && n <= TOTAL_STEPS) {
      if (n === 4 && !createdAgent) return; // Can't go to Try It without agent
      setStep(n);
    }
  };

  const selectProvider = (id: string) => {
    setSelectedProvider(id);
    setApiKeyInput('');
    setTestResult(null);
    setKeySaved(false);
  };

  const providerIsConfigured = (p: Provider | null) => {
    return p && p.auth_status === 'configured';
  };

  const saveKey = async () => {
    const provider = selectedProviderObj;
    if (!provider) return;
    const key = apiKeyInput.trim();
    if (!key) {
      toastError('Please enter an API key');
      return;
    }
    setSavingKey(true);
    try {
      await api.post(`/api/providers/${encodeURIComponent(provider.id)}/key`, { key });
      setApiKeyInput('');
      setKeySaved(true);
      setSetupSummary(prev => ({ ...prev, provider: provider.display_name }));
      toastSuccess(`API key saved for ${provider.display_name}`);
      await loadProviders();
      // Auto-test after saving
      await testKey();
    } catch (e) {
      toastError(`Failed to save key: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
    setSavingKey(false);
  };

  const testKey = async () => {
    const provider = selectedProviderObj;
    if (!provider) return;
    setTestingProvider(true);
    setTestResult(null);
    try {
      const result = await api.post<TestResult>(`/api/providers/${encodeURIComponent(provider.id)}/test`, {});
      setTestResult(result);
      if (result.status === 'ok') {
        toastSuccess(`${provider.display_name} connected (${result.latency_ms || '?'}ms)`);
      } else {
        toastError(`${provider.display_name}: ${result.error || 'Connection failed'}`);
      }
    } catch (e) {
      const errorResult = { status: 'error' as const, error: e instanceof Error ? e.message : 'Test failed' };
      setTestResult(errorResult);
      toastError(`Test failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
    setTestingProvider(false);
  };

  const selectTemplate = (index: number) => {
    setSelectedTemplate(index);
    const tpl = TEMPLATES[index];
    if (tpl) {
      setAgentName(tpl.name.toLowerCase().replace(/\s+/g, '-'));
    }
  };

  const createAgent = async () => {
    const tpl = TEMPLATES[selectedTemplate];
    if (!tpl) return;
    const name = agentName.trim();
    if (!name) {
      toastError('Please enter a name for your agent');
      return;
    }

    // Use the provider the user just configured, or the template default
    let provider = tpl.provider;
    let model = tpl.model;
    if (selectedProviderObj && providerIsConfigured(selectedProviderObj)) {
      provider = selectedProviderObj.id;
      model = DEFAULT_MODELS[provider] || tpl.model;
    }

    const toml = `[agent]
name = "${name.replace(/"/g, '\\"')}"
description = "${tpl.description.replace(/"/g, '\\"')}"
profile = "${tpl.profile}"

[model]
provider = "${provider}"
model = "${model}"
system_prompt = """
${tpl.system_prompt}
"""
`;

    setCreatingAgent(true);
    try {
      const res = await api.createAgentFromTOML(toml);
      if (res.agent_id) {
        const newAgent = { id: res.agent_id, name: res.name || name };
        setCreatedAgent(newAgent);
        setSetupSummary(prev => ({ ...prev, agent: res.name || name }));
        toastSuccess(`Agent "${res.name || name}" created`);
      } else {
        toastError('Failed to create agent');
      }
    } catch (e) {
      toastError(`Failed to create agent: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
    setCreatingAgent(false);
  };

  const sendTryItMessage = async (text: string) => {
    if (!text || !text.trim() || !createdAgent || tryItSending) return;
    const trimmedText = text.trim();
    setTryItInput('');
    setTryItMessages(prev => [...prev, { role: 'user', text: trimmedText }]);
    setTryItSending(true);
    try {
      const res = await api.sendMessage(createdAgent.id, trimmedText);
      setTryItMessages(prev => [...prev, { role: 'agent', text: res.text || res.content || '(no response)' }]);
      localStorage.setItem('of-first-msg', 'true');
    } catch (e) {
      setTryItMessages(prev => [...prev, { role: 'agent', text: `Error: ${e instanceof Error ? e.message : 'Could not reach agent'}` }]);
    }
    setTryItSending(false);
  };

  const selectChannel = (name: string) => {
    if (channelType === name) {
      setChannelType('');
      setChannelToken('');
    } else {
      setChannelType(name);
      setChannelToken('');
    }
  };

  const configureChannel = async () => {
    const ch = selectedChannelObj;
    if (!ch) return;
    const token = channelToken.trim();
    if (!token) {
      toastError(`Please enter the ${ch.token_label}`);
      return;
    }
    setConfiguringChannel(true);
    try {
      const fields: Record<string, string> = {};
      fields[ch.token_env.toLowerCase()] = token;
      fields.token = token;
      await api.post(`/api/channels/${ch.name}/configure`, { fields });
      setChannelConfigured(true);
      setSetupSummary(prev => ({ ...prev, channel: ch.display_name }));
      toastSuccess(`${ch.display_name} configured and activated.`);
    } catch (e) {
      toastError(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
    setConfiguringChannel(false);
  };

  const finish = () => {
    localStorage.setItem('openfang-onboarded', 'true');
    // Navigate to agents with chat if an agent was created, otherwise overview
    if (createdAgent) {
      window.location.hash = 'agents';
    } else {
      window.location.hash = 'overview';
    }
  };

  const finishAndDismiss = () => {
    localStorage.setItem('openfang-onboarded', 'true');
    window.location.hash = 'overview';
  };

  const profileInfo = (name: string) => {
    return PROFILE_DESCRIPTIONS[name] || { label: name, desc: '' };
  };

  const getProviderHelp = (id: string) => {
    return PROVIDER_HELP[id] || null;
  };

  // Progress bar fill width
  const progressWidth = `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%`;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Setup Wizard</h2>
          <Button variant="ghost" size="sm" onClick={finishAndDismiss}>
            Skip Setup
          </Button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-12">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-muted-foreground">Loading...</span>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-muted-foreground">{error}</p>
            <Button variant="ghost" size="sm" onClick={loadData}>Retry</Button>
          </div>
        )}

        {/* Main content */}
        {!loading && !error && (
          <>
            {/* Progress bar */}
            <div className="relative mb-8">
              <div className="flex justify-between relative z-10">
                {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                    onClick={() => goToStep(n)}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        step === n
                          ? 'bg-primary text-primary-foreground'
                          : step > n
                          ? 'bg-green-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step > n ? <Check className="h-5 w-5" /> : n}
                    </div>
                    <span className={`text-xs ${step === n ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      {stepLabel(n)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-0">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: progressWidth }}
                />
              </div>
            </div>

            {/* Step 1: Welcome */}
            {step === 1 && (
              <Card className="max-w-2xl mx-auto">
                <CardContent className="pt-6 text-center">
                  <div className="flex justify-center mb-6">
                    <img src="/logo.png" alt="OpenFang" className="w-20 h-20 opacity-85" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-primary">Welcome to OpenFang</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto mb-6">
                    OpenFang is an open-source Agent Operating System. It lets you run AI agents that can chat, use tools, access memory, and connect to messaging channels — all from a single dashboard.
                  </p>
                  <Card className="text-left mb-5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">This wizard will help you:</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-3 py-2 border-b">
                        <Badge variant="secondary" className="min-w-[24px] justify-center">1</Badge>
                        <span className="text-sm">Connect an LLM provider (Anthropic, OpenAI, Gemini, etc.)</span>
                      </div>
                      <div className="flex items-center gap-3 py-2 border-b">
                        <Badge variant="secondary" className="min-w-[24px] justify-center">2</Badge>
                        <span className="text-sm">Create your first AI agent from 10 templates</span>
                      </div>
                      <div className="flex items-center gap-3 py-2 border-b">
                        <Badge variant="secondary" className="min-w-[24px] justify-center">3</Badge>
                        <span className="text-sm">Try it out with a quick test message</span>
                      </div>
                      <div className="flex items-center gap-3 py-2">
                        <Badge variant="secondary" className="min-w-[24px] justify-center">4</Badge>
                        <span className="text-sm">Optionally connect a messaging channel (Telegram, Discord, Slack)</span>
                      </div>
                    </CardContent>
                  </Card>
                  <p className="text-xs text-muted-foreground">Takes about 2 minutes. You can skip any step and configure later.</p>
                </CardContent>
                <div className="flex justify-end p-6 pt-0">
                  <Button onClick={nextStep}>Get Started</Button>
                </div>
              </Card>
            )}

            {/* Step 2: Provider Setup */}
            {step === 2 && (
              <Card className="max-w-4xl mx-auto">
                <CardContent className="pt-6">
                  <h3 className="text-base font-bold mb-1">Connect an LLM Provider</h3>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    OpenFang needs at least one LLM provider to power your agents. Select a provider and enter your API key.
                  </p>

                  {hasConfiguredProvider && (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                      <h4 className="text-green-600 font-medium text-sm">Provider Already Configured</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        You already have at least one provider set up. You can continue to the next step or configure additional providers.
                      </p>
                    </div>
                  )}

                  {/* Popular Providers */}
                  <div className="mb-4">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Popular Providers</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {popularProviders.map((p) => (
                        <div
                          key={p.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedProvider === p.id
                              ? 'border-primary bg-primary/5'
                              : p.auth_status === 'configured'
                              ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20'
                              : 'hover:border-muted-foreground/50'
                          }`}
                          onClick={() => selectProvider(p.id)}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm">{p.display_name}</span>
                            {p.auth_status === 'configured' && (
                              <Badge variant="default" className="text-[8px] bg-green-500">READY</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{p.model_count || 0} models</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Other Providers */}
                  {otherProviders.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Other Providers</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {otherProviders.map((p) => (
                          <div
                            key={p.id}
                            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                              selectedProvider === p.id
                                ? 'border-primary bg-primary/5'
                                : p.auth_status === 'configured'
                                ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20'
                                : 'hover:border-muted-foreground/50'
                            }`}
                            onClick={() => selectProvider(p.id)}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm">{p.display_name}</span>
                              {p.auth_status === 'configured' && (
                                <Badge variant="default" className="text-[8px] bg-green-500">READY</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{p.model_count || 0} models</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Configure Provider */}
                  {selectedProviderObj && !providerIsConfigured(selectedProviderObj) && (
                    <Card className="border-l-4 border-l-primary mt-4">
                      <CardContent className="pt-4">
                        <div className="font-medium mb-2">Configure {selectedProviderObj.display_name}</div>
                        {selectedProviderObj.api_key_env && (
                          <div className="text-xs text-muted-foreground mb-2">
                            Environment variable: <code className="bg-muted px-1 py-0.5 rounded text-primary">{selectedProviderObj.api_key_env}</code>
                          </div>
                        )}
                        {getProviderHelp(selectedProvider) && (
                          <div className="text-xs mb-3">
                            <a
                              href={getProviderHelp(selectedProvider)?.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline"
                            >
                              {getProviderHelp(selectedProvider)?.text}
                            </a>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>API Key</Label>
                          <div className="flex gap-2">
                            <Input
                              type="password"
                              placeholder={`Enter your ${selectedProviderObj.display_name} API key`}
                              value={apiKeyInput}
                              onChange={(e) => setApiKeyInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveKey()}
                            />
                            <Button
                              onClick={saveKey}
                              disabled={savingKey || !apiKeyInput.trim()}
                            >
                              {savingKey ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Save & Test'
                              )}
                            </Button>
                          </div>
                        </div>
                        {testResult && (
                          <div className="mt-3">
                            {testResult.status === 'ok' ? (
                              <Badge className="bg-green-500 text-white px-3 py-1">
                                Connected successfully{testResult.latency_ms ? ` (${testResult.latency_ms}ms)` : ''}
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="px-3 py-1">
                                {testResult.error || 'Connection failed'}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Already Configured Provider */}
                  {selectedProviderObj && providerIsConfigured(selectedProviderObj) && (
                    <Card className="border-l-4 border-l-green-500 mt-4">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Check className="h-5 w-5 text-green-500" />
                          <div>
                            <div className="font-bold text-sm">{selectedProviderObj.display_name} is configured and ready</div>
                            <div className="text-xs text-muted-foreground">You can test the connection or continue to the next step.</div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={testKey}
                            disabled={testingProvider}
                          >
                            {testingProvider ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Test Connection'
                            )}
                          </Button>
                        </div>
                        {testResult && (
                          <div className="mt-2">
                            {testResult.status === 'ok' ? (
                              <Badge className="bg-green-500 text-white px-3 py-1">
                                Connected{testResult.latency_ms ? ` (${testResult.latency_ms}ms)` : ''}
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="px-3 py-1">
                                {testResult.error || 'Connection failed'}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
                <div className="flex justify-between p-6 pt-0">
                  <Button variant="ghost" onClick={prevStep}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button onClick={nextStep} disabled={!canGoNext}>
                    {hasConfiguredProvider || keySaved ? 'Next' : 'Skip'}
                  </Button>
                </div>
              </Card>
            )}

            {/* Step 3: Create First Agent */}
            {step === 3 && (
              <Card className="max-w-4xl mx-auto">
                <CardContent className="pt-6">
                  <h3 className="text-base font-bold mb-1">Create Your First Agent</h3>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    Pick a template to get started quickly. You can customize the agent later or create more from the Agents page.
                  </p>

                  {/* Category filter pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {templateCategories.map((cat) => (
                      <button
                        key={cat}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          templateCategory === cat
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                        onClick={() => setTemplateCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Template grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                    {filteredTemplates.map((tpl) => {
                      const index = TEMPLATES.findIndex(t => t.id === tpl.id);
                      return (
                        <div
                          key={tpl.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedTemplate === index
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-muted-foreground/50'
                          }`}
                          onClick={() => selectTemplate(index)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                              {tpl.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-sm truncate">{tpl.name}</span>
                                <Badge variant="secondary" className="text-[10px]">{tpl.category}</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground leading-relaxed">{tpl.description}</div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-muted-foreground">{tpl.provider} / {tpl.model}</span>
                            <Badge variant="outline" className="text-[10px]">{tpl.profile}</Badge>
                          </div>
                          {profileInfo(tpl.profile).desc && (
                            <div className="text-xs text-muted-foreground mt-1">{profileInfo(tpl.profile).desc}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Agent name input */}
                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="pt-4 space-y-3">
                      <div className="space-y-2">
                        <Label>Agent Name</Label>
                        <Input
                          type="text"
                          value={agentName}
                          onChange={(e) => setAgentName(e.target.value)}
                          placeholder="my-assistant"
                          className="max-w-xs"
                          onKeyDown={(e) => e.key === 'Enter' && createAgent()}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Will use {TEMPLATES[selectedTemplate]?.provider} / {TEMPLATES[selectedTemplate]?.model} with {profileInfo(TEMPLATES[selectedTemplate]?.profile || 'balanced').label} profile
                      </div>
                      <div>
                        <Button
                          onClick={createAgent}
                          disabled={creatingAgent || !agentName.trim()}
                        >
                          {creatingAgent ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Create Agent
                        </Button>
                      </div>
                      {createdAgent && (
                        <div className="mt-2">
                          <Badge className="bg-green-500 text-white px-3 py-1">
                            Agent "{createdAgent.name}" created successfully
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CardContent>
                <div className="flex justify-between p-6 pt-0">
                  <Button variant="ghost" onClick={prevStep}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button onClick={nextStep}>
                    {createdAgent ? 'Next: Try It' : 'Skip'}
                  </Button>
                </div>
              </Card>
            )}

            {/* Step 4: Try It (mini chat) */}
            {step === 4 && (
              <Card className="max-w-2xl mx-auto">
                <CardContent className="pt-6">
                  <h3 className="text-base font-bold mb-1">Try Your Agent</h3>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    Send a quick message to test your new agent. Try one of the suggestions below or type your own.
                  </p>

                  {/* Suggested message chips */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {currentSuggestions.map((s, i) => (
                      <button
                        key={i}
                        className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-xs transition-colors disabled:opacity-50"
                        onClick={() => sendTryItMessage(s)}
                        disabled={tryItSending}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Mini chat messages */}
                  <div className="border rounded-lg p-4 min-h-[100px] space-y-3 mb-4">
                    {tryItMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {tryItSending && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] px-3 py-2 rounded-lg text-sm bg-muted opacity-50">
                          Thinking...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={tryItInput}
                      onChange={(e) => setTryItInput(e.target.value)}
                      placeholder="Type a message..."
                      disabled={tryItSending}
                      onKeyDown={(e) => e.key === 'Enter' && sendTryItMessage(tryItInput)}
                    />
                    <Button
                      size="sm"
                      onClick={() => sendTryItMessage(tryItInput)}
                      disabled={tryItSending || !tryItInput.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
                <div className="flex justify-between p-6 pt-0">
                  <Button variant="ghost" onClick={prevStep}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button onClick={nextStep}>Continue</Button>
                </div>
              </Card>
            )}

            {/* Step 5: Channel Setup (Optional) */}
            {step === 5 && (
              <Card className="max-w-4xl mx-auto">
                <CardContent className="pt-6">
                  <h3 className="text-base font-bold mb-1">
                    Connect a Channel <Badge variant="secondary">Optional</Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    Channels let your agent communicate via messaging platforms. This is optional — you can always use the built-in web chat.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    {CHANNEL_OPTIONS.map((ch) => (
                      <div
                        key={ch.name}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          channelType === ch.name
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-muted-foreground/50'
                        }`}
                        onClick={() => selectChannel(ch.name)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold">
                            {ch.icon}
                          </div>
                          <span className="font-bold text-sm">{ch.display_name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground leading-relaxed">{ch.description}</div>
                      </div>
                    ))}
                  </div>

                  {selectedChannelObj && (
                    <Card className="border-l-4 border-l-primary">
                      <CardContent className="pt-4 space-y-3">
                        <div className="font-medium">Configure {selectedChannelObj.display_name}</div>
                        <div className="text-xs text-muted-foreground">{selectedChannelObj.help}</div>
                        <div className="space-y-2">
                          <Label>{selectedChannelObj.token_label}</Label>
                          <div className="flex gap-2">
                            <Input
                              type="password"
                              placeholder={selectedChannelObj.token_placeholder}
                              value={channelToken}
                              onChange={(e) => setChannelToken(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && configureChannel()}
                            />
                            <Button
                              onClick={configureChannel}
                              disabled={configuringChannel || !channelToken.trim()}
                            >
                              {configuringChannel ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Or set {selectedChannelObj.token_env} in your environment
                        </div>
                        {channelConfigured && (
                          <div className="mt-2">
                            <Badge className="bg-green-500 text-white px-3 py-1">
                              {selectedChannelObj.display_name} configured and activated.
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {!channelType && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        You can skip this step. The built-in web chat is always available from the <strong>Agents</strong> page.
                        Add channels any time from <strong>Settings → Channels</strong>.
                      </p>
                    </div>
                  )}
                </CardContent>
                <div className="flex justify-between p-6 pt-0">
                  <Button variant="ghost" onClick={prevStep}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button onClick={nextStep}>
                    {channelConfigured ? 'Next' : 'Skip'}
                  </Button>
                </div>
              </Card>
            )}

            {/* Step 6: Done */}
            {step === 6 && (
              <Card className="max-w-2xl mx-auto text-center">
                <CardContent className="pt-6">
                  <div className="text-6xl mb-3 text-green-500">&#10003;</div>
                  <h3 className="text-xl font-bold mb-2 text-primary">You're All Set!</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    OpenFang is configured and ready to go. Here is a summary of what was set up:
                  </p>

                  <Card className="text-left mb-5">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">LLM Provider</span>
                        <span className="text-sm">
                          {setupSummary.provider ? (
                            setupSummary.provider
                          ) : hasConfiguredProvider ? (
                            <Badge className="bg-green-500 text-white">Pre-configured</Badge>
                          ) : (
                            <Badge variant="secondary">Skipped</Badge>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">First Agent</span>
                        <span className="text-sm">
                          {setupSummary.agent ? (
                            setupSummary.agent
                          ) : (
                            <Badge variant="secondary">Skipped</Badge>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-muted-foreground">Channel</span>
                        <span className="text-sm">
                          {setupSummary.channel ? (
                            setupSummary.channel
                          ) : (
                            <Badge variant="outline">None (web chat available)</Badge>
                          )}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="text-left mb-5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Next Steps</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-muted-foreground">
                      {createdAgent ? (
                        <div className="py-1">• Open <strong>Agents</strong> to start talking to your agent</div>
                      ) : (
                        <div className="py-1">• Go to <strong>Agents</strong> to create your first agent</div>
                      )}
                      <div className="py-1">• Browse <strong>Skills</strong> to add capabilities (web search, code execution, etc.)</div>
                      <div className="py-1">• Check <strong>Settings</strong> for advanced configuration</div>
                      {!setupSummary.channel && (
                        <div className="py-1">• Visit <strong>Channels</strong> to connect messaging platforms</div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex gap-2 justify-center">
                    <Button onClick={finish}>
                      {createdAgent ? 'Start Chatting' : 'Go to Dashboard'}
                    </Button>
                    <Button variant="ghost" onClick={prevStep}>
                      Back
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Wizard;
