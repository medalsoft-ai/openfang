import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { StepTypeVariant } from '../../api/types';

interface LocalHandStep {
  id: string;
  order: number;
  title: string;
  description?: string;
  tool?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  nextSteps?: string[];
}

interface StepNodeData {
  step: LocalHandStep;
  isSelected?: boolean;
  onDelete?: (stepId: string) => void;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'waiting';
}

const stepTypeConfig: Partial<Record<StepTypeVariant, { color: string; icon: string; label: string }>> = {
  'execute-tool': { color: '#3b82f6', icon: '🔧', label: 'Tool' },
  'send-message': { color: '#22c55e', icon: '💬', label: 'Message' },
  'wait-for-input': { color: '#eab308', icon: '⏸️', label: 'Wait' },
  'condition': { color: '#a855f7', icon: '🔀', label: 'Branch' },
  'loop': { color: '#f97316', icon: '🔄', label: 'Loop' },
  'sub-hand': { color: '#ec4899', icon: '🔌', label: 'Sub-Hand' },
};

const defaultConfig = { color: '#6b7280', icon: '📦', label: 'Unknown' };

// Status indicator colors (overlay on the node)
const statusIndicatorColors: Record<'pending' | 'running' | 'completed' | 'failed' | 'waiting', string> = {
  pending: 'rgba(156, 163, 175, 0.8)',
  running: 'rgba(59, 130, 246, 0.9)',
  completed: 'rgba(34, 197, 94, 0.9)',
  failed: 'rgba(239, 68, 68, 0.9)',
  waiting: 'rgba(234, 179, 8, 0.9)',
};

export const StepNode: React.FC<{ data: StepNodeData; selected?: boolean }> = ({ data, selected }) => {
  const { step, onDelete, status = 'pending' } = data;
  const config = stepTypeConfig[step.tool as StepTypeVariant] ?? defaultConfig;
  const indicatorColor = statusIndicatorColors[status];

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
        boxShadow: selected
          ? '0 0 0 3px white, 0 0 0 5px ' + config.color + ', 0 4px 8px rgba(0,0,0,0.2)'
          : '0 2px 4px rgba(0,0,0,0.15)',
        border: '2px solid rgba(255,255,255,0.3)',
        position: 'relative',
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* Status indicator dot */}
      <div
        className={status === 'running' ? 'animate-pulse' : status === 'waiting' ? 'animate-bounce' : ''}
        style={{
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          backgroundColor: indicatorColor,
          border: '2px solid white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
        title={`Status: ${status}`}
      />

      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#fff',
          border: `3px solid ${config.color}`,
          width: '12px',
          height: '12px',
          top: '-6px',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '16px' }}>{config.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>{step.title}</div>
          <div style={{ fontSize: '11px', opacity: 0.9 }}>{config.label}</div>
        </div>
        {selected && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(step.id);
            }}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.9)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: '#dc2626',
              lineHeight: 1,
              padding: 0,
              marginLeft: '4px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.9)';
              e.currentTarget.style.color = '#dc2626';
            }}
            title="Delete step"
          >
            ×
          </button>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#fff',
          border: `3px solid ${config.color}`,
          width: '12px',
          height: '12px',
          bottom: '-6px',
        }}
      />
    </div>
  );
};

export default StepNode;
