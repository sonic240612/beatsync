'use client';
import { useEffect, useState } from 'react';
import { useGame, type MusicSource } from '@/lib/game';
import SpeedMode from './speed-mode';
import TimelineMode from './timeline-mode';
import { VolumeControl } from '@/components/volume-control';
import { LiquidSelect } from '@/components/liquid-select';

const TARGET_LABEL = { title: '제목만', artist: '가수만', both: '제목 + 가수' } as const;
const MODE_LABEL = { speed: '⚡ 스피드 퀴즈', timeline: '⏳ 타임라인 카드' } as const;

const MUSIC_SOURCE_OPTIONS: { id: MusicSource; label: string; desc: string }[] = [
  { id: 'kpop_all', label: '🇰🇷 K-Pop 전체', desc: '최신 아이돌부터 레트로 명곡까지 K-Pop 전체 출제' },
  { id: 'pop_all', label: '🌍 Pop 전체', desc: '빌보드 히트곡부터 시대별 명곡까지 글로벌 Pop 전체 출제' },
  { id: 'jpop_all', label: '🇯🇵 J-Pop 전체', desc: 'YOASOBI, 요네즈 켄시, 히게단, 애니메이션 등 J-Pop 전체 출제' },
  { id: 'kpop_hits', label: '🔥 K-Pop 메가 히트곡', desc: '뉴진스, BTS, 아이유, 블랙핑크 등 인기곡' },
  { id: 'kpop_retro', label: '📼 90~2000년대 추억 가요', desc: '서태지, 쿨, god, 이적 등 세대를 초월한 명곡' },
  { id: 'pop_hits', label: '🌐 글로벌 팝송 TOP', desc: 'Bruno Mars, Ed Sheeran, The Weeknd 등' },
  { id: 'spotify_random', label: '🎲 Spotify 완전 랜덤 셔플', desc: '장르/시대 구분 없이 무작위로 출제되는 익스트림 퀴즈' },
  { id: 'spotify_playlist', label: '🔗 Spotify 플레이리스트', desc: 'Spotify 공개 플레이리스트 URL 입력' },
];

export default function Home() {
  const {
    state,
    over,
    me,
    mode,
    toggleMode,
    connect,
    createRoom,
    joinRoom,
    leaveRoom,
    configure,
    start,
    reset,
    addToast,
  } = useGame();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [selectedSource, setSelectedSource] = useState<MusicSource>('kpop_hits');
  const [playlistInput, setPlaylistInput] = useState('');
  const [timelineTargetCards, setTimelineTargetCards] = useState<number>(10);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRoomCode, setShowRoomCode] = useState(false);

  useEffect(() => {
    connect().catch(() => {});
  }, [connect]);

  useEffect(() => {
    const stored = localStorage.getItem('beatsync-name');
    if (stored) setName(stored);
  }, []);

  useEffect(() => {
    setShowRoomCode(false);
  }, [state?.code]);

  useEffect(() => {
    if (state?.settings?.playlistUrl && !playlistInput) {
      setPlaylistInput(state.settings.playlistUrl);
    }
  }, [state?.settings?.playlistUrl]);

  useEffect(() => {
    if (typeof state?.settings?.targetCards === 'number') {
      setTimelineTargetCards(state.settings.targetCards);
    }
  }, [state?.settings?.targetCards]);

  const saveName = (value: string) => {
    setName(value);
    localStorage.setItem('beatsync-name', value);
  };

  const inRoom = !!state;
  const isHost = !!state && state.hostId === me;
  const inGame = inRoom && state.phase !== 'lobby';

  async function act<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (busy) return undefined;
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  }

  const handleApplyPlaylist = async (customUrl?: string) => {
    const trimmed = (customUrl !== undefined ? customUrl : playlistInput).trim();
    if (!trimmed) {
      addToast('Spotify 플레이리스트 URL 또는 ID를 입력해주세요.', 'warning');
      return;
    }
    const ok = await act(async () => {
      return await configure({
        playlistUrl: trimmed,
        musicSource: 'spotify_playlist',
      });
    });
    if (ok) {
      addToast('Spotify 플레이리스트가 성공적으로 적용되었습니다!', 'success');
    }
  };

  const copyRoomCode = () => {
    if (state?.code) {
      navigator.clipboard?.writeText(state.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Floating Header */}
      <header data-liquid-surface className="liquid-glass-pill sticky top-4 z-40 mb-8 flex items-center justify-between px-5 py-3 sm:px-7 sm:py-4">
        <a href="/" className="flex items-center gap-2.5 text-decoration-none">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-black shadow-md">
            BS
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight sm:text-xl">
              Beat<span className="text-emerald-400">Sync</span>
              <span className="ml-2 text-xs font-medium text-slate-400">비트싱크</span>
            </h1>
          </div>
        </a>

        <div className="flex items-center gap-2 sm:gap-3">

          <a
            href="/practice"
            className="rounded-full border border-slate-700/60 bg-slate-800/40 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            연습 모드
          </a>

          {/* Volume Control Button */}
          <VolumeControl />

          {/* Theme Toggle Button */}
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

      {/* Landing: Not In Room */}
      {!inRoom && (
        <div className="space-y-8">
          {/* Hero Banner */}
          <section className="text-center py-4 sm:py-8 space-y-3">
            <span className="inline-block rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-emerald-300 uppercase">
              실시간 음악 퀴즈 & 타임라인 배틀
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              들리는 순간,<br />
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                비트와 함께 맞춰봐.
              </span>
            </h2>
            <p className="max-w-xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed">
              실시간 음악 퀴즈와 발매연도 타임라인 카드 배치 게임. 친구들과 방을 만들어 지금 바로 승부하세요!
            </p>
          </section>

          {/* Centered Unified Single Nickname Card */}
          <div className="max-w-md mx-auto w-full">
            <div data-liquid-surface className="liquid-glass-card p-5 sm:p-6 text-center space-y-3 shadow-xl border border-slate-700/60">
              <label htmlFor="unified-nickname" className="block text-xs sm:text-sm font-bold tracking-wider text-slate-300 uppercase">
                👤 내 닉네임 설정
              </label>
              <div className="relative max-w-xs mx-auto">
                <input
                  id="unified-nickname"
                  value={name}
                  onChange={e => saveName(e.target.value)}
                  maxLength={20}
                  required
                  placeholder="플레이어 닉네임 입력"
                  className="liquid-input w-full px-4 py-3 text-center text-base sm:text-lg font-black tracking-wide shadow-inner placeholder:text-slate-500 placeholder:font-normal"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                닉네임을 입력한 후 아래에서 방을 만들거나 코드로 입장하세요.
              </p>
            </div>
          </div>

          {/* Action Cards (No duplicate nickname fields) */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Create Room */}
            <form
              onSubmit={event => {
                event.preventDefault();
                if (!name.trim()) {
                  addToast('먼저 닉네임을 입력해주세요.', 'warning');
                  return;
                }
                act(() => createRoom(name.trim(), { musicSource: selectedSource }));
              }}
              data-liquid-surface
              className="liquid-glass-card p-6 sm:p-8 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-emerald-400">✦</span> 방 만들기
                </h3>
                <p className="mt-1 text-xs text-slate-400">호스트가 되어 게임 모드와 음악을 선택합니다.</p>

                <div className="mt-5">
                  <label className="block text-xs font-semibold tracking-wide text-slate-300 uppercase mb-1.5">
                    시작 음악 테마
                  </label>
                  <LiquidSelect
                    value={selectedSource}
                    onChange={setSelectedSource}
                    options={MUSIC_SOURCE_OPTIONS}
                  />
                </div>
              </div>

              <button
                disabled={busy || !name.trim()}
                className="liquid-btn-primary mt-6 w-full py-3.5 text-sm disabled:opacity-40"
              >
                {busy ? '방 생성 중…' : '방 만들고 입장하기'}
              </button>
            </form>

            {/* Join Room */}
            <form
              onSubmit={event => {
                event.preventDefault();
                if (!name.trim()) {
                  addToast('먼저 닉네임을 입력해주세요.', 'warning');
                  return;
                }
                if (!code.trim()) {
                  addToast('6자리 방 코드를 입력해주세요.', 'warning');
                  return;
                }
                act(() => joinRoom(name.trim(), code.trim()));
              }}
              data-liquid-surface
              className="liquid-glass-card p-6 sm:p-8 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-cyan-400">#</span> 코드로 입장
                </h3>
                <p className="mt-1 text-xs text-slate-400">친구가 공유한 6자리 방 코드를 입력하세요.</p>

                <div className="mt-5">
                  <label className="block text-xs font-semibold tracking-wide text-slate-300 uppercase">
                    6자리 방 코드
                    <input
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      required
                      placeholder="예: 7A3F9C"
                      className="liquid-input mt-1.5 w-full px-4 py-3 text-sm font-mono uppercase tracking-widest text-center"
                    />
                  </label>
                </div>
              </div>

              <button
                disabled={busy || !name.trim() || !code.trim()}
                className="liquid-btn-secondary mt-6 w-full py-3.5 text-sm font-bold disabled:opacity-40"
              >
                {busy ? '입장 중…' : '방 입장하기'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* In-Room View */}
      {inRoom && (
        <div className="space-y-6">
          {/* Room Header Pill */}
          <section data-liquid-surface className="liquid-glass-card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">방 코드</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`font-mono text-3xl font-black tracking-widest text-emerald-400 ${
                      showRoomCode ? '' : 'select-none'
                    }`}
                  >
                    {showRoomCode ? state.code : '•'.repeat(state.code?.length || 6)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRoomCode(prev => !prev)}
                    title={showRoomCode ? '방 코드 숨기기' : '방 코드 보이기'}
                    aria-label={showRoomCode ? '방 코드 숨기기' : '방 코드 보이기'}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white hover:border-emerald-400/50 transition-colors"
                  >
                    {showRoomCode ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={copyRoomCode}
                    title="코드 복사"
                    className="rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs text-slate-300 hover:text-white transition-colors"
                  >
                    {copied ? '복사됨!' : '복사'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-xs text-slate-400">참가 인원</span>
                <p className="text-base font-bold text-slate-200">{state.players.length} / 8명</p>
              </div>
              <button
                onClick={() => act(leaveRoom)}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors"
              >
                나가기
              </button>
            </div>
          </section>

          {/* Lobby Settings Card */}
          {state.phase === 'lobby' && (
            <section data-liquid-surface className="liquid-glass-card p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/50 pb-4">
                <div>
                  <h3 className="text-lg font-bold">게임 설정</h3>
                  <p className="text-xs text-slate-400">
                    {isHost ? '원하는 게임 모드와 음악 카탈로그를 설정하세요.' : '호스트가 설정을 변경하고 있습니다.'}
                  </p>
                </div>
                {!isHost && (
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                    호스트 전용 설정
                  </span>
                )}
              </div>

              {/* Setting Controls */}
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Game Mode */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase">게임 모드</label>
                  <div className="mt-2 flex gap-2">
                    {(['speed', 'timeline'] as const).map(modeKey => (
                      <button
                        key={modeKey}
                        disabled={!isHost || busy}
                        onClick={() => act(() => configure({ mode: modeKey }))}
                        className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                          state.settings.mode === modeKey
                            ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300 shadow-sm'
                            : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {MODE_LABEL[modeKey]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Music Source */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                    음악 소스 (Spotify Free 연동)
                  </label>
                  <LiquidSelect
                    disabled={!isHost || busy}
                    value={state.settings.musicSource || 'kpop_hits'}
                    onChange={val => {
                      act(() => configure({ musicSource: val }));
                    }}
                    options={MUSIC_SOURCE_OPTIONS}
                  />
                </div>

                {/* Custom Spotify Playlist URL if selected */}
                {state.settings.musicSource === 'spotify_playlist' && (
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase">
                      Spotify 플레이리스트 설정
                    </label>
                    <div className="flex gap-2">
                      <input
                        disabled={!isHost || busy}
                        value={playlistInput}
                        onChange={e => setPlaylistInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyPlaylist();
                          }
                        }}
                        placeholder="https://open.spotify.com/playlist/... 또는 플레이리스트 ID"
                        className="liquid-input flex-1 px-4 py-2 text-xs"
                      />
                      {isHost && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleApplyPlaylist()}
                          className="liquid-btn-secondary px-4 py-2 text-xs font-bold"
                        >
                          {busy ? '확인 중…' : '적용'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Spotify Random Shuffle Notice */}
                {state.settings.musicSource === 'spotify_random' && (
                  <div className="sm:col-span-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2.5">
                    <span className="text-base shrink-0">🎲</span>
                    <div className="leading-relaxed">
                      <strong>완전 랜덤 셔플 활성화:</strong> 모든 장르(K-Pop, 팝송, 레트로 등)와 시대를 무작위로 섞어 매 라운드 예측 불가능한 문제가 출제됩니다!
                    </div>
                  </div>
                )}

                {/* Speed Mode Options */}
                {state.settings.mode === 'speed' && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 uppercase">정답 판정 기준</label>
                      <div className="mt-2 flex gap-2">
                        {(['title', 'artist', 'both'] as const).map(targetKey => (
                          <button
                            key={targetKey}
                            disabled={!isHost || busy}
                            onClick={() => act(() => configure({ target: targetKey }))}
                            className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition-all ${
                              state.settings.target === targetKey
                                ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300'
                                : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {TARGET_LABEL[targetKey]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 uppercase">라운드 수</label>
                      <div className="mt-2 flex gap-2">
                        {[10, 20, 30].map(r => (
                          <button
                            key={r}
                            disabled={!isHost || busy}
                            onClick={() => act(() => configure({ rounds: r }))}
                            className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition-all ${
                              state.settings.rounds === r
                                ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300'
                                : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {r}곡
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 uppercase">미리듣기 재생 시간</label>
                      <div className="mt-2 flex gap-2">
                        {[5, 15, 30].map(s => (
                          <button
                            key={s}
                            disabled={!isHost || busy}
                            onClick={() => act(() => configure({ snippetSeconds: s }))}
                            className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition-all ${
                              state.settings.snippetSeconds === s
                                ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300'
                                : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {s}초
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {state.settings.mode === 'timeline' && (
                  <>
                    <div className="sm:col-span-2 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label htmlFor="timeline-target-cards" className="text-xs font-semibold text-slate-300 uppercase">
                          🃏 타임라인 승리 목표 카드 수
                        </label>
                        <span className="rounded-xl bg-emerald-400/20 border border-emerald-400/40 px-3 py-1 font-mono text-sm font-black text-emerald-300">
                          {timelineTargetCards}장
                        </span>
                      </div>
                      <input
                        id="timeline-target-cards"
                        type="range"
                        min={8}
                        max={20}
                        step={1}
                        disabled={!isHost}
                        value={timelineTargetCards}
                        onChange={e => {
                          const nextVal = Number(e.target.value);
                          setTimelineTargetCards(nextVal);
                          if (isHost) {
                            configure({ targetCards: nextVal });
                          }
                        }}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>최소 8장</span>
                        <span>기본 10장</span>
                        <span>15장</span>
                        <span>최대 20장</span>
                      </div>
                    </div>

                    <div className="sm:col-span-2 rounded-2xl border border-blue-400/20 bg-blue-400/5 p-4 text-xs leading-5 text-blue-300">
                      💡 <strong>타임라인 모드 규칙</strong>: 플레이어는 시작 카드 2장(발매연도 공개)으로 시작합니다. 매 턴 노래를 듣고 내 타임라인 카드 사이의 올바른 연대순 슬롯을 선택해 먼저 <strong>{timelineTargetCards}장</strong>을 채우는 사람이 승리합니다!
                    </div>
                  </>
                )}

                {/* Personal Volume Setting */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-700/40">
                  <VolumeControl variant="inline" />
                </div>
              </div>

              {/* Player Roster */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase mb-3">참가자 목록</h4>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {state.players.map(player => (
                    <li
                      key={player.id}
                      className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/50 px-4 py-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
                          {player.name.slice(0, 1)}
                        </div>
                        <span className="text-sm font-medium">
                          {player.name}
                          {player.id === me && <span className="ml-1 text-xs text-emerald-400">(나)</span>}
                          {player.id === state.hostId && (
                            <span className="ml-1.5 rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                              호스트
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {player.connected ? (
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 준비 완료
                          </span>
                        ) : (
                          <span className="text-amber-400">재접속 대기</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Start Game Action */}
              {isHost ? (
                <button
                  onClick={() =>
                    act(async () => {
                      if (state.settings.musicSource === 'spotify_playlist') {
                        const trimmed = playlistInput.trim();
                        if (trimmed && trimmed !== state.settings.playlistUrl) {
                          const ok = await configure({
                            playlistUrl: trimmed,
                            musicSource: 'spotify_playlist',
                          });
                          if (!ok) return false;
                        }
                      }
                      return await start();
                    })
                  }
                  disabled={busy || state.players.filter(p => p.connected).length < 1}
                  className="liquid-btn-primary w-full py-4 text-base font-black disabled:opacity-40"
                >
                  {state.players.filter(p => p.connected).length < 1
                    ? '플레이어가 연결되어 있지 않습니다'
                    : state.players.filter(p => p.connected).length === 1
                    ? '🎮 1인 솔로 모드로 게임 시작하기'
                    : `🎮 게임 시작하기 (${state.players.filter(p => p.connected).length}명)`}
                </button>
              ) : (
                <div className="rounded-2xl border border-slate-700/40 bg-slate-800/20 p-4 text-center text-xs text-slate-400">
                  호스트가 게임을 시작할 때까지 잠시만 기다려주세요.
                </div>
              )}
            </section>
          )}

          {/* Active Game Modes */}
          {state.phase !== 'lobby' && (
            state.settings.mode === 'speed' ? <SpeedMode /> : <TimelineMode />
          )}

          {/* Reset to Lobby */}
          {over && isHost && (
            <button
              onClick={() => act(reset)}
              className="liquid-btn-secondary w-full py-3.5 text-sm font-bold"
            >
              새로운 게임을 위해 로비로 돌아가기
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="mt-14 border-t border-slate-800/60 pt-6 text-center text-xs leading-6 text-slate-500">
        BeatSync · Spotify Web API & Universal 30s Audio Engine · 실시간 음악 퀴즈 파티
      </footer>
    </main>
  );
}
