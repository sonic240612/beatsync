'use client';
import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';

export type Player = { id: string; name: string; connected: boolean };
export type MusicSource = 'kpop_hits' | 'kpop_retro' | 'kpop_all' | 'pop_hits' | 'jpop_hits' | 'pop_all' | 'jpop_all' | 'spotify_playlist' | 'spotify_random';

export type Settings = {
  mode: 'speed' | 'timeline';
  target: 'title' | 'artist' | 'both';
  rounds: number;
  targetCards?: number;
  snippetSeconds: number;
  musicSource?: MusicSource;
  playlistUrl?: string;
  spotifyUserToken?: string;
  preferredGenres?: string[];
};

export type Track = {
  id: string;
  title: string;
  artist: string;
  year: number;
  coverUrl?: string;
  spotifyUrl?: string;
  aliases?: { title?: string[]; artist?: string[] };
  displayTitle?: string;
  displayArtist?: string;
  rawTitle?: string;
  rawArtist?: string;
};

export type TimelineEntry = {
  trackId: string;
  year: number;
  title?: string;
  artist?: string;
  coverUrl?: string;
  spotifyUrl?: string;
  displayTitle?: string;
  displayArtist?: string;
  rawTitle?: string;
  rawArtist?: string;
};

export type RoundSolvers = {
  title?: { playerId: string; playerName: string } | null;
  artist?: { playerId: string; playerName: string } | null;
};

export type RoomState = {
  code: string;
  phase: 'lobby' | 'playing' | 'reveal' | 'finished';
  hostId: string;
  settings: Settings;
  players: Player[];
  scores?: Record<string, number>;
  roundId?: number;
  endsAt?: number;
  turn?: string;
  track?: Track;
  preview?: { url: string; startSeconds: number };
  solvers?: RoundSolvers;
  reveal?: Reveal;
  timelines?: Record<string, TimelineEntry[]>;
};

export type Reveal = {
  roundId: number;
  winnerId: string | null;
  winnerName?: string;
  turnPlayerId?: string;
  turnPlayerName?: string;
  solvers?: RoundSolvers;
  track: Track;
  scores: Record<string, number>;
  success?: boolean;
  skipped?: boolean;
  revealEndsAt?: number;
};

export type ToastMessage = {
  id: string;
  message: string;
  type?: 'title' | 'artist' | 'info' | 'error' | 'warning' | 'success';
};

export type Over = {
  winnerId?: string;
  scores: Record<string, number>;
  timelines?: Record<string, TimelineEntry[]>;
};

const SESSION_KEY = 'beatsync-session';
const THEME_KEY = 'beatsync-theme-mode';
const VOLUME_KEY = 'beatsync-volume';
const DEFAULT_VOLUME = 0.05; // 5% default volume

type Session = { code: string; playerId: string; token: string };

function readSession(): Session | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

type Store = {
  socket: Socket | null;
  me: string | null;
  state: RoomState | null;
  reveal: Reveal | null;
  over: Over | null;
  error: string;
  mode: 'light' | 'dark';
  volume: number;
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
  setMode: (mode: 'light' | 'dark') => void;
  toggleMode: () => void;
  setVolume: (volume: number) => void;
  connect: () => Promise<void>;
  createRoom: (name: string, options?: { musicSource?: MusicSource }) => Promise<boolean>;
  joinRoom: (name: string, code: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  configure: (settings: Partial<Settings>) => Promise<boolean>;
  start: () => Promise<boolean>;
  answer: (roundId: number, guessOrTitle: string, legacyArtist?: string) => Promise<boolean>;
  insert: (roundId: number, index: number) => Promise<boolean>;
  skip: () => Promise<boolean>;
  reset: () => Promise<boolean>;
  clearError: () => void;
  request: (event: string, payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string; [key: string]: unknown } | null>;
};

export const useGame = create<Store>((set, get) => ({
  socket: null,
  me: null,
  state: null,
  reveal: null,
  over: null,
  error: '',
  mode: 'dark',
  volume: DEFAULT_VOLUME,
  toasts: [],

  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set(prev => ({ toasts: [...prev.toasts, { id, message, type }] }));
    const duration = type === 'error' || type === 'warning' ? 2200 : 3000;
    setTimeout(() => {
      get().removeToast(id);
    }, duration);
  },

  removeToast: id => {
    set(prev => ({ toasts: prev.toasts.filter(t => t.id !== id) }));
  },

  setMode: mode => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, mode);
      document.body.dataset.mode = mode;
    }
    set({ mode });
  },

  toggleMode: () => {
    const next = get().mode === 'dark' ? 'light' : 'dark';
    get().setMode(next);
  },

  setVolume: volume => {
    const clamped = Math.max(0, Math.min(1, Math.round(volume * 100) / 100));
    if (typeof window !== 'undefined') {
      localStorage.setItem(VOLUME_KEY, String(clamped));
    }
    set({ volume: clamped });
  },

  clearError: () => set({ error: '' }),

  connect: () =>
    new Promise((resolve) => {
      // initialize theme mode and volume
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(THEME_KEY);
        const initial = saved === 'light' || saved === 'dark' ? saved : 'dark';
        document.body.dataset.mode = initial;
        document.body.dataset.theme = 'liquid-glass';
        set({ mode: initial });

        const savedVol = localStorage.getItem(VOLUME_KEY);
        if (savedVol !== null) {
          const parsed = parseFloat(savedVol);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
            set({ volume: parsed });
          }
        } else {
          localStorage.setItem(VOLUME_KEY, String(DEFAULT_VOLUME));
          set({ volume: DEFAULT_VOLUME });
        }
      }

      const existing = get().socket;
      if (existing?.connected) return resolve();
      const url = process.env.NEXT_PUBLIC_GAME_URL || 'http://127.0.0.1:3001';
      const socket = existing ?? io(url, { transports: ['websocket'], reconnection: true });

      socket.on('connect', () => {
        set({ socket, error: '' });
        const session = readSession();
        if (!session) return;
        socket.timeout(5000).emit('room:resume', session, (result: { ok: boolean; state?: RoomState } | undefined) => {
          if (result?.ok && result.state) set({ me: session.playerId, state: result.state });
          else if (result && !result.ok && typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY);
        });
      });

      socket.on('round:part_solved', (data: { type: 'title' | 'artist'; playerId: string; playerName: string; title?: string; artist?: string; scores: Record<string, number>; solvers: RoundSolvers }) => {
        const msg = data.type === 'title'
          ? `${data.playerName}님이 제목을 맞추셨습니다!`
          : `${data.playerName}님이 가수를 맞추셨습니다!`;
        get().addToast(msg, data.type);
        set(prev => {
          if (!prev.state) return prev;
          return {
            state: {
              ...prev.state,
              scores: data.scores,
              solvers: data.solvers,
            },
          };
        });
      });

      socket.on('room:state', (state: RoomState) => {
        set(prev => {
          const nextReveal = state.phase === 'playing' || state.phase === 'lobby'
            ? null
            : (state.reveal ?? prev.reveal ?? null);
          return {
            state,
            reveal: nextReveal,
          };
        });
      });

      socket.on('round:next', (round: RoomState) => {
        const current = get().state;
        set({
          state: current ? { ...current, ...round, phase: 'playing' } : round,
          reveal: null,
          over: null,
        });
      });

      socket.on('round:reveal', (reveal: Reveal) => {
        set(prev => ({
          reveal,
          state: prev.state ? { ...prev.state, phase: 'reveal', scores: reveal.scores, track: reveal.track } : null,
        }));

        // If in timeline mode, trigger toast for placement success/failure
        const state = get().state;
        if (state?.settings.mode === 'timeline') {
          const me = get().me;
          const isMe = reveal.turnPlayerId === me;
          if (reveal.success !== false) {
            get().addToast(
              isMe ? '정답입니다! 카드를 내 타임라인에 안전하게 보관했습니다.' : `${reveal.turnPlayerName || '플레이어'}님이 올바른 연대순으로 카드를 맞추셨습니다!`,
              'success'
            );
          } else {
            get().addToast(
              isMe ? '연대순이 일치하지 않아 카드가 폐기되었습니다.' : `${reveal.turnPlayerName || '플레이어'}님의 카드가 폐기되었습니다.`,
              'warning'
            );
          }
        }
      });

      socket.on('game:over', (over: Over) => {
        const current = get().state;
        set({
          over,
          state: current ? {
            ...current,
            phase: 'finished' as const,
            timelines: over.timelines || current.timelines,
          } : null,
        });
      });
      socket.on('connect_error', () => {
        const msg = '서버에 연결할 수 없습니다. 백엔드 서버(포트 3001)가 실행 중인지 확인해주세요.';
        get().addToast(msg, 'error');
        set({ error: msg });
      });
      socket.once('connect', () => resolve());
      socket.connect();
    }),

  request: async (event: string, payload: Record<string, unknown>) => {
    const socket = get().socket;
    if (!socket) {
      const msg = '먼저 서버에 연결해주세요.';
      get().addToast(msg, 'warning');
      set({ error: msg });
      return null;
    }
    try {
      const result = await socket.timeout(15000).emitWithAck(event, payload);
      if (result === null || typeof result !== 'object' || !('ok' in result)) {
        const msg = '서버 응답이 올바르지 않습니다.';
        get().addToast(msg, 'error');
        set({ error: msg });
        return null;
      }
      const typed = result as { ok: boolean; error?: string; state?: RoomState; playerId?: string; token?: string; [key: string]: unknown };
      if (!typed.ok) {
        const msg = typed.error || '요청이 거절되었습니다.';
        get().addToast(msg, 'error');
        set({ error: msg });
        return typed;
      }
      return typed;
    } catch {
      const msg = '서버 응답이 없습니다. 잠시 후 다시 시도해주세요.';
      get().addToast(msg, 'error');
      set({ error: msg });
      return null;
    }
  },

  createRoom: async (name, options) => {
    const result = await get().request('room:create', { name, musicSource: options?.musicSource || 'kpop_hits' });
    if (result?.ok && result.state) {
      const state = result.state as RoomState;
      const playerId = typeof result.playerId === 'string' ? result.playerId : '';
      const token = typeof result.token === 'string' ? result.token : '';
      saveSession({ code: state.code, playerId, token });
      set({ me: playerId || null });
    }
    return !!result?.ok;
  },

  joinRoom: async (name, code) => {
    const result = await get().request('room:join', { name, code });
    if (result?.ok && result.state) {
      const state = result.state as RoomState;
      const playerId = typeof result.playerId === 'string' ? result.playerId : '';
      const token = typeof result.token === 'string' ? result.token : '';
      saveSession({ code: state.code, playerId, token });
      set({ me: playerId || null });
    }
    return !!result?.ok;
  },

  configure: async settings => {
    const current = get().state?.settings;
    if (!current) return false;
    set(prev => (prev.state ? { ...prev, state: { ...prev.state, settings: { ...prev.state.settings, ...settings } } } : prev));
    const result = await get().request('room:configure', { ...current, ...settings });
    return !!result?.ok;
  },

  leaveRoom: async () => {
    await get().request('room:leave', {});
    if (typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY);
    set({ state: null, reveal: null, over: null, me: null });
  },

  start: async () => {
    const result = await get().request('game:start', {});
    return !!result?.ok;
  },

  answer: async (roundId, guessOrTitle, legacyArtist) => {
    const payload = legacyArtist !== undefined
      ? { roundId, title: guessOrTitle, artist: legacyArtist }
      : { roundId, guess: guessOrTitle };
    const result = await get().request('game:answer', payload);
    return !!result?.ok;
  },

  insert: async (roundId, index) => {
    const result = await get().request('game:insert', { roundId, index });
    return !!result?.ok;
  },

  skip: async () => {
    const result = await get().request('game:next', {});
    return !!result?.ok;
  },

  reset: async () => {
    const result = await get().request('game:reset', {});
    return !!result?.ok;
  },
}));
