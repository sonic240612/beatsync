'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '@/lib/game';
import { VolumeControl } from '@/components/volume-control';

function useCountdown(endsAt?: number) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!endsAt) {
      setLeft(0);
      return;
    }
    const tick = () => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [endsAt]);
  return left;
}

export default function SpeedMode() {
  const { state, reveal, over, me, answer, skip, volume, toasts } = useGame();
  const audio = useRef<HTMLAudioElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [guess, setGuess] = useState('');
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const round = state?.roundId;
  const endsAt = state?.endsAt;
  const seconds = useCountdown(endsAt);

  const activeReveal = reveal || (state?.phase === 'reveal' ? (state?.reveal || null) : null);
  const snippetSec = state?.settings.snippetSeconds || 15;
  const [audioEnded, setAudioEnded] = useState(false);

  // 1-minute countdown during reveal stage
  const revealEndsAt = activeReveal?.revealEndsAt;
  const revealSeconds = useCountdown(revealEndsAt);

  // Sync volume changes to audio element
  useEffect(() => {
    if (audio.current) {
      audio.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    setGuess('');
    setAudioBlocked(false);
    setAudioEnded(false);
  }, [round]);

  // Stop audio playback once snippet duration (e.g. 15s) has elapsed during guessing
  useEffect(() => {
    const el = audio.current;
    if (!el) return;

    const handleTimeUpdate = () => {
      if (!activeReveal && el.currentTime >= snippetSec) {
        el.pause();
        setIsPlaying(false);
        setAudioEnded(true);
      }
    };

    el.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [snippetSec, round, activeReveal]);

  // Automatically focus the single input field when a new round starts
  useEffect(() => {
    if (state?.phase === 'playing' && !activeReveal) {
      setGuess('');
      const t = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [round, state?.phase, activeReveal]);

  useEffect(() => {
    const el = audio.current;
    if (!el || !state?.preview?.url) return;

    el.volume = volume;

    if (activeReveal) {
      el.pause();
      setIsPlaying(false);
      return;
    }

    if (el.src !== state.preview.url) {
      el.src = state.preview.url;
    }
    el.currentTime = 0;
    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setAudioBlocked(false);
          setIsPlaying(true);
        })
        .catch(() => {
          setAudioBlocked(true);
          setIsPlaying(false);
        });
    }
  }, [state?.preview?.url, activeReveal, round]);

  const handleManualPlay = () => {
    const el = audio.current;
    if (el && state?.preview?.url) {
      el.volume = volume;
      if (el.src !== state.preview.url) {
        el.src = state.preview.url;
      }
      if (el.currentTime >= snippetSec) {
        el.currentTime = 0;
      }
      el.play()
        .then(() => {
          setAudioBlocked(false);
          setIsPlaying(true);
        })
        .catch(() => {
          setAudioBlocked(true);
        });
    }
  };

  const handleReplay = () => {
    const el = audio.current;
    if (!el || !state?.preview?.url) return;
    el.volume = volume;
    if (el.src !== state.preview.url) {
      el.src = state.preview.url;
    }
    el.currentTime = 0;
    el.play()
      .then(() => {
        setAudioBlocked(false);
        setIsPlaying(true);
        setAudioEnded(false);
      })
      .catch(() => {
        setAudioBlocked(true);
        setIsPlaying(false);
      });
  };

  const handleSkip = async () => {
    if (skipping) return;
    setSkipping(true);
    try {
      await skip();
    } finally {
      setSkipping(false);
    }
  };

  const handleSkipRef = useRef(handleSkip);
  handleSkipRef.current = handleSkip;

  // Global Ctrl + Enter / Cmd + Enter shortcut to trigger skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleSkipRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  const players = state?.players ?? [];
  const scores = state?.scores ?? {};
  const ranking = useMemo(
    () => [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0)),
    [players, scores]
  );

  // Game Over Podium
  if (over) {
    const highestScore = Math.max(...Object.values(over.scores), 0);
    const winners = players.filter(p => (scores[p.id] ?? 0) === highestScore && highestScore > 0);

    return (
      <section data-liquid-surface className="liquid-glass-card p-8 sm:p-12 text-center space-y-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/20 text-3xl shadow-inner border border-amber-400/30">
          🏆
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tight">게임 종료</h2>
          <p className="mt-2 text-base text-emerald-400 font-semibold">
            {winners.length > 1
              ? `공동 우승: ${winners.map(w => w.name).join(', ')}!`
              : winners.length === 1
              ? `우승자: ${winners[0].name}!`
              : '게임이 종료되었습니다.'}
          </p>
        </div>

        {/* Final Podium Table */}
        <div className="max-w-md mx-auto space-y-2">
          {ranking.map((player, idx) => (
            <div
              key={player.id}
              className={`flex items-center justify-between rounded-2xl px-5 py-3.5 border transition-all ${
                idx === 0
                  ? 'border-amber-400/40 bg-amber-400/10 text-amber-200 font-bold'
                  : 'border-slate-700/50 bg-slate-800/40 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm opacity-70">#{idx + 1}</span>
                <span>
                  {player.name}
                  {player.id === me && <span className="ml-1.5 text-xs text-emerald-400">(나)</span>}
                </span>
              </div>
              <span className="font-mono text-base font-black">{scores[player.id] ?? 0}점</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500">호스트가 다음 게임을 위해 로비로 복귀할 수 있습니다.</p>
      </section>
    );
  }

  return (
    <section data-liquid-surface className="liquid-glass-card p-4 sm:p-8 space-y-4 sm:space-y-6">
      <audio
        ref={audio}
        src={state?.preview?.url || undefined}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setAudioEnded(true);
        }}
      />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/40 pb-3 sm:pb-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Speed Quiz Mode
            </span>
            <h2 className="text-xl sm:text-2xl font-black">스피드 퀴즈</h2>
          </div>

          {/* On mobile: Round & Timer aligned with title */}
          <div className="flex sm:hidden items-center gap-1.5">
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
              R <span className="font-mono text-white">{(state?.roundId ?? 0)}</span>/{state?.settings.rounds}
            </div>
            {state?.phase === 'playing' && !activeReveal && (
              <div
                className={`flex items-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] font-bold font-mono transition-colors ${
                  seconds <= 10
                    ? 'border-rose-500/50 bg-rose-500/20 text-rose-300 animate-pulse'
                    : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                }`}
              >
                ⏱ {seconds}s
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          <VolumeControl />

          {/* Always-Active Skip Button in Header */}
          <button
            type="button"
            onClick={handleSkip}
            disabled={skipping}
            title={activeReveal ? '다음 노래로 넘기기' : '이 문제 넘기기 (정답 확인)'}
            className="liquid-btn-secondary px-2.5 py-1.5 sm:px-3 text-xs font-bold flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
          >
            <span>⏭️ {activeReveal ? '다음 곡' : '넘기기'}</span>
          </button>

          <div className="hidden sm:block rounded-xl border border-slate-700/60 bg-slate-800/50 px-3.5 py-1.5 text-xs font-semibold text-slate-300">
            라운드 <span className="font-mono text-white text-sm">{(state?.roundId ?? 0)}</span> / {state?.settings.rounds}
          </div>

          {state?.phase === 'playing' && !activeReveal && (
            <div
              className={`hidden sm:flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold font-mono transition-colors ${
                seconds <= 10
                  ? 'border-rose-500/50 bg-rose-500/20 text-rose-300 animate-pulse'
                  : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
              }`}
            >
              ⏱ {seconds}초
            </div>
          )}
        </div>
      </div>

      {/* Audio Autoplay Block Notice */}
      {audioBlocked && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 dark:border-emerald-400/40 bg-emerald-100/70 dark:bg-emerald-400/10 px-4 py-2.5 sm:px-5 sm:py-3 text-xs text-emerald-900 dark:text-emerald-200 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">🔊</span>
            <span className="text-[11px] sm:text-xs">브라우저 사운드가 일시 중단되었습니다. 소리를 켜주세요.</span>
          </div>
          <button
            onClick={handleManualPlay}
            className="liquid-btn-primary px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold shrink-0"
          >
            소리 켜기
          </button>
        </div>
      )}

      {/* Dynamic Sound Visualizer & Replay Controls */}
      <div className="py-2 sm:py-4 flex flex-col items-center justify-center space-y-2 sm:space-y-3">
        <div className="flex h-12 sm:h-20 items-end justify-center gap-1 sm:gap-2 px-2 sm:px-4" aria-hidden="true">
          {[24, 48, 36, 68, 52, 80, 60, 42, 64, 46, 30, 56, 38, 70, 50, 28].map((baseHeight, i) => {
            const dynamicHeight = isPlaying && !activeReveal ? Math.max(10, (baseHeight * 0.6 * (0.6 + Math.sin(Date.now() / 200 + i) * 0.4))) : 6;
            return (
              <span
                key={i}
                style={{ height: `${dynamicHeight}px` }}
                className={`w-1.5 sm:w-2.5 sound-bar transition-all duration-150 ${
                  isPlaying && !activeReveal ? 'opacity-90 shadow-sm' : 'opacity-25'
                }`}
              />
            );
          })}
        </div>
        <p className="text-xs text-slate-400 font-medium text-center">
          {activeReveal
            ? '정답 확인 중… 이번 곡을 확인하고 다음 노래로 넘어가세요.'
            : isPlaying
            ? `음악 재생 중 (${snippetSec}초)… 먼저 제목/가수를 맞혀보세요!`
            : audioEnded
            ? `미리듣기(${snippetSec}초)가 종료되었습니다. 다시 듣거나 1분 타이머 종료 전까지 정답을 입력하세요!`
            : '오디오 로딩 중…'}
        </p>

        {/* Replay Button */}
        {!activeReveal && state?.preview?.url && (
          <div className="pt-1 flex items-center justify-center">
            <button
              type="button"
              onClick={handleReplay}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 ${
                isPlaying
                  ? 'border border-emerald-400/40 bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25'
                  : 'border border-emerald-400 bg-emerald-400/25 text-emerald-200 hover:bg-emerald-400/35 hover:scale-105 shadow-emerald-500/20 animate-pulse'
              }`}
            >
              <span className="text-sm">🔁</span>
              <span>{isPlaying ? '처음부터 다시 듣기' : `미리듣기 다시 듣기 (${snippetSec}초)`}</span>
            </button>
          </div>
        )}
      </div>

      {/* Reveal Screen OR Single Answer Form */}
      {activeReveal ? (
        <div className="rounded-3xl border border-emerald-400/40 bg-emerald-400/10 p-6 sm:p-8 text-center space-y-5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          {/* Winner / Solvers Announcement Banner */}
          <div className="flex flex-col items-center justify-center gap-2">
            {activeReveal.solvers?.title || activeReveal.solvers?.artist ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {activeReveal.solvers?.title && activeReveal.solvers?.artist && activeReveal.solvers.title.playerId === activeReveal.solvers.artist.playerId ? (
                  <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider bg-emerald-400/25 text-emerald-300 border border-emerald-400/50 shadow-sm">
                    <span>👑</span>
                    <span>
                      <strong>
                        {activeReveal.solvers.title.playerId === me
                          ? '내가 제목과 가수를 모두 맞혔습니다!'
                          : `${activeReveal.solvers.title.playerName}님이 제목과 가수를 모두 맞혔습니다!`}
                      </strong>
                      <span className="ml-1 text-xs opacity-90">(+2점)</span>
                    </span>
                  </span>
                ) : (
                  <>
                    {activeReveal.solvers?.title && (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs sm:text-sm font-bold bg-emerald-400/25 text-emerald-300 border border-emerald-400/50 shadow-sm">
                        <span>🎵</span>
                        <span>
                          <strong>{activeReveal.solvers.title.playerId === me ? '내' : activeReveal.solvers.title.playerName}</strong>님이 제목 정답! (+1점)
                        </span>
                      </span>
                    )}
                    {activeReveal.solvers?.artist && (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs sm:text-sm font-bold bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 shadow-sm">
                        <span>🎤</span>
                        <span>
                          <strong>{activeReveal.solvers.artist.playerId === me ? '내' : activeReveal.solvers.artist.playerName}</strong>님이 가수 정답! (+1점)
                        </span>
                      </span>
                    )}
                  </>
                )}
              </div>
            ) : activeReveal.winnerId ? (
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider bg-emerald-400/25 text-emerald-300 border border-emerald-400/50 shadow-sm">
                <span>🎉</span>
                <span>
                  <strong>
                    {activeReveal.winnerId === me
                      ? '내가 정답을 맞혔습니다!'
                      : `${activeReveal.winnerName || players.find(p => p.id === activeReveal.winnerId)?.name || '플레이어'}님이 정답을 맞혔습니다!`}
                  </strong>
                  <span className="ml-1 text-xs opacity-90">(+1점)</span>
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                <span>{activeReveal.skipped ? '⏭️' : '⏰'}</span>
                <span>
                  {activeReveal.skipped
                    ? '문제를 넘겼습니다! 이번 곡의 정답을 확인하세요.'
                    : '1분 제한 시간이 종료되었습니다! 이번 곡의 정답을 확인하세요.'}
                </span>
              </span>
            )}
            <p className="text-xs text-slate-400">이번 라운드 정답 곡 정보</p>
          </div>

          {/* Album Artwork & Details */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-1">
            {activeReveal.track.coverUrl ? (
              <img
                src={activeReveal.track.coverUrl}
                alt={activeReveal.track.title}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
                className="h-32 w-32 sm:h-36 sm:w-36 rounded-2xl object-cover shadow-2xl border-2 border-white/20"
              />
            ) : null}
            <div
              style={{ display: activeReveal.track.coverUrl ? 'none' : 'flex' }}
              className="h-32 w-32 sm:h-36 sm:w-36 items-center justify-center rounded-2xl bg-slate-800 text-4xl text-slate-400 border border-slate-700"
            >
              🎵
            </div>

            <div className="text-center sm:text-left space-y-1.5 max-w-sm">
              <div className="inline-block rounded-md bg-emerald-400/20 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-300">
                곡 정보
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {activeReveal.track.rawTitle || activeReveal.track.title}
              </h3>
              <p className="text-base sm:text-lg text-slate-200 font-bold">
                {activeReveal.track.rawArtist || activeReveal.track.artist}
              </p>
              <p className="text-xs text-slate-400 font-mono">발매연도: {activeReveal.track.year}년</p>

              {activeReveal.track.spotifyUrl && (
                <div className="pt-2">
                  <a
                    href={activeReveal.track.spotifyUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-3.5 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-400/30 transition-colors shadow-sm"
                  >
                    <span>Spotify에서 듣기</span> ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* 1-Minute Auto-Advance Countdown & Skip Button */}
          <div className="pt-3 border-t border-slate-700/40 flex flex-col items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleSkip}
              disabled={skipping}
              className="liquid-btn-primary px-7 py-3 text-sm font-black flex items-center gap-2.5 shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
            >
              <span>⏭️ 다음 노래로 넘기기</span>
              <kbd className="hidden sm:inline-block rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-200 border border-emerald-400/30">
                Ctrl + Enter
              </kbd>
              {revealSeconds > 0 && (
                <span className="font-mono text-xs opacity-80 font-normal">
                  ({revealSeconds}초 후 자동 진행)
                </span>
              )}
            </button>
            <p className="text-[11px] text-slate-400">
              미리듣기 종료 후 1분간 정답 곡을 확인하실 수 있으며, 넘기기 버튼이나 <kbd className="font-mono bg-slate-800 px-1 rounded border border-slate-700 text-slate-300">Ctrl+Enter</kbd>를 누르면 즉시 다음 곡이 시작됩니다.
            </p>
          </div>
        </div>
      ) : (
        /* Single Unified Answer Input Form */
        <form
          onSubmit={async event => {
            event.preventDefault();
            const trimmed = guess.trim();
            if (!trimmed || !state?.roundId) return;
            const ok = await answer(state.roundId, trimmed);
            if (ok) {
              setGuess('');
            }
            inputRef.current?.focus();
          }}
          className="space-y-4"
        >
          {/* Solvers Status Badges */}
          {(() => {
            const solvers = state?.solvers;
            const target = state?.settings.target || 'both';
            const isTitleSolved = !!solvers?.title;
            const isArtistSolved = !!solvers?.artist;

            return (
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {target !== 'artist' && (
                  <div
                    className={`flex items-center gap-2 rounded-2xl px-3.5 py-1.5 text-xs font-bold border transition-all ${
                      isTitleSolved
                        ? 'border-emerald-400/60 bg-emerald-400/20 text-emerald-300 shadow-sm'
                        : 'border-slate-700/60 bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <span>{isTitleSolved ? '✅' : '🎵'}</span>
                    <span>
                      <strong>곡 제목</strong>: {isTitleSolved ? `${solvers?.title?.playerName} 정답 (+1점)` : '미해결'}
                    </span>
                  </div>
                )}

                {target !== 'title' && (
                  <div
                    className={`flex items-center gap-2 rounded-2xl px-3.5 py-1.5 text-xs font-bold border transition-all ${
                      isArtistSolved
                        ? 'border-cyan-400/60 bg-cyan-400/20 text-cyan-300 shadow-sm'
                        : 'border-slate-700/60 bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <span>{isArtistSolved ? '✅' : '🎤'}</span>
                    <span>
                      <strong>가수 이름</strong>: {isArtistSolved ? `${solvers?.artist?.playerName} 정답 (+1점)` : '미해결'}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Single Unified Guess Input Field */}
          <div className="space-y-1.5">
            <input
              ref={inputRef}
              autoFocus
              value={guess}
              onChange={e => setGuess(e.target.value)}
              onKeyDown={e => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSkip();
                }
              }}
              maxLength={100}
              disabled={state?.phase !== 'playing' || !!activeReveal}
              placeholder={(() => {
                const solvers = state?.solvers;
                const target = state?.settings.target || 'both';
                const isTitleSolved = !!solvers?.title;
                const isArtistSolved = !!solvers?.artist;
                if (target === 'title') return '곡 제목을 입력하세요 (Enter, 넘기기: Ctrl+Enter)';
                if (target === 'artist') return '가수 이름을 입력하세요 (Enter, 넘기기: Ctrl+Enter)';
                if (isTitleSolved && !isArtistSolved) return '가수 이름을 입력하세요 (제목은 이미 맞혔습니다!)';
                if (!isTitleSolved && isArtistSolved) return '곡 제목을 입력하세요 (가수는 이미 맞혔습니다!)';
                return '노래 제목 또는 가수 이름을 입력하세요 (Enter, 넘기기: Ctrl+Enter)';
              })()}
              className="liquid-input w-full px-5 py-3.5 text-base sm:text-lg font-bold shadow-inner placeholder:text-slate-400/70"
            />
            <p className="text-[11px] text-slate-400 text-center">
              하나의 입력창으로 제목이나 가수를 각각 맞출 수 있으며, 넘기려면 <kbd className="font-mono bg-slate-800 px-1 rounded border border-slate-700 text-slate-300">Ctrl + Enter</kbd>를 누르세요.
            </p>
          </div>

          <button
            type="submit"
            disabled={state?.phase !== 'playing' || !!activeReveal || !guess.trim()}
            className="liquid-btn-primary w-full py-3.5 text-sm sm:text-base font-black disabled:opacity-40"
          >
            정답 제출 (Enter)
          </button>

          {/* Always-Active Skip Button in Form Area */}
          <div className="pt-1 flex justify-center">
            <button
              type="button"
              onClick={handleSkip}
              disabled={skipping}
              className="liquid-btn-secondary w-full py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-700/60 transition-all shadow-sm active:scale-95"
            >
              <span>⏭️ 이번 문제 넘기기 (정답 확인)</span>
              <kbd className="hidden sm:inline-block rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-600">
                Ctrl + Enter
              </kbd>
            </button>
          </div>
        </form>
      )}

      {/* Live Leaderboard */}
      <section className="pt-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">현재 점수판</h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {ranking.map((player, idx) => (
            <div
              key={player.id}
              className={`flex items-center justify-between rounded-xl px-4 py-2.5 border transition-all ${
                player.id === activeReveal?.winnerId
                  ? 'border-emerald-400 bg-emerald-400/20 text-emerald-200'
                  : 'border-slate-700/50 bg-slate-800/40 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs opacity-60">#{idx + 1}</span>
                <span className="text-sm font-medium">
                  {player.name}
                  {player.id === me && <span className="ml-1 text-xs text-emerald-400">(나)</span>}
                  {!player.connected && <span className="ml-1 text-xs text-rose-400">(연결 끊김)</span>}
                </span>
              </div>
              <span className="font-mono text-sm font-black">{scores[player.id] ?? 0}점</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
