import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { spawn } from 'node:child_process';

const PORT = 3098;
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

  // Wait for server to come up with retry
  let socket;
  for (let i = 0; i < 20; i++) {
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      socket = io(SERVER_URL, { transports: ['websocket'], timeout: 1000 });
      await new Promise((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
      });
      break;
    } catch {
      socket?.disconnect();
      socket = null;
    }
  }
  if (!socket) throw new Error('Could not connect to test server');

  console.log('Connected to test server.');

  // Test 1: Create room with timeline_all directly without mode - stays in speed mode
  console.log('Test 1: Creating room with timeline_all...');
  const createRes1 = await socket.emitWithAck('room:create', { name: 'Host1', musicSource: 'timeline_all' });
  assert(createRes1.ok, 'Room 1 creation failed');
  assert.equal(createRes1.state.settings.musicSource, 'timeline_all');
  assert.equal(createRes1.state.settings.mode, 'speed', 'Creating with timeline_all should not force timeline mode');
  assert.equal(createRes1.state.settings.rounds, 20, 'Default speed rounds should be 20');
  assert.equal(createRes1.state.settings.snippetSeconds, 30, 'Default speed snippetSeconds should be 30');
  console.log('✓ Room 1 created with timeline_all and mode: speed (defaults: 20 rounds, 30s snippet)');

  // Leave room 1
  await socket.emitWithAck('room:leave');

  // Test 2: Create room with default, then configure with musicSource: timeline_all without changing mode
  console.log('Test 2: Create default room, then configure with musicSource: timeline_all...');
  const createRes2 = await socket.emitWithAck('room:create', { name: 'Host2' });
  assert(createRes2.ok, 'Room 2 creation failed');
  assert.equal(createRes2.state.settings.mode, 'speed');
  assert.equal(createRes2.state.settings.musicSource, 'kpop_hits');
  assert.equal(createRes2.state.settings.rounds, 20);
  assert.equal(createRes2.state.settings.snippetSeconds, 30);

  // Configure only musicSource: timeline_all -> should NOT change mode to timeline
  const configRes = await socket.emitWithAck('room:configure', { musicSource: 'timeline_all' });
  assert.equal(configRes.ok, true, `Configure timeline_all should succeed without error, got: ${configRes.error}`);
  assert.equal(configRes.state.settings.musicSource, 'timeline_all');
  assert.equal(configRes.state.settings.mode, 'speed', 'Selecting timeline_all catalog should NOT change mode to timeline');
  console.log('✓ room:configure with timeline_all kept mode: speed as requested');

  // Test 3: Can still explicitly set mode to timeline if desired
  console.log('Test 3: Explicitly set mode to timeline...');
  const configRes2 = await socket.emitWithAck('room:configure', { mode: 'timeline' });
  assert.equal(configRes2.ok, true);
  assert.equal(configRes2.state.settings.mode, 'timeline');

  // Test 4: Start game with timeline_all in timeline mode
  console.log('Test 4: Start game with timeline_all in timeline mode...');
  const startRes = await socket.emitWithAck('game:start');
  assert(startRes.ok, `Game start failed: ${startRes.error}`);

  // Wait a short moment for round:next event or state update
  await new Promise(resolve => setTimeout(resolve, 500));

  assert(createRes2.state, 'Room state exists');
  console.log('✓ Game started successfully in timeline mode with timeline_all catalog!');

  socket.disconnect();
  cleanup();
  console.log('\ntimeline-catalog-integration: ALL TESTS PASSED!');
  process.exit(0);
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
