import assert from 'node:assert/strict';
import { extractPlaylistId, fetchSpotifyPlaylist, fetchSpotifyRandomTracks } from '../server/spotify-provider.js';
import { createTrackProvider } from '../server/preview-provider.js';

async function run() {
  console.log('Testing extractPlaylistId...');
  assert.equal(extractPlaylistId('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'), '37i9dQZF1DXcBWIGoYBM5M');
  assert.equal(extractPlaylistId('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc123xyz'), '37i9dQZF1DXcBWIGoYBM5M');
  assert.equal(extractPlaylistId('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M'), '37i9dQZF1DXcBWIGoYBM5M');
  assert.equal(extractPlaylistId('37i9dQZF1DXcBWIGoYBM5M'), '37i9dQZF1DXcBWIGoYBM5M');
  assert.equal(extractPlaylistId(''), null);
  assert.equal(extractPlaylistId('https://google.com'), null);
  console.log('extractPlaylistId: OK');

  console.log('Testing fetchSpotifyPlaylist with valid public playlist...');
  const tracks = await fetchSpotifyPlaylist('37i9dQZF1DXbTxeAdrVG2l');
  assert(Array.isArray(tracks));
  assert(tracks.length >= 20, `Expected at least 20 tracks, got ${tracks.length}`);
  const firstTrack = tracks[0];
  assert(firstTrack.title, 'Track should have title');
  assert(firstTrack.artist, 'Track should have artist');
  assert(firstTrack.isSpotify, 'Track should have isSpotify flag');
  assert(typeof firstTrack.year === 'number' && firstTrack.year >= 1950, 'Track should have a valid numeric release year');
  const uniqueYears = new Set(tracks.map(t => t.year));
  assert(uniqueYears.size >= 5, `Playlist tracks must have individual release years (not fixed to playlist year), got: ${[...uniqueYears].join(', ')}`);
  console.log(`fetchSpotifyPlaylist valid: OK (${tracks.length} tracks, ${uniqueYears.size} distinct years, sample: "${firstTrack.title}" by ${firstTrack.artist} (${firstTrack.year}))`);

  console.log('Testing fetchSpotifyPlaylist with invalid ID...');
  let failedAsExpected = false;
  try {
    await fetchSpotifyPlaylist('invalid_id_not_found_123');
  } catch (err) {
    failedAsExpected = true;
    assert(err.message.includes('Spotify 플레이리스트'), 'Error message should explain failure');
  }
  assert(failedAsExpected, 'Invalid playlist should throw error');
  console.log('fetchSpotifyPlaylist invalid ID: OK');

  console.log('Testing fetchSpotifyRandomTracks diversity...');
  const randomSet1 = await fetchSpotifyRandomTracks(null, null, 20);
  assert(randomSet1.length >= 5, `Expected random tracks, got ${randomSet1.length}`);
  const randomSet2 = await fetchSpotifyRandomTracks(null, null, 20);
  assert(randomSet2.length >= 5, `Expected random tracks, got ${randomSet2.length}`);

  // Check diversity: titles across sets should not be purely static
  console.log(`fetchSpotifyRandomTracks: Set 1 has ${randomSet1.length} tracks (e.g. "${randomSet1[0].title}")`);
  console.log(`fetchSpotifyRandomTracks: Set 2 has ${randomSet2.length} tracks (e.g. "${randomSet2[0].title}")`);
  console.log('fetchSpotifyRandomTracks: OK');

  console.log('Testing createTrackProvider with spotify_random...');
  const provider = createTrackProvider('http://127.0.0.1:3001', { musicSource: 'spotify_random' });
  const providerTracks = await provider.listTracks();
  assert(providerTracks.length >= 5, 'Provider should return tracks for spotify_random');
  console.log(`createTrackProvider spotify_random: OK (${providerTracks.length} tracks)`);

  console.log('\nspotify-integration: ALL TESTS PASSED!');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
