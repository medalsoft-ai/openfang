import React from 'react';
import type { StepTypeVariant } from '../../api/types';

interface StepPaletteItemProps {
  type: StepTypeVariant;
  icon: string;
  label: string;
  color: string;
}

export const StepPaletteItem: React.FC<StepPaletteItemProps> = ({
  type,
  icon,
  label,
  color,
}) => {
  const handleDragStart = (event: React.DragEvent) => {
    const dragData = JSON.stringify({
      type: 'step-palette-item',
      stepType: type,
    });
    event.dataTransfer.setData('application/json', dragData);
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="step-palette-item"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        marginBottom: '8px',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: `2px solid ${color}30`,
        cursor: 'grab',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.transform = 'translateX(4px)';
        e.currentTarget.style.boxShadow = `0 2px 8px ${color}30`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${color}30`;
        e.currentTarget.style.transform = 'translateX(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      }}
    >
      <span
        style={{
          fontSize: '20px',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${color}15`,
          borderRadius: '6px',
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: '#374151',
        }}
      >
        {label}
      </span>
    </div>
  );
};

export default StepPaletteItem;
