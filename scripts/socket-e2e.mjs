import { io } from 'socket.io-client';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { tracks } from '../shared/tracks.js';

const base = process.env.BASE || 'http://127.0.0.1:3001';
const port = 3101;
const server = spawn(process.execPath, ['server/minimal.mjs'], { env: { ...process.env, PORT: String(port), REVEAL_MS: '400' }, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; server.stdout.on('data', b => log += b); server.stderr.on('data', b => log += b);
const clients = [];
const evidence = { at: new Date().toISOString(), checks: [] };
const wait = ms => new Promise(r => setTimeout(r, ms));
const emit = async (socket, event, data) => {
  const result = await socket.timeout(3000).emitWithAck(event, data);
  return result; // emitWithAck already handles (error, result) correctly
};
async function connect() { const s = io(base, { forceNew: true, reconnection: false, transports: ['websocket'] }); clients.push(s); await new Promise((yes, no) => { s.once('connect', yes); s.once('connect_error', no); }); return s; }
const trackOf = round => tracks.find(t => t.providerId === round.preview.url.match(/demo\/track-([a-h])\.wav/)[1]);
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
  const state = await statePromise;
  assert.equal(JSON.stringify(state).includes(joined.token), false, '토큰은 브로드캐스트에 없음');
  evidence.checks.push('두 클라이언트 입장, 토큰은 브로드캐스트에 미포함');

  const configured = await emit(host, 'room:configure', { mode: 'speed', target: 'both', rounds: 10, snippetSeconds: 5 });
  assert.equal(configured.ok, true, `설정 ack: ${JSON.stringify(configured)}`);
  hostEvents = collect(host); guestEvents = collect(guest);

  assert.equal((await emit(host, 'game:start', {})).ok, true);
  const round1 = await waitFor(guestEvents, 'round:next', r => r.roundId === 1, 12000, '라운드 1');
  assert.equal(round1.track, undefined, 'reveal 전 곡 정보 비공개');
  assert.ok(round1.preview.url.includes('/demo/track-'), '미리듣기 URL 수신');
  const audio = await fetch(round1.preview.url);
  assert.equal(audio.status, 200, `미리듣기 HTTP: ${audio.status}`);
  assert.match(audio.headers.get('content-type') || '', /audio/, 'audio content-type');
  evidence.checks.push('라운드 1 시작, 데모 오디오 HTTP 200');

  const wrong = await emit(guest, 'game:answer', { roundId: 1, title: '없는 곡', artist: '없는 가수' });
  assert.equal(wrong.ok, false, `오답 ack: ${JSON.stringify(wrong)}`);
  await wait(400);
  assert.equal(hostEvents.filter(e => e.name === 'round:reveal').length, 0, '오답 시 리비일 없음');

  const track1 = trackOf(round1);
  const correct = await emit(guest, 'game:answer', { roundId: 1, title: track1.title, artist: track1.artist });
  assert.equal(correct.ok, true, `정답 ack: ${JSON.stringify(correct)}`);
  const reveal1 = await waitFor(hostEvents, 'round:reveal', r => r.roundId === 1, 12000, '리비일 1');
  assert.equal(reveal1.winnerId, joined.playerId, '최초 정답자 점수');
  assert.equal(reveal1.scores[joined.playerId], 1);
  assert.equal(reveal1.track.title, track1.title, '리비일 정답 공개');
  const duplicate = await emit(host, 'game:answer', { roundId: 1, title: track1.title, artist: track1.artist });
  assert.equal(duplicate.ok, false, '중복 정답 거절');
  evidence.checks.push('최초 정답자 1점, 중복 거절, 리비일 공개');

  for (let id = 2; id <= 10; id++) {
    await waitFor(guestEvents, 'round:next', r => r.roundId === id, 12000, `라운드 ${id}`);
    const track = trackOf(guestEvents.filter(e => e.name === 'round:next' && e.payload.roundId === id).at(-1).payload);
    const ack = await emit(host, 'game:answer', { roundId: id, title: track.title, artist: track.artist });
    assert.equal(ack.ok, true, `라운드 ${id} 정답 ack: ${JSON.stringify(ack)}`);
  }
  const over = await waitFor(guestEvents, 'game:over', () => true, 12000, 'game:over');
  assert.equal(over.scores[created.playerId], 9, `호스트 점수: ${JSON.stringify(over.scores)}`);
  assert.equal(over.scores[joined.playerId], 1);
  const finished = await waitFor(guestEvents, 'room:state', s => s.phase === 'finished', 5000, 'finished 위상');
  assert.equal(finished.phase, 'finished');
  evidence.checks.push('10라운드 전부 진행, game:over 점수와 finished 위상 동기화');
  evidence.eventLog = guestEvents.map(e => ({ name: e.name, roundId: e.payload.roundId, winnerId: e.payload.winnerId }));
  evidence.ok = true;
} catch (error) { evidence.ok = false; evidence.error = String(error); process.exitCode = 1; }
finally {
  clients.forEach(s => s.disconnect()); server.kill();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/socket-e2e.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
}
