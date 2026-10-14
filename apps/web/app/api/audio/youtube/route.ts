import { NextResponse } from 'next/server';

const ytCache = new Map<string, string>();

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  let title = url.searchParams.get('title') || '';
  let artist = url.searchParams.get('artist') || '';
  const trackId = url.searchParams.get('trackId') || '';

  // If title is missing and trackId is a Spotify ID, resolve title & artist via oEmbed
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

  if (!title && !artist) {
    return NextResponse.json({ ok: false, error: 'title or artist required' }, { status: 400 });
  }

  const { cleanTitle, firstArtist } = cleanForSearch(title, artist);
  const cacheKey = `${firstArtist}:::${cleanTitle}`.toLowerCase();
  if (ytCache.has(cacheKey)) {
    return NextResponse.json({ ok: true, videoId: ytCache.get(cacheKey)!, title: cleanTitle, artist: firstArtist });
  }

  const queries = [
    `${firstArtist} ${cleanTitle} audio`,
    `${cleanTitle} ${firstArtist} official audio`,
    `${firstArtist} ${cleanTitle}`,
    cleanTitle,
  ].filter(Boolean);

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  ];

  for (const q of queries) {
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        next: { revalidate: 86400 },
      });
      if (res.ok) {
        const html = await res.text();
        const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (match && match[1]) {
          const videoId = match[1];
          ytCache.set(cacheKey, videoId);
          return NextResponse.json({ ok: true, videoId, title: cleanTitle, artist: firstArtist });
        }
      }
    } catch {}
  }

  return NextResponse.json({ ok: false, error: 'YouTube video not found' }, { status: 404 });
}
