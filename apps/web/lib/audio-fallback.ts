/**
 * Direct client-side audio preview fallback resolver
 * Runs directly in player's browser using residential/mobile client IP (bypassing server rate limits)
 * Utilizes Apple Music's public CORS-enabled search endpoint (excluding DRM audio),
 * Deezer search, and verified YouTube audio fallback
 */

import { tracks as catalog } from '@/shared/tracks.js';

export function cleanForSearch(title: string, artist: string) {
  const cleanTitle = (title || '')
    .replace(/\s*[\(\[\{（［｛【](?:feat\.?|ft\.?|with|prod\.?|remaster(?:ed)?|live|ver(?:sion)?|clean|explicit|radio|edit|ost|original|inst(?:rumental)?).*?[\)\]\}）］｛】]/gi, ' ')
    .replace(/\s*[-–—]\s*(?:(?:\d{4}\s*)?remaster(?:ed)?|live|ver(?:sion)?|clean|explicit|edit|ost|feat\.?|ft\.?).*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const firstArtist = (artist || '')
    .replace(/\s*[\(\[\{（［｛【].*?[\)\]\}）］｛】]/g, ' ')
    .split(/[,&/×・]|(?:\s+feat\.?\s+)|(?:\s+ft\.?\s+)/i)[0]
    .trim();

  return { cleanTitle, firstArtist };
}

function normalize(s: string): string {
  if (!s) return '';
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\-_.,/\\()[\]{}~!?@#$%^&*+=:;'"`|<>]/g, '');
}

const BAD_FALLBACK_PATTERNS = [
  /\bcover\b/i,
  /커버/i,
  /\bkaraoke\b/i,
  /노래방/i,
  /\bmr\b/i,
  /\binst(?:\.|\b|rumental)/i,
  /반주/i,
  /\btribute\b/i,
  /acoustic\s*cover/i,
  /english\s*ver(?:sion)?|영어\s*버전|\beng\s*ver\b/i,
  /japanese\s*ver(?:sion)?|일본어\s*버전|\bjp\s*ver\b/i,
  /korean\s*ver(?:sion)?|한국어\s*버전|\bkor\s*ver\b/i,
  /chinese\s*ver(?:sion)?|중국어\s*버전/i,
];

function isPlayableAudioUrl(url: string): boolean {
  if (!url) return false;
  if (url.endsWith('.m4p')) return false;
  return true;
}

function isValidTrackCandidate(
  candTitle: string,
  candArtist: string,
  targetTitle: string,
  targetArtist: string,
  aliases: { title?: string[]; artist?: string[] } = {}
): boolean {
  for (const pat of BAD_FALLBACK_PATTERNS) {
    if (pat.test(candTitle) && !pat.test(targetTitle)) return false;
    if (pat.test(candArtist) && !pat.test(targetArtist)) return false;
  }

  const normTitleList = [normalize(targetTitle), ...(aliases.title || []).map(normalize)].filter(Boolean);
  const normArtistList = [normalize(targetArtist), ...(aliases.artist || []).map(normalize)].filter(Boolean);

  const normCandTitle = normalize(candTitle);
  const normCandArtist = normalize(candArtist);

  // Check for third-party covers indicated by "by <Singer>"
  const byMatch = candTitle.match(/\bby\s+([A-Za-z0-9가-힣\s]{2,})/i);
  if (byMatch && byMatch[1]) {
    const bySinger = normalize(byMatch[1]);
    const matchesTargetArtist = normArtistList.some(na => na && (bySinger.includes(na) || na.includes(bySinger)));
    if (!matchesTargetArtist && !normTitleList.some(nt => nt && nt.includes(bySinger))) {
      return false;
    }
  }

  const titleMatch = normTitleList.some(nt => nt && (normCandTitle.includes(nt) || nt.includes(normCandTitle)));
  if (!titleMatch) {
    const words = targetTitle.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    const matched = words.filter(w => candTitle.toLowerCase().includes(w));
    if (words.length === 0 || matched.length / words.length < 0.6) return false;
  }

  if (targetArtist) {
    const artistMatch = normArtistList.some(na => na && (
      normCandArtist.includes(na) ||
      na.includes(normCandArtist) ||
      normCandTitle.includes(na)
    ));
    if (!artistMatch) {
      const allTokens = [
        ...targetArtist.toLowerCase().split(/[\s,&/]+/),
        ...(aliases.artist || []).flatMap(a => a.toLowerCase().split(/[\s,&/]+/))
      ].filter(w => w.length > 1);
      const matched = allTokens.some(t => candArtist.toLowerCase().includes(t) || candTitle.toLowerCase().includes(t));
      if (!matched) return false;
    }
  }

  return true;
}

export interface FallbackAudioResult {
  url?: string;
  youtubeId?: string;
  source: 'itunes' | 'deezer' | 'youtube';
}

export async function resolveClientAudioFallback(rawTitle?: string, rawArtist?: string, trackId?: string): Promise<FallbackAudioResult | null> {
  let title = rawTitle || '';
  let artist = rawArtist || '';
  let aliases: { title?: string[]; artist?: string[] } = {};

  if (trackId) {
    const found = catalog.find(t => t.id === trackId);
    if (found) {
      if (!title) title = found.title;
      if (!artist) artist = found.artist;
      if (found.aliases) aliases = found.aliases;
    }
  }

  if (!title && !artist && !trackId) return null;

  const { cleanTitle, firstArtist } = cleanForSearch(title, artist);

  // If aliases not loaded by trackId, look up catalog by title & artist
  if (!aliases.title && !aliases.artist) {
    const normT = normalize(cleanTitle);
    const normA = normalize(firstArtist);
    const found = catalog.find(t => normalize(t.title) === normT && normalize(t.artist) === normA);
    if (found?.aliases) {
      aliases = found.aliases;
    }
  }

  const queries = [
    firstArtist ? `${firstArtist} ${cleanTitle}` : cleanTitle,
    firstArtist ? `${cleanTitle} ${firstArtist}` : '',
    artist && title ? `${artist} ${title}` : '',
  ].filter(Boolean);

  // 1. Try Apple Music directly from browser (CORS enabled, DRM-free audio only)
  const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(`${title} ${artist}`);
  const countries = hasJapanese ? ['JP', 'US'] : ['US', 'JP'];

  for (const country of countries) {
    for (const q of queries) {
      try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=8&country=${country}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const cand = (data.results || []).find((r: any) => {
            if (!r.previewUrl || !isPlayableAudioUrl(r.previewUrl)) return false;
            return isValidTrackCandidate(r.trackName || '', r.artistName || '', cleanTitle, firstArtist, aliases);
          });
          if (cand?.previewUrl) {
            return { url: cand.previewUrl, source: 'itunes' };
          }
        }
      } catch {}
    }
  }

  // 2. Try Deezer directly from browser (rejecting karaoke/MR)
  for (const q of queries) {
    try {
      const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=8`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const cand = (data.data || []).find((r: any) => {
          if (!r.preview) return false;
          return isValidTrackCandidate(r.title || '', r.artist?.name || '', cleanTitle, firstArtist, aliases);
        });
        if (cand?.preview) {
          return { url: cand.preview, source: 'deezer' };
        }
      }
    } catch {}
  }

  // 3. Ultimate Fallback: Verified YouTube Audio Video ID
  try {
    const params = new URLSearchParams();
    if (rawTitle || title) params.set('title', rawTitle || title);
    if (rawArtist || artist) params.set('artist', rawArtist || artist);
    if (trackId) params.set('trackId', trackId);

    const ytRes = await fetch(`/api/audio/youtube?${params.toString()}`);
    if (ytRes.ok) {
      const data = await ytRes.json();
      if (data?.ok && data.videoId) {
        return { youtubeId: data.videoId, source: 'youtube' };
      }
    }
  } catch {}

  return null;
}

export async function resolveClientAudioPreview(rawTitle?: string, rawArtist?: string): Promise<string | null> {
  const res = await resolveClientAudioFallback(rawTitle, rawArtist);
  return res?.url || null;
}
