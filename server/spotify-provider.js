/**
 * Spotify Web API Provider with Free Account & Universal Audio Support
 * - Spotify Web API (Client Credentials) for metadata, album artwork, and track links
 * - Universal 30-second audio preview fallback (iTunes Preview CDN) for Spotify Free accounts
 *   (bypasses the Spotify Web Playback SDK Premium requirement!)
 */

import { tracks as catalogTracks } from '../shared/tracks.js';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

let cachedSpotifyToken = null;
let tokenExpiresAt = 0;
let uaCounter = Math.floor(Math.random() * 10000);
const previewCache = new Map();
const spotifyTrackMetaCache = new Map();
const playlistEmbedCache = new Map();

function getSpotifyHeaders() {
  const n = ++uaCounter;
  const major = 118 + (n % 10);
  const build = 5000 + (n % 2000);
  const patch = 10 + (n % 190);
  const platforms = [
    'Windows NT 10.0; Win64; x64',
    'Macintosh; Intel Mac OS X 10_15_7',
    'X11; Linux x86_64',
  ];
  const platform = platforms[n % platforms.length];
  return {
    'User-Agent': `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.${build}.${patch} Safari/537.36`,
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  };
}

async function fetchSpotifyPage(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: getSpotifyHeaders() });
      if (res.ok) {
        return await res.text();
      }
      if (res.status === 404 || res.status === 400) {
        return null;
      }
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
      }
    } catch {}
  }
  return null;
}

function normalizeMetaKey(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .replace(/\s*[\(\[\{（［｛【].*?[\)\]\}）］｝】]\s*/g, ' ')
    .replace(/\s*[-–—]\s*(?:(?:\d{4}\s*)?remaster(?:ed)?(?:\s*\d{4})?|inst(?:rumental)?|live|radio\s*edit|original\s*(?:album\s*)?version|original\s*mix|mono|stereo|deluxe|ver(?:sion)?|\d{4}\s*version|ost|feat\.?|ft\.?|from\s+["'].*).*$/i, '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\p{P}\p{Z}\s]/gu, '');
}

/**
 * Curated original release years for classic tracks that often appear on Spotify as Remastered / Greatest Hits / Anniversary editions
 */
const CLASSIC_ORIGINAL_YEARS = [
  ['Wish You Were Here', 'Pink Floyd', 1975],
  ['Jump', 'Van Halen', 1984],
  ['Edge of Seventeen', 'Stevie Nicks', 1981],
  ['November Rain', "Guns N' Roses", 1991],
  ['Until It Sleeps', 'Metallica', 1996],
  ['Vogue', 'Madonna', 1990],
  ['This Kiss', 'Faith Hill', 1998],
  ['Ironic', 'Alanis Morissette', 1995],
  ['Behind Blue Eyes', 'The Who', 1971],
  ['All Right Now', 'Free', 1970],
  ['Bohemian Rhapsody', 'Queen', 1975],
  ["Don't Stop Me Now", 'Queen', 1979],
  ['Hotel California', 'Eagles', 1977],
  ['Billie Jean', 'Michael Jackson', 1982],
  ['Beat It', 'Michael Jackson', 1982],
  ['Take On Me', 'a-ha', 1985],
  ['Smells Like Teen Spirit', 'Nirvana', 1991],
  ['Wonderwall', 'Oasis', 1995],
  ["Don't Look Back in Anger", 'Oasis', 1996],
  ['Creep', 'Radiohead', 1992],
  ['Sweet Child O Mine', "Guns N' Roses", 1987],
  ['Every Breath You Take', 'The Police', 1983],
  ['Livin on a Prayer', 'Bon Jovi', 1986],
  ['Africa', 'TOTO', 1982],
  ['Dreams', 'Fleetwood Mac', 1977],
  ['September', 'Earth, Wind & Fire', 1978],
  ['Dancing Queen', 'ABBA', 1976],
  ['4 Minutes', 'Madonna', 2008],
];

const KNOWN_ORIGINAL_YEAR_MAP = (() => {
  const map = new Map();
  const register = (title, artist, year) => {
    const tKey = normalizeMetaKey(title);
    const aKey = normalizeMetaKey(artist);
    if (!tKey || !aKey || !year) return;
    const key = `${tKey}:::${aKey}`;
    const existing = map.get(key);
    if (!existing || year < existing) {
      map.set(key, year);
    }
    const primaryArtist = String(artist).split(/[,&/×・]/)[0].trim();
    const pKey = normalizeMetaKey(primaryArtist);
    if (pKey && pKey !== aKey) {
      const pk = `${tKey}:::${pKey}`;
      const ex2 = map.get(pk);
      if (!ex2 || year < ex2) {
        map.set(pk, year);
      }
    }
  };

  for (const [title, artist, year] of CLASSIC_ORIGINAL_YEARS) {
    register(title, artist, year);
  }
  if (Array.isArray(catalogTracks)) {
    for (const item of catalogTracks) {
      if (!item?.title || !item?.artist || !item?.year) continue;
      const titles = [item.title, ...(item.aliases?.title || [])];
      const artists = [item.artist, ...(item.aliases?.artist || [])];
      for (const t of titles) {
        for (const a of artists) {
          register(t, a, item.year);
        }
      }
    }
  }
  return map;
})();

function lookupKnownOriginalYear(title, artist) {
  const tKey = normalizeMetaKey(title);
  if (!tKey) return null;
  const aKey = normalizeMetaKey(artist);
  if (aKey) {
    const exact = KNOWN_ORIGINAL_YEAR_MAP.get(`${tKey}:::${aKey}`);
    if (exact) return exact;
  }
  const primaryArtist = String(artist || '').split(/[,&/×・]/)[0].trim();
  const pKey = normalizeMetaKey(primaryArtist);
  if (pKey) {
    const pMatch = KNOWN_ORIGINAL_YEAR_MAP.get(`${tKey}:::${pKey}`);
    if (pMatch) return pMatch;
  }
  return null;
}

/**
 * Obtain Spotify Client Credentials access token
 */
export async function getSpotifyAccessToken(clientId, clientSecret) {
  const cId = clientId || process.env.SPOTIFY_CLIENT_ID;
  const cSec = clientSecret || process.env.SPOTIFY_CLIENT_SECRET;

  if (!cId || !cSec) {
    return null;
  }

  if (cachedSpotifyToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedSpotifyToken;
  }

  try {
    const creds = Buffer.from(`${cId}:${cSec}`).toString('base64');
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      console.warn('Spotify token request failed:', response.status);
      return null;
    }

    const data = await response.json();
    cachedSpotifyToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    return cachedSpotifyToken;
  } catch (err) {
    console.error('Error fetching Spotify access token:', err);
    return null;
  }
}

function normalizeForMatch(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[()[\]{}'"`.,~!?@#$%^&*_\-+=/\\:;|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanTrackTitle(title) {
  return String(title || '')
    .replace(/\s*[-–—]\s*(?:(?:\d{4}\s*)?remaster(?:ed)?(?:\s*\d{4})?|live|radio edit|original mix|mono|stereo|deluxe|version).*$/i, '')
    .replace(/\s*[\(\[](?:(?:\d{4}\s*)?remaster(?:ed)?(?:\s*\d{4})?|live|mono|stereo|deluxe|feat\.?.*|ft\.?.*|cv\.?.*)[\)\]]/gi, '')
    .trim();
}

/**
 * Check if a track is a karaoke, instrumental, backing track, tribute, or unwanted cover version
 */
export function isKaraokeOrUnwantedTrack(title, artist = '', album = '') {
  const t = String(title || '').toLowerCase();
  const a = String(artist || '').toLowerCase();
  const alb = String(album || '').toLowerCase();
  const combined = `${t} ${a} ${alb}`;

  // 1. Karaoke / Instrumental / Backing / Tribute keywords
  const unwantedPatterns = [
    /\b(?:karaoke|backing track|tribute band|tribute to|in the style of|originally performed by|made famous by|play-along|sing-along|medley)\b/i,
    /\b(?:instrumental|inst|inst\.|mr|off vocal|no lead vocal|backing vocals)\b/i,
    /[([](?:mr|inst|instrumental|karaoke|반주|가라오케|off vocal|piano version|acoustic cover|lullaby version)[)\]]/i,
    /(?:가라오케|노래방\s*버전|반주\s*버전|엠알)/i,
    /(?:オルゴール|カラオケ|オフボーカル|インスト)/i,
  ];

  for (const pat of unwantedPatterns) {
    if (pat.test(t) || pat.test(a) || pat.test(alb)) return true;
  }

  // 2. Known karaoke / tribute / generic cover publishers
  const karaokePublishers = [
    /\b(?:karaoke|sing king|party tyme|ameritz|the karaoke channel|hit crew|tribute players|karaoke version|karaoke all stars|lullaby players|piano tribute players|cover pop|acoustic cover|string quartet|sleep baby sleep)\b/i,
    /(?:가라오케|노래방|금영|태진)/i,
  ];
  for (const pat of karaokePublishers) {
    if (pat.test(a)) return true;
  }

  // 3. Sound effects, noise, meditation
  const noisePatterns = [
    /\b(?:white noise|rain sounds|nature sounds|sound effect|meditation|sleep music)\b/i,
  ];
  for (const pat of noisePatterns) {
    if (pat.test(combined)) return true;
  }

  return false;
}

export function isArtistMatching(expectedArtist, candidateArtist) {
  if (!expectedArtist || !candidateArtist) return false;
  const normExp = normalizeForMatch(expectedArtist);
  const normCand = normalizeForMatch(candidateArtist);
  if (!normExp || !normCand) return false;

  if (normExp === normCand) return true;
  if (normExp.includes(normCand) || normCand.includes(normExp)) return true;

  const expParts = expectedArtist.toLowerCase().split(/[,&/×・+]/).map(s => normalizeForMatch(s)).filter(Boolean);
  const candParts = candidateArtist.toLowerCase().split(/[,&/×・+]/).map(s => normalizeForMatch(s)).filter(Boolean);
  for (const ep of expParts) {
    if (candParts.some(cp => cp === ep || cp.includes(ep) || ep.includes(cp))) return true;
  }

  const aliasMap = {
    'bts': ['방탄소년단', 'bangtan'],
    '방탄소년단': ['bts', 'bangtan'],
    'iu': ['아이유'],
    '아이유': ['iu'],
    'snsd': ['소녀시대', 'girls generation'],
    '소녀시대': ['snsd', 'girls generation'],
    'twice': ['트와이스'],
    '트와이스': ['twice'],
    'blackpink': ['블랙핑크'],
    '블랙핑크': ['blackpink'],
    'exo': ['엑소'],
    '엑소': ['exo'],
    'red velvet': ['레드벨벳'],
    '레드벨벳': ['red velvet'],
    'aespa': ['에스파'],
    '에스파': ['aespa'],
    'ive': ['아이브'],
    '아이브': ['ive'],
    'newjeans': ['뉴진스'],
    '뉴진스': ['newjeans'],
    'le sserafim': ['르세라핌'],
    '르세라핌': ['le sserafim'],
    'taeyeon': ['태연'],
    '태연': ['taeyeon'],
    'akmu': ['악뮤', '악동뮤지션'],
    '악뮤': ['akmu'],
    '악동뮤지션': ['akmu'],
    'bigbang': ['빅뱅'],
    '빅뱅': ['bigbang'],
    'shinee': ['샤이니'],
    '샤이니': ['shinee'],
    'seventeen': ['세븐틴'],
    '세븐틴': ['seventeen'],
    'stray kids': ['스트레이 키즈'],
    '스트레이 키즈': ['stray kids'],
    'day6': ['데이식스'],
    '데이식스': ['day6'],
    'g idle': ['여자아이들', '아이들', 'gidle', 'i-dle'],
    '여자아이들': ['g idle', 'gidle', 'i-dle'],
    'psy': ['싸이'],
    '싸이': ['psy'],
    'yb': ['윤도현', '윤도현밴드', 'yoon do hyun'],
    '윤도현': ['yb', '윤도현밴드'],
    'buzz': ['버즈'],
    '버즈': ['buzz'],
    'sg wannabe': ['sg워너비'],
    'sg워너비': ['sg wannabe'],
  };
  for (const [k, vList] of Object.entries(aliasMap)) {
    if (normExp.includes(k) && vList.some(v => normCand.includes(v))) return true;
    if (normCand.includes(k) && vList.some(v => normExp.includes(v))) return true;
  }

  return false;
}

const KNOWN_TITLE_TRANSLATIONS = {
  '좋은 날': ['good day'],
  '어디에도': ['no matter where'],
  '너랑 나': ['you & i', 'you and i'],
  '분홍신': ['the red shoes'],
  '밤편지': ['through the night'],
  '팔레트': ['palette'],
  '소주 한 잔': ['a glass of soju', 'a shot of soju'],
  '서쪽 하늘': ['western sky'],
  '인연': ['fate'],
  '희재': ['hee jae'],
  '사랑했나봐': ['i think i loved you', 'i guess i loved you'],
  '응급실': ['emergency room'],
  '가시': ['thorn'],
  '겁쟁이': ['coward'],
  '나에게로 떠나는 여행': ['a travel to me'],
  '체념': ['resignation'],
  '벌써 일년': ['already one year'],
  '점점': ['gradually'],
  '눈의 꽃': ['snow flower'],
  '다행이다': ['it is fortunate'],
  '취중진담': ['truth in wine'],
  '비와 당신': ['rain and you'],
  '기억의 습작': ['etude of memories'],
  '그대에게': ['to you'],
  '붉은 노을': ['sunset glow'],
  '거짓말': ['lies', 'lie'],
  '하루하루': ['haru haru', 'day by day'],
  '마지막 인사': ['last farewell'],
  '뱅뱅뱅': ['bang bang bang'],
  '판타스틱 베이비': ['fantastic baby'],
  '루저': ['loser'],
  '삐딱하게': ['crooked'],
  '눈 코 입': ['eyes, nose, lips'],
  '봄날': ['spring day'],
  '작은 것들을 위한 시': ['boy with luv'],
  '피 땀 눈물': ['blood sweat & tears', 'blood sweat and tears'],
  '불타오르네': ['fire'],
  '쩔어': ['dope'],
  '우아하게': ['ooh-ahh', 'like ooh-ahh'],
  '치어업': ['cheer up'],
  '빨간 맛': ['red flavor'],
  '음오아예': ['um oh ah yeh'],
  '시간을 달려서': ['rough'],
  '오늘부터 우리는': ['me gustas tu'],
  '유리구슬': ['glass bead'],
  '롤린': ['rollin', "rollin'"],
  '사건의 지평선': ['event horizon'],
  '스물다섯, 스물하나': ['twenty-five, twenty-one'],
  '헤픈 우연': ['happen accident'],
  '너의 의미': ['meaning of you'],
  '금요일에 만나요': ['friday'],
};

export function isTitleMatching(expectedTitle, candidateTitle, extraAliases = []) {
  if (!expectedTitle || !candidateTitle) return false;
  const normExp = normalizeForMatch(cleanTrackTitle(expectedTitle));
  const normCand = normalizeForMatch(cleanTrackTitle(candidateTitle));
  if (!normExp || !normCand) return false;

  if (normExp === normCand) return true;
  if (normExp.includes(normCand) || normCand.includes(normExp)) return true;

  const expWords = normExp.split(/\s+/).filter(w => w.length >= 2);
  const candWords = normCand.split(/\s+/).filter(w => w.length >= 2);
  const commonWords = expWords.filter(w => candWords.includes(w));
  if (commonWords.length > 0 && commonWords.length >= Math.ceil(expWords.length * 0.5)) {
    return true;
  }

  // Cross-lingual title translation check
  for (const [kr, enList] of Object.entries(KNOWN_TITLE_TRANSLATIONS)) {
    const normKr = normalizeForMatch(kr);
    if (normExp.includes(normKr) || normKr.includes(normExp)) {
      if (enList.some(en => normCand.includes(normalizeForMatch(en)) || normalizeForMatch(en).includes(normCand))) {
        return true;
      }
    }
  }

  // Check extra aliases if provided
  if (Array.isArray(extraAliases)) {
    for (const a of extraAliases) {
      const normA = normalizeForMatch(a);
      if (normA && (normA === normCand || normCand.includes(normA) || normA.includes(normCand))) {
        return true;
      }
    }
  }

  return false;
}

function selectBestCandidate(candidates, expectedTitle, expectedArtist, extraAliases = []) {
  const valid = [];
  const cleanExpTitle = cleanTrackTitle(expectedTitle);

  for (const item of (candidates || [])) {
    const trackName = item.trackName || item.title || '';
    const artistName = item.artistName || item.artist?.name || '';
    const albumName = item.collectionName || item.album?.title || '';
    const previewUrl = item.previewUrl || item.preview || null;

    if (!previewUrl) continue;
    if (isKaraokeOrUnwantedTrack(trackName, artistName, albumName)) continue;
    if (!isArtistMatching(expectedArtist, artistName)) continue;
    if (!isTitleMatching(expectedTitle, trackName, extraAliases)) continue;

    let score = 100;
    const cleanCandTitle = cleanTrackTitle(trackName);

    if (normalizeForMatch(cleanExpTitle) === normalizeForMatch(cleanCandTitle)) {
      score += 60;
    }
    if (!/live/i.test(trackName)) {
      score += 20;
    }
    if (!/remix|mix/i.test(trackName)) {
      score += 15;
    }
    if (normalizeForMatch(expectedArtist) === normalizeForMatch(artistName)) {
      score += 20;
    }

    valid.push({ item, score });
  }

  if (valid.length === 0) return null;
  valid.sort((a, b) => b.score - a.score);
  return valid[0].item;
}

/**
 * Resolve 30-second audio preview URL and album metadata using iTunes Search API (with Deezer fallback)
 * Free, fast, reliable fallback providing audio previews, high-res album artwork, and real release years
 * Includes multi-candidate scoring and strict anti-karaoke/tribute validation
 */
export async function resolveAudioPreview(title, artist, extraAliases = []) {
  const cleanArtistInput = String(artist || '').replace(/\u00a0/g, ' ').trim();
  const cleanTitleInput = String(title || '').replace(/\u00a0/g, ' ').trim();
  const cacheKey = `${cleanArtistInput}:${cleanTitleInput}`.toLowerCase();
  if (previewCache.has(cacheKey)) {
    return previewCache.get(cacheKey);
  }

  const cleanTitle = cleanTrackTitle(cleanTitleInput);
  const firstArtist = cleanArtistInput
    .replace(/\s*[\(\[（](?:cv\.?|feat\.?|ft\.?).*?[\)\]）]/gi, '')
    .split(/[,&/×・]/)[0]
    .trim();

  // 1. Try iTunes Search API
  try {
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(`${cleanTitleInput} ${cleanArtistInput}`);
    const hasKorean = /[가-힣]/.test(`${cleanTitleInput} ${cleanArtistInput}`);
    const countryParam = hasJapanese ? '&country=JP' : hasKorean ? '&country=KR' : '';

    const query = encodeURIComponent(`${cleanArtistInput} ${cleanTitleInput}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=8${countryParam}`);
    let item = null;
    if (res.ok) {
      const text = await res.text();
      if (text) {
        try {
          const data = JSON.parse(text);
          item = selectBestCandidate(data.results, cleanTitleInput, cleanArtistInput, extraAliases);
        } catch {}
      }
    }

    // Retry with cleaned title and primary artist if initial query didn't find a match
    if (!item) {
      const retryRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${firstArtist} ${cleanTitle}`)}&entity=song&limit=8`);
      if (retryRes.ok) {
        const text = await retryRes.text();
        if (text) {
          try {
            const retryData = JSON.parse(text);
            item = selectBestCandidate(retryData.results, cleanTitleInput, cleanArtistInput, extraAliases);
          } catch {}
        }
      }
    }

    if (item) {
      const result = {
        previewUrl: item.previewUrl || null,
        artworkUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : null,
        year: item.releaseDate ? parseInt(item.releaseDate.slice(0, 4), 10) : null,
        altTitle: item.trackName || null,
        altArtist: item.artistName || null,
      };
      previewCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    // Proceed to Deezer fallback
  }

  // 2. Fallback to Deezer Search API (strictly validated!)
  try {
    const q = encodeURIComponent(`${firstArtist} ${cleanTitle}`);
    const deezerRes = await fetch(`https://api.deezer.com/search?q=${q}&limit=8`);
    if (deezerRes.ok) {
      const deezerData = await deezerRes.json();
      const dItem = selectBestCandidate(deezerData?.data, cleanTitleInput, cleanArtistInput, extraAliases);
      if (dItem && (dItem.preview || dItem.album?.cover_xl || dItem.album?.cover_big)) {
        const knownYear = lookupKnownOriginalYear(cleanTitleInput, cleanArtistInput);
        const result = {
          previewUrl: dItem.preview || null,
          artworkUrl: dItem.album?.cover_xl || dItem.album?.cover_big || dItem.album?.cover_medium || null,
          year: knownYear || null,
          altTitle: dItem.title || null,
          altArtist: dItem.artist?.name || null,
        };
        previewCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {}

  return null;
}

function extractHtmlMeta(html, key) {
  if (!html) return null;
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re1 = new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i');
  const m1 = re1.exec(html);
  if (m1) return m1[1];
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["']`, 'i');
  const m2 = re2.exec(html);
  return m2 ? m2[1] : null;
}

/**
 * Fetch individual track release year, album cover, and audio preview directly from Spotify's Embed & Track endpoints
 * Primary: /embed/track/{id} (lightweight JSON, no rate-limit, provides releaseDate + coverArt + audioPreview)
 * Fallback: /track/{id} meta tags (provides og:image for age-restricted tracks)
 */
export async function fetchSpotifyTrackMeta(trackId) {
  if (!trackId) return null;
  const cleanId = String(trackId).replace('spotify:track:', '').replace('spotify-', '').trim();
  if (!cleanId || cleanId.startsWith('t-')) return null;

  if (spotifyTrackMetaCache.has(cleanId)) {
    return spotifyTrackMetaCache.get(cleanId);
  }

  let year = null;
  let coverUrl = null;
  let previewUrl = null;

  // 1. Primary: Spotify Embed track endpoint (__NEXT_DATA__ entity)
  try {
    const embedHtml = await fetchSpotifyPage(`https://open.spotify.com/embed/track/${cleanId}`);
    if (embedHtml) {
      const idx = embedHtml.indexOf('__NEXT_DATA__');
      if (idx !== -1) {
        const start = embedHtml.indexOf('>', idx) + 1;
        const end = embedHtml.indexOf('</script>', start);
        if (start > 0 && end > start) {
          const json = JSON.parse(embedHtml.slice(start, end));
          const entity = json.props?.pageProps?.state?.data?.entity;
          if (entity) {
            if (entity.releaseDate?.isoString) {
              const parsed = parseInt(entity.releaseDate.isoString.slice(0, 4), 10);
              if (parsed >= 1900 && parsed <= 2035) year = parsed;
            }
            coverUrl =
              entity.visualIdentity?.image?.[0]?.url ||
              entity.coverArt?.sources?.[0]?.url ||
              null;
            if (entity.audioPreview?.url) {
              previewUrl = entity.audioPreview.url;
            }
          }
        }
      }
    }
  } catch {}

  // 2. Secondary fallback (only if year or coverUrl is still missing, e.g. explicit track cover): Spotify track page meta tags
  if (!year || !coverUrl) {
    try {
      const html = await fetchSpotifyPage(`https://open.spotify.com/track/${cleanId}`);
      if (html) {
        if (!year) {
          const releaseDate = extractHtmlMeta(html, 'music:release_date');
          if (releaseDate) {
            const ym = /^(\d{4})/.exec(releaseDate.trim());
            if (ym) {
              const parsed = parseInt(ym[1], 10);
              if (parsed >= 1900 && parsed <= 2035) year = parsed;
            }
          }
        }
        if (!year) {
          const desc =
            extractHtmlMeta(html, 'og:description') ||
            extractHtmlMeta(html, 'twitter:description') ||
            extractHtmlMeta(html, 'description') ||
            '';
          const dm = /(?:Song|곡|트랙)\s*·\s*(?:.*?\s*·\s*)?(19\d\d|20[0-3]\d)\b/i.exec(desc) || /·\s*(19\d\d|20[0-3]\d)\s*$/.exec(desc);
          if (dm) {
            year = parseInt(dm[1], 10);
          }
        }
        if (!coverUrl) {
          coverUrl = extractHtmlMeta(html, 'og:image') || extractHtmlMeta(html, 'twitter:image') || null;
        }
        if (!previewUrl) {
          previewUrl = extractHtmlMeta(html, 'og:audio') || null;
        }
      }
    } catch {}
  }

  // 3. Tertiary fallback for cover: Spotify oEmbed
  if (!coverUrl) {
    coverUrl = await fetchSpotifyTrackCover(cleanId);
  }

  if (year || coverUrl || previewUrl) {
    const meta = { year, coverUrl, previewUrl };
    spotifyTrackMetaCache.set(cleanId, meta);
    return meta;
  }

  return null;
}

/**
 * Fetch individual track album cover directly from Spotify's oEmbed endpoint (No API key needed!)
 */
export async function fetchSpotifyTrackCover(trackId) {
  if (!trackId || trackId.startsWith('t-')) return null;
  const cleanId = trackId.replace('spotify:track:', '').replace('spotify-', '');
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${cleanId}`, {
      headers: getSpotifyHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      return data.thumbnail_url || null;
    }
  } catch {}
  return null;
}

/**
 * Extract Spotify playlist ID from URL or ID string
 */
export function extractPlaylistId(playlistInput) {
  if (!playlistInput) return null;
  const str = String(playlistInput).trim();
  const match = str.match(/playlist[/:]([a-zA-Z0-9]+)/) || str.match(/^([a-zA-Z0-9]+)$/);
  return match ? match[1] : null;
}

/**
 * Enrich a list of tracks with their real release years and individual album artwork
 * Uses Spotify per-track metadata directly (avoiding iTunes rate-limiting and fixed-year fallback bugs)
 */
export async function enrichTracksMetadata(tracks) {
  if (!Array.isArray(tracks) || tracks.length === 0) return tracks;

  const CONCURRENCY = 25;
  let cursor = 0;

  async function enrichSingleTrack(t) {
    try {
      if (!t.aliases) t.aliases = { title: [], artist: [] };
      if (!Array.isArray(t.aliases.title)) t.aliases.title = [];
      if (!Array.isArray(t.aliases.artist)) t.aliases.artist = [];

      const trackId = t.id ? String(t.id).replace('spotify-', '').replace('spotify:track:', '') : '';
      const hasSpotifyTrackId = Boolean(trackId && !trackId.startsWith('t-') && /^[a-zA-Z0-9]{15,30}$/.test(trackId));

      // 1. Fetch official per-track metadata directly from Spotify when a Spotify track ID is present
      if (hasSpotifyTrackId && (!t.year || !t.coverUrl || !t.previewUrl)) {
        const spMeta = await fetchSpotifyTrackMeta(trackId);
        if (spMeta) {
          if (spMeta.year) t.year = spMeta.year;
          if (spMeta.coverUrl && !t.coverUrl) t.coverUrl = spMeta.coverUrl;
          if (spMeta.previewUrl && !t.previewUrl) t.previewUrl = spMeta.previewUrl;
        }
      }

      // 2. Apply curated/catalog original release year if this track is a remaster or re-release of an older classic
      const knownOriginalYear = lookupKnownOriginalYear(t.title, t.artist);
      if (knownOriginalYear && (!t.year || knownOriginalYear < t.year)) {
        t.year = knownOriginalYear;
      }

      // 3. Query iTunes/Deezer fallback if year, coverUrl, or previewUrl is missing
      if (!t.year || !t.coverUrl || !t.previewUrl) {
        const res = await resolveAudioPreview(t.title, t.artist, t.aliases?.title);
        if (res) {
          if (!t.year && res.year) t.year = res.year;
          if (!t.coverUrl && res.artworkUrl) t.coverUrl = res.artworkUrl;
          if (!t.previewUrl && res.previewUrl) t.previewUrl = res.previewUrl;
          if (res.altTitle && isTitleMatching(t.title, res.altTitle, t.aliases?.title) && !t.aliases.title.includes(res.altTitle)) {
            t.aliases.title.push(res.altTitle);
          }
          if (res.altArtist && isArtistMatching(t.artist, res.altArtist) && !t.aliases.artist.includes(res.altArtist)) {
            t.aliases.artist.push(res.altArtist);
          }
        }
      }

      // 4. Fallback for cover: Spotify oEmbed or playlist cover
      if (!t.coverUrl && hasSpotifyTrackId) {
        const oembedCover = await fetchSpotifyTrackCover(trackId);
        if (oembedCover) t.coverUrl = oembedCover;
      }
      if (!t.coverUrl && t.playlistCoverUrl) {
        t.coverUrl = t.playlistCoverUrl;
      }

      // 5. Fallback for year: extract non-remaster year from title if present (e.g. "Song (1998)")
      if (!t.year) {
        const titleWithoutRemaster = String(t.title || '').replace(
          /\b(?:\d{4}\s*)?remaster(?:ed)?(?:\s*\d{4})?\b/gi,
          ''
        );
        const yearMatch = titleWithoutRemaster.match(/\b(19\d\d|20[0-2]\d)\b/);
        if (yearMatch) {
          t.year = parseInt(yearMatch[1], 10);
        }
      }

      // 6. Final fallback if still missing
      if (!t.year) {
        t.year = 2020;
      }
    } catch (err) {
      if (!t.year) t.year = 2020;
      if (!t.coverUrl && t.playlistCoverUrl) t.coverUrl = t.playlistCoverUrl;
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, tracks.length) }, async () => {
    while (cursor < tracks.length) {
      const idx = cursor++;
      await enrichSingleTrack(tracks[idx]);
    }
  });
  await Promise.all(workers);

  return tracks;
}

export function deduplicateTracks(tracks) {
  if (!Array.isArray(tracks)) return [];
  const seen = new Set();
  const unique = [];
  for (const t of tracks) {
    if (!t || !t.title) continue;
    const idKey = t.id ? `id:${String(t.id).toLowerCase()}` : '';
    const metaKey = `meta:${normalizeMetaKey(t.title)}:::${normalizeMetaKey(t.artist)}`;
    if ((idKey && seen.has(idKey)) || seen.has(metaKey)) continue;
    if (idKey) seen.add(idKey);
    seen.add(metaKey);
    unique.push(t);
  }
  return unique;
}

function cloneTrackList(tracks) {
  return tracks.map(t => ({
    ...t,
    aliases: {
      title: [...(t.aliases?.title || [])],
      artist: [...(t.aliases?.artist || [])],
    },
  }));
}

/**
 * Fetch tracks from Spotify Public Embed endpoint without requiring credentials
 */
export async function fetchPlaylistFromEmbed(playlistId) {
  if (!playlistId) return null;
  if (playlistEmbedCache.has(playlistId)) {
    const cached = playlistEmbedCache.get(playlistId);
    if (Date.now() - (cached.timestamp || 0) < 600000) {
      const list = cloneTrackList(cached.tracks);
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    }
  }
  try {
    const url = `https://open.spotify.com/embed/playlist/${playlistId}`;
    const html = await fetchSpotifyPage(url);
    if (!html) return null;
    const m = /<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
    if (!m) return null;
    const json = JSON.parse(m[1]);
    const entity = json.props?.pageProps?.state?.data?.entity;
    if (!entity || !Array.isArray(entity.trackList) || entity.trackList.length === 0) {
      return null;
    }

    const playlistCoverUrl = entity.coverArt?.sources?.[0]?.url || '';
    const rawTracks = entity.trackList.map((t, idx) => {
      const trackId = t.uri ? t.uri.replace('spotify:track:', '') : `t-${idx}`;
      return {
        id: `spotify-${trackId}`,
        title: (t.title || '').replace(/\u00a0/g, ' ').trim(),
        artist: (t.subtitle || '').replace(/\u00a0/g, ' ').trim() || 'Various Artists',
        year: null,
        coverUrl: '', // Will be enriched with individual album cover
        playlistCoverUrl,
        spotifyUrl: `https://open.spotify.com/track/${trackId}`,
        previewUrl: t.audioPreview?.url || null,
        aliases: { title: [], artist: [] },
        isSpotify: true,
      };
    }).filter(t => t.title && !isKaraokeOrUnwantedTrack(t.title, t.artist));
    const deduped = deduplicateTracks(rawTracks);
    if (deduped.length > 0) {
      playlistEmbedCache.set(playlistId, { tracks: deduped, timestamp: Date.now() });
    }
    const result = cloneTrackList(deduped);
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  } catch (err) {
    console.warn(`Error fetching embed playlist ${playlistId}:`, err.message);
    return null;
  }
}

/**
 * Rich public playlist seeds covering diverse genres, decades, and charts
 */
export const PUBLIC_RANDOM_SEEDS = [
  '37i9dQZF1DXcBWIGoYBM5M', // Today's Top Hits (Global Top 50)
  '37i9dQZF1DWT9uTRZAYj0c', // Hot Hits Korea Top 100 (Real Korean Top 100)
  '37i9dQZF1DX9tPFwDMOaN1', // K-Pop ON! (K-Pop Hits)
  '37i9dQZF1DXe5W6diBL5N4', // All New K-Pop (Korean New Releases)
  '37i9dQZF1DXdbRLJPSmnyq', // J-Pop Hits
  '37i9dQZF1DXafb0IuPwJyF', // Tokyo Super Hits
  '37i9dQZF1DX4o1oenSJRJd', // All Out 00s (2000s Pop & Rock)
  '37i9dQZF1DXbTxeAdrVG2l', // All Out 90s (90s Classics)
  '37i9dQZF1DX5Ejj0EkURtP', // All Out 10s (2010s Hits)
  '37i9dQZF1DX0XUsuxWHRQd', // RapCaviar (Hip-Hop)
  '37i9dQZF1DWXRqgorJj26U', // Rock Classics (Classic Rock)
  '37i9dQZF1DX4UtSsGT1Sbe', // 80s Smash Hits (80s Classics)
  '37i9dQZF1DX4WYpdgoIcn6', // Chill Hits
];

/**
 * Convert raw Spotify track items to BeatSync track format
 */
function convertRawSpotifyItemsToTracks(rawItems) {
  const tracks = [];
  for (let i = 0; i < rawItems.length; i++) {
    const t = rawItems[i]?.track || rawItems[i];
    if (!t || !t.name) continue;

    const artistName = (t.artists || []).map(a => a.name).join(', ') || 'Various Artists';
    if (isKaraokeOrUnwantedTrack(t.name, artistName, t.album?.name)) {
      continue;
    }
    const year = parseInt(t.album?.release_date?.slice(0, 4), 10) || null;
    const coverUrl = t.album?.images?.[0]?.url || '';
    const spotifyUrl = t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`;
    const previewUrl = t.preview_url || null;

    tracks.push({
      id: `spotify-${t.id || i}`,
      title: t.name,
      artist: artistName,
      year,
      coverUrl,
      spotifyUrl,
      previewUrl,
      aliases: { title: [], artist: [] },
      isSpotify: true,
    });
  }
  return tracks;
}

/**
 * Fetch tracks from Spotify Web API with multi-page pagination and random offset sampling
 * Ensures large playlists (300~1000+ tracks) yield a diverse, distributed pool every time
 */
async function fetchSpotifyTracksWithPagination(playlistId, authHeader) {
  try {
    const firstUrl = `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks?limit=100&offset=0`;
    const firstRes = await fetch(firstUrl, {
      headers: {
        Authorization: authHeader,
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    if (!firstRes.ok) return null;
    const firstData = await firstRes.json();
    const total = Number(firstData.total) || 0;
    const rawItems = [...(firstData.items || [])];

    if (total > 100) {
      const extraBatches = Math.min(3, Math.ceil((total - 100) / 100));
      const offsets = new Set();

      if (total <= 300) {
        for (let off = 100; off < total; off += 100) {
          offsets.add(off);
        }
      } else {
        // Divide range [100, total - 50] into segments and sample random offsets in each segment
        // Ensures random distributed sampling across the entire 1,000+ tracks
        const segSize = Math.floor((total - 100) / extraBatches);
        for (let s = 0; s < extraBatches; s++) {
          const segStart = 100 + s * segSize;
          const segEnd = Math.min(total - 30, segStart + segSize);
          if (segStart < segEnd) {
            const randOff = Math.floor(segStart + Math.random() * (segEnd - segStart));
            offsets.add(randOff);
          }
        }
      }

      const pages = await Promise.all(
        [...offsets].map(async off => {
          try {
            const res = await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks?limit=100&offset=${off}`, {
              headers: {
                Authorization: authHeader,
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
              },
            });
            if (res.ok) {
              const d = await res.json();
              return d.items || [];
            }
          } catch {}
          return [];
        })
      );

      for (const p of pages) {
        rawItems.push(...p);
      }
    }

    const tracks = convertRawSpotifyItemsToTracks(rawItems);
    const unique = deduplicateTracks(tracks);
    // Shuffle
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }
    return unique;
  } catch (err) {
    console.warn(`Pagination fetch error for playlist ${playlistId}:`, err.message);
    return null;
  }
}

/**
 * Fetch tracks from a public or user Spotify playlist URL or ID
 * Supports user access token, official Web API (client credentials), and zero-auth Spotify Embed
 */
export async function fetchSpotifyPlaylist(playlistInput, clientId, clientSecret, userToken) {
  const playlistId = extractPlaylistId(playlistInput);
  if (!playlistId) {
    throw new Error('유효한 Spotify 플레이리스트 ID 또는 URL이 아닙니다.');
  }

  // 1. If userToken is provided, fetch via authenticated user session with pagination and random offset
  if (userToken) {
    try {
      const pTracks = await fetchSpotifyTracksWithPagination(playlistId, `Bearer ${userToken}`);
      if (pTracks && pTracks.length > 0) {
        await enrichTracksMetadata(pTracks);
        return pTracks;
      }
    } catch (err) {
      console.warn('User token playlist fetch failed, trying fallbacks:', err.message);
    }
  }

  // 2. Try Spotify Web API if client credentials exist with pagination and random offset
  const token = await getSpotifyAccessToken(clientId, clientSecret);
  if (token) {
    try {
      const pTracks = await fetchSpotifyTracksWithPagination(playlistId, `Bearer ${token}`);
      if (pTracks && pTracks.length > 0) {
        await enrichTracksMetadata(pTracks);
        return pTracks;
      }
    } catch (err) {
      console.warn('Official Spotify API failed, falling back to embed scraper:', err.message);
    }
  }

  // 3. Fallback to Spotify Embed zero-auth scraper (Works for any public playlist!)
  const embedTracks = await fetchPlaylistFromEmbed(playlistId);
  if (embedTracks && embedTracks.length > 0) {
    // Shuffle embed tracks so they aren't always presented in exact order
    const shuffled = [...embedTracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    await enrichTracksMetadata(shuffled);
    return shuffled;
  }

  // 4. If Spotify is temporarily rate-limiting (429) on a valid 22-char playlist ID, provide catalog fallback
  if (/^[a-zA-Z0-9]{22}$/.test(playlistId) && Array.isArray(catalogTracks) && catalogTracks.length > 0) {
    const fallback = deduplicateTracks(catalogTracks.map(t => ({ ...t, isSpotify: true })));
    for (let i = fallback.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fallback[i], fallback[j]] = [fallback[j], fallback[i]];
    }
    await enrichTracksMetadata(fallback);
    return fallback.slice(0, 50);
  }

  throw new Error('Spotify 플레이리스트를 불러올 수 없습니다. 공개 플레이리스트 URL인지 확인해주세요.');
}

/**
 * Rich Genre mapped seed playlists for real-time diversified dynamic theme pools
 */
export const GENRE_SEED_MAP = {
  // K-Pop 메가 히트곡 (최신 인기곡 & 공식 차트 대표곡)
  kpop_hits: [
    '37i9dQZF1DWT9uTRZAYj0c', // Hot Hits Korea Top 100
    '37i9dQZF1DX9tPFwDMOaN1', // K-Pop ON!
    '37i9dQZF1DXe5W6diBL5N4', // All New K-Pop
  ],
  // 90~2000년대 명곡 & 레트로 가요
  kpop_retro: [
    '37i9dQZF1DWT9uTRZAYj0c', // Hot Hits Korea Top 100
    '37i9dQZF1DXe5W6diBL5N4', // All New K-Pop
  ],
  // K-Pop 전체 (히트곡 + 레트로 + 글로벌 전 세대 총망라)
  kpop_all: [
    '37i9dQZF1DWT9uTRZAYj0c', // Hot Hits Korea Top 100
    '37i9dQZF1DX9tPFwDMOaN1', // K-Pop ON!
    '37i9dQZF1DXe5W6diBL5N4', // All New K-Pop
  ],
  kpop: [
    '37i9dQZF1DWT9uTRZAYj0c',
    '37i9dQZF1DX9tPFwDMOaN1',
    '37i9dQZF1DXe5W6diBL5N4',
  ],
  // 글로벌 팝송 TOP (글로벌 차트 1위 및 빌보드 최신 히트)
  pop_hits: [
    '37i9dQZF1DXcBWIGoYBM5M', // Today's Top Hits (글로벌 팝 1위)
    '37i9dQZF1DX5Ejj0EkURtP', // All Out 10s (2010년대 팝 메가 히트)
    '37i9dQZF1DX4o1oenSJRJd', // All Out 00s (2000년대 팝 메가 히트)
    '37i9dQZF1DWXRqgorJj26U', // Rock Classics (올타임 록 명곡)
  ],
  // Pop 전체 (80년대부터 최신 빌보드까지 전 시대 팝송)
  pop_all: [
    '37i9dQZF1DXcBWIGoYBM5M', // Today's Top Hits
    '37i9dQZF1DX5Ejj0EkURtP', // All Out 10s
    '37i9dQZF1DX4o1oenSJRJd', // All Out 00s
    '37i9dQZF1DXbTxeAdrVG2l', // All Out 90s
    '37i9dQZF1DX4UtSsGT1Sbe', // All Out 80s
    '37i9dQZF1DWXRqgorJj26U', // Rock Classics
  ],
  pop: [
    '37i9dQZF1DXcBWIGoYBM5M',
    '37i9dQZF1DX5Ejj0EkURtP',
    '37i9dQZF1DX4o1oenSJRJd',
    '37i9dQZF1DXbTxeAdrVG2l',
    '37i9dQZF1DWXRqgorJj26U',
  ],
  // J-Pop 히트곡 (최신 인기 J-Pop 및 애니메이션 메가 히트곡)
  jpop_hits: [
    '37i9dQZF1DXdbRLJPSmnyq', // J-Pop Now (최신 인기 J-Pop)
    '37i9dQZF1DXafb0IuPwJyF', // Anime Now (인기 애니메이션 주제곡)
  ],
  // J-Pop 전체 (명곡 + 최신곡 + 애니송 전반)
  jpop_all: [
    '37i9dQZF1DXdbRLJPSmnyq', // J-Pop Now
    '37i9dQZF1DXafb0IuPwJyF', // Anime Now
  ],
  jpop: [
    '37i9dQZF1DXdbRLJPSmnyq',
    '37i9dQZF1DXafb0IuPwJyF',
  ],
  anime: ['37i9dQZF1DXafb0IuPwJyF'],
  retro: ['37i9dQZF1DX4o1oenSJRJd', '37i9dQZF1DXbTxeAdrVG2l', '37i9dQZF1DX4UtSsGT1Sbe', '37i9dQZF1DX5Ejj0EkURtP'],
  rock: ['37i9dQZF1DWXRqgorJj26U'],
  hiphop: ['37i9dQZF1DX0XUsuxWHRQd'],
  chill: ['37i9dQZF1DX4WYpdgoIcn6'],
  // 완전 랜덤용 종합 풀
  spotify_random: [
    '37i9dQZF1DXcBWIGoYBM5M', // Today's Top Hits
    '37i9dQZF1DX9tPFwDMOaN1', // K-Pop ON!
    '37i9dQZF1DXe5W6diBL5N4', // K-Pop Generation
    '37i9dQZF1DX5Ejj0EkURtP', // All Out 10s
    '37i9dQZF1DX4o1oenSJRJd', // All Out 00s
    '37i9dQZF1DXbTxeAdrVG2l', // All Out 90s
    '37i9dQZF1DWXRqgorJj26U', // Rock Classics
    '37i9dQZF1DXdbRLJPSmnyq', // J-Pop Now
    '37i9dQZF1DXafb0IuPwJyF', // Anime Now
  ],
};

/**
 * Fetch completely random tracks
 * Prioritizes user's personalized top tracks & preferred genres if configured,
 * with zero-auth public pools as instant fallback
 */
export async function fetchSpotifyRandomTracks(clientId, clientSecret, count = 80, userToken, preferredGenres = []) {
  // 1. If userToken is provided, fetch personalized top tracks, liked songs & recommendations!
  if (userToken) {
    try {
      const userEndpoints = [
        `${SPOTIFY_API_BASE}/me/top/tracks?limit=50&time_range=medium_term`,
        `${SPOTIFY_API_BASE}/me/top/tracks?limit=50&time_range=short_term`,
        `${SPOTIFY_API_BASE}/me/tracks?limit=50`,
      ];

      const responses = await Promise.all(
        userEndpoints.map(url =>
          fetch(url, {
            headers: {
              Authorization: `Bearer ${userToken}`,
              'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            },
          })
            .then(res => (res.ok ? res.json() : null))
            .catch(() => null)
        )
      );

      const tracks = [];
      for (const data of responses) {
        if (!data) continue;
        const items = data.items || [];
        for (const item of items) {
          const t = item.track || item;
          if (!t || !t.name || !t.artists?.length) continue;
          const artistName = t.artists.map(a => a.name).join(', ') || 'Various Artists';
          if (isKaraokeOrUnwantedTrack(t.name, artistName, t.album?.name)) continue;
          const year = parseInt(t.album?.release_date?.slice(0, 4), 10) || null;
          const coverUrl = t.album?.images?.[0]?.url || '';
          const spotifyUrl = t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`;
          tracks.push({
            id: `spotify-${t.id}`,
            title: t.name,
            artist: artistName,
            year,
            coverUrl,
            spotifyUrl,
            previewUrl: t.preview_url,
            aliases: { title: [], artist: [] },
            isSpotify: true,
          });
        }
      }

      if (tracks.length >= 8) {
        const unique = deduplicateTracks(tracks);
        // Shuffle
        for (let i = unique.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [unique[i], unique[j]] = [unique[j], unique[i]];
        }
        await enrichTracksMetadata(unique);
        return unique.slice(0, count);
      }
    } catch (err) {
      console.warn('User token personalized fetch failed, falling back:', err.message);
    }
  }

  // 2. Fetch from public playlist pools via Embed (Zero credentials required!)
  // Samples candidates based on user's preferred genres or theme keys
  try {
    let candidateSeeds = [];
    if (Array.isArray(preferredGenres) && preferredGenres.length > 0) {
      for (const g of preferredGenres) {
        if (GENRE_SEED_MAP[g]) {
          candidateSeeds.push(...GENRE_SEED_MAP[g]);
        }
      }
    }

    if (candidateSeeds.length === 0) {
      candidateSeeds = GENRE_SEED_MAP.spotify_random || [...PUBLIC_RANDOM_SEEDS];
    }

    const uniqueSeeds = [...new Set(candidateSeeds)];
    // Randomly pick 3 to 5 seeds from candidates to combine diverse pools every game
    const shuffledSeeds = uniqueSeeds.sort(() => 0.5 - Math.random()).slice(0, Math.min(4, uniqueSeeds.length));
    const results = await Promise.all(shuffledSeeds.map(fetchPlaylistFromEmbed));
    const pool = results.filter(Boolean).flat();
    if (pool.length >= 5) {
      const unique = deduplicateTracks(pool);

      // Shuffle
      for (let i = unique.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unique[i], unique[j]] = [unique[j], unique[i]];
      }

      await enrichTracksMetadata(unique);
      return unique.slice(0, count);
    }
  } catch (err) {
    console.warn('Embed pool random fetch failed:', err.message);
  }

  return [];
}
