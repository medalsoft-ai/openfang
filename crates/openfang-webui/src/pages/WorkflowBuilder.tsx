import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { api } from '@/api/client';
import type { Agent } from '@/api/types';
import {
  Play,
  Save,
  Trash2,
  GitBranch,
  Bot,
  Wrench,
  Circle,
  Square,
  Loader2,
  MousePointer2,
  X,
} from 'lucide-react';

type NodeType = 'start' | 'agent' | 'tool' | 'condition' | 'end';

interface WorkflowNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  label: string;
  config?: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  condition?: string;
}

interface WorkflowData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

const NODE_TYPES: { type: NodeType; label: string; icon: typeof Bot; color: string }[] = [
  { type: 'start', label: 'Start', icon: Circle, color: '#22c55e' },
  { type: 'agent', label: 'Agent', icon: Bot, color: '#3b82f6' },
  { type: 'tool', label: 'Tool', icon: Wrench, color: '#f59e0b' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: '#a855f7' },
  { type: 'end', label: 'End', icon: Square, color: '#ef4444' },
];

// Generate bezier curve path between two points
function generatePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1);
  const controlPointOffset = Math.min(dx * 0.5, 100);
  return `M ${x1} ${y1} C ${x1 + controlPointOffset} ${y1}, ${x2 - controlPointOffset} ${y2}, ${x2} ${y2}`;
}

// Generate unique ID
function generateId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function WorkflowBuilder() {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const queryClient = useQueryClient();

  // Fetch agents for agent nodes
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => api.listAgents(),
  });

  // Create workflow mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; workflow: WorkflowData }) => {
      return api.post('/api/workflows', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setSaveDialogOpen(false);
      setWorkflowName('');
    },
  });

  // Add a new node
  const addNode = useCallback((type: NodeType) => {
    const newNode: WorkflowNode = {
      id: generateId(),
      type,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      label: NODE_TYPES.find((n) => n.type === type)?.label || type,
      config: type === 'agent' ? { agent_id: agents[0]?.id } : undefined,
    };
    setNodes((prev) => [...prev, newNode]);
  }, [agents]);

  // Delete a node
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId));
    setSelectedNodeId(null);
  }, []);

  // Start connecting nodes
  const startConnection = useCallback((nodeId: string) => {
    setConnectingFrom(nodeId);
  }, []);

  // Complete connection
  const completeConnection = useCallback((toNodeId: string) => {
    if (connectingFrom && connectingFrom !== toNodeId) {
      // Check if connection already exists
      const exists = edges.some(
        (e) => e.from === connectingFrom && e.to === toNodeId
      );
      if (!exists) {
        const newEdge: WorkflowEdge = {
          id: `edge-${Date.now()}`,
          from: connectingFrom,
          to: toNodeId,
        };
        setEdges((prev) => [...prev, newEdge]);
      }
    }
    setConnectingFrom(null);
  }, [connectingFrom, edges]);

  // Delete edge
  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
  }, []);

  // Handle node drag
  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    setDraggedNode(nodeId);
    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y,
    });
    setSelectedNodeId(nodeId);
  }, [nodes]);

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggedNode || !svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;

      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggedNode ? { ...n, x: Math.max(30, x), y: Math.max(30, y) } : n
        )
      );
    };

    const handleMouseUp = () => {
      setDraggedNode(null);
    };

    if (draggedNode) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedNode, dragOffset]);

  // Validate workflow
  const validateWorkflow = useCallback((): string[] => {
    const errors: string[] = [];

    const startNodes = nodes.filter((n) => n.type === 'start');
    const endNodes = nodes.filter((n) => n.type === 'end');

    if (startNodes.length === 0) errors.push('Workflow must have at least one Start node');
    if (endNodes.length === 0) errors.push('Workflow must have at least one End node');

    // Check for orphaned nodes
    const connectedNodeIds = new Set<string>();
    edges.forEach((e) => {
      connectedNodeIds.add(e.from);
      connectedNodeIds.add(e.to);
    });

    nodes.forEach((n) => {
      if (!connectedNodeIds.has(n.id) && n.type !== 'start') {
        errors.push(`Node "${n.label}" is not connected`);
      }
    });

    return errors;
  }, [nodes, edges]);

  // Save workflow
  const saveWorkflow = useCallback(() => {
    const errors = validateWorkflow();
    setValidationErrors(errors);

    if (errors.length === 0 && workflowName.trim()) {
      createMutation.mutate({
        name: workflowName.trim(),
        workflow: { nodes, edges },
      });
    }
  }, [validateWorkflow, workflowName, nodes, edges, createMutation]);

  // Run workflow
  const runWorkflow = useCallback(() => {
    // TODO: Implement workflow run when a workflow is saved/loaded
    console.log('Run workflow - nodes:', nodes.length, 'edges:', edges.length);
  }, [nodes, edges]);

  // Get selected node
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Node size
  const NODE_WIDTH = 120;
  const NODE_HEIGHT = 60;

  return (
    <div className="flex h-full"
    >
      {/* Left sidebar - Node palette */}
      <div className="w-64 border-r bg-muted/30 p-4 flex flex-col gap-4"
      >
        <div>
          <h3 className="font-semibold mb-3"
          >Node Palette</h3>
          <div className="grid grid-cols-1 gap-2"
          >
            {NODE_TYPES.map(({ type, label, icon: Icon, color }) => (
              <Button
                key={type}
                variant="outline"
                className="justify-start gap-2"
                onClick={() => addNode(type)}
              >
                <Icon className="h-4 w-4" style={{ color }} />
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3"
          >Tools</h3>
          <div className="space-y-2"
          >
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                setNodes([]);
                setEdges([]);
                setSelectedNodeId(null);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Clear Canvas
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setSaveDialogOpen(true)}
            >
              <Save className="h-4 w-4" />
              Save Workflow
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground"
        >
          <p className="font-medium mb-1"
          >Instructions:</p>
          <ul className="space-y-1 list-disc list-inside"
          >
            <li>Click node type to add</li>
            <li>Drag nodes to move</li>
            <li>Click node to select</li>
            <li>Click "Connect" then target node</li>
          </ul>
        </div>
      </div>

      {/* Main canvas */}
      <div className="flex-1 flex flex-col"
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b"
        >
          <div className="flex items-center gap-4"
          >
            <h1 className="font-semibold"
            >Workflow Builder</h1>
            {connectingFrom && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600"
              >
                <MousePointer2 className="h-3 w-3 mr-1" />
                Click target node to connect
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2"
          >
            {validationErrors.length > 0 && (
              <Badge variant="destructive"
              >
                {validationErrors.length} issues
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={runWorkflow}
              disabled={validationErrors.length > 0 || nodes.length === 0}
            >
              <Play className="h-4 w-4 mr-1" />
              Run
            </Button>
          </div>
        </div>

        {/* SVG Canvas */}
        <div className="flex-1 bg-grid-slate-100 relative overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onClick={() => {
              setSelectedNodeId(null);
              setConnectingFrom(null);
            }}
          >
            {/* Edges */}
            {edges.map((edge) => {
              const fromNode = nodes.find((n) => n.id === edge.from);
              const toNode = nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const path = generatePath(
                fromNode.x + NODE_WIDTH / 2,
                fromNode.y + NODE_HEIGHT / 2,
                toNode.x + NODE_WIDTH / 2,
                toNode.y + NODE_HEIGHT / 2
              );

              return (
                <g key={edge.id}>
                  <path
                    d={path}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth={2}
                    markerEnd="url(#arrowhead)"
                    className="hover:stroke-red-500 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEdge(edge.id);
                    }}
                  />
                </g>
              );
            })}

            {/* Arrow marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth={10}
                markerHeight={7}
                refX={9}
                refY={3.5}
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
              </marker>
            </defs>

            {/* Nodes */}
            {nodes.map((node) => {
              const nodeType = NODE_TYPES.find((t) => t.type === node.type);
              const Icon = nodeType?.icon || Circle;
              const color = nodeType?.color || '#64748b';
              const isSelected = selectedNodeId === node.id;
              const isConnecting = connectingFrom === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer"
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectingFrom) {
                      completeConnection(node.id);
                    } else {
                      setSelectedNodeId(node.id);
                    }
                  }}
                >
                  {/* Node body */}
                  <rect
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx={8}
                    fill={isSelected ? '#f1f5f9' : '#ffffff'}
                    stroke={isSelected ? '#3b82f6' : isConnecting ? '#f59e0b' : color}
                    strokeWidth={isSelected || isConnecting ? 3 : 2}
                    className="shadow-lg"
                  />

                  {/* Icon */}
                  <foreignObject x={10} y={18} width={24} height={24}>
                    <div className="flex items-center justify-center"
                    >
                      <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                  </foreignObject>

                  {/* Label */}
                  <text
                    x={NODE_WIDTH / 2}
                    y={NODE_HEIGHT / 2 + 5}
                    textAnchor="middle"
                    className="text-sm font-medium fill-current"
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.label}
                  </text>

                  {/* Connection point indicator */}
                  <circle
                    cx={NODE_WIDTH / 2}
                    cy={0}
                    r={4}
                    fill={color}
                    className="opacity-0 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      startConnection(node.id);
                    }}
                  />
                  <circle
                    cx={NODE_WIDTH / 2}
                    cy={NODE_HEIGHT}
                    r={4}
                    fill={color}
                    className="opacity-0 hover:opacity-100"
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Right sidebar - Properties */}
      {selectedNode && (
        <div className="w-72 border-l bg-muted/30 p-4"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between"
              >
                Node Properties
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setSelectedNodeId(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={selectedNode.label}
                  onChange={(e) =>
                    setNodes((prev) =>
                      prev.map((n) =>
                        n.id === selectedNode.id ? { ...n, label: e.target.value } : n
                      )
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Badge variant="secondary">{selectedNode.type}</Badge>
              </div>

              {selectedNode.type === 'agent' && (
                <div className="space-y-2">
                  <Label>Agent</Label>
                  <Select
                    value={(selectedNode.config?.agent_id as string) || ''}
                    onValueChange={(value) =>
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === selectedNode.id
                            ? { ...n, config: { ...n.config, agent_id: value } }
                            : n
                        )
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Position</Label>
                <div className="text-sm text-muted-foreground"
                >
                  X: {Math.round(selectedNode.x)}, Y: {Math.round(selectedNode.y)}
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => startConnection(selectedNode.id)}
                  disabled={!!connectingFrom}
                >
                  <GitBranch className="h-4 w-4 mr-1" />
                  Connect
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteNode(selectedNode.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Workflow</DialogTitle>
            <DialogDescription>
              Save your workflow to run it later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Workflow Name</Label>
              <Input
                placeholder="My Workflow"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
              />
            </div>

            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm font-medium text-red-800 mb-2">
                  Validation Errors:
                </p>
                <ul className="text-sm text-red-700 list-disc list-inside">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              <p>Nodes: {nodes.length} | Connections: {edges.length}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={saveWorkflow}
              disabled={!workflowName.trim() || createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WorkflowBuilder;
