'use client';
import { useEffect, useState } from 'react';
import { useGame, type MusicSource } from '@/lib/game';
import SpeedMode from './speed-mode';
import TimelineMode from './timeline-mode';
import { VolumeControl } from '@/components/volume-control';
import { LiquidSelect } from '@/components/liquid-select';
import { LiquidSegmentGroup } from '@/components/liquid-segment-group';
import { DEFAULT_PRESET_PLAYLISTS } from '@/lib/spotify';

const TARGET_LABEL = { title: '제목만', artist: '가수만', both: '제목 + 가수' } as const;
const MODE_LABEL = { speed: '⚡ 스피드 퀴즈', timeline: '⏳ 타임라인 카드' } as const;

const MUSIC_SOURCE_OPTIONS: { id: MusicSource; label: string; desc: string }[] = [
  { id: 'timeline_all', label: '⏳ 타임라인 올타임 명곡 (1970~2026)', desc: '1970년대부터 2026년 최신곡까지 시대별로 균형 있게 구성된 타임라인 특화 카탈로그' },
  { id: 'kpop_all', label: '🇰🇷 K-Pop 전체', desc: '최신 아이돌부터 레트로 명곡까지 K-Pop 전체 출제' },
  { id: 'pop_all', label: '🌍 Pop 전체', desc: '빌보드 히트곡부터 시대별 명곡까지 글로벌 Pop 전체 출제' },
  { id: 'jpop_all', label: '🇯🇵 J-Pop 전체', desc: 'YOASOBI, 요네즈 켄시, 히게단, 애니메이션 등 J-Pop 전체 출제' },
  { id: 'kpop_hits', label: '🔥 K-Pop 메가 히트곡', desc: '뉴진스, BTS, 아이유, 블랙핑크 등 인기곡' },
  { id: 'kpop_retro', label: '📼 90~2000년대 추억 가요', desc: '서태지, 쿨, god, 이적 등 세대를 초월한 명곡' },
  { id: 'pop_hits', label: '🌐 글로벌 팝송 TOP', desc: 'Bruno Mars, Ed Sheeran, The Weeknd 등' },
  { id: 'jpop_hits', label: '🇯🇵 J-Pop 히트곡', desc: 'YOASOBI, 요네즈 켄시, 히게단, 아이묭 등 인기곡' },
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
  const inGame = inRoom && state.phase !== 'lobby' && state.phase !== 'starting';

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
    <main className={`mx-auto min-h-screen px-4 py-6 sm:px-6 sm:py-10 transition-[max-width] duration-200 ease-out ${
      state?.phase !== 'lobby' && state?.settings.mode === 'timeline'
        ? 'max-w-4xl lg:max-w-6xl xl:max-w-7xl'
        : 'max-w-4xl'
    }`}>
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
              <span className="ml-1.5 text-xs font-medium text-slate-400 hidden sm:inline">비트싱크</span>
            </h1>
          </div>
        </a>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

          <a
            href="/practice"
            className="rounded-full border border-slate-700/60 bg-slate-800/40 px-2.5 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            연습 모드
          </a>

          {/* Volume Control Button */}
          <VolumeControl />


          {/* Theme Toggle Button (Light / Dark) */}
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
            <div data-liquid-surface className="liquid-glass-card p-5 sm:p-6 text-center space-y-3 shadow-xl">
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
                act(() => createRoom(name.trim(), {
                  musicSource: selectedSource,
                  mode: selectedSource === 'timeline_all' ? 'timeline' : 'speed',
                }));
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
          {/* Room Header Card (Apple visionOS Floating Bar) */}
          <section className="liquid-glass-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-6">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              {/* Room Code Display Capsule */}
              <div className="flex-1 sm:flex-initial flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 shadow-inner">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">방 코드</span>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                    <span
                      className={`font-mono text-xl sm:text-3xl font-black tracking-widest text-emerald-400 ${
                        showRoomCode ? '' : 'select-none tracking-[0.2em] sm:tracking-[0.25em]'
                      }`}
                    >
                      {showRoomCode ? state.code : '••••••'}
                    </span>
                    <button
                      type="button"
                      data-liquid-surface
                      onClick={() => setShowRoomCode(prev => !prev)}
                      title={showRoomCode ? '방 코드 숨기기' : '방 코드 보이기'}
                      aria-label={showRoomCode ? '방 코드 숨기기' : '방 코드 보이기'}
                      className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:border-emerald-400/40 transition-colors shadow-sm"
                    >
                      {showRoomCode ? (
                        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      data-liquid-surface
                      onClick={copyRoomCode}
                      title="코드 복사"
                      className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-slate-200 hover:text-white hover:border-emerald-400/40 transition-colors shadow-sm"
                    >
                      {copied ? (
                        <>
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span>복사됨!</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>복사</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3">
              {/* Participant Count Pill */}
              <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-white/[0.04] border border-white/10 shadow-inner">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-sm" />
                <span className="text-[11px] sm:text-xs font-bold text-slate-200">
                  참가자 <span className="text-emerald-400 font-mono font-black">{state.players.length}</span> / 8명
                </span>
              </div>

              {/* Leave Room Action */}
              <button
                type="button"
                data-liquid-surface
                onClick={() => act(leaveRoom)}
                className="rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-bold text-rose-300 transition-colors shadow-sm"
              >
                나가기
              </button>
            </div>
          </section>

          {/* Lobby Settings Card */}
          {(state.phase === 'lobby' || state.phase === 'starting') && (
            <section data-liquid-surface className="liquid-glass-card p-4 sm:p-8 space-y-5 sm:space-y-6">
              {/* Settings Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="apple-glass-badge-icon bg-gradient-to-br from-emerald-500/30 to-teal-500/20 text-emerald-300 border border-emerald-400/30">
                    ⚙️
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">게임 설정</h3>
                    <p className="text-xs text-slate-400">
                      {isHost ? '원하는 게임 모드와 음악 카탈로그를 설정하세요.' : '호스트가 게임 설정을 조정하고 있습니다.'}
                    </p>
                  </div>
                </div>
                {!isHost && (
                  <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-3 py-1 text-xs font-medium text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    호스트 전용 설정
                  </span>
                )}
              </div>

              {/* Setting Inset Rows */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Game Mode */}
                <div className="apple-glass-row">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">⚡</span>
                    <div>
                      <span className="text-[13.5px] font-bold text-slate-200">게임 모드</span>
                      <p className="text-xs text-slate-400">
                        {state.settings.mode === 'speed' ? '곡명/가수를 맞히는 스피드 퀴즈' : '발매 연도순 배치 타임라인 배틀'}
                      </p>
                    </div>
                  </div>
                  <LiquidSegmentGroup
                    value={state.settings.mode}
                    onChange={modeKey => {
                      if (modeKey === 'timeline' && (!state.settings.musicSource || state.settings.musicSource === 'kpop_hits')) {
                        configure({ mode: modeKey, musicSource: 'timeline_all' });
                      } else {
                        configure({ mode: modeKey });
                      }
                    }}
                    disabled={!isHost}
                    options={[
                      { value: 'speed', label: '스피드 퀴즈', icon: '⚡' },
                      { value: 'timeline', label: '타임라인', icon: '🃏' },
                    ]}
                    accent="emerald"
                    className="w-full"
                  />
                </div>

                {/* Music Source */}
                <div className="apple-glass-row">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🎵</span>
                    <div>
                      <span className="text-[13.5px] font-bold text-slate-200">음악 소스</span>
                      <p className="text-xs text-slate-400">Spotify Free 연동 카탈로그</p>
                    </div>
                  </div>
                  <LiquidSelect
                    disabled={!isHost}
                    value={state.settings.musicSource || 'kpop_hits'}
                    onChange={val => {
                      if (val === 'timeline_all' && state.settings.mode !== 'timeline') {
                        configure({ musicSource: val, mode: 'timeline' });
                      } else {
                        configure({ musicSource: val });
                      }
                    }}
                    options={MUSIC_SOURCE_OPTIONS}
                  />
                </div>

                {/* Custom Spotify Playlist URL if selected */}
                {state.settings.musicSource === 'spotify_playlist' && (
                  <div className="apple-glass-row sm:col-span-2 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">🔗</span>
                      <div>
                        <span className="text-[13.5px] font-bold text-slate-200">Spotify 플레이리스트 URL</span>
                        <p className="text-xs text-slate-400">공개 플레이리스트 링크 또는 ID를 입력하거나 아래 추천 목록에서 선택하세요 (로그인 불필요)</p>
                      </div>
                    </div>

                    {/* Quick Preset Playlist Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 mr-1">추천 플레이리스트:</span>
                      {DEFAULT_PRESET_PLAYLISTS.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          disabled={!isHost || busy}
                          onClick={() => {
                            setPlaylistInput(preset.url);
                            handleApplyPlaylist(preset.url);
                          }}
                          className="rounded-lg bg-white/[0.05] hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30 border border-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>

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
                        className="liquid-input flex-1 px-4 py-2.5 text-xs"
                      />
                      {isHost && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleApplyPlaylist()}
                          className="liquid-btn-secondary px-4 py-2 text-xs font-bold shrink-0"
                        >
                          {busy ? '확인 중…' : '적용'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Spotify Random Shuffle Notice */}
                {state.settings.musicSource === 'spotify_random' && (
                  <div className="sm:col-span-2 rounded-2xl border border-emerald-300 dark:border-emerald-400/25 bg-emerald-100/70 dark:bg-emerald-400/10 p-3.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5 backdrop-blur-sm shadow-sm">
                    <span className="text-lg shrink-0">🎲</span>
                    <div className="leading-relaxed">
                      <strong className="font-black text-emerald-950 dark:text-white">완전 랜덤 셔플 활성화:</strong> K-Pop, Pop, J-Pop 등 모든 장르와 연대를 무작위로 혼합하여 매 라운드 예측 불가능한 문제가 출제됩니다!
                    </div>
                  </div>
                )}

                {/* Timeline Mode Curated Catalog Notice */}
                {state.settings.musicSource === 'timeline_all' && (
                  <div className="sm:col-span-2 rounded-2xl border border-sky-300 dark:border-sky-400/25 bg-sky-100/70 dark:bg-sky-400/10 p-3.5 text-xs text-sky-900 dark:text-sky-200 flex items-center gap-2.5 backdrop-blur-sm shadow-sm">
                    <span className="text-lg shrink-0">⏳</span>
                    <div className="leading-relaxed">
                      <strong className="font-black text-sky-950 dark:text-white">타임라인 특화 카탈로그:</strong> 1970년대 전설의 명곡부터 80·90 레트로, 2000·2010 명곡, 2026 최신곡까지 6개 시대의 음악이 매 라운드 고르게 순환 출제되어 연도 맞추기에 최적화되었습니다!
                    </div>
                  </div>
                )}

                {/* Speed Mode Options */}
                {state.settings.mode === 'speed' && (
                  <>
                    {/* Answer Criteria */}
                    <div className="apple-glass-row">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">🎯</span>
                        <div>
                          <span className="text-[13.5px] font-bold text-slate-200">정답 판정 기준</span>
                          <p className="text-xs text-slate-400">채점 대상 (노래 제목 / 가수)</p>
                        </div>
                      </div>
                      <LiquidSegmentGroup
                        value={state.settings.target}
                        onChange={targetKey => configure({ target: targetKey })}
                        disabled={!isHost}
                        options={[
                          { value: 'title', label: '노래 제목' },
                          { value: 'artist', label: '가수 이름' },
                          { value: 'both', label: '제목 + 가수' },
                        ]}
                        accent="emerald"
                        className="w-full"
                      />
                    </div>

                    {/* Preview Snippet Duration */}
                    <div className="apple-glass-row">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">⏱️</span>
                        <div>
                          <span className="text-[13.5px] font-bold text-slate-200">미리듣기 재생 시간</span>
                          <p className="text-xs text-slate-400">한 라운드 당 음원 재생 길이</p>
                        </div>
                      </div>
                      <LiquidSegmentGroup
                        value={state.settings.snippetSeconds}
                        onChange={s => configure({ snippetSeconds: s })}
                        disabled={!isHost}
                        options={[
                          { value: 5, label: '5초' },
                          { value: 15, label: '15초' },
                          { value: 30, label: '30초' },
                        ]}
                        accent="emerald"
                        className="w-full"
                      />
                    </div>

                    {/* Total Rounds */}
                    <div className="apple-glass-row sm:col-span-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">🏆</span>
                        <div>
                          <span className="text-[13.5px] font-bold text-slate-200">총 라운드 수</span>
                          <p className="text-xs text-slate-400">전체 게임 진행 문제 수</p>
                        </div>
                      </div>
                      <LiquidSegmentGroup
                        value={state.settings.rounds}
                        onChange={r => configure({ rounds: r })}
                        disabled={!isHost}
                        options={[
                          { value: 10, label: '10곡' },
                          { value: 20, label: '20곡' },
                          { value: 30, label: '30곡' },
                          { value: 50, label: '50곡' },
                          { value: 100, label: '100곡' },
                        ]}
                        accent="emerald"
                        className="w-full"
                      />
                    </div>
                  </>
                )}

                {/* Timeline Mode Options */}
                {state.settings.mode === 'timeline' && (
                  <>
                    <div className="apple-glass-row sm:col-span-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">🃏</span>
                          <div>
                            <span className="text-[13.5px] font-bold text-slate-200">타임라인 승리 목표 카드 수</span>
                            <p className="text-xs text-slate-400">먼저 목표를 달성한 플레이어가 승리</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-400">
                          (8 ~ 20장)
                        </span>
                      </div>
                      <div className="relative pt-1 pb-1">
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
                          className="w-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {/* Live value badge moving directly below the slider thumb */}
                        <div className="relative w-full h-8 pt-1 select-none pointer-events-none">
                          <div
                            className="absolute -translate-x-1/2 flex flex-col items-center transition-all duration-75"
                            style={{
                              left: `calc(${((timelineTargetCards - 8) / (20 - 8)) * 100}% + ${(0.5 - ((timelineTargetCards - 8) / (20 - 8))) * 18}px)`,
                            }}
                          >
                            <div className="w-2 h-2 rotate-45 bg-emerald-500/90 -mb-1 shadow-sm" />
                            <span className="rounded-full bg-emerald-400 dark:bg-emerald-500/90 backdrop-blur-md px-3 py-0.5 font-mono text-xs font-bold text-emerald-950 dark:text-white shadow-lg border border-emerald-500/40 dark:border-white/20 whitespace-nowrap">
                              {timelineTargetCards}장
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Preview Snippet Duration */}
                    <div className="apple-glass-row sm:col-span-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">⏱️</span>
                        <div>
                          <span className="text-[13.5px] font-bold text-slate-200">미리듣기 재생 시간</span>
                          <p className="text-xs text-slate-400">한 턴 당 음원 재생 길이 (종료 후에도 60초 타이머 동안 유추 가능)</p>
                        </div>
                      </div>
                      <LiquidSegmentGroup
                        value={state.settings.snippetSeconds || 15}
                        onChange={s => configure({ snippetSeconds: s })}
                        disabled={!isHost}
                        options={[
                          { value: 5, label: '5초' },
                          { value: 15, label: '15초' },
                          { value: 30, label: '30초' },
                        ]}
                        accent="emerald"
                        className="w-full"
                      />
                    </div>

                    <div className="sm:col-span-2 rounded-2xl border border-sky-300 dark:border-sky-400/20 bg-sky-100/70 dark:bg-sky-400/5 p-4 text-xs leading-relaxed text-sky-900 dark:text-sky-200/90 backdrop-blur-sm shadow-sm">
                      💡 <strong className="font-black text-sky-950 dark:text-white">타임라인 모드 규칙</strong>: 플레이어는 시작 카드 2장(발매연도 공개)으로 시작합니다. 매 턴 노래를 듣고 내 타임라인 카드 사이의 올바른 연대순 슬롯을 선택해 먼저 <strong className="font-black text-sky-950 dark:text-white">{timelineTargetCards}장</strong>을 채우는 사람이 승리합니다!
                    </div>
                  </>
                )}

                {/* Personal Volume Setting */}
                <div className="sm:col-span-2 pt-1 border-t border-white/10">
                  <VolumeControl variant="inline" />
                </div>
              </div>

              {/* Player Roster - Living Liquid Glass Cards */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👥</span>
                    <h4 className="text-[13px] font-bold text-slate-300 uppercase tracking-wider">참가자 목록</h4>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {state.players.filter(p => p.connected).length}명 접속 중
                  </span>
                </div>
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {state.players.map(player => (
                    <li
                      key={player.id}
                      className="apple-glass-player-card"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="player-avatar relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/15 to-white/5 border border-white/20 text-xs font-bold text-white shadow-inner">
                          {player.name.slice(0, 1)}
                          {player.id === state.hostId && (
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[9px] text-amber-950 font-black shadow-sm" title="방장">
                              ★
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="player-name truncate text-[13.5px] font-bold text-slate-100">
                              {player.name}
                            </span>
                            {player.id === me && (
                              <span className="shrink-0 text-xs font-bold text-emerald-400">(나)</span>
                            )}
                          </div>
                          <span className="player-role text-xs text-slate-400">
                            {player.id === state.hostId ? '방장 (호스트)' : '참가자'}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 pl-2">
                        {player.connected ? (
                          <span className="player-status-ready inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/25 text-xs font-semibold text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-sm" />
                            준비 완료
                          </span>
                        ) : (
                          <span className="player-status-waiting inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-xs font-semibold text-amber-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            재접속 대기
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Start Game Action */}
              {isHost ? (
                <button
                  type="button"
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
                  disabled={busy || state.phase === 'starting' || state.players.filter(p => p.connected).length < 1}
                  className="liquid-btn-primary w-full py-4 text-base font-black disabled:opacity-50 shadow-lg cursor-pointer flex items-center justify-center gap-2.5 transition-all disabled:cursor-not-allowed"
                >
                  {(busy || state.phase === 'starting') ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>게임 준비 및 음원 로딩 중...</span>
                    </>
                  ) : (
                    <>
                      <span>🎮</span>
                      <span>
                        {state.players.filter(p => p.connected).length < 1
                          ? '플레이어가 연결되어 있지 않습니다'
                          : state.players.filter(p => p.connected).length === 1
                          ? '1인 솔로 모드로 게임 시작하기'
                          : `게임 시작하기 (${state.players.filter(p => p.connected).length}명)`}
                      </span>
                    </>
                  )}
                </button>
              ) : (
                state.phase === 'starting' ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md p-4 text-center text-xs sm:text-sm font-bold text-emerald-300 flex items-center justify-center gap-2.5 shadow-inner">
                    <svg className="animate-spin h-5 w-5 text-emerald-400 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>호스트가 게임을 시작했습니다! 라운드를 준비하고 있습니다...</span>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-4 text-center text-xs text-slate-300 flex items-center justify-center gap-2 shadow-inner">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>호스트가 게임을 시작할 때까지 잠시만 기다려주세요…</span>
                  </div>
                )
              )}
            </section>
          )}

          {/* Active Game Modes */}
          {state.phase !== 'lobby' && state.phase !== 'starting' && (
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
