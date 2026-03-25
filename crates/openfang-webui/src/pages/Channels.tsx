// Channels - Claymorphism Design System
// Purple theme, soft 3D, rounded cards - consistent with Overview.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import {
  Radio, Loader2, CheckCircle2, AlertCircle, XCircle, Settings,
  Trash2, RefreshCw, Copy, ChevronRight, ChevronLeft,
  Search, Signal, Wifi, WifiOff, FlaskConical
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
  cardShadowHover: 'hover:shadow-[0_8px_24px_rgba(139,92,246,0.25)]',
  radius: 'rounded-2xl',
  radiusLg: 'rounded-3xl',
  textPrimary: 'text-[var(--text-primary)]',
  textMuted: 'text-[var(--text-secondary)]',
};

interface Channel {
  name: string;
  display_name: string;
  description: string;
  category: string;
  difficulty: string;
  setup_time: string;
  icon: string;
  configured: boolean;
  has_token: boolean;
  setup_type?: string;
  setup_steps?: string[];
  quick_setup?: string;
  config_template?: string;
  fields?: ChannelField[];
  connected?: boolean;
}

interface ChannelField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  value?: string;
  env_var?: string;
  advanced?: boolean;
}

// Category colors - violet theme
const categories = [
  { key: 'all', label: 'All', color: 'violet' },
  { key: 'messaging', label: 'Messaging', color: 'emerald' },
  { key: 'social', label: 'Social', color: 'amber' },
  { key: 'enterprise', label: 'Enterprise', color: 'violet' },
  { key: 'developer', label: 'Developer', color: 'purple' },
  { key: 'notifications', label: 'Notifications', color: 'violet' },
];

const categoryColors: Record<string, { bg: string; text: string }> = {
  violet: { bg: 'bg-[var(--primary-100)]', text: 'text-[var(--primary)]' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
};

// Status indicator with signal animation
function StatusIndicator({ status }: { status: 'connected' | 'configured' | 'not_configured' | 'error' }) {
  const configs = {
    connected: { color: 'text-emerald-600', bg: 'bg-emerald-100', icon: Signal, pulse: true },
    configured: { color: 'text-amber-600', bg: 'bg-amber-100', icon: Wifi, pulse: false },
    not_configured: { color: 'text-[var(--text-muted)]', bg: 'bg-[var(--surface-secondary)]', icon: WifiOff, pulse: false },
    error: { color: 'text-rose-600', bg: 'bg-rose-100', icon: AlertCircle, pulse: false },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full", config.bg.replace('bg-', 'bg-'))} style={{ backgroundColor: 'currentColor' }} />
          <span className={cn("relative inline-flex rounded-full h-2 w-2", config.bg)} />
        </span>
      )}
      <Icon className={cn("w-4 h-4", config.color)} />
      <span className={cn("text-xs font-medium capitalize", config.color)}>
        {status.replace('_', ' ')}
      </span>
    </div>
  );
}

// ============================================
// CHANNEL CARD COMPONENT
// ============================================
function ChannelCard({
  channel,
  onConfigure
}: {
  channel: Channel;
  onConfigure: () => void;
}) {
  const status: 'connected' | 'configured' | 'not_configured' = channel.connected
    ? 'connected'
    : channel.configured
    ? 'configured'
    : 'not_configured';

  const difficultyColors: Record<string, string> = {
    Easy: 'text-emerald-600',
    Medium: 'text-amber-600',
    Hard: 'text-rose-600',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      onClick={onConfigure}
      className={cn(
        clay.card,
        clay.cardShadow,
        clay.cardShadowHover,
        clay.radius,
        'cursor-pointer h-full transition-all duration-300'
      )}
    >
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-secondary)] flex items-center justify-center text-2xl">
              {channel.icon}
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">{channel.display_name}</h3>
              <p className="text-xs text-[var(--text-secondary)] capitalize">{channel.category}</p>
            </div>
          </div>
          <StatusIndicator status={status} />
        </div>

        {/* Description */}
        <p className="text-sm text-[var(--text-secondary)] mb-4 flex-1 line-clamp-2">
          {channel.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
          <span className={cn("text-xs font-medium", difficultyColors[channel.difficulty] || 'text-[var(--text-muted)]')}>
            {channel.difficulty}
          </span>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onConfigure();
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors',
              status === 'connected'
                ? 'bg-emerald-100 text-emerald-600'
                : status === 'configured'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]'
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings className="w-3.5 h-3.5" />
            {status === 'connected' ? 'Manage' : 'Configure'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN CHANNELS COMPONENT
// ============================================
export function Channels() {
  const { t } = useTranslation();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [setupModal, setSetupModal] = useState<Channel | null>(null);
  const queryClient = useQueryClient();
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: channels = [], isLoading, error, refetch } = useQuery<Channel[]>({
    queryKey: ['channels'],
    queryFn: async () => {
      const res = await api.get<{ channels: Channel[] }>('/api/channels');
      return (res.channels || []).map((ch) => ({
        ...ch,
        connected: ch.configured && ch.has_token,
      }));
    },
  });

  // Poll for status updates
  const refreshStatus = useCallback(async () => {
    try {
      const data = await api.get<{ channels: Channel[] }>('/api/channels');
      const byName: Record<string, Channel> = {};
      (data.channels || []).forEach((ch) => {
        byName[ch.name] = ch;
      });

      queryClient.setQueryData(['channels'], (old: Channel[] | undefined) => {
        if (!old) return old;
        return old.map((c) => {
          const fresh = byName[c.name];
          if (fresh) {
            return {
              ...c,
              configured: fresh.configured,
              has_token: fresh.has_token,
              connected: fresh.configured && fresh.has_token,
            };
          }
          return c;
        });
      });
    } catch (e) {
      console.warn('Channel refresh failed:', e);
    }
  }, [queryClient]);

  useEffect(() => {
    pollTimerRef.current = setInterval(refreshStatus, 15000);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [refreshStatus]);

  const filteredChannels = channels.filter((ch) => {
    if (categoryFilter !== 'all' && ch.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        ch.name.toLowerCase().includes(q) ||
        ch.display_name.toLowerCase().includes(q) ||
        ch.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const configuredCount = channels.filter((ch) => ch.configured).length;

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
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Channels</h1>
            <p className="text-[var(--text-secondary)] mt-1">
              {configuredCount} of {channels.length} connected
            </p>
          </div>

          <motion.button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-3 rounded-xl bg-white shadow-[0_2px_8px_rgba(139,92,246,0.1)] text-[var(--text-secondary)] hover:bg-violet-50 hover:text-[var(--primary)] transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className={cn('w-5 h-5', isLoading && 'animate-spin')} />
          </motion.button>
        </motion.div>

        {/* Category tabs */}
        <motion.div
          className="flex flex-wrap gap-1 mb-6 bg-white rounded-2xl p-1.5 shadow-[0_2px_8px_rgba(139,92,246,0.1)] w-fit"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {categories.map((cat) => {
            const colors = categoryColors[cat.color];
            return (
              <button
                key={cat.key}
                onClick={() => setCategoryFilter(cat.key)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all',
                  categoryFilter === cat.key
                    ? cn(colors.bg, colors.text)
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]'
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </motion.div>

        {/* Search */}
        <motion.div
          className="relative mb-6 max-w-md"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels..."
            className={cn(
              'w-full bg-white border-[3px] border-white shadow-[0_2px_8px_rgba(139,92,246,0.1)] rounded-xl pl-12 pr-4 py-3',
              'text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-violet-200 transition-all'
            )}
          />
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Failed to load</h3>
            <p className="text-[var(--text-secondary)] mb-4">{error.message || 'Could not load channels'}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] font-medium transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Grid */}
        {!isLoading && !error && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            layout
          >
            <AnimatePresence mode="popLayout">
              {filteredChannels.map((channel) => (
                <ChannelCard
                  key={channel.name}
                  channel={channel}
                  onConfigure={() => setSetupModal(channel)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredChannels.length === 0 && (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className={cn(
              'w-20 h-20 rounded-3xl bg-white flex items-center justify-center mx-auto mb-6',
              clay.cardShadow
            )}>
              <Radio className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No channels found</h3>
            <p className="text-[var(--text-secondary)]">Try a different search or category</p>
          </motion.div>
        )}
      </div>

      {/* Setup Modal */}
      <AnimatePresence>
        {setupModal && (
          <SetupModal
            channel={setupModal}
            onClose={() => setSetupModal(null)}
            onConfigured={() => {
              refreshStatus();
              queryClient.invalidateQueries({ queryKey: ['channels'] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// SETUP MODAL COMPONENT
// ============================================
function SetupModal({
  channel,
  onClose,
  onConfigured
}: {
  channel: Channel;
  onClose: () => void;
  onConfigured: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(channel.configured ? 3 : 1);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isWhatsApp, setIsWhatsApp] = useState(channel.name === 'whatsapp');
  const [qrSession, setQrSession] = useState<{ session_id: string; qr_code?: string; status: string } | null>(null);
  const [qrPolling, setQrPolling] = useState(false);

  const basicFields = channel.fields?.filter((f) => !f.advanced) || [];
  const advancedFields = channel.fields?.filter((f) => f.advanced) || [];

  // QR polling for WhatsApp
  useEffect(() => {
    if (!qrPolling || !qrSession?.session_id) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await api.getWhatsAppQRStatus(qrSession.session_id);
        if (status.status === 'connected' || status.connected) {
          setQrSession((prev) => prev ? { ...prev, status: 'connected' } : null);
          setQrPolling(false);
          setStep(3);
        } else if (status.qr_code) {
          setQrSession((prev) => prev ? { ...prev, qr_code: status.qr_code } : null);
        }
      } catch (e) {
        console.error('QR poll error:', e);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [qrPolling, qrSession?.session_id]);

  const handleStartQR = async () => {
    try {
      const result = await api.startWhatsAppQR();
      setQrSession(result);
      setQrPolling(true);
    } catch (e) {
      console.error('Failed to start QR:', e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.configureChannel(channel.name, formValues);
      if (isWhatsApp) {
        // For WhatsApp, start QR flow
        await handleStartQR();
      } else {
        // For other channels, proceed to verify step
        setStep(2);
      }
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await api.testChannel(channel.name);
      setTestResult(result);
      if (result.success) {
        setStep(3);
      }
    } catch (e) {
      setTestResult({ success: false, message: 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleRemove = async () => {
    try {
      await api.removeChannel(channel.name);
      onConfigured();
      onClose();
    } catch (e) {
      console.error('Failed to remove:', e);
    }
  };

  const handleFinish = () => {
    onConfigured();
    onClose();
  };

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
              s === step
                ? 'bg-[var(--primary)] text-white'
                : s < step
                ? 'bg-emerald-500 text-white'
                : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
            )}
          >
            {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
          </div>
          {s < 3 && <div className="w-8 h-px bg-[var(--surface-tertiary)] mx-1" />}
        </div>
      ))}
    </div>
  );

  // Step labels
  const stepLabels = ['Configure', 'Verify', 'Ready'];

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
          'bg-white border-[3px] border-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto',
          clay.cardShadow
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-[var(--surface-secondary)] flex items-center justify-center text-3xl">
            {channel.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{channel.display_name}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{stepLabels[step - 1]}</p>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator />

        {/* Step 1: Configure */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Form fields */}
            {basicFields.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-[var(--text-primary)]">Configuration</h4>
                {basicFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
                      {field.label}
                      {field.required && <span className="text-rose-500 ml-1">*</span>}
                    </label>
                    <input
                      type={field.type === 'secret' ? 'password' : 'text'}
                      value={formValues[field.key] || ''}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      placeholder={field.env_var ? `Env: ${field.env_var}` : ''}
                      className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-violet-300"
                    />
                  </div>
                ))}

                {/* Advanced fields toggle */}
                {advancedFields.length > 0 && (
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-[var(--primary)] hover:underline"
                  >
                    {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                  </button>
                )}

                {/* Advanced fields */}
                {showAdvanced && advancedFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
                      {field.label}
                      {field.required && <span className="text-rose-500 ml-1">*</span>}
                      <span className="ml-1 text-[var(--text-muted)]">(Advanced)</span>
                    </label>
                    <input
                      type={field.type === 'secret' ? 'password' : 'text'}
                      value={formValues[field.key] || ''}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      placeholder={field.env_var ? `Env: ${field.env_var}` : ''}
                      className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-violet-300"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Config template */}
            {channel.config_template && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--text-secondary)]">Config Template</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(channel.config_template!)}
                    className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-[var(--surface-secondary)] text-xs text-[var(--text-secondary)] font-mono overflow-x-auto">
                  {channel.config_template}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Verify */}
        {step === 2 && (
          <div className="space-y-4 text-center">
            {!isWhatsApp ? (
              <>
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                  <FlaskConical className="w-8 h-8 text-amber-600" />
                </div>
                <h4 className="text-lg font-medium text-[var(--text-primary)]">Test Connection</h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  Verify that your configuration is correct by testing the connection.
                </p>
                {testResult && (
                  <div
                    className={cn(
                      'p-3 rounded-xl text-sm',
                      testResult.success
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-rose-100 text-rose-600'
                    )}
                  >
                    {testResult.message || (testResult.success ? 'Connection successful!' : 'Connection failed')}
                  </div>
                )}
                <motion.button
                  onClick={handleTest}
                  disabled={testing}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {testing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Test Connection
                </motion.button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <Signal className="w-8 h-8 text-emerald-600" />
                </div>
                <h4 className="text-lg font-medium text-[var(--text-primary)]">WhatsApp QR Login</h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  Scan the QR code with your WhatsApp app to connect.
                </p>
                {qrSession?.qr_code ? (
                  <div className="p-4 rounded-xl bg-white border-2 border-[var(--border-subtle)]">
                    <img
                      src={`data:image/png;base64,${qrSession.qr_code}`}
                      alt="WhatsApp QR Code"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                ) : qrPolling ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                  </div>
                ) : (
                  <motion.button
                    onClick={handleStartQR}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Generate QR Code
                  </motion.button>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 3 && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h4 className="text-lg font-medium text-[var(--text-primary)]">All Set!</h4>
            <p className="text-sm text-[var(--text-secondary)]">
              {channel.display_name} is now configured and ready to use.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
              <Signal className="w-4 h-4" />
              <span>Connected</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          {step === 1 && channel.configured && (
            <motion.button
              onClick={handleRemove}
              className="px-4 py-2.5 rounded-xl bg-rose-100 text-rose-600 font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Trash2 className="w-4 h-4 inline mr-2" />
              Remove
            </motion.button>
          )}

          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] font-medium transition-colors"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Continue
              </motion.button>
            </>
          ) : step === 2 ? (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] font-medium transition-colors"
              >
                <ChevronLeft className="w-4 h-4 inline mr-2" />
                Back
              </button>
              {!isWhatsApp && (
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  Skip
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] font-medium transition-colors"
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Edit Config
              </button>
              <motion.button
                onClick={handleFinish}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CheckCircle2 className="w-4 h-4 inline mr-2" />
                Done
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Channels;
