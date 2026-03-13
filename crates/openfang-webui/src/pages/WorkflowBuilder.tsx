// WorkflowBuilder - Visual Editor Style (Cyber-Neon)
import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { cyberColors } from '@/lib/animations';
import type { Agent } from '@/api/types';
import {
  Play, Save, Trash2, GitBranch, Bot, Wrench, Circle, Square,
  Loader2, MousePointer2, X, Zap, ArrowRight, Cpu, Plus,
  Settings, CheckCircle2, ZoomIn, ZoomOut, Maximize, FileCode,
  RotateCcw, Copy, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NodeType = 'start' | 'agent' | 'tool' | 'condition' | 'parallel' | 'loop' | 'collect' | 'end';

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

const NODE_TYPES: { type: NodeType; label: string; icon: typeof Bot; color: string; glow: string }[] = [
  { type: 'start', label: 'Start', icon: Circle, color: 'var(--neon-green)', glow: 'rgba(0, 255, 136, 0.5)' },
  { type: 'agent', label: 'Agent Step', icon: Bot, color: 'var(--neon-cyan)', glow: 'rgba(0, 240, 255, 0.5)' },
  { type: 'tool', label: 'Tool', icon: Wrench, color: 'var(--neon-amber)', glow: 'rgba(255, 184, 0, 0.5)' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'var(--neon-magenta)', glow: 'rgba(255, 0, 110, 0.5)' },
  { type: 'parallel', label: 'Parallel', icon: Zap, color: 'var(--neon-amber)', glow: 'rgba(255, 184, 0, 0.5)' },
  { type: 'loop', label: 'Loop', icon: ArrowRight, color: 'var(--neon-cyan)', glow: 'rgba(0, 240, 255, 0.5)' },
  { type: 'collect', label: 'Collect', icon: CheckCircle2, color: 'var(--neon-green)', glow: 'rgba(0, 255, 136, 0.5)' },
  { type: 'end', label: 'End', icon: Square, color: 'var(--chart-purple)', glow: 'rgba(139, 92, 246, 0.5)' },
];

// Generate bezier curve path between two points
function generatePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1);
  const controlPointOffset = Math.min(dx * 0.5, 100);
  return `M ${x1} ${y1} C ${x1 + controlPointOffset} ${y1}, ${x2 - controlPointOffset} ${y2}, ${x2} ${y2}`;
}

function generateId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Grid background component
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Main grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(var(--neon-cyan-rgb, 0, 240, 255), 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(var(--neon-cyan-rgb, 0, 240, 255), 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      {/* Fine grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(var(--text-primary-rgb, 255, 255, 255), 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(var(--text-primary-rgb, 255, 255, 255), 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '10px 10px'
        }}
      />
    </div>
  );
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
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [tomlPreviewOpen, setTomlPreviewOpen] = useState(false);
  const [copiedToml, setCopiedToml] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const queryClient = useQueryClient();

  // Fetch agents
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

  // Add node
  const addNode = useCallback((type: NodeType) => {
    const config = NODE_TYPES.find((n) => n.type === type);
    const newNode: WorkflowNode = {
      id: generateId(),
      type,
      x: 200 + Math.random() * 100,
      y: 150 + Math.random() * 100,
      label: config?.label || type,
      config: type === 'agent' ? { agent_id: agents[0]?.id } : undefined,
    };
    setNodes((prev) => [...prev, newNode]);
  }, [agents]);

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId));
    setSelectedNodeId(null);
  }, []);

  // Connection handlers
  const startConnection = useCallback((nodeId: string) => {
    setConnectingFrom(nodeId);
  }, []);

  const completeConnection = useCallback((toNodeId: string) => {
    if (connectingFrom && connectingFrom !== toNodeId) {
      const exists = edges.some((e) => e.from === connectingFrom && e.to === toNodeId);
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

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
  }, []);

  // Drag handlers
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

    const handleMouseUp = () => setDraggedNode(null);

    if (draggedNode) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedNode, dragOffset]);

  // Validation
  const validateWorkflow = useCallback((): string[] => {
    const errors: string[] = [];
    const startNodes = nodes.filter((n) => n.type === 'start');
    const endNodes = nodes.filter((n) => n.type === 'end');

    if (startNodes.length === 0) errors.push('Workflow must have at least one Start node');
    if (endNodes.length === 0) errors.push('Workflow must have at least one End node');

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

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const NODE_WIDTH = 140;
  const NODE_HEIGHT = 50;

  // Generate TOML from workflow
  const generateTOML = useCallback((): string => {
    const nodeToStep = (node: WorkflowNode): string => {
      const base = `[[step]]\nname = "${node.label}"\n`;
      switch (node.type) {
        case 'start':
          return base + 'type = "start"\n';
        case 'end':
          return base + 'type = "end"\n';
        case 'agent':
          return base + `type = "agent"\nagent_id = "${node.config?.agent_id || ''}"\n`;
        case 'tool':
          return base + `type = "tool"\ntool_name = "${node.config?.tool_name || ''}"\n`;
        case 'condition':
          return base + `type = "condition"\ncondition = "${node.config?.condition || ''}"\n`;
        case 'parallel':
          return base + 'type = "parallel"\nmode = "fan_out"\n';
        case 'loop':
          return base + `type = "loop"\nmax_iterations = ${node.config?.max_iterations || 5}\n`;
        case 'collect':
          return base + 'type = "collect"\nmode = "gather"\n';
        default:
          return base;
      }
    };

    let toml = `# Workflow: ${workflowName || 'Untitled'}\n`;
    toml += `# Generated from Visual Editor\n\n`;
    toml += `name = "${workflowName || 'Untitled'}"\n`;
    toml += `version = "1.0.0"\n\n`;

    // Add steps
    nodes.forEach(node => {
      toml += nodeToStep(node) + '\n';
    });

    // Add connections
    if (edges.length > 0) {
      toml += '# Connections\n';
      edges.forEach(edge => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (fromNode && toNode) {
          toml += `# ${fromNode.label} -> ${toNode.label}\n`;
        }
      });
    }

    return toml;
  }, [nodes, edges, workflowName]);

  // Zoom handlers
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.3));
  const handleZoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Pan handlers
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [isPanning, panStart]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Copy TOML to clipboard
  const copyToml = useCallback(() => {
    navigator.clipboard.writeText(generateTOML());
    setCopiedToml(true);
    setTimeout(() => setCopiedToml(false), 2000);
  }, [generateTOML]);

  return (
    <div className="h-full flex bg-[var(--surface-primary)]">
      {/* Left Sidebar - Node Palette */}
      <motion.div
        className="w-64 border-r border-[var(--border-default)] bg-[var(--void)]/50 backdrop-blur-sm p-4 flex flex-col gap-6"
        initial={{ x: -64, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
      >
        <div>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[var(--neon-cyan)]" />
            Node Palette
          </h3>
          <div className="space-y-2">
            {NODE_TYPES.map(({ type, label, icon: Icon, color }) => (
              <motion.button
                key={type}
                onClick={() => addNode(type)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-colors"
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <span className="text-sm text-[var(--text-secondary)]">{label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-[var(--neon-amber)]" />
            Actions
          </h3>
          <div className="space-y-2">
            <motion.button
              onClick={() => { setNodes([]); setEdges([]); setSelectedNodeId(null); }}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-default)] hover:border-[var(--neon-magenta)]/50 text-[var(--neon-magenta)] transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">Clear Canvas</span>
            </motion.button>
            <motion.button
              onClick={() => setSaveDialogOpen(true)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-default)] hover:border-[var(--neon-green)]/50 text-[var(--neon-green)] transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Save className="w-4 h-4" />
              <span className="text-sm">Save Workflow</span>
            </motion.button>
          </div>
        </div>

        <div className="mt-auto p-4 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-default)]">
          <p className="text-xs text-[var(--text-muted)] font-medium mb-2">Instructions</p>
          <ul className="space-y-1 text-xs text-[var(--text-muted)] list-disc list-inside">
            <li>Click node type to add</li>
            <li>Drag nodes to move</li>
            <li>Select node to connect</li>
            <li>Click edge to delete</li>
          </ul>
        </div>
      </motion.div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col relative">
        {/* Toolbar */}
        <motion.div
          className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] bg-[var(--void)]/30 backdrop-blur-sm"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold">
              <NeonText color="cyan">Workflow Builder</NeonText>
            </h1>
            {connectingFrom && (
              <span className="px-3 py-1 rounded-full text-xs bg-[var(--neon-amber)]/10 text-[var(--neon-amber)] border border-[var(--neon-amber)]/30 flex items-center gap-1">
                <MousePointer2 className="w-3 h-3" />
                Click target node to connect
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {validationErrors.length > 0 && (
              <span className="px-3 py-1 rounded-full text-xs bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)] border border-[var(--neon-magenta)]/30">
                {validationErrors.length} issues
              </span>
            )}
            <motion.button
              onClick={() => {}}
              disabled={validationErrors.length > 0 || nodes.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--neon-green)] text-[var(--void)] font-medium text-sm disabled:opacity-30"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play className="w-4 h-4" />
              Run
            </motion.button>
          </div>
        </motion.div>

        {/* SVG Canvas */}
        <div
          className="flex-1 relative overflow-hidden"
          onMouseDown={handlePanStart}
          onMouseMove={handlePanMove}
          onMouseUp={handlePanEnd}
          onMouseLeave={handlePanEnd}
          style={{ cursor: isPanning ? 'grabbing' : 'default' }}
        >
          <GridBackground />

          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <motion.button
              onClick={handleZoomIn}
              className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] hover:border-[var(--neon-cyan)]/50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={handleZoomOut}
              className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] hover:border-[var(--neon-cyan)]/50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={handleZoomReset}
              className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] hover:border-[var(--neon-cyan)]/50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Reset View"
            >
              <Maximize className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={() => setTomlPreviewOpen(true)}
              className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--neon-amber)] hover:border-[var(--neon-amber)]/50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="TOML Preview"
            >
              <FileCode className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Zoom Level Indicator */}
          <div className="absolute bottom-4 right-4 px-3 py-1 rounded-lg bg-[var(--void)]/50 backdrop-blur-sm border border-[var(--border-default)] text-xs text-[var(--text-muted)]">
            {Math.round(zoom * 100)}%
          </div>

          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ cursor: isPanning ? 'grabbing' : draggedNode ? 'grabbing' : 'default' }}
            onClick={() => {
              setSelectedNodeId(null);
              setConnectingFrom(null);
            }}
          >
            {/* Glow filter */}
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--neon-cyan)" />
              </marker>
            </defs>

            {/* Transform group for zoom and pan */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>

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
                    stroke="var(--neon-cyan)"
                    strokeWidth={2}
                    strokeOpacity={0.6}
                    markerEnd="url(#arrowhead)"
                    className="cursor-pointer hover:stroke-[var(--neon-magenta)] transition-colors"
                    filter="url(#glow)"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEdge(edge.id);
                    }}
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const nodeType = NODE_TYPES.find((t) => t.type === node.type);
              const Icon = nodeType?.icon || Circle;
              const color = nodeType?.color || 'var(--neon-cyan)';
              const glow = nodeType?.glow || 'rgba(0, 240, 255, 0.5)';
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
                  filter={isSelected ? 'url(#glow)' : undefined}
                >
                  {/* Node shadow/glow */}
                  {isSelected && (
                    <rect
                      x={-4}
                      y={-4}
                      width={NODE_WIDTH + 8}
                      height={NODE_HEIGHT + 8}
                      rx={10}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      opacity={0.5}
                    />
                  )}

                  {/* Node body */}
                  <rect
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx={8}
                    fill={isConnecting ? `${color}30` : 'var(--surface-primary)'}
                    stroke={isConnecting ? color : isSelected ? color : `${color}50`}
                    strokeWidth={isSelected || isConnecting ? 2 : 1}
                  />

                  {/* Icon background */}
                  <rect
                    x={8}
                    y={10}
                    width={30}
                    height={30}
                    rx={6}
                    fill={`${color}15`}
                  />

                  {/* Icon */}
                  <foreignObject x={8} y={10} width={30} height={30}>
                    <div className="flex items-center justify-center w-full h-full">
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                  </foreignObject>

                  {/* Label */}
                  <text
                    x={NODE_WIDTH / 2 + 15}
                    y={NODE_HEIGHT / 2 + 4}
                    textAnchor="middle"
                    className="text-xs font-medium fill-[var(--text-primary)]"
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.label}
                  </text>

                  {/* Connection points */}
                  {isSelected && (
                    <>
                      <circle
                        cx={NODE_WIDTH / 2}
                        cy={0}
                        r={5}
                        fill={color}
                        className="cursor-crosshair"
                        onClick={(e) => {
                          e.stopPropagation();
                          startConnection(node.id);
                        }}
                      />
                      <circle
                        cx={NODE_WIDTH / 2}
                        cy={NODE_HEIGHT}
                        r={5}
                        fill={color}
                      />
                    </>
                  )}
                </g>
              );
            })}
            </g>
          </svg>

          {/* Stats overlay */}
          <div className="absolute bottom-4 left-4 px-3 py-2 rounded-lg bg-[var(--void)]/50 backdrop-blur-sm border border-[var(--border-default)] text-xs text-[var(--text-muted)]">
            {nodes.length} nodes • {edges.length} connections
          </div>
        </div>
      </div>

      {/* Right Sidebar - Properties */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            className="w-72 border-l border-[var(--border-default)] bg-[var(--void)]/50 backdrop-blur-sm p-4"
            initial={{ x: 64, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 64, opacity: 0 }}
          >
            <SpotlightCard glowColor="rgba(0, 240, 255, 0.1)">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Settings className="w-4 h-4 text-[var(--neon-cyan)]" />
                    Properties
                  </h3>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="p-1 rounded hover:bg-[var(--surface-secondary)]"
                  >
                    <X className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">Label</label>
                    <input
                      type="text"
                      value={selectedNode.label}
                      onChange={(e) =>
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNode.id ? { ...n, label: e.target.value } : n
                          )
                        )
                      }
                      className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">Type</label>
                    <span className="px-2 py-1 rounded bg-[var(--surface-tertiary)] text-xs text-[var(--text-secondary)] capitalize">
                      {selectedNode.type}
                    </span>
                  </div>

                  {selectedNode.type === 'agent' && (
                    <div>
                      <label className="text-xs text-[var(--text-muted)] block mb-1">Agent</label>
                      <select
                        value={(selectedNode.config?.agent_id as string) || ''}
                        onChange={(e) =>
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, config: { ...n.config, agent_id: e.target.value } }
                                : n
                            )
                          )
                        }
                        className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
                      >
                        <option value="" className="bg-[var(--surface-primary)]">Select agent...</option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id} className="bg-[var(--surface-primary)]">
                            {agent.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedNode.type === 'loop' && (
                    <div>
                      <label className="text-xs text-[var(--text-muted)] block mb-1">Max Iterations</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={(selectedNode.config?.max_iterations as number) || 5}
                        onChange={(e) =>
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, config: { ...n.config, max_iterations: parseInt(e.target.value) || 5 } }
                                : n
                            )
                          )
                        }
                        className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
                      />
                    </div>
                  )}

                  {selectedNode.type === 'condition' && (
                    <div>
                      <label className="text-xs text-[var(--text-muted)] block mb-1">Condition Expression</label>
                      <input
                        type="text"
                        placeholder="e.g., result.status === 'success'"
                        value={(selectedNode.config?.condition as string) || ''}
                        onChange={(e) =>
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, config: { ...n.config, condition: e.target.value } }
                                : n
                            )
                          )
                        }
                        className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
                      />
                    </div>
                  )}

                  {selectedNode.type === 'tool' && (
                    <div>
                      <label className="text-xs text-[var(--text-muted)] block mb-1">Tool Name</label>
                      <input
                        type="text"
                        placeholder="e.g., file_read"
                        value={(selectedNode.config?.tool_name as string) || ''}
                        onChange={(e) =>
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, config: { ...n.config, tool_name: e.target.value } }
                                : n
                            )
                          )
                        }
                        className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">Position</label>
                    <div className="text-xs text-[var(--text-secondary)] font-mono">
                      X: {Math.round(selectedNode.x)}, Y: {Math.round(selectedNode.y)}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-default)] flex gap-2">
                  <motion.button
                    onClick={() => startConnection(selectedNode.id)}
                    disabled={!!connectingFrom}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)] text-sm border border-[var(--neon-cyan)]/30 disabled:opacity-30"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <GitBranch className="w-4 h-4" />
                    Connect
                  </motion.button>
                  <motion.button
                    onClick={() => deleteNode(selectedNode.id)}
                    className="px-3 py-2 rounded-lg bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)] border border-[var(--neon-magenta)]/30"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </SpotlightCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Dialog */}
      <AnimatePresence>
        {saveDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[var(--void)]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSaveDialogOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Save Workflow</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">Save your workflow to run it later.</p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[var(--text-muted)] block mb-2">Workflow Name</label>
                  <input
                    type="text"
                    placeholder="My Workflow"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)]"
                  />
                </div>

                {validationErrors.length > 0 && (
                  <div className="p-3 rounded-lg bg-[var(--neon-magenta)]/10 border border-[var(--neon-magenta)]/30">
                    <p className="text-sm text-[var(--neon-magenta)] font-medium mb-2">Validation Errors:</p>
                    <ul className="text-xs text-[var(--neon-magenta)]/80 list-disc list-inside">
                      {validationErrors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-xs text-[var(--text-muted)]">
                  Nodes: {nodes.length} | Connections: {edges.length}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setSaveDialogOpen(false)}
                  className="flex-1 py-2.5 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={saveWorkflow}
                  disabled={!workflowName.trim() || createMutation.isPending}
                  className="flex-1 py-2.5 rounded-lg bg-[var(--neon-green)] text-[var(--void)] font-medium disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  ) : (
                    <Save className="w-4 h-4 inline mr-2" />
                  )}
                  Save
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOML Preview Dialog */}
      <AnimatePresence>
        {tomlPreviewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[var(--void)]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setTomlPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-2xl p-6 w-full max-w-2xl h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-[var(--neon-amber)]" />
                    TOML Preview
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">Workflow configuration export</p>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={copyToml}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--neon-cyan)]"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {copiedToml ? (
                      <>
                        <Check className="w-4 h-4 text-[var(--neon-green)]" />
                        <span className="text-sm text-[var(--neon-green)]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="text-sm">Copy</span>
                      </>
                    )}
                  </motion.button>
                  <button
                    onClick={() => setTomlPreviewOpen(false)}
                    className="p-2 rounded-lg hover:bg-[var(--surface-secondary)]"
                  >
                    <X className="w-5 h-5 text-[var(--text-muted)]" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <pre className="p-4 rounded-xl bg-[var(--void)] border border-[var(--border-default)] text-sm font-mono text-[var(--text-secondary)] whitespace-pre-wrap">
                  {generateTOML()}
                </pre>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-default)]">
                <div className="text-xs text-[var(--text-muted)]">
                  {nodes.length} nodes • {edges.length} connections
                </div>
                <button
                  onClick={() => setTomlPreviewOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] font-medium"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WorkflowBuilder;
