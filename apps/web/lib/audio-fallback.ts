/**
 * Direct client-side audio preview fallback resolver
 * Runs directly in player's browser using residential/mobile client IP (bypassing server rate limits)
 * Utilizes Apple Music's public CORS-enabled (Access-Control-Allow-Origin: *) search endpoint
 */

export function cleanForSearch(title: string, artist: string) {
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

export async function resolveClientAudioPreview(rawTitle?: string, rawArtist?: string): Promise<string | null> {
  if (!rawTitle && !rawArtist) return null;

  const { cleanTitle, firstArtist } = cleanForSearch(rawTitle || '', rawArtist || '');
  const queries = [
    `${firstArtist} ${cleanTitle}`,
    `${cleanTitle} ${firstArtist}`,
    `${rawArtist} ${rawTitle}`,
    cleanTitle,
  ].filter(Boolean);

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
            return cand.previewUrl;
          }
        }
      } catch {}
    }
  }

  // Deezer fallback
  for (const q of queries) {
    try {
      const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=5`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const cand = (data.data || []).find((r: any) => r.preview);
        if (cand?.preview) {
          return cand.preview;
        }
      }
    } catch {}
  }

  return null;
}
