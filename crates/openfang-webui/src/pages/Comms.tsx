// OpenFang Comms Page — Agent topology & inter-agent communication feed
// 100% Alpine.js feature parity
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { api } from '@/api/client';
import { useToast } from '@/hooks/useToast';
import { Send, Flag, RefreshCw, Network, MessageSquare } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/tauri';

// Types matching Alpine implementation
interface TopologyNode {
  id: string;
  name: string;
  state: string;
  model: string;
}

interface TopologyEdge {
  from: string;
  to: string;
  kind: 'parent_child' | 'peer';
}

interface Topology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

interface CommsEvent {
  id: string;
  kind: string;
  timestamp: string;
  source_name: string;
  target_name?: string;
  detail?: string;
}

// Helper functions (matching Alpine)
function stateBadgeClass(state: string): string {
  switch (state) {
    case 'Running':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Suspended':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Terminated':
    case 'Crashed':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

function eventBadgeClass(kind: string): string {
  switch (kind) {
    case 'agent_message':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'agent_spawned':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'agent_terminated':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'task_posted':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'task_claimed':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'task_completed':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

function eventLabel(kind: string): string {
  switch (kind) {
    case 'agent_message':
      return 'Message';
    case 'agent_spawned':
      return 'Spawned';
    case 'agent_terminated':
      return 'Terminated';
    case 'task_posted':
      return 'Task Posted';
    case 'task_claimed':
      return 'Task Claimed';
    case 'task_completed':
      return 'Task Done';
    default:
      return kind;
  }
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return secs + 's ago';
  if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
  if (secs < 86400) return Math.floor(secs / 3600) + 'h ago';
  return Math.floor(secs / 86400) + 'd ago';
}

export function Comms() {
  const { success, error: showError } = useToast();
  const sseSourceRef = useRef<EventSource | null>(null);

  // Modal states
  const [showSendModal, setShowSendModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Send message form
  const [sendFrom, setSendFrom] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [sendMsg, setSendMsg] = useState('');

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssign, setTaskAssign] = useState('unassigned');

  // Topology query
  const {
    data: topology = { nodes: [], edges: [] },
    isLoading: topologyLoading,
    error: topologyError,
    refetch: refetchTopology
  } = useQuery<Topology>({
    queryKey: ['comms-topology'],
    queryFn: async () => {
      return api.get('/api/comms/topology');
    },
  });

  // Events query (initial load)
  const {
    data: initialEvents = [],
    isLoading: eventsLoading,
    error: eventsError
  } = useQuery<CommsEvent[]>({
    queryKey: ['comms-events'],
    queryFn: async () => {
      return api.get('/api/comms/events?limit=200');
    },
  });

  // Live events state (SSE updates)
  const [events, setEvents] = useState<CommsEvent[]>([]);

  // Sync initial events
  useEffect(() => {
    if (initialEvents.length > 0) {
      setEvents(initialEvents);
    }
  }, [initialEvents]);

  // SSE connection
  const startSSE = useCallback(async () => {
    if (sseSourceRef.current) {
      sseSourceRef.current.close();
    }

    const baseUrl = await getApiBaseUrl();
    let url = baseUrl + '/api/comms/events/stream';

    // Add token if available
    const token = localStorage.getItem('openfang_auth_token');
    if (token) {
      url += '?token=' + encodeURIComponent(token);
    }

    const sse = new EventSource(url);
    sseSourceRef.current = sse;

    sse.onmessage = (ev) => {
      if (ev.data === 'ping') return;
      try {
        const event = JSON.parse(ev.data) as CommsEvent;
        setEvents((prev) => {
          const newEvents = [event, ...prev];
          if (newEvents.length > 200) newEvents.length = 200;
          return newEvents;
        });

        // Refresh topology on spawn/terminate events
        if (event.kind === 'agent_spawned' || event.kind === 'agent_terminated') {
          refetchTopology();
        }
      } catch {
        // ignore parse errors
      }
    };

    sse.onerror = () => {
      // Silent error handling - will auto-reconnect
    };
  }, [refetchTopology]);

  const stopSSE = useCallback(() => {
    if (sseSourceRef.current) {
      sseSourceRef.current.close();
      sseSourceRef.current = null;
    }
  }, []);

  // Start/stop SSE on mount/unmount
  useEffect(() => {
    startSSE();
    return () => stopSSE();
  }, [startSSE, stopSSE]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { from_agent_id: string; to_agent_id: string; message: string }) => {
      return api.post('/api/comms/send', data);
    },
    onSuccess: () => {
      success('Message sent');
      setShowSendModal(false);
      setSendFrom('');
      setSendTo('');
      setSendMsg('');
    },
    onError: (err: Error) => {
      showError(err.message || 'Send failed');
    },
  });

  // Post task mutation
  const postTaskMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; assigned_to?: string }) => {
      return api.post('/api/comms/task', data);
    },
    onSuccess: () => {
      success('Task posted');
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssign('unassigned');
    },
    onError: (err: Error) => {
      showError(err.message || 'Task failed');
    },
  });

  // Tree view helpers
  const rootNodes = useCallback(() => {
    const childIds = new Set<string>();
    topology.edges.forEach((e) => {
      if (e.kind === 'parent_child') childIds.add(e.to);
    });
    return topology.nodes.filter((n) => !childIds.has(n.id));
  }, [topology]);

  const childrenOf = useCallback(
    (id: string) => {
      const childIds = new Set<string>();
      topology.edges.forEach((e) => {
        if (e.kind === 'parent_child' && e.from === id) childIds.add(e.to);
      });
      return topology.nodes.filter((n) => childIds.has(n.id));
    },
    [topology]
  );

  const peersOf = useCallback(
    (id: string) => {
      const peerIds = new Set<string>();
      topology.edges.forEach((e) => {
        if (e.kind === 'peer') {
          if (e.from === id) peerIds.add(e.to);
          if (e.to === id) peerIds.add(e.from);
        }
      });
      return topology.nodes.filter((n) => peerIds.has(n.id));
    },
    [topology]
  );

  const handleSendSubmit = () => {
    if (!sendFrom || !sendTo || !sendMsg.trim()) return;
    sendMessageMutation.mutate({
      from_agent_id: sendFrom,
      to_agent_id: sendTo,
      message: sendMsg.trim(),
    });
  };

  const handleTaskSubmit = () => {
    if (!taskTitle.trim()) return;
    const body: { title: string; description: string; assigned_to?: string } = {
      title: taskTitle.trim(),
      description: taskDesc,
    };
    if (taskAssign && taskAssign !== 'unassigned') body.assigned_to = taskAssign;
    postTaskMutation.mutate(body);
  };

  const isLoading = topologyLoading || eventsLoading;
  const loadError = topologyError?.message || eventsError?.message || '';

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Agent Comms</h1>
            <p className="text-muted-foreground">Agent topology and inter-agent communication</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setSendFrom('');
                setSendTo('');
                setSendMsg('');
                setShowSendModal(true);
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTaskTitle('');
                setTaskDesc('');
                setTaskAssign('unassigned');
                setShowTaskModal(true);
              }}
            >
              <Flag className="h-4 w-4 mr-2" />
              Post Task
            </Button>
            <Button variant="ghost" size="sm" onClick={() => refetchTopology()} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="animate-in fade-in duration-200 space-y-4">
            <Card>
              <CardHeader>
                <div className="h-4 w-40 bg-muted rounded animate-pulse mb-2" />
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="h-4 w-32 bg-muted rounded animate-pulse mb-2" />
              </CardHeader>
              <CardContent>
                <div className="h-48 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error State */}
        {!isLoading && loadError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center animate-in fade-in duration-300">
            <h3 className="text-destructive font-semibold mb-2">Connection Error</h3>
            <p className="text-xs text-muted-foreground mb-4">{loadError}</p>
            <Button size="sm" onClick={() => refetchTopology()}>
              Retry
            </Button>
          </div>
        )}

        {/* Content */}
        {!isLoading && !loadError && (
          <div className="animate-in fade-in duration-300 space-y-6">
            {/* Topology Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  Agent Topology
                  <Badge variant="secondary" className="font-normal">
                    {topology.nodes.length} agents
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {topology.nodes.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">No agents running</div>
                ) : (
                  <div className="font-mono text-xs leading-7 py-2">
                    {rootNodes().map((root) => (
                      <div key={root.id} className="mb-4">
                        {/* Root node */}
                        <div className="flex items-center flex-wrap gap-1" title={root.id}>
                          <Badge className={stateBadgeClass(root.state)} style={{ fontSize: '10px', padding: '1px 6px' }}>
                            {root.state}
                          </Badge>
                          <strong className="mx-1">{root.name}</strong>
                          <span className="text-muted-foreground">{root.model}</span>
                          {peersOf(root.id).map((peer) => (
                            <span key={peer.id} className="text-muted-foreground ml-2">
                              {'\u2194'} {peer.name}
                            </span>
                          ))}
                        </div>
                        {/* Child nodes */}
                        {childrenOf(root.id).map((child, ci) => {
                          const isLast = ci === childrenOf(root.id).length - 1;
                          return (
                            <div key={child.id} className="flex items-center ml-4">
                              <span className="text-muted-foreground mr-1">
                                {isLast ? '\u2514\u2500\u2500 ' : '\u251c\u2500\u2500 '}
                              </span>
                              <Badge className={stateBadgeClass(child.state)} style={{ fontSize: '10px', padding: '1px 6px' }}>
                                {child.state}
                              </Badge>
                              <strong className="mx-1">{child.name}</strong>
                              <span className="text-muted-foreground">{child.model}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Event Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Live Event Feed
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className="bg-green-100 text-green-800 border-green-300"
                      style={{ fontSize: '9px', padding: '2px 6px' }}
                    >
                      <span className="relative flex h-2 w-2 mr-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                      </span>
                      LIVE
                    </Badge>
                    <span className="text-xs text-muted-foreground">{events.length} events</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="max-h-[400px] overflow-y-auto">
                  {events.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">No inter-agent events yet</div>
                  ) : (
                    <div className="space-y-1">
                      {events.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center gap-3 py-2 px-2 hover:bg-muted/50 rounded text-sm"
                        >
                          <span className="text-xs text-muted-foreground w-16 shrink-0">
                            {timeAgo(ev.timestamp)}
                          </span>
                          <Badge
                            className={eventBadgeClass(ev.kind)}
                            style={{ fontSize: '10px', padding: '1px 6px', minWidth: '70px', textAlign: 'center' }}
                          >
                            {eventLabel(ev.kind)}
                          </Badge>
                          <span className="font-semibold text-xs">{ev.source_name}</span>
                          {ev.target_name && (
                            <span className="text-muted-foreground">{'\u2192'} {ev.target_name}</span>
                          )}
                          <span
                            className="text-muted-foreground text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                            title={ev.detail}
                          >
                            {ev.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Send Message Modal */}
      <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Agent Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-2">From Agent</label>
              <Select value={sendFrom} onValueChange={setSendFrom}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent..." />
                </SelectTrigger>
                <SelectContent>
                  {topology.nodes.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.name} ({n.state})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2">To Agent</label>
              <Select value={sendTo} onValueChange={setSendTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent..." />
                </SelectTrigger>
                <SelectContent>
                  {topology.nodes.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.name} ({n.state})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2">Message</label>
              <Textarea
                value={sendMsg}
                onChange={(e) => setSendMsg(e.target.value)}
                placeholder="Type a message..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowSendModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSendSubmit}
                disabled={sendMessageMutation.isPending || !sendFrom || !sendTo || !sendMsg.trim()}
              >
                {sendMessageMutation.isPending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Post Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-2">Title</label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2">Description</label>
              <Textarea
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="Task description..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2">Assign To (optional)</label>
              <Select value={taskAssign} onValueChange={setTaskAssign}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {topology.nodes.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowTaskModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleTaskSubmit}
                disabled={postTaskMutation.isPending || !taskTitle.trim()}
              >
                {postTaskMutation.isPending ? 'Posting...' : 'Post Task'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Comms;
