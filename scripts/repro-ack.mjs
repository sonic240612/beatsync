import { io } from 'socket.io-client';
const base = 'http://127.0.0.1:3001';
const socket = io(base, { forceNew: true, reconnection: false, transports: ['websocket'] });
const wait = ms => new Promise(r => setTimeout(r, ms));
await new Promise((yes, no) => { socket.once('connect', yes); socket.once('connect_error', no); });

// A: 응답에서 아무것도 반환하지 않는 핸들러로 보낸 ack
const t1 = setTimeout(() => console.log('[A] TIMEOUT 2s'), 2000);
socket.timeout(2000).emit('room:leave', {}, value => { clearTimeout(t1); console.log('[A room:leave]', value === undefined ? 'undefined' : value === null ? 'null' : JSON.stringify(value)); });

// B: room:create — join + 브로드캐스트 후 ack
const t2 = setTimeout(() => console.log('[B] TIMEOUT 2s'), 2000);
socket.timeout(2000).emit('room:create', { name: '재현' }, value => { clearTimeout(t2); console.log('[B room:create]', value === undefined ? 'undefined' : value === null ? 'null' : JSON.stringify({ ...value, state: value.state ? '有' : value.state })); });

await wait(300);
socket.disconnect();
process.exit(0);
