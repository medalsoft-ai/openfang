import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { StepNode } from './StepNode';
import type { HandStep } from '../../api/types';

const nodeTypes: NodeTypes = {
  stepNode: StepNode,
};

interface FlowCanvasProps {
  steps: HandStep[];
  readOnly?: boolean;
}

// Simple layout algorithm - positions nodes in a tree structure
function calculateLayout(steps: HandStep[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const stepMap = new Map(steps.map(s => [s.id, s]));

  // Find root nodes (not targeted by any other step)
  const allTargets = new Set(steps.flatMap(s => s.nextSteps));
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
    step.nextSteps.forEach((childId, index) => {
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

export const FlowCanvas: React.FC<FlowCanvasProps> = ({ steps, readOnly = true }) => {
  const positions = useMemo(() => calculateLayout(steps), [steps]);

  const initialNodes: Node[] = useMemo(() => {
    return steps.map(step => ({
      id: step.id,
      type: 'stepNode',
      position: positions.get(step.id) || { x: 0, y: 0 },
      data: { step },
    }));
  }, [steps, positions]);

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    steps.forEach(step => {
      step.nextSteps.forEach((nextId, index) => {
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

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onInit = useCallback((reactFlowInstance: any) => {
    reactFlowInstance.fitView({ padding: 0.2 });
  }, []);

  if (steps.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        color: '#666',
      }}>
        No steps defined for this Hand
      </div>
    );
  }

  return (
    <div style={{ height: '500px', width: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        nodeTypes={nodeTypes}
        onInit={onInit}
        fitView
        attributionPosition="bottom-right"
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
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

export default FlowCanvas;
