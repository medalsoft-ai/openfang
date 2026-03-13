// Channels - Connection Nexus Style
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { cyberColors } from '@/lib/animations';
import {
  Radio, Loader2, CheckCircle2, AlertCircle, XCircle, Settings,
  Trash2, RefreshCw, Copy, ExternalLink, ChevronRight, ChevronLeft,
  Search, Signal, Wifi, WifiOff, FlaskConical
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

const categories = [
  { key: 'all', label: 'All', color: 'var(--neon-cyan)' },
  { key: 'messaging', label: 'Messaging', color: 'var(--neon-green)' },
  { key: 'social', label: 'Social', color: 'var(--neon-amber)' },
  { key: 'enterprise', label: 'Enterprise', color: 'var(--neon-magenta)' },
  { key: 'developer', label: 'Developer', color: 'var(--chart-purple)' },
  { key: 'notifications', label: 'Notifications', color: 'var(--chart-teal)' },
];

// Status indicator with signal animation
function StatusIndicator({ status }: { status: 'connected' | 'configured' | 'not_configured' | 'error' }) {
  const configs = {
    connected: { color: 'var(--neon-green)', icon: Signal, pulse: true },
    configured: { color: 'var(--neon-amber)', icon: Wifi, pulse: false },
    not_configured: { color: 'var(--text-muted)', icon: WifiOff, pulse: false },
    error: { color: 'var(--neon-magenta)', icon: AlertCircle, pulse: false },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: config.color }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: config.color }} />
        </span>
      )}
      <Icon className="w-4 h-4" style={{ color: config.color }} />
      <span className="text-xs font-mono uppercase" style={{ color: config.color }}>
        {status.replace('_', ' ')}
      </span>
    </div>
  );
}

// Channel card with nexus connection effect
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
    Easy: 'var(--neon-green)',
    Medium: 'var(--neon-amber)',
    Hard: 'var(--neon-magenta)',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
    >
      <SpotlightCard
        glowColor={status === 'connected' ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255,255,255,0.05)'}
        onClick={onConfigure}
        className="cursor-pointer h-full"
      >
        <div className="p-5 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--surface-secondary)] flex items-center justify-center text-2xl">
                {channel.icon}
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{channel.display_name}</h3>
                <p className="text-xs text-[var(--text-muted)] capitalize">{channel.category}</p>
              </div>
            </div>
            <StatusIndicator status={status} />
          </div>

          {/* Description */}
          <p className="text-sm text-[var(--text-muted)] mb-4 flex-1 line-clamp-2">
            {channel.description}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
            <span
              className="text-xs font-mono"
              style={{ color: difficultyColors[channel.difficulty] || 'var(--chart-gray)' }}
            >
              {channel.difficulty}
            </span>
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onConfigure();
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                status === 'connected'
                  ? 'bg-[var(--neon-green)]/10 text-[var(--neon-green)]'
                  : status === 'configured'
                  ? 'bg-[var(--neon-amber)]/10 text-[var(--neon-amber)]'
                  : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="w-3.5 h-3.5" />
              {status === 'connected' ? 'Manage' : 'Configure'}
            </motion.button>
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

export function Channels() {
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
            <h1 className="text-3xl font-bold">
              <NeonText color="cyan">Channels</NeonText>
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              {configuredCount} of {channels.length} connected
            </p>
          </div>

          <motion.button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className={cn('w-5 h-5', isLoading && 'animate-spin')} />
          </motion.button>
        </motion.div>

        {/* Category tabs */}
        <motion.div
          className="flex flex-wrap gap-1 mb-6 bg-[var(--surface-secondary)] rounded-xl p-1 w-fit"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
                categoryFilter === cat.key
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
              style={{
                backgroundColor: categoryFilter === cat.key ? `${cat.color}20` : 'transparent',
                color: categoryFilter === cat.key ? cat.color : undefined,
              }}
            >
              {cat.label}
            </button>
          ))}
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
            className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-xl pl-12 pr-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-primary)]/30"
          />
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[var(--neon-cyan)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AlertCircle className="w-12 h-12 text-[var(--neon-magenta)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Failed to load</h3>
            <p className="text-[var(--text-muted)] mb-4">{error.message || 'Could not load channels'}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Grid */}
        {!isLoading && !error && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
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
            <div className="w-20 h-20 rounded-3xl bg-[var(--surface-secondary)] flex items-center justify-center mx-auto mb-6">
              <Radio className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No channels found</h3>
            <p className="text-[var(--text-muted)]">Try a different search or category</p>
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

// Setup modal component with 3-step wizard
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
                ? 'bg-[var(--neon-cyan)] text-[var(--void)]'
                : s < step
                ? 'bg-[var(--neon-green)] text-[var(--void)]'
                : 'bg-[var(--surface-tertiary)] text-[var(--text-muted)]'
            )}
          >
            {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
          </div>
          {s < 3 && <div className="w-8 h-px bg-[var(--border-default)] mx-1" />}
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
      className="fixed inset-0 bg-[var(--void)]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-[var(--surface-secondary)] flex items-center justify-center text-3xl">
            {channel.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{channel.display_name}</h2>
            <p className="text-sm text-[var(--text-muted)]">{stepLabels[step - 1]}</p>
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
                    <label className="block text-xs text-[var(--text-muted)] mb-1.5">
                      {field.label}
                      {field.required && <span className="text-[var(--neon-magenta)] ml-1">*</span>}
                    </label>
                    <input
                      type={field.type === 'secret' ? 'password' : 'text'}
                      value={formValues[field.key] || ''}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      placeholder={field.env_var ? `Env: ${field.env_var}` : ''}
                      className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder-[var(--text-primary)]/30"
                    />
                  </div>
                ))}

                {/* Advanced fields toggle */}
                {advancedFields.length > 0 && (
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-[var(--neon-cyan)] hover:underline"
                  >
                    {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                  </button>
                )}

                {/* Advanced fields */}
                {showAdvanced && advancedFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-[var(--text-muted)] mb-1.5">
                      {field.label}
                      {field.required && <span className="text-[var(--neon-magenta)] ml-1">*</span>}
                      <span className="ml-1 text-[var(--text-muted)]">(Advanced)</span>
                    </label>
                    <input
                      type={field.type === 'secret' ? 'password' : 'text'}
                      value={formValues[field.key] || ''}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      placeholder={field.env_var ? `Env: ${field.env_var}` : ''}
                      className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder-[var(--text-primary)]/30"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Config template */}
            {channel.config_template && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--text-muted)]">Config Template</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(channel.config_template!)}
                    className="text-xs text-[var(--neon-cyan)] hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-[var(--void)]/30 text-xs text-[var(--text-secondary)] font-mono overflow-x-auto">
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
                <div className="w-16 h-16 rounded-full bg-[var(--neon-amber)]/20 flex items-center justify-center mx-auto">
                  <FlaskConical className="w-8 h-8 text-[var(--neon-amber)]" />
                </div>
                <h4 className="text-lg font-medium text-[var(--text-primary)]">Test Connection</h4>
                <p className="text-sm text-[var(--text-muted)]">
                  Verify that your configuration is correct by testing the connection.
                </p>
                {testResult && (
                  <div
                    className={cn(
                      'p-3 rounded-lg text-sm',
                      testResult.success
                        ? 'bg-[var(--neon-green)]/10 text-[var(--neon-green)]'
                        : 'bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)]'
                    )}
                  >
                    {testResult.message || (testResult.success ? 'Connection successful!' : 'Connection failed')}
                  </div>
                )}
                <motion.button
                  onClick={handleTest}
                  disabled={testing}
                  className="px-6 py-2.5 rounded-lg bg-[var(--neon-amber)] text-[var(--void)] font-medium disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {testing ? (
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 inline mr-2" />
                  )}
                  Test Connection
                </motion.button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-[var(--neon-green)]/20 flex items-center justify-center mx-auto">
                  <Signal className="w-8 h-8 text-[var(--neon-green)]" />
                </div>
                <h4 className="text-lg font-medium text-[var(--text-primary)]">WhatsApp QR Login</h4>
                <p className="text-sm text-[var(--text-muted)]">
                  Scan the QR code with your WhatsApp app to connect.
                </p>
                {qrSession?.qr_code ? (
                  <div className="p-4 rounded-xl bg-white">
                    <img
                      src={`data:image/png;base64,${qrSession.qr_code}`}
                      alt="WhatsApp QR Code"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                ) : qrPolling ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-[var(--neon-cyan)] animate-spin" />
                  </div>
                ) : (
                  <motion.button
                    onClick={handleStartQR}
                    className="px-6 py-2.5 rounded-lg bg-[var(--neon-green)] text-[var(--void)] font-medium"
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
            <div className="w-16 h-16 rounded-full bg-[var(--neon-green)]/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-[var(--neon-green)]" />
            </div>
            <h4 className="text-lg font-medium text-[var(--text-primary)]">All Set!</h4>
            <p className="text-sm text-[var(--text-muted)]">
              {channel.display_name} is now configured and ready to use.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-[var(--neon-green)]">
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
              className="px-4 py-2.5 rounded-lg bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)] font-medium"
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
                className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] font-medium disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                ) : (
                  <ChevronRight className="w-4 h-4 inline mr-2" />
                )}
                Continue
              </motion.button>
            </>
          ) : step === 2 ? (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
              >
                <ChevronLeft className="w-4 h-4 inline mr-2" />
                Back
              </button>
              {!isWhatsApp && (
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Skip
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Edit Config
              </button>
              <motion.button
                onClick={handleFinish}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--neon-green)] text-[var(--void)] font-medium"
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
