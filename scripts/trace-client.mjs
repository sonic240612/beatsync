import { io } from 'socket.io-client';
const base = 'http://127.0.0.1:3001';
const socket = io(base, { forceNew: true, reconnection: false, transports: ['websocket'] });
const wait = ms => new Promise(r => setTimeout(r, ms));
const emit = (event, data) => new Promise(resolve => socket.timeout(3000).emit(event, data, (...args) => resolve(args[1])));

try {
  await new Promise((yes, no) => { socket.once('connect', yes); socket.once('connect_error', no); });
  const created = await emit('room:create', { name: '단독테스터' });
  console.log('ack:room:create', { ok: created.ok, playerId: created.playerId, code: created.state?.code });
  if (!created.ok) throw Error('room:create 실패');

  const resumed = await emit('room:resume', { code: created.state.code, playerId: created.playerId, token: created.token });
  console.log('ack:room:resume', { ok: resumed.ok, error: resumed.error });

  const configured = await emit('room:configure', { mode: 'speed', target: 'both', rounds: 10, snippetSeconds: 5 });
  console.log('ack:room:configure', { ok: configured.ok, error: configured.error, snippet: configured.state?.settings?.snippetSeconds });

  const started = await emit('game:start', {});
  console.log('ack:game:start', { ok: started.ok, error: started.error });

  console.log('note: 단독 1인은 게임 시작이 2인 조건으로 거절되어야 정상입니다. 위 ack를 확인하세요.');
  await wait(1000);
  process.exit(0);
} catch (error) { console.log('fatal', String(error)); process.exit(1); }
