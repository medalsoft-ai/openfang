// Settings - Developer Tool Design System
// Layout: Sidebar Menu + Content Area
// Style: Dark code theme + Green accents (per design system)

import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthQuery } from '@/hooks/useAuthQuery';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { Provider, SecurityStatus, Model } from '@/api/types';

import {
  Key, Shield, Cpu, Network, Loader2, Check, X, Save,
  Settings2, Plus, TestTube, AlertCircle, RefreshCw, Wallet,
  Server, Search, Bot, ChevronRight, Eye, EyeOff, Trash2,
  Globe, Zap, Clock, HardDrive, Bell, Moon, Sun,
  LayoutGrid, Sparkles, Terminal, ExternalLink, Copy, CheckCircle2,
  XCircle, AlertTriangle, Play, Pause, Filter,
  ArrowUpRight, MoreHorizontal, Maximize2, Minimize2
} from 'lucide-react';

// ========================================
// TYPES
// ========================================

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  description?: string;
}

interface TestResult {
  status: 'ok' | 'error' | 'pending';
  latency_ms?: number;
  error?: string;
  timestamp?: number;
}

// ========================================
// ANIMATION VARIANTS
// ========================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" as const }
  }
};

const sidebarVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.25, ease: "easeOut" as const }
  }
};

const contentVariants = {
  hidden: { opacity: 0, x: 10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: "easeOut" as const }
  }
};

// ========================================
// UTILITY COMPONENTS
// ========================================

function StatusDot({ status, className }: { status: 'active' | 'inactive' | 'warning' | 'error' | 'pending'; className?: string }) {
  const colors = {
    active: 'bg-[var(--success)] shadow-[0_0_8px_rgba(34,197,94,0.5)]',
    inactive: 'bg-[var(--text-muted)]',
    warning: 'bg-[var(--warning)] shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    error: 'bg-[var(--error)] shadow-[0_0_8px_rgba(239,68,68,0.5)]',
    pending: 'bg-[var(--neon-cyan)] animate-pulse'
  };
  return <span className={cn('w-2 h-2 rounded-full', colors[status], className)} />;
}

function StatusBadge({ status, text }: { status: 'active' | 'inactive' | 'warning' | 'error'; text?: string }) {
  const styles = {
    active: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30',
    inactive: 'bg-[var(--surface-tertiary)] text-[var(--text-muted)] border-[var(--border-default)]',
    warning: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30',
    error: 'bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/30'
  };
  const labels = { active: 'Active', inactive: 'Inactive', warning: 'Warning', error: 'Error' };
  return (
    <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium border', styles[status])}>
      {text || labels[status]}
    </span>
  );
}

function Card({ children, className, hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-default)]',
        hover && 'hover:border-[var(--border-hover)] transition-all duration-200',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <motion.div variants={itemVariants} className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-default)] flex items-center justify-center">
          <Icon className="w-5 h-5 text-[var(--neon-cyan)]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
          {description && <p className="text-sm text-[var(--text-muted)]">{description}</p>}
        </div>
      </div>
      {action}
    </motion.div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  icon: Icon,
  className,
  rightElement,
  autoFocus,
  onKeyDown
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ElementType;
  className?: string;
  rightElement?: React.ReactNode;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  return (
    <div className={cn('relative flex items-center', className)}>
      {Icon && <Icon className="absolute left-3 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        className={cn(
          'w-full px-3 py-2 rounded-lg',
          'bg-[var(--surface-tertiary)] border border-[var(--border-default)]',
          'text-[var(--text-primary)] text-sm',
          'placeholder:text-[var(--text-muted)]',
          'focus:outline-none focus:border-[var(--neon-cyan)]/50 focus:ring-1 focus:ring-[var(--neon-cyan)]/20',
          'transition-all duration-150',
          Icon && 'pl-10',
          rightElement && 'pr-10'
        )}
      />
      {rightElement && <div className="absolute right-2">{rightElement}</div>}
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled = false,
  loading = false,
  className
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ElementType;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const variants = {
    primary: 'bg-[var(--neon-cyan)] text-[var(--void)] hover:bg-[var(--neon-cyan-dim)] shadow-lg shadow-[var(--neon-cyan)]/20',
    secondary: 'bg-[var(--surface-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-elevated)]',
    ghost: 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)]',
    danger: 'bg-[var(--error)] text-white hover:bg-[var(--error-dark)] shadow-lg shadow-[var(--error)]/20',
    success: 'bg-[var(--success)] text-white hover:bg-[var(--success-dark)] shadow-lg shadow-[var(--success)]/20'
  };

  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2'
  };

  const iconSizes = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' };

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium',
        'transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading ? <Loader2 className={cn('animate-spin', iconSizes[size])} /> : Icon ? <Icon className={iconSizes[size]} /> : null}
      {children}
    </motion.button>
  );
}

function IconButton({
  icon: Icon,
  onClick,
  variant = 'ghost',
  size = 'md',
  className,
  title
}: {
  icon: React.ElementType;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}) {
  const variants = {
    primary: 'bg-[var(--neon-cyan)] text-[var(--void)] hover:bg-[var(--neon-cyan-dim)]',
    secondary: 'bg-[var(--surface-tertiary)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]',
    ghost: 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)]',
    danger: 'bg-transparent text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/10'
  };

  const sizes = { sm: 'w-7 h-7', md: 'w-8 h-8', lg: 'w-10 h-10' };
  const iconSizes = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center justify-center rounded-lg',
        'transition-all duration-150',
        variants[variant],
        sizes[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
    </motion.button>
  );
}

// ========================================
// PROVIDER CARD COMPONENT
// ========================================

interface ProviderCardProps {
  provider: Provider;
  apiKey: string;
  isSelected: boolean;
  isHighlighted: boolean;
  testResult?: TestResult;
  isTesting: boolean;
  isSaving: boolean;
  onSelect: () => void;
  onKeyChange: (key: string) => void;
  onSave: () => void;
  onTest: () => void;
  onToggle: () => void;
}

function ProviderCard({
  provider,
  apiKey,
  isSelected,
  isHighlighted,
  testResult,
  isTesting,
  isSaving,
  onSelect,
  onKeyChange,
  onSave,
  onTest,
  onToggle
}: ProviderCardProps) {
  const [showKey, setShowKey] = useState(false);
  const isConfigured = provider.auth_status === 'configured';

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'group rounded-xl border transition-all duration-200',
        isHighlighted
          ? 'border-[var(--neon-cyan)] ring-1 ring-[var(--neon-cyan)] bg-[var(--neon-cyan)]/5'
          : 'border-[var(--border-default)] bg-[var(--surface-secondary)] hover:border-[var(--border-hover)]',
        'overflow-hidden'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
            isConfigured
              ? 'bg-[var(--success)]/10 text-[var(--success)]'
              : 'bg-[var(--surface-tertiary)] text-[var(--text-muted)]'
          )}>
            <Key className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[var(--text-primary)]">{provider.display_name}</h3>
              <StatusBadge status={isConfigured ? 'active' : 'inactive'} />
            </div>
            <p className="text-xs text-[var(--text-muted)]">{provider.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Test Button */}
          <Button
            variant="ghost"
            size="sm"
            icon={isTesting ? undefined : TestTube}
            onClick={onTest}
            loading={isTesting}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isTesting ? '' : 'Test'}
          </Button>

          {/* Toggle Switch */}
          <button
            onClick={onToggle}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors duration-200',
              isConfigured ? 'bg-[var(--success)]' : 'bg-[var(--surface-elevated)]'
            )}
          >
            <span className={cn(
              'absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200',
              isConfigured ? 'left-6' : 'left-1'
            )} />
          </button>
        </div>
      </div>

      {/* API Key Input Section */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={isSelected ? apiKey : (isConfigured ? 'sk-************************' : '')}
              onChange={(e) => { onSelect(); onKeyChange(e.target.value); }}
              onFocus={onSelect}
              placeholder={isConfigured ? 'API key saved' : 'Enter API key'}
              className={cn(
                'w-full px-3 py-2 pr-10 rounded-lg',
                'bg-[var(--surface-tertiary)] border border-[var(--border-default)]',
                'text-[var(--text-primary)] text-sm font-mono',
                'placeholder:text-[var(--text-muted)]',
                'focus:outline-none focus:border-[var(--neon-cyan)]/50 focus:ring-1 focus:ring-[var(--neon-cyan)]/20',
                'transition-all duration-150'
              )}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Button
            onClick={onSave}
            loading={isSaving}
            disabled={!isSelected || !apiKey}
            size="sm"
            icon={Save}
          >
            Save
          </Button>
        </div>

        {/* Test Result */}
        <AnimatePresence>
          {testResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                testResult.status === 'ok'
                  ? 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30'
                  : 'bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/30'
              )}>
                {testResult.status === 'ok' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Connected ({testResult.latency_ms}ms)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>{testResult.error || 'Connection failed'}</span>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ========================================
// SETTINGS SECTIONS
// ========================================

function ProvidersSection({
  providers,
  providersLoading,
  testResults,
  testingProvider,
  saveProviderMutation,
  testProviderMutation,
  toggleProviderMutation,
  selectedProvider,
  setSelectedProvider,
  apiKey,
  setApiKey,
  highlightProvider
}: {
  providers: Provider[];
  providersLoading: boolean;
  testResults: Record<string, TestResult>;
  testingProvider: string | null;
  saveProviderMutation: { mutate: (data: { providerId: string; key: string }) => void; isPending: boolean };
  testProviderMutation: { mutate: (id: string) => void };
  toggleProviderMutation: { mutate: (data: { providerId: string; enabled: boolean }) => void };
  selectedProvider: string;
  setSelectedProvider: (id: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  highlightProvider: string | null;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredProviders = useMemo(() => {
    let result = providers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.display_name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    }
    if (filter === 'active') {
      result = result.filter(p => p.auth_status === 'configured');
    } else if (filter === 'inactive') {
      result = result.filter(p => p.auth_status !== 'configured');
    }
    return result;
  }, [providers, search, filter]);

  const activeCount = providers.filter(p => p.auth_status === 'configured').length;

  if (providersLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--neon-cyan)] animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <SectionHeader
        icon={Key}
        title="AI Providers"
        description={`${activeCount} of ${providers.length} providers configured`}
        action={
          <Button variant="secondary" icon={Plus}>
            Add Custom
          </Button>
        }
      />

      {/* Search & Filter Bar */}
      <Card className="p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search providers..."
              className={cn(
                'w-full pl-10 pr-4 py-2 rounded-lg',
                'bg-[var(--surface-tertiary)] border border-[var(--border-default)]',
                'text-[var(--text-primary)] text-sm',
                'placeholder:text-[var(--text-muted)]',
                'focus:outline-none focus:border-[var(--neon-cyan)]/50'
              )}
            />
          </div>
          <div className="flex gap-1 bg-[var(--surface-tertiary)] rounded-lg p-1">
            {(['all', 'active', 'inactive'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all',
                  filter === f
                    ? 'bg-[var(--surface-secondary)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredProviders.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            apiKey={apiKey}
            isSelected={selectedProvider === provider.id}
            isHighlighted={highlightProvider === provider.id}
            testResult={testResults[provider.id]}
            isTesting={testingProvider === provider.id}
            isSaving={saveProviderMutation.isPending && selectedProvider === provider.id}
            onSelect={() => setSelectedProvider(provider.id)}
            onKeyChange={setApiKey}
            onSave={() => saveProviderMutation.mutate({ providerId: provider.id, key: apiKey })}
            onTest={() => testProviderMutation.mutate(provider.id)}
            onToggle={() => toggleProviderMutation.mutate({
              providerId: provider.id,
              enabled: provider.auth_status === 'configured'
            })}
          />
        ))}
      </div>

      {filteredProviders.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-[var(--surface-tertiary)] flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-medium text-[var(--text-primary)]">No providers found</h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">Try adjusting your search</p>
        </div>
      )}
    </motion.div>
  );
}

function ModelsSection({
  models,
  modelsLoading
}: {
  models: Model[];
  modelsLoading: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  const providers = useMemo(() => {
    const set = new Set(models.map(m => m.provider));
    return ['all', ...Array.from(set)];
  }, [models]);

  const filteredModels = useMemo(() => {
    return models.filter(m => {
      const matchesSearch = !search ||
        m.id.toLowerCase().includes(search.toLowerCase()) ||
        (m.display_name?.toLowerCase().includes(search.toLowerCase()));
      const matchesProvider = selectedProvider === 'all' || m.provider === selectedProvider;
      return matchesSearch && matchesProvider;
    });
  }, [models, search, selectedProvider]);

  if (modelsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--neon-cyan)] animate-spin" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <SectionHeader
        icon={Cpu}
        title="AI Models"
        description={`${models.length} models available`}
      />

      {/* Search & Filter */}
      <Card className="p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models..."
              className={cn(
                'w-full pl-10 pr-4 py-2 rounded-lg',
                'bg-[var(--surface-tertiary)] border border-[var(--border-default)]',
                'text-[var(--text-primary)] text-sm',
                'placeholder:text-[var(--text-muted)]',
                'focus:outline-none focus:border-[var(--neon-cyan)]/50'
              )}
            />
          </div>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className={cn(
              'px-3 py-2 rounded-lg',
              'bg-[var(--surface-tertiary)] border border-[var(--border-default)]',
              'text-[var(--text-primary)] text-sm',
              'focus:outline-none focus:border-[var(--neon-cyan)]/50'
            )}
          >
            <option value="all">All Providers</option>
            {providers.filter(p => p !== 'all').map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <Button icon={Plus}>Add Custom</Button>
        </div>
      </Card>

      {/* Models List */}
      <Card className="overflow-hidden">
        <div className="divide-y divide-[var(--border-default)]">
          {filteredModels.map((model) => (
            <motion.div
              key={model.id}
              variants={itemVariants}
              className="flex items-center justify-between p-4 hover:bg-[var(--surface-tertiary)]/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-[var(--surface-tertiary)] flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-[var(--text-muted)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">
                      {model.display_name || model.id}
                    </span>
                    {model.available && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--success)]/10 text-[var(--success)]">
                        Available
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span>{model.id}</span>
                    <span>•</span>
                    <span className="capitalize">{model.provider}</span>
                    {model.context_window && (
                      <>
                        <span>•</span>
                        <span>{(model.context_window / 1000).toFixed(0)}k context</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                <IconButton icon={MoreHorizontal} size="sm" />
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

function SecuritySection({ securityStatus }: { securityStatus?: SecurityStatus }) {
  // Use securityStatus if provided, otherwise use defaults
  const [features, setFeatures] = useState({
    apiAuth: securityStatus?.features?.apiAuth ?? true,
    sessionSecurity: securityStatus?.features?.sessionSecurity ?? true,
    auditLogging: securityStatus?.audit_enabled ?? false,
    encryption: securityStatus?.features?.encryption ?? true
  });

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <SectionHeader
        icon={Shield}
        title="Security Settings"
        description="Configure authentication and security features"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-tertiary)] flex items-center justify-center">
                <Key className="w-5 h-5 text-[var(--neon-cyan)]" />
              </div>
              <div>
                <h3 className="font-medium text-[var(--text-primary)]">API Authentication</h3>
                <p className="text-sm text-[var(--text-muted)]">Require API key for access</p>
              </div>
            </div>
            <button
              onClick={() => setFeatures(f => ({ ...f, apiAuth: !f.apiAuth }))}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors duration-200',
                features.apiAuth ? 'bg-[var(--success)]' : 'bg-[var(--surface-elevated)]'
              )}
            >
              <span className={cn(
                'absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200',
                features.apiAuth ? 'left-6' : 'left-1'
              )} />
            </button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-tertiary)] flex items-center justify-center">
                <Clock className="w-5 h-5 text-[var(--neon-cyan)]" />
              </div>
              <div>
                <h3 className="font-medium text-[var(--text-primary)]">Session Security</h3>
                <p className="text-sm text-[var(--text-muted)]">Auto-expire inactive sessions</p>
              </div>
            </div>
            <button
              onClick={() => setFeatures(f => ({ ...f, sessionSecurity: !f.sessionSecurity }))}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors duration-200',
                features.sessionSecurity ? 'bg-[var(--success)]' : 'bg-[var(--surface-elevated)]'
              )}
            >
              <span className={cn(
                'absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200',
                features.sessionSecurity ? 'left-6' : 'left-1'
              )} />
            </button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-tertiary)] flex items-center justify-center">
                <Terminal className="w-5 h-5 text-[var(--neon-cyan)]" />
              </div>
              <div>
                <h3 className="font-medium text-[var(--text-primary)]">Audit Logging</h3>
                <p className="text-sm text-[var(--text-muted)]">Track all system activities</p>
              </div>
            </div>
            <button
              onClick={() => setFeatures(f => ({ ...f, auditLogging: !f.auditLogging }))}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors duration-200',
                features.auditLogging ? 'bg-[var(--success)]' : 'bg-[var(--surface-elevated)]'
              )}
            >
              <span className={cn(
                'absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200',
                features.auditLogging ? 'left-6' : 'left-1'
              )} />
            </button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-tertiary)] flex items-center justify-center">
                <Shield className="w-5 h-5 text-[var(--neon-cyan)]" />
              </div>
              <div>
                <h3 className="font-medium text-[var(--text-primary)]">Encryption</h3>
                <p className="text-sm text-[var(--text-muted)]">Encrypt sensitive data at rest</p>
              </div>
            </div>
            <button
              onClick={() => setFeatures(f => ({ ...f, encryption: !f.encryption }))}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors duration-200',
                features.encryption ? 'bg-[var(--success)]' : 'bg-[var(--surface-elevated)]'
              )}
            >
              <span className={cn(
                'absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200',
                features.encryption ? 'left-6' : 'left-1'
              )} />
            </button>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

function BudgetSection({ budgetData }: { budgetData?: { monthly_limit: number; monthly_spend: number } }) {
  const monthlyLimit = budgetData?.monthly_limit || 100;
  const monthlySpend = budgetData?.monthly_spend || 0;
  const percentage = Math.min((monthlySpend / monthlyLimit) * 100, 100);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <SectionHeader
        icon={Wallet}
        title="Budget Management"
        description="Monitor and control your API spending"
      />

      {/* Usage Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Monthly Spending</p>
            <p className="text-3xl font-bold text-[var(--text-primary)]">
              ${monthlySpend.toFixed(2)}
              <span className="text-lg font-normal text-[var(--text-muted)]"> / ${monthlyLimit}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[var(--text-muted)]">Remaining</p>
            <p className="text-xl font-semibold text-[var(--success)]">${(monthlyLimit - monthlySpend).toFixed(2)}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn(
              'h-full rounded-full transition-colors',
              percentage > 80 ? 'bg-[var(--error)]' : percentage > 60 ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'
            )}
          />
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2">{percentage.toFixed(1)}% of monthly limit used</p>
      </Card>

      {/* Budget Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Monthly Budget Limit
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
              <input
                type="number"
                defaultValue={monthlyLimit}
                className={cn(
                  'w-full pl-7 pr-3 py-2 rounded-lg',
                  'bg-[var(--surface-tertiary)] border border-[var(--border-default)]',
                  'text-[var(--text-primary)] text-sm',
                  'focus:outline-none focus:border-[var(--neon-cyan)]/50'
                )}
              />
            </div>
            <Button>Update</Button>
          </div>
        </Card>

        <Card className="p-5">
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Alert Threshold
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                defaultValue={80}
                className={cn(
                  'w-full px-3 py-2 rounded-lg',
                  'bg-[var(--surface-tertiary)] border border-[var(--border-default)]',
                  'text-[var(--text-primary)] text-sm',
                  'focus:outline-none focus:border-[var(--neon-cyan)]/50'
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">%</span>
            </div>
            <Button>Save</Button>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

function NetworkSection() {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <SectionHeader
        icon={Network}
        title="Network Settings"
        description="Configure A2A network and peer connections"
      />

      <div className="grid grid-cols-1 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-tertiary)] flex items-center justify-center">
                <Globe className="w-5 h-5 text-[var(--neon-cyan)]" />
              </div>
              <div>
                <h3 className="font-medium text-[var(--text-primary)]">A2A Network</h3>
                <p className="text-sm text-[var(--text-muted)]">Enable agent-to-agent communication</p>
              </div>
            </div>
            <button className="relative w-11 h-6 rounded-full bg-[var(--success)] transition-colors duration-200">
              <span className="absolute top-1 left-6 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200" />
            </button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-tertiary)] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[var(--neon-cyan)]" />
              </div>
              <div>
                <h3 className="font-medium text-[var(--text-primary)]">Auto Discovery</h3>
                <p className="text-sm text-[var(--text-muted)]">Automatically discover peers on the network</p>
              </div>
            </div>
            <button className="relative w-11 h-6 rounded-full bg-[var(--surface-elevated)] transition-colors duration-200">
              <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200" />
            </button>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

function SystemSection({ systemVersion, systemStatus }: { systemVersion?: { version: string }; systemStatus?: { uptime_seconds: number; agent_count: number } }) {
  const uptime = systemStatus?.uptime_seconds || 0;
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <SectionHeader
        icon={Server}
        title="System Information"
        description="View system status and configuration"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Version</p>
          <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">{systemVersion?.version || '1.0.0'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Uptime</p>
          <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">{hours}h {minutes}m</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Agents</p>
          <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">{systemStatus?.agent_count || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Status</p>
          <div className="flex items-center gap-2 mt-1">
            <StatusDot status="active" />
            <span className="text-lg font-semibold text-[var(--success)]">Healthy</span>
          </div>
        </Card>
      </div>

      {/* System Settings */}
      <Card className="p-6">
        <h3 className="font-medium text-[var(--text-primary)] mb-4">General Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-[var(--border-default)]">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-primary)]">Notifications</span>
            </div>
            <button className="relative w-11 h-6 rounded-full bg-[var(--success)] transition-colors duration-200">
              <span className="absolute top-1 left-6 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200" />
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[var(--border-default)]">
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-primary)]">Dark Mode</span>
            </div>
            <button className="relative w-11 h-6 rounded-full bg-[var(--success)] transition-colors duration-200">
              <span className="absolute top-1 left-6 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200" />
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <HardDrive className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-primary)]">Auto Cleanup</span>
            </div>
            <button className="relative w-11 h-6 rounded-full bg-[var(--surface-elevated)] transition-colors duration-200">
              <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ========================================
// MAIN SETTINGS COMPONENT
// ========================================

const menuItems: MenuItem[] = [
  { id: 'providers', label: 'Providers', icon: Key, description: 'API keys & connections' },
  { id: 'models', label: 'Models', icon: Cpu, description: 'Manage AI models' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Auth & encryption' },
  { id: 'budget', label: 'Budget', icon: Wallet, description: 'Spending limits' },
  { id: 'network', label: 'Network', icon: Network, description: 'A2A & peers' },
  { id: 'system', label: 'System', icon: Server, description: 'Status & settings' }
];

export function Settings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('providers');
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Provider state
  const [apiKey, setApiKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [highlightProvider, setHighlightProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  // Fetch data
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

  const { data: systemVersion } = useAuthQuery({
    queryKey: ['system-version'],
    queryFn: () => api.getVersion()
  });

  const { data: systemStatus } = useAuthQuery({
    queryKey: ['system-status'],
    queryFn: () => api.getSystemStatus()
  });

  // Mutations
  const saveProviderMutation = useMutation({
    mutationFn: ({ providerId, key }: { providerId: string; key: string }) =>
      api.saveProviderKey(providerId, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setApiKey('');
    }
  });

  const testProviderMutation = useMutation({
    mutationFn: async (providerId: string) => {
      setTestingProvider(providerId);
      try {
        const result = await api.testProvider(providerId);
        setTestResults(prev => ({ ...prev, [providerId]: { ...result, timestamp: Date.now() } }));
        return result;
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          [providerId]: {
            status: 'error',
            error: error instanceof Error ? error.message : 'Test failed',
            timestamp: Date.now()
          }
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
        await api.removeProviderKey(providerId);
      } else {
        if (selectedProvider === providerId && apiKey) {
          await api.saveProviderKey(providerId, apiKey);
        } else {
          setSelectedProvider(providerId);
          setApiKey('');
          setHighlightProvider(providerId);
          setTimeout(() => setHighlightProvider(null), 2000);
          throw new Error('Please enter an API key');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setApiKey('');
    }
  });

  const providers = Array.isArray(providersData?.providers) ? providersData.providers : [];
  const models = Array.isArray(modelsData?.models) ? modelsData.models : [];

  return (
    <div className="min-h-screen bg-[var(--void)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--void)]/80 backdrop-blur-xl border-b border-[var(--border-default)]">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-default)] flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-[var(--neon-cyan)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('settings.title')}</h1>
              <p className="text-xs text-[var(--text-muted)]">Configure your OpenFang instance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              onClick={() => queryClient.invalidateQueries()}
            >
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex">
        {/* Sidebar */}
        <motion.aside
          variants={sidebarVariants}
          initial="hidden"
          animate="visible"
          className={cn(
            'sticky top-[73px] h-[calc(100vh-73px)] border-r border-[var(--border-default)] bg-[var(--surface-secondary)]/50',
            isSidebarCollapsed ? 'w-16' : 'w-64'
          )}
        >
          <div className="p-3 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150',
                  activeSection === item.id
                    ? 'bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] hover:text-[var(--text-primary)]'
                )}
              >
                <item.icon className={cn('w-5 h-5 flex-shrink-0', activeSection === item.id && 'text-[var(--neon-cyan)]')} />
                {!isSidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium text-sm', activeSection === item.id && 'text-[var(--neon-cyan)]')}>
                      {item.label}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{item.description}</p>
                  </div>
                )}
                {!isSidebarCollapsed && activeSection === item.id && (
                  <ChevronRight className="w-4 h-4 text-[var(--neon-cyan)]" />
                )}
              </button>
            ))}
          </div>

          {/* Collapse Toggle */}
          <div className="absolute bottom-4 left-0 right-0 px-3">
            <button
              onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
              className="w-full flex items-center justify-center p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {isSidebarCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          </div>
        </motion.aside>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-auto">
          <motion.div
            key={activeSection}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            className="max-w-5xl"
          >
            {activeSection === 'providers' && (
              <ProvidersSection
                providers={providers}
                providersLoading={providersLoading}
                testResults={testResults}
                testingProvider={testingProvider}
                saveProviderMutation={saveProviderMutation}
                testProviderMutation={testProviderMutation}
                toggleProviderMutation={toggleProviderMutation}
                selectedProvider={selectedProvider}
                setSelectedProvider={setSelectedProvider}
                apiKey={apiKey}
                setApiKey={setApiKey}
                highlightProvider={highlightProvider}
              />
            )}
            {activeSection === 'models' && (
              <ModelsSection models={models} modelsLoading={modelsLoading} />
            )}
            {activeSection === 'security' && (
              <SecuritySection securityStatus={securityStatus} />
            )}
            {activeSection === 'budget' && (
              <BudgetSection budgetData={budgetData} />
            )}
            {activeSection === 'network' && (
              <NetworkSection />
            )}
            {activeSection === 'system' && (
              <SystemSection systemVersion={systemVersion} systemStatus={systemStatus} />
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
