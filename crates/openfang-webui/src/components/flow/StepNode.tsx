import React from 'react';
import { Handle, Position } from '@xyflow/react';
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

export const StepNode: React.FC<{ data: StepNodeData }> = ({ data }) => {
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
