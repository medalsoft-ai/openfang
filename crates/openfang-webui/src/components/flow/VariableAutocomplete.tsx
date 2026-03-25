import React, { useMemo } from 'react';
import type { HandStep, StepTypeVariant } from '../../api/types';

interface VariableAutocompleteProps {
  steps: HandStep[];
  currentStepId: string;
  onSelect: (variable: string) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

interface OutputField {
  name: string;
  description: string;
  type: string;
}

// Define output fields for each step type
const outputFieldsByType: Record<StepTypeVariant, OutputField[]> = {
  'execute-tool': [
    { name: 'result', description: 'Tool execution result', type: 'any' },
    { name: 'success', description: 'Whether execution succeeded', type: 'boolean' },
  ],
  'send-message': [
    { name: 'message_id', description: 'ID of sent message', type: 'string' },
    { name: 'content', description: 'Message content sent', type: 'string' },
  ],
  'wait-for-input': [
    { name: 'input', description: 'User input value', type: 'string' },
    { name: 'timeout', description: 'Whether input timed out', type: 'boolean' },
  ],
  'condition': [
    { name: 'result', description: 'Condition evaluation result', type: 'boolean' },
    { name: 'branch', description: 'Branch taken (true/false)', type: 'string' },
  ],
  'loop': [
    { name: 'iterations', description: 'Number of iterations completed', type: 'number' },
    { name: 'results', description: 'Array of iteration results', type: 'array' },
  ],
  'sub-hand': [
    { name: 'output', description: 'Sub-hand execution output', type: 'any' },
    { name: 'status', description: 'Completion status', type: 'string' },
  ],
};

export const VariableAutocomplete: React.FC<VariableAutocompleteProps> = ({
  steps,
  currentStepId,
  onSelect,
  onClose,
  position,
}) => {
  // Filter out the current step to avoid self-references
  const availableSteps = useMemo(() => {
    return steps.filter((step) => step.id !== currentStepId);
  }, [steps, currentStepId]);

  const handleSelect = (stepId: string, field: string) => {
    onSelect(`{{${stepId}.${field}}}`);
    onClose();
  };

  // Default position if not provided
  const dropdownPosition = position || { top: 0, left: 0 };

  return (
    <>
      {/* Backdrop to close on click outside */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
        }}
        onClick={onClose}
      />

      {/* Dropdown */}
      <div
        style={{
          position: 'absolute',
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: '280px',
          maxHeight: '320px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid #e5e7eb',
          zIndex: 1000,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            fontSize: '12px',
            fontWeight: 600,
            color: '#374151',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Available Variables</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 6px',
              fontSize: '14px',
              color: '#9ca3af',
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0',
          }}
        >
          {availableSteps.length === 0 ? (
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: '13px',
              }}
            >
              No available steps
            </div>
          ) : (
            availableSteps.map((step) => {
              const outputs = outputFieldsByType[step.type] || [];
              return (
                <div key={step.id} style={{ marginBottom: '8px' }}>
                  <div
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#6b7280',
                      backgroundColor: '#f3f4f6',
                    }}
                  >
                    {step.name}
                    <span
                      style={{
                        marginLeft: '6px',
                        fontWeight: 400,
                        color: '#9ca3af',
                        fontFamily: 'monospace',
                      }}
                    >
                      ({step.id})
                    </span>
                  </div>
                  {outputs.map((field) => (
                    <button
                      key={field.name}
                      onClick={() => handleSelect(step.id, field.name)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 12px 8px 24px',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#374151',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#eff6ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>
                        {field.name}
                      </span>
                      <span
                        style={{
                          marginLeft: '8px',
                          fontSize: '11px',
                          color: '#9ca3af',
                        }}
                      >
                        {field.description}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            padding: '8px 12px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '11px',
            color: '#9ca3af',
            backgroundColor: '#f9fafb',
          }}
        >
          Click to insert variable reference
        </div>
      </div>
    </>
  );
};

export default VariableAutocomplete;
