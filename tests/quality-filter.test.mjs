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

  // Unwanted localized language versions must NOT match original songs
  assert.equal(isTitleMatching('I AM', 'I AM -Japanese version-'), false);
  assert.equal(isTitleMatching('미스터', 'Mister (Japanese Version)'), false);
  assert.equal(isTitleMatching('CHEER UP', 'CHEER UP -Japanese ver.-'), false);
  assert.equal(isTitleMatching('TT', 'TT -Japanese ver.-'), false);
  assert.equal(isTitleMatching('DDU-DU DDU-DU', 'DDU-DU DDU-DU -JP Ver.-'), false);
  assert.equal(isTitleMatching('アイドル', 'Idol (English Version)'), false);

  // Overly broad substring matches must NOT match completely different songs
  assert.equal(isTitleMatching('미스터', 'Mister Music', ['mister']), false);
}

// 4. ResolveAudioPreview integration test
{
  const res = await resolveAudioPreview('Dynamite', 'BTS');
  assert.ok(res, 'Dynamite by BTS should resolve');
  assert.ok(res.previewUrl, 'Dynamite should have previewUrl');
  assert.equal(res.altArtist, 'BTS', 'Alt artist must be BTS');
}

// 5. Reported tracks resolution test
{
  const reportedTracks = [
    { title: '신호등', artist: '이무진', aliases: { title: ['traffic light'], artist: ['lee mujin'] } },
    { title: '나만, 봄', artist: '볼빨간사춘기', aliases: { title: ['나만 봄', '나만봄'], artist: ['bol4', '볼사'] } },
    { title: '雪の華', artist: '中島美嘉', aliases: { title: ['눈의 꽃', '유키노하나', 'yuki no hana'], artist: ['나카시마 미카'] } },
    { title: 'さよならエレジー', artist: '菅田将暉', aliases: { title: ['사요나라 엘레지', '안녕 엘레지'], artist: ['스다 마사키'] } },
    { title: 'きらり', artist: '藤井風', aliases: { title: ['키라리', '반짝임'], artist: ['후지이 카제', 'fujii kaze'] } },
    { title: 'Mixed Nuts', artist: 'Official髭男dism', aliases: { title: ['믹스 넛', '스파이 패밀리'], artist: ['오피셜히게단디즘', '히게단'] } }
  ];

  for (const t of reportedTracks) {
    const res = await resolveAudioPreview(t.title, t.artist, t.aliases.title, t.aliases.artist);
    assert.ok(res, `Track "${t.title}" by "${t.artist}" should resolve`);
    assert.ok(res.previewUrl, `Track "${t.title}" by "${t.artist}" should have previewUrl`);
    assert.ok(typeof res.previewUrl === 'string' && res.previewUrl.startsWith('http'), `PreviewUrl should be HTTP URL`);
  }
}

console.log('quality-filter: all assertions passed!');
