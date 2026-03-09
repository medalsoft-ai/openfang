import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/api/client';
import type { Channel, ChannelField } from '@/api/types';
import {
  Radio,
  Loader2,
  Trash2,
  Settings,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Copy,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

// QR Code response types
interface QRStartResponse {
  available: boolean;
  qr_data_url?: string;
  session_id?: string;
  message?: string;
  help?: string;
  connected?: boolean;
}

interface QRStatusResponse {
  connected: boolean;
  expired?: boolean;
  message?: string;
}

interface TestResponse {
  status: 'ok' | 'error';
  message?: string;
}

// Category configuration
const categories = [
  { key: 'all', label: 'All' },
  { key: 'messaging', label: 'Messaging' },
  { key: 'social', label: 'Social' },
  { key: 'enterprise', label: 'Enterprise' },
  { key: 'developer', label: 'Developer' },
  { key: 'notifications', label: 'Notifications' },
];

export function Channels() {
  const queryClient = useQueryClient();
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Setup modal states
  const [setupModal, setSetupModal] = useState<Channel | null>(null);
  const [setupStep, setSetupStep] = useState(1); // 1=Configure, 2=Verify, 3=Ready
  const [testPassed, setTestPassed] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBusinessApi, setShowBusinessApi] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  // QR Code states (WhatsApp)
  const [qrState, setQrState] = useState({
    loading: false,
    available: false,
    dataUrl: '',
    sessionId: '',
    message: '',
    help: '',
    connected: false,
    expired: false,
    error: '',
  });

  // Fetch channels
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

  // Filter channels
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

  const categoryCount = (cat: string) => {
    const all = channels.filter((ch) => cat === 'all' || ch.category === cat);
    const configured = all.filter((ch) => ch.configured);
    return `${configured.length}/${all.length}`;
  };

  // Poll for status updates
  const refreshStatus = useCallback(async () => {
    try {
      const data = await api.get<{ channels: Channel[] }>('/api/channels');
      const byName: Record<string, Channel> = {};
      (data.channels || []).forEach((ch) => {
        byName[ch.name] = ch;
      });

      // Update query cache with fresh data
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
              fields: fresh.fields,
            };
          }
          return c;
        });
      });
    } catch (e) {
      console.warn('Channel refresh failed:', e);
    }
  }, [queryClient]);

  // Start polling on mount
  useEffect(() => {
    pollTimerRef.current = setInterval(refreshStatus, 15000);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [refreshStatus]);

  // Cleanup QR polling on unmount
  useEffect(() => {
    return () => {
      if (qrPollTimerRef.current) clearInterval(qrPollTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Get basic and advanced fields
  const basicFields = setupModal?.fields?.filter((f) => !f.advanced) || [];
  const advancedFields = setupModal?.fields?.filter((f) => f.advanced) || [];
  const hasAdvanced = advancedFields.length > 0;
  const isQrChannel = setupModal?.setup_type === 'qr';

  // Open setup modal
  const openSetup = (ch: Channel) => {
    setSetupModal(ch);

    // Pre-populate form values from saved config (non-secret fields)
    const vals: Record<string, string> = {};
    if (ch.fields) {
      ch.fields.forEach((f) => {
        if (f.value !== undefined && f.value !== null && f.type !== 'secret') {
          vals[f.key] = String(f.value);
        }
      });
    }
    setFormValues(vals);
    setShowAdvanced(false);
    setShowBusinessApi(false);
    setSetupStep(ch.configured ? 3 : 1);
    setTestPassed(!!ch.configured);
    resetQR();

    // Auto-start QR flow for QR-type channels
    if (ch.setup_type === 'qr') {
      setTimeout(() => startQR(), 0);
    }
  };

  // Reset QR state
  const resetQR = () => {
    setQrState({
      loading: false,
      available: false,
      dataUrl: '',
      sessionId: '',
      message: '',
      help: '',
      connected: false,
      expired: false,
      error: '',
    });
    if (qrPollTimerRef.current) {
      clearInterval(qrPollTimerRef.current);
      qrPollTimerRef.current = null;
    }
  };

  // Start QR code flow
  const startQR = async () => {
    setQrState((prev) => ({
      ...prev,
      loading: true,
      error: '',
      connected: false,
      expired: false,
    }));

    try {
      const result = await api.post<QRStartResponse>('/api/channels/whatsapp/qr/start', {});

      setQrState((prev) => ({
        ...prev,
        available: result.available || false,
        dataUrl: result.qr_data_url || '',
        sessionId: result.session_id || '',
        message: result.message || '',
        help: result.help || '',
        connected: result.connected || false,
        loading: false,
      }));

      if (result.available && result.qr_data_url && !result.connected) {
        pollQR(result.session_id || '');
      }

      if (result.connected) {
        setTestPassed(true);
        setSetupStep(3);
        refreshStatus();
      }
    } catch (e: any) {
      setQrState((prev) => ({
        ...prev,
        error: e.message || 'Could not start QR login',
        loading: false,
      }));
    }
  };

  // Poll QR status
  const pollQR = (sessionId: string) => {
    if (qrPollTimerRef.current) clearInterval(qrPollTimerRef.current);

    qrPollTimerRef.current = setInterval(async () => {
      try {
        const result = await api.get<QRStatusResponse>(
          `/api/channels/whatsapp/qr/status?session_id=${encodeURIComponent(sessionId)}`
        );

        if (result.connected) {
          if (qrPollTimerRef.current) clearInterval(qrPollTimerRef.current);
          setQrState((prev) => ({
            ...prev,
            connected: true,
            message: result.message || 'Connected!',
          }));
          setTestPassed(true);
          setSetupStep(3);
          refreshStatus();
        } else if (result.expired) {
          if (qrPollTimerRef.current) clearInterval(qrPollTimerRef.current);
          setQrState((prev) => ({
            ...prev,
            expired: true,
            message: 'QR code expired. Click to generate a new one.',
          }));
        } else {
          setQrState((prev) => ({
            ...prev,
            message: result.message || 'Waiting for scan...',
          }));
        }
      } catch (e) {
        // Silent retry
      }
    }, 3000);
  };

  // Save channel configuration
  const saveChannel = async () => {
    if (!setupModal) return;

    const name = setupModal.name;
    setConfiguring(true);

    try {
      await api.post(`/api/channels/${name}/configure`, {
        fields: formValues,
      });

      setSetupStep(2);

      // Auto-test after save
      try {
        const testResult = await api.post<TestResponse>(`/api/channels/${name}/test`, {});
        if (testResult.status === 'ok') {
          setTestPassed(true);
          setSetupStep(3);
        }
      } catch (te) {
        // Test failed but config saved
      }

      await refreshStatus();
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    } catch (e: any) {
      console.error('Failed to save channel:', e);
    } finally {
      setConfiguring(false);
    }
  };

  // Test channel connection
  const testChannel = async () => {
    if (!setupModal) return;

    const name = setupModal.name;
    setTesting((prev) => ({ ...prev, [name]: true }));

    try {
      const result = await api.post<TestResponse>(`/api/channels/${name}/test`, {});
      if (result.status === 'ok') {
        setTestPassed(true);
        setSetupStep(3);
      }
    } catch (e: any) {
      console.error('Test failed:', e);
    } finally {
      setTesting((prev) => ({ ...prev, [name]: false }));
    }
  };

  // Remove channel configuration
  const removeChannel = async () => {
    if (!setupModal) return;

    const name = setupModal.name;

    try {
      await api.del(`/api/channels/${name}/configure`);
      await refreshStatus();
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      setSetupModal(null);
    } catch (e: any) {
      console.error('Failed to remove channel:', e);
    }
  };

  // Copy config template
  const copyConfig = async () => {
    const tpl = setupModal?.config_template;
    if (!tpl) return;

    try {
      await navigator.clipboard.writeText(tpl);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  // Get status badge
  const getStatusBadge = (channel: Channel) => {
    if (!channel.configured) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <XCircle className="h-3 w-3 mr-1" />
          Not Configured
        </Badge>
      );
    }
    if (!channel.has_token) {
      return (
        <Badge variant="secondary">
          <AlertCircle className="h-3 w-3 mr-1" />
          Missing Token
        </Badge>
      );
    }
    if (channel.configured && channel.has_token) {
      return (
        <Badge className="bg-green-500">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Ready
        </Badge>
      );
    }
    return <Badge variant="secondary">Configured</Badge>;
  };

  // Get difficulty class
  const getDifficultyClass = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-600';
      case 'Hard':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  // Get field value display for placeholder
  const getFieldPlaceholder = (field: ChannelField) => {
    if (field.type === 'secret' && field.value) {
      return '••••••• (set — leave blank to keep)';
    }
    return field.env_var ? `Env: ${field.env_var}` : '';
  };

  // Render form field based on type
  const renderField = (field: ChannelField) => {
    const value = formValues[field.key] || '';
    const placeholder = getFieldPlaceholder(field);

    return (
      <div key={field.key} className="space-y-2">
        <Label htmlFor={field.key}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {field.type === 'secret' && (
          <Input
            id={field.key}
            type="password"
            placeholder={placeholder}
            value={value}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
            }
          />
        )}
        {field.type === 'number' && (
          <Input
            id={field.key}
            type="number"
            placeholder={field.env_var ? `Env: ${field.env_var}` : undefined}
            value={value}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
            }
          />
        )}
        {(field.type === 'text' || field.type === 'list') && (
          <Input
            id={field.key}
            type="text"
            placeholder={
              field.type === 'list'
                ? `${field.env_var ? `Env: ${field.env_var}` : ''} (comma-separated)`
                : field.env_var
                ? `Env: ${field.env_var}`
                : undefined
            }
            value={value}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
            }
          />
        )}
        {field.env_var && field.value && (
          <p className="text-xs text-muted-foreground">{field.env_var} is set</p>
        )}
      </div>
    );
  };

  // Render step indicator
  const renderStepIndicator = () => {
    if (isQrChannel) return null;

    return (
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              setupStep >= 1
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium">Configure</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              setupStep >= 2
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Verify</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              setupStep >= 3 ? 'bg-green-500 text-white' : 'bg-muted'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Ready</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Channels</h1>
            <p className="text-muted-foreground">
              Manage messaging channels and integrations
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {configuredCount} of {channels.length} configured
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span className="text-muted-foreground">Loading channels...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-red-600 mb-2">
              {error instanceof Error ? error.message : 'Could not load channels.'}
            </p>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <>
            {/* Category Tabs */}
            <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
              <TabsList className="flex-wrap h-auto">
                {categories.map((cat) => (
                  <TabsTrigger key={cat.key} value={cat.key}>
                    {cat.label}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({categoryCount(cat.key)})
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Search */}
            <div className="flex gap-4">
              <Input
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {/* Channel Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredChannels.map((channel) => (
                <Card
                  key={channel.name}
                  className={!channel.configured ? 'opacity-75' : undefined}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{channel.icon}</span>
                        <CardTitle className="text-base">
                          {channel.display_name}
                        </CardTitle>
                      </div>
                      {getStatusBadge(channel)}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <span className="capitalize">{channel.category}</span>
                      <span>•</span>
                      <span className={getDifficultyClass(channel.difficulty)}>
                        {channel.difficulty}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {channel.description}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Setup time: {channel.setup_time}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openSetup(channel)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        {channel.configured ? 'Manage' : 'Set up'}
                      </Button>
                      {channel.configured && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={async () => {
                            setSetupModal(channel);
                            await removeChannel();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredChannels.length === 0 && (
              <div className="text-center py-12">
                <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No channels match your search.</p>
              </div>
            )}
          </>
        )}

        {/* Setup Dialog */}
        <Dialog
          open={!!setupModal}
          onOpenChange={(open) => {
            if (!open) {
              setSetupModal(null);
              resetQR();
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {setupModal && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{setupModal.icon}</span>
                    <div>
                      <DialogTitle>{setupModal.display_name}</DialogTitle>
                      <DialogDescription>
                        {setupModal.quick_setup || setupModal.description}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* Step Indicator */}
                {renderStepIndicator()}

                {/* QR Code Flow (WhatsApp) */}
                {isQrChannel && !showBusinessApi && (
                  <div className="space-y-6">
                    {/* QR: Loading */}
                    {qrState.loading && (
                      <div className="flex flex-col items-center gap-2 py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="text-sm text-muted-foreground">
                          Connecting to WhatsApp Web gateway...
                        </p>
                      </div>
                    )}

                    {/* QR: Gateway available — show QR code */}
                    {!qrState.loading &&
                      qrState.available &&
                      qrState.dataUrl &&
                      !qrState.connected && (
                        <div className="text-center space-y-4">
                          <div className="bg-white p-4 rounded-lg inline-block">
                            <img
                              src={qrState.dataUrl}
                              alt="WhatsApp QR Code"
                              className="w-64 h-64"
                              style={{ imageRendering: 'pixelated' }}
                            />
                          </div>
                          <ol className="text-left text-sm mx-auto max-w-sm space-y-1 opacity-80">
                            {(setupModal.setup_steps || []).map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ol>
                          <p className="text-xs text-muted-foreground">
                            {qrState.message}
                          </p>
                          {qrState.expired && (
                            <Button size="sm" variant="ghost" onClick={startQR}>
                              Generate New QR
                            </Button>
                          )}
                        </div>
                      )}

                    {/* QR: Connected! */}
                    {!qrState.loading && qrState.connected && (
                      <div className="text-center py-8">
                        <div className="text-5xl mb-2">✓</div>
                        <p className="text-sm font-semibold">
                          {qrState.message || 'WhatsApp linked successfully!'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Channel will activate automatically.
                        </p>
                      </div>
                    )}

                    {/* QR: Gateway not available — show setup hint */}
                    {!qrState.loading && !qrState.available && (
                      <div className="py-4">
                        <div className="bg-muted rounded-lg p-5 text-center">
                          <div className="text-3xl mb-2 opacity-50">📱</div>
                          <p className="text-sm">
                            {qrState.message || 'WhatsApp Web gateway not available'}
                          </p>
                          {qrState.help && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {qrState.help}
                            </p>
                          )}
                          {qrState.error && (
                            <p className="text-xs text-red-500 mt-1">
                              {qrState.error}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3 text-center">
                          Or use the{' '}
                          <button
                            className="text-primary underline"
                            onClick={() => setShowBusinessApi(true)}
                          >
                            Business API
                          </button>{' '}
                          with a Meta developer account.
                        </p>
                      </div>
                    )}

                    {/* QR: Switch to Business API link */}
                    {!qrState.loading && qrState.available && (
                      <p className="text-xs text-muted-foreground text-center">
                        Have a Meta Business account?{' '}
                        <button
                          className="text-primary underline"
                          onClick={() => setShowBusinessApi(true)}
                        >
                          Use Business API instead
                        </button>
                      </p>
                    )}

                    {/* Action buttons for QR mode */}
                    {!qrState.loading && (
                      <div className="flex gap-2 flex-wrap justify-center">
                        {qrState.available && !qrState.connected && !qrState.expired && (
                          <Button variant="ghost" onClick={startQR}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh QR
                          </Button>
                        )}
                        {setupModal.configured && (
                          <Button
                            variant="ghost"
                            onClick={testChannel}
                            disabled={testing[setupModal.name]}
                          >
                            {testing[setupModal.name] ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              'Test Connection'
                            )}
                          </Button>
                        )}
                        {setupModal.configured && (
                          <Button
                            variant="ghost"
                            className="text-destructive"
                            onClick={removeChannel}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Standard Form Flow (non-QR or Business API) */}
                {(!isQrChannel || showBusinessApi) &&
                  !(setupStep === 3 && testPassed && !isQrChannel) && (
                    <div className="space-y-6">
                      {/* Back to QR link (only for QR channels in Business API mode) */}
                      {isQrChannel && showBusinessApi && (
                        <div className="mb-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowBusinessApi(false)}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to QR scan
                          </Button>
                          <p className="text-xs text-muted-foreground mt-1">
                            Configure via WhatsApp Cloud API (requires a Meta
                            Business developer account).
                          </p>
                        </div>
                      )}

                      {/* Step 1: Configure */}
                      {setupStep === 1 && (
                        <>
                          {/* Quick setup steps */}
                          {!isQrChannel &&
                            setupModal.setup_steps &&
                            setupModal.setup_steps.length > 0 && (
                              <div className="bg-muted p-4 rounded-lg">
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                  <ExternalLink className="h-4 w-4" />
                                  How to get credentials
                                </h4>
                                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                  {setupModal.setup_steps.map((step, idx) => (
                                    <li key={idx}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}

                          {/* Basic Fields */}
                          <div className="space-y-4">
                            <h4 className="font-medium">Basic Configuration</h4>
                            {(isQrChannel && showBusinessApi
                              ? advancedFields
                              : basicFields
                            ).length > 0 ? (
                              (isQrChannel && showBusinessApi
                                ? advancedFields
                                : basicFields
                              ).map(renderField)
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No configuration required
                              </p>
                            )}
                          </div>

                          {/* Advanced Fields */}
                          {!isQrChannel && hasAdvanced && (
                            <div className="space-y-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-2"
                              >
                                <ChevronRight
                                  className={`h-4 w-4 transition-transform ${
                                    showAdvanced ? 'rotate-90' : ''
                                  }`}
                                />
                                {showAdvanced
                                  ? 'Hide advanced'
                                  : `Show advanced (${advancedFields.length})`}
                              </Button>
                              {showAdvanced && (
                                <div className="space-y-4 pl-4 border-l-2">
                                  {advancedFields.map(renderField)}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Config Template */}
                          {setupModal.config_template && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Configuration Template</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={copyConfig}
                                  className="flex items-center gap-1"
                                >
                                  <Copy className="h-3 w-3" />
                                  Copy
                                </Button>
                              </div>
                              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                                {setupModal.config_template}
                              </pre>
                            </div>
                          )}
                        </>
                      )}

                      {/* Step 2: Verify */}
                      {setupStep === 2 && (
                        <div className="text-center space-y-6">
                          <div className="flex items-center justify-center gap-2 text-lg font-medium">
                            <MessageSquare className="h-5 w-5" />
                            <span>Test Connection</span>
                          </div>

                          <p className="text-muted-foreground">
                            Click the button below to verify your configuration
                            and test the connection to {setupModal.display_name}.
                          </p>

                          <Button
                            onClick={testChannel}
                            disabled={testing[setupModal.name]}
                            size="lg"
                            className="min-w-[200px]"
                          >
                            {testing[setupModal.name] ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Test Connection
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                {/* Step 3: Ready (non-QR channels) */}
                {!isQrChannel && setupStep === 3 && testPassed && (
                  <div className="text-center space-y-6 py-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-8">
                      <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-green-700 mb-2">
                        {setupModal.display_name} is Ready!
                      </h3>
                      <p className="text-green-600">
                        Your channel has been configured and tested successfully.
                      </p>
                    </div>

                    <div className="text-left bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">What&apos;s next?</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Use this channel in your agent workflows</li>
                        <li>Configure message templates and responses</li>
                        <li>Set up automated replies and handlers</li>
                      </ul>
                    </div>

                    <div className="flex gap-2 justify-center">
                      <Button variant="ghost" onClick={() => setSetupStep(1)}>
                        Edit Config
                      </Button>
                      <Button onClick={() => setSetupModal(null)}>Done</Button>
                    </div>
                  </div>
                )}

                <DialogFooter className="flex justify-between">
                  <div>
                    {setupStep === 1 && setupModal.configured && (
                      <Button variant="destructive" onClick={removeChannel}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {setupStep > 1 && setupStep < 3 && !isQrChannel && (
                      <Button
                        variant="outline"
                        onClick={() => setSetupStep(setupStep - 1)}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                    )}

                    {setupStep === 1 && (
                      <Button onClick={saveChannel} disabled={configuring}>
                        {configuring ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            {setupModal.configured ? 'Update' : 'Save & Test'}
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    )}

                    {setupStep === 3 && !isQrChannel && (
                      <Button onClick={() => setSetupModal(null)}>Done</Button>
                    )}
                  </div>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default Channels;
