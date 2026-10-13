'use client';
import { useEffect } from 'react';

export function GlassEffectProvider() {
  useEffect(() => {
    let ticking = false;

    // Dynamic Border Rim Light: Rotates conic-gradient light angle towards mouse cursor
    const handlePointerMove = (e: PointerEvent) => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        const target = (e.target as HTMLElement)?.closest?.('[data-liquid-surface]') as HTMLElement | null;
        if (!target) return;

        const rect = target.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        // Relative cursor position from center of card
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        // Angle pointing from card center directly to cursor (0deg at 12 o'clock)
        const angle = (Math.atan2(y - 0.5, x - 0.5) * 180) / Math.PI + 90;
        target.style.setProperty('--light-angle', `${angle.toFixed(1)}deg`);
      });
    };

    const handlePointerOut = (e: PointerEvent) => {
      const target = (e.target as HTMLElement)?.closest?.('[data-liquid-surface]') as HTMLElement | null;
      if (!target) return;
      // Reset smoothly to ambient light angle (135deg top-left) on leave
      target.style.setProperty('--light-angle', '135deg');
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerout', handlePointerOut, { passive: true });

    // Global Audio Context unlocker on first user gesture
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
          const buf = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.start(0);
        }
      } catch {}
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio, { once: true, passive: true });
    window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
    window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerout', handlePointerOut);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  return null;
}
