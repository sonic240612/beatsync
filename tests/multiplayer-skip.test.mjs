import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { tracks } from '../shared/tracks.js';

let nowMs = 1_000_000;
let seq = 0;
const pending = [];
const timers = (fn, ms) => { const id = ++seq; pending.push({ id, fn, at: nowMs + ms }); return id; };
const clear = id => { const i = pending.findIndex(t => t.id === id); if (i >= 0) pending.splice(i, 1); };
const now = () => nowMs;
const step = () => { if (!pending.length) return false; pending.sort((a, b) => a.at - b.at); const t = pending.shift(); nowMs = t.at; t.fn(); return true; };

// 1. Single-player test (1 person)
{
  const room = {
    players: [{ id: 'p1', name: '혼자', connected: true }],
    emitted: [],
    emit(event, payload) { this.emitted.push([event, payload]); },
  };

  const game = new Game(room, {
    config: { mode: 'speed', rounds: 5 },
    revealMs: 60000,
    now, timers, clear,
    provider: {
      listTracks: () => tracks.map(t => ({ ...t })),
      getPreview: (t, s) => ({ url: `mock://${t.id}`, start: s }),
    },
  });

  game.start();
  step();

  assert.equal(game.phase, 'playing');
  const res = game.skip('p1');
  assert.equal(res.ok, true);
  assert.equal(res.skipped, true, '1인 플레이는 혼자 넘기면 즉시 스킵되어야 함');
  assert.equal(game.phase, 'reveal');
}

// 2. Multiplayer test (2 players: p1, p2)
{
  const room = {
    players: [
      { id: 'p1', name: '철수', connected: true },
      { id: 'p2', name: '영희', connected: true },
    ],
    emitted: [],
    emit(event, payload) { this.emitted.push([event, payload]); },
  };

  const game = new Game(room, {
    config: { mode: 'speed', rounds: 5 },
    revealMs: 60000,
    now, timers, clear,
    provider: {
      listTracks: () => tracks.map(t => ({ ...t })),
      getPreview: (t, s) => ({ url: `mock://${t.id}`, start: s }),
    },
  });

  game.start();
  step();
  assert.equal(game.phase, 'playing');

  // Player 1 votes to skip
  const res1 = game.skip('p1');
  assert.equal(res1.ok, true);
  assert.equal(res1.voted, true, 'p1만 눌렀을 때는 voted 상태여야 함');
  assert.equal(res1.currentVotes, 1);
  assert.equal(res1.requiredVotes, 2);
  assert.equal(game.phase, 'playing', '한 명만 누르면 곡이 넘어가지 않고 계속 재생 중이어야 함');

  // Verify round:skip_vote event emitted
  const skipVoteEvents = room.emitted.filter(([e]) => e === 'round:skip_vote').map(([, p]) => p);
  assert.equal(skipVoteEvents.length, 1);
  assert.equal(skipVoteEvents[0].voterId, 'p1');
  assert.equal(skipVoteEvents[0].currentVotes, 1);
  assert.equal(skipVoteEvents[0].requiredVotes, 2);

  // Player 2 votes to skip -> unanimous agreement!
  const res2 = game.skip('p2');
  assert.equal(res2.ok, true);
  assert.equal(res2.skipped, true, '모두(p1, p2)가 누르면 비로소 곡이 넘어가야 함');
  assert.equal(game.phase, 'reveal');

  // In reveal phase: p1 votes to skip reveal
  const rev1 = game.skipReveal('p1');
  assert.equal(rev1.ok, true);
  assert.equal(rev1.voted, true);
  assert.equal(rev1.currentVotes, 1);
  assert.equal(rev1.requiredVotes, 2);
  assert.equal(game.phase, 'reveal', '정답 공개 화면에서도 한 명만 누르면 다음 문제로 안 넘어감');

  // p2 votes to skip reveal -> both agreed!
  const rev2 = game.skipReveal('p2');
  assert.equal(rev2.ok, true);
  assert.equal(rev2.skipped, true);
  assert.equal(game.phase, 'playing', '모두가 눌렀으므로 다음 라운드로 전환');
  assert.equal(game.roundIndex, 1);
}

// 3. Disconnect recalculation test (3 players, 1 disconnects)
{
  const room = {
    players: [
      { id: 'p1', name: '철수', connected: true },
      { id: 'p2', name: '영희', connected: true },
      { id: 'p3', name: '민수', connected: true },
    ],
    emitted: [],
    emit(event, payload) { this.emitted.push([event, payload]); },
  };

  const game = new Game(room, {
    config: { mode: 'speed', rounds: 5 },
    revealMs: 60000,
    now, timers, clear,
    provider: {
      listTracks: () => tracks.map(t => ({ ...t })),
      getPreview: (t, s) => ({ url: `mock://${t.id}`, start: s }),
    },
  });

  game.start();
  step();

  // p1 and p2 vote to skip (2 out of 3)
  game.skip('p1');
  const res2 = game.skip('p2');
  assert.equal(res2.voted, true);
  assert.equal(res2.currentVotes, 2);
  assert.equal(res2.requiredVotes, 3);
  assert.equal(game.phase, 'playing');

  // p3 disconnects!
  room.players[2].connected = false;
  game.checkSkipVotes();

  assert.equal(game.phase, 'reveal', 'p3가 나가면서 남은 접속자(2명) 전원 동의가 충족되어 즉시 스킵됨');
}

console.log('multiplayer-skip: all assertions passed!');
