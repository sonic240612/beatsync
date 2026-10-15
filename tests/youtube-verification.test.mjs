import test from 'node:test';
import assert from 'node:assert/strict';

// Test negative pattern filtering and scoring logic
const NEGATIVE_PATTERNS = [
  /\bcover\b/i,
  /커버/i,
  /covered\s+by/i,
  /cover\s+by/i,
  /노래방/i,
  /\bkaraoke\b/i,
  /\bmr\b/i,
  /\binst(?:\.|\b|rumental)/i,
  /반주/i,
  /tj노래방/i,
  /금영/i,
  /1\s*시간/i,
  /10\s*시간/i,
  /1\s*hour/i,
  /10\s*hours/i,
  /연속\s*듣기/i,
  /플레이리스트/i,
  /\bplaylist\b/i,
  /모음/i,
  /medley/i,
  /메들리/i,
  /\breaction\b/i,
  /리액션/i,
  /\breview\b/i,
  /교차\s*편집/i,
  /stage\s*mix/i,
  /speed\s*up/i,
  /sped\s*up/i,
  /배속/i,
  /slowed/i,
  /nightcore/i,
  /8d\s*audio/i,
  /직캠/i,
  /fancam/i,
  /응원법/i,
  /fanchant/i,
  /teaser/i,
  /티저/i,
  /trailer/i,
  /making\s*film/i,
  /메이킹/i,
  /behind\s*the\s*scenes/i,
  /비하인드/i,
  /challenge/i,
  /챌린지/i,
  /\bshorts\b/i,
  /acapella/i,
  /아카펠라/i,
];

function isDisqualified(title, targetTitle = '') {
  for (const pat of NEGATIVE_PATTERNS) {
    if (pat.test(title)) {
      if (!pat.test(targetTitle)) return true;
    }
  }
  return false;
}

test('Anti-cover filter catches covers, karaoke, 1-hour loops, reactions, and teasers', () => {
  assert.equal(isDisqualified('NewJeans - Ditto (Cover by Singer)'), true);
  assert.equal(isDisqualified('Ditto 커버 [가사]'), true);
  assert.equal(isDisqualified('[TJ노래방] Love poem - IU / TJ Karaoke'), true);
  assert.equal(isDisqualified('윤하 - 사건의 지평선 (MR / 반주)'), true);
  assert.equal(isDisqualified('아이유 노래 모음 1시간 연속듣기'), true);
  assert.equal(isDisqualified('비비 밤양갱 뮤비 외국인 리액션 reaction'), true);
  assert.equal(isDisqualified('NewJeans Supernatural Teaser 티저 1'), true);
  assert.equal(isDisqualified('방탄소년단 Dynamite 교차편집 Stage Mix'), true);
  assert.equal(isDisqualified('IVE - I AM Sped Up 배속'), true);

  // Legitimate titles are not disqualified
  assert.equal(isDisqualified("NewJeans (뉴진스) 'Ditto' Official MV (side A)"), false);
  assert.equal(isDisqualified("NewJeans (뉴진스) 'Ditto' Official Audio"), false);
  assert.equal(isDisqualified("윤하(YOUNHA) - 사건의 지평선 M/V"), false);
  assert.equal(isDisqualified("비비 (BIBI) - 밤양갱(Bam Yang Gang) Official M/V"), false);
});
