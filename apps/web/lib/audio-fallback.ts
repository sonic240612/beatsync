/**
 * Direct client-side audio preview fallback resolver
 * Runs directly in player's browser using residential/mobile client IP (bypassing server rate limits)
 * Utilizes Apple Music's public CORS-enabled (Access-Control-Allow-Origin: *) search endpoint,
 * Deezer search, and YouTube audio fallback
 */

import { tracks as catalog } from '@/shared/tracks.js';

export function cleanForSearch(title: string, artist: string) {
  const cleanTitle = (title || '')
    .replace(/\s*[\(\[\{（［｛【](?:feat\.?|ft\.?|with|prod\.?|remaster(?:ed)?|live|ver(?:sion)?|clean|explicit|radio|edit|ost|original|inst(?:rumental)?).*?[\)\]\}）］｛】]/gi, ' ')
    .replace(/\s*[-–—]\s*(?:(?:\d{4}\s*)?remaster(?:ed)?|live|ver(?:sion)?|clean|explicit|edit|ost|feat\.?|ft\.?).*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const firstArtist = (artist || '')
    .replace(/\s*[\(\[\{（［｛【].*?[\)\]\}）］｝】]/g, ' ')
    .split(/[,&/×・]|(?:\s+feat\.?\s+)|(?:\s+ft\.?\s+)/i)[0]
    .trim();

  return { cleanTitle, firstArtist };
}

export interface FallbackAudioResult {
  url?: string;
  youtubeId?: string;
  source: 'itunes' | 'deezer' | 'youtube';
}

export async function resolveClientAudioFallback(rawTitle?: string, rawArtist?: string, trackId?: string): Promise<FallbackAudioResult | null> {
  let title = rawTitle || '';
  let artist = rawArtist || '';

  if ((!title || !artist) && trackId) {
    const found = catalog.find(t => t.id === trackId);
    if (found) {
      if (!title) title = found.title;
      if (!artist) artist = found.artist;
    }
  }

  if (!title && !artist && !trackId) return null;

  const { cleanTitle, firstArtist } = cleanForSearch(title, artist);
  const queries = [
    `${firstArtist} ${cleanTitle}`,
    `${cleanTitle} ${firstArtist}`,
    `${artist} ${title}`,
    cleanTitle,
  ].filter(Boolean);

  // 1. Try Apple Music directly from browser (CORS enabled)
  const countries = ['US', 'JP'];
  for (const country of countries) {
    for (const q of queries) {
      try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=5&country=${country}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const cand = (data.results || []).find((r: any) => r.previewUrl);
          if (cand?.previewUrl) {
            return { url: cand.previewUrl, source: 'itunes' };
          }
        }
      } catch {}
    }
  }

  // 2. Try Deezer directly from browser
  for (const q of queries) {
    try {
      const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=5`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const cand = (data.data || []).find((r: any) => r.preview);
        if (cand?.preview) {
          return { url: cand.preview, source: 'deezer' };
        }
      }
    } catch {}
  }

  // 3. Ultimate Fallback: YouTube Audio Video ID
  try {
    const params = new URLSearchParams();
    if (rawTitle) params.set('title', rawTitle);
    if (rawArtist) params.set('artist', rawArtist);
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
