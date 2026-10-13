import { NextResponse } from 'next/server';
import { tracks as catalog } from '@/shared/tracks.js';

const previewCache = new Map<string, string>();

async function resolvePreview(title: string, artist: string): Promise<string | null> {
  const key = `${artist}:${title}`.toLowerCase();
  if (previewCache.has(key)) return previewCache.get(key)!;

  try {
    const query = encodeURIComponent(`${artist} ${title}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const text = await res.text();
      if (text) {
        const data = JSON.parse(text);
        const item = data.results?.[0];
        if (item?.previewUrl) {
          previewCache.set(key, item.previewUrl);
          return item.previewUrl;
        }
      }
    }
  } catch {}

  try {
    const q = encodeURIComponent(`${artist} ${title}`);
    const deezerRes = await fetch(`https://api.deezer.com/search?q=${q}&limit=1`, {
      next: { revalidate: 3600 },
    });
    if (deezerRes.ok) {
      const deezerData = await deezerRes.json();
      const previewUrl = deezerData?.data?.[0]?.preview;
      if (previewUrl) {
        previewCache.set(key, previewUrl);
        return previewUrl;
      }
    }
  } catch {}

  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const { trackId } = await params;
  const track = catalog.find(t => t.id === trackId);

  if (track) {
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
