import { createTrackProvider } from './preview-provider.js';
import { matches, validSlot } from './rules.js';

function cleanTrackMeta(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .replace(/\s*[\(\[\{（［｛【].*?[\)\]\}）］｝】]\s*/g, ' ')
    .replace(/\s*[-–—]\s*(?:(?:\d{4}\s*)?remaster(?:ed)?|inst(?:rumental)?|live|ver(?:sion)?|ost|feat\.?|ft\.?).*$/i, '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\p{P}\p{Z}\s]/gu, '');
}

function getTrackKeys(track) {
  if (!track) return [];
  const keys = [];
  const id = track.id || track.trackId;
  if (id) keys.push(`id:${String(id).toLowerCase()}`);
  const t = cleanTrackMeta(track.title || track.rawTitle);
  const a = cleanTrackMeta(track.artist || track.rawArtist);
  if (t && a) keys.push(`meta:${t}:::${a}`);
  else if (t) keys.push(`title:${t}`);
  if (track.previewUrl && !String(track.previewUrl).startsWith('/api/audio/')) {
    keys.push(`preview:${String(track.previewUrl).split('?')[0].toLowerCase()}`);
  }
  return keys;
}

// Server-authoritative round machine. Correctness, scoring and turn order live here;
// clients only render state pushed via room.emit(...). Timers are injected for tests.
export class Game {
  constructor(room, { provider = createTrackProvider(process.env.PUBLIC_BASE_URL || ''), config, revealMs, now = Date.now, timers = setTimeout, clear = clearTimeout } = {}) {
    this.room = room; this.provider = provider; this.now = now; this.timers = timers; this.clear = clear;
    this.config = config;
    this.revealMs = revealMs !== undefined ? revealMs : (config?.mode === 'speed' ? 60000 : 0);
    this.usedTrackKeys = new Set();
    const rawDeck = [...(provider.listTracks() || [])];
    for (let i = rawDeck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rawDeck[i], rawDeck[j]] = [rawDeck[j], rawDeck[i]]; }
    const seenDeckKeys = new Set();
    this.deck = [];
    for (const track of rawDeck) {
      const keys = getTrackKeys(track);
      if (keys.length > 0 && !keys.some(k => seenDeckKeys.has(k))) {
        for (const k of keys) seenDeckKeys.add(k);
        this.deck.push(track);
      }
    }
    this.roundIndex = -1; this.phase = 'lobby'; this.scores = new Map(); this.timelines = new Map();
    this.timer = null; this.roundId = 0; this.currentTurn = null; this.current = null;
    this.roundSolvers = { title: null, artist: null };
    this.lastReveal = null;
    for (const player of room.players) {
      this.scores.set(player.id, 0);
      if (config.mode === 'timeline') this.timelines.set(player.id, this.timelineStart());
    }
    this.startTimer = null;
  }
  drawNextTrack() {
    if (!this.deck || this.deck.length === 0) return null;
    for (let i = 0; i < this.deck.length; i++) {
      const candidate = this.deck[i];
      const keys = getTrackKeys(candidate);
      if (!keys.some(k => this.usedTrackKeys.has(k))) {
        for (const k of keys) this.usedTrackKeys.add(k);
        return candidate;
      }
    }
    // Fallback only if all unique tracks in the deck have been exhausted
    const prevKeys = new Set(getTrackKeys(this.current?.track));
    this.usedTrackKeys.clear();
    for (let i = 0; i < this.deck.length; i++) {
      const candidate = this.deck[i];
      const keys = getTrackKeys(candidate);
      if (this.deck.length <= 1 || !keys.some(k => prevKeys.has(k))) {
        for (const k of keys) this.usedTrackKeys.add(k);
        return candidate;
      }
    }
    return this.deck[0];
  }
  timelineStart() {
    const picks = [];
    while (picks.length < 2 && this.deck.length > 0) {
      const idx = this.deck.findIndex(t => !getTrackKeys(t).some(k => this.usedTrackKeys.has(k)));
      if (idx === -1) break;
      const [track] = this.deck.splice(idx, 1);
      for (const k of getTrackKeys(track)) this.usedTrackKeys.add(k);
      picks.push(track);
    }
    return picks.sort((a, b) => a.year - b.year).map(track => {
      return {
        trackId: track.id,
        year: track.year,
        title: track.title,
        artist: track.artist,
        rawTitle: track.title,
        rawArtist: track.artist,
        displayTitle: track.title,
        displayArtist: track.artist,
        coverUrl: track.coverUrl || '',
        spotifyUrl: track.spotifyUrl || '',
      };
    });
  }
  start() {
    this.usedTrackKeys.clear();
    if (this.config?.mode === 'timeline') {
      for (const cards of this.timelines.values()) {
        for (const card of cards || []) {
          for (const k of getTrackKeys(card)) this.usedTrackKeys.add(k);
        }
      }
    }
    this.phase = 'playing';
    this.startTimer = this.timers(() => (this.config.mode === 'speed' ? this.nextRound() : this.beginTurn()), 300);
  }
  stop() { this.clear(this.timer); this.clear(this.startTimer); this.phase = 'stopped'; }
  nextRound() {
    if (this.phase === 'finished' || this.phase === 'stopped') return;
    this.roundIndex += 1;
    if (this.config.mode === 'speed' && this.roundIndex >= this.config.rounds) return this.finish();
    const track = this.drawNextTrack();
    if (!track) return this.finish();
    const snippetSec = this.config.snippetSeconds || 15;
    const startSeconds = Math.floor(Math.random() * Math.max(1, 30 - snippetSec));
    const preview = this.provider.getPreview(track, startSeconds);
    this.phase = 'playing'; this.roundId += 1; this.winner = null;
    this.roundSolvers = { title: null, artist: null };
    this.lastReveal = null;
    this.roundStartedAt = this.now();
    const roundDurationSec = this.config.roundSeconds || (this.config.mode === 'speed' ? 60 : snippetSec);
    this.roundEndsAt = this.roundStartedAt + roundDurationSec * 1000;
    this.current = { track, preview };
    this.timer = this.timers(() => this.timeUp(), roundDurationSec * 1000);
    this.room.emit('round:next', this.publicRound());
  }
  timeUp() {
    if (this.phase !== 'playing') return;
    this.clear(this.timer);
    if (this.config.mode === 'speed') {
      const winnerId = (this.roundSolvers.title?.playerId === this.roundSolvers.artist?.playerId)
        ? (this.roundSolvers.title?.playerId || null)
        : (this.roundSolvers.title?.playerId || this.roundSolvers.artist?.playerId || null);
      const revealData = this.revealCurrent(winnerId);
      this.room.emit('round:reveal', revealData);
      this.startTimer = this.timers(() => this.nextRound(), this.revealMs);
    } else {
      const revealData = this.revealCurrent(null, { success: false, timeout: true });
      this.room.emit('round:reveal', revealData);
      // Timeline mode: NO auto advance timer. Waits for manual skip/next!
    }
  }
  answer(playerId, payload) {
    if (this.phase !== 'playing' || this.config.mode !== 'speed') return { ok: false, error: '지금은 정답을 받을 수 없습니다.' };
    if (payload?.roundId !== this.roundId) return { ok: false, error: '이미 종료된 라운드입니다.' };
    const player = this.room.players?.find(p => p.id === playerId);
    const playerName = player?.name || '플레이어';

    const track = this.current.track;
    const target = this.config.target || 'both';
    const needTitle = target !== 'artist';
    const needArtist = target !== 'title';

    if ((!needTitle || this.roundSolvers.title) && (!needArtist || this.roundSolvers.artist)) {
      return { ok: false, error: '이미 이번 라운드의 모든 정답이 맞춰졌습니다.' };
    }

    const rawGuess = typeof payload.guess === 'string' ? payload.guess.trim().slice(0, 100) : '';
    const rawTitle = typeof payload.title === 'string' ? payload.title.trim().slice(0, 100) : '';
    const rawArtist = typeof payload.artist === 'string' ? payload.artist.trim().slice(0, 100) : '';

    if (!rawGuess && !rawTitle && !rawArtist) {
      return { ok: false, error: '정답을 입력해주세요.' };
    }

    let matchedTitle = false;
    let matchedArtist = false;

    // Check title match
    if (needTitle && !this.roundSolvers.title) {
      const candidate = rawGuess || rawTitle;
      if (candidate && matches(candidate, track.title, track.aliases?.title, { isArtist: false })) {
        matchedTitle = true;
      }
    }

    // Check artist match
    if (needArtist && !this.roundSolvers.artist) {
      const candidate = rawGuess || rawArtist;
      if (candidate && matches(candidate, track.artist, track.aliases?.artist, { isArtist: true })) {
        matchedArtist = true;
      }
    }

    // If single guess didn't match directly, check if input contained both title and artist separated by spaces
    if (rawGuess && !matchedTitle && !matchedArtist) {
      const words = rawGuess.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        for (let i = 1; i < words.length; i++) {
          const partA = words.slice(0, i).join(' ');
          const partB = words.slice(i).join(' ');
          if (needTitle && !this.roundSolvers.title && matches(partA, track.title, track.aliases?.title, { isArtist: false })) matchedTitle = true;
          if (needArtist && !this.roundSolvers.artist && matches(partB, track.artist, track.aliases?.artist, { isArtist: true })) matchedArtist = true;
          if (needTitle && !this.roundSolvers.title && matches(partB, track.title, track.aliases?.title, { isArtist: false })) matchedTitle = true;
          if (needArtist && !this.roundSolvers.artist && matches(partA, track.artist, track.aliases?.artist, { isArtist: true })) matchedArtist = true;
        }
      }
    }

    if (!matchedTitle && !matchedArtist) {
      return { ok: false, silent: true, error: '아직 정답이 아닙니다.' };
    }

    // Award point for title
    if (matchedTitle) {
      this.roundSolvers.title = { playerId, playerName };
      this.scores.set(playerId, (this.scores.get(playerId) || 0) + 1);
      this.room.emit('round:part_solved', {
        type: 'title',
        playerId,
        playerName,
        title: track.title,
        rawTitle: track.title,
        scores: Object.fromEntries(this.scores),
        solvers: this.roundSolvers,
      });
    }

    // Award point for artist
    if (matchedArtist) {
      this.roundSolvers.artist = { playerId, playerName };
      this.scores.set(playerId, (this.scores.get(playerId) || 0) + 1);
      this.room.emit('round:part_solved', {
        type: 'artist',
        playerId,
        playerName,
        artist: track.artist,
        rawArtist: track.artist,
        scores: Object.fromEntries(this.scores),
        solvers: this.roundSolvers,
      });
    }

    const allTitleDone = !needTitle || !!this.roundSolvers.title;
    const allArtistDone = !needArtist || !!this.roundSolvers.artist;

    if (allTitleDone && allArtistDone) {
      this.clear(this.timer);
      const winnerId = (this.roundSolvers.title?.playerId === this.roundSolvers.artist?.playerId)
        ? (this.roundSolvers.title?.playerId || playerId)
        : playerId;
      this.winner = winnerId;
      const revealData = this.revealCurrent(winnerId);
      this.room.emit('round:reveal', revealData);
      this.startTimer = this.timers(() => this.nextRound(), this.revealMs);
      return { ok: true, allSolved: true };
    }

    return { ok: true, allSolved: false };
  }
  insert(playerId, payload) {
    if (this.phase !== 'playing' || this.config.mode !== 'timeline') return { ok: false, error: '지금은 카드를 놓을 수 없습니다.' };
    if (payload?.roundId !== this.roundId) return { ok: false, error: '이미 종료된 라운드입니다.' };
    if (this.currentTurn !== playerId) return { ok: false, error: '당신의 차례가 아닙니다.' };
    const timeline = this.timelines.get(playerId);
    const index = Number(payload.index);
    if (!Number.isInteger(index) || index < 0 || index > timeline.length) return { ok: false, error: '잘못된 위치입니다.' };
    const track = this.current.track;
    if (!validSlot(timeline.map(entry => ({ year: entry.year })), track.year, index)) return this.failInsert(playerId);
    this.clear(this.timer);
    timeline.splice(index, 0, {
      trackId: track.id,
      year: track.year,
      title: track.title,
      artist: track.artist,
      rawTitle: track.title,
      rawArtist: track.artist,
      displayTitle: track.title,
      displayArtist: track.artist,
      coverUrl: track.coverUrl || '',
      spotifyUrl: track.spotifyUrl || '',
    });
    const player = this.room.players?.find(p => p.id === playerId);
    const targetCards = Math.min(20, Math.max(8, Number(this.config?.targetCards) || 10));
    if (timeline.length >= targetCards) {
      this.winner = playerId; this.phase = 'finished';
      this.room.emit('game:over', {
        winnerId: playerId,
        scores: Object.fromEntries(this.scores),
        timelines: Object.fromEntries(this.timelines),
      });
      return { ok: true, won: true };
    }
    const revealData = this.revealCurrent(null, {
      success: true,
      turnPlayerId: playerId,
      turnPlayerName: player?.name,
    });
    this.room.emit('round:reveal', revealData);
    // Timeline mode: NO auto advance timer. Waits for manual skip/next button!
    return { ok: true };
  }
  failInsert(playerId) {
    this.clear(this.timer);
    const pid = playerId || this.currentTurn;
    const player = this.room.players?.find(p => p.id === pid);
    const revealData = this.revealCurrent(null, {
      success: false,
      turnPlayerId: pid,
      turnPlayerName: player?.name,
    });
    this.room.emit('round:reveal', revealData);
    // Timeline mode: NO auto advance timer. Waits for manual skip/next button!
    return { ok: false, error: '카드가 폐기되었습니다.', discarded: true };
  }
  skip() {
    if (this.phase === 'reveal') {
      return this.skipReveal();
    }
    if (this.phase === 'playing') {
      this.clear(this.timer);
      if (this.config.mode === 'speed') {
        const winnerId = (this.roundSolvers.title?.playerId === this.roundSolvers.artist?.playerId)
          ? (this.roundSolvers.title?.playerId || null)
          : (this.roundSolvers.title?.playerId || this.roundSolvers.artist?.playerId || null);
        const revealData = this.revealCurrent(winnerId, { skipped: true });
        this.room.emit('round:reveal', revealData);
        this.startTimer = this.timers(() => this.nextRound(), this.revealMs);
        return { ok: true, skipped: true };
      } else {
        return this.failInsert(this.currentTurn);
      }
    }
    return { ok: false, error: '현재 넘길 수 있는 상태가 아닙니다.' };
  }
  skipReveal() {
    if (this.phase !== 'reveal') return this.skip();
    this.clear(this.startTimer);
    this.lastReveal = null;
    if (this.config.mode === 'speed') {
      this.nextRound();
    } else {
      this.advanceTurn();
      this.beginTurn();
    }
    return { ok: true };
  }
  advanceTurn() {
    const order = this.room.players.map(p => p.id);
    const from = Math.max(0, order.indexOf(this.currentTurn));
    for (let step = 1; step <= order.length; step++) {
      const candidate = order[(from + step) % order.length];
      if (this.room.players.find(p => p.id === candidate)?.connected !== false) { this.currentTurn = candidate; return; }
    }
  }
  beginTurn() {
    if (this.phase === 'finished' || this.phase === 'stopped') return;
    if (this.config.mode === 'timeline' && !this.currentTurn) this.currentTurn = this.room.players.find(p => p.connected !== false)?.id ?? this.room.players[0]?.id;
    this.nextRound();
  }
  revealCurrent(winnerId, extra = {}) {
    this.phase = 'reveal';
    const endsAt = this.config.mode === 'speed' ? (this.now() + this.revealMs) : undefined;
    const winnerPlayer = winnerId ? this.room.players?.find(p => p.id === winnerId) : null;
    const turnPlayer = this.currentTurn ? this.room.players?.find(p => p.id === this.currentTurn) : null;
    const enrichedTrack = {
      ...this.current.track,
      displayTitle: this.current.track.title,
      displayArtist: this.current.track.artist,
    };
    const data = {
      roundId: this.roundId,
      winnerId,
      winnerName: winnerPlayer ? winnerPlayer.name : undefined,
      turnPlayerId: this.currentTurn || undefined,
      turnPlayerName: turnPlayer ? turnPlayer.name : undefined,
      solvers: this.roundSolvers,
      track: enrichedTrack,
      scores: Object.fromEntries(this.scores),
      revealEndsAt: endsAt,
      ...extra
    };
    this.lastReveal = data;
    return data;
  }
  finish() {
    this.clear(this.timer); this.clear(this.startTimer);
    this.phase = 'finished';
    this.room.emit('game:over', {
      scores: Object.fromEntries(this.scores),
      winnerId: this.winner || undefined,
      timelines: this.config.mode === 'timeline' ? Object.fromEntries(this.timelines) : undefined,
    });
  }
  publicRound() {
    const revealed = this.phase === 'reveal' || this.phase === 'finished';
    return {
      roundId: this.roundId, phase: this.phase, mode: this.config.mode,
      scores: Object.fromEntries(this.scores),
      endsAt: this.roundEndsAt,
      turn: this.config.mode === 'timeline' ? this.currentTurn : undefined,
      track: revealed ? this.current.track : undefined,
      preview: this.current.preview,
      solvers: this.roundSolvers,
      reveal: revealed ? this.lastReveal : undefined,
    };
  }
}

