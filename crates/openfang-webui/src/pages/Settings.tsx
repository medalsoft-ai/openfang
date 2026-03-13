// Settings - Control Center Style
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Key, Shield, Wrench, Database, Network, Loader2,
  Check, X, ExternalLink, Save, Cpu, Settings2, Package,
  ArrowRightLeft, Search, Plus, Trash2, TestTube,
  Play, AlertCircle, RefreshCw, DollarSign, Info, FlaskConical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Provider, Model, SecurityStatus, Budget, AgentBudget, A2AAgent, PeerDetail, SystemVersion, SystemStatus } from '@/api/types';

// Control Center Toggle
function ControlToggle({
  label,
  description,
  enabled,
  onToggle
}: {
  label: string;
  description?: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)]"
      whileHover={{ backgroundColor: 'var(--surface-tertiary)' }}
    >
      <div>
        <div className="font-medium text-[var(--text-primary)]">{label}</div>
        {description && <div className="text-xs text-[var(--text-muted)]">{description}</div>}
      </div>
      <motion.button
        onClick={onToggle}
        className={cn(
          'w-12 h-6 rounded-full relative transition-colors',
          enabled ? 'bg-[var(--neon-green)]' : 'bg-[var(--surface-elevated)]'
        )}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="absolute top-1 w-4 h-4 rounded-full bg-[var(--void)] shadow-lg"
          animate={{ left: enabled ? '28px' : '4px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.button>
    </motion.div>
  );
}

// Provider card for Control Center
function ProviderCard({
  provider,
  onSaveKey,
  onRemoveKey,
  onTest,
  onSaveUrl,
}: {
  provider: Provider;
  onSaveKey: (key: string) => void;
  onRemoveKey: () => void;
  onTest: () => Promise<{ success: boolean; latency_ms?: number; error?: string }>;
  onSaveUrl?: (url: string) => void;
}) {
  const [keyInput, setKeyInput] = useState('');
  const [urlInput, setUrlInput] = useState(provider.base_url || '');
  const [isExpanded, setIsExpanded] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latency_ms?: number; error?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'key' | 'url'>('key');

  const isConfigured = provider.auth_status === 'configured' || provider.auth_status === 'not_set';
  const hasNoKey = provider.auth_status === 'no_key' || provider.auth_status === 'missing';

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const result = await onTest();
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusColor = () => {
    if (hasNoKey) return 'var(--neon-amber)';
    if (isConfigured) return 'var(--neon-green)';
    return 'var(--text-muted)';
  };

  const getStatusText = () => {
    if (hasNoKey) return 'No Key Required';
    if (isConfigured) return 'Configured';
    return 'Not configured';
  };

  return (
    <motion.div
      layout
      className={cn(
        'rounded-xl border overflow-hidden',
        isConfigured && !hasNoKey
          ? 'bg-[var(--neon-green)]/5 border-[var(--neon-green)]/20'
          : hasNoKey
          ? 'bg-[var(--neon-amber)]/5 border-[var(--neon-amber)]/20'
          : 'bg-[var(--surface-secondary)] border-[var(--border-subtle)]'
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              isConfigured || hasNoKey ? 'bg-[var(--neon-green)]/20' : 'bg-[var(--surface-tertiary)]'
            )}
            style={{ backgroundColor: isConfigured || hasNoKey ? `${getStatusColor()}20` : undefined }}
          >
            <Key
              className={cn('w-5 h-5')}
              style={{ color: getStatusColor() }}
            />
          </div>
          <div className="text-left">
            <div className="font-medium text-[var(--text-primary)]">{provider.display_name}</div>
            <div className="text-xs text-[var(--text-muted)]" style={{ color: getStatusColor() }}>
              {getStatusText()}
              {provider.model_count !== undefined && ` · ${provider.model_count} models`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {testResult && (
            <span className={cn(
              'text-xs',
              testResult.success ? 'text-[var(--neon-green)]' : 'text-[var(--neon-red)]'
            )}>
              {testResult.success ? `✓ ${testResult.latency_ms}ms` : '✗ Failed'}
            </span>
          )}
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getStatusColor() }}
          />
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 border-t border-[var(--border-subtle)]"
          >
            {/* Tabs for Key / URL */}
            {provider.is_local ? (
              <div className="flex gap-2 mt-3 mb-3">
                <button
                  onClick={() => setActiveTab('key')}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-lg transition-colors',
                    activeTab === 'key'
                      ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]'
                      : 'bg-[var(--surface-tertiary)] text-[var(--text-muted)]'
                  )}
                >
                  API Key
                </button>
                <button
                  onClick={() => setActiveTab('url')}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-lg transition-colors',
                    activeTab === 'url'
                      ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]'
                      : 'bg-[var(--surface-tertiary)] text-[var(--text-muted)]'
                  )}
                >
                  Base URL
                </button>
              </div>
            ) : (
              <div className="mt-3" />
            )}

            {/* Key Tab */}
            {(!provider.is_local || activeTab === 'key') && (
              <div className="space-y-3">
                {provider.key_required !== false && (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        placeholder={isConfigured ? 'Update API key' : 'Enter API key'}
                        className="flex-1 bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
                      />
                      <motion.button
                        onClick={() => {
                          if (keyInput) {
                            onSaveKey(keyInput);
                            setKeyInput('');
                          }
                        }}
                        disabled={!keyInput}
                        className="px-4 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] text-sm font-medium disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Save
                      </motion.button>
                    </div>
                    {isConfigured && (
                      <motion.button
                        onClick={onRemoveKey}
                        className="w-full px-4 py-2 rounded-lg bg-[var(--neon-red)]/10 text-[var(--neon-red)] text-sm font-medium border border-[var(--neon-red)]/20"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        Remove API Key
                      </motion.button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* URL Tab for local providers */}
            {provider.is_local && activeTab === 'url' && onSaveUrl && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Enter base URL (e.g., http://localhost:11434)"
                    className="flex-1 bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
                  />
                  <motion.button
                    onClick={() => onSaveUrl(urlInput)}
                    disabled={!urlInput}
                    className="px-4 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] text-sm font-medium disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Save
                  </motion.button>
                </div>
              </div>
            )}

            {/* Test Button */}
            <motion.button
              onClick={handleTest}
              disabled={isTesting}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-primary)] text-sm font-medium border border-[var(--border-default)]"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4" />
              )}
              Test Connection
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function Settings() {
  const queryClient = useQueryClient();

  const { data: providers = [], isLoading } = useQuery<Provider[]>({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await api.get<{ providers: Provider[] }>('/api/providers');
      return res.providers || [];
    },
  });

  const saveKeyMutation = useMutation({
    mutationFn: async ({ id, key }: { id: string; key: string }) => {
      await api.post(`/api/providers/${encodeURIComponent(id)}/key`, { key });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });

  const removeKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.removeProviderKey(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });

  const testProviderMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.testProvider(id);
    },
  });

  const saveUrlMutation = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      await api.saveProviderUrl(id, url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });

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
            <NeonText color="cyan">Settings</NeonText>
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Configure your EnterpriseClaw instance</p>
        </motion.div>

        {/* Control Center Grid */}
        <Tabs defaultValue="providers" className="space-y-6">
          <TabsList className="bg-[var(--surface-secondary)] border border-[var(--border-default)] p-1 rounded-xl flex flex-wrap">
            <TabsTrigger
              value="providers"
              className="data-[state=active]:bg-[var(--neon-cyan)]/20 data-[state=active]:text-[var(--neon-cyan)]"
            >
              <Key className="w-4 h-4 mr-2" />
              Providers
            </TabsTrigger>
            <TabsTrigger
              value="models"
              className="data-[state=active]:bg-[var(--neon-magenta)]/20 data-[state=active]:text-[var(--neon-magenta)]"
            >
              <Cpu className="w-4 h-4 mr-2" />
              Models
            </TabsTrigger>
            <TabsTrigger
              value="config"
              className="data-[state=active]:bg-[var(--neon-amber)]/20 data-[state=active]:text-[var(--neon-amber)]"
            >
              <Settings2 className="w-4 h-4 mr-2" />
              Config
            </TabsTrigger>
            <TabsTrigger
              value="tools"
              className="data-[state=active]:bg-[var(--neon-cyan)]/20 data-[state=active]:text-[var(--neon-cyan)]"
            >
              <Wrench className="w-4 h-4 mr-2" />
              Tools
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="data-[state=active]:bg-[var(--neon-green)]/20 data-[state=active]:text-[var(--neon-green)]"
            >
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger
              value="network"
              className="data-[state=active]:bg-[var(--neon-amber)]/20 data-[state=active]:text-[var(--neon-amber)]"
            >
              <Network className="w-4 h-4 mr-2" />
              Network
            </TabsTrigger>
            <TabsTrigger
              value="budget"
              className="data-[state=active]:bg-[var(--neon-cyan)]/20 data-[state=active]:text-[var(--neon-cyan)]"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Budget
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="data-[state=active]:bg-[var(--neon-green)]/20 data-[state=active]:text-[var(--neon-green)]"
            >
              <Info className="w-4 h-4 mr-2" />
              System
            </TabsTrigger>
            <TabsTrigger
              value="migration"
              className="data-[state=active]:bg-[var(--neon-red)]/20 data-[state=active]:text-[var(--neon-red)]"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Migration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-4">
            <ProvidersPanel
              providers={providers}
              isLoading={isLoading}
              onSaveKey={(id, key) => saveKeyMutation.mutate({ id, key })}
              onRemoveKey={(id) => removeKeyMutation.mutate(id)}
              onTest={async (id) => testProviderMutation.mutateAsync(id)}
              onSaveUrl={(id, url) => saveUrlMutation.mutate({ id, url })}
            />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <SecurityPanel />
          </TabsContent>

          <TabsContent value="network" className="space-y-4">
            <SpotlightCard glowColor="rgba(255, 184, 0, 0.1)">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Network className="w-6 h-6 text-[var(--neon-amber)]" />
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">OFP Network</h3>
                </div>
                <NetworkPanel />
              </div>
            </SpotlightCard>
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <ModelsPanel />
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <ConfigPanel />
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <ToolsPanel />
          </TabsContent>

          <TabsContent value="migration" className="space-y-4">
            <MigrationPanel />
          </TabsContent>

          <TabsContent value="budget" className="space-y-4">
            <BudgetPanel />
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <SystemPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ===== Providers Panel =====
function ProvidersPanel({
  providers,
  isLoading,
  onSaveKey,
  onRemoveKey,
  onTest,
  onSaveUrl,
}: {
  providers: Provider[];
  isLoading: boolean;
  onSaveKey: (id: string, key: string) => void;
  onRemoveKey: (id: string) => void;
  onTest: (id: string) => Promise<{ success: boolean; latency_ms?: number; error?: string }>;
  onSaveUrl: (id: string, url: string) => void;
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [copilotState, setCopilotState] = useState<{
    status: 'idle' | 'polling' | 'success' | 'error';
    userCode?: string;
    verificationUri?: string;
    pollId?: string;
    message?: string;
  }>({ status: 'idle' });
  const queryClient = useQueryClient();

  const isCopilot = (p: Provider) => p.id === 'github-copilot' || p.id === 'copilot';

  const startCopilotOAuth = async () => {
    try {
      const res = await api.startCopilotOAuth();
      setCopilotState({
        status: 'polling',
        userCode: res.user_code,
        verificationUri: res.verification_uri,
        pollId: res.poll_id,
      });

      // Start polling
      const interval = setInterval(async () => {
        try {
          const poll = await api.pollCopilotOAuth(res.poll_id);
          if (poll.status === 'success' || poll.configured) {
            clearInterval(interval);
            setCopilotState({ status: 'success', message: poll.message || 'Connected!' });
            queryClient.invalidateQueries({ queryKey: ['providers'] });
          } else if (poll.status === 'error') {
            clearInterval(interval);
            setCopilotState({ status: 'error', message: poll.message || 'Failed' });
          }
        } catch (e) {
          // Continue polling
        }
      }, 5000);

      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
    } catch (e) {
      setCopilotState({ status: 'error', message: 'Failed to start OAuth' });
    }
  };

  return (
    <>
      <SpotlightCard glowColor="rgba(0, 255, 204, 0.1)">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Key className="w-6 h-6 text-[var(--neon-cyan)]" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">AI Providers</h3>
            </div>
            <motion.button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] text-sm font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-4 h-4" />
              Add Custom
            </motion.button>
          </div>

          {/* GitHub Copilot OAuth */}
          {providers.some(isCopilot) && (
            <div className="mb-6 p-4 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-[var(--text-primary)]">GitHub Copilot</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {copilotState.status === 'polling'
                      ? 'Waiting for authorization...'
                      : copilotState.status === 'success'
                      ? 'Connected!'
                      : 'Connect via OAuth'}
                  </div>
                </div>
                {copilotState.status === 'idle' && (
                  <motion.button
                    onClick={startCopilotOAuth}
                    className="px-4 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-primary)] text-sm font-medium border border-[var(--border-default)]"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Connect
                  </motion.button>
                )}
                {copilotState.status === 'polling' && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--neon-cyan)]" />
                    <span className="text-sm text-[var(--text-muted)]">Polling...</span>
                  </div>
                )}
              </div>
              {copilotState.status === 'polling' && copilotState.userCode && (
                <div className="mt-3 p-3 rounded-lg bg-[var(--surface-secondary)]">
                  <div className="text-sm text-[var(--text-muted)] mb-1">Enter this code at GitHub:</div>
                  <div className="text-2xl font-mono font-bold text-[var(--neon-cyan)] tracking-wider">
                    {copilotState.userCode}
                  </div>
                  <a
                    href={copilotState.verificationUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--neon-cyan)] hover:underline mt-2 inline-block"
                  >
                    Open GitHub →
                  </a>
                </div>
              )}
              {copilotState.message && copilotState.status !== 'polling' && (
                <div
                  className={cn(
                    'mt-3 text-sm',
                    copilotState.status === 'error' ? 'text-[var(--neon-red)]' : 'text-[var(--neon-green)]'
                  )}
                >
                  {copilotState.message}
                </div>
              )}
            </div>
          )}

          {/* Provider List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-[var(--neon-cyan)] animate-spin" />
              </div>
            ) : (
              providers
                .filter((p) => !isCopilot(p) || p.auth_status !== 'not_configured')
                .map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    onSaveKey={(key) => onSaveKey(provider.id, key)}
                    onRemoveKey={() => onRemoveKey(provider.id)}
                    onTest={() => onTest(provider.id)}
                    onSaveUrl={provider.is_local ? (url) => onSaveUrl(provider.id, url) : undefined}
                  />
                ))
            )}
          </div>
        </div>
      </SpotlightCard>

      {/* Add Custom Provider Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddCustomProviderModal onClose={() => setShowAddModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ===== Add Custom Provider Modal =====
function AddCustomProviderModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    apiKey: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!formData.name || !formData.baseUrl) return;
    setIsSubmitting(true);
    try {
      // Add provider via URL endpoint (which creates a custom provider)
      await api.saveProviderUrl(formData.name, formData.baseUrl);
      if (formData.apiKey) {
        await api.saveProviderKey(formData.name, formData.apiKey);
      }
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[var(--surface-secondary)] rounded-xl border border-[var(--border-default)] p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Add Custom Provider</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Provider Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., my-custom-llm"
              className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Base URL</label>
            <input
              type="text"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              placeholder="http://localhost:11434/v1"
              className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">API Key (optional)</label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder="Enter API key if required"
              className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <motion.button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-primary)] text-sm font-medium"
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
          <motion.button
            onClick={handleSubmit}
            disabled={!formData.name || !formData.baseUrl || isSubmitting}
            className="flex-1 px-4 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] text-sm font-medium disabled:opacity-50"
            whileTap={{ scale: 0.98 }}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add Provider'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ===== Security Panel =====
function SecurityPanel() {
  const { data: security, isLoading } = useQuery({
    queryKey: ['security'],
    queryFn: () => api.getSecurityStatus(),
  });

  const [verifyResult, setVerifyResult] = useState<{
    valid: boolean;
    entries_checked: number;
    message?: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const result = await api.verifyAuditChain();
      setVerifyResult(result);
    } finally {
      setIsVerifying(false);
    }
  };

  const formatConfigValue = (key: string, _value: boolean) => {
    const labels: Record<string, string> = {
      audit: 'Merkle Audit',
      taint_tracking: 'Taint Tracking',
      wasm_sandbox: 'WASM Sandbox',
      gcra_rate_limit: 'GCRA Rate Limit',
      ed25519_signing: 'Ed25519 Signing',
      approval_workflow: 'Approval Workflow',
      auto_approve_low_risk: 'Auto-approve Low Risk',
      require_justification: 'Require Justification',
    };
    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatMonitoringValue = (_key: string, value: unknown) => {
    if (typeof value === 'boolean') return value ? 'Active' : 'Inactive';
    if (typeof value === 'number') return value.toString();
    return String(value);
  };

  const coreFeatures = security?.features
    ? Object.entries(security.features).filter(([k]) =>
        ['audit', 'taint_tracking', 'wasm_sandbox', 'gcra_rate_limit', 'ed25519_signing'].includes(k)
      )
    : [];

  const configurableFeatures = security?.configurable
    ? Object.entries(security.configurable)
    : [];

  const monitoringFeatures = security?.monitoring
    ? Object.entries(security.monitoring)
    : [];

  if (isLoading) {
    return (
      <SpotlightCard glowColor="rgba(0, 255, 136, 0.1)">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 text-[var(--neon-green)] animate-spin" />
        </div>
      </SpotlightCard>
    );
  }

  return (
    <div className="space-y-4">
      <SpotlightCard glowColor="rgba(0, 255, 136, 0.1)">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-[var(--neon-green)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Security Systems</h3>
          </div>

          {/* Core Features */}
          {coreFeatures.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Core Security
              </h4>
              {coreFeatures.map(([key, value]) => (
                <SecurityFeatureRow
                  key={key}
                  label={formatConfigValue(key, value)}
                  enabled={value}
                  description={getSecurityDescription(key)}
                />
              ))}
            </div>
          )}

          {/* Configurable Features */}
          {configurableFeatures.length > 0 && (
            <div className="space-y-3 mt-6">
              <h4 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Configurable
              </h4>
              {configurableFeatures.map(([key, value]) => (
                <SecurityFeatureRow
                  key={key}
                  label={formatConfigValue(key, value)}
                  enabled={value}
                  description={getSecurityDescription(key)}
                />
              ))}
            </div>
          )}

          {/* Audit Chain Verification */}
          <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-[var(--text-primary)]">Audit Chain Verification</h4>
                <p className="text-xs text-[var(--text-muted)]">
                  {security?.chain_valid
                    ? 'Chain integrity verified'
                    : 'Verify tamper-proof audit chain'}
                </p>
              </div>
              <motion.button
                onClick={handleVerify}
                disabled={isVerifying}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--neon-green)]/10 text-[var(--neon-green)] text-sm font-medium border border-[var(--neon-green)]/20"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Verify
              </motion.button>
            </div>

            {verifyResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'mt-4 p-4 rounded-lg border',
                  verifyResult.valid
                    ? 'bg-[var(--neon-green)]/10 border-[var(--neon-green)]/30'
                    : 'bg-[var(--neon-red)]/10 border-[var(--neon-red)]/30'
                )}
              >
                <div className="flex items-center gap-2">
                  {verifyResult.valid ? (
                    <Check className="w-5 h-5 text-[var(--neon-green)]" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-[var(--neon-red)]" />
                  )}
                  <span
                    className={cn(
                      'font-medium',
                      verifyResult.valid ? 'text-[var(--neon-green)]' : 'text-[var(--neon-red)]'
                    )}
                  >
                    {verifyResult.valid ? 'Chain Valid' : 'Chain Invalid'}
                  </span>
                </div>
                <div className="text-sm text-[var(--text-muted)] mt-1">
                  Checked {verifyResult.entries_checked} entries
                  {verifyResult.message && ` · ${verifyResult.message}`}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </SpotlightCard>

      {/* Monitoring Stats */}
      {monitoringFeatures.length > 0 && (
        <SpotlightCard glowColor="rgba(0, 255, 204, 0.1)">
          <div className="p-6">
            <h4 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
              Security Metrics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {monitoringFeatures.map(([key, value]) => (
                <div key={key} className="p-3 rounded-lg bg-[var(--surface-tertiary)]">
                  <div className="text-xs text-[var(--text-muted)]">{key.replace(/_/g, ' ')}</div>
                  <div className="text-lg font-semibold text-[var(--text-primary)]">
                    {formatMonitoringValue(key, value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SpotlightCard>
      )}
    </div>
  );
}

function SecurityFeatureRow({
  label,
  enabled,
  description,
}: {
  label: string;
  enabled: boolean;
  description?: string;
}) {
  return (
    <motion.div
      className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-subtle)]"
      whileHover={{ backgroundColor: 'var(--surface-secondary)' }}
    >
      <div>
        <div className="font-medium text-[var(--text-primary)]">{label}</div>
        {description && <div className="text-xs text-[var(--text-muted)]">{description}</div>}
      </div>
      <div
        className={cn(
          'px-2 py-1 rounded text-xs font-medium',
          enabled
            ? 'bg-[var(--neon-green)]/20 text-[var(--neon-green)]'
            : 'bg-[var(--surface-elevated)] text-[var(--text-muted)]'
        )}
      >
        {enabled ? 'Active' : 'Inactive'}
      </div>
    </motion.div>
  );
}

function getSecurityDescription(key: string): string {
  const descriptions: Record<string, string> = {
    audit: 'Tamper-proof audit logging',
    taint_tracking: 'Data lineage tracking',
    wasm_sandbox: 'Isolated code execution',
    gcra_rate_limit: 'Advanced rate limiting',
    ed25519_signing: 'Cryptographic signatures',
    approval_workflow: 'Require approval for risky actions',
    auto_approve_low_risk: 'Automatically approve low-risk actions',
    require_justification: 'Require justification for approvals',
  };
  return descriptions[key] || '';
}

// ===== Network Panel =====
function NetworkPanel() {
  const { data: networkStatus, isLoading } = useQuery({
    queryKey: ['network-status'],
    queryFn: () => api.getNetworkStatus(),
  });

  const { data: peers, isLoading: peersLoading } = useQuery({
    queryKey: ['peers'],
    queryFn: () => api.listPeers(),
    refetchInterval: 15000, // Poll every 15 seconds
  });

  const { data: a2aAgents } = useQuery({
    queryKey: ['a2a-agents'],
    queryFn: () => api.listA2AAgents(),
  });

  const [discoverUrl, setDiscoverUrl] = useState('');
  const [discoverResult, setDiscoverResult] = useState<{ success: boolean; agent?: A2AAgent; error?: string } | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const handleDiscover = async () => {
    if (!discoverUrl) return;
    setIsDiscovering(true);
    try {
      const result = await api.discoverA2A(discoverUrl);
      setDiscoverResult(result);
    } finally {
      setIsDiscovering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 text-[var(--neon-amber)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Network Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-subtle)]">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Status</div>
          <div className={cn(
            "text-lg font-semibold",
            networkStatus?.enabled ? "text-[var(--neon-green)]" : "text-[var(--text-muted)]"
          )}>
            {networkStatus?.enabled ? "Enabled" : "Disabled"}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-subtle)]">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Connected Peers</div>
          <div className="text-lg font-semibold text-[var(--neon-cyan)]">
            {networkStatus?.connected_peers || 0}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-subtle)]">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Peers</div>
          <div className="text-lg font-semibold text-[var(--text-primary)]">
            {networkStatus?.total_peers || 0}
          </div>
        </div>
      </div>

      {/* A2A Discovery */}
      <div>
        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">A2A Agent Discovery</h4>
        <div className="p-4 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-subtle)]">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={discoverUrl}
              onChange={(e) => setDiscoverUrl(e.target.value)}
              placeholder="Enter A2A agent URL (e.g., http://localhost:8080)"
              className="flex-1 bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
            />
            <motion.button
              onClick={handleDiscover}
              disabled={!discoverUrl || isDiscovering}
              className="px-4 py-2 rounded-lg bg-[var(--neon-amber)] text-[var(--void)] text-sm font-medium disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isDiscovering ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Discover'}
            </motion.button>
          </div>

          {discoverResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'p-3 rounded-lg border',
                discoverResult.success
                  ? 'bg-[var(--neon-green)]/10 border-[var(--neon-green)]/30'
                  : 'bg-[var(--neon-red)]/10 border-[var(--neon-red)]/30'
              )}
            >
              {discoverResult.success && discoverResult.agent ? (
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--neon-green)]" />
                  <span className="text-sm text-[var(--text-primary)]">
                    Found: {discoverResult.agent.name || discoverResult.agent.url}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-[var(--neon-red)]" />
                  <span className="text-sm text-[var(--neon-red)]">
                    {discoverResult.error || 'Discovery failed'}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* A2A Agents List */}
      {a2aAgents?.agents && a2aAgents.agents.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Known A2A Agents</h4>
          <div className="space-y-2">
            {a2aAgents.agents.map((agent) => (
              <motion.div
                key={agent.url}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-subtle)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--neon-cyan)]" />
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">{agent.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">{agent.url}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Peers List */}
      <div>
        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Connected Peers</h4>
        {peersLoading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-5 h-5 text-[var(--neon-amber)] animate-spin" />
          </div>
        ) : peers && peers.length > 0 ? (
          <div className="space-y-2">
            {peers.map((peer) => (
              <motion.div
                key={peer.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-subtle)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--neon-green)]" />
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">{peer.name || peer.id.slice(0, 8)}</div>
                    <div className="text-xs text-[var(--text-muted)]">{peer.address}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-[var(--text-primary)]">{peer.agent_count || 0} agents</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {peer.last_seen ? new Date(peer.last_seen).toLocaleString() : 'Unknown'}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--text-muted)] bg-[var(--surface-tertiary)] rounded-xl border border-[var(--border-subtle)] border-dashed">
            No peers connected
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Models Panel =====
function ModelsPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: modelsData, isLoading } = useQuery({
    queryKey: ['models'],
    queryFn: () => api.listModels(),
  });

  const models = modelsData?.models || [];

  const deleteMutation = useMutation<unknown, Error, string>({
    mutationFn: (id: string) => api.deleteCustomModel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['models'] }),
  });

  // Get unique providers and tiers for filters
  const providers = Array.from(new Set(models.map(m => m.provider) || [])).sort();
  const tiers = Array.from(new Set(models.map(m => m.tier).filter(Boolean) || [])).sort();

  const filteredModels = models.filter(m => {
    const matchesSearch =
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.provider.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = selectedProvider === 'all' || m.provider === selectedProvider;
    const matchesTier = selectedTier === 'all' || m.tier === selectedTier;
    return matchesSearch && matchesProvider && matchesTier;
  }) || [];

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'frontier': return 'var(--neon-magenta)';
      case 'smart': return 'var(--neon-cyan)';
      case 'balanced': return 'var(--neon-green)';
      case 'fast': return 'var(--neon-amber)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <>
      <SpotlightCard glowColor="rgba(255, 0, 136, 0.1)">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Cpu className="w-6 h-6 text-[var(--neon-magenta)]" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Model Directory</h3>
            </div>
            <motion.button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--neon-magenta)] text-[var(--void)] text-sm font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-4 h-4" />
              Add Custom
            </motion.button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models..."
                className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg pl-10 pr-4 py-2 text-[var(--text-primary)] text-sm"
              />
            </div>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
            >
              <option value="all">All Providers</option>
              {providers.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
            >
              <option value="all">All Tiers</option>
              {tiers.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Models List */}
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 text-[var(--neon-magenta)] animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredModels.map((model) => (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    model.available
                      ? "bg-[var(--surface-tertiary)] border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                      : "bg-[var(--surface-tertiary)]/50 border-[var(--border-subtle)]/50 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getTierColor(model.tier) }}
                    />
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        {model.display_name || model.id}
                        {!model.available && (
                          <span className="ml-2 text-xs text-[var(--text-muted)]">(unavailable)</span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {model.provider} · {model.context_window?.toLocaleString()} context
                        {model.supports_vision && ' · Vision'}
                        {model.supports_tools && ' · Tools'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Cost Display */}
                    {(model.input_cost_per_m !== undefined || model.output_cost_per_m !== undefined) && (
                      <div className="text-right text-xs text-[var(--text-muted)]">
                        {model.input_cost_per_m !== undefined && (
                          <div>${model.input_cost_per_m.toFixed(2)}/1M in</div>
                        )}
                        {model.output_cost_per_m !== undefined && (
                          <div>${model.output_cost_per_m.toFixed(2)}/1M out</div>
                        )}
                      </div>
                    )}
                    {model.tier && (
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${getTierColor(model.tier)}20`,
                          color: getTierColor(model.tier),
                        }}
                      >
                        {model.tier}
                      </span>
                    )}
                    <motion.button
                      onClick={() => deleteMutation.mutate(model.id)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--neon-red)] hover:bg-[var(--neon-red)]/10 transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </SpotlightCard>

      {/* Add Custom Model Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddCustomModelModal onClose={() => setShowAddModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ===== Add Custom Model Modal =====
function AddCustomModelModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    id: '',
    provider: 'openrouter',
    context_window: 128000,
    max_output_tokens: 8192,
  });
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: () => api.addCustomModel(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      onClose();
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[var(--surface-secondary)] rounded-xl border border-[var(--border-default)] p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Add Custom Model</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Model ID</label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="e.g., gpt-4-custom"
              className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Provider</label>
            <input
              type="text"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              placeholder="openrouter"
              className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Context Window</label>
              <input
                type="number"
                value={formData.context_window}
                onChange={(e) => setFormData({ ...formData, context_window: parseInt(e.target.value) })}
                placeholder="128000"
                className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Max Output</label>
              <input
                type="number"
                value={formData.max_output_tokens}
                onChange={(e) => setFormData({ ...formData, max_output_tokens: parseInt(e.target.value) })}
                placeholder="8192"
                className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <motion.button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-primary)] text-sm font-medium"
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
          <motion.button
            onClick={() => addMutation.mutate()}
            disabled={!formData.id || !formData.provider || addMutation.isPending}
            className="flex-1 px-4 py-2 rounded-lg bg-[var(--neon-magenta)] text-[var(--void)] text-sm font-medium disabled:opacity-50"
            whileTap={{ scale: 0.98 }}
          >
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add Model'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ===== Config Panel =====
function ConfigPanel() {
  const { data: config, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: () => api.getConfig(),
  });

  const { data: schema, isLoading: schemaLoading } = useQuery({
    queryKey: ['config-schema'],
    queryFn: () => api.getConfigSchema(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.updateConfig(data),
  });

  if (isLoading || schemaLoading) {
    return (
      <SpotlightCard glowColor="rgba(255, 184, 0, 0.1)">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 text-[var(--neon-amber)] animate-spin" />
        </div>
      </SpotlightCard>
    );
  }

  return (
    <SpotlightCard glowColor="rgba(255, 184, 0, 0.1)">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings2 className="w-6 h-6 text-[var(--neon-amber)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Runtime Configuration</h3>
        </div>

        <div className="space-y-4">
          {schema?.schema && Object.entries(schema.schema).map(([key, field]) => (
            <ConfigField
              key={key}
              name={key}
              field={field as { type: string; description: string; default?: unknown; enum?: unknown[] }}
              value={(config as Record<string, unknown> | undefined)?.[key]}
              onChange={(value) => updateMutation.mutate({ [key]: value })}
            />
          ))}
        </div>
      </div>
    </SpotlightCard>
  );
}

// ===== Config Field Component =====
function ConfigField({
  name,
  field,
  value,
  onChange,
}: {
  name: string;
  field: { type: string; description: string; default?: unknown; enum?: unknown[] };
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = () => {
    onChange(localValue);
  };

  return (
    <div className="p-4 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-subtle)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="font-medium text-[var(--text-primary)]">{name}</div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">{field.description}</div>
        </div>
        <div className="flex items-center gap-2">
          {field.type === 'boolean' && (
            <motion.button
              onClick={() => {
                setLocalValue(!localValue);
                onChange(!localValue);
              }}
              className={cn(
                'w-12 h-6 rounded-full relative transition-colors',
                localValue ? 'bg-[var(--neon-green)]' : 'bg-[var(--surface-elevated)]'
              )}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute top-1 w-4 h-4 rounded-full bg-[var(--void)] shadow-lg"
                animate={{ left: localValue ? '28px' : '4px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </motion.button>
          )}
          {field.type === 'string' && field.enum && (
            <select
              value={String(localValue || field.default || '')}
              onChange={(e) => {
                setLocalValue(e.target.value);
                onChange(e.target.value);
              }}
              className="bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] text-sm"
            >
              {field.enum.map((option) => (
                <option key={String(option)} value={String(option)}>
                  {String(option)}
                </option>
              ))}
            </select>
          )}
          {field.type === 'string' && !field.enum && (
            <input
              type="text"
              value={String(localValue || '')}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={handleSave}
              className="bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] text-sm w-48"
            />
          )}
          {field.type === 'number' && (
            <input
              type="number"
              value={Number(localValue || field.default || 0)}
              onChange={(e) => setLocalValue(Number(e.target.value))}
              onBlur={handleSave}
              className="bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] text-sm w-24"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Tools Panel =====
function ToolsPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: tools, isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: () => api.listTools(),
  });

  // 确保 tools 是数组，防止 API 返回异常数据
  const toolsArray = Array.isArray(tools) ? tools : [];

  const categories = ['all', ...Array.from(new Set(toolsArray.map(t => t.category).filter(Boolean) || []))];

  const filteredTools = toolsArray.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tool.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  return (
    <SpotlightCard glowColor="rgba(0, 255, 136, 0.1)">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Wrench className="w-6 h-6 text-[var(--neon-cyan)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Tool Directory</h3>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools..."
              className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg pl-10 pr-4 py-2 text-[var(--text-primary)] text-sm"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Tools Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-[var(--neon-cyan)] animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
            {filteredTools.map((tool, index) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">{tool.name}</div>
                    {tool.category && (
                      <span className="text-xs text-[var(--neon-cyan)]">{tool.category}</span>
                    )}
                  </div>
                </div>
                {tool.description && (
                  <p className="text-sm text-[var(--text-muted)] mt-2 line-clamp-2">{tool.description}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}

// ===== Budget Panel =====
function BudgetPanel() {
  const { data: budget, isLoading } = useQuery({
    queryKey: ['budget'],
    queryFn: () => api.getBudget(),
  });

  const { data: agentBudgets, isLoading: agentsLoading } = useQuery({
    queryKey: ['budget-agents'],
    queryFn: () => api.getBudgetAgents(),
  });

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: { hourly_limit?: number; daily_limit?: number; monthly_limit?: number; alert_threshold?: number }) =>
      api.updateBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    hourly_limit: 0,
    daily_limit: 0,
    monthly_limit: 0,
    alert_threshold: 80,
  });

  useEffect(() => {
    if (budget) {
      setEditValues({
        hourly_limit: budget.hourly_limit,
        daily_limit: budget.daily_limit,
        monthly_limit: budget.monthly_limit,
        alert_threshold: budget.alert_threshold || 80,
      });
    }
  }, [budget]);

  const handleSave = () => {
    updateMutation.mutate(editValues);
    setIsEditing(false);
  };

  const formatCurrency = (val: number) => `$${val.toFixed(4)}`;

  const getProgressColor = (spend: number, limit: number) => {
    const pct = (spend / limit) * 100;
    if (pct >= 100) return 'var(--neon-red)';
    if (pct >= (budget?.alert_threshold || 80)) return 'var(--neon-amber)';
    return 'var(--neon-green)';
  };

  if (isLoading) {
    return (
      <SpotlightCard glowColor="rgba(0, 255, 204, 0.1)">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 text-[var(--neon-cyan)] animate-spin" />
        </div>
      </SpotlightCard>
    );
  }

  if (!budget) return null;

  return (
    <div className="space-y-4">
      <SpotlightCard glowColor="rgba(0, 255, 204, 0.1)">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-[var(--neon-cyan)]" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Budget Overview</h3>
            </div>
            <motion.button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-primary)] text-sm font-medium border border-[var(--border-default)]"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isEditing ? 'Cancel' : 'Edit Limits'}
            </motion.button>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'hourly_limit', label: 'Hourly Limit' },
                  { key: 'daily_limit', label: 'Daily Limit' },
                  { key: 'monthly_limit', label: 'Monthly Limit' },
                  { key: 'alert_threshold', label: 'Alert Threshold (%)' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs text-[var(--text-muted)] mb-1 block">{label}</label>
                    <input
                      type="number"
                      value={editValues[key as keyof typeof editValues]}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          [key]: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
                    />
                  </div>
                ))}
              </div>
              <motion.button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="w-full px-4 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] text-sm font-medium disabled:opacity-50"
                whileTap={{ scale: 0.98 }}
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
              </motion.button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Hourly */}
              <BudgetProgress
                label="Hourly"
                spend={budget.hourly_spend}
                limit={budget.hourly_limit}
                color={getProgressColor(budget.hourly_spend, budget.hourly_limit)}
              />
              {/* Daily */}
              <BudgetProgress
                label="Daily"
                spend={budget.daily_spend}
                limit={budget.daily_limit}
                color={getProgressColor(budget.daily_spend, budget.daily_limit)}
              />
              {/* Monthly */}
              <BudgetProgress
                label="Monthly"
                spend={budget.monthly_spend}
                limit={budget.monthly_limit}
                color={getProgressColor(budget.monthly_spend, budget.monthly_limit)}
              />
            </div>
          )}
        </div>
      </SpotlightCard>

      {/* Agent Budgets */}
      <SpotlightCard glowColor="rgba(255, 0, 136, 0.1)">
        <div className="p-6">
          <h4 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
            Per-Agent Spending
          </h4>
          {agentsLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 text-[var(--neon-magenta)] animate-spin" />
            </div>
          ) : agentBudgets && agentBudgets.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {agentBudgets
                .sort((a, b) => b.spend - a.spend)
                .map((agent) => (
                  <motion.div
                    key={agent.agent_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-subtle)]"
                  >
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        {agent.agent_name || agent.agent_id.slice(0, 8)}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {agent.calls} calls · {agent.tokens.toLocaleString()} tokens
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-[var(--text-primary)]">${agent.spend.toFixed(4)}</div>
                    </div>
                  </motion.div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-muted)]">No spending data yet</div>
          )}
        </div>
      </SpotlightCard>
    </div>
  );
}

function BudgetProgress({
  label,
  spend,
  limit,
  color,
}: {
  label: string;
  spend: number;
  limit: number;
  color: string;
}) {
  const pct = Math.min((spend / limit) * 100, 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
        <span className="text-sm text-[var(--text-muted)]">
          ${spend.toFixed(4)} / ${limit.toFixed(2)}
        </span>
      </div>
      <div className="h-2 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <div className="text-xs text-[var(--text-muted)] mt-1">{pct.toFixed(1)}% used</div>
    </div>
  );
}

// ===== System Panel =====
function SystemPanel() {
  const { data: version, isLoading: versionLoading } = useQuery({
    queryKey: ['version'],
    queryFn: () => api.getVersion(),
  });

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['system-status'],
    queryFn: () => api.getSystemStatus(),
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.listAgents(),
  });

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (versionLoading || statusLoading) {
    return (
      <SpotlightCard glowColor="rgba(0, 255, 136, 0.1)">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 text-[var(--neon-green)] animate-spin" />
        </div>
      </SpotlightCard>
    );
  }

  return (
    <div className="space-y-4">
      <SpotlightCard glowColor="rgba(0, 255, 136, 0.1)">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Info className="w-6 h-6 text-[var(--neon-green)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">System Information</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Version */}
            <SystemInfoItem label="Version" value={version?.version || 'Unknown'} />
            <SystemInfoItem label="Platform" value={version?.platform || 'Unknown'} />
            <SystemInfoItem label="Architecture" value={version?.arch || 'Unknown'} />
            <SystemInfoItem
              label="Build Time"
              value={version?.build_time ? new Date(version.build_time).toLocaleString() : 'Unknown'}
            />
            {version?.git_commit && (
              <SystemInfoItem
                label="Git Commit"
                value={version.git_commit.slice(0, 8)}
                valueClass="font-mono"
              />
            )}

            <div className="col-span-1 sm:col-span-2 border-t border-[var(--border-subtle)] my-2" />

            {/* Status */}
            {status && (
              <>
                <SystemInfoItem
                  label="Uptime"
                  value={formatUptime(status.uptime_seconds)}
                  icon={<RefreshCw className="w-4 h-4 text-[var(--neon-cyan)]" />}
                />
                <SystemInfoItem
                  label="Agents"
                  value={`${status.agent_count} (${agents?.length || 0} loaded)`}
                  icon={<Cpu className="w-4 h-4 text-[var(--neon-magenta)]" />}
                />
                {status.default_provider && (
                  <SystemInfoItem label="Default Provider" value={status.default_provider} />
                )}
                {status.default_model && (
                  <SystemInfoItem label="Default Model" value={status.default_model} />
                )}
              </>
            )}
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}

function SystemInfoItem({
  label,
  value,
  icon,
  valueClass,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-[var(--surface-tertiary)]">
      <div className="text-xs text-[var(--text-muted)] mb-1">{label}</div>
      <div className={cn('font-medium text-[var(--text-primary)] flex items-center gap-2', valueClass)}>
        {icon}
        {value}
      </div>
    </div>
  );
}

// ===== Migration Panel =====
function MigrationPanel() {
  const [step, setStep] = useState<'intro' | 'manual' | 'preview' | 'result' | 'not_found'>('intro');
  const [scanPath, setScanPath] = useState('');
  const [scanResult, setScanResult] = useState<{ path: string; agents: number; channels: number; skills: number; sessions: number; workflows: number; total_size_mb: number } | null>(null);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; migrated: { agents: number; workflows: number; skills: number }; errors: string[] } | null>(null);
  const [isDryRun, setIsDryRun] = useState(true);
  const [includeSessions, setIncludeSessions] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  const detectMutation = useMutation({
    mutationFn: () => api.detectMigration(),
    onSuccess: (data) => {
      if (data.detected && data.source) {
        setScanPath(data.source);
        handleScan(data.source);
      } else {
        setStep('not_found');
        setDetectError(data.reason || 'Could not detect OpenClaw installation');
      }
    },
    onError: () => {
      setStep('not_found');
      setDetectError('Auto-detection failed');
    },
  });

  const scanMutation = useMutation({
    mutationFn: (path: string) => api.scanMigrationPath(path),
    onSuccess: (data) => {
      // 确保数据包含所有必要字段
      const enrichedData = {
        path: scanPath || '/.openclaw',
        agents: data.agents || 0,
        channels: (data as { channels?: number }).channels || 0,
        skills: data.skills || 0,
        sessions: data.sessions || 0,
        workflows: data.workflows || 0,
        total_size_mb: data.total_size_mb || 0,
      };
      setScanResult(enrichedData);
      setStep('preview');
    },
    onError: () => {
      setStep('not_found');
      setDetectError('Scan failed - invalid path');
    },
  });

  const migrateMutation = useMutation({
    mutationFn: () => {
      if (!scanResult) throw new Error('No scan result');
      return api.runMigration({
        path: scanResult.path,
        dry_run: isDryRun,
        include_sessions: includeSessions,
      });
    },
    onSuccess: (data) => {
      setMigrationResult(data);
      setStep('result');
    },
  });

  const handleScan = (path: string) => {
    if (!path) return;
    setScanPath(path);
    scanMutation.mutate(path);
  };

  const handleMigrate = () => {
    migrateMutation.mutate();
  };

  const reset = () => {
    setStep('intro');
    setScanResult(null);
    setMigrationResult(null);
    setScanPath('');
    setDetectError(null);
  };

  return (
    <SpotlightCard glowColor="rgba(255, 0, 68, 0.1)">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <ArrowRightLeft className="w-6 h-6 text-[var(--neon-red)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">OpenClaw Migration</h3>
        </div>

        {step === 'intro' && (
          <div className="space-y-4">
            <p className="text-[var(--text-muted)]">
              Migrate your data from OpenClaw to OpenFang. This will transfer agents, workflows, skills, and sessions.
            </p>
            <div className="flex flex-wrap gap-2">
              <motion.button
                onClick={() => detectMutation.mutate()}
                disabled={detectMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--neon-red)] text-[var(--void)] text-sm font-medium disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {detectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Auto-detect OpenClaw
              </motion.button>
              <motion.button
                onClick={() => setStep('manual')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-primary)] text-sm font-medium border border-[var(--border-default)]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Database className="w-4 h-4" />
                Manual Path
              </motion.button>
            </div>
          </div>
        )}

        {step === 'manual' && (
          <div className="space-y-4">
            <p className="text-[var(--text-muted)]">
              Enter the path to your OpenClaw data directory:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={scanPath}
                onChange={(e) => setScanPath(e.target.value)}
                placeholder="e.g., ~/.openclaw or C:\\Users\\name\\.openclaw"
                className="flex-1 bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
              />
              <motion.button
                onClick={() => handleScan(scanPath)}
                disabled={!scanPath || scanMutation.isPending}
                className="px-4 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] text-sm font-medium disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {scanMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Scan'}
              </motion.button>
            </div>
            <motion.button
              onClick={() => setStep('intro')}
              className="w-full px-4 py-2 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-primary)] text-sm font-medium"
              whileTap={{ scale: 0.98 }}
            >
              Back
            </motion.button>
          </div>
        )}

        {step === 'not_found' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[var(--neon-amber)]/10 border border-[var(--neon-amber)]/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-[var(--neon-amber)]" />
                <span className="font-medium text-[var(--neon-amber)]">OpenClaw Not Found</span>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                {detectError || 'Could not detect an OpenClaw installation.'}
              </p>
            </div>
            <div className="flex gap-2">
              <motion.button
                onClick={() => setStep('manual')}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] text-sm font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Enter Path Manually
              </motion.button>
              <motion.button
                onClick={reset}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-primary)] text-sm font-medium"
                whileTap={{ scale: 0.98 }}
              >
                Try Again
              </motion.button>
            </div>
          </div>
        )}

        {step === 'preview' && scanResult && (
          <div className="space-y-4">
            <div className="text-sm text-[var(--text-muted)] mb-2">
              Path: <code className="text-[var(--neon-cyan)]">{scanResult.path}</code>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] text-center">
                <div className="text-2xl font-bold text-[var(--neon-cyan)]">{scanResult.agents}</div>
                <div className="text-xs text-[var(--text-muted)]">Agents</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] text-center">
                <div className="text-2xl font-bold text-[var(--neon-green)]">{scanResult.workflows}</div>
                <div className="text-xs text-[var(--text-muted)]">Workflows</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] text-center">
                <div className="text-2xl font-bold text-[var(--neon-amber)]">{scanResult.skills}</div>
                <div className="text-xs text-[var(--text-muted)]">Skills</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] text-center">
                <div className="text-2xl font-bold text-[var(--neon-magenta)]">{scanResult.total_size_mb.toFixed(1)}</div>
                <div className="text-xs text-[var(--text-muted)]">MB</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isDryRun}
                  onChange={(e) => setIsDryRun(e.target.checked)}
                  className="rounded border-[var(--border-default)]"
                />
                <span className="text-sm text-[var(--text-muted)]">Dry run (preview only, no changes)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeSessions}
                  onChange={(e) => setIncludeSessions(e.target.checked)}
                  className="rounded border-[var(--border-default)]"
                />
                <span className="text-sm text-[var(--text-muted)]">Include session history ({scanResult.sessions} sessions)</span>
              </label>
            </div>

            <div className="flex gap-2">
              <motion.button
                onClick={() => setStep('manual')}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-primary)] text-sm font-medium"
                whileTap={{ scale: 0.98 }}
              >
                Back
              </motion.button>
              <motion.button
                onClick={handleMigrate}
                disabled={migrateMutation.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--neon-red)] text-[var(--void)] text-sm font-medium disabled:opacity-50"
                whileTap={{ scale: 0.98 }}
              >
                {migrateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : isDryRun ? (
                  'Preview Migration'
                ) : (
                  'Start Migration'
                )}
              </motion.button>
            </div>
          </div>
        )}

        {step === 'result' && migrationResult && (
          <div className="space-y-4">
            <div className={cn(
              "p-4 rounded-lg border",
              migrationResult.success
                ? "bg-[var(--neon-green)]/10 border-[var(--neon-green)]/30"
                : "bg-[var(--neon-red)]/10 border-[var(--neon-red)]/30"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {migrationResult.success ? (
                  <Check className="w-5 h-5 text-[var(--neon-green)]" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-[var(--neon-red)]" />
                )}
                <span className={cn(
                  "font-medium",
                  migrationResult.success ? "text-[var(--neon-green)]" : "text-[var(--neon-red)]"
                )}>
                  {migrationResult.success ? (isDryRun ? 'Preview Complete' : 'Migration Successful') : 'Migration Failed'}
                </span>
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                {migrationResult.migrated.agents} agents, {migrationResult.migrated.workflows} workflows, {migrationResult.migrated.skills} skills
                {isDryRun && ' (preview only)'}
              </div>
              {migrationResult.errors.length > 0 && (
                <div className="mt-2 text-sm text-[var(--neon-red)]">
                  Errors: {migrationResult.errors.join(', ')}
                </div>
              )}
            </div>
            <motion.button
              onClick={reset}
              className="w-full px-4 py-2 rounded-lg bg-[var(--surface-tertiary)] text-[var(--text-primary)] text-sm font-medium"
              whileTap={{ scale: 0.98 }}
            >
              {isDryRun ? 'Run Real Migration' : 'Start Over'}
            </motion.button>
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}

export default Settings;
