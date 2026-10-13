import {
  getJapaneseVariants,
  getKoreanDisplay,
  getEnglishTransliterations,
  getJapaneseArtistNames,
  matchesRomanizedName,
  JAPANESE_DICTIONARY,
  JAPANESE_PERSON_ARTISTS,
  GLOBAL_ARTISTS_MAP,
} from './japanese-translit.js';
export { getKoreanDisplay, getEnglishTransliterations };

const BRACKET_REGEX = /\s*[\(\[\{（［｛【〔〈《『「]([^\)\]\}）］｝】〕〉》』」]+)[\)\]\}）］｝】〕〉》』」]\s*/g;
const GENERIC_TAG_REGEX = /^(?:inst|instrumental|remaster(?:ed)?|remix|live|acoustic|ver(?:sion)?|clean|explicit|radio edit|original mix|feat\.?.*|ft\.?.*|prod\.?.*|ost.*)$/i;
const CV_PREFIX_REGEX = /^(?:cv\.?|cv:|character\s*voice:?)\s*/i;

function cleanString(s) {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/\u00a0/g, ' ').trim().replace(/^[\s\-–—~'"`]+|[\s\-–—~'"`]+$/g, '').trim();
}

/**
 * Extract clean title / artist variants and aliases
 * E.g. "Cheerful Vibes Echo (音乃瀬奏 SOLO)" -> ["Cheerful Vibes Echo (音乃瀬奏 SOLO)", "Cheerful Vibes Echo", "音乃瀬奏 SOLO"]
 * E.g. "望月杏奈 (CV.夏川椎菜)" -> ["望月杏奈 (CV.夏川椎菜)", "望月杏奈", "夏川椎菜", "모치즈키 안나", "나츠카와 시이나"]
 * E.g. "Garden" -> ["Garden", "가든"]
 * E.g. "Taylor Swift" -> ["Taylor Swift", "테일러 스위프트"]
 */
export function extractVariants(str, options = {}) {
  if (!str || typeof str !== 'string') return [];
  const raw = cleanString(str);
  if (!raw) return [];

  const candidates = new Set();
  candidates.add(raw);

  // 1. Title without bracketed subtitles: "Title (Subtitle)" -> "Title"
  const withoutBrackets = cleanString(raw.replace(BRACKET_REGEX, ' '));
  if (withoutBrackets && withoutBrackets !== raw) {
    candidates.add(withoutBrackets);
  }

  // 2. Extract content inside brackets (except generic tags like Instrumental, Remastered, etc.)
  const bracketMatches = [...raw.matchAll(BRACKET_REGEX)];
  for (const m of bracketMatches) {
    const inner = cleanString(m[1] || '');
    if (inner && inner.length >= 2 && !GENERIC_TAG_REGEX.test(inner)) {
      candidates.add(inner);
      // Strip CV. / CV: prefix (e.g. "CV.夏川椎菜" -> "夏川椎菜")
      const strippedCV = cleanString(inner.replace(CV_PREFIX_REGEX, ''));
      if (strippedCV && strippedCV !== inner && strippedCV.length >= 2) {
        candidates.add(strippedCV);
      }
      const innerClean = cleanString(inner.replace(BRACKET_REGEX, ' '));
      if (innerClean && innerClean.length >= 2 && !GENERIC_TAG_REGEX.test(innerClean)) {
        candidates.add(innerClean);
        const strippedCleanCV = cleanString(innerClean.replace(CV_PREFIX_REGEX, ''));
        if (strippedCleanCV && strippedCleanCV !== innerClean && strippedCleanCV.length >= 2) {
          candidates.add(strippedCleanCV);
        }
      }
    }
  }

  // 3. Dash / Hyphen / Tilde subtitles: "Title - Subtitle" or "零-zero-" -> "Title", "Subtitle"
  for (const item of [...candidates]) {
    if (/\s+[-–—~|]\s+/.test(item)) {
      const parts = item.split(/\s+[-–—~|]\s+/);
      const mainPart = cleanString(parts[0]);
      if (mainPart && mainPart.length >= 1) candidates.add(mainPart);
      const subPart = cleanString(parts[1]);
      if (subPart && subPart.length >= 2 && !GENERIC_TAG_REGEX.test(subPart)) {
        candidates.add(subPart);
      }
    }
    const enclosedDashMatch = item.match(/^(.+?)\s*[-–—~〜]([^-–—~〜]+)[-–—~〜]$/);
    if (enclosedDashMatch) {
      const mainPart = cleanString(enclosedDashMatch[1]);
      if (mainPart && mainPart.length >= 1) candidates.add(mainPart);
      const subPart = cleanString(enclosedDashMatch[2]);
      if (subPart && subPart.length >= 2 && !GENERIC_TAG_REGEX.test(subPart)) {
        candidates.add(subPart);
      }
    }
  }

  // 4. Featuring / With / Produced by / from / CV in plain text
  for (const item of [...candidates]) {
    const featMatch = item.match(/^(.*?)\s+(?:feat\.?|ft\.?|featuring|with|prod\.?\s+by)\s+(.+)$/i);
    if (featMatch) {
      const mainPart = cleanString(featMatch[1]);
      if (mainPart && mainPart.length >= 1) candidates.add(mainPart);
      if (options?.isArtist) {
        const guestPart = cleanString(featMatch[2]);
        if (guestPart && guestPart.length >= 2 && !GENERIC_TAG_REGEX.test(guestPart)) {
          candidates.add(guestPart);
        }
      }
    }
    if (options?.isArtist && /\s+from\s+/i.test(item)) {
      const fromParts = item.split(/\s+from\s+/i);
      const mainArtist = cleanString(fromParts[0]);
      if (mainArtist && mainArtist.length >= 2) candidates.add(mainArtist);
    }
    if (/(?:cv\.?|cv:)\s*/i.test(item)) {
      const parts = item.split(/\s*(?:cv\.?|cv:)\s*/i);
      for (const p of parts) {
        const cleaned = cleanString(p);
        if (cleaned && cleaned.length >= 1) candidates.add(cleaned);
      }
    }
  }

  // 5. Multiple artists / Collaborators separated by comma, &, +, ×, ・, or " x "
  const toSplit = [raw, withoutBrackets].filter(Boolean);
  for (const item of toSplit) {
    const lowerItem = item.toLowerCase();
    // Preserve known single artist names that contain separators (e.g. "TOMORROW X TOGETHER", "AC/DC", "Car, the garden")
    if (GLOBAL_ARTISTS_MAP[lowerItem] || JAPANESE_DICTIONARY[item]) continue;

    if (/(?:,|&|\+|\/|・|×|\s+x\s+)/i.test(item)) {
      const parts = item.split(/\s*(?:,|&|\+|\/|・|×|\s+x\s+)\s*/i);
      for (const p of parts) {
        const cleaned = cleanString(p.replace(BRACKET_REGEX, ' '));
        if (cleaned && cleaned.length >= 2 && !GENERIC_TAG_REGEX.test(cleaned)) {
          candidates.add(cleaned);
        }
      }
    }
  }

  // 6. Japanese & Global Transliterations (Korean pronunciation, Romaji, English)
  for (const item of [...candidates]) {
    const jVariants = getJapaneseVariants(item);
    for (const jv of jVariants) {
      if (jv && jv.length >= 1) {
        candidates.add(jv);
      }
    }
  }

  // 7. English to Korean Transliterations (e.g. Garden -> 가든, Blue Bird -> 블루 버드)
  for (const item of [...candidates]) {
    const engVariants = getEnglishTransliterations(item);
    for (const ev of engVariants) {
      if (ev && ev.length >= 1) {
        candidates.add(ev);
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

export function matches(guess, expected, aliases = [], options = {}) {
  if (!guess || !expected) return false;
  const input = normalize(guess);
  if (!input) return false;

  const rawExpectedLower = (expected || '').trim().toLowerCase();
  const explicitIsArtist = typeof options === 'boolean' ? options : (options?.isArtist !== undefined ? Boolean(options.isArtist) : undefined);
  const isArtist = explicitIsArtist !== undefined
    ? explicitIsArtist
    : Boolean(
        GLOBAL_ARTISTS_MAP[rawExpectedLower] ||
        JAPANESE_DICTIONARY[expected] ||
        JAPANESE_PERSON_ARTISTS.some(p => {
          const kj = p.kanji.join('');
          const r1 = p.romaji.join(' ').toLowerCase();
          const r2 = [p.romaji[1], p.romaji[0]].join(' ').toLowerCase();
          return expected.includes(kj) || rawExpectedLower === r1 || rawExpectedLower === r2;
        })
      );

  const rawTargets = [expected, ...(aliases || [])].filter(Boolean);

  if (isArtist) {
    const jpNames = getJapaneseArtistNames(rawTargets);
    if (jpNames.hasJapanesePerson) {
      // 1. "일본어권 가수들은 성만 적으면 안되고": 성만 입력한 경우 오답 처리
      const matchesSurname = [...jpNames.surnames].some(s => {
        const normS = normalize(s);
        if (!normS) return false;
        if (input === normS) return true;
        if (matchesRomanizedName(guess, s, { isArtist: true })) return true;
        if (input.length < normS.length) return false;
        if (normS.length >= 4 && input.length >= 4 && distance(input, normS) <= 1) return true;
        return false;
      });

      const matchesGivenOrFull = [...jpNames.givenNames, ...jpNames.fullNames].some(gf => {
        const normGF = normalize(gf);
        if (normGF && input === normGF) return true;
        if (matchesRomanizedName(guess, gf, { isArtist: true })) return true;
        return false;
      });

      if (matchesSurname && !matchesGivenOrFull) {
        return false;
      }

      // 2. "이름만 적은건 정답처리 되도록 해줘" 및 풀네임 정답 처리
      const isGivenOrFullMatch = [...jpNames.givenNames, ...jpNames.fullNames].some(g => {
        const normG = normalize(g);
        if (!normG) return false;
        if (input === normG) return true;
        if (matchesRomanizedName(guess, g, { isArtist: true })) return true;
        if (input.length < normG.length) return false;
        if (normG.length >= 4 && input.length >= 4 && distance(input, normG) <= 1) {
          if (normG.startsWith(input)) return false;
          return true;
        }
        return false;
      });

      if (isGivenOrFullMatch) {
        return true;
      }
    }
  }

  const allTargets = [];
  for (const t of rawTargets) {
    allTargets.push(...extractVariants(t, { isArtist }));
  }

  return allTargets.some(value => {
    const target = normalize(value);
    if (!target) return false;
    if (input === target) return true;

    if (matchesRomanizedName(guess, value, { isArtist })) {
      return true;
    }

    // Check if target candidate originally represents a single word (no spaces)
    const isSingleWord = !value.trim().includes(' ');

    // For single-word artist names (no first/last name separation):
    // The user must type the full name ("전부 적어야 정답").
    // Disallow truncated prefixes or shorter length inputs (e.g. "lila" for "Lilas", "crus" for "Crush").
    if (isArtist && isSingleWord && input.length < target.length) {
      return false;
    }

    // Allow 1 typo for target length >= 4
    if (target.length >= 4 && input.length >= 4 && distance(input, target) <= 1) {
      // Disallow prefix truncation even if distance <= 1 for single-word artist
      if (isArtist && isSingleWord && target.startsWith(input)) return false;
      return true;
    }

    // Allow 2 typos for longer words (length >= 8)
    if (target.length >= 8 && input.length >= 7 && distance(input, target) <= 2) {
      if (isArtist && isSingleWord && target.startsWith(input)) return false;
      return true;
    }

    return false;
  });
}

export function answerCorrect(track, target, title, artist) {
  return (target === 'artist' || matches(title, track.title, track.aliases?.title, { isArtist: false })) &&
         (target === 'title' || matches(artist, track.artist, track.aliases?.artist, { isArtist: true }));
}

export function validSlot(cards, year, index) {
  return Number.isInteger(index) && index >= 0 && index <= cards.length &&
         (index === 0 || cards[index - 1].year <= year) &&
         (index === cards.length || year <= cards[index].year);
}
