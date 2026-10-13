import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { tracks } from '../shared/tracks.js';

// Deterministic fake timers: step() advances to the earliest pending timer only.
const pending = []; let seq = 0; let nowMs = 1_000_000;
const timers = (fn, ms) => { const id = ++seq; pending.push({ id, fn, at: nowMs + ms }); return id; };
const clear = id => { const i = pending.findIndex(t => t.id === id); if (i >= 0) pending.splice(i, 1); };
const now = () => nowMs;
const step = () => { if (!pending.length) return false; pending.sort((a, b) => a.at - b.at); const t = pending.shift(); nowMs = t.at; t.fn(); return true; };
const room = { players: [{ id: 'p1', name: '한' }, { id: 'p2', name: '이' }], emitted: [], emit(event, payload) { this.emitted.push([event, payload]); } };
const events = name => room.emitted.filter(([e]) => e === name).map(([, p]) => p);
const roundTrack = round => tracks.find(t => t.id === round.preview.url.match(/mock:\/\/([^?]+)/)[1]);

const game = new Game(room, { config: { mode: 'speed', target: 'both', rounds: 10, snippetSeconds: 5 }, revealMs: 4000, now, timers, clear, provider: { listTracks: () => tracks.map(t => ({ ...t })), getPreview: (track, start) => ({ url: `mock://${track.id}?start=${start}`, start }) } });
game.deck = [...tracks]; // deterministic order for assertions
game.start(); step();

let nexts = events('round:next');
assert.equal(nexts.length, 1);
assert.equal(nexts[0].phase, 'playing');
assert.equal(nexts[0].track, undefined, 'reveal 전 곡 정보 비공개');
assert.ok(nexts[0].preview.url.startsWith('mock://'), '미리듣기 URL 제공');
assert.equal(game.answer('p1', { roundId: 99, title: 'x', artist: 'y' }).ok, false, '잘못된 roundId 거절');

// Round 1 (좋은 날): wrong answer, then timeout reveals with no winner.
const track1 = roundTrack(nexts[0]);
assert.equal(track1.id, 'kpop-iu-goodday');
assert.equal(game.answer('p1', { roundId: nexts[0].roundId, title: '없는 곡', artist: '없는 가수' }).ok, false);
step(); // snippet timer -> reveal
let reveals = events('round:reveal');
assert.equal(reveals[0].winnerId, null, '시간 초과 무득점');
assert.equal(reveals[0].track.title, track1.title, '리비일에서 정답 공개');
step(); // reveal timer -> round 2
nexts = events('round:next');
assert.equal(nexts.length, 2);

// Round 2 (Dynamite): separate guessing: p2 guesses title with 1-char typo, p1 guesses artist
const track2 = roundTrack(nexts[1]);
assert.equal(track2.id, 'kpop-bts-dynamite');
const res2a = game.answer('p2', { roundId: nexts[1].roundId, guess: 'Dynamit' });
assert.equal(res2a.ok, true, '1글자 오타 제목 정답 인정');
assert.equal(res2a.allSolved, false, '가수는 아직 미해결');
const parts = events('round:part_solved');
assert.equal(parts.length, 1);
assert.equal(parts[0].type, 'title');
assert.equal(parts[0].playerName, '이');

const res2b = game.answer('p1', { roundId: nexts[1].roundId, guess: '방탄소년단' });
assert.equal(res2b.ok, true, '가수 정답 인정');
assert.equal(res2b.allSolved, true, '제목/가수 모두 해결되어 라운드 종료');
step(); // -> round 3

// Round 3 (Hype Boy): explicit alias for title by p1, artist by p2
const track3 = roundTrack(events('round:next')[2]);
assert.equal(track3.id, 'kpop-newjeans-hypeboy');
assert.equal(game.answer('p1', { roundId: events('round:next')[2].roundId, guess: '하입보이' }).ok, true, '명시적 별칭 인정');
assert.equal(game.answer('p2', { roundId: events('round:next')[2].roundId, guess: '뉴진스' }).ok, true);
step(); // -> round 4

// Round 4: first correct answer scores, duplicate submission is rejected without scoring.
const round4 = events('round:next')[3];
const track4 = roundTrack(round4);
assert.equal(track4.id, 'kpop-blackpink-ddudu');
assert.equal(game.answer('p1', { roundId: round4.roundId, guess: track4.title }).ok, true);
assert.equal(game.answer('p1', { roundId: round4.roundId, guess: track4.artist }).ok, true);
const scoresAfterP1 = { ...events('round:reveal').at(-1).scores };
assert.equal(game.answer('p2', { roundId: round4.roundId, guess: track4.title }).ok, false, '종료된 라운드 중복 정답 거절');
assert.deepEqual(events('round:reveal').at(-1).scores, scoresAfterP1, '점수 변화 없음');
for (let i = 0; i < 20 && game.phase !== 'finished'; i++) step();

assert.equal(game.phase, 'finished');
const over = events('game:over');
assert.equal(over.length, 1);
assert.equal(over[0].scores.p1, 4, 'p1: r2가수(1) + r3제목(1) + r4제목(1)+r4가수(1) = 4점');
assert.equal(over[0].scores.p2, 2, 'p2: r2제목(1) + r3가수(1) = 2점');

// Verify no duplicate songs appeared across all 10 rounds
const allReveals = events('round:reveal');
assert.equal(allReveals.length, 10, '10라운드 모두 진행됨');
const seenIds = new Set(allReveals.map(r => r.track.id));
assert.equal(seenIds.size, 10, '한 게임 내에서 동일한 곡 ID가 중복 출제되지 않아야 함');

// Verify duplicate track filtering when deck contains duplicate IDs or remastered duplicates of the same song
const dupRoom = { players: [{ id: 'p1', name: '한' }], emitted: [], emit(event, payload) { this.emitted.push([event, payload]); } };
const dupTrackList = [
  { id: 'dup-1', title: '좋은 날', artist: '아이유', year: 2010, previewStart: 0 },
  { id: 'dup-1', title: '좋은 날', artist: '아이유', year: 2010, previewStart: 0 }, // exact ID duplicate
  { id: 'dup-1-remaster', title: '좋은 날 - Remastered 2021', artist: '아이유', year: 2010, previewStart: 0 }, // same title+artist remaster duplicate
  { id: 'dup-2', title: 'Dynamite', artist: 'BTS', year: 2020, previewStart: 0 },
  { id: 'dup-3', title: 'Hype Boy', artist: 'NewJeans', year: 2022, previewStart: 0 },
];
const dupGame = new Game(dupRoom, {
  config: { mode: 'speed', target: 'both', rounds: 3, snippetSeconds: 5 },
  revealMs: 1000,
  now,
  timers,
  clear,
  provider: { listTracks: () => dupTrackList, getPreview: (t) => ({ url: `mock://${t.id}`, start: 0 }) },
});
dupGame.deck = [...dupTrackList];
dupGame.start();
while (dupGame.phase !== 'finished' && step()) {}
const dupReveals = dupRoom.emitted.filter(([e]) => e === 'round:reveal').map(([, p]) => p.track);
assert.equal(dupReveals.length, 3, '중복 트랙을 건너뛰고 고유한 3곡으로 3라운드 진행');
assert.deepEqual(dupReveals.map(t => t.id), ['dup-1', 'dup-2', 'dup-3'], '이전 라운드에 나온 노래(및 리마스터 중복곡)는 재출제되지 않음');

console.log('speed-game: all assertions passed');

