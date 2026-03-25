import React from 'react';
import { StepPaletteItem } from './StepPaletteItem';
import type { StepTypeVariant } from '../../api/types';

interface StepTypeConfig {
  type: StepTypeVariant;
  icon: string;
  label: string;
  color: string;
  description: string;
}

const stepTypes: StepTypeConfig[] = [
  {
    type: 'execute-tool',
    icon: '🔧',
    label: 'Tool',
    color: '#3b82f6',
    description: 'Execute a tool or function',
  },
  {
    type: 'send-message',
    icon: '💬',
    label: 'Message',
    color: '#22c55e',
    description: 'Send a message to user or agent',
  },
  {
    type: 'wait-for-input',
    icon: '⏸️',
    label: 'Wait',
    color: '#eab308',
    description: 'Pause and wait for user input',
  },
  {
    type: 'condition',
    icon: '🔀',
    label: 'Branch',
    color: '#a855f7',
    description: 'Conditional branching logic',
  },
  {
    type: 'loop',
    icon: '🔄',
    label: 'Loop',
    color: '#f97316',
    description: 'Iterate over a collection',
  },
  {
    type: 'sub-hand',
    icon: '🔌',
    label: 'Sub-Hand',
    color: '#ec4899',
    description: 'Call another Hand as subroutine',
  },
];

interface StepPaletteProps {
  className?: string;
}

export const StepPalette: React.FC<StepPaletteProps> = ({ className }) => {
  return (
    <div
      className={`step-palette ${className || ''}`}
      style={{
        width: '240px',
        height: '100%',
        backgroundColor: '#f9fafb',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: 'white',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: '#111827',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Step Types
        </h3>
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '12px',
            color: '#6b7280',
          }}
        >
          Drag to add steps
        </p>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
        }}
      >
        {stepTypes.map((stepType) => (
          <StepPaletteItem
            key={stepType.type}
            type={stepType.type}
            icon={stepType.icon}
            label={stepType.label}
            color={stepType.color}
          />
        ))}
      </div>

      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: 'white',
          fontSize: '11px',
          color: '#9ca3af',
          textAlign: 'center',
        }}
      >
        Drop on canvas to add
      </div>
    </div>
  );
};

export default StepPalette;
