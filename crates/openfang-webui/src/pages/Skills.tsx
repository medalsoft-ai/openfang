import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/api/client';
import { Puzzle, Loader2, Trash2, Search, Terminal, Zap, X, ExternalLink, Star, Check } from 'lucide-react';

// Types
interface Skill {
  name: string;
  description: string;
  runtime: 'prompt' | 'python' | 'nodejs' | 'wasm';
  source: 'local' | 'clawhub' | 'builtin';
  enabled: boolean;
  version?: string;
  tools_count: number;
  has_prompt_context?: boolean;
}

interface ClawHubSkill {
  slug: string;
  name: string;
  description: string;
  version?: string;
  downloads?: number;
  stars?: number;
  author?: string;
  author_name?: string;
  author_image?: string;
  tags?: Record<string, string>;
  installed?: boolean;
}

interface MCPServer {
  name: string;
  status: 'connected' | 'configured';
  tools_count: number;
  tools?: Array<{ name: string; description?: string }>;
  transport?: {
    type: 'stdio' | 'sse';
    command?: string;
    args?: string[];
    url?: string;
  };
  env?: string[];
}

interface QuickStartSkill {
  name: string;
  description: string;
  template: string;
}

const runtimeBadge = (runtime: string) => {
  switch (runtime) {
    case 'prompt': return { cls: 'bg-blue-500/20 text-blue-700 dark:text-blue-400', text: 'PROMPT' };
    case 'python': return { cls: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400', text: 'PYTHON' };
    case 'nodejs': return { cls: 'bg-green-500/20 text-green-700 dark:text-green-400', text: 'NODE' };
    case 'wasm': return { cls: 'bg-purple-500/20 text-purple-700 dark:text-purple-400', text: 'WASM' };
    default: return { cls: 'bg-gray-500/20 text-gray-700 dark:text-gray-400', text: runtime.toUpperCase() };
  }
};

const sourceBadge = (source: string) => {
  switch (source) {
    case 'local': return { cls: 'bg-muted text-muted-foreground', text: 'Local' };
    case 'clawhub': return { cls: 'bg-blue-500/20 text-blue-700 dark:text-blue-400', text: 'ClawHub' };
    case 'builtin': return { cls: 'bg-green-500/20 text-green-700 dark:text-green-400', text: 'Built-in' };
    default: return { cls: 'bg-muted text-muted-foreground', text: source };
  }
};

const categories = [
  { id: 'web', name: 'Web' },
  { id: 'data', name: 'Data' },
  { id: 'dev', name: 'Development' },
  { id: 'ai', name: 'AI/ML' },
  { id: 'productivity', name: 'Productivity' },
  { id: 'communication', name: 'Communication' },
];

const quickStartSkills: QuickStartSkill[] = [
  { name: 'Code Reviewer', description: 'Expert code review with best practices and security checks', template: 'code-reviewer' },
  { name: 'Documentation Writer', description: 'Generate clear, comprehensive documentation', template: 'docs-writer' },
  { name: 'Test Generator', description: 'Create comprehensive test cases', template: 'test-generator' },
  { name: 'Refactoring Assistant', description: 'Clean code and refactoring suggestions', template: 'refactor-assistant' },
];

// Installed Skills Tab
function InstalledSkillsTab() {
  const queryClient = useQueryClient();
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);

  const { data: skills = [], isLoading } = useQuery<Skill[]>({
    queryKey: ['skills'],
    queryFn: async () => {
      const res = await api.get<{ skills: Skill[] }>('/api/skills');
      return res.skills || [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ name, enabled }: { name: string; enabled: boolean }) => {
      if (enabled) {
        await api.post(`/api/skills/${encodeURIComponent(name)}/disable`, {});
      } else {
        await api.post(`/api/skills/${encodeURIComponent(name)}/enable`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setToggleLoading(null);
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: (name: string) => api.post(`/api/skills/${encodeURIComponent(name)}/uninstall`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills'] }),
  });

  const handleToggle = (skill: Skill) => {
    setToggleLoading(skill.name);
    toggleMutation.mutate({ name: skill.name, enabled: skill.enabled });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <Puzzle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No skills installed</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Skills add new capabilities to your agents. Browse ClawHub for 3,000+ community skills or create your own.
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline">Browse ClawHub</Button>
          <Button variant="ghost">Quick Start</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {skills.map((skill) => {
        const rt = runtimeBadge(skill.runtime);
        const src = sourceBadge(skill.source);
        return (
          <Card key={skill.name}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base">{skill.name}</CardTitle>
                  <Badge className={rt.cls} variant="outline">{rt.text}</Badge>
                  <Badge className={src.cls} variant="outline" style={{ fontSize: '0.65rem' }}>{src.text}</Badge>
                </div>
                <button
                  onClick={() => handleToggle(skill)}
                  disabled={toggleLoading === skill.name}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    skill.enabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      skill.enabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">{skill.description}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{skill.tools_count} tool(s)</span>
                {skill.version && <span>v{skill.version}</span>}
                {skill.has_prompt_context && <span>(prompt context)</span>}
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => uninstallMutation.mutate(skill.name)}
                  disabled={uninstallMutation.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Uninstall
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ClawHub Tab
function ClawHubTab() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'trending' | 'downloads' | 'stars' | 'updated'>('trending');
  const [results, setResults] = useState<ClawHubSkill[]>([]);
  const [browseResults, setBrowseResults] = useState<ClawHubSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<ClawHubSkill | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [installingSlug, setInstallingSlug] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: installedSkills = [] } = useQuery<Skill[]>({
    queryKey: ['skills'],
    queryFn: async () => {
      const res = await api.get<{ skills: Skill[] }>('/api/skills');
      return res.skills || [];
    },
  });

  const isSkillInstalled = (slug: string) => {
    return installedSkills.some(s => s.name === slug || s.name.includes(slug));
  };

  const browseClawHub = useCallback(async (sortType: typeof sort) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ skills: ClawHubSkill[] }>(`/api/clawhub/browse?sort=${sortType}`);
      setBrowseResults(res.skills || []);
    } catch (e) {
      setError('Failed to load ClawHub skills');
    }
    setLoading(false);
  }, []);

  const searchClawHub = useCallback(async () => {
    if (!search.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ skills: ClawHubSkill[] }>(`/api/clawhub/search?q=${encodeURIComponent(search)}`);
      setResults(res.skills || []);
    } catch (e) {
      setError('Failed to search ClawHub');
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    browseClawHub('trending');
  }, [browseClawHub]);

  const installMutation = useMutation({
    mutationFn: async (slug: string) => {
      setInstallingSlug(slug);
      await api.post(`/api/clawhub/install`, { slug });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setInstallingSlug(null);
      setDetailOpen(false);
    },
    onError: () => {
      setInstallingSlug(null);
    },
  });

  const showSkillDetail = async (skill: ClawHubSkill) => {
    setSelectedSkill(skill);
    setDetailOpen(true);
  };

  const formatDownloads = (n?: number) => {
    if (!n) return '0';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${Math.round(n / 1000)}K`;
    return String(n);
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search ClawHub skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchClawHub()}
          className="pl-10 pr-10"
        />
        {search && (
          <button
            onClick={() => { setSearch(''); setResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Sort pills */}
      {!search && (
        <div className="flex flex-wrap gap-2">
          {(['trending', 'downloads', 'stars', 'updated'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setSort(s); browseClawHub(s); }}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                sort === s ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Categories */}
      {!search && (
        <div>
          <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Categories</div>
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setSearch(cat.name); searchClawHub(); }}
                className="px-2 py-1 text-xs rounded-full border hover:bg-muted transition-colors"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-8 border rounded-lg">
          <p className="text-destructive mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={() => search ? searchClawHub() : browseClawHub(sort)}>Retry</Button>
        </div>
      )}

      {/* Search results */}
      {search && results.length > 0 && !loading && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm text-muted-foreground">{results.length} result(s) for "{search}"</div>
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setResults([]); }}>Clear search</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((skill) => (
              <Card key={skill.slug} className="cursor-pointer hover:border-primary transition-colors" onClick={() => showSkillDetail(skill)}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{skill.name || skill.slug}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">ClawHub</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{skill.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {skill.version && <span>v{skill.version}</span>}
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); installMutation.mutate(skill.slug); }}
                      disabled={installingSlug === skill.slug || isSkillInstalled(skill.slug)}
                    >
                      {installingSlug === skill.slug ? 'Installing...' : isSkillInstalled(skill.slug) ? 'Installed' : 'Install'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Browse results */}
      {!search && browseResults.length > 0 && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {browseResults.map((skill) => (
            <Card key={skill.slug} className="cursor-pointer hover:border-primary transition-colors" onClick={() => showSkillDetail(skill)}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">{skill.name || skill.slug}</CardTitle>
                  <Badge variant="outline" className="text-[10px]">ClawHub</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{skill.description}</p>
                <div className="flex justify-between items-center">
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {skill.downloads !== undefined && <span>{formatDownloads(skill.downloads)} downloads</span>}
                    {skill.stars !== undefined && <span className="flex items-center gap-1"><Star className="h-3 w-3" />{skill.stars}</span>}
                    {skill.version && <span>v{skill.version}</span>}
                  </div>
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); installMutation.mutate(skill.slug); }}
                    disabled={installingSlug === skill.slug || isSkillInstalled(skill.slug)}
                  >
                    {installingSlug === skill.slug ? 'Installing...' : isSkillInstalled(skill.slug) ? 'Installed' : 'Install'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty search */}
      {search && results.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No skills found for "{search}"</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(''); setResults([]); }}>Back to browse</Button>
        </div>
      )}

      {/* Skill Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          {selectedSkill && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSkill.name || selectedSkill.slug}</DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge>ClawHub</Badge>
                    {selectedSkill.version && <span className="text-xs text-muted-foreground">v{selectedSkill.version}</span>}
                    {selectedSkill.author && <span className="text-xs text-muted-foreground">by {selectedSkill.author_name || selectedSkill.author}</span>}
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm">{selectedSkill.description}</p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {selectedSkill.downloads !== undefined && <span>{formatDownloads(selectedSkill.downloads)} downloads</span>}
                  {selectedSkill.stars !== undefined && <span className="flex items-center gap-1"><Star className="h-3 w-3" />{selectedSkill.stars} stars</span>}
                </div>
                {selectedSkill.tags && Object.keys(selectedSkill.tags).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(selectedSkill.tags).map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="text-[10px]">{key}: {value}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => installMutation.mutate(selectedSkill.slug)}
                    disabled={installingSlug === selectedSkill.slug || isSkillInstalled(selectedSkill.slug)}
                  >
                    {installingSlug === selectedSkill.slug ? 'Installing...' : isSkillInstalled(selectedSkill.slug) ? 'Already Installed' : 'Install from ClawHub'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Skills are security-scanned before installation.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// MCP Servers Tab
function MCPServersTab() {
  const { data: mcpData, isLoading } = useQuery<{ connected: MCPServer[]; configured: MCPServer[]; total_connected: number; total_configured: number }>({
    queryKey: ['mcp-servers'],
    queryFn: async () => {
      const res = await api.get('/api/mcp/servers');
      return res as { connected: MCPServer[]; configured: MCPServer[]; total_connected: number; total_configured: number };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const connected = mcpData?.connected || [];
  const configured = mcpData?.configured || [];
  const hasServers = connected.length > 0 || configured.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">MCP Servers (Model Context Protocol)</CardTitle>
          <CardDescription>
            MCP servers provide external tools to your agents — GitHub, filesystem, databases, APIs, and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Configure MCP servers in your <code className="bg-muted px-1 rounded">config.toml</code> under <code className="bg-muted px-1 rounded">[mcp_servers]</code>.
          </p>
        </CardContent>
      </Card>

      {/* Connected Servers */}
      {connected.length > 0 && (
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Connected Servers</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connected.map((srv) => (
              <Card key={srv.name}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{srv.name}</CardTitle>
                    <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">Connected</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{srv.tools_count} tool(s) available</p>
                  {srv.tools && srv.tools.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Tools:</div>
                      {srv.tools.slice(0, 5).map((tool) => (
                        <div key={tool.name} className="text-xs">
                          <code className="text-[10px] bg-muted px-1 rounded">{tool.name}</code>
                          {tool.description && <span className="text-muted-foreground text-[10px]"> — {tool.description}</span>}
                        </div>
                      ))}
                      {srv.tools.length > 5 && (
                        <div className="text-xs text-muted-foreground">... and {srv.tools.length - 5} more</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Configured Servers */}
      {configured.length > 0 && (
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Configured Servers</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {configured.map((srv) => (
              <Card key={srv.name} className="opacity-75">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{srv.name}</CardTitle>
                    <Badge variant="outline">{srv.transport?.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {srv.transport?.type === 'stdio' && (
                    <code className="text-[10px] bg-muted px-1 rounded block truncate">
                      {srv.transport.command} {(srv.transport.args || []).join(' ')}
                    </code>
                  )}
                  {srv.transport?.type === 'sse' && srv.transport.url && (
                    <code className="text-[10px] bg-muted px-1 rounded block truncate">{srv.transport.url}</code>
                  )}
                  {srv.env && srv.env.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-2">Env: {srv.env.join(', ')}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasServers && (
        <div className="text-center py-12 border rounded-lg">
          <Terminal className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No MCP servers configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            MCP servers extend your agents with external tools.
          </p>
          <pre className="text-left text-xs bg-muted p-4 rounded-lg max-w-md mx-auto overflow-auto">
{`[[mcp_servers]]
name = "filesystem"
timeout_secs = 30

[mcp_servers.transport]
type = "stdio"
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path"]`}
          </pre>
        </div>
      )}
    </div>
  );
}

// Quick Start Tab
function QuickStartTab() {
  const queryClient = useQueryClient();
  const { data: installedSkills = [] } = useQuery<Skill[]>({
    queryKey: ['skills'],
    queryFn: async () => {
      const res = await api.get<{ skills: Skill[] }>('/api/skills');
      return res.skills || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: string) => {
      await api.post('/api/skills/quickstart', { template });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });

  const isSkillInstalledByName = (name: string) => {
    return installedSkills.some(s => s.name === name);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Start Skills</CardTitle>
          <CardDescription>
            Create prompt-only skills with one click. These inject context into your agent&apos;s system prompt — no code required.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickStartSkills.map((qs) => (
          <Card key={qs.name} className="hover:border-primary transition-colors">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">{qs.name}</CardTitle>
                <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400">PROMPT</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{qs.description}</p>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => createMutation.mutate(qs.template)}
                  disabled={createMutation.isPending || isSkillInstalledByName(qs.name)}
                >
                  {isSkillInstalledByName(qs.name) ? 'Created' : 'Create Skill'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Main Skills Page
export function Skills() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Skills</h1>
          <p className="text-muted-foreground">
            Skills extend your agents with new capabilities. OpenFang supports the OpenClaw/ClawHub ecosystem plus local skills.
          </p>
        </div>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
              <li><strong>Prompt-only</strong> — inject context and instructions into the agent&apos;s system prompt</li>
              <li><strong>Python / Node.js</strong> — executable tools that agents can call during conversations</li>
              <li><strong>MCP Servers</strong> — external tools via Model Context Protocol</li>
            </ul>
          </CardContent>
        </Card>

        <Tabs defaultValue="installed">
          <TabsList className="mb-4">
            <TabsTrigger value="installed">
              <Check className="w-4 h-4 mr-2" />
              Installed
            </TabsTrigger>
            <TabsTrigger value="clawhub">
              <ExternalLink className="w-4 h-4 mr-2" />
              ClawHub
            </TabsTrigger>
            <TabsTrigger value="mcp">
              <Terminal className="w-4 h-4 mr-2" />
              MCP Servers
            </TabsTrigger>
            <TabsTrigger value="create">
              <Zap className="w-4 h-4 mr-2" />
              Quick Start
            </TabsTrigger>
          </TabsList>

          <TabsContent value="installed">
            <InstalledSkillsTab />
          </TabsContent>

          <TabsContent value="clawhub">
            <ClawHubTab />
          </TabsContent>

          <TabsContent value="mcp">
            <MCPServersTab />
          </TabsContent>

          <TabsContent value="create">
            <QuickStartTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Skills;
