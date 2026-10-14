import { tracks as catalog } from '../shared/tracks.js';
import { fetchSpotifyPlaylist, fetchSpotifyRandomTracks, resolveAudioPreview, enrichTracksMetadata, deduplicateTracks } from './spotify-provider.js';

export function createTrackProvider(baseUrl, options = {}) {
  const musicSource = options.musicSource || 'kpop_hits';
  const customTracks = options.customTracks || null;

  return {
    name: musicSource,
    listTracks: async () => {
      if (customTracks && customTracks.length) {
        const uniqueCustom = deduplicateTracks(customTracks);
        await enrichTracksMetadata(uniqueCustom);
        return uniqueCustom.map(t => ({ ...t }));
      }

      if (musicSource === 'spotify_playlist' && options.playlistUrl) {
        try {
          const spotifyTracks = await fetchSpotifyPlaylist(
            options.playlistUrl,
            options.clientId,
            options.clientSecret,
            options.userToken
          );
          if (spotifyTracks && spotifyTracks.length > 0) {
            await enrichTracksMetadata(spotifyTracks);
            return spotifyTracks;
          }
        } catch (err) {
          console.warn('Spotify playlist fetch fallback to kpop_hits:', err.message);
        }
      }

      // 1. Guaranteed iconic mega-hit categories:
      // Always draw from the curated verified hits pool (100% universal fame, no obscure tracks)
      const isCuratedHitCategory = ['kpop_hits', 'kpop_retro', 'pop_hits', 'jpop_hits'].includes(musicSource);
      if (isCuratedHitCategory) {
        const matchingHits = catalog.filter(t => t.category === musicSource);
        const hitPool = deduplicateTracks(matchingHits.map(t => ({ ...t })));
        // Random shuffle every game so match order and selection is always fresh
        for (let i = hitPool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [hitPool[i], hitPool[j]] = [hitPool[j], hitPool[i]];
        }
        return hitPool;
      }

      // 2. Broad genre & random categories (kpop_all, pop_all, jpop_all, spotify_random):
      // Combine curated hits with live Spotify seeds (clean seeds with promo/rising removed)
      const categoryGenreMap = {
        kpop_all: ['kpop_all'],
        pop_all: ['pop_all'],
        jpop_all: ['jpop_all'],
        spotify_random: options.preferredGenres?.length ? options.preferredGenres : ['spotify_random'],
      };

      if (categoryGenreMap[musicSource]) {
        try {
          const spotifyGenreTracks = await fetchSpotifyRandomTracks(
            options.clientId,
            options.clientSecret,
            120,
            options.userToken,
            categoryGenreMap[musicSource]
          );

          // Get language-specific curated hits to ensure hits are always present in the pool
          let baseCatalogHits = [];
          if (musicSource === 'kpop_all') {
            baseCatalogHits = catalog.filter(t => ['kpop_hits', 'kpop_retro'].includes(t.category));
          } else if (musicSource === 'pop_all') {
            baseCatalogHits = catalog.filter(t => t.category === 'pop_hits');
          } else if (musicSource === 'jpop_all') {
            baseCatalogHits = catalog.filter(t => t.category === 'jpop_hits');
          }

          const combined = deduplicateTracks([
            ...baseCatalogHits.map(t => ({ ...t })),
            ...(spotifyGenreTracks || []),
          ]);

          if (combined.length >= 8) {
            for (let i = combined.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [combined[i], combined[j]] = [combined[j], combined[i]];
            }
            await enrichTracksMetadata(combined);
            return combined;
          }
        } catch (err) {
          console.warn(`Spotify dynamic ${musicSource} fetch fallback:`, err.message);
        }
      }

      // 3. Resilient Fallback to catalog if Spotify is unreachable (enriches with HTTPS audio)
      const filtered = catalog.filter(t => {
        if (musicSource === 'kpop_hits') return t.category === 'kpop_hits';
        if (musicSource === 'kpop_retro') return t.category === 'kpop_retro';
        if (musicSource === 'kpop_all') return ['kpop_hits', 'kpop_retro', 'kpop_all'].includes(t.category);
        if (musicSource === 'pop_hits') return t.category === 'pop_hits';
        if (musicSource === 'pop_all') return ['pop_hits', 'pop_all'].includes(t.category);
        if (musicSource === 'jpop_hits') return t.category === 'jpop_hits';
        if (musicSource === 'jpop_all') return ['jpop_hits', 'jpop_all'].includes(t.category);
        return true;
      });
      const fallbackList = deduplicateTracks((filtered.length ? filtered : catalog).map(t => ({ ...t })));
      for (let i = fallbackList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fallbackList[i], fallbackList[j]] = [fallbackList[j], fallbackList[i]];
      }
      return fallbackList;
    },
    getPreview: (track, startSeconds = 0) => {
      if (track.previewUrl) {
        return {
          url: track.previewUrl,
          startSeconds,
        };
      }
      const safeBase = (baseUrl && !baseUrl.includes('127.0.0.1') && !baseUrl.includes('localhost'))
        ? baseUrl.replace(/\/+$/, '')
        : '';
      const params = new URLSearchParams();
      if (track.title) params.set('title', track.title);
      if (track.artist) params.set('artist', track.artist);
      if (startSeconds) params.set('start', String(startSeconds));
      const qs = params.toString() ? `?${params.toString()}` : '';
      return {
        url: `${safeBase}/api/audio/${encodeURIComponent(track.id)}${qs}`,
        startSeconds,
      };
    },
  };
}
