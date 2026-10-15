'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame, type TimelineEntry } from '@/lib/game';
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

export default function TimelineMode() {
  const { state, reveal, over, me, insert, skip, forceSkip, volume } = useGame();
  const audio = useRef<HTMLAudioElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const winnerContainerRef = useRef<HTMLDivElement>(null);
  const winnerScrollRef = useRef<HTMLDivElement>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioLoadError, setAudioLoadError] = useState(false);
  const [isResolvingAudio, setIsResolvingAudio] = useState(false);
  const [activeYouTubeId, setActiveYouTubeId] = useState<string | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const round = state?.roundId;
  const turn = state?.turn;
  const isMyTurn = turn === me;
  const isPlayingPhase = state?.phase === 'playing';
  const activeReveal = reveal || (state?.phase === 'reveal' ? (state?.reveal || null) : null);
  const targetCards = state?.settings?.targetCards ?? 10;
  const snippetSec = state?.settings?.snippetSeconds || 30;
  const endsAt = state?.endsAt;
  const seconds = useCountdown(endsAt);
  const [audioEnded, setAudioEnded] = useState(false);
  const [audioElapsed, setAudioElapsed] = useState(0);

  const currentTurnPlayer = (state?.players || []).find(p => p.id === turn);

  // Convert vertical mouse wheel scrolling inside timeline card windows into horizontal scrolling
  useEffect(() => {
    const bindHorizontalWheel = (container: HTMLDivElement | null, scroller: HTMLDivElement | null) => {
      if (!container || !scroller) return () => {};
      const handleWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0 && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
          e.preventDefault();
          scroller.scrollLeft += e.deltaY;
        }
      };
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    };

    const cleanupTimeline = bindHorizontalWheel(timelineContainerRef.current, timelineScrollRef.current);
    const cleanupWinner = bindHorizontalWheel(winnerContainerRef.current, winnerScrollRef.current);
    return () => {
      cleanupTimeline();
      cleanupWinner();
    };
  }, [over, state?.phase]);

  // Sync volume changes to audio element
  useEffect(() => {
    if (audio.current) {
      audio.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
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
  }, [snippetSec, activeReveal]);

  // Audio Playback handler
  useEffect(() => {
    setSelectedSlot(null);
    setDragOverSlot(null);
    setIsDragging(false);

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
      setAudioElapsed(0);
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

  // Find track helper (display original text)
  const resolveCard = (entry: TimelineEntry) => {
    if (!entry) {
      return { trackId: '', year: 0, title: '곡 정보', artist: '아티스트' };
    }
    const found = staticTracks.find(t => t.id === entry.trackId);
    const rawTitle = (entry as any).rawTitle || entry.title || found?.title || '곡 정보';
    const rawArtist = (entry as any).rawArtist || entry.artist || found?.artist || '아티스트';
    return {
      ...entry,
      title: rawTitle,
      artist: rawArtist,
      coverUrl: entry.coverUrl || found?.coverUrl || '',
      spotifyUrl: entry.spotifyUrl || found?.spotifyUrl || '',
    };
  };

  const myTimeline: TimelineEntry[] = (state?.timelines?.[me ?? ''] ?? []).map(resolveCard);

  // Submit slot insertion
  const handleInsert = async (index: number) => {
    if (!isMyTurn || !state?.roundId || !isPlayingPhase || !!activeReveal) return;
    setSelectedSlot(index);
    setDragOverSlot(null);
    setIsDragging(false);
    await insert(state.roundId, index);
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

  const connectedPlayers = useMemo(
    () => (state?.players || []).filter(p => p.connected !== false),
    [state?.players]
  );
  const activeCount = Math.max(1, connectedPlayers.length);
  const skipVotes = state?.skipVotes || [];
  const currentVotesCount = skipVotes.filter(id => connectedPlayers.some(p => p.id === id)).length;
  const hasVoted = !!me && skipVotes.includes(me);

  // Game Over
  if (over) {
    const winnerId = over.winnerId;
    const winnerPlayer = (state?.players || []).find(p => p.id === winnerId);
    const isWinnerMe = winnerId === me;
    const rawWinnerCards = state?.timelines?.[winnerId ?? ''] ?? over?.timelines?.[winnerId ?? ''] ?? [];
    const winnerTimeline: TimelineEntry[] = Array.isArray(rawWinnerCards) ? rawWinnerCards.map(resolveCard) : [];

    return (
      <section data-liquid-surface className="liquid-glass-card p-6 sm:p-10 text-center space-y-8 animate-in fade-in duration-300">
        {/* Victory Header Banner */}
        <div className="space-y-4">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-400/20 text-4xl shadow-inner border border-amber-400/40 animate-bounce">
            🏆
          </div>
          <div>
            <span className="inline-block rounded-full bg-emerald-400/20 border border-emerald-400/40 px-3.5 py-1 text-xs font-bold text-emerald-300 uppercase tracking-widest mb-2">
              Timeline Victory!
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {isWinnerMe ? '🎉 축하합니다! 나의 타임라인 완성!' : `🎉 ${winnerPlayer?.name || '우승자'}님 타임라인 완성!`}
            </h2>
            <p className="mt-2 text-base sm:text-lg text-emerald-300 font-bold max-w-lg mx-auto">
              {isWinnerMe
                ? `${targetCards}장의 발매연도 음악 카드를 연대순으로 모두 올바르게 배열하여 승리했습니다!`
                : `${winnerPlayer?.name || '우승자'}님이 ${targetCards}장의 음악 카드를 연대순으로 모두 올바르게 모아 승리했습니다!`}
            </p>
          </div>
        </div>

        {/* Winner's Full Completed Timeline Cards */}
        <div className="space-y-3 pt-2 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/50 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-1.5">
                <span>👑</span>
                <span>{winnerPlayer?.name || '우승자'}님의 완성된 타임라인</span>
              </span>
              <span className="rounded-full bg-emerald-400/20 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-300">
                {winnerTimeline.length} / {targetCards}장 완성
              </span>
            </div>
            {winnerTimeline.length > 0 && (
              <span className="text-xs text-slate-400">
                좌측: 가장 과거 ({winnerTimeline[0]?.year}년) ➔ 우측: 가장 최신 ({winnerTimeline[winnerTimeline.length - 1]?.year}년)
              </span>
            )}
          </div>

          {/* Horizontal Scroll Deck of Winner's Cards */}
          <div
            ref={winnerContainerRef}
            className="relative rounded-3xl border border-slate-700/60 bg-slate-900/40 p-4 sm:p-5 backdrop-blur-md"
          >
            <div
              ref={winnerScrollRef}
              className="flex items-stretch gap-3 overflow-x-auto py-2 px-1 scrollbar-thin"
            >
              {winnerTimeline.map((card, idx) => (
                <div key={`${card.trackId}-${idx}`} className="flex items-center gap-3 shrink-0">
                  {/* Winner Timeline Card */}
                  <div
                    className="w-40 sm:w-52 shrink-0 flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl liquid-glass-card border border-emerald-400/40 shadow-xl relative group transition-all hover:scale-[1.02] bg-emerald-950/20"
                  >
                    {/* Top Bar: Large Year & Index */}
                    <div className="flex items-center justify-between gap-1.5 mb-2.5">
                      <span className="rounded-xl bg-amber-400/25 border-2 border-amber-400/60 px-3 py-1 font-mono text-2xl sm:text-3xl font-black tracking-tight text-amber-300 shadow-md">
                        {card.year}<span className="text-sm sm:text-base ml-0.5 font-extrabold">년</span>
                      </span>
                      <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Album Art */}
                    <div className="my-2 aspect-square w-full rounded-xl overflow-hidden bg-slate-800 border border-slate-700/60 shadow-inner flex items-center justify-center">
                      {card.coverUrl ? (
                        <img
                          src={card.coverUrl}
                          alt={card.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-3xl text-slate-500">🎵</span>
                      )}
                    </div>

                    {/* Title & Artist */}
                    <div className="mt-1 text-left space-y-0.5">
                      <h5 className="text-xs sm:text-sm font-bold text-white truncate" title={card.title}>
                        {card.title}
                      </h5>
                      <p className="text-[11px] text-slate-300 truncate font-medium" title={card.artist}>
                        {card.artist}
                      </p>
                    </div>

                    {/* Spotify link */}
                    {card.spotifyUrl && (
                      <div className="pt-2 mt-2 border-t border-slate-700/50">
                        <a
                          href={card.spotifyUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-[10px] font-bold text-emerald-300 hover:underline flex items-center justify-center gap-1"
                        >
                          <span>Spotify에서 듣기</span> ↗
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Arrow Connector between cards (except after last card) */}
                  {idx < winnerTimeline.length - 1 && (
                    <div className="flex items-center justify-center text-slate-500 shrink-0 select-none font-bold text-sm">
                      ➔
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Other Players Final Status */}
        <div className="space-y-3 pt-2 text-left">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            참가자별 최종 타임라인 수
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {(state?.players || []).map(player => {
              const count = state?.timelines?.[player.id]?.length ?? 0;
              const isWinner = player.id === winnerId;
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 border transition-all ${
                    isWinner
                      ? 'border-amber-400/60 bg-amber-400/15 text-amber-200 font-bold'
                      : 'border-slate-700/50 bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
                      {isWinner ? '👑' : player.name.slice(0, 1)}
                    </div>
                    <span className="text-sm">
                      {player.name}
                      {player.id === me && <span className="ml-1 text-xs text-emerald-400">(나)</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-300">{count} / {targetCards}장</span>
                    <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${Math.min(100, (count / targetCards) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <p className="text-xs text-slate-500 pt-2 border-t border-slate-700/40 text-center">
          게임이 종료되었습니다. 호스트가 다음 게임을 위해 로비로 복귀할 수 있습니다.
        </p>
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
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-blue-400">
              Tactical Timeline Mode
            </span>
            <h2 className="text-xl sm:text-2xl font-black">발매연도 타임라인</h2>
          </div>

          {/* On mobile: Round pill & Timer pill */}
          <div className="sm:hidden flex items-center gap-1.5">
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
              R <span className="font-mono text-white">{(state?.roundId ?? 0)}</span>
            </div>
            {state?.phase === 'playing' && !activeReveal && (
              <div
                className={`rounded-xl border px-2 py-1 text-[11px] font-bold font-mono transition-colors ${
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
            라운드 <span className="font-mono text-white text-sm">{(state?.roundId ?? 0)}</span>
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

          <div
            className={`rounded-xl border px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-bold transition-colors ${
              isMyTurn
                ? 'border-emerald-400/50 bg-emerald-400/20 text-emerald-300 shadow-sm animate-pulse'
                : 'border-slate-700/60 bg-slate-800/40 text-slate-400'
            }`}
          >
            {isMyTurn ? '✦ 내 차례!' : `${currentTurnPlayer?.name || '상대방'}의 차례`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left Column (PC): Participant Timeline Status */}
        <aside className="order-2 lg:order-1 lg:col-span-4 xl:col-span-4 lg:sticky lg:top-24 space-y-3 min-w-0">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-md p-4 sm:p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between pb-1 border-b border-slate-700/50">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>👥</span> 참가자별 타임라인 현황
              </h4>
              <span className="text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/30">
                목표 {targetCards}장
              </span>
            </div>

            <div className="space-y-2.5">
              {(state?.players || []).map(player => {
                const pTimeline = state?.timelines?.[player.id] ?? [];
                const count = pTimeline.length;
                const isCurrentTurn = player.id === turn;
                const isMe = player.id === me;
                const percent = Math.min(100, Math.round((count / targetCards) * 100));

                return (
                  <div
                    key={player.id}
                    className={`rounded-xl p-3 border transition-all ${
                      isCurrentTurn
                        ? 'border-emerald-400/80 bg-emerald-400/15 shadow-md shadow-emerald-500/10'
                        : 'border-slate-700/50 bg-slate-800/40'
                    }`}
                  >
                    {/* Top Row: Name, Badges, Count */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isCurrentTurn ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-white'
                          }`}
                        >
                          {player.name.slice(0, 1)}
                        </div>
                        <span className="text-sm font-semibold truncate text-slate-200">
                          {player.name}
                          {isMe && <span className="ml-1 text-xs text-emerald-400 font-bold">(나)</span>}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCurrentTurn && (
                          <span className="rounded bg-emerald-400/25 border border-emerald-400/40 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 animate-pulse">
                            현재 턴
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold text-amber-300">
                          {count}/{targetCards}장
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-700/80 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* Chronological Year Badges Mini-Deck */}
                    <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-slate-700/30">
                      {pTimeline.length === 0 ? (
                        <span className="text-[10px] text-slate-500">보관된 카드 없음 (0장)</span>
                      ) : (
                        pTimeline.map((card, idx) => (
                          <span
                            key={`${card.trackId}-${idx}`}
                            className="inline-flex items-center rounded bg-slate-800/90 border border-slate-700/80 px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-300 shadow-sm"
                            title={`${card.title || '곡'} - ${card.artist || '가수'} (${card.year}년)`}
                          >
                            {card.year}년
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Column (PC): Interactive Gameplay Area */}
        <div className="order-1 lg:order-2 lg:col-span-8 xl:col-span-8 space-y-4 sm:space-y-5 min-w-0">
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
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 dark:border-emerald-400/40 bg-emerald-100/70 dark:bg-emerald-400/10 px-5 py-3 text-xs text-emerald-900 dark:text-emerald-200 backdrop-blur-md shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-base">🔊</span>
                <span>브라우저 자동 재생이 차단되었습니다. 버튼을 눌러 소리를 켜주세요.</span>
              </div>
              <button onClick={handleManualPlay} className="liquid-btn-primary px-4 py-2 text-xs font-bold shrink-0">
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

          {/* Audio Wave Visualizer & Practice-mode style Progress Bar */}
          <div className="w-full max-w-xl mx-auto space-y-2.5 py-2 sm:py-3">
            {/* Sound Wave Visualizer */}
            <div className="flex items-center justify-center gap-2 py-1" aria-hidden="true">
              {[20, 38, 28, 54, 40, 64, 48, 34, 50, 36, 24].map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${isPlaying && !activeReveal ? h : 8}px` }}
                  className={`w-2 sound-bar transition-all duration-200 ${
                    isPlaying && !activeReveal ? 'opacity-90 shadow-sm' : 'opacity-25'
                  }`}
                />
              ))}
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
                ? '정답 확인 중… 이번 곡을 확인하고 다음 턴으로 넘어가세요.'
                : isResolvingAudio
                ? '음원 검색 중...'
                : audioLoadError
                ? '음원 로드 실패 (스킵 버튼으로 넘길 수 있습니다)'
                : isPlaying
                ? `음악 재생 중 (${snippetSec}초)… 발매연도를 유추해보세요!`
                : audioEnded
                ? `미리듣기(${snippetSec}초)가 종료되었습니다. 다시 듣거나 남은 시간(${seconds}초) 내에 카드를 배치하세요!`
                : '오디오 로딩 중…'}
            </p>

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

      {/* Draggable Mystery Question Card (Active Turn Only) */}
      {isMyTurn && isPlayingPhase && !activeReveal && (
        <div className="flex flex-col items-center justify-center space-y-3 pt-1">
          <div
            draggable
            onDragStart={e => {
              setIsDragging(true);
              e.dataTransfer.setData('text/plain', 'mystery-card');
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => {
              setIsDragging(false);
              setDragOverSlot(null);
            }}
            className={`w-full max-w-sm p-4 sm:p-5 rounded-3xl border-2 transition-all cursor-grab active:cursor-grabbing select-none text-center shadow-xl ${
              isDragging
                ? 'border-emerald-300 bg-emerald-400/30 scale-95 opacity-70'
                : 'border-emerald-400 bg-emerald-400/15 hover:border-emerald-300 hover:bg-emerald-400/20 shadow-emerald-500/10'
            }`}
          >
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-2">
              <span className="animate-spin text-sm">💿</span>
              <span>🖐️ 이번 라운드 출제 곡 카드</span>
            </div>

            <div className="my-2 flex justify-center">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-400/30 flex items-center justify-center text-3xl shadow-inner">
                ❓
              </div>
            </div>

            <h4 className="text-base font-black text-slate-900 dark:text-white">음악을 듣고 발매연도를 유추하세요!</h4>
            <p className="font-mono text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">발매연도: ????년</p>

            <div className="mt-3 pt-2.5 border-t border-emerald-400/20 text-[11px] text-emerald-800 dark:text-emerald-200/90 flex flex-col sm:flex-row items-center justify-center gap-1 text-center">
              <span>👉 아래 타임라인의 <strong>[ + 배치 ]</strong> 버튼을 터치하거나 카드를 드래그하여 배치하세요!</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            (원하는 연대순 위치의 <strong>[ + 배치 ]</strong> 버튼을 누르면 즉시 정답이 제출됩니다)
          </p>
        </div>
      )}

      {/* Turn Prompt Banner (When NOT my turn) */}
      {!isMyTurn && isPlayingPhase && !activeReveal && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 text-center text-xs text-slate-400">
          현재 <strong>{currentTurnPlayer?.name}</strong>님이 곡을 듣고 카드를 배치하고 있습니다. 관전 중…
        </div>
      )}

      {/* Reveal Result Banner */}
      {activeReveal && (
        <div className="rounded-3xl border border-blue-400/40 bg-blue-400/10 p-6 sm:p-7 text-center space-y-4 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          {/* Status Message */}
          <div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold uppercase shadow-sm ${
                activeReveal.timeout
                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50'
                  : activeReveal.success !== false
                  ? 'bg-emerald-400/25 text-emerald-300 border border-emerald-400/50'
                  : 'bg-rose-500/25 text-rose-300 border border-rose-500/50'
              }`}
            >
              {activeReveal.timeout ? (
                <>
                  <span>⏱️</span>
                  <span><strong>시간 초과!</strong> 60초 내에 카드를 배치하지 못했습니다.</span>
                </>
              ) : activeReveal.success !== false ? (
                <>
                  <span>🎉</span>
                  <span><strong>정답! 올바른 연대순입니다!</strong> (타임라인에 카드 추가 보관)</span>
                </>
              ) : (
                <>
                  <span>❌</span>
                  <span><strong>순서 불일치!</strong> 카드가 폐기되었습니다.</span>
                </>
              )}
            </span>
            <p className="text-xs text-slate-400 mt-1.5">
              {activeReveal.timeout
                ? `60초 제한 시간이 지나 카드가 버려졌습니다. (실제 발매연도: ${activeReveal.track.year}년)`
                : activeReveal.success !== false
                ? '축하합니다! 카드를 내 타임라인에 안전하게 보관했습니다.'
                : `실제 발매연도는 ${activeReveal.track.year}년입니다. 연대순과 맞지 않아 카드가 버려졌습니다.`}
            </p>
          </div>

          {/* Track Information Card */}
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
                className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl object-cover border-2 border-white/20 shadow-xl"
              />
            ) : null}
            <div
              style={{ display: activeReveal.track.coverUrl ? 'none' : 'flex' }}
              className="h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-2xl bg-slate-800 text-3xl text-slate-400"
            >
              🎵
            </div>
            <div className="text-center sm:text-left space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-400/25 border-2 border-amber-400/60 px-4 py-1.5 font-mono font-black text-amber-300 shadow-md">
                <span className="text-xs sm:text-sm uppercase tracking-wider text-amber-200/90">발매연도</span>
                <span className="text-2xl sm:text-3xl text-amber-200">{activeReveal.track.year}년</span>
              </div>
              <h4 className="text-xl sm:text-2xl font-black">
                {activeReveal.track.rawTitle || activeReveal.track.title}
              </h4>
              <p className="text-sm sm:text-base text-slate-300 font-semibold">
                {activeReveal.track.rawArtist || activeReveal.track.artist}
              </p>

              {activeReveal.track.spotifyUrl && (
                <div className="pt-2">
                  <a
                    href={activeReveal.track.spotifyUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-400/30 transition-colors"
                  >
                    <span>Spotify에서 듣기</span> ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Manual Next Turn Skip Button (NO Auto Timer in Timeline Mode!) */}
          <div className="pt-3 border-t border-slate-700/40 flex flex-col items-center justify-center gap-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                disabled={skipping}
                className={`px-8 py-3 text-sm font-black flex items-center gap-2.5 shadow-xl transition-all ${
                  hasVoted
                    ? 'border-2 border-emerald-400 bg-emerald-500/25 text-emerald-200'
                    : 'liquid-btn-primary hover:scale-[1.02] active:scale-95'
                }`}
              >
                <span>
                  {hasVoted
                    ? `✓ 넘기기 투표 완료 (${currentVotesCount}/${activeCount})`
                    : activeCount > 1
                    ? `⏭️ 다음 턴으로 넘기기 (${currentVotesCount}/${activeCount})`
                    : '⏭️ 다음 턴으로 넘기기'}
                </span>
                <kbd className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold border transition-colors bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm dark:bg-black/40 dark:text-emerald-200 dark:border-emerald-400/30">
                  Ctrl + Enter
                </kbd>
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
                ? `모든 접속자(${activeCount}명)가 넘기기를 눌러야 다음 턴이 시작됩니다. (현재 ${currentVotesCount}/${activeCount}명 동의)${isHost ? ' (호스트는 ⚡강제 넘기기: Shift + Enter 가능)' : ''}`
                : '타임라인 모드는 넘기기 버튼이나 Ctrl+Enter를 누를 때까지 대기합니다. 충분히 확인 후 다음 턴을 진행하세요.'}
            </p>
          </div>
        </div>
      )}

      {/* Horizontal Interactive Timeline Section */}
      <section className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
              내 타임라인 카드
            </h3>
            <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-300">
              {myTimeline.length} / {targetCards}장
            </span>
          </div>
          <span className="text-xs text-slate-400">
            {targetCards}장을 모으면 승리! (좌측: 과거 → 우측: 최신순 · 마우스 휠로 좌우 스크롤)
          </span>
        </div>

        {/* Horizontal Card Deck & In-Between Drag Slots */}
        <div
          ref={timelineContainerRef}
          className="relative rounded-3xl border border-slate-700/60 bg-slate-900/40 p-4 backdrop-blur-md"
        >
          <div
            ref={timelineScrollRef}
            className="flex items-stretch gap-2.5 overflow-x-auto py-3 px-1 scrollbar-thin"
          >
            {/* Slot 0: Before first card */}
            {isMyTurn && isPlayingPhase && !activeReveal && (
              <div
                onDragOver={e => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverSlot !== 0) setDragOverSlot(0);
                }}
                onDragLeave={() => {
                  if (dragOverSlot === 0) setDragOverSlot(null);
                }}
                onDrop={e => {
                  e.preventDefault();
                  handleInsert(0);
                }}
                onClick={() => handleInsert(0)}
                className={`rounded-2xl border-2 transition-all flex flex-col items-center justify-center cursor-pointer p-2 shrink-0 select-none ${
                  dragOverSlot === 0
                    ? 'w-36 border-emerald-400 bg-emerald-400/30 shadow-2xl scale-105'
                    : 'w-20 sm:w-24 border-dashed border-emerald-400/50 bg-emerald-400/10 hover:border-emerald-400 hover:bg-emerald-400/20'
                }`}
              >
                <span className="text-xl font-bold text-emerald-300">+</span>
                <span className="text-xs sm:text-sm font-black font-mono text-emerald-200 text-center leading-tight mt-1">
                  {myTimeline[0] ? `${myTimeline[0].year}년 이전` : '첫 카드'}
                </span>
                {dragOverSlot === 0 && (
                  <span className="text-[10px] text-emerald-300 font-bold mt-1">✨ 드롭!</span>
                )}
              </div>
            )}

            {/* Cards and Slots between them */}
            {myTimeline.map((card, idx) => (
              <div key={`${card.trackId}-${idx}`} className="flex items-stretch gap-2.5 shrink-0">
                {/* Horizontal Card */}
                <div
                  className="w-38 sm:w-48 shrink-0 flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl liquid-glass-card border border-slate-700/70 shadow-lg relative group transition-all"
                >
                  {/* Top Bar: Large Year Badge & Index */}
                  <div className="flex items-center justify-between gap-1.5 mb-2">
                    <span className="rounded-xl bg-amber-400/25 border-2 border-amber-400/60 px-3 py-1 font-mono text-2xl sm:text-3xl font-black tracking-tight text-amber-300 shadow-md">
                      {card.year}<span className="text-sm sm:text-base ml-0.5 font-extrabold">년</span>
                    </span>
                    <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-xs font-mono font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Album Cover */}
                  <div className="my-1.5 aspect-square w-full rounded-xl overflow-hidden bg-slate-800 border border-slate-700/50 shadow-inner flex items-center justify-center">
                    {card.coverUrl ? (
                      <img
                        src={card.coverUrl}
                        alt={card.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-2xl text-slate-500">🎵</span>
                    )}
                  </div>

                  {/* Title & Artist */}
                  <div className="mt-2 text-left">
                    <h5 className="text-xs sm:text-sm font-bold text-white truncate" title={card.title}>
                      {card.title}
                    </h5>
                    <p className="text-[11px] text-slate-300 truncate" title={card.artist}>
                      {card.artist}
                    </p>
                  </div>
                </div>

                {/* Drop Slot right after this card */}
                {isMyTurn && isPlayingPhase && !activeReveal && (
                  <div
                    onDragOver={e => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverSlot !== idx + 1) setDragOverSlot(idx + 1);
                    }}
                    onDragLeave={() => {
                      if (dragOverSlot === idx + 1) setDragOverSlot(null);
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      handleInsert(idx + 1);
                    }}
                    onClick={() => handleInsert(idx + 1)}
                    className={`rounded-2xl border-2 transition-all flex flex-col items-center justify-center cursor-pointer p-2 shrink-0 select-none ${
                      dragOverSlot === idx + 1
                        ? 'w-36 border-emerald-400 bg-emerald-400/30 shadow-2xl scale-105'
                        : 'w-20 sm:w-24 border-dashed border-emerald-400/50 bg-emerald-400/10 hover:border-emerald-400 hover:bg-emerald-400/20'
                    }`}
                  >
                    <span className="text-xl font-bold text-emerald-300">+</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-emerald-200 text-center leading-tight mt-1">
                      {idx === myTimeline.length - 1
                        ? `${card.year}년 이후`
                        : `${card.year}~${myTimeline[idx + 1]?.year}년`}
                    </span>
                    {dragOverSlot === idx + 1 && (
                      <span className="text-[10px] text-emerald-300 font-bold mt-1">✨ 드롭!</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

        </div>
      </div>
    </section>
  );
}
