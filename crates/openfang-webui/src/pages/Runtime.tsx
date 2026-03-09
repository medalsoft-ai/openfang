// OpenFang Runtime Page — System runtime info and provider status
// 100% Alpine.js feature parity
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/api/client';
import { Loader2, RefreshCw } from 'lucide-react';

// Types matching Alpine implementation
interface StatusData {
  uptime_seconds: number;
  default_model?: string;
  api_listen?: string;
  listen?: string;
  home_dir?: string;
  log_level?: string;
  network_enabled?: boolean;
}

interface VersionData {
  version?: string;
  platform?: string;
  arch?: string;
}

interface Provider {
  id: string;
  display_name?: string;
  auth_status: string;
  reachable?: boolean;
  is_local?: boolean;
  model_count?: number;
  latency_ms?: number;
}

interface ProvidersData {
  providers: Provider[];
}

interface Agent {
  id: string;
  name?: string;
}

// Helper function to format uptime
function formatUptime(seconds: number): string {
  if (!seconds || seconds < 0) return '-';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${d}d ${h}h`;
}

// Get badge variant based on provider status
function getProviderBadgeClass(provider: Provider): string {
  if (provider.reachable) {
    return 'bg-green-100 text-green-800 border-green-300';
  }
  if (provider.auth_status === 'Configured') {
    return 'bg-green-100 text-green-800 border-green-300';
  }
  return 'bg-gray-100 text-gray-600 border-gray-300';
}

// Get provider status text
function getProviderStatusText(provider: Provider): string {
  if (provider.reachable) return 'Online';
  if (provider.auth_status === 'Configured') return 'Ready';
  return 'Not configured';
}

export function Runtime() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all data in parallel (matching Alpine's Promise.all)
  const {
    data: status,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery<StatusData>({
    queryKey: ['runtime-status'],
    queryFn: () => api.get<StatusData>('/api/status'),
  });

  const {
    data: version,
    isLoading: versionLoading,
    error: versionError,
    refetch: refetchVersion,
  } = useQuery<VersionData>({
    queryKey: ['runtime-version'],
    queryFn: () => api.get<VersionData>('/api/version'),
  });

  const {
    data: providersData,
    isLoading: providersLoading,
    error: providersError,
    refetch: refetchProviders,
  } = useQuery<ProvidersData>({
    queryKey: ['runtime-providers'],
    queryFn: () => api.get<ProvidersData>('/api/providers'),
  });

  const {
    data: agents,
    isLoading: agentsLoading,
    error: agentsError,
    refetch: refetchAgents,
  } = useQuery<Agent[]>({
    queryKey: ['runtime-agents'],
    queryFn: () => api.listAgents(),
  });

  const isLoading = statusLoading || versionLoading || providersLoading || agentsLoading;
  const hasError = statusError || versionError || providersError || agentsError;

  // Filter providers (matching Alpine filter)
  const providers = (providersData?.providers || []).filter((p) => {
    return p.auth_status === 'Configured' || p.reachable || p.is_local;
  });

  // Refresh all data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchStatus(),
      refetchVersion(),
      refetchProviders(),
      refetchAgents(),
    ]);
    setIsRefreshing(false);
  };

  // Computed values (matching Alpine data properties)
  const uptime = status?.uptime_seconds ? formatUptime(status.uptime_seconds) : '-';
  const agentCount = Array.isArray(agents) ? agents.length : 0;
  const versionStr = version?.version || '-';
  const defaultModel = status?.default_model || '-';
  const platform = version?.platform || '-';
  const arch = version?.arch || '-';
  const apiListen = status?.api_listen || status?.listen || '-';
  const homeDir = status?.home_dir || '-';
  const logLevel = status?.log_level || '-';
  const networkEnabled = !!status?.network_enabled;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Runtime</h1>
            <p className="text-muted-foreground">System runtime information and provider status</p>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && !hasError && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span className="text-muted-foreground">Loading runtime info...</span>
          </div>
        )}

        {/* Error state */}
        {hasError && !isLoading && (
          <Card className="border-destructive">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-destructive font-medium">Failed to load runtime information</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {statusError instanceof Error ? statusError.message : 'Please try again later'}
                </p>
                <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {!isLoading && (
          <>
            {/* Stats Row - 4 columns matching Alpine */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">Uptime</div>
                  <div className="text-2xl font-bold">{uptime}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">Agents</div>
                  <div className="text-2xl font-bold">{agentCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">Version</div>
                  <div className="text-2xl font-bold">{versionStr}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">Default Model</div>
                  <div className="text-lg font-bold truncate" title={defaultModel}>
                    {defaultModel}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Info Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">System</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-2 font-medium text-muted-foreground w-[180px]">Platform</td>
                      <td className="py-2">{platform}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-muted-foreground">Architecture</td>
                      <td className="py-2">{arch}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-muted-foreground">API Listen</td>
                      <td className="py-2">{apiListen}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-muted-foreground">Home Directory</td>
                      <td className="py-2 font-mono text-xs">{homeDir}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-muted-foreground">Log Level</td>
                      <td className="py-2">
                        <Badge variant="outline">{logLevel}</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-muted-foreground">Network</td>
                      <td className="py-2">{networkEnabled ? 'Enabled' : 'Disabled'}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Providers Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Providers</CardTitle>
              </CardHeader>
              <CardContent>
                {providers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No providers configured
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">Provider</th>
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">Models</th>
                          <th className="text-left p-3 font-medium">Latency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {providers.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/50">
                            <td className="p-3">{p.display_name || p.id}</td>
                            <td className="p-3">
                              <Badge
                                variant="outline"
                                className={getProviderBadgeClass(p)}
                              >
                                {getProviderStatusText(p)}
                              </Badge>
                            </td>
                            <td className="p-3">{p.model_count ?? '-'}</td>
                            <td className="p-3">
                              {p.latency_ms ? `${p.latency_ms}ms` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Refresh Button */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Runtime;
