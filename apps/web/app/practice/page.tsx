'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { tracks as catalog } from '@/shared/tracks.js';
import { useGame } from '@/lib/game';
import { VolumeControl } from '@/components/volume-control';
import { LiquidSegmentGroup } from '@/components/liquid-segment-group';

type Track = (typeof catalog)[number];

const CATEGORIES = [
  { id: 'kpop_all', label: '🇰🇷 K-Pop 전체' },
  { id: 'pop_all', label: '🌍 Pop 전체' },
  { id: 'jpop_all', label: '🇯🇵 J-Pop 전체' },
  { id: 'kpop_hits', label: '🔥 K-Pop 메가 히트곡' },
  { id: 'kpop_retro', label: '📼 90~2000년대 가요' },
  { id: 'pop_hits', label: '🌐 글로벌 팝송 TOP' },
  { id: 'jpop_hits', label: '🇯🇵 J-Pop 히트곡' },
  { id: 'spotify_random', label: '🎲 완전 랜덤 셔플' },
] as const;

export default function PracticePage() {
  const { mode, toggleMode, connect, volume } = useGame();
  const [selectedCategory, setSelectedCategory] = useState<string>('kpop_hits');

  const filteredTracks = useMemo(() => {
    if (selectedCategory === 'spotify_random') {
      return catalog;
    }
    if (selectedCategory === 'kpop_all') {
      return catalog.filter(t => t.category === 'kpop_hits' || t.category === 'kpop_retro' || t.category === 'kpop_all');
    }
    if (selectedCategory === 'pop_all') {
      return catalog.filter(t => t.category === 'pop_hits' || t.category === 'pop_all');
    }
    if (selectedCategory === 'jpop_all') {
      return catalog.filter(t => t.category === 'jpop_hits' || t.category === 'jpop_all');
    }
    return catalog.filter(t => t.category === selectedCategory);
  }, [selectedCategory]);

  const [selectedTrack, setSelectedTrack] = useState<Track>(filteredTracks[0] || catalog[0]);
  const [playing, setPlaying] = useState(false);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  const pickRandomTrack = () => {
    const pool = catalog;
    const others = pool.filter(t => t.id !== selectedTrack.id);
    const next = others[Math.floor(Math.random() * others.length)] || pool[0];
    if (next) setSelectedTrack(next);
  };

  useEffect(() => {
    connect().catch(() => {});
  }, [connect]);

  // When category changes, select appropriate track
  useEffect(() => {
    if (selectedCategory === 'spotify_random') {
      const pool = catalog;
      const randomPick = pool[Math.floor(Math.random() * pool.length)];
      if (randomPick) setSelectedTrack(randomPick);
    } else if (filteredTracks.length > 0) {
      setSelectedTrack(filteredTracks[0]);
    }
  }, [selectedCategory, filteredTracks]);

  // Reset answer & player state on track change
  useEffect(() => {
    setAnswer('');
    setFeedback('');
    setIsCorrect(false);
    setShowAnswer(false);
    setElapsed(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    }
  }, [selectedTrack]);

  const audioSrc = selectedTrack.previewUrl || `/api/audio/${selectedTrack.id}?title=${encodeURIComponent(selectedTrack.title)}&artist=${encodeURIComponent(selectedTrack.artist)}`;

  // Sync volume changes to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  async function togglePlay() {
    if (!audioRef.current) return;
    try {
      audioRef.current.volume = volume;
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        if (audioRef.current.src !== audioSrc && !audioRef.current.src.endsWith(audioSrc)) {
          audioRef.current.src = audioSrc;
        }
        const p = audioRef.current.play();
        if (p !== undefined) {
          await p;
          setPlaying(true);
        }
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setFeedback('브라우저에서 사운드 자동 재생이 차단되었습니다. 소리를 켜려면 다시 재생 버튼을 눌러주세요.');
      } else {
        setFeedback('음원을 불러오지 못했습니다. 해당 곡의 스트리밍 미리듣기가 제공되지 않습니다.');
      }
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!answer.trim() || busy) return;
    setBusy(true);

    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer, trackId: selectedTrack.id }),
      });
      const result = await response.json();
      setFeedback(result.message || '응답을 확인하지 못했습니다.');
      setIsCorrect(!!result.correct);
      if (result.correct) {
        setShowAnswer(true);
        audioRef.current?.pause();
        setPlaying(false);
      }
    } catch {
      setFeedback('서버 연결에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Floating Header */}
      <header data-liquid-surface className="liquid-glass-pill sticky top-3 sm:top-4 z-40 mb-6 sm:mb-8 flex items-center justify-between px-3.5 py-2.5 sm:px-7 sm:py-4">
        <a href="/" className="flex items-center gap-2 sm:gap-2.5 text-decoration-none min-w-0">
          <img
            src="/icon.svg"
            alt="BeatSync"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl shadow-md shrink-0 object-contain"
          />
          <div className="truncate">
            <h1 className="text-base sm:text-xl font-black tracking-tight truncate">
              Beat<span className="text-emerald-400">Sync</span>
              <span className="ml-1.5 text-xs font-medium text-slate-400 hidden sm:inline">1인 연습 모드</span>
            </h1>
          </div>
        </a>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <VolumeControl />

          <a
            href="/"
            className="rounded-full border border-slate-700/60 bg-slate-800/40 px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            ← 로비로
          </a>



          <button
            onClick={toggleMode}
            type="button"
            aria-label="라이트/다크 모드 전환"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/60 bg-slate-800/40 text-slate-300 hover:text-white transition-all"
          >
            {mode === 'dark' ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="space-y-8">
        <section className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Spotify Free 음원 테스트 지원
          </div>
          <h2 className="text-3xl font-black">1인 음악 퀴즈 연습실</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            원하는 테마의 실제 Spotify & K-Pop 음원을 재생하여 소리를 점검하고, 정답 확인 기능으로 혼자서도 자유롭게 퀴즈를 테스트해보세요.
          </p>
        </section>

        {/* Category Selector Tabs */}
        <div className="flex justify-center">
          <LiquidSegmentGroup
            value={selectedCategory}
            onChange={val => setSelectedCategory(val)}
            options={CATEGORIES.map(cat => ({
              value: cat.id,
              label: cat.label,
            }))}
            accent="emerald"
          />
        </div>

        {/* Track Selector Pills / Random Shuffle Banner */}
        {selectedCategory === 'spotify_random' ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto">
            <div className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-300">
              🎲 무작위 곡 출제 중 (곡 제목 블라인드 처리)
            </div>
            <button
              onClick={pickRandomTrack}
              className="liquid-btn-secondary px-5 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              <span>🎲 새로운 랜덤 곡 뽑기</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
            {filteredTracks.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTrack(t)}
                className={`rounded-full px-4 py-2 text-xs font-semibold border transition-all ${
                  selectedTrack.id === t.id
                    ? 'border-emerald-400 bg-emerald-400/25 text-emerald-200 font-bold shadow-sm'
                    : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>
        )}

        {/* Practice Player Card */}
        <div data-liquid-surface className="liquid-glass-card p-6 sm:p-10 max-w-xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-700/40 pb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              실시간 30초 고음질 스트리밍
            </span>
            <span className="font-mono text-xs text-slate-400">
              {Math.floor(elapsed)}s / 30s
            </span>
          </div>

          {/* Sound Wave Visualizer */}
          <div className="py-2 flex items-center justify-center gap-2">
            {[18, 42, 30, 62, 48, 74, 52, 36, 58, 44, 22].map((h, i) => (
              <span
                key={i}
                style={{ height: `${playing ? h : 8}px` }}
                className={`w-2 sound-bar transition-all duration-150 ${
                  playing ? 'opacity-90 shadow-sm' : 'opacity-25'
                }`}
              />
            ))}
          </div>

          <audio
            ref={audioRef}
            src={audioSrc}
            preload="none"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={() => setElapsed(audioRef.current?.currentTime || 0)}
          />

          {/* Progress Bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-200"
              style={{ width: `${Math.min(100, (elapsed / 30) * 100)}%` }}
            />
          </div>

          {/* Player Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={togglePlay}
              className="liquid-btn-primary px-8 py-3.5 text-sm font-bold flex items-center gap-2"
            >
              <span>{playing ? '⏸ 일시 정지' : '▶ 30초 미리듣기 재생'}</span>
            </button>
            {selectedCategory === 'spotify_random' && (
              <button
                onClick={pickRandomTrack}
                className="liquid-btn-secondary px-5 py-3.5 text-xs font-bold flex items-center gap-1.5"
              >
                <span>🎲 다음 랜덤 곡</span>
              </button>
            )}
            <button
              onClick={() => setShowAnswer(prev => !prev)}
              className="liquid-btn-secondary px-5 py-3.5 text-xs font-bold"
            >
              {showAnswer ? '정답 숨기기' : '🔍 정답 / 곡 정보 확인'}
            </button>
          </div>

          {/* Volume Control */}
          <VolumeControl variant="inline" className="pt-2 border-t border-slate-700/30" />

          {/* Answer Guess Form */}
          <form onSubmit={submit} className="space-y-3 pt-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase">
              곡의 제목이나 가수를 직접 입력해 맞혀보세요
            </label>
            <div className="flex gap-2">
              <input
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                maxLength={100}
                placeholder="제목 또는 가수 이름 입력"
                className="liquid-input flex-1 px-4 py-3 text-sm"
              />
              <button
                disabled={busy || !answer.trim()}
                className="liquid-btn-secondary px-6 py-3 text-sm font-bold disabled:opacity-40"
              >
                {busy ? '확인 중' : '정답 제출'}
              </button>
            </div>
          </form>

          {/* Feedback */}
          {feedback && !showAnswer && (
            <div
              className={`rounded-2xl border p-4 text-center text-xs leading-relaxed ${
                isCorrect
                  ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200 font-bold'
                  : 'border-slate-700 bg-slate-800/60 text-slate-300'
              }`}
            >
              {feedback}
            </div>
          )}

          {/* Detailed Track Reveal Card */}
          {showAnswer && (
            <div className="rounded-3xl border border-emerald-400/40 bg-emerald-400/10 p-6 text-center space-y-4 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
              <span className="inline-block rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-300 uppercase">
                {isCorrect ? '🎉 정답을 맞혔습니다!' : '✦ 곡 상세 정보'}
              </span>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-1">
                {selectedTrack.coverUrl ? (
                  <img
                    src={selectedTrack.coverUrl}
                    alt={selectedTrack.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                    className="h-28 w-28 rounded-2xl object-cover shadow-xl border border-white/20"
                  />
                ) : null}
                <div
                  style={{ display: selectedTrack.coverUrl ? 'none' : 'flex' }}
                  className="h-28 w-28 items-center justify-center rounded-2xl bg-slate-800 text-3xl text-slate-400 border border-slate-700"
                >
                  🎵
                </div>

                <div className="text-center sm:text-left space-y-1">
                  <h4 className="text-xl font-black">{selectedTrack.title}</h4>
                  <p className="text-sm font-semibold text-emerald-300">{selectedTrack.artist}</p>
                  <p className="text-xs text-slate-400">발매: {selectedTrack.year}년</p>

                  {selectedTrack.spotifyUrl && (
                    <div className="pt-2">
                      <a
                        href={selectedTrack.spotifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 underline font-medium"
                      >
                        Spotify에서 곡 열기 ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
