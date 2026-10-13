import express from 'express';
import { Server } from 'socket.io';
import { io as client } from 'socket.io-client';
import { randomBytes } from 'node:crypto';
const http = express();
const io = new Server(http);
const rooms = new Map();
const identity = () => ({ playerId: 'p1', token: 't1' });
io.on('connection', (socket) => {
  const guard = fn => (data, ack) => {
    if (typeof ack !== 'function') return;
    try { ack({ ok: true, ...fn(data) }); } catch (error) { ack({ ok: false, error: error.message }); }
  };
  const toAck = (result) => {
    if (result && typeof result === 'object' && 'ok' in result && result.ok === false) return result;
    return { ok: true };
  };
  socket.on('room:create', guard(data => {
    if (rooms.size >= 100) throw Error('full');
    let code; do { code = 'CODE'; } while (rooms.has(code));
    const { playerId, token } = identity();
    const room = { code, phase: 'lobby', hostId: playerId, settings: { mode: 'speed', target: 'both', rounds: 10, snippetSeconds: 15 }, players: [{ id: playerId, name: 'test', token, connected: true }] };
    rooms.set(code, room);
    return { playerId, token, state: { code, phase: 'lobby', players: [1] } };
  }));
  socket.on('test-then-leave', guard(() => { return toAck({}); }));
  socket.on('test-error', guard(() => { throw Error('test error'); }));
  socket.on('no-return', guard(() => { return undefined; }));
});
http.listen(3106, '127.0.0.1', async () => {
  const s = client('http://127.0.0.1:3106');
  s.on('connect', async () => {
    const r1 = await s.timeout(2000).emitWithAck('room:create', { name: 'test' });
    console.log('room:create:', r1 === null ? 'NULL' : JSON.stringify(r1));
    const r2 = await s.timeout(2000).emitWithAck('test-then-leave', {});
    console.log('test-then-leave:', r2 === null ? 'NULL' : JSON.stringify(r2));
    const r3 = await s.timeout(2000).emitWithAck('test-error', {});
    console.log('test-error:', r3 === null ? 'NULL' : JSON.stringify(r3));
    const r4 = await s.timeout(2000).emitWithAck('no-return', {});
    console.log('no-return:', r4 === null ? 'NULL' : JSON.stringify(r4));
    s.disconnect(); http.close(); process.exit(0);
  });
});
