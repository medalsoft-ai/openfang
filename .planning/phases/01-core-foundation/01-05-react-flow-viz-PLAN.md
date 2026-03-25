---
phase: 01
core-foundation: true
name: Implement React Flow Visualization
description: Render Hand steps as React Flow diagram in Hands page
wave: 4
task_count: 1
autonomous: true
gap_closure: false
requirements:
  - HAND-STEP-01
  - UI-01
---

# Plan 01-05: Implement React Flow Visualization

## Objective
Add a Flow tab to the Hand detail view that renders steps as a React Flow diagram.

## Success Criteria
- Hand detail page has a "Flow" tab
- Flow tab renders React Flow diagram with steps
- Different step types have different colors/icons
- Diagram is read-only (no editing in this phase)
- Layout auto-calculates node positions

## Files to Modify
- `crates/openfang-webui/src/components/flow/StepNode.tsx` (new)
- `crates/openfang-webui/src/components/flow/FlowCanvas.tsx` (new)
- `crates/openfang-webui/src/pages/Hands.tsx` (modify - add Flow tab)

## Task 1: Create StepNode Component

Create `crates/openfang-webui/src/components/flow/StepNode.tsx`:

```tsx
import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { HandStep, StepTypeVariant } from '../../api/types';

interface StepNodeData {
  step: HandStep;
}

const stepTypeConfig: Record<StepTypeVariant, { color: string; icon: string; label: string }> = {
  'execute-tool': { color: '#3b82f6', icon: '🔧', label: 'Tool' },
  'send-message': { color: '#22c55e', icon: '💬', label: 'Message' },
  'wait-for-input': { color: '#eab308', icon: '⏸️', label: 'Wait' },
  'condition': { color: '#a855f7', icon: '🔀', label: 'Branch' },
  'loop': { color: '#f97316', icon: '🔄', label: 'Loop' },
  'sub-hand': { color: '#ec4899', icon: '🔌', label: 'Sub-Hand' },
};

export const StepNode: React.FC<NodeProps<StepNodeData>> = ({ data }) => {
  const { step } = data;
  const config = stepTypeConfig[step.type];

  return (
    <div
      className="step-node"
      style={{
        backgroundColor: config.color,
        borderRadius: '8px',
        padding: '10px 14px',
        minWidth: '140px',
        color: 'white',
        fontSize: '13px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        border: '2px solid rgba(255,255,255,0.3)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: config.color }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '16px' }}>{config.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>{step.name}</div>
          <div style={{ fontSize: '11px', opacity: 0.9 }}>{config.label}</div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: config.color }} />
    </div>
  );
};

export default StepNode;
```

## Task 2: Create FlowCanvas Component

Create `crates/openfang-webui/src/components/flow/FlowCanvas.tsx`:

```tsx
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
```

## Task 3: Add Flow Tab to Hands Page

Modify `crates/openfang-webui/src/pages/Hands.tsx`:

1. Add import:
```tsx
import { FlowCanvas } from '../components/flow/FlowCanvas';
import { getHandSteps } from '../api';
import type { HandStep } from '../api/types';
```

2. Add state for steps and active tab:
```tsx
const [activeTab, setActiveTab] = useState<'details' | 'flow'>('details');
const [steps, setSteps] = useState<HandStep[]>([]);
const [stepsLoading, setStepsLoading] = useState(false);
```

3. Add effect to fetch steps when Hand selected:
```tsx
useEffect(() => {
  if (selectedHand) {
    setStepsLoading(true);
    getHandSteps(selectedHand.id)
      .then(setSteps)
      .catch(err => {
        console.error('Failed to load steps:', err);
        setSteps([]);
      })
      .finally(() => setStepsLoading(false));
  }
}, [selectedHand]);
```

4. Add tab buttons and Flow tab content:
```tsx
// In the Hand detail view, add tab buttons:
<div className="hand-tabs">
  <button
    className={activeTab === 'details' ? 'active' : ''}
    onClick={() => setActiveTab('details')}
  >
    Details
  </button>
  <button
    className={activeTab === 'flow' ? 'active' : ''}
    onClick={() => setActiveTab('flow')}
  >
    Flow
  </button>
</div>

// Tab content:
{activeTab === 'details' && (
  // existing detail content
)}
{activeTab === 'flow' && (
  <div className="flow-tab">
    {stepsLoading ? (
      <div className="loading">Loading flow...</div>
    ) : (
      <FlowCanvas steps={steps} readOnly />
    )}
  </div>
)}
```

5. Add CSS for tabs:
```css
.hand-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.hand-tabs button {
  padding: 8px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.hand-tabs button.active {
  border-bottom-color: #3b82f6;
  color: #3b82f6;
  font-weight: 500;
}
```

## Node Type Colors

| Type | Color | Hex |
|------|-------|-----|
| execute-tool | Blue | #3b82f6 |
| send-message | Green | #22c55e |
| wait-for-input | Yellow | #eab308 |
| condition | Purple | #a855f7 |
| loop | Orange | #f97316 |
| sub-hand | Pink | #ec4899 |

## Verification

```bash
cd crates/openfang-webui
pnpm type-check
pnpm build
```

Live test:
1. Open Hands page
2. Select a Hand with steps
3. Click "Flow" tab
4. Verify React Flow diagram renders
5. Verify colors match step types

## Dependencies
- 01-02 (TypeScript types)
- 01-03 (API endpoints)

## Notes
- React Flow is already installed (@xyflow/react)
- Layout algorithm is simple - can be improved with dagre or elkjs later
- Read-only mode for Phase 1, editing comes in Phase 2
