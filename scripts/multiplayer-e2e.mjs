import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const port = 3101;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server/minimal.mjs'], { env: { ...process.env, PORT: String(port), ROOM_GRACE_MS: '250' }, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; server.stdout.on('data', b => log += b); server.stderr.on('data', b => log += b);
const clients = [];
const evidence = { at: new Date().toISOString(), checks: [] };
const wait = ms => new Promise(r => setTimeout(r, ms));
async function eventually(fn) { for (let i = 0; i < 100; i++) { if (await fn()) return; await wait(30); } throw Error('condition timed out'); }
async function connect() { const s = io(base, { forceNew: true, reconnection: false, transports: ['websocket'] }); clients.push(s); await new Promise((yes, no) => { s.once('connect', yes); s.once('connect_error', no); }); return s; }
const call = (s, event, data) => s.timeout(2000).emitWithAck(event, data);
try {
  await eventually(async () => { try { return (await fetch(base + '/health')).ok; } catch { return false; } });
  const a = await connect(), b = await connect();
  assert.equal((await call(a, 'room:create', { name: '' })).ok, false);
  assert.equal((await call(a, 'room:create', { name: 123 })).ok, false);
  const host = await call(a, 'room:create', { name: '호스트' }); assert.equal(host.ok, true);
  assert.equal(host.state.hostId, host.playerId);
  assert.equal(typeof host.token, 'string');
  assert.equal(JSON.stringify(host.state).includes(host.token), false);
  evidence.checks.push('Invalid names rejected; server assigns host; secret excluded from state');
  const guest = await call(b, 'room:join', { name: '게스트', code: host.state.code });
  assert.equal(guest.ok, true); assert.equal(guest.state.players.length, 2);
  assert.equal((await call(b, 'room:join', { name: '중복', code: host.state.code })).ok, false);
  assert.equal((await call(b, 'room:configure', { mode: 'timeline', target: 'title', rounds: 10, snippetSeconds: 5 })).ok, false);
  assert.equal((await call(a, 'room:configure', { mode: 'bad', target: 'title', rounds: 10, snippetSeconds: 5 })).ok, false);
  evidence.checks.push('Two clients joined; duplicate join, guest configuration and invalid settings rejected');
  let latest; b.on('room:state', state => latest = state);
  a.disconnect();
  await eventually(() => latest?.hostId === guest.playerId);
  const resumed = await connect();
  assert.equal((await call(resumed, 'room:resume', { code: host.state.code, playerId: host.playerId, token: 'wrong' })).ok, false);
  const recovered = await call(resumed, 'room:resume', { code: host.state.code, playerId: host.playerId, token: host.token });
  assert.equal(recovered.ok, true); assert.equal(recovered.playerId, host.playerId); assert.equal(recovered.state.players.length, 2);
  evidence.checks.push('Disconnected host transferred; invalid token rejected; valid token restores stable identity');
  await call(resumed, 'room:leave', {}); await call(b, 'room:leave', {});
  await eventually(async () => (await (await fetch(base + '/health')).json()).rooms === 0);
  const tmp = await call(b, 'room:create', { name: '정리' }); assert.equal(tmp.ok, true); b.disconnect();
  await eventually(async () => (await (await fetch(base + '/health')).json()).rooms === 0);
  evidence.checks.push('Explicit leave and expired disconnect both delete empty rooms');
  evidence.ok = true;
} catch (error) { evidence.ok = false; evidence.error = String(error); process.exitCode = 1; }
finally { clients.forEach(s => s.disconnect()); server.kill(); await mkdir('artifacts', { recursive: true }); await writeFile('artifacts/multiplayer-e2e.json', JSON.stringify(evidence, null, 2)); await writeFile('artifacts/multiplayer-server.log', log); console.log(JSON.stringify(evidence, null, 2)); }
