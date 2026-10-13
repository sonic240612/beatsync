import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { tracks } from '../shared/tracks.js';

// Deterministic fake timers
const pending = []; let seq = 0; let nowMs = 1_000_000;
const timers = (fn, ms) => { const id = ++seq; pending.push({ id, fn, at: nowMs + ms }); return id; };
const clear = id => { const i = pending.findIndex(t => t.id === id); if (i >= 0) pending.splice(i, 1); };
const now = () => nowMs;
const step = () => { if (!pending.length) return false; pending.sort((a, b) => a.at - b.at); const t = pending.shift(); nowMs = t.at; t.fn(); return true; };

const room = {
  players: [
    { id: 'p1', name: '철수', connected: true },
    { id: 'p2', name: '영희', connected: true },
  ],
  emitted: [],
  emit(event, payload) { this.emitted.push([event, payload]); },
};

const events = name => room.emitted.filter(([e]) => e === name).map(([, p]) => p);

const game = new Game(room, {
  config: { mode: 'timeline', snippetSeconds: 15 },
  revealMs: 0, // Timeline mode does not auto advance
  now, timers, clear,
  provider: {
    listTracks: () => tracks.map(t => ({ ...t })),
    getPreview: (track, start) => ({ url: `mock://${track.id}?start=${start}`, start }),
  },
});

// Set deterministic initial timeline and deck
game.timelines.set('p1', [{ trackId: 'init-p1', year: 2000, title: '초기곡1', artist: '초기가수1' }]);
game.timelines.set('p2', [{ trackId: 'init-p2', year: 2000, title: '초기곡2', artist: '초기가수2' }]);

game.deck = [
  { id: 't1', title: '곡1', artist: '가수1', year: 2010 },
  { id: 't2', title: '곡2', artist: '가수2', year: 2005 },
  { id: 't3', title: '곡3', artist: '가수3', year: 2020 },
];

game.start();
step(); // Start delay (300ms)

// Round 1 started
assert.equal(game.phase, 'playing');
assert.equal(game.currentTurn, 'p1');
let nexts = events('round:next');
assert.equal(nexts.length, 1);
assert.equal(nexts[0].phase, 'playing');
assert.equal(nexts[0].turn, 'p1');

// Player 1 inserts card t1 (2010) into timeline [2000] at index 1 (after 2000)
const ins1 = game.insert('p1', { roundId: nexts[0].roundId, index: 1 });
assert.equal(ins1.ok, true);
assert.equal(game.phase, 'reveal');
assert.equal(game.timelines.get('p1').length, 2);
assert.equal(game.timelines.get('p1')[1].year, 2010);

// Verify round:reveal event has turnPlayer details
let reveals = events('round:reveal');
assert.equal(reveals.length, 1);
assert.equal(reveals[0].success, true);
assert.equal(reveals[0].turnPlayerId, 'p1');
assert.equal(reveals[0].turnPlayerName, '철수');
assert.equal(reveals[0].track.year, 2010);

// While in reveal phase, further inserts are rejected
const insBlocked = game.insert('p1', { roundId: nexts[0].roundId, index: 0 });
assert.equal(insBlocked.ok, false);

// Timeline mode waits for skipReveal (manual next turn button)
// skipReveal immediately transitions to playing and advances turn
const skipRes = game.skipReveal();
assert.equal(skipRes.ok, true);

// Should advance turn to p2 and begin turn 2
assert.equal(game.phase, 'playing');
assert.equal(game.currentTurn, 'p2');
nexts = events('round:next');
assert.equal(nexts.length, 2);
assert.equal(nexts[1].turn, 'p2');

// Next card is t2 (year 2005). Player 2 puts at slot 1 in [2000]
const ins2 = game.insert('p2', { roundId: nexts[1].roundId, index: 1 });
assert.equal(ins2.ok, true);
assert.equal(game.phase, 'reveal');
reveals = events('round:reveal');
assert.equal(reveals.length, 2);
assert.equal(reveals[1].turnPlayerId, 'p2');
assert.equal(reveals[1].turnPlayerName, '영희');

// Skip reveal to advance to p1's next turn
game.skipReveal();
assert.equal(game.currentTurn, 'p1');
assert.equal(game.phase, 'playing');

// Next card is t3 (year 2020). p1 timeline currently has [2000, 2010].
// If p1 incorrectly puts 2020 before 2000 (index 0), it should fail and be discarded!
const insWrong = game.insert('p1', { roundId: events('round:next')[2].roundId, index: 0 });
assert.equal(insWrong.ok, false);
assert.equal(insWrong.discarded, true);
assert.equal(game.phase, 'reveal');
// Timeline should NOT have the discarded card
assert.equal(game.timelines.get('p1').length, 2);

reveals = events('round:reveal');
assert.equal(reveals.length, 3);
assert.equal(reveals[2].success, false);
assert.equal(reveals[2].turnPlayerId, 'p1');
assert.equal(reveals[2].turnPlayerName, '철수');

// Advance to next card and insert up to 10 cards to verify game:over emission with timelines
game.skipReveal();
game.currentTurn = 'p1';
// Pre-populate 9 cards in p1's timeline
game.timelines.set('p1', Array.from({ length: 9 }, (_, i) => ({
  trackId: `track-${i}`,
  year: 2000 + i,
  title: `곡${i}`,
  artist: `가수${i}`,
})));

// Next card is year 2025 (inserted at index 9)
game.deck = [{ id: 'winner-track', title: '우승곡', artist: '우승가수', year: 2025 }];
game.current = { track: game.deck[0], preview: { url: 'mock://winner' } };
const insWin = game.insert('p1', { roundId: game.roundId, index: 9 });
assert.equal(insWin.ok, true);
assert.equal(insWin.won, true);
assert.equal(game.phase, 'finished');

const overs = events('game:over');
assert.equal(overs.length, 1);
assert.equal(overs[0].winnerId, 'p1');
assert.ok(overs[0].timelines?.p1);
assert.equal(overs[0].timelines.p1.length, 10, '우승자의 10장 완성 타임라인이 game:over 이벤트에 포함되어야 함');

// Test custom targetCards = 8 (minimum)
const room8 = {
  players: [{ id: 'p1', name: '철수', connected: true }],
  emitted: [],
  emit(event, payload) { this.emitted.push([event, payload]); },
};
const game8 = new Game(room8, {
  config: { mode: 'timeline', snippetSeconds: 15, targetCards: 8 },
  revealMs: 0,
  now, timers, clear,
  provider: {
    listTracks: () => tracks.map(t => ({ ...t })),
    getPreview: (track, start) => ({ url: `mock://${track.id}?start=${start}`, start }),
  },
});
game8.start();
step();
game8.timelines.set('p1', Array.from({ length: 7 }, (_, i) => ({
  trackId: `t-${i}`,
  year: 2000 + i,
  title: `곡${i}`,
  artist: `가수${i}`,
})));
game8.current = { track: { id: 'win8', title: '8번째곡', artist: '가수8', year: 2020 }, preview: { url: 'mock://win8' } };
const res8 = game8.insert('p1', { roundId: game8.roundId, index: 7 });
assert.equal(res8.ok, true);
assert.equal(res8.won, true, 'targetCards가 8일 때 8장 채우면 승리');
assert.equal(game8.phase, 'finished');

console.log('timeline-game: all assertions passed');

