import assert from 'node:assert/strict';
import { fetchSpotifyPlaylist, fetchSpotifyRandomTracks } from '../server/spotify-provider.js';

async function run() {
  console.log('Testing userToken parameter acceptance...');
  // Validates that fetchSpotifyPlaylist accepts userToken without error
  try {
    const tracks = await fetchSpotifyPlaylist('37i9dQZF1DXcBWIGoYBM5M', null, null, 'mock_token_for_fallback_test');
    assert(tracks.length > 0, 'Should fall back gracefully and return tracks');
    console.log('fetchSpotifyPlaylist with token fallback: OK');
  } catch (e) {
    console.error(e);
    assert.fail('Should not throw on valid playlist');
  }

  // Validates that fetchSpotifyRandomTracks accepts userToken without error
  try {
    const tracks = await fetchSpotifyRandomTracks(null, null, 15, 'mock_token_for_fallback_test');
    assert(tracks.length > 0, 'Should return random tracks');
    console.log('fetchSpotifyRandomTracks with token fallback: OK');
  } catch (e) {
    console.error(e);
    assert.fail('Should not throw on random tracks');
  }

  console.log('User token handling tests passed!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
