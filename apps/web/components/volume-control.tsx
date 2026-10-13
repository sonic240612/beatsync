'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/lib/game';
import { LiquidSegmentGroup } from './liquid-segment-group';

interface VolumeControlProps {
  variant?: 'popover' | 'inline';
  className?: string;
  showPresets?: boolean;
}

export function VolumeControl({
  variant = 'popover',
  className = '',
  showPresets = true,
}: VolumeControlProps) {
  const { volume, setVolume } = useGame();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const percent = Math.round(volume * 100);

  const toggleMute = () => {
    if (volume === 0) {
      setVolume(0.05); // Restore default 5%
    } else {
      setVolume(0);
    }
  };

  const renderIcon = () => {
    if (volume === 0) {
      return (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      );
    }
    if (volume < 0.5) {
      return (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      );
    }
    return (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      </svg>
    );
  };

  const PRESETS = [
    { label: '음소거', val: 0, title: '음소거 (0%)' },
    { label: '5%', val: 0.05, title: '기본 권장 음량 (5%)' },
    { label: '10%', val: 0.1, title: '10%' },
    { label: '20%', val: 0.2, title: '20%' },
    { label: '50%', val: 0.5, title: '50%' },
    { label: '80%', val: 0.8, title: '80%' },
  ];

  if (variant === 'inline') {
    return (
      <div className={`space-y-3.5 ${className}`}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase flex items-center gap-2">
            <span>🔊 노래 재생 음량</span>
            <span className="text-emerald-400 font-mono text-xs font-bold">({percent}%)</span>
          </label>
          <span className="text-[11px] text-slate-400">기본 5%로 부드럽게 재생됩니다</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            data-liquid-surface
            onClick={toggleMute}
            aria-label={volume === 0 ? '음소거 해제' : '음소거'}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:text-white hover:border-emerald-400/40 transition-colors shrink-0 shadow-sm"
          >
            {renderIcon()}
          </button>

          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min={0}
              max={100}
              value={percent}
              onChange={e => setVolume(Number(e.target.value) / 100)}
              className="w-full h-2 rounded-lg bg-white/10 accent-emerald-400 cursor-pointer shadow-inner"
            />
          </div>

          <span className="font-mono text-xs font-bold w-10 text-right text-emerald-400">
            {percent}%
          </span>
        </div>

        {showPresets && (
          <LiquidSegmentGroup
            value={PRESETS.find(p => Math.round(p.val * 100) === percent)?.val ?? -1}
            onChange={val => {
              if (val >= 0) setVolume(val);
            }}
            options={PRESETS.map(p => ({
              value: p.val,
              label: p.label,
              title: p.title,
            }))}
            accent="emerald"
            className="w-full volume-presets-control"
          />
        )}
      </div>
    );
  }

  // Detached Popover/Modal Variant:
  // Rendered directly into document.body via Portal to prevent any parent container stretching or layout distortion
  return (
    <div className={`inline-block ${className}`}>
      {/* Trigger Button in Header */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`음량 설정 (현재 ${percent}%)`}
        title={`음량 설정 (${percent}%)`}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
          open
            ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300 shadow-sm'
            : 'border-slate-700/60 bg-slate-800/40 text-slate-300 hover:text-white hover:border-slate-600'
        }`}
      >
        {renderIcon()}
        <span className="font-mono text-[11px]">{percent}%</span>
      </button>

      {/* Detached Floating Popup Window via Portal */}
      {mounted &&
        open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="노래 재생 음량 설정"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={e => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              data-liquid-surface
              className="liquid-glass-card max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 relative"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 shrink-0">
                    {renderIcon()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">노래 재생 음량 설정</h3>
                    <p className="text-[11px] text-slate-400">퀴즈 및 미리듣기 사운드 조절</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-sm font-bold"
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>

              {/* Slider & Value */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">현재 음량</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">{percent}%</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleMute}
                    title={volume === 0 ? '음소거 해제' : '음소거'}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:text-white hover:border-emerald-400/40 transition-colors shrink-0 shadow-sm"
                  >
                    {renderIcon()}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={percent}
                    onChange={e => setVolume(Number(e.target.value) / 100)}
                    className="w-full h-2 rounded-lg bg-white/10 accent-emerald-400 cursor-pointer shadow-inner"
                  />
                </div>
              </div>

              {/* Preset Buttons */}
              {showPresets && (
                <div className="space-y-1.5 pt-3 border-t border-white/10">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    빠른 음량 프리셋
                  </span>
                  <LiquidSegmentGroup
                    value={PRESETS.find(p => Math.round(p.val * 100) === percent)?.val ?? -1}
                    onChange={val => {
                      if (val >= 0) setVolume(val);
                    }}
                    options={PRESETS.map(p => ({
                      value: p.val,
                      label: p.label,
                      title: p.title,
                    }))}
                    accent="emerald"
                    className="w-full volume-presets-control"
                  />
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <p className="text-[11px] text-slate-400">
                  기본값은 5%이며 브라우저에 저장됩니다.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="liquid-btn-primary px-4 py-1.5 text-xs font-bold"
                >
                  확인
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
