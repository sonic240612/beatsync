'use client';

import React, { useState, useEffect } from 'react';

export interface LiquidSegmentOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  title?: string;
}

export interface LiquidSegmentGroupProps<T extends string | number> {
  value: T;
  onChange: (val: T) => void;
  options: LiquidSegmentOption<T>[];
  disabled?: boolean;
  className?: string;
  accent?: 'default' | 'emerald';
  ariaLabel?: string;
}

export function LiquidSegmentGroup<T extends string | number>({
  value,
  onChange,
  options,
  disabled = false,
  className = '',
  accent = 'emerald',
  ariaLabel,
}: LiquidSegmentGroupProps<T>) {
  const [currentVal, setCurrentVal] = useState<T>(value);

  useEffect(() => {
    setCurrentVal(value);
  }, [value]);

  const handleSelect = (nextVal: T) => {
    if (disabled || nextVal === currentVal) return;
    setCurrentVal(nextVal);
    onChange(nextVal);
  };

  return (
    <div
      data-liquid-segment-group
      data-accent={accent}
      role="group"
      aria-label={ariaLabel}
      className={`liquid-segment-group ${className}`}
    >
      <span className="selection-lens" aria-hidden="true" />
      {options.map(option => {
        const isActive = option.value === currentVal;
        return (
          <button
            key={String(option.value)}
            type="button"
            disabled={disabled}
            title={option.title}
            onClick={() => handleSelect(option.value)}
            className={`tab-btn ${isActive ? 'active' : ''}`}
            aria-pressed={isActive}
            data-value={String(option.value)}
          >
            {option.icon && <span className="tab-icon mr-1.5">{option.icon}</span>}
            <span className="tab-label">{option.label}</span>
            {option.badge && <span className="tab-badge ml-1.5">{option.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
