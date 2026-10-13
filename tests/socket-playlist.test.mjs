import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { spawn } from 'node:child_process';

const PORT = 3099;
const SERVER_URL = `http://127.0.0.1:${PORT}`;

async function run() {
  const server = spawn('node', ['server/minimal.mjs'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });

  const cleanup = () => {
    try {
      server.kill();
    } catch {}
  };
  process.on('exit', cleanup);

  // Wait for server to come up
  await new Promise(resolve => setTimeout(resolve, 800));

  const socket = io(SERVER_URL, { transports: ['websocket'] });
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });

  console.log('Connected to test server.');

  // Create room
  const createRes = await socket.emitWithAck('room:create', { name: 'Host' });
  assert(createRes.ok, 'Room creation failed');
  console.log('Created room:', createRes.state.code);

  // Test 1: Configure with invalid playlist
  console.log('Testing configure with invalid playlist...');
  const invalidRes = await socket.emitWithAck('room:configure', {
    musicSource: 'spotify_playlist',
    playlistUrl: 'invalid_id_not_found',
  });
  assert.equal(invalidRes.ok, false, 'Invalid playlist should return ok: false');
  assert(invalidRes.error, 'Invalid playlist should return error message');
  console.log('Invalid playlist rejected correctly:', invalidRes.error);

  // Test 2: Configure with valid public playlist
  console.log('Testing configure with valid playlist...');
  const validRes = await socket.emitWithAck('room:configure', {
    musicSource: 'spotify_playlist',
    playlistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
  });
  assert.equal(validRes.ok, true, 'Valid playlist should return ok: true');
  console.log('Valid playlist applied correctly!');

  socket.disconnect();
  cleanup();
  console.log('\nsocket-playlist-config: ALL TESTS PASSED!');
  process.exit(0);
}

run().catch(err => {
  console.error('Socket test failed:', err);
  process.exit(1);
});
