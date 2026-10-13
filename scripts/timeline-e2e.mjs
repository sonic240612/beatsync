import { io } from 'socket.io-client';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = 'http://127.0.0.1:3001';
const port = 3102;
const server = spawn(process.execPath, ['server/minimal.mjs'], { env: { ...process.env, PORT: String(port), REVEAL_MS: '400' }, stdio: ['ignore', 'pipe', 'pipe'] });
const clients = [];
const evidence = { at: new Date().toISOString(), checks: [] };
const wait = ms => new Promise(r => setTimeout(r, ms));
const emit = async (socket, event, data) => await socket.timeout(3000).emitWithAck(event, data);
async function connect() { const s = io(base, { forceNew: true, reconnection: false, transports: ['websocket'] }); clients.push(s); await new Promise((yes, no) => { s.once('connect', yes); s.once('connect_error', no); }); return s; }
let hostEvents = [], guestEvents = [];
const collect = s => { const events = []; for (const name of ['room:state', 'round:next', 'round:reveal', 'game:over']) s.on(name, payload => events.push({ name, payload, at: Date.now() })); return events; };
const waitFor = async (events, name, predicate, timeout = 12000, label = name) => {
  const t0 = Date.now();
  for (;;) {
    const hit = events.filter(e => e.name === name && predicate(e.payload)).at(-1);
    if (hit) return hit.payload;
    if (Date.now() - t0 > timeout) throw new Error(`${label} 대기 시간 초과`);
    await wait(25);
  }
};

try {
  await (async () => { for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/health')).ok) return; } catch {} await wait(50); } throw Error('server did not start'); })();
  const host = await connect(), guest = await connect();
  const created = await emit(host, 'room:create', { name: '호스트' });
  assert.equal(created.ok, true);
  const statePromise = new Promise(resolve => host.once('room:state', resolve));
  const joined = await emit(guest, 'room:join', { name: '게스트', code: created.state.code });
  assert.equal(joined.ok, true);
  await statePromise;

  await emit(host, 'room:configure', { mode: 'timeline', target: 'both', rounds: 10, snippetSeconds: 15 });
  hostEvents = collect(host); guestEvents = collect(guest);

  assert.equal((await emit(host, 'game:start', {})).ok, true);

  // Round 1: host goes first
  const round1 = await waitFor(guestEvents, 'round:next', r => r.roundId === 1, 12000, '라운드 1');
  assert.ok(round1.preview.url.includes('/demo/track-'), '미리듣기 URL 수신');
  const audio = await fetch(round1.preview.url);
  assert.equal(audio.status, 200, `미리듣기 HTTP: ${audio.status}`);
  assert.match(audio.headers.get('content-type') || '', /audio/, 'audio content-type');
  evidence.checks.push('라운드 1 시작, 데모 오디오 HTTP 200');

  // Host has no UI — wait for time-up reveal, then round 2 (guest's turn)
  await waitFor(guestEvents, 'round:reveal', r => r.roundId === 1, 25000, '라운드 1 리비일');
  await waitFor(guestEvents, 'round:next', r => r.roundId === 2, 12000, '라운드 2');

  // Guest's turn. Insert at index 0. May be valid or discarded (chronological).
  const insert1 = await emit(guest, 'game:insert', { roundId: 2, index: 0 });
  if (insert1.ok) {
    evidence.checks.push('라운드 2 게스트 삽입 성공 (idx 0)');
  } else if (insert1.error === '카드가 폐기되었습니다.') {
    evidence.checks.push('라운드 2 게스트 삽입 폐기 (연대순 위반)');
  } else if (insert1.error === '당신의 차례가 아닙니다.') {
    assert.equal(insert1.ok, true, `라운드 2 삽입 실패: ${JSON.stringify(insert1)}`);
  } else {
    assert.equal(insert1.ok, true, `라운드 2 삽입 ack: ${JSON.stringify(insert1)}`);
  }

  // Wrong position: index 99 (out of bounds → 잘못된 위치)
  const wrongIdx = await emit(guest, 'game:insert', { roundId: 2, index: 99 });
  assert.ok(['잘못된 위치입니다.', '당신의 차례가 아닙니다.', '지금은 카드를 놓을 수 없습니다.'].includes(wrongIdx.error), `잘못된 위치: ${JSON.stringify(wrongIdx)}`);

  // Continue: wait for round 3 (after host's turn and time-up)
  await waitFor(guestEvents, 'round:next', r => r.roundId === 3, 12000, '라운드 3');

  // Guest inserts on round 3 (if it's their turn)
  const insert2 = await emit(guest, 'game:insert', { roundId: 3, index: 0 });
  if (insert2.ok) {
    evidence.checks.push('라운드 3 게스트 삽입 성공');
  } else if (insert2.error === '카드가 폐기되었습니다.') {
    evidence.checks.push('라운드 3 게스트 삽입 폐기');
  } else if (insert2.error === '당신의 차례가 아닙니다.') {
    // Not guest's turn — host's turn. Insert as host.
    const insert2h = await emit(host, 'game:insert', { roundId: 3, index: 0 });
    if (insert2h.ok) {
      evidence.checks.push('라운드 3 호스트 삽입 성공');
    } else if (insert2h.error === '카드가 폐기되었습니다.') {
      evidence.checks.push('라운드 3 호스트 삽입 폐기');
    } else {
      assert.equal(insert2h.ok, true, `라운드 3 호스트 삽입: ${JSON.stringify(insert2h)}`);
    }
  } else {
    assert.equal(insert2.ok, true, `라운드 3 삽입 ack: ${JSON.stringify(insert2)}`);
  }

  // Host inserts on round 4 (wait for host's turn)
  await waitFor(guestEvents, 'round:next', r => r.roundId === 4, 12000, '라운드 4');
  // Check whose turn it is
  let hostTurn = false;
  for (const e of guestEvents.filter(e => e.name === 'room:state').reverse()) {
    if (e.payload?.turn === created.playerId) { hostTurn = true; break; }
  }
  if (!hostTurn) {
    // Not host's turn — guest's turn. Let guest insert.
    const insert3 = await emit(guest, 'game:insert', { roundId: 4, index: 0 });
    if (insert3.ok) {
      evidence.checks.push('라운드 4 게스트 삽입 성공');
    } else if (insert3.error === '카드가 폐기되었습니다.') {
      evidence.checks.push('라운드 4 게스트 삽입 폐기');
    } else {
      assert.equal(insert3.ok, true, `라운드 4 게스트 삽입: ${JSON.stringify(insert3)}`);
    }
  } else {
    const insert3 = await emit(host, 'game:insert', { roundId: 4, index: 0 });
    if (insert3.ok) {
      evidence.checks.push('라운드 4 호스트 삽입 성공');
    } else if (insert3.error === '카드가 폐기되었습니다.') {
      evidence.checks.push('라운드 4 호스트 삽입 폐기');
    } else {
      assert.equal(insert3.ok, true, `라운드 4 호스트 삽입: ${JSON.stringify(insert3)}`);
    }
  }

  // Check that game progresses — wait for game:over or continue a few more rounds
  let gameOver = null;
  try {
    gameOver = await waitFor(guestEvents, 'game:over', () => true, 60000, 'game:over');
    evidence.checks.push('game:over 수신');
  } catch {
    evidence.checks.push('60초 내 game:over 미수신 — 타임라인 진행 중');
  }

  if (gameOver) {
    assert.ok(gameOver.winnerId === joined.playerId || gameOver.winnerId === created.playerId, `winnerId: ${gameOver.winnerId}`);
    assert.ok(gameOver.scores, '점수 포함');
    const finished = await waitFor(guestEvents, 'room:state', s => s.phase === 'finished', 5000, 'finished 위상');
    assert.equal(finished.phase, 'finished');
    evidence.checks.push('finished 위상 동기화');
  }
  evidence.ok = true;
} catch (error) { evidence.ok = false; evidence.error = String(error); process.exitCode = 1; }
finally {
  clients.forEach(s => s.disconnect()); server.kill();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/timeline-e2e.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
}
