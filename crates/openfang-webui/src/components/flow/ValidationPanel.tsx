import React from 'react';
import { AlertCircle, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { ValidationError, ValidationResult } from '@/utils/stepValidation';

interface ValidationPanelProps {
  validation: ValidationResult;
  onErrorClick?: (stepId: string) => void;
  className?: string;
}

const errorTypeConfig: Record<
  ValidationError['type'],
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  orphan: {
    icon: <AlertCircle className="w-4 h-4" />,
    color: '#f59e0b',
    bgColor: '#fffbeb',
  },
  cycle: {
    icon: <XCircle className="w-4 h-4" />,
    color: '#dc2626',
    bgColor: '#fef2f2',
  },
  'duplicate-id': {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: '#ea580c',
    bgColor: '#fff7ed',
  },
  'missing-start': {
    icon: <AlertCircle className="w-4 h-4" />,
    color: '#dc2626',
    bgColor: '#fef2f2',
  },
  'invalid-next': {
    icon: <AlertCircle className="w-4 h-4" />,
    color: '#f59e0b',
    bgColor: '#fffbeb',
  },
};

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  validation,
  onErrorClick,
  className,
}) => {
  const { isValid, errors } = validation;

  return (
    <div
      className={`validation-panel ${className || ''}`}
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
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          {isValid ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
          <h3
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              color: isValid ? '#16a34a' : '#dc2626',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {isValid ? 'All Valid' : `${errors.length} Issue${errors.length > 1 ? 's' : ''}`}
          </h3>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: '#6b7280',
          }}
        >
          {isValid
            ? 'Your SOP structure looks good'
            : 'Fix these issues before saving'}
        </p>
      </div>

      {/* Error List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
        }}
      >
        {errors.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '13px',
            }}
          >
            <CheckCircle
              className="w-12 h-12 mx-auto mb-3"
              style={{ color: '#22c55e', opacity: 0.5 }}
            />
            <p>No validation issues found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {errors.map((error, index) => {
              const config = errorTypeConfig[error.type];
              return (
                <button
                  key={`${error.stepId}-${index}`}
                  onClick={() => onErrorClick?.(error.stepId)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '12px',
                    backgroundColor: config.bgColor,
                    border: `1px solid ${config.color}20`,
                    borderRadius: '8px',
                    cursor: onErrorClick ? 'pointer' : 'default',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (onErrorClick) {
                      e.currentTarget.style.borderColor = config.color;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${config.color}20`;
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: config.color,
                    }}
                  >
                    {config.icon}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {error.type.replace('-', ' ')}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#374151',
                      lineHeight: 1.5,
                    }}
                  >
                    {error.message}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      fontFamily: 'monospace',
                    }}
                  >
                    Step: {error.stepId}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
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
        {isValid ? 'Ready to save' : 'Click an issue to navigate to the step'}
      </div>
    </div>
  );
};

export default ValidationPanel;
