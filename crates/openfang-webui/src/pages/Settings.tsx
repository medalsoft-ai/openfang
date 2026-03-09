import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api } from '@/api/client';
import { Loader2, Key, Shield, Wrench, Database, Network, Plus, Trash2, Check, X, ExternalLink, DollarSign, Info } from 'lucide-react';

// Types
interface Provider {
  id: string;
  display_name: string;
  auth_status: 'configured' | 'not_set' | 'missing' | 'no_key';
  is_local?: boolean;
  base_url?: string;
  health?: string;
  api_key_env?: string;
  model_count?: number;
  key_required?: boolean;
}

interface Model {
  id: string;
  display_name?: string;
  provider: string;
  tier?: string;
  context_window?: number;
  pricing?: { input?: number; output?: number };
}

interface Tool {
  name: string;
  description: string;
  category: string;
}

interface SecurityData {
  core_protections?: Record<string, boolean>;
  configurable?: Record<string, any>;
  monitoring?: Record<string, any>;
}

interface Peer {
  node_id: string;
  node_name: string;
  address: string;
  state: string;
  agent_count: number;
  protocol_version: number;
}

// Providers Tab
function ProvidersTab() {
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [customProviderName, setCustomProviderName] = useState('');
  const [customProviderUrl, setCustomProviderUrl] = useState('');
  const [customProviderKey, setCustomProviderKey] = useState('');
  const [copilotOAuth, setCopilotOAuth] = useState<{ polling: boolean; userCode?: string; verificationUri?: string }>({ polling: false });
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  // Cleanup poll timeout on unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  const { data: providers = [], isLoading } = useQuery<Provider[]>({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await api.get<{ providers: Provider[] }>('/api/providers');
      return res.providers || [];
    },
  });

  // Initialize URL inputs from providers
  useEffect(() => {
    const urls: Record<string, string> = {};
    providers.forEach((p) => {
      if (p.is_local && p.base_url) {
        urls[p.id] = p.base_url;
      }
    });
    setUrlInputs(urls);
  }, [providers]);

  const saveKeyMutation = useMutation({
    mutationFn: async ({ id, key }: { id: string; key: string }) => {
      await api.post(`/api/providers/${encodeURIComponent(id)}/key`, { key });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });

  const removeKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.del(`/api/providers/${encodeURIComponent(id)}/key`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post<{ status: string; latency_ms?: number; error?: string }>(`/api/providers/${encodeURIComponent(id)}/test`, {});
    },
  });

  const saveUrlMutation = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      return api.put<{ reachable: boolean; latency_ms?: number }>(`/api/providers/${encodeURIComponent(id)}/url`, { base_url: url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });

  const addCustomProviderMutation = useMutation({
    mutationFn: async ({ name, url, key }: { name: string; url: string; key: string }) => {
      const result = await api.put(`/api/providers/${encodeURIComponent(name)}/url`, { base_url: url });
      if (key.trim()) {
        await api.post(`/api/providers/${encodeURIComponent(name)}/key`, { key: key.trim() });
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setCustomProviderName('');
      setCustomProviderUrl('');
      setCustomProviderKey('');
    },
  });

  const startCopilotOAuth = async () => {
    setCopilotOAuth({ polling: true });
    try {
      const resp = await api.post<{ user_code: string; verification_uri: string; poll_id: string; interval: number }>('/api/providers/github-copilot/oauth/start', {});
      setCopilotOAuth({
        polling: true,
        userCode: resp.user_code,
        verificationUri: resp.verification_uri,
      });
      window.open(resp.verification_uri, '_blank');
      pollCopilotOAuth(resp.poll_id, resp.interval || 5);
    } catch (e) {
      setCopilotOAuth({ polling: false });
    }
  };

  const pollCopilotOAuth = (pollId: string, interval: number) => {
    const poll = async () => {
      try {
        const resp = await api.get<{ status: string; error?: string }>(`/api/providers/github-copilot/oauth/poll/${pollId}`);
        if (resp.status === 'complete') {
          setCopilotOAuth({ polling: false });
          queryClient.invalidateQueries({ queryKey: ['providers'] });
        } else if (resp.status === 'pending') {
          pollTimeoutRef.current = setTimeout(poll, interval * 1000);
        } else {
          setCopilotOAuth({ polling: false });
        }
      } catch (e) {
        setCopilotOAuth({ polling: false });
      }
    };
    pollTimeoutRef.current = setTimeout(poll, interval * 1000);
  };

  const getAuthBadge = (status: string, health?: string) => {
    if (status === 'configured') {
      if (health === 'cooldown' || health === 'open') {
        return <Badge variant="outline" className="text-yellow-600">Limited</Badge>;
      }
      return <Badge variant="default">Configured</Badge>;
    }
    if (status === 'not_set' || status === 'missing') {
      return <Badge variant="destructive">Not Set</Badge>;
    }
    return <Badge variant="secondary">No Key Needed</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom Provider Dialog */}
      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Provider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Provider</DialogTitle>
              <DialogDescription>Add a custom OpenAI-compatible API endpoint</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Provider Name</label>
                <Input
                  placeholder="my-provider"
                  value={customProviderName}
                  onChange={(e) => setCustomProviderName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Base URL</label>
                <Input
                  placeholder="https://api.example.com/v1"
                  value={customProviderUrl}
                  onChange={(e) => setCustomProviderUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key (optional)</label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={customProviderKey}
                  onChange={(e) => setCustomProviderKey(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => addCustomProviderMutation.mutate({
                  name: customProviderName,
                  url: customProviderUrl,
                  key: customProviderKey,
                })}
                disabled={!customProviderName || !customProviderUrl || addCustomProviderMutation.isPending}
              >
                {addCustomProviderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Provider
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* GitHub Copilot OAuth */}
      {providers.some(p => p.id === 'github-copilot') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">GitHub Copilot</CardTitle>
            <CardDescription>Authenticate with GitHub Copilot</CardDescription>
          </CardHeader>
          <CardContent>
            {copilotOAuth.polling && copilotOAuth.userCode ? (
              <div className="space-y-4">
                <div className="text-sm">Enter this code: <code className="bg-muted px-2 py-1 rounded">{copilotOAuth.userCode}</code></div>
                <Button variant="outline" onClick={() => window.open(copilotOAuth.verificationUri, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Verification Page
                </Button>
              </div>
            ) : (
              <Button onClick={startCopilotOAuth}>Start OAuth</Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Provider List - Using responsive grid like Alpine */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">AI Providers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <Card key={provider.id} className={provider.auth_status === 'configured' ? 'border-green-500/30' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{provider.display_name}</CardTitle>
                  {getAuthBadge(provider.auth_status, provider.health)}
                </div>
                <CardDescription className="text-xs">
                  {provider.model_count !== undefined ? `${provider.model_count} model(s) available` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {/* Environment variable hint */}
                {provider.api_key_env && provider.auth_status !== 'configured' && (
                  <div className="text-xs text-muted-foreground">
                    Env: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{provider.api_key_env}</code>
                  </div>
                )}

                {/* Claude Code install hint */}
                {provider.id === 'claude-code' && provider.auth_status !== 'configured' && (
                  <div className="text-xs text-muted-foreground">
                    Install: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">npm install -g @anthropic-ai/claude-code</code>
                  </div>
                )}

                {/* API Key Input for unconfigured providers */}
                {provider.auth_status !== 'configured' && provider.auth_status !== 'no_key' && provider.api_key_env && (
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder={`Enter ${provider.api_key_env}`}
                      value={keyInputs[provider.id] || ''}
                      onChange={(e) =>
                        setKeyInputs((prev) => ({
                          ...prev,
                          [provider.id]: e.target.value,
                        }))
                      }
                      className="text-sm h-8"
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        saveKeyMutation.mutate({
                          id: provider.id,
                          key: keyInputs[provider.id] || '',
                        })
                      }
                      disabled={!keyInputs[provider.id] || saveKeyMutation.isPending}
                      className="h-8"
                    >
                      {saveKeyMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                )}

                {/* Environment hint for unconfigured */}
                {provider.auth_status !== 'configured' && provider.api_key_env && (
                  <div className="text-[10px] text-muted-foreground">
                    Or set <code className="text-accent-foreground bg-accent/10 px-1 rounded">{provider.api_key_env}</code> in environment and restart
                  </div>
                )}

                {/* No key needed message */}
                {!provider.api_key_env || provider.key_required === false ? (
                  <div className="text-xs text-green-600">
                    No API key needed &mdash; runs locally or is free
                  </div>
                ) : null}

                {/* Local Provider Base URL Editor */}
                {provider.is_local && (
                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground mb-1">Base URL</div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="http://localhost:..."
                        value={urlInputs[provider.id] || ''}
                        onChange={(e) => setUrlInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                        className="text-xs h-8"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => saveUrlMutation.mutate({ id: provider.id, url: urlInputs[provider.id] })}
                        disabled={saveUrlMutation.isPending}
                        className="h-8"
                      >
                        {saveUrlMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Actions for configured providers */}
                {provider.auth_status === 'configured' && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testMutation.mutate(provider.id)}
                      disabled={testMutation.isPending}
                      className="h-8 text-xs"
                    >
                      {testMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeKeyMutation.mutate(provider.id)}
                      disabled={removeKeyMutation.isPending}
                      className="h-8 text-xs text-destructive hover:text-destructive"
                    >
                      Remove Key
                    </Button>
                    {testMutation.data && (
                      <Badge variant={testMutation.data.status === 'ok' ? 'default' : 'destructive'} className="text-xs">
                        {testMutation.data.status === 'ok' ? `${testMutation.data.latency_ms}ms` : 'Failed'}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// Models Tab
function ModelsTab() {
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [customModelId, setCustomModelId] = useState('');
  const [customModelProvider, setCustomModelProvider] = useState('openrouter');
  const queryClient = useQueryClient();

  const { data: models = [], isLoading } = useQuery<Model[]>({
    queryKey: ['models'],
    queryFn: async () => {
      const res = await api.get<{ models: Model[] }>('/api/models');
      return res.models || [];
    },
  });

  const addCustomModelMutation = useMutation({
    mutationFn: async ({ id, provider }: { id: string; provider: string }) => {
      return api.post('/api/models/custom', {
        id,
        provider,
        context_window: 128000,
        max_output_tokens: 8192,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      setCustomModelId('');
    },
  });

  const deleteCustomModelMutation = useMutation({
    mutationFn: async (modelId: string) => {
      await api.del(`/api/models/custom/${encodeURIComponent(modelId)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });

  const filteredModels = models.filter((m) => {
    if (providerFilter && m.provider !== providerFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.id.toLowerCase().includes(q) ||
        (m.display_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const uniqueProviders = Array.from(
    new Set(models.map((m) => m.provider))
  ).sort();

  const formatCost = (cost?: number) => {
    if (!cost && cost !== 0) return '-';
    return `$${cost.toFixed(4)}`;
  };

  const formatContext = (ctx?: number) => {
    if (!ctx) return '-';
    if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(1)}M`;
    if (ctx >= 1000) return `${Math.round(ctx / 1000)}K`;
    return String(ctx);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Custom Model */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Custom Model</CardTitle>
          <CardDescription>Add a custom model from an OpenAI-compatible provider</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="model-id"
              value={customModelId}
              onChange={(e) => setCustomModelId(e.target.value)}
              className="flex-1"
            />
            <select
              value={customModelProvider}
              onChange={(e) => setCustomModelProvider(e.target.value)}
              className="rounded-md border px-3 py-2"
            >
              {uniqueProviders.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <Button
              onClick={() => addCustomModelMutation.mutate({ id: customModelId, provider: customModelProvider })}
              disabled={!customModelId || addCustomModelMutation.isPending}
            >
              {addCustomModelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex gap-4">
        <Input
          placeholder="Search models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="rounded-md border px-3 py-2"
        >
          <option value="">All Providers</option>
          {uniqueProviders.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Models List */}
      <div className="grid gap-4">
        {filteredModels.map((model) => (
          <Card key={model.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {model.display_name || model.id}
                  </CardTitle>
                  <CardDescription>{model.id}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{model.provider}</Badge>
                  {model.tier && <Badge>{model.tier}</Badge>}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteCustomModelMutation.mutate(model.id)}
                    disabled={deleteCustomModelMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Context: </span>
                  {formatContext(model.context_window)}
                </div>
                <div>
                  <span className="text-muted-foreground">Input: </span>
                  {formatCost(model.pricing?.input)}
                </div>
                <div>
                  <span className="text-muted-foreground">Output: </span>
                  {formatCost(model.pricing?.output)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Tools Tab
function ToolsTab() {
  const [search, setSearch] = useState('');

  const { data: tools = [], isLoading } = useQuery<Tool[]>({
    queryKey: ['tools'],
    queryFn: async () => {
      const res = await api.get<{ tools: Tool[] }>('/api/tools');
      return res.tools || [];
    },
  });

  const filteredTools = tools.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search tools..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="grid gap-4">
        {filteredTools.map((tool) => (
          <Card key={tool.name}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{tool.name}</CardTitle>
                <Badge variant="secondary">{tool.category}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {tool.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Security Tab
function SecurityTab() {
  const { data: security, isLoading } = useQuery<SecurityData>({
    queryKey: ['security'],
    queryFn: async () => api.get('/api/security'),
  });

  const [verifying, setVerifying] = useState(false);
  const [chainResult, setChainResult] = useState<{ valid: boolean; error?: string } | null>(null);

  const verifyAuditChain = async () => {
    setVerifying(true);
    try {
      const res = await api.get<{ valid: boolean; error?: string }>('/api/audit/verify');
      setChainResult(res);
    } catch (e) {
      setChainResult({ valid: false, error: 'Verification failed' });
    }
    setVerifying(false);
  };

  const coreFeatures = [
    {
      name: 'Path Traversal Prevention',
      key: 'path_traversal',
      description: 'Blocks directory escape attacks (../) in all file operations.',
      threat: 'Directory escape, privilege escalation via symlinks',
    },
    {
      name: 'SSRF Protection',
      key: 'ssrf_protection',
      description: 'Blocks outbound requests to private IPs and cloud metadata endpoints.',
      threat: 'Internal network reconnaissance, cloud credential theft',
    },
    {
      name: 'Capability-Based Access Control',
      key: 'capability_system',
      description: 'Deny-by-default permission system for all agent operations.',
      threat: 'Unauthorized resource access, sandbox escape',
    },
    {
      name: 'Privilege Escalation Prevention',
      key: 'privilege_escalation_prevention',
      description: 'Child capabilities must be a subset of parent capabilities.',
      threat: 'Capability escalation through agent spawning',
    },
    {
      name: 'Subprocess Environment Isolation',
      key: 'subprocess_isolation',
      description: 'Child processes inherit only safe environment variables.',
      threat: 'Secret exfiltration via child process environment',
    },
    {
      name: 'Security Headers',
      key: 'security_headers',
      description: 'CSP, X-Frame-Options, and other security headers on all responses.',
      threat: 'XSS, clickjacking, MIME sniffing',
    },
  ];

  const isActive = (key: string) => {
    if (!security?.core_protections) return true;
    return security.core_protections[key] !== false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Core Security Features */}
      <div>
        <h3 className="text-lg font-medium mb-4">Core Security Features</h3>
        <div className="grid gap-4">
          {coreFeatures.map((feature) => (
            <Card key={feature.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{feature.name}</CardTitle>
                  <Badge variant={isActive(feature.key) ? 'default' : 'destructive'}>
                    {isActive(feature.key) ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{feature.description}</p>
                <p className="text-xs text-muted-foreground">Threat: {feature.threat}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Audit Chain Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit Chain Verification</CardTitle>
          <CardDescription>Verify the integrity of the Merkle audit trail</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={verifyAuditChain} disabled={verifying}>
            {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify Chain
          </Button>
          {chainResult && (
            <div className={`flex items-center gap-2 ${chainResult.valid ? 'text-green-600' : 'text-red-600'}`}>
              {chainResult.valid ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              <span>{chainResult.valid ? 'Chain is valid' : chainResult.error || 'Chain is invalid'}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Network Tab (Peers)
function NetworkTab() {
  const { data: peers = [], isLoading } = useQuery<Peer[]>({
    queryKey: ['peers'],
    queryFn: async () => {
      const res = await api.get<{ peers: Peer[] }>('/api/peers');
      return res.peers || [];
    },
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Connected Peers</h3>
        <div className="grid gap-4">
          {peers.map((peer) => (
            <Card key={peer.node_id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{peer.node_name || peer.node_id.slice(0, 8)}</CardTitle>
                  <Badge variant={peer.state === 'connected' ? 'default' : 'secondary'}>
                    {peer.state}
                  </Badge>
                </div>
                <CardDescription>{peer.address}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Agents: </span>
                    {peer.agent_count}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Protocol: </span>
                    v{peer.protocol_version}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {peers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No peers connected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Config Tab
function ConfigTab() {
  const queryClient = useQueryClient();
  const [configSchema, setConfigSchema] = useState<Record<string, { fields: { key: string; label: string; type: string; description?: string; default?: unknown }[] }> | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [schemaRes, valuesRes] = await Promise.all([
          api.get<{ sections?: Record<string, { fields: { key: string; label: string; type: string; description?: string; default?: unknown }[] }> }>('/api/config/schema').catch(() => ({ sections: {} })),
          api.get<Record<string, unknown>>('/api/config').catch(() => ({})),
        ]);
        setConfigSchema(schemaRes.sections || null);
        setConfigValues(valuesRes || {});
      } catch {
        // silent
      }
    };
    loadConfig();
  }, []);

  const markDirty = (section: string, field: string) => {
    setDirtyFields(prev => new Set(prev).add(`${section}.${field}`));
  };

  const saveField = async (section: string, field: string, value: unknown) => {
    const key = `${section}.${field}`;
    setSavingFields(prev => new Set(prev).add(key));
    try {
      await api.post('/api/config/set', { path: key, value });
      setDirtyFields(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['config'] });
    } catch (e) {
      console.error('Failed to save config:', e);
    }
    setSavingFields(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  if (!configSchema) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(configSchema).map(([sectionName, section]) => (
        <Card key={sectionName}>
          <CardHeader>
            <CardTitle className="text-base capitalize">{sectionName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.fields.map((field) => {
              const key = `${sectionName}.${field.key}`;
              const value = configValues[key] ?? field.default ?? '';
              const isDirty = dirtyFields.has(key);
              const isSaving = savingFields.has(key);

              return (
                <div key={field.key} className="space-y-2">
                  <label className="text-sm font-medium">{field.label}</label>
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                  <div className="flex gap-2">
                    {field.type === 'boolean' ? (
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        value={String(value)}
                        onChange={(e) => {
                          const newValue = e.target.value === 'true';
                          setConfigValues(prev => ({ ...prev, [key]: newValue }));
                          markDirty(sectionName, field.key);
                          saveField(sectionName, field.key, newValue);
                        }}
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    ) : field.type === 'number' ? (
                      <Input
                        type="number"
                        value={String(value)}
                        onChange={(e) => {
                          const newValue = parseFloat(e.target.value) || 0;
                          setConfigValues(prev => ({ ...prev, [key]: newValue }));
                          markDirty(sectionName, field.key);
                        }}
                        onBlur={() => saveField(sectionName, field.key, value)}
                      />
                    ) : (
                      <Input
                        type="text"
                        value={String(value)}
                        onChange={(e) => {
                          setConfigValues(prev => ({ ...prev, [key]: e.target.value }));
                          markDirty(sectionName, field.key);
                        }}
                        onBlur={() => saveField(sectionName, field.key, value)}
                      />
                    )}
                    {isDirty && !isSaving && <Badge variant="secondary">Modified</Badge>}
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Budget Tab
function BudgetTab() {
  const [editMode, setEditMode] = useState(false);
  const [editHourly, setEditHourly] = useState('');
  const [editDaily, setEditDaily] = useState('');
  const [editMonthly, setEditMonthly] = useState('');
  const [editAlert, setEditAlert] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: budget, isLoading, refetch } = useQuery<{
    hourly_spend: number;
    hourly_limit: number;
    daily_spend: number;
    daily_limit: number;
    monthly_spend: number;
    monthly_limit: number;
    alert_threshold: number;
    hourly_pct: number;
    daily_pct: number;
    monthly_pct: number;
  }>({
    queryKey: ['budget'],
    queryFn: async () => api.get('/api/budget'),
  });

  const { data: agentRanking = [] } = useQuery<Array<{
    agent_id: string;
    name: string;
    daily_cost_usd: number;
    hourly_limit: number;
    daily_limit: number;
    monthly_limit: number;
  }>>({
    queryKey: ['budget', 'agents'],
    queryFn: async () => {
      const res = await api.get<{ agents: Array<{
        agent_id: string;
        name: string;
        daily_cost_usd: number;
        hourly_limit: number;
        daily_limit: number;
        monthly_limit: number;
      }> }>('/api/budget/agents');
      return res.agents || [];
    },
  });

  const startEdit = () => {
    if (!budget) return;
    setEditHourly(String(budget.hourly_limit || 0));
    setEditDaily(String(budget.daily_limit || 0));
    setEditMonthly(String(budget.monthly_limit || 0));
    setEditAlert(String(Math.round((budget.alert_threshold || 0.8) * 100)));
    setEditMode(true);
  };

  const saveBudget = async () => {
    if (!budget) return;
    setSaving(true);
    try {
      const body: Record<string, number> = {};
      if (+editHourly !== budget.hourly_limit) body.max_hourly_usd = +editHourly;
      if (+editDaily !== budget.daily_limit) body.max_daily_usd = +editDaily;
      if (+editMonthly !== budget.monthly_limit) body.max_monthly_usd = +editMonthly;
      const alertVal = (+editAlert) / 100;
      if (Math.abs(alertVal - budget.alert_threshold) > 0.001) body.alert_threshold = alertVal;
      await api.put('/api/budget', body);
      setEditMode(false);
      await refetch();
    } catch (e) {
      console.error('Failed to save budget:', e);
    }
    setSaving(false);
  };

  const pctColor = (pct: number) => {
    if (pct >= 0.8) return 'bg-red-500';
    if (pct >= 0.5) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const fmtUsd = (v: number) => v > 0 ? `$${v.toFixed(4)}` : 'unlimited';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Budget & Spending Limits</CardTitle>
              <CardDescription>Monitor and control spending across all agents</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={editMode ? saveBudget : startEdit} disabled={saving}>
              {editMode ? (saving ? 'Saving...' : 'Save') : 'Edit Limits'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Global budget meters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Hourly</div>
              <div className="text-xl font-bold">${(budget?.hourly_spend || 0).toFixed(4)}</div>
              <div className="text-xs text-muted-foreground">of {fmtUsd(budget?.hourly_limit || 0)}</div>
              {(budget?.hourly_limit || 0) > 0 && (
                <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pctColor(budget?.hourly_pct || 0)}`}
                    style={{ width: `${Math.min((budget?.hourly_pct || 0) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Daily</div>
              <div className="text-xl font-bold">${(budget?.daily_spend || 0).toFixed(4)}</div>
              <div className="text-xs text-muted-foreground">of {fmtUsd(budget?.daily_limit || 0)}</div>
              {(budget?.daily_limit || 0) > 0 && (
                <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pctColor(budget?.daily_pct || 0)}`}
                    style={{ width: `${Math.min((budget?.daily_pct || 0) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Monthly</div>
              <div className="text-xl font-bold">${(budget?.monthly_spend || 0).toFixed(4)}</div>
              <div className="text-xs text-muted-foreground">of {fmtUsd(budget?.monthly_limit || 0)}</div>
              {(budget?.monthly_limit || 0) > 0 && (
                <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pctColor(budget?.monthly_pct || 0)}`}
                    style={{ width: `${Math.min((budget?.monthly_pct || 0) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {(budget?.alert_threshold || 0) > 0 && !editMode && (
            <div className="text-xs text-muted-foreground mb-4">
              Alert threshold: <span className="font-medium">{((budget?.alert_threshold || 0) * 100).toFixed(0)}%</span> of any limit
            </div>
          )}

          {/* Edit limits form */}
          {editMode && (
            <div className="border rounded-lg p-4 mb-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Hourly Limit ($)</label>
                  <Input type="number" step="0.1" min="0" value={editHourly} onChange={(e) => setEditHourly(e.target.value)} placeholder="0 = unlimited" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Daily Limit ($)</label>
                  <Input type="number" step="1" min="0" value={editDaily} onChange={(e) => setEditDaily(e.target.value)} placeholder="0 = unlimited" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Monthly Limit ($)</label>
                  <Input type="number" step="1" min="0" value={editMonthly} onChange={(e) => setEditMonthly(e.target.value)} placeholder="0 = unlimited" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Alert (%)</label>
                  <Input type="number" step="5" min="0" max="100" value={editAlert} onChange={(e) => setEditAlert(e.target.value)} placeholder="80" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Set to 0 for unlimited. Changes apply immediately (in-memory, not persisted to config.toml).</div>
              <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
            </div>
          )}

          {/* Per-agent cost ranking */}
          <h4 className="text-sm font-medium mt-6 mb-3">Top Spenders (Today)</h4>
          {agentRanking.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Agent</th>
                    <th className="text-left p-3 font-medium">Today</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Hourly Limit</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Daily Limit</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Monthly Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {agentRanking.map((a) => (
                    <tr key={a.agent_id}>
                      <td className="p-3 font-medium">{a.name}</td>
                      <td className="p-3">${(a.daily_cost_usd || 0).toFixed(4)}</td>
                      <td className="p-3 text-muted-foreground">{fmtUsd(a.hourly_limit)}</td>
                      <td className="p-3 text-muted-foreground">{fmtUsd(a.daily_limit)}</td>
                      <td className="p-3 text-muted-foreground">{fmtUsd(a.monthly_limit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">No spending recorded today.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// System Info Tab
function SystemTab() {
  const { data: sysInfo, isLoading } = useQuery<{
    version?: string;
    platform?: string;
    uptime_seconds?: number;
    agent_count?: number;
    default_provider?: string;
    default_model?: string;
  }>({
    queryKey: ['status'],
    queryFn: async () => api.get('/api/status'),
  });

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '-';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold">{sysInfo?.version || '-'}</div>
            <div className="text-sm text-muted-foreground">Version</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold">{sysInfo?.platform || '-'}</div>
            <div className="text-sm text-muted-foreground">Platform</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold">{formatUptime(sysInfo?.uptime_seconds)}</div>
            <div className="text-sm text-muted-foreground">Uptime</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold">{sysInfo?.agent_count || 0}</div>
            <div className="text-sm text-muted-foreground">Agents</div>
          </CardContent>
        </Card>
      </div>

      {sysInfo?.default_provider && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Default Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{sysInfo.default_provider} : {sysInfo.default_model}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Migration Tab
function MigrationTab() {
  const [migStep, setMigStep] = useState<'intro' | 'manual' | 'preview' | 'result' | 'not_found'>('intro');
  const [sourcePath, setSourcePath] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [scanResult, setScanResult] = useState<{ path: string; agents?: string[]; channels?: string[]; skills?: string[] } | null>(null);
  const [migResult, setMigResult] = useState<{ status: string; dry_run?: boolean; error?: string } | null>(null);

  const autoDetect = async () => {
    setDetecting(true);
    try {
      const data = await api.get<{ detected?: boolean; scan?: { path: string; agents?: string[]; channels?: string[]; skills?: string[] }; path?: string }>('/api/migrate/detect');
      if (data.detected && data.scan) {
        setSourcePath(data.path || '');
        setScanResult(data.scan);
        setMigStep('preview');
      } else {
        setMigStep('not_found');
      }
    } catch {
      setMigStep('not_found');
    }
    setDetecting(false);
  };

  const scanPath = async () => {
    if (!sourcePath) return;
    setScanning(true);
    try {
      const data = await api.post<{ error?: string; path: string; agents?: string[]; channels?: string[]; skills?: string[] }>('/api/migrate/scan', { path: sourcePath });
      if (data.error) {
        setScanning(false);
        return;
      }
      setScanResult(data);
      setMigStep('preview');
    } catch {
      // silent
    }
    setScanning(false);
  };

  const runMigration = async (dryRun: boolean) => {
    setMigrating(true);
    try {
      const data = await api.post<{ status: string; dry_run?: boolean; error?: string }>('/api/migrate', {
        source: 'openclaw',
        source_dir: sourcePath || (scanResult ? scanResult.path : ''),
        target_dir: targetPath,
        dry_run: dryRun,
      });
      setMigResult(data);
      setMigStep('result');
    } catch (e) {
      setMigResult({ status: 'failed', error: (e as Error).message });
      setMigStep('result');
    }
    setMigrating(false);
  };

  if (migStep === 'intro') {
    return (
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Migrate from OpenClaw</CardTitle>
          <CardDescription>
            Seamlessly transfer your agents, memory, workspace files, and channel configurations from OpenClaw to OpenFang.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Converts agent.yaml to agent.toml with proper capabilities</li>
            <li>Maps tools (read_file → file_read, execute_command → shell_exec, etc.)</li>
            <li>Merges channel configs into config.toml</li>
            <li>Copies workspace files and memory data</li>
          </ul>
          <div className="flex gap-2 pt-4">
            <Button onClick={autoDetect} disabled={detecting}>
              {detecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {detecting ? 'Scanning...' : 'Auto-Detect OpenClaw'}
            </Button>
            <Button variant="outline" onClick={() => setMigStep('manual')}>Enter Path Manually</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (migStep === 'manual') {
    return (
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Specify OpenClaw Path</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">OpenClaw Home Directory</label>
            <Input
              value={sourcePath}
              onChange={(e) => setSourcePath(e.target.value)}
              placeholder="~/.openclaw"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">OpenFang Target Directory</label>
            <Input
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              placeholder="~/.openfang (default)"
              className="font-mono text-xs"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={scanPath} disabled={!sourcePath || scanning}>
              {scanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {scanning ? 'Scanning...' : 'Scan Directory'}
            </Button>
            <Button variant="outline" onClick={() => setMigStep('intro')}>Back</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (migStep === 'preview' && scanResult) {
    return (
      <div className="space-y-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>OpenClaw Workspace Found</CardTitle>
              <Badge>Ready to Migrate</Badge>
            </div>
            <CardDescription className="font-mono text-xs">{scanResult.path}</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{scanResult.agents?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Agents</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{scanResult.channels?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Channels</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{scanResult.skills?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Skills</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => runMigration(false)} disabled={migrating}>
            {migrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {migrating ? 'Migrating...' : 'Migrate Now'}
          </Button>
          <Button variant="outline" onClick={() => runMigration(true)} disabled={migrating}>Dry Run</Button>
          <Button variant="ghost" onClick={() => { setMigStep('intro'); setScanResult(null); }}>Start Over</Button>
        </div>
      </div>
    );
  }

  if (migStep === 'result' && migResult) {
    return (
      <div className="space-y-4">
        <Card className={`border-l-4 ${migResult.status === 'completed' ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{migResult.dry_run ? 'Dry Run Complete' : 'Migration Complete!'}</CardTitle>
              <Badge className={migResult.status === 'completed' ? 'bg-green-500' : 'bg-red-500'}>
                {migResult.status === 'completed' ? 'SUCCESS' : 'FAILED'}
              </Badge>
            </div>
            {migResult.error && (
              <CardDescription className="text-red-500">{migResult.error}</CardDescription>
            )}
          </CardHeader>
        </Card>

        <div className="flex gap-2">
          {migResult.dry_run && (
            <Button onClick={() => runMigration(false)} disabled={migrating}>
              {migrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Run Migration for Real
            </Button>
          )}
          <Button variant="outline" onClick={() => { setMigStep('intro'); setMigResult(null); setScanResult(null); }}>
            Start New Migration
          </Button>
        </div>
      </div>
    );
  }

  if (migStep === 'not_found') {
    return (
      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader>
          <CardTitle>OpenClaw Not Found</CardTitle>
          <CardDescription>Could not auto-detect an OpenClaw installation.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={() => setMigStep('manual')}>Enter Path Manually</Button>
          <Button variant="outline" onClick={() => setMigStep('intro')}>Back</Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}

// Main Settings Page
export function Settings() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure OpenFang providers, models, tools, security, and network settings.
          </p>
        </div>

      <Tabs defaultValue="providers">
        <TabsList className="mb-4">
          <TabsTrigger value="providers">
            <Key className="w-4 h-4 mr-2" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="models">
            <Database className="w-4 h-4 mr-2" />
            Models
          </TabsTrigger>
          <TabsTrigger value="config">
            <Database className="w-4 h-4 mr-2" />
            Config
          </TabsTrigger>
          <TabsTrigger value="tools">
            <Wrench className="w-4 h-4 mr-2" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="network">
            <Network className="w-4 h-4 mr-2" />
            Network
          </TabsTrigger>
          <TabsTrigger value="budget">
            <DollarSign className="w-4 h-4 mr-2" />
            Budget
          </TabsTrigger>
          <TabsTrigger value="system">
            <Info className="w-4 h-4 mr-2" />
            System
          </TabsTrigger>
          <TabsTrigger value="migration">
            <Database className="w-4 h-4 mr-2" />
            Migration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers">
          <ProvidersTab />
        </TabsContent>

        <TabsContent value="models">
          <ModelsTab />
        </TabsContent>

        <TabsContent value="config">
          <ConfigTab />
        </TabsContent>

        <TabsContent value="tools">
          <ToolsTab />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="network">
          <NetworkTab />
        </TabsContent>

        <TabsContent value="budget">
          <BudgetTab />
        </TabsContent>

        <TabsContent value="system">
          <SystemTab />
        </TabsContent>

        <TabsContent value="migration">
          <MigrationTab />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

export default Settings;
