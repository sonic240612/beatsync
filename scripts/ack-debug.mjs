import { io } from 'socket.io-client';
const base = 'http://127.0.0.1:3001';
const socket = io(base, { forceNew: true, reconnection: false, transports: ['websocket'] });
await new Promise((yes, no) => { socket.once('connect', yes); socket.once('connect_error', no); });
const result = await new Promise((resolve) => {
  socket.timeout(5000).emit('room:create', { name: 'tester' }, (...args) => resolve(args));
});
console.log('create args count:', result.length);
console.log('create args:', JSON.stringify(result));
socket.disconnect();
process.exit(0);
