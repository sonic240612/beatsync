import assert from 'node:assert/strict';
import {
  isKaraokeOrUnwantedTrack,
  isArtistMatching,
  isTitleMatching,
  resolveAudioPreview,
} from '../server/spotify-provider.js';

// 1. Karaoke & Instrumental Filter Tests
{
  const karaokeCases = [
    { title: 'Dynamite (Karaoke Version)', artist: 'Karaoke All Stars', shouldBeFiltered: true },
    { title: '좋은 날 (Inst.)', artist: '아이유', shouldBeFiltered: true },
    { title: '나는 나비 (MR)', artist: 'YB', shouldBeFiltered: true },
    { title: 'Hype Boy (Instrumental)', artist: 'NewJeans', shouldBeFiltered: true },
    { title: 'Bohemian Rhapsody (In The Style of Queen)', artist: 'Ameritz Karaoke', shouldBeFiltered: true },
    { title: 'Butter (Tribute to BTS)', artist: 'Piano Tribute Players', shouldBeFiltered: true },
    { title: 'Shape of You (Sing-Along Backing Track)', artist: 'Sing King', shouldBeFiltered: true },
    { title: '夜に駆ける (カラオケ)', artist: 'YOASOBI', shouldBeFiltered: true },
    { title: 'White Noise for Sleep', artist: 'Relaxing Rain', shouldBeFiltered: true },
    // Normal authentic tracks must NOT be filtered
    { title: 'Dynamite', artist: 'BTS', shouldBeFiltered: false },
    { title: '좋은 날', artist: '아이유', shouldBeFiltered: false },
    { title: 'Sugar', artist: 'Maroon 5', shouldBeFiltered: false },
    { title: '나는 나비', artist: 'YB', shouldBeFiltered: false },
    { title: 'Hype Boy', artist: 'NewJeans', shouldBeFiltered: false },
  ];

  for (const c of karaokeCases) {
    const result = isKaraokeOrUnwantedTrack(c.title, c.artist);
    assert.equal(
      result,
      c.shouldBeFiltered,
      `Track "${c.title}" by "${c.artist}" should have filtered=${c.shouldBeFiltered}, got ${result}`
    );
  }
}

// 2. Artist Matching Tests
{
  assert.equal(isArtistMatching('BTS', 'BTS'), true);
  assert.equal(isArtistMatching('BTS', '방탄소년단'), true);
  assert.equal(isArtistMatching('아이유', 'IU'), true);
  assert.equal(isArtistMatching('Maroon 5', 'Maroon 5'), true);
  assert.equal(isArtistMatching('NewJeans', 'NewJeans'), true);

  // Unrelated artists must return false
  assert.equal(isArtistMatching('BTS', 'Twon the Producer'), false);
  assert.equal(isArtistMatching('BTS', 'The Lullabeats'), false);
  assert.equal(isArtistMatching('IU', 'Post Malone'), false);
  assert.equal(isArtistMatching('Maroon 5', '7th Ave'), false);
}

// 3. Title Matching Tests
{
  assert.equal(isTitleMatching('Dynamite', 'Dynamite'), true);
  assert.equal(isTitleMatching('Dynamite', 'Dynamite (Holiday Remix)'), true);
  assert.equal(isTitleMatching('좋은 날', 'Good Day'), true); // cross-lingual translation
  assert.equal(isTitleMatching('어디에도', 'No Matter Where'), true);
  assert.equal(isTitleMatching('Sugar', 'Sugar'), true);

  // Mismatched titles must return false
  assert.equal(isTitleMatching('좋은 날', 'Congratulations'), false);
  assert.equal(isTitleMatching('Sugar', 'Animals'), false);
}

// 4. ResolveAudioPreview integration test
{
  const res = await resolveAudioPreview('Dynamite', 'BTS');
  assert.ok(res, 'Dynamite by BTS should resolve');
  assert.ok(res.previewUrl, 'Dynamite should have previewUrl');
  assert.equal(res.altArtist, 'BTS', 'Alt artist must be BTS');
}

console.log('quality-filter: all assertions passed!');
