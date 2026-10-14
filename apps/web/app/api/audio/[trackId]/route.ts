import { NextResponse } from 'next/server';
import { tracks as catalog } from '@/shared/tracks.js';

const previewCache = new Map<string, string>();

function cleanForSearch(title: string, artist: string) {
  const cleanTitle = (title || '')
    .replace(/\s*[\(\[\{（［｛【](?:feat\.?|ft\.?|with|prod\.?|remaster(?:ed)?|live|ver(?:sion)?|clean|explicit|radio|edit|ost|original|inst(?:rumental)?).*?[\)\]\}）］｝】]/gi, ' ')
    .replace(/\s*[-–—]\s*(?:(?:\d{4}\s*)?remaster(?:ed)?|live|ver(?:sion)?|clean|explicit|edit|ost|feat\.?|ft\.?).*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const firstArtist = (artist || '')
    .replace(/\s*[\(\[\{（［｛【].*?[\)\]\}）］｝】]/g, ' ')
    .split(/[,&/×・]|(?:\s+feat\.?\s+)|(?:\s+ft\.?\s+)/i)[0]
    .trim();

  return { cleanTitle, firstArtist };
}

async function resolvePreview(title: string, artist: string): Promise<string | null> {
  const { cleanTitle, firstArtist } = cleanForSearch(title, artist);
  const key = `${firstArtist}:${cleanTitle}`.toLowerCase();
  if (previewCache.has(key)) return previewCache.get(key)!;

  const queries = [
    `${firstArtist} ${cleanTitle}`,
    `${cleanTitle} ${firstArtist}`,
    `${artist} ${title}`,
    cleanTitle,
  ].filter(Boolean);

  const countries = ['US', 'JP', 'GB'];
  for (const country of countries) {
    for (const q of queries) {
      try {
        const query = encodeURIComponent(q);
        const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=5&country=${country}`, {
          next: { revalidate: 3600 },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (res.ok) {
          const text = await res.text();
          if (text) {
            const data = JSON.parse(text);
            const cand = (data.results || []).find((r: any) => r.previewUrl);
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
      const deezerRes = await fetch(`https://api.deezer.com/search?q=${query}&limit=5`, {
        next: { revalidate: 3600 },
      });
      if (deezerRes.ok) {
        const deezerData = await deezerRes.json();
        const cand = (deezerData?.data || []).find((r: any) => r.preview);
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
    if (track.previewUrl) {
      return NextResponse.redirect(track.previewUrl);
    }
    const livePreview = await resolvePreview(track.title, track.artist);
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
