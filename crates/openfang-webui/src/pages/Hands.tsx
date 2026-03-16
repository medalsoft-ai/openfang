// Hands - Multi-tab with Setup Wizard and Active Instances
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import type { HandInstance, HandStats, HandBrowserState, Hand, HandRequirement, HandSetting, InstallDepResult } from '@/api/types';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { toaster } from '@/lib/toast';
import {
  HandIcon, Check, X, AlertCircle, Loader2, RefreshCw,
  ChevronRight, ExternalLink, Terminal, Shield, Settings,
  Play, Pause, Square, BarChart3, Globe, Package, ChevronLeft,
  Apple, Monitor, Server, TerminalSquare, Eye, Clock, Copy,
  CheckCircle2, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Detect platform
function getPlatform(): 'macos' | 'windows' | 'linux' {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac') || ua.includes('darwin')) return 'macos';
  if (ua.includes('win')) return 'windows';
  return 'linux';
}

// Format metric value (from Alpine.js formatMetric)
function formatMetric(m: { value: unknown; format?: string } | null | undefined): string {
  if (!m || m.value === null || m.value === undefined) return '-';
  if (m.format === 'duration') {
    const secs = parseInt(String(m.value), 10);
    if (isNaN(secs)) return String(m.value);
    const h = Math.floor(secs / 3600);
    const min = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${min}m`;
    if (min > 0) return `${min}m ${s}s`;
    return `${s}s`;
  }
  if (m.format === 'number') {
    const n = parseFloat(String(m.value));
    if (isNaN(n)) return String(m.value);
    return n.toLocaleString();
  }
  return String(m.value);
}

// Get install command for requirement and platform
function getInstallCmd(req: HandRequirement, platform: string): string | null {
  if (!req?.install) return null;
  const inst = req.install;
  if (platform === 'macos' && inst.macos) return inst.macos;
  if (platform === 'windows' && inst.windows) return inst.windows;
  if (platform === 'linux') {
    return inst.linux_apt || inst.linux_dnf || inst.linux_pacman || inst.pip || null;
  }
  if (platform === 'pip') return inst.pip || null;
  return inst.pip || inst.macos || inst.windows || inst.linux_apt || null;
}

// Get Linux variants for requirement
function getLinuxVariants(req: HandRequirement): Array<{ label: string; cmd: string }> | null {
  if (!req?.install) return null;
  const inst = req.install;
  const variants: Array<{ label: string; cmd: string }> = [];
  if (inst.linux_apt) variants.push({ label: 'apt', cmd: inst.linux_apt });
  if (inst.linux_dnf) variants.push({ label: 'dnf', cmd: inst.linux_dnf });
  if (inst.linux_pacman) variants.push({ label: 'pacman', cmd: inst.linux_pacman });
  if (inst.pip) variants.push({ label: 'pip', cmd: inst.pip });
  return variants.length > 0 ? variants : null;
}

// ==================== Components ====================

// Hand Card Component
function HandCard({
  hand, onActivate, onDetail, isActive
}: {
  hand: Hand;
  onActivate: () => void;
  onDetail: () => void;
  isActive?: boolean;
}) {
  const allSatisfied = hand.requirements?.every((r) => r.satisfied) ?? true;
  const satisfiedCount = hand.requirements?.filter((r) => r.satisfied).length ?? 0;

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '1.4rem' }}>{hand.icon}</span>
            <div className="card-header" style={{ margin: 0 }}>{hand.display_name || hand.name}</div>
          </div>
          <span className={cn('badge', isActive ? 'badge-success' : allSatisfied ? 'badge-success' : 'badge-dim')}>
            {isActive ? 'Running' : allSatisfied ? 'Ready' : 'Setup needed'}
          </span>
        </div>
        <div className="card-meta">{hand.description}</div>

        {/* Requirements */}
        {hand.requirements?.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-dim mb-1" style={{ letterSpacing: '0.5px' }}>REQUIREMENTS</div>
            {hand.requirements.map((req) => (
              <div key={req.key} className="flex items-center gap-2 text-xs" style={{ padding: '2px 0' }}>
                <span style={{ color: req.satisfied ? 'var(--success)' : 'var(--danger)' }}>
                  {req.satisfied ? '✓' : '✗'}
                </span>
                <span>{req.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tools & Metrics */}
        <div className="mt-2">
          <span className="text-xs text-dim">{hand.tools?.length || 0} tool(s)</span>
          <span className="text-xs text-dim" style={{ marginLeft: '8px' }}>{hand.dashboard_metrics || 0} metric(s)</span>
          {hand.category && (
            <span className="category-badge" style={{ marginLeft: '8px', fontSize: '0.65rem' }}>{hand.category}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mt-3">
          <button className="btn btn-ghost btn-sm" onClick={onDetail}>Details</button>
          {isActive ? (
            <button
              className="btn btn-success btn-sm"
              onClick={onActivate}
              title="This hand is already running. Click to view active instances."
            >
              View Active
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={onActivate}
              disabled={!allSatisfied}
            >
              Activate
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Detail Modal Component
function DetailModal({
  hand, onClose, onActivate
}: {
  hand: Hand | null;
  onClose: () => void;
  onActivate: (hand: Hand) => void;
}) {
  if (!hand) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="modal"
        style={{ maxWidth: '600px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3><span>{hand.icon}</span> <span>{hand.display_name || hand.name}</span></h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="mb-3">
          <p>{hand.description}</p>
        </div>

        {/* Agent Config */}
        <div className="mb-3">
          <div className="text-xs text-dim mb-1" style={{ letterSpacing: '0.5px' }}>AGENT CONFIG</div>
          {hand.agent ? (
            <div className="text-sm">
              <div className="flex justify-between" style={{ padding: '2px 0' }}>
                <span className="text-dim">Provider</span>
                <span>{hand.agent.provider || 'default'}</span>
              </div>
              <div className="flex justify-between" style={{ padding: '2px 0' }}>
                <span className="text-dim">Model</span>
                <span>{hand.agent.model || 'default'}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-dim">No agent config</p>
          )}
        </div>

        {/* Requirements */}
        <div className="mb-3">
          <div className="text-xs text-dim mb-1" style={{ letterSpacing: '0.5px' }}>REQUIREMENTS</div>
          {(hand.requirements || []).map((req) => (
            <div key={req.key} className="flex items-center gap-2 text-sm" style={{ padding: '3px 0' }}>
              <span style={{ color: req.satisfied ? 'var(--success)' : 'var(--danger)' }}>
                {req.satisfied ? '✓' : '✗'}
              </span>
              <span>{req.label}</span>
              {req.check_value && (
                <code className="text-xs text-dim" style={{ marginLeft: 'auto' }}>{req.check_value}</code>
              )}
            </div>
          ))}
        </div>

        {/* Tools */}
        <div className="mb-3">
          <div className="text-xs text-dim mb-1" style={{ letterSpacing: '0.5px' }}>TOOLS</div>
          <div className="flex flex-wrap gap-1">
            {(hand.tools || []).map((tool) => (
              <span key={tool} className="category-badge" style={{ fontSize: '0.7rem' }}>{tool}</span>
            ))}
          </div>
        </div>

        {/* Dashboard Metrics */}
        {hand.dashboard && hand.dashboard.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-dim mb-1" style={{ letterSpacing: '0.5px' }}>DASHBOARD METRICS</div>
            {hand.dashboard.map((m) => (
              <div key={m.memory_key} className="text-sm" style={{ padding: '2px 0' }}>
                <span>{m.label}</span> <code className="text-xs text-dim">({m.format})</code>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            className="btn btn-primary btn-block"
            onClick={() => { onClose(); onActivate(hand); }}
          >
            Activate
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Install Progress Panel Component
function InstallProgressPanel({
  progress
}: {
  progress: {
    status: 'installing' | 'done' | 'error';
    current: number;
    total: number;
    currentLabel?: string;
    results: InstallDepResult[];
    error?: string | null;
  } | null;
}) {
  if (!progress) return null;

  const getResultIcon = (status: string) => {
    if (status === 'installed' || status === 'already_installed') return '✓';
    if (status === 'error' || status === 'timeout') return '✗';
    return '•';
  };

  const getResultClass = (status: string) => {
    if (status === 'installed' || status === 'already_installed') return 'dep-met';
    if (status === 'error' || status === 'timeout') return 'dep-missing';
    return '';
  };

  return (
    <div className="install-progress-panel" style={{
      background: 'var(--surface-secondary)',
      borderRadius: '8px',
      padding: '16px',
      marginTop: '16px',
      border: '1px solid var(--border-subtle)'
    }}>
      {/* Header */}
      <div className="install-progress-header" style={{ marginBottom: '12px' }}>
        {progress.status === 'installing' && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-bold">Installing dependencies...</span>
          </div>
        )}
        {progress.status === 'done' && !progress.error && (
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--green)', fontSize: '16px' }}>✓</span>
            <span className="text-sm font-bold" style={{ color: 'var(--green)' }}>Installation complete!</span>
          </div>
        )}
        {progress.error && (
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--red)', fontSize: '16px' }}>✗</span>
            <span className="text-sm" style={{ color: 'var(--red)' }}>{progress.error}</span>
          </div>
        )}
      </div>

      {/* Results */}
      {progress.results.length > 0 && (
        <div className="install-results-list">
          {progress.results.map((r) => (
            <div
              key={r.key}
              className={cn('install-result-row', getResultClass(r.status))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 0',
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              <span className="install-result-icon">{getResultIcon(r.status)}</span>
              <span className="text-sm">{r.key}</span>
              {r.message && (
                <span className="text-xs text-dim" style={{ marginLeft: 'auto' }}>{r.message}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Setup Wizard Modal Component
function SetupWizardModal({
  hand, platform, onClose, onActivate, onInstallDeps
}: {
  hand: Hand | null;
  platform: string;
  onClose: () => void;
  onActivate: (hand: Hand, settings: Record<string, string>) => void;
  onInstallDeps: (handId: string) => Promise<{
    results?: InstallDepResult[];
    requirements?: HandRequirement[];
    requirements_met?: boolean;
  }>;
}) {
  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [installing, setInstalling] = useState(false);
  const [checking, setChecking] = useState(false);
  const [activating, setActivating] = useState(false);
  const [currentHand, setCurrentHand] = useState<Hand | null>(hand);
  const [installProgress, setInstallProgress] = useState<{
    status: 'installing' | 'done' | 'error';
    current: number;
    total: number;
    results: InstallDepResult[];
    error?: string | null;
  } | null>(null);
  const [installPlatforms, setInstallPlatforms] = useState<Record<string, string>>({});
  const [clipboardMsg, setClipboardMsg] = useState<string | null>(null);

  // Initialize settings with defaults and platform
  useEffect(() => {
    if (hand) {
      setCurrentHand(hand);
      const defaults: Record<string, string> = {};
      hand.settings?.forEach((s) => {
        if (s.default) defaults[s.key] = s.default;
      });
      setSettings(defaults);

      // Initialize platform selections for each requirement
      const platforms: Record<string, string> = {};
      hand.requirements?.forEach((r) => {
        platforms[r.key] = platform;
      });
      setInstallPlatforms(platforms);

      // Set initial step
      const hasReqs = hand.requirements && hand.requirements.length > 0;
      setStep(hasReqs ? 1 : 2);
    }
  }, [hand, platform]);

  if (!currentHand) return null;

  const hasReqs = currentHand.requirements?.length > 0;
  const hasSettings = currentHand.settings && currentHand.settings.length > 0;
  const allReqsMet = currentHand.requirements?.every((r) => r.satisfied) ?? true;
  const reqsMetCount = currentHand.requirements?.filter((r) => r.satisfied).length ?? 0;
  const reqsTotal = currentHand.requirements?.length ?? 0;

  // Step navigation
  const goNext = () => {
    if (step === 1 && hasSettings) {
      setStep(2);
    } else if (step === 1) {
      setStep(3);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const goBack = () => {
    if (step === 3 && hasSettings) {
      setStep(2);
    } else if (step === 3) {
      setStep(hasReqs ? 1 : 2);
    } else if (step === 2 && hasReqs) {
      setStep(1);
    }
  };

  // Install dependencies
  const handleInstall = async () => {
    setInstalling(true);
    setInstallProgress({
      status: 'installing',
      current: 0,
      total: reqsTotal - reqsMetCount,
      results: []
    });

    try {
      const data = await onInstallDeps(currentHand.id);
      const results = data.results || [];

      setInstallProgress({
        status: 'done',
        current: results.length,
        total: reqsTotal - reqsMetCount,
        results
      });

      // Update requirements from server response
      if (data.requirements) {
        setCurrentHand({
          ...currentHand,
          requirements: data.requirements,
          requirements_met: data.requirements_met ?? false
        });
      }

      // Auto-advance after delay if all satisfied
      if (data.requirements_met) {
        setTimeout(() => {
          setInstallProgress(null);
          goNext();
        }, 1500);
      }
    } catch (err) {
      setInstallProgress({
        status: 'error',
        current: 0,
        total: reqsTotal - reqsMetCount,
        results: [],
        error: (err as Error).message || 'Installation failed'
      });
    } finally {
      setInstalling(false);
    }
  };

  // Recheck dependencies
  const handleRecheck = async () => {
    setChecking(true);
    try {
      const data = await api.checkHandDeps(currentHand.id);
      if (data.requirements) {
        setCurrentHand({
          ...currentHand,
          requirements: data.requirements.map((r, i) => ({
            ...currentHand.requirements[i],
            satisfied: r.satisfied
          })),
          requirements_met: data.requirements.every((r) => r.satisfied)
        });
      }
    } catch (err) {
      toaster.error('Check failed: ' + (err as Error).message);
    } finally {
      setChecking(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setClipboardMsg(text);
      setTimeout(() => setClipboardMsg(null), 2000);
    });
  };

  // Get setting display value for summary
  const getSettingDisplayValue = (setting: HandSetting): string => {
    const val = settings[setting.key] || setting.default || '';
    if (setting.setting_type === 'toggle') {
      return val === 'true' ? 'Enabled' : 'Disabled';
    }
    if (setting.setting_type === 'select' && setting.options) {
      const opt = setting.options.find((o) => o.value === val);
      return opt?.label || val || '-';
    }
    return val || '-';
  };

  // Step titles
  const stepTitles = ['Dependencies', 'Configure', 'Launch'];
  const actualStepTitle = step === 1 && !hasReqs ? stepTitles[1] :
                          step === 2 && !hasReqs ? stepTitles[2] :
                          stepTitles[step - 1];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="hand-wizard"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="hand-wizard-header">
          <span className="wizard-icon">{currentHand.icon}</span>
          <div>
            <div className="wizard-title">Set up {currentHand.display_name || currentHand.name}</div>
            <div className="wizard-subtitle">{currentHand.description}</div>
          </div>
          <button className="wizard-close" onClick={onClose}>×</button>
        </div>

        {/* Step Indicators */}
        <div className="hand-steps">
          {hasReqs && (
            <>
              <div className={cn('hand-step-item', { active: step === 1, done: step > 1 })}>
                <div className="hand-step-num">{step > 1 ? '✓' : '1'}</div>
                <div className="hand-step-label">Dependencies</div>
              </div>
              <div className={cn('hand-step-line', { done: step > 1 })} />
            </>
          )}
          <div className={cn('hand-step-item', { active: step === (hasReqs ? 2 : 1), done: step > (hasReqs ? 2 : 1) })}>
            <div className="hand-step-num">{step > (hasReqs ? 2 : 1) ? '✓' : (hasReqs ? '2' : '1')}</div>
            <div className="hand-step-label">Configure</div>
          </div>
          <div className={cn('hand-step-line', { done: step > (hasReqs ? 2 : 1) })} />
          <div className={cn('hand-step-item', { active: step === (hasReqs ? 3 : 2) })}>
            <div className="hand-step-num">{hasReqs ? '3' : '2'}</div>
            <div className="hand-step-label">Launch</div>
          </div>
        </div>

        {/* Step 1: Dependencies */}
        {step === 1 && hasReqs && (
          <div className="hand-wizard-body">
            {(currentHand.requirements || []).map((req) => {
              const reqPlatform = installPlatforms[req.key] || platform;
              const installCmd = getInstallCmd(req, reqPlatform);
              const linuxVariants = getLinuxVariants(req);

              return (
                <div key={req.key} className={cn('dep-card', req.satisfied ? 'dep-met' : 'dep-missing')} style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '12px',
                  background: req.satisfied ? 'rgba(0, 255, 127, 0.05)' : 'var(--surface-secondary)'
                }}>
                  <div className="dep-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div className={cn('dep-status-icon', req.satisfied ? 'met' : 'missing', checking ? 'checking' : '')} style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: req.satisfied ? 'var(--success)' : 'var(--danger)',
                      color: 'white',
                      fontSize: '12px'
                    }}>
                      {req.satisfied ? '✓' : '✗'}
                    </div>
                    <span className="dep-card-title font-medium">{req.label}</span>
                    {req.install?.estimated_time && (
                      <span className="dep-time-badge text-xs text-dim" style={{ marginLeft: 'auto' }}>{req.install.estimated_time}</span>
                    )}
                  </div>

                  {req.description && (
                    <div className="dep-card-desc text-xs text-dim" style={{ marginBottom: '8px' }}>{req.description}</div>
                  )}

                  {/* Satisfied */}
                  {req.satisfied && (
                    <div className="dep-met-msg text-sm" style={{ color: 'var(--success)' }}>✓ Detected on your system</div>
                  )}

                  {/* Not satisfied */}
                  {!req.satisfied && (
                    <div>
                      {/* Binary/EnvVar install commands */}
                      {req.type !== 'ApiKey' && req.install && (req.install.macos || req.install.windows || req.install.linux_apt) && (
                        <div className="install-block" style={{ marginTop: '8px' }}>
                          {/* Platform pills */}
                          <div className="install-platform-pills" style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            {req.install.macos && (
                              <button
                                className={cn('install-platform-pill', { active: reqPlatform === 'macos' })}
                                onClick={() => setInstallPlatforms({ ...installPlatforms, [req.key]: 'macos' })}
                                style={{
                                  padding: '4px 12px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-subtle)',
                                  background: reqPlatform === 'macos' ? 'var(--accent)' : 'transparent'
                                }}
                              >
                                macOS
                              </button>
                            )}
                            {req.install.windows && (
                              <button
                                className={cn('install-platform-pill', { active: reqPlatform === 'windows' })}
                                onClick={() => setInstallPlatforms({ ...installPlatforms, [req.key]: 'windows' })}
                                style={{
                                  padding: '4px 12px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-subtle)',
                                  background: reqPlatform === 'windows' ? 'var(--accent)' : 'transparent'
                                }}
                              >
                                Windows
                              </button>
                            )}
                            {(req.install.linux_apt || req.install.linux_dnf || req.install.linux_pacman) && (
                              <button
                                className={cn('install-platform-pill', { active: reqPlatform === 'linux' })}
                                onClick={() => setInstallPlatforms({ ...installPlatforms, [req.key]: 'linux' })}
                                style={{
                                  padding: '4px 12px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-subtle)',
                                  background: reqPlatform === 'linux' ? 'var(--accent)' : 'transparent'
                                }}
                              >
                                Linux
                              </button>
                            )}
                            {req.install.pip && !req.install.macos && (
                              <button
                                className={cn('install-platform-pill', { active: reqPlatform === 'pip' })}
                                onClick={() => setInstallPlatforms({ ...installPlatforms, [req.key]: 'pip' })}
                                style={{
                                  padding: '4px 12px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-subtle)',
                                  background: reqPlatform === 'pip' ? 'var(--accent)' : 'transparent'
                                }}
                              >
                                pip
                              </button>
                            )}
                          </div>

                          {/* Install command */}
                          {installCmd && (
                            <div className="install-cmd" style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: 'var(--void)',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                              fontSize: '12px'
                            }}>
                              <code style={{ flex: 1, overflow: 'auto' }}>{installCmd}</code>
                              <button
                                className={cn('copy-btn', { copied: clipboardMsg === installCmd })}
                                onClick={() => copyToClipboard(installCmd)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-subtle)',
                                  background: clipboardMsg === installCmd ? 'var(--success)' : 'transparent'
                                }}
                              >
                                {clipboardMsg === installCmd ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Install steps */}
                      {req.install?.steps && req.install.steps.length > 0 && req.type !== 'ApiKey' && (
                        <ol className="api-key-steps" style={{ marginTop: '8px', paddingLeft: '20px' }}>
                          {req.install.steps.map((step, i) => (
                            <li key={i} className="text-xs text-dim">{step}</li>
                          ))}
                        </ol>
                      )}

                      {/* API Key type */}
                      {req.type === 'ApiKey' && req.install && (
                        <div>
                          {req.install.steps && req.install.steps.length > 0 && (
                            <ol className="api-key-steps" style={{ paddingLeft: '20px' }}>
                              {req.install.steps.map((step, i) => (
                                <li key={i} className="text-xs text-dim">{step}</li>
                              ))}
                            </ol>
                          )}
                          {req.install?.env_example && (
                            <div className="install-block" style={{ marginTop: '8px' }}>
                              <div className="install-cmd" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'var(--void)',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                fontFamily: 'monospace',
                                fontSize: '12px'
                              }}>
                                <code style={{ flex: 1, overflow: 'auto' }}>{req.install.env_example}</code>
                                <button
                                  className={cn('copy-btn', { copied: clipboardMsg === req.install.env_example })}
                                  onClick={() => req.install?.env_example && copyToClipboard(req.install.env_example)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-subtle)',
                                    background: clipboardMsg === req.install.env_example ? 'var(--success)' : 'transparent'
                                  }}
                                >
                                  {clipboardMsg === req.install.env_example ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2 mt-2">
                            {req.install.signup_url && (
                              <a
                                href={req.install.signup_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary btn-sm"
                              >
                                Get API Key →
                              </a>
                            )}
                            {req.install.docs_url && (
                              <a
                                href={req.install.docs_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost btn-sm"
                              >
                                Docs
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Manual download link */}
                      {req.install?.manual_url && req.type !== 'ApiKey' && (
                        <div style={{ marginTop: '6px' }}>
                          <a
                            href={req.install.manual_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs"
                            style={{ color: 'var(--accent)' }}
                          >
                            Manual download →
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Install Progress */}
            <InstallProgressPanel progress={installProgress} />

            {/* Progress bar */}
            <div className="dep-progress" style={{ marginTop: '16px' }}>
              <div className="dep-progress-label" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>{reqsMetCount} of {reqsTotal} ready</span>
                <span className="text-dim">{allReqsMet ? 'All set!' : 'Install missing dependencies above'}</span>
              </div>
              <div className="dep-progress-bar" style={{
                height: '4px',
                background: 'var(--surface-elevated)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div
                  className="dep-progress-fill"
                  style={{
                    width: `${reqsTotal ? Math.round((reqsMetCount / reqsTotal) * 100) : 0}%`,
                    height: '100%',
                    background: 'var(--success)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Configure */}
        {((step === 2 && hasReqs) || (step === 1 && !hasReqs)) && (
          <div className="hand-wizard-body">
            {!hasSettings ? (
              <div className="text-sm text-dim" style={{ textAlign: 'center', padding: '20px 0' }}>
                No configuration needed for this hand. Click Next to continue.
              </div>
            ) : (
              (currentHand.settings || []).map((setting) => (
                <div key={setting.key} className="mb-4">
                  <div className="text-xs text-dim mb-1" style={{ letterSpacing: '0.5px', textTransform: 'uppercase' }}>{setting.label}</div>
                  {setting.description && (
                    <div className="text-xs text-dim mb-2">{setting.description}</div>
                  )}

                  {/* Select type: option cards */}
                  {setting.setting_type === 'select' && setting.options && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {setting.options.map((opt) => (
                        <div
                          key={opt.value}
                          className={cn('setting-option-card', { 'setting-option-selected': settings[setting.key] === opt.value })}
                          onClick={() => setSettings({ ...settings, [setting.key]: opt.value })}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            border: `1px solid ${settings[setting.key] === opt.value ? 'var(--accent)' : 'var(--border-subtle)'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            background: settings[setting.key] === opt.value ? 'rgba(0, 240, 255, 0.1)' : 'transparent'
                          }}
                        >
                          <div>
                            <div className="text-sm">{opt.label}</div>
                            {opt.provider_env && (
                              <div className="text-xs text-dim">{opt.provider_env}</div>
                            )}
                            {opt.binary && (
                              <div className="text-xs text-dim">Requires: {opt.binary}</div>
                            )}
                          </div>
                          <span className={cn('badge', opt.available ? 'badge-success' : 'badge-dim')} style={{ fontSize: '0.65rem' }}>
                            {opt.available ? 'Ready' : 'Missing'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Toggle type */}
                  {setting.setting_type === 'toggle' && (
                    <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings[setting.key] === 'true'}
                        onChange={(e) => setSettings({ ...settings, [setting.key]: e.target.checked ? 'true' : 'false' })}
                      />
                      <span className="text-sm">{settings[setting.key] === 'true' ? 'Enabled' : 'Disabled'}</span>
                    </label>
                  )}

                  {/* Text type */}
                  {setting.setting_type === 'text' && (
                    <input
                      type="text"
                      className="form-input"
                      value={settings[setting.key] || ''}
                      onChange={(e) => setSettings({ ...settings, [setting.key]: e.target.value })}
                      placeholder={setting.label}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--surface-secondary)' }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Step 3: Launch */}
        {((step === 3 && hasReqs) || (step === 2 && !hasReqs)) && (
          <div className="hand-wizard-body">
            <div className="launch-summary" style={{
              textAlign: 'center',
              padding: '20px',
              background: 'var(--surface-secondary)',
              borderRadius: '8px'
            }}>
              <div className="launch-summary-icon" style={{ fontSize: '2rem', marginBottom: '8px' }}>{currentHand.icon}</div>
              <div className="launch-summary-title font-bold" style={{ marginBottom: '16px' }}>{currentHand.display_name || currentHand.name}</div>

              <div className="launch-summary-rows" style={{ textAlign: 'left' }}>
                {/* Dependencies summary */}
                {hasReqs && (
                  <div className="launch-summary-row flex justify-between text-sm" style={{ padding: '4px 0' }}>
                    <span className="row-label text-dim">Dependencies</span>
                    <span className="row-check" style={{ color: 'var(--success)' }}>{reqsMetCount}/{reqsTotal} ✓</span>
                  </div>
                )}

                {/* Settings summary */}
                {(currentHand.settings || []).map((setting) => (
                  <div key={setting.key} className="launch-summary-row flex justify-between text-sm" style={{ padding: '4px 0' }}>
                    <span className="row-label text-dim">{setting.label}</span>
                    <span className="row-value">{getSettingDisplayValue(setting)}</span>
                  </div>
                ))}

                {/* Provider / Model */}
                {currentHand.agent && (
                  <div className="launch-summary-row flex justify-between text-sm" style={{ padding: '4px 0' }}>
                    <span className="row-label text-dim">Model</span>
                    <span className="row-value">{(currentHand.agent.provider || 'default')} / {(currentHand.agent.model || 'default')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="hand-wizard-nav" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            {(step > 1 || (step === 2 && !hasReqs)) && (
              <button className="btn btn-ghost" onClick={goBack} style={{ marginLeft: '4px' }}>Back</button>
            )}
          </div>
          <div className="flex gap-2">
            {/* Step 1: Install + Verify + Next */}
            {step === 1 && hasReqs && (
              <>
                {!allReqsMet && (
                  <button
                    className="btn btn-success"
                    onClick={handleInstall}
                    disabled={installing}
                  >
                    {installing ? 'Installing...' : 'Install All'}
                  </button>
                )}
                <button
                  className="btn btn-ghost"
                  onClick={handleRecheck}
                  disabled={checking}
                >
                  {checking ? 'Checking...' : 'Verify'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={goNext}
                  disabled={!allReqsMet}
                >
                  Next
                </button>
              </>
            )}

            {/* Step 2: Next */}
            {((step === 2 && hasReqs) || (step === 1 && !hasReqs)) && (
              <button className="btn btn-primary" onClick={goNext}>Next</button>
            )}

            {/* Step 3: Activate */}
            {((step === 3 && hasReqs) || (step === 2 && !hasReqs)) && (
              <button
                className="btn btn-success btn-launch"
                onClick={() => {
                  setActivating(true);
                  onActivate(currentHand, settings);
                }}
                disabled={activating || !allReqsMet}
              >
                {activating ? 'Activating...' : `Activate ${currentHand.name}`}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Instance Card Component
function InstanceCard({
  instance, hands, onPause, onResume, onDeactivate, onViewBrowser
}: {
  instance: HandInstance;
  hands: Hand[];
  onPause: () => void;
  onResume: () => void;
  onDeactivate: () => void;
  onViewBrowser?: () => void;
}) {
  const [stats, setStats] = useState<HandStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const isBrowserHand = instance.hand_id === 'browser';
  const hand = hands.find((h) => h.id === instance.hand_id);
  const handIcon = hand?.icon || '🖐️';

  const loadStats = async () => {
    if (loadingStats || stats) return;
    setLoadingStats(true);
    try {
      const data = await api.getHandInstanceStats(instance.instance_id);
      setStats(data);
    } catch (err) {
      setStats({ error: (err as Error).message || 'Could not load stats' } as HandStats);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '1.4rem' }}>{handIcon}</span>
            <div className="card-header" style={{ margin: 0 }}>{instance.agent_name || instance.hand_id}</div>
          </div>
          <span className={cn('badge',
            instance.status === 'Active' ? 'badge-success' :
            instance.status === 'Paused' ? 'badge-dim' :
            instance.status?.startsWith('Error') ? 'badge-warn' :
            'badge-info'
          )}>
            {instance.status}
          </span>
        </div>

        <div className="text-xs text-dim">Activated: {new Date(instance.activated_at).toLocaleString()}</div>
        {instance.agent_id && (
          <div className="text-xs text-dim">Agent: {instance.agent_id}</div>
        )}

        {/* Stats (loaded on demand) */}
        {stats && !('error' in stats) && (
          <div className="mt-3">
            {Object.entries(stats).filter(([k]) => !k.startsWith('_')).map(([label, val]) => {
              const metricValue = formatMetric(val as { value: unknown; format?: string });
              return (
                <div key={label} className="flex justify-between text-xs" style={{ padding: '2px 0' }}>
                  <span className="text-dim">{label}</span>
                  <span>{metricValue}</span>
                </div>
              );
            })}
          </div>
        )}
        {stats && 'error' in stats && (
          <div className="mt-3 text-xs text-dim">Error loading stats</div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button className="btn btn-ghost btn-sm" onClick={loadStats} disabled={loadingStats}>
            {loadingStats ? 'Loading...' : stats ? 'Hide Stats' : 'Stats'}
          </button>
          {isBrowserHand && onViewBrowser && (
            <button className="btn btn-ghost btn-sm" onClick={onViewBrowser}>View Browser</button>
          )}
          {instance.status === 'Active' ? (
            <button className="btn btn-ghost btn-sm" onClick={onPause}>Pause</button>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={onResume}>Resume</button>
          )}
          {instance.status?.startsWith('Error') && (
            <span className="text-xs text-dim">Error — deactivate and reactivate</span>
          )}
          <button className="btn btn-danger btn-sm" onClick={onDeactivate}>Deactivate</button>
        </div>
      </div>
    </motion.div>
  );
}

// Browser Modal Component
function BrowserModal({
  instance, browserState, onRefresh, onClose
}: {
  instance: HandInstance | null;
  browserState: HandBrowserState | null;
  onRefresh: () => void;
  onClose: () => void;
}) {
  if (!instance) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="browser-viewer"
        style={{
          width: '90vw',
          maxWidth: '1200px',
          height: '80vh',
          background: 'var(--surface-primary)',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="browser-viewer-header" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--surface-secondary)'
        }}>
          <div className="browser-url-bar" style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--void)',
            padding: '6px 12px',
            borderRadius: '4px'
          }}>
            <span className="browser-dot red" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }} />
            <span className="browser-dot yellow" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }} />
            <span className="browser-dot green" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }} />
            <span className="browser-url text-sm text-dim" style={{ marginLeft: '8px' }}>
              {browserState?.url || 'about:blank'}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onRefresh}>Refresh</button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>

        {/* Body */}
        <div className="browser-viewer-body" style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          background: 'var(--void)'
        }}>
          {/* Loading */}
          {!browserState && (
            <div className="text-center text-dim" style={{ padding: '40px' }}>
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading browser state...
            </div>
          )}

          {/* Error */}
          {browserState && !browserState.screenshot && !browserState.content && (
            <div className="text-center" style={{ padding: '40px', color: 'var(--error)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>!</div>
              <span>No active browser session</span>
            </div>
          )}

          {/* Screenshot */}
          {browserState?.screenshot && (
            <div className="browser-screenshot">
              <img
                src={`data:image/png;base64,${browserState.screenshot}`}
                alt="Browser screenshot"
                style={{ maxWidth: '100%', borderRadius: '4px', display: 'block' }}
              />
            </div>
          )}

          {/* Content */}
          {browserState?.content && !browserState.screenshot && (
            <div className="browser-content" style={{
              background: 'white',
              color: 'black',
              padding: '16px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '12px',
              whiteSpace: 'pre-wrap'
            }}>
              {browserState.content}
            </div>
          )}

          {/* Page info */}
          {browserState && (
            <div className="browser-info mt-4">
              <div className="text-dim text-sm">Title: {browserState.title || '-'}</div>
              {browserState.timestamp && (
                <div className="text-dim text-xs mt-1">
                  Updated: {new Date(browserState.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ==================== Main Component ====================

export function Hands() {
  const [activeTab, setActiveTab] = useState<'available' | 'active'>('available');
  const [platform] = useState(getPlatform());
  const queryClient = useQueryClient();

  // Modals state
  const [detailHand, setDetailHand] = useState<Hand | null>(null);
  const [setupHand, setSetupHand] = useState<Hand | null>(null);
  const [browserInstance, setBrowserInstance] = useState<HandInstance | null>(null);
  const [browserState, setBrowserState] = useState<HandBrowserState | null>(null);

  // Fetch available hands
  const { data: hands = [], isLoading, error, refetch } = useQuery<Hand[]>({
    queryKey: ['hands'],
    queryFn: async () => {
      const res = await api.get<{ hands: Hand[] }>('/api/hands');
      return res.hands || [];
    },
  });

  // Fetch active instances
  const { data: activeInstances = [], refetch: refetchActive } = useQuery<HandInstance[]>({
    queryKey: ['hands-active'],
    queryFn: async () => {
      const res = await api.getActiveHands();
      return res.instances || [];
    },
    refetchInterval: activeTab === 'active' ? 5000 : false,
  });

  // Install dependencies
  const handleInstallDeps = useCallback(async (handId: string) => {
    return await api.installHandDeps(handId);
  }, []);

  // Activate hand
  const handleActivate = useCallback(async (hand: Hand, settings: Record<string, string>) => {
    try {
      await api.activateHand(hand.id, settings);
      toaster.success(`Hand "${hand.name}" activated`);
      setSetupHand(null);
      setActiveTab('active');
      refetchActive();
    } catch (err) {
      const errorMsg = (err as Error).message || '';

      // Handle specific error cases with user-friendly messages
      if (errorMsg.includes('Hand already active')) {
        const handName = errorMsg.split(':').pop()?.trim() || hand.name;
        toaster.error(`${handName} is already running. Switching to Active tab.`);
        setSetupHand(null);
        setActiveTab('active');
        refetchActive();
      } else if (errorMsg.includes('requirements not met')) {
        toaster.error('Requirements not met. Please install missing dependencies first.');
      } else if (errorMsg.includes('config')) {
        toaster.error(`Configuration error: ${errorMsg}`);
      } else {
        // Generic error
        toaster.error(`Activation failed: ${errorMsg}`);
      }
    }
  }, [refetchActive]);

  // Pause instance
  const handlePause = useCallback(async (id: string) => {
    try {
      await api.pauseHandInstance(id);
      toaster.success('Instance paused');
      refetchActive();
    } catch (err) {
      toaster.error('Failed to pause: ' + (err as Error).message);
    }
  }, [refetchActive]);

  // Resume instance
  const handleResume = useCallback(async (id: string) => {
    try {
      await api.resumeHandInstance(id);
      toaster.success('Instance resumed');
      refetchActive();
    } catch (err) {
      toaster.error('Failed to resume: ' + (err as Error).message);
    }
  }, [refetchActive]);

  // Deactivate instance
  const handleDeactivate = useCallback(async (id: string, name: string) => {
    if (!confirm(`Deactivate hand "${name}"? This will kill its agent.`)) return;
    try {
      await api.deactivateHandInstance(id);
      toaster.success('Hand deactivated');
      refetchActive();
    } catch (err) {
      toaster.error('Failed to deactivate: ' + (err as Error).message);
    }
  }, [refetchActive]);

  // View browser
  const handleViewBrowser = useCallback(async (instance: HandInstance) => {
    setBrowserInstance(instance);
    setBrowserState(null);
    try {
      const state = await api.getHandInstanceBrowser(instance.instance_id);
      setBrowserState(state);
    } catch (err) {
      toaster.error('Failed to load browser state');
    }
  }, []);

  // Refresh browser view
  const handleRefreshBrowser = useCallback(async () => {
    if (!browserInstance) return;
    try {
      const state = await api.getHandInstanceBrowser(browserInstance.instance_id);
      setBrowserState(state);
    } catch (err) {
      toaster.error('Failed to refresh browser');
    }
  }, [browserInstance]);

  // Poll browser state
  useEffect(() => {
    if (!browserInstance) return;
    const interval = setInterval(() => {
      handleRefreshBrowser();
    }, 3000);
    return () => clearInterval(interval);
  }, [browserInstance, handleRefreshBrowser]);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Info Card */}
        <div className="info-card mb-6">
          <h4>SOP — Standard Operating Procedures</h4>
          <p>SOPs are pre-configured AI agents that autonomously handle specific tasks. Each SOP includes a tuned system prompt, required tools, and a dashboard for tracking work.</p>
        </div>

        {/* Header */}
        <motion.div className="flex items-center justify-between mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="text-3xl font-bold">
              <NeonText color="cyan">SOP</NeonText>
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              {hands.length} available • {activeInstances.length} active
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-[var(--surface-secondary)] rounded-lg p-1">
              <button
                onClick={() => setActiveTab('available')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  activeTab === 'available'
                    ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                )}
              >
                Available
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  activeTab === 'active'
                    ? 'bg-[var(--neon-green)]/20 text-[var(--neon-green)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                )}
              >
                Active ({activeInstances.length})
              </button>
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
          </div>
        </motion.div>

        {/* Available Tab */}
        {activeTab === 'available' && (
          <>
            {isLoading ? (
              <div className="loading-state">
                <div className="spinner" />
                <span>Loading SOPs...</span>
              </div>
            ) : error ? (
              <motion.div className="error-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="error-icon">!</span>
                <p>{(error as Error).message || 'Could not load SOPs.'}</p>
                <button className="btn btn-ghost btn-sm" onClick={() => refetch()}>Retry</button>
              </motion.div>
            ) : hands.length === 0 ? (
              <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="empty-state-icon">
                  <HandIcon className="w-10 h-10 text-[var(--text-muted)]" />
                </div>
                <h3>No SOPs available</h3>
                <p>SOPs are curated AI capability packages. They will appear once the kernel loads bundled SOPs.</p>
              </motion.div>
            ) : (
              <motion.div className="card-grid" layout>
                <AnimatePresence mode="popLayout">
                  {hands.map((hand) => {
                    const isActive = activeInstances.some(inst => inst.hand_id === hand.id);
                    return (
                      <HandCard
                        key={hand.id}
                        hand={hand}
                        onActivate={() => isActive ? setActiveTab('active') : setSetupHand(hand)}
                        onDetail={() => setDetailHand(hand)}
                        isActive={isActive}
                      />
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}

        {/* Active Tab */}
        {activeTab === 'active' && (
          <>
            {activeInstances.length === 0 ? (
              <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="empty-state-icon">
                  <HandIcon className="w-10 h-10 text-[var(--text-muted)]" />
                </div>
                <h4>No active SOPs</h4>
                <p className="hint">Activate a SOP from the Available tab to get started. Each SOP spawns a dedicated agent.</p>
                <button className="btn btn-primary mt-4" onClick={() => setActiveTab('available')}>Browse SOPs</button>
              </motion.div>
            ) : (
              <motion.div className="card-grid" layout>
                <AnimatePresence mode="popLayout">
                  {activeInstances.map((instance) => (
                    <InstanceCard
                      key={instance.instance_id}
                      instance={instance}
                      hands={hands}
                      onPause={() => handlePause(instance.instance_id)}
                      onResume={() => handleResume(instance.instance_id)}
                      onDeactivate={() => handleDeactivate(instance.instance_id, instance.agent_name || instance.hand_id)}
                      onViewBrowser={instance.hand_id === 'browser' ? () => handleViewBrowser(instance) : undefined}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailHand && (
          <DetailModal
            hand={detailHand}
            onClose={() => setDetailHand(null)}
            onActivate={(h) => { setDetailHand(null); setSetupHand(h); }}
          />
        )}
      </AnimatePresence>

      {/* Setup Wizard Modal */}
      <AnimatePresence>
        {setupHand && (
          <SetupWizardModal
            hand={setupHand}
            platform={platform}
            onClose={() => setSetupHand(null)}
            onActivate={handleActivate}
            onInstallDeps={handleInstallDeps}
          />
        )}
      </AnimatePresence>

      {/* Browser Modal */}
      <AnimatePresence>
        {browserInstance && (
          <BrowserModal
            instance={browserInstance}
            browserState={browserState}
            onRefresh={handleRefreshBrowser}
            onClose={() => { setBrowserInstance(null); setBrowserState(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Hands;
