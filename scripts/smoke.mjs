import { io } from 'socket.io-client';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.env.SERVER_URL || 'http://127.0.0.1:3001';
const sockets = [];
const evidence = { at: new Date().toISOString(), url, checks: [] };
async function connect() {
  const s = io(url, { forceNew: true, reconnection: false, transports: ['websocket'] });
  sockets.push(s);
  await new Promise((resolve, reject) => { s.once('connect', resolve); s.once('connect_error', reject); });
  return s;
}
async function emit(s, event, data) { return s.timeout(3000).emitWithAck(event, data); }
try {
  const health = await (await fetch(`${url}/health`)).json();
  assert.equal(health.ok, true);
  evidence.checks.push('HTTP health: OK');
  const a = await connect(), b = await connect();
  assert.notEqual(a.id, b.id);
  evidence.checks.push('Two independent WebSocket connections: OK');
  const created = await emit(a, 'room:create', { name: '호스트' });
  assert.equal(created.ok, true);
  assert.equal(created.state.players.length, 1);
  const code = created.state.code;
  const statePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('broadcast timeout')), 3000);
    a.on('room:state', state => { if (state.players.length === 2) { clearTimeout(timeout); resolve(state); } });
  });
  const joined = await emit(b, 'room:join', { name: '게스트', code });
  assert.equal(joined.ok, true);
  assert.equal(joined.state.players.length, 2);
  const broadcast = await statePromise;
  assert.equal(broadcast.code, code);
  evidence.checks.push(`Room ${code}: created, joined, broadcast to host: OK`);
  const duplicate = await emit(b, 'room:join', { name: '중복', code });
  assert.equal(duplicate.ok, false);
  evidence.checks.push('Duplicate join rejected: OK');
  evidence.ok = true;
} catch (error) { evidence.ok = false; evidence.error = String(error); process.exitCode = 1; }
finally {
  sockets.forEach(s => s.disconnect());
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/minimal-smoke.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
}
