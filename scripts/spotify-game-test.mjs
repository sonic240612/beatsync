import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';
import assert from 'node:assert/strict';
import { resolveAudioPreview } from '../server/spotify-provider.js';
import { createTrackProvider } from '../server/preview-provider.js';

const port = 3199;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server/minimal.mjs'], {
  env: { ...process.env, PORT: String(port), REVEAL_MS: '400' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

const clients = [];
const wait = ms => new Promise(r => setTimeout(r, ms));
const call = (s, event, data) => s.timeout(4000).emitWithAck(event, data);

async function connect() {
  const s = io(base, { forceNew: true, reconnection: false, transports: ['websocket'] });
  clients.push(s);
  await new Promise((yes, no) => {
    s.once('connect', yes);
    s.once('connect_error', no);
  });
  return s;
}

try {
  console.log('1. Testing Universal Audio Preview Fallback (Free Spotify support)...');
  const preview = await resolveAudioPreview('좋은 날', '아이유');
  assert.ok(preview?.previewUrl, 'Audio preview resolved');
  assert.ok(preview?.previewUrl.startsWith('http'), 'Audio preview is a valid URL');
  console.log('   ✓ Audio preview resolved:', preview.previewUrl.slice(0, 60) + '...');

  console.log('2. Testing TrackProvider with kpop_hits...');
  const provider = createTrackProvider(base, { musicSource: 'kpop_hits' });
  const tracks = await provider.listTracks();
  assert.ok(tracks.length >= 10, 'Provider loaded 10+ K-Pop tracks');
  console.log(`   ✓ Provider loaded ${tracks.length} tracks.`);

  console.log('3. Waiting for server to start...');
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`${base}/health`);
      if (res.ok) break;
    } catch {}
    await wait(50);
  }

  console.log('4. Connecting clients and creating room with kpop_hits...');
  const host = await connect();
  const guest = await connect();

  const hostCreated = await call(host, 'room:create', { name: '호스트', musicSource: 'kpop_hits' });
  assert.equal(hostCreated.ok, true);
  assert.equal(hostCreated.state.settings.musicSource, 'kpop_hits');
  const code = hostCreated.state.code;

  const guestJoined = await call(guest, 'room:join', { name: '게스트', code });
  assert.equal(guestJoined.ok, true);
  assert.equal(guestJoined.state.players.length, 2);

  console.log('5. Starting Speed Game...');
  let nextRound = null;
  guest.on('round:next', r => { nextRound = r; });
  let roundReveal = null;
  guest.on('round:reveal', r => { roundReveal = r; });

  const started = await call(host, 'game:start', {});
  assert.equal(started.ok, true);

  await wait(500);
  assert.ok(nextRound, 'Received round:next');
  assert.ok(nextRound.preview?.url, 'Has preview audio URL');
  console.log('   ✓ Round 1 audio preview URL:', nextRound.preview.url.slice(0, 60) + '...');

  // Test speed answer submission
  console.log('6. Submitting answer in Speed Game...');
  const currentTrack = tracks.find(t => t.id === nextRound.preview.url || true);
  // Submit an answer
  const answerResult = await call(guest, 'game:answer', {
    roundId: nextRound.roundId,
    title: '오답테스트',
    artist: '오답가수',
  });
  assert.equal(answerResult.ok, false, 'Wrong answer rejected');

  console.log('7. Testing Timeline Mode...');
  // Configure for timeline mode
  await call(host, 'game:reset', {}).catch(() => {});
  // Leave and create new room for timeline mode test
  await call(host, 'room:leave', {});
  await call(guest, 'room:leave', {});

  const host2 = await connect();
  const guest2 = await connect();
  const r2 = await call(host2, 'room:create', { name: '호스트2' });
  await call(guest2, 'room:join', { name: '게스트2', code: r2.state.code });
  await call(host2, 'room:configure', { mode: 'timeline', snippetSeconds: 15 });
  
  let timelineState = null;
  guest2.on('room:state', s => { timelineState = s; });

  let currentRound = null;
  guest2.on('round:next', r => { currentRound = r; });

  const timelineStart = await call(host2, 'game:start', {});
  assert.equal(timelineStart.ok, true);
  await wait(500);

  const guestTimeline = timelineState?.timelines?.[guest2.id] || timelineState?.timelines?.[r2.playerId];
  assert.ok(guestTimeline && guestTimeline.length >= 2, 'Starting timeline has 2 cards');
  console.log('   ✓ Timeline mode initialized with 2 starter cards.');

  assert.ok(currentRound?.roundId, 'Received currentRound with roundId');
  let timelineReveal = null;
  guest2.on('round:reveal', r => { timelineReveal = r; });
  let nextTimelineRound = null;
  guest2.on('round:next', r => { nextTimelineRound = r; });

  // Test inserting card (slot 0) using current turn player
  const turnPlayer = currentRound.turn === guest2.id ? guest2 : host2;
  const insertRes = await call(turnPlayer, 'game:insert', { roundId: currentRound.roundId, index: 0 });
  assert.ok(insertRes.ok || insertRes.error === '카드가 폐기되었습니다.', 'Insert executed (either correct slot or discarded)');
  await wait(300);
  assert.ok(timelineReveal, 'Received timeline reveal');
  assert.ok(timelineReveal.track?.title, 'Timeline reveal includes track title');
  console.log('   ✓ Timeline insert evaluated (success:', timelineReveal.success, ')');

  // Verify that in timeline mode, it does NOT auto-advance without game:next
  await wait(600);
  assert.equal(nextTimelineRound, null, 'Timeline mode did not auto-advance without manual skip button');

  // Now press "Next / Skip" button
  const skipResult = await call(host2, 'game:next', {});
  assert.equal(skipResult.ok, true, 'game:next successfully advanced the turn');
  await wait(300);
  assert.ok(nextTimelineRound, 'Next round began after manual skip button');
  console.log('   ✓ Timeline mode manually advanced to next turn upon button click.');

  console.log('8. Testing Spotify Random Shuffle Theme (spotify_random)...');
  const randomProvider = createTrackProvider(base, { musicSource: 'spotify_random' });
  const randomTracks = await randomProvider.listTracks();
  assert.ok(randomTracks.length >= 10, 'Random provider returned 10+ shuffled tracks');
  console.log(`   ✓ Spotify Random Shuffle loaded ${randomTracks.length} diverse tracks.`);

  // Test creating room with spotify_random
  await call(host2, 'room:leave', {});
  await call(guest2, 'room:leave', {});

  const host3 = await connect();
  const guest3 = await connect();
  const r3 = await call(host3, 'room:create', { name: '랜덤호스트', musicSource: 'spotify_random' });
  assert.equal(r3.ok, true);
  assert.equal(r3.state.settings.musicSource, 'spotify_random');
  await call(guest3, 'room:join', { name: '랜덤게스트', code: r3.state.code });

  let randomRound = null;
  guest3.on('round:next', r => { randomRound = r; });
  const startRandomGame = await call(host3, 'game:start', {});
  assert.equal(startRandomGame.ok, true);
  await wait(500);
  assert.ok(randomRound, 'Received round:next in spotify_random mode');
  assert.ok(randomRound.preview?.url, 'spotify_random round has valid preview URL');
  console.log('   ✓ Random shuffle game started with preview URL:', randomRound.preview.url.slice(0, 60) + '...');

  console.log('9. Testing 1-Player Solo Game Start...');
  await call(host3, 'room:leave', {});
  await call(guest3, 'room:leave', {});

  const soloPlayer = await connect();
  const soloRoom = await call(soloPlayer, 'room:create', { name: '솔로플레이어', musicSource: 'kpop_hits' });
  assert.equal(soloRoom.ok, true);
  assert.equal(soloRoom.state.players.length, 1);

  let soloRound = null;
  soloPlayer.on('round:next', r => { soloRound = r; });

  const soloStart = await call(soloPlayer, 'game:start', {});
  assert.equal(soloStart.ok, true, '1 player game started successfully without errors');
  await wait(500);
  assert.ok(soloRound, 'Received round:next in 1-player game');
  assert.ok(soloRound.preview?.url, '1-player round has audio preview URL');
  console.log('   ✓ 1-Player solo game started successfully!');

  console.log('\n========================================');
  console.log(' ALL VERIFICATIONS PASSED SUCCESSFULLY! ');
  console.log('========================================\n');
} catch (err) {
  console.error('Test failed:', err);
  process.exitCode = 1;
} finally {
  clients.forEach(s => s.disconnect());
  server.kill();
}
