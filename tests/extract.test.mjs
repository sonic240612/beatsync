import assert from 'node:assert/strict';

const BRACKET_REGEX = /\s*[\(\[\{（［｛【〔〈《『「]([^\)\]\}）］｝】〕〉》』」]+)[\)\]\}）］｝】〕〉》』」]\s*/g;

function clean(s) {
  if (!s) return '';
  return s.trim().replace(/^[\s\-~'"`]+|[\s\-~'"`]+$/g, '').trim();
}

const GENERIC_TAG_REGEX = /^(?:inst|instrumental|remaster(?:ed)?|remix|live|acoustic|ver(?:sion)?|clean|explicit|radio edit|original mix|feat\.?.*|ft\.?.*|prod\.?.*|ost.*)$/i;

export function extractVariants(str) {
  if (!str || typeof str !== 'string') return [];
  const raw = clean(str);
  if (!raw) return [];

  const candidates = new Set();
  candidates.add(raw);

  // 1. Remove all bracketed / parenthetical segments: 'Title (Subtitle)' -> 'Title'
  const withoutBrackets = clean(raw.replace(BRACKET_REGEX, ' '));
  if (withoutBrackets && withoutBrackets !== raw) {
    candidates.add(withoutBrackets);
  }

  // 2. Extract content inside brackets: 'Title (Subtitle)' -> 'Subtitle'
  // (Filter out generic audio tags like 'Instrumental', 'Remastered', etc.)
  const bracketMatches = [...raw.matchAll(BRACKET_REGEX)];
  for (const m of bracketMatches) {
    const inner = clean(m[1] || '');
    if (inner && inner.length >= 2 && !GENERIC_TAG_REGEX.test(inner)) {
      candidates.add(inner);
      const innerClean = clean(inner.replace(BRACKET_REGEX, ' '));
      if (innerClean && innerClean.length >= 2 && !GENERIC_TAG_REGEX.test(innerClean)) {
        candidates.add(innerClean);
      }
    }
  }

  // 3. Dash / Hyphen / Tilde separated subtitles: 'Title - Subtitle' -> 'Title'
  for (const item of [...candidates]) {
    if (/\s+[-–—~|]\s+/.test(item)) {
      const parts = item.split(/\s+[-–—~|]\s+/);
      const mainPart = clean(parts[0]);
      if (mainPart && mainPart.length >= 1) candidates.add(mainPart);
      const subPart = clean(parts[1]);
      if (subPart && subPart.length >= 2 && !GENERIC_TAG_REGEX.test(subPart)) {
        candidates.add(subPart);
      }
    }
  }

  // 4. Featuring / with / prod. by at text level: 'Title feat. X' -> 'Title'
  for (const item of [...candidates]) {
    const featMatch = item.match(/^(.*?)\s+(?:feat\.?|ft\.?|featuring|with|prod\.?\s+by)\s+.+$/i);
    if (featMatch) {
      const mainPart = clean(featMatch[1]);
      if (mainPart && mainPart.length >= 1) candidates.add(mainPart);
    }
  }

  // 5. Multiple artists / Collaborators separated by comma, &, +, x
  const toSplit = [raw, withoutBrackets].filter(Boolean);
  for (const item of toSplit) {
    if (/(?:,|&|\bx\b|\bX\b|\+|\/)/i.test(item)) {
      const parts = item.split(/\s*(?:,|&|\bx\b|\bX\b|\+|\/)\s*/i);
      for (const p of parts) {
        const cleaned = clean(p.replace(BRACKET_REGEX, ' '));
        if (cleaned && cleaned.length >= 2 && !GENERIC_TAG_REGEX.test(cleaned)) {
          candidates.add(cleaned);
        }
      }
    }
  }

  return [...candidates].filter(c => c.length >= 1);
}

export function normalize(value) {
  if (!value || typeof value !== 'string') return '';
  return value.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{Z}\s]/gu, '');
}

export function distance(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return row[b.length];
}

export function matches(guess, expected, aliases = []) {
  const input = normalize(guess);
  if (!input) return false;

  const rawTargets = [expected, ...aliases].filter(Boolean);
  const allTargets = [];
  for (const t of rawTargets) {
    allTargets.push(...extractVariants(t));
  }

  return allTargets.some(value => {
    const target = normalize(value);
    if (!target) return false;
    if (input === target) return true;
    if (target.length >= 4 && input.length >= 4 && distance(input, target) <= 1) return true;
    if (target.length >= 8 && input.length >= 7 && distance(input, target) <= 2) return true;
    return false;
  });
}

// Tests
const v1 = extractVariants('Cheerful Vibes Echo (音乃瀬奏 SOLO)');
console.log('1:', v1);
assert.ok(v1.includes('Cheerful Vibes Echo'));

// Cheerful Vibes Echo match tests
assert.equal(matches('cheerful vibes echo', 'Cheerful Vibes Echo (音乃瀬奏 SOLO)'), true, '소문자+띄어쓰기 정답');
assert.equal(matches('cheerfulvibesecho', 'Cheerful Vibes Echo (音乃瀬奏 SOLO)'), true, '띄어쓰기 없음 정답');
assert.equal(matches('CHEERFUL VIBES ECHO', 'Cheerful Vibes Echo (音乃瀬奏 SOLO)'), true, '대문자 정답');
assert.equal(matches('cheerful vibes ech', 'Cheerful Vibes Echo (音乃瀬奏 SOLO)'), true, '오타 1글자 허용');
assert.equal(matches('cheerful vibes', 'Cheerful Vibes Echo (音乃瀬奏 SOLO)'), false, '단어 누락은 오답');

// Instrumental / Remastered / Edition tests
assert.equal(matches('dynamite', 'Dynamite (Instrumental)'), true, 'Instrumental 제거 후 매칭');
assert.equal(matches('instrumental', 'Dynamite (Instrumental)'), false, 'Instrumental 단독 입력은 오답');

// Japanese / Korean alternate titles
assert.equal(matches('좋은 날', '좋은 날 (Good Day)'), true);
assert.equal(matches('good day', '좋은 날 (Good Day)'), true);
assert.equal(matches('goodday', '좋은 날 (Good Day)'), true, '영어 제목 띄어쓰기 없이도 정답');

// Multiple artists
assert.equal(matches('timbaland', 'Timbaland, Keri Hilson, D.O.E.'), true);
assert.equal(matches('keri hilson', 'Timbaland, Keri Hilson, D.O.E.'), true);
assert.equal(matches('kerihilson', 'Timbaland, Keri Hilson, D.O.E.'), true);

// Preserving strict rejection for names without delimiters
assert.equal(matches('하늘', '정하늘', []), false, '미등록 별칭 거절');
assert.equal(matches('하늘', '정하늘', ['하늘']), true, '등록된 별칭 허용');

console.log('ALL extract and matches assertions PASSED!');
