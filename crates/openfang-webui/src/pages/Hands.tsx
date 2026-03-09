import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  HandIcon, Loader2, Play, XCircle,
  Info, ExternalLink, Copy, Check, Pause, Square, BarChart3, Globe,
  AlertCircle, ChevronRight, ChevronLeft
} from 'lucide-react';

// Types
interface HandRequirement {
  key: string;
  label: string;
  satisfied: boolean;
  type?: string;
  description?: string;
  check_value?: string;
  install?: {
    macos?: string;
    windows?: string;
    linux_apt?: string;
    linux_dnf?: string;
    linux_pacman?: string;
    pip?: string;
    steps?: string[];
    env_example?: string;
    signup_url?: string;
    docs_url?: string;
    manual_url?: string;
    estimated_time?: string;
  };
}

interface HandSetting {
  key: string;
  label: string;
  description?: string;
  setting_type: 'select' | 'toggle' | 'text';
  default?: string;
  options?: Array<{
    value: string;
    label: string;
    provider_env?: string;
    binary?: string;
    available?: boolean;
  }>;
}

interface HandDashboardMetric {
  memory_key: string;
  label: string;
  format: string;
}

interface HandAgentConfig {
  provider?: string;
  model?: string;
}

interface Hand {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tools: string[];
  requirements_met: boolean;
  requirements: HandRequirement[];
  dashboard_metrics: number;
  has_settings: boolean;
  settings_count: number;
  settings?: HandSetting[];
  dashboard?: HandDashboardMetric[];
  agent?: HandAgentConfig;
  server_platform?: string;
}

interface HandInstance {
  instance_id: string;
  hand_id: string;
  status: string;
  agent_id?: string;
  agent_name?: string;
  activated_at: string;
  updated_at: string;
  _stats?: Record<string, { value: string | number; format: string }> | null;
}

interface InstallProgress {
  status: 'installing' | 'done' | 'error';
  current: number;
  total: number;
  currentLabel?: string;
  results: Array<{ key: string; status: string; message: string }>;
  error: string | null;
}

interface BrowserViewerState {
  instance_id: string;
  hand_id: string;
  agent_name?: string;
  url: string;
  title: string;
  screenshot: string;
  content: string;
  loading: boolean;
  error: string;
}

// Helper functions
const formatMetric = (m: { value: string | number; format: string } | undefined): string => {
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
};

const getInstallCmd = (req: HandRequirement, platform: string): string | null => {
  if (!req || !req.install) return null;
  const inst = req.install;
  if (platform === 'macos' && inst.macos) return inst.macos;
  if (platform === 'windows' && inst.windows) return inst.windows;
  if (platform === 'linux') {
    return inst.linux_apt || inst.linux_dnf || inst.linux_pacman || inst.pip || null;
  }
  return inst.pip || inst.macos || inst.windows || inst.linux_apt || null;
};

const detectPlatform = (): string => {
  const ua = (navigator.userAgent || '').toLowerCase();
  if (ua.indexOf('mac') !== -1) return 'macos';
  if (ua.indexOf('win') !== -1) return 'windows';
  return 'linux';
};

// Setup Wizard Component
function SetupWizard({
  hand,
  onClose,
  onActivate,
  isActivating
}: {
  hand: Hand;
  onClose: () => void;
  onActivate: (config: Record<string, string>) => void;
  isActivating: boolean;
}) {
  const [step, setStep] = useState(1);
  const [settingsValues, setSettingsValues] = useState<Record<string, string>>({});
  const [detectedPlatform, setDetectedPlatform] = useState('linux');
  const [installPlatforms, setInstallPlatforms] = useState<Record<string, string>>({});
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [clipboardMsg, setClipboardMsg] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<HandRequirement[]>(hand.requirements || []);

  useEffect(() => {
    const plat = hand.server_platform || detectPlatform();
    setDetectedPlatform(plat);

    // Initialize platform selections
    const platforms: Record<string, string> = {};
    hand.requirements?.forEach(req => {
      platforms[req.key] = plat;
    });
    setInstallPlatforms(platforms);

    // Initialize settings defaults
    const defaults: Record<string, string> = {};
    hand.settings?.forEach(s => {
      defaults[s.key] = s.default || '';
    });
    setSettingsValues(defaults);

    // Set initial step
    const hasReqs = hand.requirements && hand.requirements.length > 0;
    setStep(hasReqs ? 1 : 2);
  }, [hand]);

  const reqsMet = useMemo(() => requirements.filter(r => r.satisfied).length, [requirements]);
  const reqsTotal = requirements.length;
  const allReqsMet = reqsTotal > 0 && reqsMet === reqsTotal;
  const hasReqs = reqsTotal > 0;
  const hasSettings = hand.settings && hand.settings.length > 0;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setClipboardMsg(text);
      setTimeout(() => setClipboardMsg(null), 2000);
    } catch {
      // ignore
    }
  };

  const installDeps = async () => {
    const missing = requirements.filter(r => !r.satisfied);
    if (missing.length === 0) return;

    setInstallProgress({
      status: 'installing',
      current: 0,
      total: missing.length,
      results: [],
      error: null
    });

    try {
      const data = await api.post<{ results: Array<{ key: string; status: string; message: string }>; requirements: HandRequirement[]; requirements_met: boolean }>(`/api/hands/${hand.id}/install-deps`, {});

      setInstallProgress(prev => prev ? {
        ...prev,
        status: 'done',
        results: data.results || [],
        current: (data.results || []).length
      } : null);

      // Update requirements from server
      if (data.requirements) {
        setRequirements(data.requirements);
      }

      if (data.requirements_met) {
        setTimeout(() => {
          setInstallProgress(null);
          handleNext();
        }, 1500);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Installation failed';
      setInstallProgress(prev => prev ? { ...prev, status: 'error', error: msg } : null);
    }
  };

  const recheckDeps = async () => {
    setIsChecking(true);
    try {
      const data = await api.post<{ requirements: HandRequirement[]; requirements_met: boolean }>(`/api/hands/${hand.id}/check-deps`, {});
      if (data.requirements) {
        setRequirements(data.requirements);
      }
    } catch (e: unknown) {
      // ignore
    }
    setIsChecking(false);
  };

  const handleNext = () => {
    if (step === 1 && hasSettings) {
      setStep(2);
    } else if (step === 1) {
      setStep(3);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 3 && hasSettings) {
      setStep(2);
    } else if (step === 3) {
      setStep(hasReqs ? 1 : 2);
    } else if (step === 2 && hasReqs) {
      setStep(1);
    }
  };

  const getSettingDisplayValue = (setting: HandSetting): string => {
    const val = settingsValues[setting.key] || setting.default || '';
    if (setting.setting_type === 'toggle') {
      return val === 'true' ? 'Enabled' : 'Disabled';
    }
    if (setting.setting_type === 'select' && setting.options) {
      const opt = setting.options.find(o => o.value === val);
      if (opt) return opt.label;
    }
    return val || '-';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 pb-4 border-b">
        <span className="text-4xl">{hand.icon}</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Set up {hand.name}</h3>
          <p className="text-sm text-muted-foreground">{hand.description}</p>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-2">
        {hasReqs && (
          <>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 1 ? 'bg-primary text-primary-foreground' : step > 1 ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
              <span className="flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-current/20">
                {step > 1 ? <Check className="w-3 h-3" /> : '1'}
              </span>
              <span>Dependencies</span>
            </div>
            <div className={`w-8 h-0.5 ${step > 1 ? 'bg-green-500' : 'bg-muted'}`} />
          </>
        )}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 2 ? 'bg-primary text-primary-foreground' : step > 2 ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
          <span className="flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-current/20">
            {step > 2 ? <Check className="w-3 h-3" /> : hasReqs ? '2' : '1'}
          </span>
          <span>Configure</span>
        </div>
        <div className={`w-8 h-0.5 ${step > 2 ? 'bg-green-500' : 'bg-muted'}`} />
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          <span className="flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-current/20">
            {hasReqs ? '3' : '2'}
          </span>
          <span>Launch</span>
        </div>
      </div>

      {/* Step 1: Dependencies */}
      {step === 1 && (
        <div className="space-y-4">
          {requirements.map(req => {
            const platform = installPlatforms[req.key] || detectedPlatform;
            const cmd = getInstallCmd(req, platform);

            return (
              <div
                key={req.key}
                className={`p-4 rounded-lg border ${req.satisfied ? 'bg-green-500/5 border-green-500/20' : 'bg-destructive/5 border-destructive/20'}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${req.satisfied ? 'bg-green-500 text-white' : 'bg-destructive text-white'}`}>
                    {req.satisfied ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </div>
                  <span className="font-medium">{req.label}</span>
                  {req.install?.estimated_time && (
                    <span className="text-xs text-muted-foreground ml-auto">{req.install.estimated_time}</span>
                  )}
                </div>

                {req.description && (
                  <p className="text-sm text-muted-foreground mb-3 ml-9">{req.description}</p>
                )}

                {req.satisfied ? (
                  <div className="ml-9 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Detected on your system
                  </div>
                ) : (
                  <div className="ml-9 space-y-3">
                    {/* Platform tabs for binary/env installs */}
                    {req.type !== 'ApiKey' && req.install && (req.install.macos || req.install.windows || req.install.linux_apt) && (
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          {req.install.macos && (
                            <button
                              onClick={() => setInstallPlatforms(p => ({ ...p, [req.key]: 'macos' }))}
                              className={`px-3 py-1 text-xs rounded-full border ${platform === 'macos' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                            >
                              macOS
                            </button>
                          )}
                          {req.install.windows && (
                            <button
                              onClick={() => setInstallPlatforms(p => ({ ...p, [req.key]: 'windows' }))}
                              className={`px-3 py-1 text-xs rounded-full border ${platform === 'windows' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                            >
                              Windows
                            </button>
                          )}
                          {(req.install.linux_apt || req.install.linux_dnf || req.install.linux_pacman) && (
                            <button
                              onClick={() => setInstallPlatforms(p => ({ ...p, [req.key]: 'linux' }))}
                              className={`px-3 py-1 text-xs rounded-full border ${platform === 'linux' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                            >
                              Linux
                            </button>
                          )}
                          {req.install.pip && !req.install.macos && (
                            <button
                              onClick={() => setInstallPlatforms(p => ({ ...p, [req.key]: 'pip' }))}
                              className={`px-3 py-1 text-xs rounded-full border ${platform === 'pip' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                            >
                              pip
                            </button>
                          )}
                        </div>

                        {cmd && (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded text-sm font-mono">
                            <code className="flex-1 truncate">{cmd}</code>
                            <button
                              onClick={() => copyToClipboard(cmd)}
                              className="px-2 py-1 text-xs rounded hover:bg-background"
                            >
                              {clipboardMsg === cmd ? 'Copied!' : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Install steps */}
                    {req.install?.steps && req.type !== 'ApiKey' && (
                      <ol className="text-sm space-y-1 list-decimal list-inside">
                        {req.install.steps.map((step, i) => (
                          <li key={i} className="text-muted-foreground">{step}</li>
                        ))}
                      </ol>
                    )}

                    {/* API Key specific UI */}
                    {req.type === 'ApiKey' && req.install && (
                      <div className="space-y-3">
                        {req.install.steps && (
                          <ol className="text-sm space-y-1 list-decimal list-inside">
                            {req.install.steps.map((step, i) => (
                              <li key={i} className="text-muted-foreground">{step}</li>
                            ))}
                          </ol>
                        )}
                        {req.install.env_example && (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded text-sm font-mono">
                            <code className="flex-1 truncate">{req.install.env_example}</code>
                            <button
                              onClick={() => copyToClipboard(req.install!.env_example!)}
                              className="px-2 py-1 text-xs rounded hover:bg-background"
                            >
                              {clipboardMsg === req.install.env_example ? 'Copied!' : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          {req.install.signup_url && (
                            <a
                              href={req.install.signup_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                            >
                              Get API Key <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {req.install.docs_url && (
                            <a
                              href={req.install.docs_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-muted"
                            >
                              Docs
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {req.install?.manual_url && req.type !== 'ApiKey' && (
                      <a
                        href={req.install.manual_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Manual download →
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Install Progress */}
          {installProgress && (
            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-2 mb-3">
                {installProgress.status === 'installing' && <Loader2 className="w-4 h-4 animate-spin" />}
                {installProgress.status === 'done' && !installProgress.error && <Check className="w-4 h-4 text-green-500" />}
                {installProgress.error && <AlertCircle className="w-4 h-4 text-destructive" />}
                <span className="font-medium">
                  {installProgress.status === 'installing' && 'Installing dependencies...'}
                  {installProgress.status === 'done' && !installProgress.error && 'Installation complete!'}
                  {installProgress.error && installProgress.error}
                </span>
              </div>

              {installProgress.results.length > 0 && (
                <div className="space-y-1">
                  {installProgress.results.map(r => (
                    <div key={r.key} className="flex items-center gap-2 text-sm">
                      <span className={r.status === 'installed' || r.status === 'already_installed' ? 'text-green-500' : r.status === 'error' || r.status === 'timeout' ? 'text-destructive' : ''}>
                        {r.status === 'installed' || r.status === 'already_installed' ? <Check className="w-4 h-4" /> : r.status === 'error' || r.status === 'timeout' ? <XCircle className="w-4 h-4" /> : '•'}
                      </span>
                      <span>{r.key}</span>
                      <span className="text-muted-foreground text-xs ml-auto">{r.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{reqsMet} of {reqsTotal} ready</span>
              <span className="text-muted-foreground">{allReqsMet ? 'All set!' : 'Install missing dependencies above'}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${reqsTotal ? Math.round(reqsMet / reqsTotal * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && (
        <div className="space-y-4">
          {!hasSettings ? (
            <div className="text-center py-8 text-muted-foreground">
              No configuration needed for this hand. Click Next to continue.
            </div>
          ) : (
            hand.settings?.map(setting => (
              <div key={setting.key} className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {setting.label}
                </label>
                {setting.description && (
                  <p className="text-xs text-muted-foreground">{setting.description}</p>
                )}

                {/* Select type */}
                {setting.setting_type === 'select' && setting.options && (
                  <div className="space-y-2">
                    {setting.options.map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => setSettingsValues(v => ({ ...v, [setting.key]: opt.value }))}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          settingsValues[setting.key] === opt.value
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-medium">{opt.label}</div>
                          {opt.provider_env && (
                            <div className="text-xs text-muted-foreground">{opt.provider_env}</div>
                          )}
                          {opt.binary && (
                            <div className="text-xs text-muted-foreground">Requires: {opt.binary}</div>
                          )}
                        </div>
                        <Badge variant={opt.available ? 'default' : 'secondary'} className="text-[10px]">
                          {opt.available ? 'Ready' : 'Missing'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Toggle type */}
                {setting.setting_type === 'toggle' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsValues[setting.key] === 'true'}
                      onChange={(e) => setSettingsValues(v => ({ ...v, [setting.key]: e.target.checked ? 'true' : 'false' }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">
                      {settingsValues[setting.key] === 'true' ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                )}

                {/* Text type */}
                {setting.setting_type === 'text' && (
                  <input
                    type="text"
                    value={settingsValues[setting.key] || ''}
                    onChange={(e) => setSettingsValues(v => ({ ...v, [setting.key]: e.target.value }))}
                    placeholder={setting.label}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Step 3: Launch */}
      {step === 3 && (
        <div className="text-center py-4">
          <div className="text-6xl mb-4">{hand.icon}</div>
          <h4 className="text-xl font-semibold mb-6">{hand.name}</h4>

          <div className="max-w-sm mx-auto space-y-2 text-left">
            {hasReqs && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">Dependencies</span>
                <span className="text-green-600 dark:text-green-400">{reqsMet}/{reqsTotal} ✓</span>
              </div>
            )}
            {hand.settings?.map(setting => (
              <div key={setting.key} className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">{setting.label}</span>
                <span>{getSettingDisplayValue(setting)}</span>
              </div>
            ))}
            {hand.agent && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">Model</span>
                <span>{hand.agent.provider || 'default'} / {hand.agent.model || 'default'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {(step === 2 && hasReqs) || step === 3 ? (
            <Button variant="ghost" onClick={handleBack}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : null}
        </div>

        <div className="flex gap-2">
          {step === 1 && (
            <>
              {!allReqsMet && (
                <Button
                  variant="outline"
                  onClick={installDeps}
                  disabled={installProgress?.status === 'installing'}
                >
                  {installProgress?.status === 'installing' ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Installing...</>
                  ) : (
                    'Install All'
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={recheckDeps}
                disabled={isChecking}
              >
                {isChecking ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Checking...</> : 'Verify'}
              </Button>
              <Button onClick={handleNext} disabled={!allReqsMet}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}
          {step === 2 && (
            <Button onClick={handleNext}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <Button
              onClick={() => onActivate(settingsValues)}
              disabled={isActivating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isActivating ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Activating...</>
              ) : (
                <><Play className="w-4 h-4 mr-1" /> Activate {hand.name}</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Browser Viewer Dialog
function BrowserViewer({
  instance,
  onClose
}: {
  instance: HandInstance;
  onClose: () => void;
}) {
  const [viewer, setViewer] = useState<BrowserViewerState>({
    instance_id: instance.instance_id,
    hand_id: instance.hand_id,
    agent_name: instance.agent_name,
    url: '',
    title: '',
    screenshot: '',
    content: '',
    loading: true,
    error: ''
  });

  const refreshView = useCallback(async () => {
    try {
      const data = await api.get<{ active: boolean; url?: string; title?: string; screenshot_base64?: string; content?: string }>(`/api/hands/instances/${instance.instance_id}/browser`);
      if (data.active) {
        setViewer(v => ({
          ...v,
          url: data.url || '',
          title: data.title || '',
          screenshot: data.screenshot_base64 || '',
          content: data.content || '',
          error: '',
          loading: false
        }));
      } else {
        setViewer(v => ({
          ...v,
          error: 'No active browser session',
          screenshot: '',
          loading: false
        }));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load browser state';
      setViewer(v => ({ ...v, error: msg, loading: false }));
    }
  }, [instance.instance_id]);

  useEffect(() => {
    refreshView();
    const timer = setInterval(refreshView, 3000);
    return () => clearInterval(timer);
  }, [refreshView]);

  return (
    <div className="space-y-4">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 px-3 py-1 text-sm bg-background rounded truncate">
          {viewer.url || 'about:blank'}
        </div>
        <Button variant="ghost" size="sm" onClick={refreshView}>Refresh</Button>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      {/* Content */}
      <div className="min-h-[300px] flex items-center justify-center">
        {viewer.loading && (
          <div className="text-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Loading browser state...
          </div>
        )}

        {viewer.error && !viewer.loading && (
          <div className="text-center text-destructive">
            <AlertCircle className="w-12 h-12 mx-auto mb-2" />
            {viewer.error}
          </div>
        )}

        {viewer.screenshot && !viewer.loading && !viewer.error && (
          <div className="w-full">
            <img
              src={`data:image/png;base64,${viewer.screenshot}`}
              alt="Browser screenshot"
              className="max-w-full rounded-lg border"
            />
            <div className="mt-2 text-sm text-muted-foreground">
              Title: {viewer.title || '-'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Hands Page
export function Hands() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'available' | 'active'>('available');
  const [detailHand, setDetailHand] = useState<Hand | null>(null);
  const [setupHand, setSetupHand] = useState<Hand | null>(null);
  const [browserInstance, setBrowserInstance] = useState<HandInstance | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Load hands
  const { data: hands = [], isLoading: handsLoading, error: handsError, refetch: refetchHands } = useQuery<Hand[]>({
    queryKey: ['hands'],
    queryFn: async () => {
      const res = await api.get<{ hands: Hand[] }>('/api/hands');
      return res.hands || [];
    },
  });

  // Load active instances
  const { data: instances = [], isLoading: instancesLoading } = useQuery<HandInstance[]>({
    queryKey: ['hands-active'],
    queryFn: async () => {
      const res = await api.get<{ instances: HandInstance[] }>('/api/hands/active');
      return (res.instances || []).map(i => ({ ...i, _stats: null }));
    },
    enabled: activeTab === 'active',
  });

  // Show toast helper
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Get hand icon
  const getHandIcon = useCallback((handId: string) => {
    const hand = hands.find(h => h.id === handId);
    return hand?.icon || '';
  }, [hands]);

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: async ({ handId, config }: { handId: string; config: Record<string, string> }) => {
      const res = await api.post<{ agent_name?: string; instance_id: string }>(`/api/hands/${handId}/activate`, { config });
      return res;
    },
    onSuccess: (data, vars) => {
      showToast(`Hand "${vars.handId}" activated as ${data.agent_name || data.instance_id}`);
      queryClient.invalidateQueries({ queryKey: ['hands-active'] });
      setSetupHand(null);
      setActiveTab('active');
      setActivatingId(null);
    },
    onError: (e: Error) => {
      showToast(`Activation failed: ${e.message || 'unknown error'}`);
      setActivatingId(null);
    },
  });

  // Deactivate mutation
  const deactivateMutation = useMutation({
    mutationFn: async (instanceId: string) => {
      await api.del(`/api/hands/instances/${instanceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hands-active'] });
    },
  });

  // Pause hand
  const pauseHand = async (inst: HandInstance) => {
    try {
      await api.post(`/api/hands/instances/${inst.instance_id}/pause`, {});
      queryClient.invalidateQueries({ queryKey: ['hands-active'] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      showToast(`Pause failed: ${msg}`);
    }
  };

  // Resume hand
  const resumeHand = async (inst: HandInstance) => {
    try {
      await api.post(`/api/hands/instances/${inst.instance_id}/resume`, {});
      queryClient.invalidateQueries({ queryKey: ['hands-active'] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      showToast(`Resume failed: ${msg}`);
    }
  };

  // Load stats
  const loadStats = async (inst: HandInstance) => {
    try {
      const data = await api.get<{ metrics?: Record<string, { value: string | number; format: string }> }>(`/api/hands/instances/${inst.instance_id}/stats`);
      // Update the instance in the cache with stats
      queryClient.setQueryData<HandInstance[]>(['hands-active'], old => {
        if (!old) return old;
        return old.map(i => i.instance_id === inst.instance_id ? { ...i, _stats: data.metrics || {} } : i);
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load stats';
      queryClient.setQueryData<HandInstance[]>(['hands-active'], old => {
        if (!old) return old;
        return old.map(i => i.instance_id === inst.instance_id ? { ...i, _stats: { Error: { value: msg, format: 'text' } } } : i);
      });
    }
  };

  // Check if browser hand
  const isBrowserHand = (inst: HandInstance) => inst.hand_id === 'browser';

  // Open hand detail
  const openDetail = async (handId: string) => {
    try {
      const data = await api.get<Hand>(`/api/hands/${handId}`);
      setDetailHand(data);
    } catch {
      const hand = hands.find(h => h.id === handId);
      if (hand) setDetailHand(hand);
    }
  };

  // Open setup wizard
  const openSetupWizard = async (handId: string) => {
    try {
      const data = await api.get<Hand>(`/api/hands/${handId}`);
      setSetupHand(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      showToast(`Could not load hand details: ${msg}`);
    }
  };

  const isLoading = handsLoading || (activeTab === 'active' && instancesLoading);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Hands</h1>
          <p className="text-muted-foreground">Curated autonomous capability packages</p>
        </div>

        {/* Info Card */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-2">Hands — Curated Autonomous Capability Packages</h4>
            <p className="text-sm text-muted-foreground">
              Hands are pre-configured AI agents that autonomously handle specific tasks. Each hand includes a tuned system prompt, required tools, and a dashboard for tracking work.
            </p>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2 text-muted-foreground">Loading hands...</span>
          </div>
        )}

        {/* Error State */}
        {handsError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-destructive mb-2">{handsError instanceof Error ? handsError.message : 'Could not load hands.'}</p>
            <Button variant="ghost" size="sm" onClick={() => refetchHands()}>Retry</Button>
          </div>
        )}

        {/* Content */}
        {!isLoading && !handsError && (
          <>
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'available' | 'active')}>
              <TabsList className="mb-4">
                <TabsTrigger value="available">
                  Available
                  {hands.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">{hands.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="active">
                  Active
                  {instances.length > 0 && (
                    <Badge className="ml-2 text-[10px] bg-green-500/20 text-green-700 dark:text-green-400">{instances.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="available" className="mt-0">
                {hands.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {hands.map((hand) => (
                      <Card key={hand.id} className={hand.requirements_met ? 'ring-1 ring-primary/20' : undefined}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{hand.icon}</span>
                              <CardTitle className="text-base">{hand.name}</CardTitle>
                            </div>
                            <Badge
                              variant={hand.requirements_met ? 'default' : 'secondary'}
                              className={hand.requirements_met ? 'bg-green-500 hover:bg-green-600' : undefined}
                            >
                              {hand.requirements_met ? 'Ready' : 'Setup needed'}
                            </Badge>
                          </div>
                          <CardDescription className="line-clamp-2">{hand.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Requirements */}
                          {hand.requirements && hand.requirements.length > 0 && (
                            <div>
                              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Requirements</div>
                              <div className="space-y-1">
                                {hand.requirements.map(req => (
                                  <div key={req.key} className="flex items-center gap-2 text-xs">
                                    <span className={req.satisfied ? 'text-green-500' : 'text-destructive'}>
                                      {req.satisfied ? '✓' : '✗'}
                                    </span>
                                    <span>{req.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tools & Metrics */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{hand.tools.length} tool(s)</span>
                            <span>{hand.dashboard_metrics} metric(s)</span>
                            <Badge variant="outline" className="text-[10px]">{hand.category}</Badge>
                          </div>

                          {/* Actions */}
                          <div className="flex justify-between items-center pt-2">
                            <Button variant="ghost" size="sm" onClick={() => openDetail(hand.id)}>
                              <Info className="w-4 h-4 mr-1" /> Details
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openSetupWizard(hand.id)}
                              disabled={activatingId === hand.id}
                            >
                              {activatingId === hand.id ? (
                                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Loading...</>
                              ) : (
                                <><Play className="w-4 h-4 mr-1" /> Activate</>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border rounded-lg">
                    <HandIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No hands available</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Hands are curated AI capability packages. They will appear once the kernel loads bundled hands.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="active" className="mt-0">
                {instances.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {instances.map((inst) => (
                      <Card key={inst.instance_id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{getHandIcon(inst.hand_id)}</span>
                              <CardTitle className="text-base">{inst.agent_name || inst.hand_id}</CardTitle>
                            </div>
                            <Badge
                              variant={
                                inst.status === 'Active' ? 'default' :
                                inst.status === 'Paused' ? 'secondary' :
                                inst.status?.startsWith('Error') ? 'destructive' :
                                'outline'
                              }
                              className={inst.status === 'Active' ? 'bg-green-500 hover:bg-green-600' : undefined}
                            >
                              {inst.status}
                            </Badge>
                          </div>
                          <CardDescription>
                            <div className="text-xs text-muted-foreground">
                              Activated: {new Date(inst.activated_at).toLocaleString()}
                            </div>
                            {inst.agent_id && (
                              <div className="text-xs text-muted-foreground">
                                Agent: {inst.agent_id}
                              </div>
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Stats */}
                          {inst._stats && (
                            <div className="space-y-1">
                              {Object.entries(inst._stats).map(([label, val]) => (
                                <div key={label} className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{label}</span>
                                  <span>{formatMetric(val)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            <Button variant="ghost" size="sm" onClick={() => loadStats(inst)}>
                              <BarChart3 className="w-4 h-4 mr-1" /> Stats
                            </Button>
                            {isBrowserHand(inst) && (
                              <Button variant="ghost" size="sm" onClick={() => setBrowserInstance(inst)}>
                                <Globe className="w-4 h-4 mr-1" /> View Browser
                              </Button>
                            )}
                            {inst.status === 'Active' && (
                              <Button variant="ghost" size="sm" onClick={() => pauseHand(inst)}>
                                <Pause className="w-4 h-4 mr-1" /> Pause
                              </Button>
                            )}
                            {inst.status === 'Paused' && (
                              <Button variant="ghost" size="sm" onClick={() => resumeHand(inst)}>
                                <Play className="w-4 h-4 mr-1" /> Resume
                              </Button>
                            )}
                            {inst.status?.startsWith('Error') && (
                              <span className="text-xs text-muted-foreground self-center">
                                Error — deactivate and reactivate
                              </span>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deactivateMutation.mutate(inst.instance_id)}
                              disabled={deactivateMutation.isPending}
                            >
                              <Square className="w-4 h-4 mr-1" /> Deactivate
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border rounded-lg">
                    <HandIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h4 className="text-lg font-medium mb-2">No active hands</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Activate a hand from the Available tab to get started. Each hand spawns a dedicated agent.
                    </p>
                    <Button onClick={() => setActiveTab('available')}>Browse Hands</Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Detail Modal */}
        <Dialog open={!!detailHand} onOpenChange={() => setDetailHand(null)}>
          <DialogContent className="max-w-xl">
            {detailHand && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span>{detailHand.icon}</span>
                    <span>{detailHand.name}</span>
                  </DialogTitle>
                  <DialogDescription>{detailHand.description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Agent Config */}
                  {detailHand.agent && (
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Agent Config</div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between py-0.5">
                          <span className="text-muted-foreground">Provider</span>
                          <span>{detailHand.agent.provider}</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span className="text-muted-foreground">Model</span>
                          <span>{detailHand.agent.model}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Requirements */}
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Requirements</div>
                    <div className="space-y-1">
                      {detailHand.requirements?.map(req => (
                        <div key={req.key} className="flex items-center gap-2 text-sm py-0.5">
                          <span className={req.satisfied ? 'text-green-500' : 'text-destructive'}>
                            {req.satisfied ? '✓' : '✗'}
                          </span>
                          <span>{req.label}</span>
                          {req.check_value && (
                            <code className="text-xs text-muted-foreground ml-auto">{req.check_value}</code>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tools */}
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Tools</div>
                    <div className="flex flex-wrap gap-1">
                      {detailHand.tools?.map(tool => (
                        <Badge key={tool} variant="secondary" className="text-[10px]">{tool}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Dashboard Metrics */}
                  {detailHand.dashboard && detailHand.dashboard.length > 0 && (
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Dashboard Metrics</div>
                      <div className="space-y-1">
                        {detailHand.dashboard.map(m => (
                          <div key={m.memory_key} className="text-sm py-0.5">
                            {m.label} <code className="text-xs text-muted-foreground">({m.format})</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={() => {
                      setDetailHand(null);
                      openSetupWizard(detailHand.id);
                    }}
                  >
                    <Play className="w-4 h-4 mr-1" /> Activate
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Setup Wizard Modal */}
        <Dialog open={!!setupHand} onOpenChange={() => setSetupHand(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {setupHand && (
              <SetupWizard
                hand={setupHand}
                onClose={() => setSetupHand(null)}
                onActivate={(config) => {
                  setActivatingId(setupHand.id);
                  activateMutation.mutate({ handId: setupHand.id, config });
                }}
                isActivating={activatingId === setupHand.id}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Browser Viewer Modal */}
        <Dialog open={!!browserInstance} onOpenChange={() => setBrowserInstance(null)}>
          <DialogContent className="max-w-4xl">
            {browserInstance && (
              <BrowserViewer
                instance={browserInstance}
                onClose={() => setBrowserInstance(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2">
            <Check className="w-4 h-4" />
            <span>{toast}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Hands;
