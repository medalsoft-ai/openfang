import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  type Connection,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Maximize2, Minimize2 } from 'lucide-react';

import { StepNode } from './StepNode';

// Local HandStep type for UI state (matches Hands.tsx)
interface HandStep {
  id: string;
  order: number;
  title: string;
  description?: string;
  tool?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  nextSteps?: string[];
}

const nodeTypes: NodeTypes = {
  stepNode: StepNode,
};

interface FlowCanvasProps {
  steps: HandStep[];
  readOnly?: boolean;
  isEditing?: boolean;
  selectedNodeId?: string | null;
  stepStatuses?: Record<string, 'pending' | 'running' | 'completed' | 'failed' | 'waiting'>;
  onStepsChange?: (steps: HandStep[]) => void;
  onNodeSelect?: (nodeId: string | null) => void;
  onStepAdd?: (step: HandStep, position: { x: number; y: number }) => void;
  onStepDelete?: (stepId: string) => void;
}

// Vertical top-to-bottom layout - each branch is a vertical column
function calculateLayout(steps: HandStep[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const stepMap = new Map(steps.map(s => [s.id, s]));

  if (steps.length === 0) return positions;

  // Find root nodes (not targeted by any other step)
  const allTargets = new Set(steps.flatMap(s => s.nextSteps ?? []));
  const roots = steps.filter(s => !allTargets.has(s.id));
  const startNodes = roots.length > 0 ? roots : steps;

  const VERTICAL_SPACING = 100;   // Vertical distance between nodes
  const COLUMN_WIDTH = 220;       // Horizontal distance between columns

  // Layout each root and its descendants as a vertical column
  let currentColumnX = 0;
  const visited = new Set<string>();

  function layoutBranch(rootId: string, columnX: number): number {
    let currentY = 0;
    const queue: string[] = [rootId];
    const branchNodes: string[] = [];

    // BFS to get all nodes in this branch
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      if (!stepMap.has(nodeId)) continue;

      visited.add(nodeId);
      branchNodes.push(nodeId);

      const step = stepMap.get(nodeId)!;
      // Only follow children that haven't been visited (belong to this branch)
      (step.nextSteps ?? []).forEach(childId => {
        if (!visited.has(childId) && stepMap.has(childId)) {
          queue.push(childId);
        }
      });
    }

    // Position nodes vertically in this column
    branchNodes.forEach((nodeId, index) => {
      positions.set(nodeId, { x: columnX, y: index * VERTICAL_SPACING });
    });

    return branchNodes.length;
  }

  // Layout each root as a separate column
  startNodes.forEach((root, index) => {
    const columnX = index * COLUMN_WIDTH;
    layoutBranch(root.id, columnX);
  });

  // Handle any disconnected/orphan nodes (not visited by above)
  const orphans = steps.filter(s => !visited.has(s.id));
  if (orphans.length > 0) {
    const orphanColumnX = startNodes.length * COLUMN_WIDTH;
    orphans.forEach((step, index) => {
      positions.set(step.id, { x: orphanColumnX, y: index * VERTICAL_SPACING });
    });
  }

  // Center the whole layout around x=0
  const allX = Array.from(positions.values()).map(p => p.x);
  if (allX.length > 0) {
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const centerOffset = (minX + maxX) / 2;

    positions.forEach((pos, id) => {
      positions.set(id, { x: pos.x - centerOffset, y: pos.y });
    });
  }

  return positions;
}

// Inner component that uses useReactFlow - must be wrapped in ReactFlowProvider
const FlowCanvasInner: React.FC<FlowCanvasProps> = ({
  steps,
  readOnly = true,
  isEditing = false,
  selectedNodeId,
  stepStatuses = {},
  onStepsChange,
  onNodeSelect,
  onStepAdd,
  onStepDelete,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const positions = useMemo(() => calculateLayout(steps), [steps]);

  // Toggle element fullscreen (with Tauri fallback)
  const toggleFullscreen = useCallback(async () => {
    const element = reactFlowWrapper.current;
    console.log('[FlowCanvas] Toggle fullscreen clicked, element:', element);
    if (!element) {
      console.warn('[FlowCanvas] No element ref found');
      return;
    }

    try {
      // Try standard browser fullscreen API first
      if (!document.fullscreenElement) {
        console.log('[FlowCanvas] Entering fullscreen...');
        if (element.requestFullscreen) {
          await element.requestFullscreen();
          console.log('[FlowCanvas] Entered fullscreen via requestFullscreen');
        } else {
          // Fallback for webkit browsers
          const webkitElement = element as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
          if (webkitElement.webkitRequestFullscreen) {
            await webkitElement.webkitRequestFullscreen();
            console.log('[FlowCanvas] Entered fullscreen via webkitRequestFullscreen');
          }
        }
        setIsFullscreen(true);
      } else {
        console.log('[FlowCanvas] Exiting fullscreen...');
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          const webkitDoc = document as Document & { webkitExitFullscreen?: () => Promise<void> };
          if (webkitDoc.webkitExitFullscreen) {
            await webkitDoc.webkitExitFullscreen();
          }
        }
        console.log('[FlowCanvas] Exited fullscreen');
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('[FlowCanvas] Fullscreen error:', error);
      // Fallback: try Tauri window maximize
      try {
        const { isTauri } = await import('@/lib/tauri');
        if (isTauri()) {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const window = getCurrentWindow();
          const isMaximized = await window.isMaximized();
          if (isMaximized) {
            await window.unmaximize();
            setIsFullscreen(false);
          } else {
            await window.maximize();
            setIsFullscreen(true);
          }
        }
      } catch (tauriError) {
        console.error('[FlowCanvas] Tauri fallback error:', tauriError);
      }
    }
  }, []);

  // Listen for fullscreen change events (e.g., ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element;
      };
      setIsFullscreen(!!(document.fullscreenElement || doc.webkitFullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const initialNodes: Node[] = useMemo(() => {
    return steps.map(step => ({
      id: step.id,
      type: 'stepNode',
      position: positions.get(step.id) || { x: 0, y: 0 },
      data: {
        step,
        isEditing,
        isSelected: step.id === selectedNodeId,
        onDelete: onStepDelete,
        status: stepStatuses[step.id] || 'pending',
      },
      selected: step.id === selectedNodeId,
    }));
  }, [steps, positions, isEditing, selectedNodeId, onStepDelete, stepStatuses]);

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    const stepIds = new Set(steps.map(s => s.id));
    steps.forEach(step => {
      (step.nextSteps ?? []).forEach((nextId, index) => {
        // Only create edge if target step exists
        if (!stepIds.has(nextId)) return;
        edges.push({
          id: `${step.id}-${nextId}`,
          source: step.id,
          target: nextId,
          label: index > 0 ? `branch ${index}` : undefined,
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: '#3b82f6',
            strokeWidth: 2,
          },
          markerEnd: {
            type: 'arrowclosed',
            color: '#3b82f6',
          },
          labelStyle: {
            fill: '#3b82f6',
            fontSize: 12,
          },
        });
      });
    });
    return edges;
  }, [steps]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes/edges when steps change externally
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onInit = useCallback((reactFlowInstance: ReactFlowInstance) => {
    reactFlowInstance.fitView({ padding: 0.2 });
  }, []);

  // Handle node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    onNodeSelect?.(node.id);
  }, [onNodeSelect]);

  const onPaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  // Handle connections (drag to connect nodes)
  const onConnect = useCallback((connection: Connection) => {
    if (!isEditing || !connection.source || !connection.target) return;

    // Prevent duplicate connections
    const exists = edges.some(e =>
      e.source === connection.source && e.target === connection.target
    );
    if (exists) return;

    // Update steps with new connection
    const updatedSteps = steps.map(step => {
      if (step.id === connection.source) {
        return { ...step, nextSteps: [...(step.nextSteps ?? []), connection.target!] };
      }
      return step;
    });

    onStepsChange?.(updatedSteps);
  }, [isEditing, edges, steps, onStepsChange]);

  // Handle edge deletion
  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    if (!isEditing) return;

    const updatedSteps = steps.map(step => {
      const hasDeletedEdge = deletedEdges.some(e => e.source === step.id);
      if (hasDeletedEdge) {
        return {
          ...step,
          nextSteps: (step.nextSteps ?? []).filter(id =>
            !deletedEdges.some(e => e.source === step.id && e.target === id)
          ),
        };
      }
      return step;
    });

    onStepsChange?.(updatedSteps);
  }, [isEditing, steps, onStepsChange]);

  // Handle drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    if (!isEditing) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, [isEditing]);

  const onDrop = useCallback((event: React.DragEvent) => {
    if (!isEditing || !onStepAdd) return;
    event.preventDefault();

    const data = event.dataTransfer.getData('application/json');
    if (!data) return;

    try {
      const { type, stepType } = JSON.parse(data);
      if (type !== 'step-palette-item' || !stepType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Create new step with unique ID
      const newStep: HandStep = {
        id: `${stepType}-${Date.now()}`,
        order: 0,
        title: `New ${stepType}`,
        description: '',
        tool: stepType,
        input: {},
        output: {},
        nextSteps: [],
      };

      onStepAdd(newStep, position);
    } catch {
      // Invalid drop data, ignore
    }
  }, [isEditing, onStepAdd, screenToFlowPosition]);

  if (steps.length === 0) {
    return (
      <div
        ref={reactFlowWrapper}
        onDragOver={onDragOver}
        onDrop={onDrop}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#666',
          border: isEditing ? '2px dashed #ddd' : undefined,
          borderRadius: isEditing ? '8px' : undefined,
        }}
      >
        {isEditing ? 'Drag step types here to build your flow' : 'No steps defined for this Hand'}
      </div>
    );
  }

  return (
    <div
      ref={reactFlowWrapper}
      className="flow-canvas-wrapper"
      style={{
        height: '100%',
        width: '100%',
        backgroundColor: isFullscreen ? '#fafafa' : undefined,
      }}
    >
      {/* CSS for fullscreen mode */}
      <style>{`
        .flow-canvas-wrapper:fullscreen {
          width: 100vw !important;
          height: 100vh !important;
          background: #fafafa !important;
        }
        .flow-canvas-wrapper:-webkit-full-screen {
          width: 100vw !important;
          height: 100vh !important;
          background: #fafafa !important;
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        onInit={onInit}
        fitView
        attributionPosition="bottom-right"
        nodesDraggable={isEditing}
        nodesConnectable={isEditing}
        elementsSelectable={isEditing || !readOnly}
        deleteKeyCode={isEditing ? 'Delete' : null}
      >
        <Background color="#ddd" gap={16} />
        <Controls />
        {/* Custom Fullscreen Button */}
        <div style={{
          position: 'absolute',
          left: 10,
          bottom: 10,
          zIndex: 100,
        }}>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? '退出全屏' : '全屏显示'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 4,
              border: '1px solid #bbb',
              background: '#fefefe',
              cursor: 'pointer',
              padding: 0,
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fefefe';
            }}
          >
            {isFullscreen ? (
              <Minimize2 size={14} color="#333" />
            ) : (
              <Maximize2 size={14} color="#333" />
            )}
          </button>
        </div>
      </ReactFlow>
    </div>
  );
};

// Wrapper component that provides ReactFlowProvider
export const FlowCanvas: React.FC<FlowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
};

export default FlowCanvas;
