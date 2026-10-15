import { NextResponse } from 'next/server';
import { tracks as catalog } from '@/shared/tracks.js';

interface YtCandidate {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  isVerifiedArtist?: boolean;
  isVerified?: boolean;
}

const ytCache = new Map<string, string>();

const NEGATIVE_PATTERNS = [
  /\bcover\b/i,
  /커버/i,
  /covered\s+by/i,
  /cover\s+by/i,
  /노래방/i,
  /\bkaraoke\b/i,
  /\bmr\b/i,
  /\binst(?:\.|\b|rumental)/i,
  /반주/i,
  /tj노래방/i,
  /금영/i,
  /1\s*시간/i,
  /10\s*시간/i,
  /1\s*hour/i,
  /10\s*hours/i,
  /연속\s*듣기/i,
  /플레이리스트/i,
  /\bplaylist\b/i,
  /모음/i,
  /medley/i,
  /메들리/i,
  /\breaction\b/i,
  /리액션/i,
  /\breview\b/i,
  /교차\s*편집/i,
  /stage\s*mix/i,
  /speed\s*up/i,
  /sped\s*up/i,
  /배속/i,
  /slowed/i,
  /nightcore/i,
  /8d\s*audio/i,
  /직캠/i,
  /fancam/i,
  /응원법/i,
  /fanchant/i,
  /teaser/i,
  /티저/i,
  /trailer/i,
  /making\s*film/i,
  /메이킹/i,
  /behind\s*the\s*scenes/i,
  /비하인드/i,
  /challenge/i,
  /챌린지/i,
  /\bshorts\b/i,
  /acapella/i,
  /아카펠라/i,
  /english\s*ver(?:sion)?|영어\s*버전|\beng\s*ver\b/i,
  /japanese\s*ver(?:sion)?|일본어\s*버전|\bjp\s*ver\b/i,
  /korean\s*ver(?:sion)?|한국어\s*버전|\bkor\s*ver\b/i,
  /chinese\s*ver(?:sion)?|중국어\s*버전/i,
];

const KNOWN_LABELS = [
  '1thek', 'smtown', 'hybe', 'jyp', 'stone music', 'genie music', 'kakao',
  'yg entertainment', 'bighit', 'starship', 'cube', 'woollim', 'wm entertainment',
  'rbw', 'fnc', 'wakeone', 'edam', 'antenna', 'warner music', 'universal music',
  'sony music', 'vevo', 'clover', 'korea music', 'nh ent', 'danal', 'poclanos',
  'mirrorball', 'bugs', 'avex', 'sony music entertainment'
];

function normalize(s: string): string {
  if (!s) return '';
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\-_.,/\\()[\]{}~!?@#$%^&*+=:;'"`|<>]/g, '');
}

function parseDurationSeconds(durStr: string): number {
  if (!durStr) return 0;
  const parts = durStr.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

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

function scoreCandidate(
  candidate: YtCandidate,
  targetTitle: string,
  targetArtist: string,
  aliases: { title?: string[]; artist?: string[] } = {}
): { score: number; reason: string } {
  const normTitleList = [normalize(targetTitle), ...(aliases.title || []).map(normalize)].filter(Boolean);
  const normArtistList = [normalize(targetArtist), ...(aliases.artist || []).map(normalize)].filter(Boolean);

  const normCandTitle = normalize(candidate.title);
  const normCandChannel = normalize(candidate.channel);
  const rawTitle = candidate.title;

  // 1. Duration check: exclude Shorts (<60s) or compilation loops (>600s)
  const durSec = parseDurationSeconds(candidate.duration);
  if (durSec > 0 && (durSec < 60 || durSec > 600)) {
    return { score: -999, reason: `Invalid duration: ${durSec}s` };
  }

  // 2. Anti-cover / anti-karaoke blacklist
  for (const pat of NEGATIVE_PATTERNS) {
    if (pat.test(rawTitle)) {
      const matchInTarget = pat.test(targetTitle) || (aliases.title || []).some(t => pat.test(t));
      if (!matchInTarget) {
        return { score: -999, reason: `Negative pattern: ${pat}` };
      }
    }
  }

  // Check for third-party covers indicated by "by <Singer>"
  const byMatch = rawTitle.match(/\bby\s+([A-Za-z0-9가-힣\s]{2,})/i);
  if (byMatch && byMatch[1]) {
    const bySinger = normalize(byMatch[1]);
    const matchesTargetArtist = normArtistList.some(na => na && (bySinger.includes(na) || na.includes(bySinger)));
    if (!matchesTargetArtist && !normTitleList.some(nt => nt && nt.includes(bySinger))) {
      return { score: -999, reason: `Third-party cover by: ${byMatch[1]}` };
    }
  }

  let score = 0;

  // 3. Title matching (up to 40 pts)
  const hasExactTitle = normTitleList.some(nt => nt && normCandTitle.includes(nt));
  if (hasExactTitle) {
    score += 40;
  } else {
    const words = targetTitle.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    const matchedWords = words.filter(w => candidate.title.toLowerCase().includes(w));
    if (words.length > 0 && matchedWords.length === words.length) {
      score += 35;
    } else if (words.length > 0 && matchedWords.length / words.length >= 0.5) {
      score += 20;
    } else {
      return { score: -500, reason: 'Title not matched' };
    }
  }

  // 4. Artist matching (up to 35 pts)
  const artistMatchedInTitle = normArtistList.some(na => na && normCandTitle.includes(na));
  const artistMatchedInChannel = normArtistList.some(na => na && normCandChannel.includes(na));

  if (artistMatchedInTitle || artistMatchedInChannel) {
    score += 35;
  } else {
    const allArtistTokens = [
      ...targetArtist.toLowerCase().split(/[\s,&/]+/),
      ...(aliases.artist || []).flatMap(a => a.toLowerCase().split(/[\s,&/]+/))
    ].filter(w => w.length > 1);

    const anyTokenMatch = allArtistTokens.some(t =>
      candidate.title.toLowerCase().includes(t) || candidate.channel.toLowerCase().includes(t)
    );
    if (anyTokenMatch) {
      score += 25;
    } else if (targetArtist) {
      score -= 30; // Artist completely absent
    }
  }

  // 5. Official indicators bonus
  // Topic channel (auto-generated official audio feed from YouTube Music)
  if (candidate.channel.endsWith('- Topic') || candidate.channel.includes('Release - Topic')) {
    score += 35;
  }
  // Verified Artist badge
  if (candidate.isVerifiedArtist) {
    score += 35;
  }
  // Verified Channel badge
  if (candidate.isVerified) {
    score += 10;
  }
  // Known official label / distributor channel
  const chLower = candidate.channel.toLowerCase();
  if (KNOWN_LABELS.some(label => chLower.includes(label))) {
    score += 20;
  }
  // Channel name contains artist name
  if (artistMatchedInChannel) {
    score += 25;
  }
  // Official audio / MV keyword in title
  if (/official\s*audio|오피셜\s*오디오/i.test(candidate.title)) {
    score += 20;
  } else if (/official\s*(?:mv|music\s*video)|\[mv\]|\(mv\)|：music\s*video|music\s*video/i.test(candidate.title)) {
    score += 20;
  }

  // 6. Typical song duration bonus (2m ~ 6m)
  if (durSec >= 120 && durSec <= 360) {
    score += 5;
  }

  // 7. Small penalties for live / lyric video channels
  if (/\blive\b|라이브/i.test(candidate.title) && !/\blive\b|라이브/i.test(targetTitle)) {
    score -= 15;
  }
  if (/가사|lyrics/i.test(candidate.title)) {
    score -= 5;
  }

  return { score, reason: 'OK' };
}

function extractYtInitialData(html: string): any {
  const m1 = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
  if (m1) {
    try {
      return JSON.parse(m1[1]);
    } catch {}
  }
  const idx = html.indexOf('ytInitialData');
  if (idx !== -1) {
    const eqIdx = html.indexOf('=', idx);
    if (eqIdx !== -1) {
      const startBrace = html.indexOf('{', eqIdx);
      if (startBrace !== -1) {
        const endScript = html.indexOf(';</script>', startBrace);
        if (endScript !== -1) {
          try {
            return JSON.parse(html.slice(startBrace, endScript));
          } catch {}
        }
      }
    }
  }
  return null;
}

function parseVideoRenderers(data: any): YtCandidate[] {
  const list: YtCandidate[] = [];
  function walk(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    if (obj.videoRenderer) {
      const vr = obj.videoRenderer;
      const title = vr.title?.runs?.map((r: any) => r.text).join('') || vr.title?.simpleText || '';
      const channel = vr.ownerText?.runs?.map((r: any) => r.text).join('') || '';
      const duration = vr.lengthText?.simpleText || '';
      const isVerifiedArtist = vr.ownerBadges?.some((b: any) => b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED_ARTIST');
      const isVerified = vr.ownerBadges?.some((b: any) => b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED');
      if (vr.videoId && title) {
        list.push({
          videoId: vr.videoId,
          title,
          channel,
          duration,
          isVerifiedArtist,
          isVerified,
        });
      }
      return;
    }
    for (const key of Object.keys(obj)) {
      walk(obj[key]);
    }
  }

  walk(data);
  return list;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  let title = url.searchParams.get('title') || '';
  let artist = url.searchParams.get('artist') || '';
  const trackId = url.searchParams.get('trackId') || '';

  // 1. Catalog lookup for title, artist, and aliases
  let aliases: { title?: string[]; artist?: string[] } = {};
  if (trackId) {
    const found = catalog.find(t => t.id === trackId);
    if (found) {
      if (!title) title = found.title;
      if (!artist) artist = found.artist;
      if (found.aliases) aliases = found.aliases;
    }
  }

  // 2. Spotify oEmbed fallback if title still empty
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

  // If catalog wasn't found by trackId, try finding by title & artist to get aliases
  if (!aliases.title && !aliases.artist) {
    const normT = normalize(cleanTitle);
    const normA = normalize(firstArtist);
    const found = catalog.find(t => normalize(t.title) === normT && normalize(t.artist) === normA);
    if (found?.aliases) {
      aliases = found.aliases;
    }
  }

  const cacheKey = `${firstArtist}:::${cleanTitle}`.toLowerCase();
  if (ytCache.has(cacheKey)) {
    return NextResponse.json({
      ok: true,
      videoId: ytCache.get(cacheKey)!,
      title: cleanTitle,
      artist: firstArtist,
      cached: true,
    });
  }

  const queries = [
    firstArtist ? `${firstArtist} ${cleanTitle} official audio` : `${cleanTitle} official audio`,
    firstArtist ? `${firstArtist} ${cleanTitle} audio` : `${cleanTitle} audio`,
    firstArtist ? `${firstArtist} ${cleanTitle}` : cleanTitle,
    firstArtist ? `${firstArtist} ${cleanTitle} topic` : '',
  ].filter(Boolean);

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];

  let bestCandidate: YtCandidate | null = null;
  let bestScore = -999;

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
        const data = extractYtInitialData(html);
        if (data) {
          const candidates = parseVideoRenderers(data);
          for (const cand of candidates) {
            const { score } = scoreCandidate(cand, cleanTitle, firstArtist, aliases);
            if (score > bestScore) {
              bestScore = score;
              bestCandidate = cand;
            }
          }
          // If we found an official or high confidence candidate (score >= 80), stop querying
          if (bestScore >= 80) break;
        }
      }
    } catch {}
  }

  // Minimum confidence threshold of 50 to guarantee authentic track
  if (bestCandidate && bestScore >= 50) {
    ytCache.set(cacheKey, bestCandidate.videoId);
    return NextResponse.json({
      ok: true,
      videoId: bestCandidate.videoId,
      title: cleanTitle,
      artist: firstArtist,
      score: bestScore,
      candidateTitle: bestCandidate.title,
      channel: bestCandidate.channel,
    });
  }

  return NextResponse.json({ ok: false, error: 'Verified YouTube video not found' }, { status: 404 });
}
