'use client';
import { useEffect, useRef, useState } from 'react';
import { useGame, type TimelineEntry } from '@/lib/game';
import { tracks as staticTracks } from '@/shared/tracks.js';
import { VolumeControl } from '@/components/volume-control';

export default function TimelineMode() {
  const { state, reveal, over, me, insert, skip, volume } = useGame();
  const audio = useRef<HTMLAudioElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const winnerContainerRef = useRef<HTMLDivElement>(null);
  const winnerScrollRef = useRef<HTMLDivElement>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const round = state?.roundId;
  const turn = state?.turn;
  const isMyTurn = turn === me;
  const isPlayingPhase = state?.phase === 'playing';
  const activeReveal = reveal || (state?.phase === 'reveal' ? (state?.reveal || null) : null);
  const targetCards = state?.settings?.targetCards ?? 10;

  const currentTurnPlayer = state?.players.find(p => p.id === turn);

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

  // Audio Playback handler
  useEffect(() => {
    setSelectedSlot(null);
    setDragOverSlot(null);
    setIsDragging(false);

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
  }, [state?.preview?.url, activeReveal, round, volume]);

  const handleManualPlay = () => {
    const el = audio.current;
    if (el && state?.preview?.url) {
      el.volume = volume;
      if (el.src !== state.preview.url) {
        el.src = state.preview.url;
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

  // Find track helper (display original text)
  const resolveCard = (entry: TimelineEntry) => {
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

  // Game Over
  if (over) {
    const winnerId = over.winnerId;
    const winnerPlayer = state?.players.find(p => p.id === winnerId);
    const isWinnerMe = winnerId === me;
    const rawWinnerCards = state?.timelines?.[winnerId ?? ''] ?? over.timelines?.[winnerId ?? ''] ?? [];
    const winnerTimeline: TimelineEntry[] = rawWinnerCards.map(resolveCard);

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
                    className="w-48 sm:w-52 shrink-0 flex flex-col justify-between p-4 rounded-2xl liquid-glass-card border border-emerald-400/40 shadow-xl relative group transition-all hover:scale-[1.02] bg-emerald-950/20"
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
            {state?.players.map(player => {
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
    <section data-liquid-surface className="liquid-glass-card p-6 sm:p-8 space-y-6">
      <audio
        ref={audio}
        src={state?.preview?.url || undefined}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/40 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Tactical Timeline Mode
          </span>
          <h2 className="text-2xl font-black">발매연도 타임라인</h2>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <VolumeControl />

          <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 px-3.5 py-1.5 text-xs font-semibold text-slate-300">
            라운드 <span className="font-mono text-white text-sm">{(state?.roundId ?? 0)}</span>
          </div>

          <div
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-colors ${
              isMyTurn
                ? 'border-emerald-400/50 bg-emerald-400/20 text-emerald-300 shadow-sm animate-pulse'
                : 'border-slate-700/60 bg-slate-800/40 text-slate-400'
            }`}
          >
            {isMyTurn ? '✦ 내 차례입니다!' : `${currentTurnPlayer?.name || '상대방'}님의 차례`}
          </div>
        </div>
      </div>

      {/* Audio Autoplay Block Notice */}
      {audioBlocked && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-xs text-emerald-200 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-base">🔊</span>
            <span>브라우저 사운드가 일시 중단되었습니다. 소리를 켜주세요.</span>
          </div>
          <button onClick={handleManualPlay} className="liquid-btn-primary px-4 py-2 text-xs font-bold shrink-0">
            소리 켜기
          </button>
        </div>
      )}

      {/* Audio Wave Visualizer & Replay Button */}
      <div className="flex flex-col items-center justify-center gap-2.5 py-2">
        <div className="flex items-center justify-center gap-2" aria-hidden="true">
          {[20, 38, 28, 54, 40, 64, 48, 34, 50, 36, 24].map((h, i) => (
            <span
              key={i}
              style={{ height: `${isPlaying && !activeReveal ? h : 8}px` }}
              className={`w-2 sound-bar transition-all duration-200 ${
                isPlaying && !activeReveal ? 'opacity-90' : 'opacity-20'
              }`}
            />
          ))}
        </div>
        {!activeReveal && state?.preview?.url && (
          <button
            type="button"
            onClick={handleReplay}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-md active:scale-95 ${
              isPlaying
                ? 'border border-emerald-400/40 bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25'
                : 'border border-emerald-400 bg-emerald-400/25 text-emerald-200 hover:scale-105 animate-pulse'
            }`}
          >
            <span>🔁</span>
            <span>{isPlaying ? '처음부터 다시 듣기' : '미리듣기 다시 듣기'}</span>
          </button>
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
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-300 mb-2">
              <span className="animate-spin text-sm">💿</span>
              <span>🖐️ 이번 라운드 출제 곡 카드</span>
            </div>

            <div className="my-2 flex justify-center">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-400/30 flex items-center justify-center text-3xl shadow-inner">
                ❓
              </div>
            </div>

            <h4 className="text-base font-black text-white">음악을 듣고 발매연도를 유추하세요!</h4>
            <p className="font-mono text-lg sm:text-xl font-black text-emerald-300 mt-1">발매연도: ????년</p>

            <div className="mt-3 pt-2.5 border-t border-emerald-400/20 text-[11px] text-emerald-200/90 flex items-center justify-center gap-1.5">
              <span>👉 이 카드를 잡아 아래 타임라인의 올바른 슬롯으로 <strong>드래그 & 드롭</strong>하세요!</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            (터치나 클릭으로도 원하는 위치의 <strong>[ + 배치 ]</strong> 버튼을 눌러 바로 삽입할 수 있습니다)
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
                activeReveal.success !== false
                  ? 'bg-emerald-400/25 text-emerald-300 border border-emerald-400/50'
                  : 'bg-rose-500/25 text-rose-300 border border-rose-500/50'
              }`}
            >
              {activeReveal.success !== false ? (
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
              {activeReveal.success !== false
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
            <button
              type="button"
              onClick={handleSkip}
              disabled={skipping}
              className="liquid-btn-primary px-8 py-3 text-sm font-black flex items-center gap-2.5 shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
            >
              <span>⏭️ 다음 턴으로 넘기기</span>
              <kbd className="hidden sm:inline-block rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-200 border border-emerald-400/30">
                Ctrl + Enter
              </kbd>
            </button>
            <p className="text-[11px] text-slate-400">
              타임라인 모드는 넘기기 버튼이나 <kbd className="font-mono bg-slate-800 px-1 rounded border border-slate-700 text-slate-300">Ctrl+Enter</kbd>를 누를 때까지 대기합니다. 충분히 확인 후 다음 턴을 진행하세요.
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
                  className="w-44 sm:w-48 shrink-0 flex flex-col justify-between p-3.5 rounded-2xl liquid-glass-card border border-slate-700/70 shadow-lg relative group transition-all"
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

      {/* Opponents Overview Section */}
      <section className="pt-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          참가자별 타임라인 현황
        </h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {state?.players.map(player => {
            const count = state?.timelines?.[player.id]?.length ?? 0;
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between rounded-xl px-4 py-2.5 border transition-all ${
                  player.id === turn
                    ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-200'
                    : 'border-slate-700/50 bg-slate-800/40 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
                    {player.name.slice(0, 1)}
                  </div>
                  <span className="text-sm font-medium">
                    {player.name}
                    {player.id === me && <span className="ml-1 text-xs text-emerald-400">(나)</span>}
                    {player.id === turn && (
                      <span className="ml-1.5 rounded bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                        현재 턴
                      </span>
                    )}
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
      </section>
    </section>
  );
}
