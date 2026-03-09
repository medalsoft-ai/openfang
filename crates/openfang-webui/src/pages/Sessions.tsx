import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/api/client';
import type { Session, Agent } from '@/api/types';
import {
  MessageSquare,
  Plus,
  Loader2,
  Trash2,
  MoreVertical,
  Bot,
  Clock,
  MessageCircle,
  ExternalLink,
  Search,
  Database,
  Edit2,
  X,
  Check,
  Save,
} from 'lucide-react';

interface SessionWithAgent extends Session {
  agent?: Agent;
}

interface KVPair {
  key: string;
  value: unknown;
}

export function Sessions() {
  const queryClient = useQueryClient();

  // -- Sessions state --
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [newSessionTitle, setNewSessionTitle] = useState('');

  // -- Memory state --
  const [memAgentId, setMemAgentId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('""');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Fetch sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: async () => { const res = await api.get<{sessions: Session[]}>('/api/sessions'); return res.sessions || []; },
  });

  // Fetch agents for agent names
  const { data: agents = [], isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => api.listAgents(),
  });

  // Combine sessions with agent info
  const sessionsWithAgents: SessionWithAgent[] = sessions
    .filter((session): session is Session => !!session && !!session.session_id)
    .map((session) => ({
      ...session,
      agent: agents.find((a) => a.id === session.agent_id),
    }));

  // Filter sessions
  const filteredSessions = sessionsWithAgents.filter((session) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      session.title.toLowerCase().includes(q) ||
      (session.agent?.name || '').toLowerCase().includes(q) ||
      session.session_id.toLowerCase().includes(q)
    );
  });

  // Sort by created_at descending
  const sortedSessions = [...filteredSessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Running agents for creating new sessions
  const runningAgents = agents.filter((a) => a.status === 'running');

  // Create session mutation
  const createMutation = useMutation({
    mutationFn: async ({ agentId, title }: { agentId: string; title?: string }) => {
      return api.createSession(agentId, title || 'New Chat');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setCreateDialogOpen(false);
      setSelectedAgentId('');
      setNewSessionTitle('');
    },
  });

  // Delete session mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  // -- Memory queries & mutations --
  const { data: kvData, isLoading: memLoading, refetch: refetchKv } = useQuery<{ kv_pairs: KVPair[] }>({
    queryKey: ['memory', 'kv', memAgentId],
    queryFn: async () => {
      if (!memAgentId) return { kv_pairs: [] };
      return api.get(`/api/memory/agents/${memAgentId}/kv`);
    },
    enabled: !!memAgentId,
  });

  const kvPairs = kvData?.kv_pairs || [];

  const addKeyMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      return api.put(`/api/memory/agents/${memAgentId}/kv/${encodeURIComponent(key)}`, { value });
    },
    onSuccess: () => {
      setShowAdd(false);
      setNewKey('');
      setNewValue('""');
      refetchKv();
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      return api.del(`/api/memory/agents/${memAgentId}/kv/${encodeURIComponent(key)}`);
    },
    onSuccess: () => {
      refetchKv();
    },
  });

  const saveEditMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      return api.put(`/api/memory/agents/${memAgentId}/kv/${encodeURIComponent(key)}`, { value });
    },
    onSuccess: () => {
      setEditingKey(null);
      setEditingValue('');
      refetchKv();
    },
  });

  const handleCreate = () => {
    if (!selectedAgentId) return;
    createMutation.mutate({
      agentId: selectedAgentId,
      title: newSessionTitle.trim() || undefined,
    });
  };

  const handleAddKey = () => {
    if (!memAgentId || !newKey.trim()) return;
    let value: unknown;
    try {
      value = JSON.parse(newValue);
    } catch {
      value = newValue;
    }
    addKeyMutation.mutate({ key: newKey.trim(), value });
  };

  const handleDeleteKey = (key: string) => {
    if (confirm(`Delete key "${key}"? This cannot be undone.`)) {
      deleteKeyMutation.mutate(key);
    }
  };

  const startEdit = (kv: KVPair) => {
    setEditingKey(kv.key);
    setEditingValue(typeof kv.value === 'object' ? JSON.stringify(kv.value, null, 2) : String(kv.value));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditingValue('');
  };

  const saveEdit = () => {
    if (!editingKey || !memAgentId) return;
    let value: unknown;
    try {
      value = JSON.parse(editingValue);
    } catch {
      value = editingValue;
    }
    saveEditMutation.mutate({ key: editingKey, value });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatValue = (value: unknown): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const isLoading = sessionsLoading || agentsLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-muted-foreground">
            Manage your chat sessions and agent memory
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Session</DialogTitle>
              <DialogDescription>
                Start a new chat session with an agent.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Agent</label>
                {runningAgents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No running agents available. Start an agent from the Agents page first.
                  </p>
                ) : (
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    className="w-full rounded-md border px-3 py-2"
                  >
                    <option value="">Select an agent...</option>
                    {runningAgents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.model?.provider ?? "?"}/{agent.model?.model ?? "?"})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Session Title (optional)</label>
                <Input
                  placeholder="New Chat"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={!selectedAgentId || createMutation.isPending || runningAgents.length === 0}
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sessions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="memory" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Memory
          </TabsTrigger>
        </TabsList>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6">
          {/* Search */}
          <div className="flex gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Sessions List */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sortedSessions.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search ? 'No sessions match your search' : 'No sessions yet. Create one to get started!'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sortedSessions.map((session) => (
                  <Card key={session.session_id} className="hover:border-primary transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10">
                              <MessageCircle className="h-4 w-4 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base truncate max-w-[180px]">
                              {session.title}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {session.session_id.slice(0, 8)}...
                            </CardDescription>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm('Delete this session?')) {
                                  deleteMutation.mutate(session.session_id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">
                          {session.agent?.name || 'Unknown Agent'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        <span>{session.message_count} messages</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Created {formatDate(session.created_at)}</span>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            window.location.hash = '#/chat';
                            localStorage.setItem('selectedSessionId', session.session_id);
                            localStorage.setItem('selectedAgentId', session.agent_id);
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Stats */}
          {!isLoading && sortedSessions.length > 0 && (
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Badge variant="secondary">
                Total: {sortedSessions.length} sessions
              </Badge>
              <Badge variant="secondary">
                Messages: {sortedSessions.reduce((acc, s) => acc + s.message_count, 0)}
              </Badge>
            </div>
          )}
        </TabsContent>

        {/* Memory Tab */}
        <TabsContent value="memory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Memory KV Store
              </CardTitle>
              <CardDescription>
                Manage key-value memory for agents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Agent Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Agent</label>
                <select
                  value={memAgentId}
                  onChange={(e) => setMemAgentId(e.target.value)}
                  className="w-full max-w-md rounded-md border px-3 py-2"
                >
                  <option value="">Select an agent...</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.id.slice(0, 8)}...)
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Button */}
              {memAgentId && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => setShowAdd(!showAdd)}
                    variant={showAdd ? "secondary" : "default"}
                  >
                    {showAdd ? (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Key
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Add Key Form */}
              {showAdd && memAgentId && (
                <Card className="border-dashed">
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Key</label>
                      <Input
                        placeholder="Enter key name"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Value (JSON supported)</label>
                      <Textarea
                        placeholder="Enter value"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use JSON format for objects/arrays, e.g., {"{\"foo\": \"bar\"}"} or [1, 2, 3]
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={handleAddKey}
                        disabled={!newKey.trim() || addKeyMutation.isPending}
                      >
                        {addKeyMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <Save className="w-4 h-4 mr-2" />
                        Save Key
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* KV List */}
              {memLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !memAgentId ? (
                <div className="text-center py-8 text-muted-foreground">
                  Select an agent to view and manage its memory
                </div>
              ) : kvPairs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No memory keys found for this agent
                </div>
              ) : (
                <div className="space-y-3">
                  {kvPairs.map((kv) => (
                    <Card key={kv.key} className="overflow-hidden">
                      <CardContent className="p-4">
                        {editingKey === kv.key ? (
                          // Edit Mode
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm font-medium">{kv.key}</span>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={cancelEdit}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={saveEdit}
                                  disabled={saveEditMutation.isPending}
                                >
                                  {saveEditMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <Textarea
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              rows={4}
                              className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                              Use JSON format for objects/arrays
                            </p>
                          </div>
                        ) : (
                          // View Mode
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <span className="font-mono text-sm font-medium">{kv.key}</span>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEdit(kv)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteKey(kv.key)}
                                  disabled={deleteKeyMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="bg-muted rounded-md p-3 overflow-x-auto">
                              <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                                {formatValue(kv.value)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Memory Stats */}
              {memAgentId && kvPairs.length > 0 && (
                <div className="flex gap-4 text-sm text-muted-foreground pt-4 border-t">
                  <Badge variant="secondary">
                    {kvPairs.length} key{kvPairs.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Sessions;
