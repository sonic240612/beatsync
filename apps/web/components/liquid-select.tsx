'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface LiquidSelectOption<T extends string = string> {
  id: T;
  label: string;
  desc?: string;
  badge?: string;
}

interface LiquidSelectProps<T extends string = string> {
  value: T;
  onChange: (val: T) => void;
  options: readonly LiquidSelectOption<T>[] | LiquidSelectOption<T>[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function LiquidSelect<T extends string = string>({
  value,
  onChange,
  options,
  disabled = false,
  className = '',
  placeholder = '선택해주세요',
}: LiquidSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    placement: 'top' | 'bottom';
  }>({ top: 0, left: 0, width: 0, placement: 'bottom' });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < 260 && rect.top > 260;

    setCoords({
      top: showAbove ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      placement: showAbove ? 'top' : 'bottom',
    });
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!open) {
      updateCoords();
    }
    setOpen(prev => !prev);
  };

  // Update floating popover coordinates whenever opened, resized, or scrolled
  useEffect(() => {
    if (!open || !triggerRef.current) return;

    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`liquid-input flex items-center justify-between w-full text-left py-2.5 px-3.5 sm:py-3 sm:px-4 cursor-pointer transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${open ? 'border-emerald-400 ring-2 ring-emerald-400/20' : ''}`}
      >
        <div className="flex flex-col min-w-0 pr-2">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-xs sm:text-sm truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            {selectedOption?.badge && (
              <span className="rounded-md bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                {selectedOption.badge}
              </span>
            )}
          </div>
          {selectedOption?.desc && (
            <span className="text-[11px] text-slate-400 truncate mt-0.5 hidden sm:block">
              {selectedOption.desc}
            </span>
          )}
        </div>

        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180 text-emerald-400' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Detached Floating Dropdown rendered into document.body via Portal:
          Completely decoupled from the parent card DOM flow so the card/window NEVER stretches or grows.
          Floats cleanly on top of the card surface with liquid glass aesthetics. */}
      {mounted &&
        open &&
        coords.width > 0 &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              left: `${coords.left}px`,
              top: coords.placement === 'bottom' ? `${coords.top}px` : undefined,
              bottom: coords.placement === 'top' ? `${window.innerHeight - coords.top}px` : undefined,
              width: `${coords.width}px`,
              zIndex: 9999,
            }}
            className="liquid-glass-dropdown shadow-2xl border border-slate-700/80 overflow-hidden rounded-2xl"
          >
            <div
              role="listbox"
              className="max-h-64 overflow-y-auto p-1.5 space-y-1 overscroll-contain scrollbar-thin"
            >
              {options.map(opt => {
                const isSelected = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                    }}
                    className={`w-full rounded-xl p-2.5 sm:p-3 text-left transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border border-emerald-400/50 bg-emerald-400/20 text-emerald-200 shadow-sm'
                        : 'border border-transparent text-slate-300 hover:bg-slate-700/40 hover:text-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold truncate">
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span className="rounded-md bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.desc && (
                        <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                          {opt.desc}
                        </p>
                      )}
                    </div>

                    {isSelected && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-slate-950 text-xs font-black shadow-sm">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
