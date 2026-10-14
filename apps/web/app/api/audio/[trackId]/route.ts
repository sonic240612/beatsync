import { NextResponse } from 'next/server';
import { tracks as catalog } from '@/shared/tracks.js';

const previewCache = new Map<string, string>();

async function resolvePreview(title: string, artist: string): Promise<string | null> {
  const cleanTitle = (title || '').replace(/\s*[\(\[（].*?[\)\]）]/g, '').trim();
  const firstArtist = (artist || '').split(/[,&/×・]/)[0].trim();
  const key = `${firstArtist}:${cleanTitle}`.toLowerCase();
  if (previewCache.has(key)) return previewCache.get(key)!;

  const queries = [
    `${firstArtist} ${cleanTitle}`,
    `${artist} ${title}`,
    cleanTitle,
  ].filter(Boolean);

  const countries = ['US', 'JP'];
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
  const title = url.searchParams.get('title');
  const artist = url.searchParams.get('artist');
  if (title || artist) {
    const livePreview = await resolvePreview(title || '', artist || '');
    if (livePreview) {
      return NextResponse.redirect(livePreview);
    }
  }

  return NextResponse.json({ error: 'Audio preview not found' }, { status: 404 });
}
