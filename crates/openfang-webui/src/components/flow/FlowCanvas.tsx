import React, { useMemo, useCallback, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
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

// Simple layout algorithm - positions nodes in a tree structure
function calculateLayout(steps: HandStep[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const stepMap = new Map(steps.map(s => [s.id, s]));

  // Find root nodes (not targeted by any other step)
  const allTargets = new Set(steps.flatMap(s => s.nextSteps ?? []));
  const roots = steps.filter(s => !allTargets.has(s.id));

  const visited = new Set<string>();
  let currentY = 0;

  function layoutNode(stepId: string, depth: number, parentX?: number): number {
    if (visited.has(stepId)) return positions.get(stepId)!.x;
    visited.add(stepId);

    const step = stepMap.get(stepId);
    if (!step) return 0;

    // Calculate horizontal position based on depth and siblings
    const xOffset = depth * 200;
    const x = parentX !== undefined ? parentX : xOffset;

    positions.set(stepId, { x, y: currentY });
    currentY += 100;

    // Layout children
    let childX = x;
    (step.nextSteps ?? []).forEach((childId, index) => {
      if (index > 0) childX += 150;
      layoutNode(childId, depth + 1, childX);
    });

    return x;
  }

  // Layout from each root
  roots.forEach((root, index) => {
    layoutNode(root.id, 0, index * 300);
  });

  // Handle disconnected nodes
  steps.forEach(step => {
    if (!positions.has(step.id)) {
      positions.set(step.id, { x: 0, y: currentY });
      currentY += 100;
    }
  });

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
  const positions = useMemo(() => calculateLayout(steps), [steps]);

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
    steps.forEach(step => {
      (step.nextSteps ?? []).forEach((nextId, index) => {
        edges.push({
          id: `${step.id}-${nextId}`,
          source: step.id,
          target: nextId,
          label: index > 0 ? `branch ${index}` : undefined,
          type: 'smoothstep',
          animated: true,
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
    <div ref={reactFlowWrapper} style={{ height: '100%', width: '100%' }}>
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
        <MiniMap
          nodeStrokeColor={(n) => {
            if (n.type === 'stepNode') return '#3b82f6';
            return '#eee';
          }}
          nodeColor={(n) => {
            if (n.type === 'stepNode') return '#3b82f6';
            return '#fff';
          }}
        />
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
