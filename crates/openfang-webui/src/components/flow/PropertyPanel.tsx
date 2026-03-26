import React, { useState, useRef, useCallback } from 'react';
import type { LocalHandStep } from '../../utils/stepAdapter';
import type {
  StepTypeVariant,
  ExecuteToolConfig,
  SendMessageConfig,
  WaitForInputConfig,
  ConditionConfig,
  LoopConfig,
  SubHandConfig,
} from '../../api/types';
import { VariableAutocomplete } from './VariableAutocomplete';

interface PropertyPanelProps {
  step: LocalHandStep | null;
  allSteps: LocalHandStep[];
  onUpdate: (stepId: string, updates: Partial<LocalHandStep>) => void;
}

const stepTypeConfig: Record<StepTypeVariant, { color: string; icon: string; label: string }> = {
  'execute-tool': { color: '#3b82f6', icon: '🔧', label: 'Tool' },
  'send-message': { color: '#22c55e', icon: '💬', label: 'Message' },
  'wait-for-input': { color: '#eab308', icon: '⏸️', label: 'Wait' },
  'condition': { color: '#a855f7', icon: '🔀', label: 'Branch' },
  'loop': { color: '#f97316', icon: '🔄', label: 'Loop' },
  'sub-hand': { color: '#ec4899', icon: '🔌', label: 'Sub-Hand' },
};

// Input component with variable autocomplete support
interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  steps: LocalHandStep[];
  currentStepId: string;
  multiline?: boolean;
}

const VariableInput: React.FC<VariableInputProps> = ({
  value,
  onChange,
  placeholder,
  steps,
  currentStepId,
  multiline = false,
}) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Check if user just typed {{
    const cursorPosition = e.target.selectionStart || 0;
    const lastTwoChars = newValue.slice(cursorPosition - 2, cursorPosition);

    if (lastTwoChars === '{{') {
      // Calculate dropdown position
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setAutocompletePosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        });
      }
      setShowAutocomplete(true);
    }
  };

  const handleSelectVariable = useCallback((variable: string) => {
    // Replace {{ with the selected variable
    const newValue = value.replace(/\{\{$/, variable);
    onChange(newValue);
  }, [value, onChange]);

  const commonStyles = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  return (
    <>
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          rows={4}
          style={{
            ...commonStyles,
            resize: 'vertical',
            minHeight: '80px',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          style={commonStyles}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      )}
      {showAutocomplete && (
        <VariableAutocomplete
          steps={steps}
          currentStepId={currentStepId}
          onSelect={handleSelectVariable}
          onClose={() => setShowAutocomplete(false)}
          position={autocompletePosition}
        />
      )}
    </>
  );
};

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  step,
  allSteps,
  onUpdate,
}) => {
  if (!step) {
    return (
      <div
        style={{
          width: '280px',
          height: '100%',
          backgroundColor: '#f9fafb',
          borderLeft: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '32px',
            marginBottom: '12px',
            opacity: 0.3,
          }}
        >
          📝
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#6b7280',
          }}
        >
          Select a step to edit properties
        </p>
      </div>
    );
  }

  const config = stepTypeConfig[(step.tool as StepTypeVariant) || 'execute-tool'];

  const handleNameChange = (title: string) => {
    onUpdate(step.id, { title });
  };

  const handleConfigChange = (configUpdates: Partial<typeof step.input>) => {
    onUpdate(step.id, {
      input: { ...step.input, ...configUpdates },
    });
  };

  const renderConfigFields = () => {
    switch (step.tool) {
      case 'execute-tool': {
        const cfg = step.input as ExecuteToolConfig;
        return (
          <>
            <Field label="Tool Name">
              <input
                type="text"
                value={cfg.toolName || ''}
                onChange={(e) => handleConfigChange({ toolName: e.target.value })}
                placeholder="e.g., file_read, web_search"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </Field>
            <Field label="Input Arguments (JSON)">
              <textarea
                value={cfg.input ? JSON.stringify(cfg.input, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const parsed = e.target.value ? JSON.parse(e.target.value) : {};
                    handleConfigChange({ input: parsed });
                  } catch {
                    // Allow invalid JSON while typing
                  }
                }}
                placeholder='{"path": "/tmp/file.txt"}'
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </Field>
          </>
        );
      }

      case 'send-message': {
        const cfg = step.input as SendMessageConfig;
        return (
          <>
            <Field label="Message Content">
              <VariableInput
                value={cfg.content || ''}
                onChange={(value) => handleConfigChange({ content: value })}
                placeholder="Enter message or use {{variable}}"
                steps={allSteps}
                currentStepId={step.id}
                multiline
              />
            </Field>
            <Field label="Target Agent (optional)">
              <input
                type="text"
                value={cfg.targetAgent || ''}
                onChange={(e) => handleConfigChange({ targetAgent: e.target.value })}
                placeholder="Agent ID or blank for user"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </Field>
          </>
        );
      }

      case 'wait-for-input': {
        const cfg = step.input as WaitForInputConfig;
        return (
          <>
            <Field label="Prompt">
              <VariableInput
                value={cfg.prompt || ''}
                onChange={(value) => handleConfigChange({ prompt: value })}
                placeholder="Enter prompt for user..."
                steps={allSteps}
                currentStepId={step.id}
                multiline
              />
            </Field>
            <Field label="Timeout (seconds, optional)">
              <input
                type="number"
                value={cfg.timeoutSecs || ''}
                onChange={(e) =>
                  handleConfigChange({
                    timeoutSecs: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                placeholder="300"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </Field>
          </>
        );
      }

      case 'condition': {
        const cfg = step.input as ConditionConfig;
        return (
          <>
            <Field label="Expression">
              <VariableInput
                value={cfg.expression || ''}
                onChange={(value) => handleConfigChange({ expression: value })}
                placeholder="e.g., {{step1.success}} === true"
                steps={allSteps}
                currentStepId={step.id}
              />
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
                Use {'{{'}variable{'}}'} to reference step outputs
              </div>
            </Field>
            <Field label="True Branch (Step ID)">
              <input
                type="text"
                value={cfg.trueBranch || ''}
                onChange={(e) => handleConfigChange({ trueBranch: e.target.value })}
                placeholder="Next step if true"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </Field>
            <Field label="False Branch (Step ID)">
              <input
                type="text"
                value={cfg.falseBranch || ''}
                onChange={(e) => handleConfigChange({ falseBranch: e.target.value })}
                placeholder="Next step if false"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </Field>
          </>
        );
      }

      case 'loop': {
        const cfg = step.input as LoopConfig;
        return (
          <>
            <Field label="Iterator Variable">
              <input
                type="text"
                value={cfg.iterator || ''}
                onChange={(e) => handleConfigChange({ iterator: e.target.value })}
                placeholder="e.g., item, i"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </Field>
            <Field label="Items to Iterate">
              <VariableInput
                value={cfg.items || ''}
                onChange={(value) => handleConfigChange({ items: value })}
                placeholder="e.g., {{step1.result}} or [1,2,3]"
                steps={allSteps}
                currentStepId={step.id}
              />
            </Field>
          </>
        );
      }

      case 'sub-hand': {
        const cfg = step.input as SubHandConfig;
        return (
          <>
            <Field label="Hand ID">
              <input
                type="text"
                value={cfg.handId || ''}
                onChange={(e) => handleConfigChange({ handId: e.target.value })}
                placeholder="ID of Hand to execute"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </Field>
            <Field label="Input Mapping (JSON, optional)">
              <textarea
                value={cfg.inputMapping ? JSON.stringify(cfg.inputMapping, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const parsed = e.target.value ? JSON.parse(e.target.value) : {};
                    handleConfigChange({ inputMapping: parsed });
                  } catch {
                    // Allow invalid JSON while typing
                  }
                }}
                placeholder='{"param": "{{step1.output}}"}'
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </Field>
          </>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        width: '280px',
        height: '100%',
        backgroundColor: '#f9fafb',
        borderLeft: '1px solid #e5e7eb',
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
          Properties
        </h3>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
        }}
      >
        {/* Step Type Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            padding: '8px 12px',
            backgroundColor: `${config.color}15`,
            borderRadius: '6px',
            border: `1px solid ${config.color}30`,
          }}
        >
          <span style={{ fontSize: '16px' }}>{config.icon}</span>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: config.color,
            }}
          >
            {config.label}
          </span>
        </div>

        {/* Step ID (read-only) */}
        <Field label="Step ID">
          <input
            type="text"
            value={step.id}
            readOnly
            style={{
              ...inputStyle,
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              cursor: 'not-allowed',
            }}
          />
        </Field>

        {/* Step Name */}
        <Field label="Name">
          <input
            type="text"
            value={step.title}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Step name"
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </Field>

        {/* Type-specific config fields */}
        <div style={{ marginTop: '20px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px',
            }}
          >
            Configuration
          </div>
          {renderConfigFields()}
        </div>

        {/* Next Steps (read-only, shown for reference) */}
        <div style={{ marginTop: '20px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px',
            }}
          >
            Connections
          </div>
          {(step.nextSteps ?? []).length === 0 ? (
            <div
              style={{
                padding: '12px',
                backgroundColor: '#fef3c7',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#92400e',
              }}
            >
              No outgoing connections. Drag from the bottom handle to connect.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(step.nextSteps ?? []).map((nextId, index) => (
                <div
                  key={nextId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    fontSize: '13px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#9ca3af',
                      fontWeight: 600,
                    }}
                  >
                    {index + 1}
                  </span>
                  <span style={{ color: '#374151' }}>{nextId}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for form fields
interface FieldProps {
  label: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label
      style={{
        display: 'block',
        fontSize: '12px',
        fontWeight: 500,
        color: '#374151',
        marginBottom: '4px',
      }}
    >
      {label}
    </label>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

export default PropertyPanel;
