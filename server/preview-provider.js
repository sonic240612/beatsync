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

      const genreMap = {
        kpop_all: {
          genreKey: 'kpop',
          categories: ['kpop_hits', 'kpop_retro', 'kpop_all'],
        },
        pop_all: {
          genreKey: 'pop',
          categories: ['pop_hits', 'pop_all'],
        },
        jpop_all: {
          genreKey: 'jpop',
          categories: ['jpop_hits', 'jpop_all'],
        },
      };

      if (genreMap[musicSource]) {
        const { genreKey, categories } = genreMap[musicSource];
        const baseCatalogTracks = catalog
          .filter(t => categories.includes(t.category))
          .map(t => ({ ...t }));

        let combined = [...baseCatalogTracks];
        try {
          const spotifyGenreTracks = await fetchSpotifyRandomTracks(
            options.clientId,
            options.clientSecret,
            60,
            null,
            [genreKey]
          );
          if (spotifyGenreTracks.length >= 5) {
            await enrichTracksMetadata(spotifyGenreTracks);
            combined = deduplicateTracks([...baseCatalogTracks, ...spotifyGenreTracks]);
          } else {
            combined = deduplicateTracks(baseCatalogTracks);
          }
        } catch (err) {
          console.warn(`Spotify ${musicSource} fetch fallback to catalog:`, err.message);
          combined = deduplicateTracks(baseCatalogTracks);
        }

        for (let i = combined.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [combined[i], combined[j]] = [combined[j], combined[i]];
        }
        return combined;
      }

      if (musicSource === 'spotify_random') {
        try {
          const spotifyRandomTracks = await fetchSpotifyRandomTracks(
            options.clientId,
            options.clientSecret,
            80,
            options.userToken,
            options.preferredGenres
          );
          if (spotifyRandomTracks.length >= 5) {
            await enrichTracksMetadata(spotifyRandomTracks);
            return spotifyRandomTracks;
          }
        } catch (err) {
          console.warn('Spotify random fetch fallback to catalog shuffle:', err.message);
        }

        // Complete random shuffle across all catalog tracks
        const allTracks = deduplicateTracks(catalog.map(t => ({ ...t })));
        for (let i = allTracks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allTracks[i], allTracks[j]] = [allTracks[j], allTracks[i]];
        }
        return allTracks;
      }

      if (musicSource === 'spotify_playlist' && options.playlistUrl) {
        try {
          const spotifyTracks = await fetchSpotifyPlaylist(
            options.playlistUrl,
            options.clientId,
            options.clientSecret,
            options.userToken
          );
          if (spotifyTracks.length) {
            await enrichTracksMetadata(spotifyTracks);
            return spotifyTracks;
          }
        } catch (err) {
          console.warn('Spotify playlist fetch fallback to kpop_hits:', err.message);
        }
      }

      const filtered = catalog.filter(t => t.category === musicSource);
      if (filtered.length) {
        return filtered.map(t => ({ ...t }));
      }

      // Default: full catalog
      return catalog.map(t => ({ ...t }));
    },
    getPreview: (track, startSeconds = 0) => {
      if (track.previewUrl) {
        return {
          url: track.previewUrl,
          startSeconds,
        };
      }
      return {
        url: `${baseUrl}/api/audio/${track.id}?start=${startSeconds}`,
        startSeconds,
      };
    },
  };
}
