// Settings - Soft UI Evolution Style
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthQuery } from '@/hooks/useAuthQuery';
import { motion } from 'framer-motion';
import { api } from '@/api/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Key, Shield, Cpu, Database, Network, Loader2,
  Check, X, Save, Settings2, Plus, TestTube,
  AlertCircle, RefreshCw, Wallet, Server, Search,
  ArrowRightLeft, ExternalLink, Zap, Bot, MessageSquare, Pencil
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { Provider, SecurityStatus } from '@/api/types';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2 }
  }
};

// Soft Toggle Switch - Uses flex layout for cross-platform consistency
function SoftToggle({
  enabled,
  onToggle,
  size = 'md',
  disabled = false
}: {
  enabled: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
}) {
  const containerSize = size === 'sm' ? 'w-9 h-5' : 'w-11 h-6';
  const knobSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const padding = size === 'sm' ? 'p-0.5' : 'p-1';

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        containerSize,
        padding,
        'rounded-full transition-all duration-200 flex',
        enabled ? 'bg-[var(--soft-blue)] justify-end' : 'bg-[var(--soft-divider)] justify-start',
        disabled && 'opacity-40 grayscale cursor-not-allowed pointer-events-none'
      )}
    >
      <span
        className={cn(
          knobSize,
          'rounded-full bg-white shadow-sm block flex-shrink-0'
        )}
      />
    </button>
  );
}

// Soft Card Component
function SoftCard({
  children,
  className,
  hover = true
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'rounded-2xl bg-[var(--soft-sidebar)] border border-[var(--soft-divider)]',
        'shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
        hover && 'transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:border-[var(--soft-blue)]/20',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

// Section Header
function SectionHeader({
  icon: Icon,
  title,
  description
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--soft-blue)]/20 to-[var(--soft-purple)]/20 flex items-center justify-center">
        <Icon className="w-5 h-5 text-[var(--soft-blue)]" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-[var(--soft-text-primary)]">{title}</h3>
        {description && <p className="text-sm text-[var(--soft-text-muted)]">{description}</p>}
      </div>
    </div>
  );
}

// Soft Input
function SoftInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  icon: Icon,
  className
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ElementType;
  className?: string;
}) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--soft-text-muted)]" />}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full px-4 py-2.5 rounded-xl',
          'bg-[var(--soft-main)] border border-[var(--soft-divider)]',
          'text-[var(--soft-text-primary)] text-sm',
          'placeholder:text-[var(--soft-text-tertiary)]',
          'focus:outline-none focus:border-[var(--soft-blue)]/50 focus:ring-2 focus:ring-[var(--soft-blue)]/10',
          'transition-all duration-200',
          Icon && 'pl-10',
          className
        )}
      />
    </div>
  );
}

// Soft Button
function SoftButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled = false,
  loading = false
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ElementType;
  disabled?: boolean;
  loading?: boolean;
}) {
  const variants = {
    primary: 'bg-[var(--soft-blue)] text-white hover:bg-[var(--soft-blue-dark)] shadow-sm',
    secondary: 'bg-[var(--soft-surface)] text-[var(--soft-text-primary)] hover:bg-[var(--soft-surface-hover)] border border-[var(--soft-divider)]',
    ghost: 'bg-transparent text-[var(--soft-text-secondary)] hover:bg-[var(--soft-surface)] hover:text-[var(--soft-text-primary)]',
    danger: 'bg-[var(--soft-pink)] text-white hover:bg-[#d97a8f]'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
        'transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size]
      )}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon ? <Icon className="w-4 h-4" /> : null}
      {children}
    </motion.button>
  );
}

// Status Badge
function StatusBadge({ status }: { status: 'active' | 'inactive' | 'warning' | 'error' }) {
  const styles = {
    active: 'bg-[var(--soft-green)]/15 text-[var(--soft-green)]',
    inactive: 'bg-[var(--soft-text-tertiary)]/15 text-[var(--soft-text-muted)]',
    warning: 'bg-[var(--soft-amber)]/15 text-[var(--soft-amber)]',
    error: 'bg-[var(--soft-pink)]/15 text-[var(--soft-pink)]'
  };

  const labels = { active: 'Active', inactive: 'Inactive', warning: 'Warning', error: 'Error' };

  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', styles[status])}>
      {labels[status]}
    </span>
  );
}

// Agent Model Editor Component
interface AgentModelEditorProps {
  agent: { id: string; name: string; model_provider?: string; model_name?: string; model?: { provider?: string; model?: string } };
  providers: Array<{ id: string; display_name: string; auth_status: string }>;
  models: Array<{ id: string; display_name?: string; provider: string; available: boolean; context_window?: number }>;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (modelValue: string) => void;
  isSaving: boolean;
}

function AgentModelEditor({ agent, providers, models, isEditing, onEdit, onCancel, onSave, isSaving }: AgentModelEditorProps) {
  const currentProvider = agent.model_provider || agent.model?.provider || 'groq';
  const currentModel = agent.model_name || agent.model?.model || 'llama-3.3-70b-versatile';

  const [selectedProvider, setSelectedProvider] = useState(currentProvider);
  const [selectedModel, setSelectedModel] = useState(currentModel);

  // Reset selections when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setSelectedProvider(currentProvider);
      setSelectedModel(currentModel);
    }
  }, [isEditing, currentProvider, currentModel]);

  // Get available models for selected provider
  // For SiliconFlow, show models with full format (e.g., deepseek-ai/DeepSeek-V3)
  const availableModels = models.filter(m => {
    if (m.provider !== selectedProvider) return false;
    // available might be undefined for custom models, treat as true
    if (m.available === false) return false;
    // For siliconflow, only show models with vendor prefix format
    if (selectedProvider === 'siliconflow') {
      return m.id.includes('/');
    }
    return true;
  });

  // Handle provider change
  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    // Auto-select first available model for this provider
    const firstModel = models.find(m => m.provider === providerId && m.available);
    setSelectedModel(firstModel?.id || '');
  };

  // Get the effective model ID to use
  // For some providers (zhipu, siliconflow), we may need to use a different format
  const getEffectiveModelId = (provider: string, modelId: string): string => {
    // For zhipu, try to use the short alias format if the model ID has a date suffix
    if (provider === 'zhipu') {
      // glm-5-20250605 -> glm-5
      if (modelId.match(/^glm-\d+-\d{8}$/)) {
        return modelId.replace(/-\d{8}$/, '');
      }
      // glm-4.7 -> glm-4.7 (keep as is)
    }
    return modelId;
  };

  // Handle save
  const handleSave = () => {
    if (selectedProvider && selectedModel) {
      const effectiveModel = getEffectiveModelId(selectedProvider, selectedModel);
      onSave(`${selectedProvider}/${effectiveModel}`);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-[var(--soft-main)] border border-[var(--soft-divider)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--soft-blue)]/20 to-[var(--soft-purple)]/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[var(--soft-blue)]" />
          </div>
          <div>
            <h4 className="font-semibold text-[var(--soft-text-primary)]">{agent.name}</h4>
            <p className="text-xs text-[var(--soft-text-muted)]">
              {providers.find(p => p.id === currentProvider)?.display_name || currentProvider} / {currentModel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <SoftButton size="sm" icon={Check} onClick={handleSave} loading={isSaving}>Save</SoftButton>
              <SoftButton variant="ghost" size="sm" icon={X} onClick={onCancel} />
            </>
          ) : (
            <SoftButton variant="secondary" size="sm" icon={Pencil} onClick={onEdit}>Change</SoftButton>
          )}
        </div>
      </div>

      {/* Editor Panel */}
      {isEditing && (
        <div className="mt-4 pt-4 border-t border-[var(--soft-divider)] space-y-4">
          {/* Provider Select */}
          <div>
            <label className="block text-xs font-medium text-[var(--soft-text-muted)] mb-2">Provider</label>
            <div className="flex flex-wrap gap-2">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderChange(provider.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs border transition-all',
                    selectedProvider === provider.id
                      ? 'bg-[var(--soft-blue)] text-white border-[var(--soft-blue)]'
                      : 'bg-[var(--soft-surface)] text-[var(--soft-text-secondary)] border-[var(--soft-divider)] hover:border-[var(--soft-blue)]/50'
                  )}
                >
                  {provider.display_name}
                  {provider.auth_status !== 'configured' && (
                    <span className="ml-1 text-[10px] opacity-70">(not configured)</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Model Select */}
          <div>
            <label className="block text-xs font-medium text-[var(--soft-text-muted)] mb-2">
              Model ({availableModels.length} available)
            </label>
            {availableModels.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    title={`${model.id}${model.context_window ? ` • ${model.context_window.toLocaleString()} tokens` : ''}`}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs border transition-all flex items-center gap-1.5',
                      selectedModel === model.id
                        ? 'bg-[var(--soft-purple)] text-white border-[var(--soft-purple)]'
                        : 'bg-[var(--soft-surface)] text-[var(--soft-text-secondary)] border-[var(--soft-divider)] hover:border-[var(--soft-purple)]/50'
                    )}
                  >
                    <span>{model.display_name || model.id}</span>
                    {model.context_window && (
                      <span className={cn(
                        'text-[10px] opacity-70',
                        selectedModel === model.id ? 'text-white/70' : 'text-[var(--soft-text-muted)]'
                      )}>
                        ({(model.context_window / 1000).toFixed(0)}k)
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[var(--soft-surface)] border border-[var(--soft-divider)]">
                <p className="text-xs text-[var(--soft-text-tertiary)]">No available models for this provider</p>
                <p className="text-[10px] text-[var(--soft-text-muted)] mt-1">
                  Try adding a custom model in the Models tab, or check if the provider is configured.
                </p>
              </div>
            )}
          </div>

          {/* Selected Summary */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--soft-text-muted)]">Will be set to:</span>
            <code className="px-2 py-0.5 rounded bg-[var(--soft-surface)] text-[var(--soft-text-primary)]">
              {selectedProvider}/{selectedModel}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Settings Component
export function Settings() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('providers');

  // Local state
  const [securityEnabled, setSecurityEnabled] = useState(true);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [auditLogging, setAuditLogging] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState(100);
  const [apiKey, setApiKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [highlightProvider, setHighlightProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { status: 'ok' | 'error'; latency_ms?: number; error?: string }>>({});
  const [editingAgent, setEditingAgent] = useState<string | null>(null);

  // Custom model form state
  const [showCustomModelForm, setShowCustomModelForm] = useState(false);
  const [customModelId, setCustomModelId] = useState('');
  const [customModelProvider, setCustomModelProvider] = useState('openrouter');
  const [customModelContext, setCustomModelContext] = useState(128000);
  const [customModelMaxOutput, setCustomModelMaxOutput] = useState(8192);
  const [customModelStatus, setCustomModelStatus] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  // Fetch data using actual API methods - useAuthQuery waits for authReady automatically
  const { data: providersData, isLoading: providersLoading } = useAuthQuery({
    queryKey: ['providers'],
    queryFn: () => api.listProviders()
  });

  const { data: modelsData, isLoading: modelsLoading } = useAuthQuery({
    queryKey: ['models'],
    queryFn: () => api.listModels()
  });

  const { data: securityStatus } = useAuthQuery<SecurityStatus>({
    queryKey: ['security-status'],
    queryFn: () => api.getSecurityStatus()
  });

  const { data: budgetData } = useAuthQuery({
    queryKey: ['budget'],
    queryFn: () => api.getBudget()
  });

  const { data: agentBudgets } = useAuthQuery({
    queryKey: ['budget-agents'],
    queryFn: () => api.getBudgetAgents()
  });

  const { data: a2aAgents } = useAuthQuery({
    queryKey: ['a2a-agents'],
    queryFn: () => api.listA2AAgents()
  });

  const { data: peers } = useAuthQuery({
    queryKey: ['peers'],
    queryFn: () => api.listPeers()
  });

  const { data: systemStatus } = useAuthQuery({
    queryKey: ['system-status'],
    queryFn: () => api.getSystemStatus()
  });

  const { data: systemVersion } = useAuthQuery({
    queryKey: ['system-version'],
    queryFn: () => api.getVersion()
  });

  // Agents data for Agent Models tab
  const { data: agentsData, isLoading: agentsLoading } = useAuthQuery({
    queryKey: ['agents'],
    queryFn: () => api.listAgents()
  });

  // Mutations
  const updateBudgetMutation = useMutation({
    mutationFn: api.updateBudget.bind(api),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget'] })
  });

  const testProviderMutation = useMutation({
    mutationFn: async (providerId: string) => {
      setTestingProvider(providerId);
      try {
        const result = await api.testProvider(providerId);
        setTestResults(prev => ({ ...prev, [providerId]: result }));
        return result;
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          [providerId]: { status: 'error', error: error instanceof Error ? error.message : 'Test failed' }
        }));
        throw error;
      } finally {
        setTestingProvider(null);
      }
    }
  });

  const toggleProviderMutation = useMutation({
    mutationFn: async ({ providerId, enabled }: { providerId: string; enabled: boolean }) => {
      if (enabled) {
        // Disable: remove the key
        await api.removeProviderKey(providerId);
        setApiKey('');
      } else {
        // Enable: need API key
        if (selectedProvider === providerId && apiKey) {
          await api.saveProviderKey(providerId, apiKey);
        } else {
          // Auto-select this provider and prompt for API key
          setSelectedProvider(providerId);
          setApiKey('');
          setHighlightProvider(providerId);
          setTimeout(() => setHighlightProvider(null), 2000);
          throw new Error('Please enter an API key first');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setApiKey('');
    }
  });

  const saveProviderMutation = useMutation({
    mutationFn: ({ providerId, key }: { providerId: string; key: string }) =>
      api.saveProviderKey(providerId, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setApiKey('');
    }
  });

  // Agent model mutation
  const updateAgentModelMutation = useMutation({
    mutationFn: ({ agentId, modelValue }: { agentId: string; modelValue: string }) =>
      api.setAgentModel(agentId, modelValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    }
  });

  // Custom model mutation
  const addCustomModelMutation = useMutation({
    mutationFn: async () => {
      const id = customModelId.trim();
      if (!id) throw new Error('Please enter a model ID');
      setCustomModelStatus('Adding...');
      await api.addCustomModel({
        id,
        provider: customModelProvider || 'openrouter',
        context_window: customModelContext || 128000,
        max_output_tokens: customModelMaxOutput || 8192,
      });
    },
    onSuccess: () => {
      setCustomModelStatus('Added!');
      setCustomModelId('');
      setShowCustomModelForm(false);
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
    onError: (error) => {
      setCustomModelStatus('Error: ' + (error instanceof Error ? error.message : 'Failed'));
    }
  });

  // Delete custom model mutation
  const deleteCustomModelMutation = useMutation({
    mutationFn: (modelId: string) => api.deleteCustomModel(modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    }
  });

  // Derived values - ensure all data is array type with safe defaults
  const providers = Array.isArray(providersData?.providers) ? providersData?.providers : [];
  const models = Array.isArray(modelsData?.models) ? modelsData?.models : [];
  const a2aAgentsList = Array.isArray(a2aAgents?.agents) ? a2aAgents?.agents : [];
  const peersList = Array.isArray(peers) ? peers : [];
  const agentBudgetsList = Array.isArray(agentBudgets) ? agentBudgets : [];
  const agents = Array.isArray(agentsData) ? agentsData : [];
  const totalLimit = budgetData?.monthly_limit || 100;

  // Filtered models based on search
  const filteredModels = models.filter((model) => {
    if (!modelSearch.trim()) return true;
    const q = modelSearch.toLowerCase().trim();
    return (
      model.id.toLowerCase().includes(q) ||
      (model.display_name || '').toLowerCase().includes(q) ||
      model.provider.toLowerCase().includes(q)
    );
  });

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-[var(--soft-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--soft-bg)]/80 backdrop-blur-xl border-b border-[var(--soft-divider)]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--soft-blue)] to-[var(--soft-purple)] flex items-center justify-center shadow-lg shadow-[var(--soft-blue)]/20">
                <Settings2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--soft-text-primary)]">{t('settings.title')}</h1>
                <p className="text-sm text-[var(--soft-text-muted)]">Configure your EnterpriseClaw instance</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-[var(--soft-sidebar)] border border-[var(--soft-divider)]">
                <span className="text-xs text-[var(--soft-text-muted)]">Version</span>
                <p className="text-sm font-medium text-[var(--soft-text-primary)]">{systemVersion?.version || '1.0.0'}</p>
              </div>
              <SoftButton variant="secondary" icon={RefreshCw} onClick={() => queryClient.invalidateQueries()}>
                Refresh
              </SoftButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Tab Navigation */}
          <div className="mb-8">
            <TabsList className="bg-[var(--soft-sidebar)] p-1.5 rounded-2xl border border-[var(--soft-divider)]">
              {[
                { id: 'providers', label: t('settings.tabs.providers'), icon: Key },
                { id: 'models', label: t('settings.tabs.models'), icon: Cpu },
                { id: 'agents', label: t('settings.tabs.agents'), icon: Bot },
                { id: 'security', label: t('settings.tabs.security'), icon: Shield },
                { id: 'budget', label: t('settings.tabs.budget'), icon: Wallet },
                { id: 'network', label: t('settings.tabs.network'), icon: Network },
                { id: 'system', label: t('settings.tabs.system'), icon: Server }
              ].map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                    'data-[state=active]:bg-[var(--soft-blue)] data-[state=active]:text-white',
                    'data-[state=inactive]:text-[var(--soft-text-muted)] data-[state=inactive]:hover:text-[var(--soft-text-primary)]'
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Providers Tab */}
          <TabsContent value="providers">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
              <SectionHeader icon={Key} title="AI Providers" description="Configure API keys and connection settings" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {providersLoading ? (
                  <div className="col-span-2 flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-[var(--soft-blue)] animate-spin" />
                  </div>
                ) : providers.map((provider: Provider) => (
                  <SoftCard key={provider.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--soft-blue)]/20 to-[var(--soft-purple)]/20 flex items-center justify-center">
                          <Key className="w-6 h-6 text-[var(--soft-blue)]" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-[var(--soft-text-primary)]">{provider.display_name}</h4>
                          <p className="text-xs text-[var(--soft-text-muted)]">{provider.id}</p>
                        </div>
                      </div>
                      <StatusBadge status={provider.auth_status === 'configured' ? 'active' : 'inactive'} />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--soft-text-secondary)] mb-2">API Key</label>
                        <div className={cn(
                          'rounded-xl transition-all duration-300',
                          highlightProvider === provider.id && 'ring-2 ring-[var(--soft-blue)] ring-offset-2 ring-offset-[var(--soft-sidebar)]'
                        )}>
                          <SoftInput
                            type={selectedProvider === provider.id ? 'text' : 'password'}
                            value={selectedProvider === provider.id ? apiKey : (provider.auth_status === 'configured' ? '••••••••••••••••' : '')}
                            onChange={(v) => { setSelectedProvider(provider.id); setApiKey(v); }}
                            placeholder={provider.auth_status === 'configured' ? 'Key saved ••••••••' : 'Enter API key'}
                            icon={Key}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[var(--soft-text-muted)]">Enabled</span>
                          <SoftToggle
                            enabled={provider.auth_status === 'configured'}
                            onToggle={() => toggleProviderMutation.mutate({
                              providerId: provider.id,
                              enabled: provider.auth_status === 'configured'
                            })}
                            disabled={toggleProviderMutation.isPending}
                          />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex gap-2">
                            <SoftButton
                              variant="secondary" size="sm" icon={TestTube}
                              onClick={() => testProviderMutation.mutate(provider.id)}
                              loading={testingProvider === provider.id}
                            >
                              Test
                            </SoftButton>
                            <SoftButton
                              size="sm"
                              icon={Save}
                              onClick={() => {
                                if (selectedProvider === provider.id && apiKey) {
                                  saveProviderMutation.mutate({ providerId: provider.id, key: apiKey });
                                } else {
                                  setSelectedProvider(provider.id);
                                }
                              }}
                              loading={saveProviderMutation.isPending}
                            >
                              Save
                            </SoftButton>
                          </div>
                          {testResults[provider.id] && (
                            <span className={cn(
                              'text-xs',
                              testResults[provider.id].status === 'ok'
                                ? 'text-[var(--soft-green)]'
                                : 'text-[var(--soft-pink)]'
                            )}>
                              {testResults[provider.id].status === 'ok'
                                ? `${testResults[provider.id].latency_ms}ms`
                                : testResults[provider.id].error}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </SoftCard>
                ))}
              </div>
              <SoftCard className="p-6 border-dashed border-2 border-[var(--soft-divider)] hover:border-[var(--soft-blue)]/30 cursor-pointer">
                <div className="flex items-center justify-center gap-3 py-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--soft-surface)] flex items-center justify-center">
                    <Plus className="w-5 h-5 text-[var(--soft-text-muted)]" />
                  </div>
                  <span className="text-[var(--soft-text-muted)] font-medium">Add Custom Provider</span>
                </div>
              </SoftCard>
            </motion.div>
          </TabsContent>

          {/* Models Tab */}
          <TabsContent value="models">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
              <SectionHeader icon={Cpu} title="AI Models" description="Manage available models and settings" />
              <SoftCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--soft-text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search models..."
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      className={cn(
                        'w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--soft-main)] border border-[var(--soft-divider)]',
                        'text-[var(--soft-text-primary)] text-sm placeholder:text-[var(--soft-text-tertiary)]',
                        'focus:outline-none focus:border-[var(--soft-blue)]/50'
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <SoftButton
                      icon={Plus}
                      variant="secondary"
                      onClick={() => setShowCustomModelForm(true)}
                    >
                      Add Custom
                    </SoftButton>
                    <SoftButton icon={RefreshCw} variant="secondary">Sync</SoftButton>
                  </div>
                </div>

                {/* Custom Model Form */}
                {showCustomModelForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 rounded-xl bg-[var(--soft-main)] border border-[var(--soft-blue)]/30"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-[var(--soft-text-primary)]">Add Custom Model</h4>
                      <button
                        onClick={() => setShowCustomModelForm(false)}
                        className="text-[var(--soft-text-muted)] hover:text-[var(--soft-text-primary)]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-[var(--soft-text-muted)] mb-2">Model ID</label>
                        <input
                          type="text"
                          value={customModelId}
                          onChange={(e) => setCustomModelId(e.target.value)}
                          placeholder="e.g., glm-5"
                          className={cn(
                            'w-full px-3 py-2 rounded-lg bg-[var(--soft-surface)] border border-[var(--soft-divider)]',
                            'text-[var(--soft-text-primary)] text-sm',
                            'focus:outline-none focus:border-[var(--soft-blue)]/50'
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--soft-text-muted)] mb-2">Provider</label>
                        <select
                          value={customModelProvider}
                          onChange={(e) => setCustomModelProvider(e.target.value)}
                          className={cn(
                            'w-full px-3 py-2 rounded-lg bg-[var(--soft-surface)] border border-[var(--soft-divider)]',
                            'text-[var(--soft-text-primary)] text-sm',
                            'focus:outline-none focus:border-[var(--soft-blue)]/50'
                          )}
                        >
                          {providers.map((p) => (
                            <option key={p.id} value={p.id}>{p.display_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--soft-text-muted)] mb-2">Context Window</label>
                        <input
                          type="number"
                          value={customModelContext}
                          onChange={(e) => setCustomModelContext(Number(e.target.value))}
                          className={cn(
                            'w-full px-3 py-2 rounded-lg bg-[var(--soft-surface)] border border-[var(--soft-divider)]',
                            'text-[var(--soft-text-primary)] text-sm',
                            'focus:outline-none focus:border-[var(--soft-blue)]/50'
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--soft-text-muted)] mb-2">Max Output Tokens</label>
                        <input
                          type="number"
                          value={customModelMaxOutput}
                          onChange={(e) => setCustomModelMaxOutput(Number(e.target.value))}
                          className={cn(
                            'w-full px-3 py-2 rounded-lg bg-[var(--soft-surface)] border border-[var(--soft-divider)]',
                            'text-[var(--soft-text-primary)] text-sm',
                            'focus:outline-none focus:border-[var(--soft-blue)]/50'
                          )}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {customModelStatus && (
                        <span className={cn(
                          'text-sm',
                          customModelStatus.startsWith('Error') ? 'text-[var(--soft-pink)]' : 'text-[var(--soft-green)]'
                        )}>
                          {customModelStatus}
                        </span>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        <SoftButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCustomModelForm(false)}
                        >
                          Cancel
                        </SoftButton>
                        <SoftButton
                          size="sm"
                          icon={Plus}
                          loading={addCustomModelMutation.isPending}
                          onClick={() => addCustomModelMutation.mutate()}
                        >
                          Add Model
                        </SoftButton>
                      </div>
                    </div>
                  </motion.div>
                )}

                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {modelsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-[var(--soft-blue)] animate-spin" />
                      </div>
                    ) : filteredModels.map((model) => (
                      <div
                        key={model.id}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-xl bg-[var(--soft-main)] border border-[var(--soft-divider)]',
                          'hover:border-[var(--soft-blue)]/30 transition-colors'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--soft-surface)] flex items-center justify-center">
                            <Cpu className="w-5 h-5 text-[var(--soft-blue)]" />
                          </div>
                          <div>
                            <h4 className="font-medium text-[var(--soft-text-primary)]">{model.display_name || model.id}</h4>
                            <p className="text-xs text-[var(--soft-text-muted)]">{model.provider} · {model.id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-[var(--soft-text-secondary)]">{model.context_window?.toLocaleString()} tokens</p>
                            <p className="text-xs text-[var(--soft-text-muted)]">context</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!model.display_name?.includes('Official') && (
                              <button
                                onClick={() => {
                                  if (confirm(`Delete custom model "${model.id}"?`)) {
                                    deleteCustomModelMutation.mutate(model.id);
                                  }
                                }}
                                className="p-2 rounded-lg text-[var(--soft-text-muted)] hover:text-[var(--soft-pink)] hover:bg-[var(--soft-pink)]/10 transition-colors"
                                title="Delete custom model"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            <SoftToggle enabled={model.available} onToggle={() => {}} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </SoftCard>
            </motion.div>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
              <SectionHeader icon={Bot} title="Agent Models" description="Configure provider and model for each agent" />
              <SoftCard className="p-6">
                {agentsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-[var(--soft-blue)] animate-spin" />
                  </div>
                ) : agents.length === 0 ? (
                  <div className="text-center py-16">
                    <Bot className="w-12 h-12 mx-auto mb-4 text-[var(--soft-text-muted)]" />
                    <p className="text-[var(--soft-text-muted)]">No agents yet</p>
                    <p className="text-sm text-[var(--soft-text-tertiary)] mt-2">Create an agent from the sidebar to get started</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {agents.map((agent) => (
                        <AgentModelEditor
                          key={agent.id}
                          agent={agent}
                          providers={providers}
                          models={models}
                          isEditing={editingAgent === agent.id}
                          onEdit={() => setEditingAgent(agent.id)}
                          onCancel={() => setEditingAgent(null)}
                          onSave={(modelValue) => updateAgentModelMutation.mutate(
                            { agentId: agent.id, modelValue },
                            { onSuccess: () => setEditingAgent(null) }
                          )}
                          isSaving={updateAgentModelMutation.isPending}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </SoftCard>
            </motion.div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
              <SectionHeader icon={Shield} title="Security Settings" description="Configure authentication and encryption" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SoftCard className="p-6 lg:col-span-1">
                  <h4 className="font-semibold text-[var(--soft-text-primary)] mb-4">Security Status</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--soft-text-secondary)]">Audit Enabled</span>
                      {securityStatus?.audit_enabled ? <Check className="w-5 h-5 text-[var(--soft-green)]" /> : <X className="w-5 h-5 text-[var(--soft-pink)]" />}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--soft-text-secondary)]">Chain Valid</span>
                      {securityStatus?.chain_valid ? <Check className="w-5 h-5 text-[var(--soft-green)]" /> : <X className="w-5 h-5 text-[var(--soft-pink)]" />}
                    </div>
                  </div>
                  <div className="mt-6 p-4 rounded-xl bg-[var(--soft-green)]/10 border border-[var(--soft-green)]/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-[var(--soft-green)]" />
                      <span className="font-medium text-[var(--soft-green)]">Secure</span>
                    </div>
                    <p className="text-xs text-[var(--soft-text-muted)]">Your instance is properly secured</p>
                  </div>
                </SoftCard>
                <SoftCard className="p-6 lg:col-span-2">
                  <h4 className="font-semibold text-[var(--soft-text-primary)] mb-4">Configuration</h4>
                  <div className="space-y-4">
                    {[
                      { icon: Shield, label: 'Authentication', desc: 'Require login to access', state: securityEnabled, setState: setSecurityEnabled },
                      { icon: Key, label: 'Encryption at Rest', desc: 'Encrypt stored data', state: encryptionEnabled, setState: setEncryptionEnabled },
                      { icon: Database, label: 'Audit Logging', desc: 'Log all system actions', state: auditLogging, setState: setAuditLogging }
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between p-4 rounded-xl bg-[var(--soft-main)]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--soft-surface)] flex items-center justify-center">
                            <item.icon className="w-5 h-5 text-[var(--soft-blue)]" />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--soft-text-primary)]">{item.label}</p>
                            <p className="text-xs text-[var(--soft-text-muted)]">{item.desc}</p>
                          </div>
                        </div>
                        <SoftToggle enabled={item.state} onToggle={() => item.setState(!item.state)} />
                      </div>
                    ))}
                  </div>
                </SoftCard>
              </div>
            </motion.div>
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
              <SectionHeader icon={Wallet} title="Budget Management" description="Set spending limits and track usage" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SoftCard className="p-6 lg:col-span-1">
                  <h4 className="font-semibold text-[var(--soft-text-primary)] mb-4">Global Budget</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--soft-text-secondary)]">Budget Enabled</span>
                      <SoftToggle enabled={true} onToggle={() => {}} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--soft-text-secondary)] mb-2">Monthly Limit (USD)</label>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--soft-text-muted)]">$</span>
                        <input
                          type="number"
                          value={monthlyLimit}
                          onChange={(e) => setMonthlyLimit(Number(e.target.value))}
                          className={cn(
                            'flex-1 px-3 py-2 rounded-xl bg-[var(--soft-main)] border border-[var(--soft-divider)]',
                            'text-[var(--soft-text-primary)] text-sm focus:outline-none focus:border-[var(--soft-blue)]/50'
                          )}
                        />
                      </div>
                    </div>
                    <SoftButton
                      onClick={() => updateBudgetMutation.mutate({ monthly_limit: monthlyLimit })}
                      loading={updateBudgetMutation.isPending}
                    >
                      Save Budget
                    </SoftButton>
                  </div>
                  <div className="mt-6 pt-6 border-t border-[var(--soft-divider)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[var(--soft-text-muted)]">Monthly Usage</span>
                      <span className="text-sm font-medium text-[var(--soft-text-primary)]">
                        ${(budgetData?.monthly_spend || 0).toFixed(2)} / {totalLimit}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--soft-surface)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--soft-blue)] to-[var(--soft-purple)]"
                        style={{ width: `${Math.min(((budgetData?.monthly_spend || 0) / totalLimit) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </SoftCard>
                <SoftCard className="p-6 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-[var(--soft-text-primary)]">Per-Agent Usage</h4>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {agentBudgetsList.map((agentBudget) => (
                        <div key={agentBudget.agent_id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--soft-main)]">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--soft-blue)]/20 to-[var(--soft-purple)]/20 flex items-center justify-center">
                              <Zap className="w-5 h-5 text-[var(--soft-blue)]" />
                            </div>
                            <div>
                              <p className="font-medium text-[var(--soft-text-primary)]">{agentBudget.agent_name || agentBudget.agent_id}</p>
                              <p className="text-xs text-[var(--soft-text-muted)]">{agentBudget.calls} calls · {agentBudget.tokens.toLocaleString()} tokens</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-[var(--soft-text-primary)]">${agentBudget.spend.toFixed(2)}</p>
                            <p className="text-xs text-[var(--soft-text-muted)]">spent</p>
                          </div>
                        </div>
                      ))}
                      {!agentBudgetsList.length && (
                        <div className="text-center py-8 text-[var(--soft-text-muted)]">
                          <Wallet className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No agent usage data yet</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </SoftCard>
              </div>
            </motion.div>
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
              <SectionHeader icon={Network} title="Network & A2A" description="Manage peer connections and A2A agents" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SoftCard className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Network className="w-5 h-5 text-[var(--soft-blue)]" />
                      <h4 className="font-semibold text-[var(--soft-text-primary)]">Connected Peers</h4>
                    </div>
                    <StatusBadge status={peers && peers.length > 0 ? 'active' : 'inactive'} />
                  </div>
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-3">
                      {peersList.map((peer) => (
                        <div key={peer.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--soft-main)]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[var(--soft-surface)] flex items-center justify-center">
                              <Server className="w-4 h-4 text-[var(--soft-blue)]" />
                            </div>
                            <div>
                              <p className="font-medium text-[var(--soft-text-primary)] text-sm">{peer.name || peer.id}</p>
                              <p className="text-xs text-[var(--soft-text-muted)]">{peer.address}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn('w-2 h-2 rounded-full', peer.status === 'online' ? 'bg-[var(--soft-green)]' : 'bg-[var(--soft-amber)]')} />
                            <span className="text-xs text-[var(--soft-text-muted)]">{peer.agent_count || 0} agents</span>
                          </div>
                        </div>
                      ))}
                      {!peersList.length && (
                        <div className="text-center py-8 text-[var(--soft-text-muted)]">
                          <Network className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No peers connected</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </SoftCard>
                <SoftCard className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5 text-[var(--soft-purple)]" />
                      <h4 className="font-semibold text-[var(--soft-text-primary)]">A2A Agents</h4>
                    </div>
                    <SoftButton variant="secondary" size="sm" icon={Plus}>Add</SoftButton>
                  </div>
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-3">
                      {a2aAgentsList.map((agent, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[var(--soft-main)]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--soft-purple)]/20 to-[var(--soft-pink)]/20 flex items-center justify-center">
                              <Bot className="w-4 h-4 text-[var(--soft-purple)]" />
                            </div>
                            <div>
                              <p className="font-medium text-[var(--soft-text-primary)] text-sm">{agent.name}</p>
                              <p className="text-xs text-[var(--soft-text-muted)] truncate max-w-[200px]">{agent.url}</p>
                            </div>
                          </div>
                          <SoftButton variant="ghost" size="sm" icon={ExternalLink} />
                        </div>
                      ))}
                      {!a2aAgentsList.length && (
                        <div className="text-center py-8 text-[var(--soft-text-muted)]">
                          <ArrowRightLeft className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No A2A agents configured</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </SoftCard>
              </div>
            </motion.div>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
              <SectionHeader icon={Server} title="System Information" description="View system status and diagnostics" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SoftCard className="p-6">
                  <h4 className="font-semibold text-[var(--soft-text-primary)] mb-4">Status</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--soft-text-secondary)]">Agent Count</span>
                      <span className="text-sm text-[var(--soft-text-primary)]">{systemStatus?.agent_count || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--soft-text-secondary)]">Uptime</span>
                      <span className="text-sm text-[var(--soft-text-primary)]">{formatUptime(systemStatus?.uptime_seconds || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--soft-text-secondary)]">Version</span>
                      <span className="text-sm text-[var(--soft-text-primary)]">{systemVersion?.version || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--soft-text-secondary)]">Commit</span>
                      <code className="text-xs text-[var(--soft-text-muted)] bg-[var(--soft-main)] px-2 py-1 rounded">
                        {systemVersion?.git_commit?.slice(0, 7) || 'N/A'}
                      </code>
                    </div>
                  </div>
                </SoftCard>
                <SoftCard className="p-6">
                  <h4 className="font-semibold text-[var(--soft-text-primary)] mb-4">Configuration</h4>
                  <div className="space-y-4">
                    {[
                      { label: 'Default Provider', value: systemStatus?.default_provider || 'None' },
                      { label: 'Default Model', value: systemStatus?.default_model || 'None' },
                      { label: 'Platform', value: systemVersion?.platform || 'Unknown' },
                      { label: 'Architecture', value: systemVersion?.arch || 'Unknown' }
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-sm text-[var(--soft-text-secondary)]">{item.label}</span>
                        <span className="text-sm text-[var(--soft-text-primary)]">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </SoftCard>
                <SoftCard className="p-6">
                  <h4 className="font-semibold text-[var(--soft-text-primary)] mb-4">{t('settings.system.language')}</h4>
                  <div className="space-y-3">
                    {[
                      { code: 'zh-CN', name: t('languages.zh-CN') },
                      { code: 'zh-TW', name: t('languages.zh-TW') },
                      { code: 'en', name: t('languages.en') },
                      { code: 'ja', name: t('languages.ja') }
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => i18n.changeLanguage(lang.code)}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                          i18n.language === lang.code
                            ? 'bg-[var(--soft-blue)]/10 text-[var(--soft-blue)] border border-[var(--soft-blue)]/30'
                            : 'hover:bg-[var(--soft-surface-hover)] text-[var(--soft-text-secondary)]'
                        )}
                      >
                        <span>{lang.name}</span>
                        {i18n.language === lang.code && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </SoftCard>
                <SoftCard className="p-6">
                  <h4 className="font-semibold text-[var(--soft-text-primary)] mb-4">Actions</h4>
                  <div className="space-y-3">
                    <SoftButton variant="secondary" icon={RefreshCw}>Restart System</SoftButton>
                    <SoftButton variant="secondary" icon={Database}>Clear Cache</SoftButton>
                    <SoftButton variant="secondary" icon={Save}>Export Config</SoftButton>
                    <SoftButton variant="ghost" icon={AlertCircle}>Reset to Defaults</SoftButton>
                  </div>
                </SoftCard>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
