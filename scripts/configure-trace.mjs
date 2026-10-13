import { io } from 'socket.io-client';
const base = 'http://127.0.0.1:3001';
const socket = io(base, { forceNew: true, reconnection: false, transports: ['websocket'] });
const wait = ms => new Promise(r => setTimeout(r, ms));
const emit = async (event, data) => {
  const result = await new Promise(resolve => socket.timeout(3000).emit(event, data, (...args) => resolve(args)));
  return result[1];
};

try {
  await new Promise((yes, no) => { socket.once('connect', yes); socket.once('connect_error', no); });
  const created = await emit('room:create', { name: '테스터' });
  console.log('create ok:', created.ok, 'code:', created.state?.code, 'playerId:', created.playerId);

  const configured = await emit('room:configure', { mode: 'speed', target: 'both', rounds: 10, snippetSeconds: 15 });
  console.log('configure ok:', configured.ok, 'snippet:', configured.state?.settings?.snippetSeconds);

  const guest = io(base, { forceNew: true, reconnection: false, transports: ['websocket'] });
  await new Promise((yes, no) => { guest.once('connect', yes); guest.once('connect_error', no); });
  const guestEmit = async (event, data) => {
    const result = await new Promise(resolve => guest.timeout(3000).emit(event, data, (...args) => resolve(args)));
    return result[1];
  };
  const joined = await guestEmit('room:join', { name: '게스트', code: created.state.code });
  console.log('join ok:', joined.ok, 'playerId:', joined.playerId);

  socket.disconnect(); guest.disconnect();
  process.exit(0);
} catch (e) { console.error('FAIL:', String(e)); process.exit(1); }
