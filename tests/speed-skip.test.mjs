import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { tracks } from '../shared/tracks.js';

const pending = []; let seq = 0; let nowMs = 1_000_000;
const timers = (fn, ms) => { const id = ++seq; pending.push({ id, fn, at: nowMs + ms }); return id; };
const clear = id => { const i = pending.findIndex(t => t.id === id); if (i >= 0) pending.splice(i, 1); };
const now = () => nowMs;
const step = () => { if (!pending.length) return false; pending.sort((a, b) => a.at - b.at); const t = pending.shift(); nowMs = t.at; t.fn(); return true; };

const room = {
  players: [{ id: 'p1', name: '철수' }, { id: 'p2', name: '영희' }],
  emitted: [],
  emit(event, payload) { this.emitted.push([event, payload]); },
};
const events = name => room.emitted.filter(([e]) => e === name).map(([, p]) => p);

// Config with snippetSeconds: 15 (15s audio listening)
const game = new Game(room, {
  config: { mode: 'speed', snippetSeconds: 15, rounds: 5 },
  revealMs: 60000,
  now, timers, clear,
  provider: {
    listTracks: () => tracks.map(t => ({ ...t })),
    getPreview: (t, s) => ({ url: `mock://${t.id}`, start: s }),
  },
});

game.start();
step(); // 300ms start delay

// Round 1 started
assert.equal(game.phase, 'playing');
const nexts = events('round:next');
assert.equal(nexts.length, 1);
assert.equal(nexts[0].phase, 'playing');

// Assert round duration is 60s (60,000ms), NOT 15s!
const roundDuration = game.roundEndsAt - game.roundStartedAt;
assert.equal(roundDuration, 60000, '스피드 퀴즈는 미리듣기가 15초여도 1분(60초) 타이머가 적용되어야 함');

// Test: Skip during playing phase
const skipPlaying = game.skip();
assert.equal(skipPlaying.ok, true);
assert.equal(skipPlaying.skipped, true);
assert.equal(game.phase, 'reveal');

let reveals = events('round:reveal');
assert.equal(reveals.length, 1);
assert.equal(reveals[0].skipped, true);
assert.ok(reveals[0].track, '스킵 시 이번 곡 정답 공개');
assert.equal(reveals[0].revealEndsAt - nowMs, 60000, '정답 공개 후 1분(60초) 카운트다운 타이머');

// Test: Skip during reveal phase immediately advances to Round 2
const skipReveal = game.skip();
assert.equal(skipReveal.ok, true);
assert.equal(game.phase, 'playing');
assert.equal(events('round:next').length, 2, '즉시 라운드 2 시작');

// Round 2: verify 60s timeout if nobody guesses or skips
assert.equal(game.roundEndsAt - game.roundStartedAt, 60000);
step(); // Advance timer by 60s
assert.equal(game.phase, 'reveal');
reveals = events('round:reveal');
assert.equal(reveals.length, 2);
assert.equal(reveals[1].winnerId, null, '60초 타임아웃 무득점');

console.log('speed-skip: all assertions passed');
