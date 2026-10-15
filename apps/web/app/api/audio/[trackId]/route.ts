import { NextResponse } from 'next/server';
import { tracks as catalog } from '@/shared/tracks.js';

const previewCache = new Map<string, string>();

function cleanForSearch(title: string, artist: string) {
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

async function resolvePreview(
  title: string,
  artist: string,
  aliases: { title?: string[]; artist?: string[] } = {}
): Promise<string | null> {
  const { cleanTitle, firstArtist } = cleanForSearch(title, artist);
  const key = `${firstArtist}:${cleanTitle}`.toLowerCase();
  if (previewCache.has(key)) return previewCache.get(key)!;

  const queries = [
    firstArtist ? `${firstArtist} ${cleanTitle}` : cleanTitle,
    firstArtist ? `${cleanTitle} ${firstArtist}` : '',
    artist && title ? `${artist} ${title}` : '',
  ].filter(Boolean);

  const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(`${title} ${artist}`);
  const countries = hasJapanese ? ['JP', 'US'] : ['US', 'JP'];

  for (const country of countries) {
    for (const q of queries) {
      try {
        const query = encodeURIComponent(q);
        const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=8&country=${country}`, {
          next: { revalidate: 3600 },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (res.ok) {
          const text = await res.text();
          if (text) {
            const data = JSON.parse(text);
            const cand = (data.results || []).find((r: any) => {
              if (!r.previewUrl || !isPlayableAudioUrl(r.previewUrl)) return false;
              return isValidTrackCandidate(r.trackName || '', r.artistName || '', cleanTitle, firstArtist, aliases);
            });
            if (cand?.previewUrl) {
              previewCache.set(key, cand.previewUrl);
              return cand.previewUrl;
            }
          }
        }
      } catch {}
    }
  }

  // Deezer fallback
  for (const q of queries) {
    try {
      const query = encodeURIComponent(q);
      const deezerRes = await fetch(`https://api.deezer.com/search?q=${query}&limit=8`, {
        next: { revalidate: 3600 },
      });
      if (deezerRes.ok) {
        const deezerData = await deezerRes.json();
        const cand = (deezerData?.data || []).find((r: any) => {
          if (!r.preview) return false;
          return isValidTrackCandidate(r.title || '', r.artist?.name || '', cleanTitle, firstArtist, aliases);
        });
        if (cand?.preview) {
          previewCache.set(key, cand.preview);
          return cand.preview;
        }
      }
    } catch {}
  }

  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const { trackId } = await params;
  const track = catalog.find(t => t.id === trackId);

  if (track) {
    if (track.previewUrl && isPlayableAudioUrl(track.previewUrl)) {
      return NextResponse.redirect(track.previewUrl);
    }
    const livePreview = await resolvePreview(track.title, track.artist, track.aliases || {});
    if (livePreview) {
      return NextResponse.redirect(livePreview);
    }
  }

  // Dynamic Spotify track query via search params
  const url = new URL(_request.url);
  let title = url.searchParams.get('title') || '';
  let artist = url.searchParams.get('artist') || '';

  // If title was missing and this is a Spotify track ID, auto-resolve from Spotify oEmbed
  if (!title && trackId && trackId.startsWith('spotify-')) {
    const cleanId = trackId.replace('spotify-', '').trim();
    try {
      const oembedRes = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${cleanId}`, {
        next: { revalidate: 86400 },
      });
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        if (oembed?.title) {
          const parts = oembed.title.split(' - ');
          if (parts.length >= 2) {
            title = parts[0].trim();
            artist = parts.slice(1).join(' - ').trim();
          } else {
            title = oembed.title.trim();
          }
        }
      }
    } catch {}
  }

  if (title || artist) {
    const livePreview = await resolvePreview(title || '', artist || '');
    if (livePreview) {
      return NextResponse.redirect(livePreview);
    }
  }

  return NextResponse.json({ error: 'Audio preview not found' }, { status: 404 });
}
