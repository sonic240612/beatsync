'use client';
import { useGame, type ToastMessage } from '@/lib/game';

export function ToastContainer() {
  const { toasts, removeToast } = useGame();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2.5 pointer-events-none w-full max-w-md px-4"
    >
      {toasts.map((toast: ToastMessage) => {
        let styleClasses = 'border-slate-700/60 bg-slate-900/95 text-slate-200';
        let icon = 'ℹ️';

        if (toast.type === 'error') {
          styleClasses = 'border-rose-500/60 bg-slate-950/95 text-rose-300 shadow-rose-950/50';
          icon = '⚠️';
        } else if (toast.type === 'warning') {
          styleClasses = 'border-amber-400/60 bg-slate-950/95 text-amber-300 shadow-amber-950/50';
          icon = '⚠️';
        } else if (toast.type === 'success') {
          styleClasses = 'border-emerald-400/60 bg-slate-950/95 text-emerald-300 shadow-emerald-950/50';
          icon = '✅';
        } else if (toast.type === 'title') {
          styleClasses = 'border-emerald-400/60 bg-slate-950/95 text-emerald-300 shadow-emerald-950/50';
          icon = '🎵';
        } else if (toast.type === 'artist') {
          styleClasses = 'border-cyan-400/60 bg-slate-950/95 text-cyan-300 shadow-cyan-950/50';
          icon = '🎤';
        }

        return (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto cursor-pointer w-full rounded-2xl border px-4 py-3 text-center text-xs sm:text-sm font-bold shadow-2xl backdrop-blur-2xl transition-all hover:scale-[1.02] active:scale-95 animate-in fade-in slide-in-from-top-4 duration-200 flex items-center justify-between gap-3 ${styleClasses}`}
          >
            <div className="flex items-center gap-2.5 min-w-0 text-left">
              <span className="text-base shrink-0">{icon}</span>
              <span className="break-words leading-snug">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded-md hover:bg-white/10 shrink-0"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
