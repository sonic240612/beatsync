'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '@/lib/game';
import { tracks as staticTracks } from '@/shared/tracks.js';
import { VolumeControl } from '@/components/volume-control';
import { resolveClientAudioFallback } from '@/lib/audio-fallback';
import { HiddenYouTubePlayer } from '@/components/hidden-youtube-player';

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
  const { state, reveal, over, me, answer, skip, forceSkip, volume, toasts } = useGame();
  const audio = useRef<HTMLAudioElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [guess, setGuess] = useState('');
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioLoadError, setAudioLoadError] = useState(false);
  const [isResolvingAudio, setIsResolvingAudio] = useState(false);
  const [activeYouTubeId, setActiveYouTubeId] = useState<string | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const round = state?.roundId;
  const endsAt = state?.endsAt;
  const seconds = useCountdown(endsAt);

  const activeReveal = reveal || (state?.phase === 'reveal' ? (state?.reveal || null) : null);
  const snippetSec = state?.settings.snippetSeconds || 30;
  const [audioEnded, setAudioEnded] = useState(false);
  const [audioElapsed, setAudioElapsed] = useState(0);

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
    setActiveYouTubeId(null);
    setAudioBlocked(false);
    setAudioLoadError(false);
    setIsResolvingAudio(false);
    setAudioEnded(false);
    setAudioElapsed(0);
  }, [round]);

  // Stop audio playback once snippet duration (e.g. 15s) has elapsed during guessing
  useEffect(() => {
    const el = audio.current;
    if (!el) return;

    const handleTimeUpdate = () => {
      const cur = el.currentTime || 0;
      setAudioElapsed(cur);
      if (!activeReveal && cur >= snippetSec) {
        el.pause();
        setIsPlaying(false);
        setAudioEnded(true);
        setAudioElapsed(snippetSec);
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
    setActiveYouTubeId(null);
    setAudioBlocked(false);
    setAudioLoadError(false);
    setIsResolvingAudio(false);
    setAudioEnded(false);

    const el = audio.current;
    if (!el) return;

    if (activeReveal) {
      el.pause();
      setIsPlaying(false);
      return;
    }

    if (!state?.preview?.url) {
      handleAudioError();
      return;
    }

    el.volume = volume;

    if (el.src !== state.preview.url) {
      el.src = state.preview.url;
    }
    el.currentTime = 0;
    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setAudioBlocked(false);
          setAudioLoadError(false);
          setIsPlaying(true);
        })
        .catch((err) => {
          setIsPlaying(false);
          if (err?.name === 'NotAllowedError') {
            setAudioBlocked(true);
            setAudioLoadError(false);
          } else {
            handleAudioError();
          }
        });
    }
  }, [state?.preview?.url, activeReveal, round]);

  const handleAudioError = async () => {
    if (isResolvingAudio) return;
    const el = audio.current;

    setIsResolvingAudio(true);
    setAudioBlocked(false);

    try {
      let trackTitle = state?.preview?.title || '';
      let trackArtist = state?.preview?.artist || '';
      let trackId = state?.preview?.trackId || '';

      if (state?.preview?.url) {
        try {
          const urlObj = new URL(state.preview.url, window.location.origin);
          if (!trackTitle) trackTitle = urlObj.searchParams.get('title') || '';
          if (!trackArtist) trackArtist = urlObj.searchParams.get('artist') || '';
          if (!trackId) {
            const pathParts = urlObj.pathname.split('/');
            const audioIdx = pathParts.indexOf('audio');
            if (audioIdx !== -1 && pathParts[audioIdx + 1]) {
              trackId = decodeURIComponent(pathParts[audioIdx + 1]);
            }
          }
        } catch {}
      }

      if (!trackTitle && trackId) {
        const found = staticTracks.find(t => t.id === trackId);
        if (found) {
          trackTitle = found.title;
          trackArtist = found.artist;
        }
      }

      if (trackTitle || trackArtist || trackId) {
        const fallback = await resolveClientAudioFallback(trackTitle, trackArtist, trackId);
        if (fallback) {
          if (fallback.source === 'youtube' && fallback.youtubeId) {
            if (el) {
              el.pause();
              el.src = '';
            }
            setActiveYouTubeId(fallback.youtubeId);
            setAudioLoadError(false);
            setAudioBlocked(false);
            setIsPlaying(true);
            setIsResolvingAudio(false);
            return;
          } else if (fallback.url && el) {
            setActiveYouTubeId(null);
            el.src = fallback.url;
            el.currentTime = 0;
            el.volume = volume;
            const p = el.play();
            if (p !== undefined) {
              await p;
              setAudioBlocked(false);
              setAudioLoadError(false);
              setIsPlaying(true);
              setIsResolvingAudio(false);
              return;
            }
          }
        }
      }
    } catch (e: any) {
      if (e?.name === 'NotAllowedError') {
        setIsResolvingAudio(false);
        setAudioBlocked(true);
        setAudioLoadError(false);
        return;
      }
    }

    setIsResolvingAudio(false);
    setIsPlaying(false);
    setAudioBlocked(false);
    setAudioLoadError(true);
  };

  const handleManualPlay = () => {
    if (isResolvingAudio) return;

    if (activeYouTubeId) {
      setAudioElapsed(0);
      setIsPlaying(true);
      setAudioBlocked(false);
      setReplayKey(k => k + 1);
      return;
    }

    if (audioLoadError) {
      handleAudioError();
      return;
    }

    const el = audio.current;
    if (!el) return;
    el.volume = volume;

    if (state?.preview?.url) {
      if (el.src !== state.preview.url) {
        el.src = state.preview.url;
      }
      if (el.currentTime >= snippetSec) {
        el.currentTime = 0;
      }
      setAudioElapsed(el.currentTime || 0);
      el.play()
        .then(() => {
          setAudioBlocked(false);
          setAudioLoadError(false);
          setIsPlaying(true);
        })
        .catch((err) => {
          if (err?.name === 'NotAllowedError') {
            setAudioBlocked(true);
            setAudioLoadError(false);
          } else {
            handleAudioError();
          }
        });
    } else {
      handleAudioError();
    }
  };

  const handleReplay = () => {
    setAudioElapsed(0);
    if (activeYouTubeId) {
      setIsPlaying(true);
      setAudioEnded(false);
      setReplayKey(k => k + 1);
      return;
    }

    const el = audio.current;
    if (!el || !state?.preview?.url) {
      if (!state?.preview?.url) {
        handleAudioError();
      }
      return;
    }
    el.volume = volume;

    if (audioLoadError) {
      handleAudioError();
      return;
    }

    if (el.src !== state.preview.url) {
      el.src = state.preview.url;
    }
    el.currentTime = 0;
    el.play()
      .then(() => {
        setAudioBlocked(false);
        setAudioLoadError(false);
        setIsPlaying(true);
        setAudioEnded(false);
      })
      .catch((err) => {
        if (err?.name === 'NotAllowedError') {
          setAudioBlocked(true);
          setAudioLoadError(false);
        } else {
          handleAudioError();
        }
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

  const handleForceSkip = async () => {
    if (skipping) return;
    setSkipping(true);
    try {
      await forceSkip();
    } finally {
      setSkipping(false);
    }
  };

  const isHost = !!me && state?.hostId === me;

  const handleSkipRef = useRef(handleSkip);
  handleSkipRef.current = handleSkip;

  const handleForceSkipRef = useRef(handleForceSkip);
  handleForceSkipRef.current = handleForceSkip;

  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  // Global shortcuts:
  // - Shift + Enter: Host force skip
  // - Ctrl + Enter / Cmd + Enter: Skip vote
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (isHostRef.current) {
            e.preventDefault();
            e.stopPropagation();
            handleForceSkipRef.current();
          }
        } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          handleSkipRef.current();
        }
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

  const connectedPlayers = useMemo(
    () => (state?.players || []).filter(p => p.connected !== false),
    [state?.players]
  );
  const activeCount = Math.max(1, connectedPlayers.length);
  const skipVotes = state?.skipVotes || [];
  const currentVotesCount = skipVotes.filter(id => connectedPlayers.some(p => p.id === id)).length;
  const hasVoted = !!me && skipVotes.includes(me);

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
          setAudioElapsed(snippetSec);
        }}
        onTimeUpdate={() => {
          if (audio.current) {
            setAudioElapsed(audio.current.currentTime);
          }
        }}
        onError={handleAudioError}
      />
      <HiddenYouTubePlayer
        videoId={activeYouTubeId}
        isPlaying={isPlaying && !activeReveal}
        startSeconds={state?.preview?.startSeconds || 0}
        snippetSeconds={snippetSec}
        volume={volume}
        replayKey={replayKey}
        onTimeUpdate={setAudioElapsed}
        onPlay={() => {
          setIsPlaying(true);
          setAudioBlocked(false);
          setAudioLoadError(false);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setAudioEnded(true);
          setAudioElapsed(snippetSec);
        }}
        onError={() => {
          setIsPlaying(false);
          setAudioLoadError(true);
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

          {/* Host Force Skip Button in Header */}
          {isHost && activeCount > 1 && (
            <button
              type="button"
              onClick={handleForceSkip}
              disabled={skipping}
              title="호스트 권한으로 투표 없이 즉시 넘기기 (Shift + Enter)"
              className="px-2.5 py-1.5 sm:px-3 text-xs font-bold flex items-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 active:scale-95 transition-all shadow-sm"
            >
              <span>⚡ 강제 넘기기</span>
              <kbd className="hidden md:inline-block rounded px-1.5 py-0.5 text-[10px] font-mono border transition-colors bg-amber-100 text-amber-900 border-amber-300 shadow-sm dark:bg-black/40 dark:text-amber-200 dark:border-amber-400/40">
                Shift + Enter
              </kbd>
            </button>
          )}

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

      {/* Resolving Fallback Notice */}
      {isResolvingAudio && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-sky-300 dark:border-sky-500/40 bg-sky-100/70 dark:bg-sky-500/10 px-4 py-2.5 sm:px-5 sm:py-3 text-xs text-sky-900 dark:text-sky-200 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin shrink-0" />
            <div className="flex flex-col">
              <span className="text-[11px] sm:text-xs font-bold">대체 음원 탐색 중...</span>
              <span className="text-[10px] text-sky-700 dark:text-sky-300">Apple Music / Deezer / YouTube에서 음원을 찾고 있습니다.</span>
            </div>
          </div>
          <button
            disabled
            className="px-3 py-1.5 rounded-lg bg-sky-600/50 text-white font-bold text-xs shrink-0 cursor-not-allowed opacity-75"
          >
            탐색 중...
          </button>
        </div>
      )}

      {/* Audio Autoplay Block Notice */}
      {audioBlocked && !audioLoadError && !isResolvingAudio && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 dark:border-emerald-400/40 bg-emerald-100/70 dark:bg-emerald-400/10 px-4 py-2.5 sm:px-5 sm:py-3 text-xs text-emerald-900 dark:text-emerald-200 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">🔊</span>
            <span className="text-[11px] sm:text-xs">브라우저 자동 재생이 차단되었습니다. 소리를 켜주세요.</span>
          </div>
          <button
            onClick={handleManualPlay}
            className="liquid-btn-primary px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold shrink-0"
          >
            소리 켜기
          </button>
        </div>
      )}

      {/* Audio Load Failure Notice */}
      {audioLoadError && !isResolvingAudio && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-300 dark:border-rose-500/40 bg-rose-100/80 dark:bg-rose-500/15 px-4 py-2.5 sm:px-5 sm:py-3 text-xs text-rose-900 dark:text-rose-200 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <div className="flex flex-col">
              <span className="text-[11px] sm:text-xs font-bold">음원을 불러오지 못했습니다.</span>
              <span className="text-[10px] text-rose-700 dark:text-rose-300">기본 스트리밍 및 대체 음원 탐색에 실패했습니다. 다시 시도할 수 있습니다.</span>
            </div>
          </div>
          <button
            onClick={handleManualPlay}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs shrink-0 transition shadow-sm flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>다시 시도</span>
          </button>
        </div>
      )}

      {/* Sound Visualizer & Progress Bar (Practice Mode Style) */}
      <div className="w-full max-w-xl mx-auto space-y-2.5 py-2 sm:py-3">
        {/* Dynamic Sound Wave Visualizer */}
        <div className="flex h-12 sm:h-16 items-end justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1" aria-hidden="true">
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

        {/* Progress Bar & Time */}
        <div className="space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-200"
              style={{ width: `${Math.min(100, Math.max(0, (audioElapsed / (snippetSec || 30)) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 px-0.5">
            <span className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isPlaying && !activeReveal ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span>{Math.min(snippetSec, Math.floor(audioElapsed))}s</span>
            </span>
            <span>{snippetSec}s</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 font-medium text-center">
          {activeReveal
            ? '정답 확인 중… 이번 곡을 확인하고 다음 노래로 넘어가세요.'
            : isResolvingAudio
            ? '음원 검색 중...'
            : audioLoadError
            ? '음원 로드 실패 (스킵 버튼으로 넘길 수 있습니다)'
            : isPlaying
            ? `음악 재생 중 (${snippetSec}초)… 먼저 제목/가수를 맞혀보세요!`
            : audioEnded
            ? `미리듣기(${snippetSec}초)가 종료되었습니다. 다시 듣거나 1분 타이머 종료 전까지 정답을 입력하세요!`
            : '오디오 로딩 중…'}
        </p>

        {/* Replay Button */}
        {!activeReveal && (state?.preview?.url || activeYouTubeId) && (
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
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                disabled={skipping}
                className={`px-7 py-3 text-sm font-black flex items-center gap-2.5 shadow-xl transition-all ${
                  hasVoted
                    ? 'border-2 border-emerald-400 bg-emerald-500/25 text-emerald-200'
                    : 'liquid-btn-primary hover:scale-[1.02] active:scale-95'
                }`}
              >
                <span>
                  {hasVoted
                    ? `✓ 넘기기 투표 완료 (${currentVotesCount}/${activeCount})`
                    : activeCount > 1
                    ? `⏭️ 다음 노래로 넘기기 (${currentVotesCount}/${activeCount})`
                    : '⏭️ 다음 노래로 넘기기'}
                </span>
                <kbd className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold border transition-colors bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm dark:bg-black/40 dark:text-emerald-200 dark:border-emerald-400/30">
                  Ctrl + Enter
                </kbd>
                {revealSeconds > 0 && (
                  <span className="font-mono text-xs opacity-80 font-normal">
                    ({revealSeconds}초 후 자동 진행)
                  </span>
                )}
              </button>

              {isHost && activeCount > 1 && (
                <button
                  type="button"
                  onClick={handleForceSkip}
                  disabled={skipping}
                  title="호스트 권한으로 투표 없이 즉시 넘기기 (Shift + Enter)"
                  className="px-5 py-3 text-sm font-black flex items-center gap-2 rounded-2xl border-2 border-amber-400/70 bg-amber-500/20 text-amber-200 hover:bg-amber-500/35 active:scale-95 transition-all shadow-xl"
                >
                  <span>⚡ 강제 넘기기</span>
                  <kbd className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold border transition-colors bg-amber-100 text-amber-900 border-amber-300 shadow-sm dark:bg-black/40 dark:text-amber-200 dark:border-amber-400/40">
                    Shift + Enter
                  </kbd>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              {activeCount > 1
                ? `모든 접속자(${activeCount}명)가 넘기기를 눌러야 즉시 다음 곡이 시작됩니다. (현재 ${currentVotesCount}/${activeCount}명 동의)${isHost ? ' (호스트는 ⚡강제 넘기기 가능)' : ''}`
                : '미리듣기 종료 후 1분간 정답 곡을 확인하실 수 있으며, 넘기기 버튼이나 Ctrl+Enter를 누르면 즉시 다음 곡이 시작됩니다.'}
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

            const titleSolverName = solvers?.title?.playerId === me
              ? '나'
              : (solvers?.title?.playerName || '플레이어');
            const titleAnswer = solvers?.title?.answer;

            const artistSolverName = solvers?.artist?.playerId === me
              ? '나'
              : (solvers?.artist?.playerName || '플레이어');
            const artistAnswer = solvers?.artist?.answer;

            return (
              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                {target !== 'artist' && (
                  <div
                    className={`flex items-center gap-2 rounded-2xl px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-bold border transition-all ${
                      isTitleSolved
                        ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200 shadow-md'
                        : 'border-slate-700/70 bg-slate-800/60 text-slate-200'
                    }`}
                  >
                    <span className="text-base sm:text-lg">{isTitleSolved ? '✅' : '🎵'}</span>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <strong className="text-slate-100">곡 제목:</strong>
                      {isTitleSolved ? (
                        <>
                          {titleAnswer && (
                            <span className="font-black text-white bg-emerald-400/25 px-2 py-0.5 rounded-lg border border-emerald-400/40 shadow-sm break-all">
                              {titleAnswer}
                            </span>
                          )}
                          <span className="text-emerald-300 font-semibold text-xs sm:text-sm">
                            ({titleSolverName} 정답 +1점)
                          </span>
                        </>
                      ) : (
                        <span className="font-extrabold text-amber-300 text-sm sm:text-base">
                          미해결
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {target !== 'title' && (
                  <div
                    className={`flex items-center gap-2 rounded-2xl px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-bold border transition-all ${
                      isArtistSolved
                        ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200 shadow-md'
                        : 'border-slate-700/70 bg-slate-800/60 text-slate-200'
                    }`}
                  >
                    <span className="text-base sm:text-lg">{isArtistSolved ? '✅' : '🎤'}</span>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <strong className="text-slate-100">가수 이름:</strong>
                      {isArtistSolved ? (
                        <>
                          {artistAnswer && (
                            <span className="font-black text-white bg-cyan-400/25 px-2 py-0.5 rounded-lg border border-cyan-400/40 shadow-sm break-all">
                              {artistAnswer}
                            </span>
                          )}
                          <span className="text-cyan-300 font-semibold text-xs sm:text-sm">
                            ({artistSolverName} 정답 +1점)
                          </span>
                        </>
                      ) : (
                        <span className="font-extrabold text-amber-300 text-sm sm:text-base">
                          미해결
                        </span>
                      )}
                    </div>
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
                if (e.key === 'Enter') {
                  if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    if (isHost) {
                      e.preventDefault();
                      handleForceSkip();
                    }
                  } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
                    e.preventDefault();
                    handleSkip();
                  }
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
              하나의 입력창으로 제목이나 가수를 각각 맞출 수 있으며, 넘기려면 <kbd className="font-mono px-1.5 py-0.5 rounded border transition-colors bg-slate-100 text-slate-600 border-slate-300 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">Ctrl + Enter</kbd>를 누르세요.
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
          <div className="pt-1 flex flex-col items-center justify-center gap-1.5">
            <div className="w-full flex items-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                disabled={skipping}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 ${
                  hasVoted
                    ? 'border border-emerald-400/80 bg-emerald-500/20 text-emerald-300'
                    : 'liquid-btn-secondary hover:bg-slate-700/60'
                }`}
              >
                <span>
                  {hasVoted
                    ? `✓ 넘기기 투표 완료 (${currentVotesCount}/${activeCount}명 동의 - 대기 중)`
                    : activeCount > 1
                    ? `⏭️ 이번 문제 넘기기 투표 (${currentVotesCount}/${activeCount})`
                    : '⏭️ 이번 문제 넘기기 (정답 확인)'}
                </span>
                <kbd className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[10px] font-mono border transition-colors bg-slate-100 text-slate-600 border-slate-300 shadow-sm dark:bg-black/40 dark:text-slate-300 dark:border-slate-600">
                  Ctrl + Enter
                </kbd>
              </button>

              {isHost && activeCount > 1 && (
                <button
                  type="button"
                  onClick={handleForceSkip}
                  disabled={skipping}
                  title="호스트 권한으로 투표 없이 즉시 넘기기 (Shift + Enter)"
                  className="py-2.5 px-3.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/35 active:scale-95 transition-all shadow-sm shrink-0"
                >
                  <span>⚡ 강제 넘기기</span>
                  <kbd className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[10px] font-mono border transition-colors bg-amber-100 text-amber-900 border-amber-300 shadow-sm dark:bg-black/40 dark:text-amber-200 dark:border-amber-400/40">
                    Shift + Enter
                  </kbd>
                </button>
              )}
            </div>
            {activeCount > 1 && (
              <p className="text-[11px] text-slate-400 text-center">
                접속 중인 모든 플레이어({activeCount}명)가 넘기기를 눌러야 이번 문제가 넘어갑니다.
                {isHost && (
                  <>
                    {' '}(호스트는 <span className="text-amber-400 font-semibold">⚡강제 넘기기: Shift + Enter</span> 가능)
                  </>
                )}
              </p>
            )}
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
