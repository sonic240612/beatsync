'use client';

/**
 * Spotify Playlists & Track Helpers for BeatSync
 * No login, No API key, No Client ID required.
 * Players directly paste Spotify playlist URLs or select curated presets.
 */

export interface SpotifyPlaylistItem {
  id: string;
  name: string;
  description?: string;
  images?: { url: string }[];
  tracks?: { total: number };
  url: string;
}

export const DEFAULT_PRESET_PLAYLISTS: SpotifyPlaylistItem[] = [
  {
    id: '37i9dQZF1DX9tPFwDMOaN1',
    name: '🔥 K-Pop ON! 인기 히트곡',
    description: '최신 및 인기 K-Pop 공식 플레이리스트',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX9tPFwDMOaN1',
    images: [{ url: 'https://i.scdn.co/image/ab67706f00000002526040498d89ec622e9d3495' }],
    tracks: { total: 50 },
  },
  {
    id: '37i9dQZF1DXcBWIGoYBM5M',
    name: "🌐 Today's Top Hits",
    description: '전 세계 가장 핫한 글로벌 팝송 TOP',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    images: [{ url: 'https://i.scdn.co/image/ab67706f00000002526040498d89ec622e9d3495' }],
    tracks: { total: 50 },
  },
  {
    id: '37i9dQZF1DX4o1oenSJRJd',
    name: '📼 2000년대 추억의 명곡',
    description: '2000년대 감성 팝 & 가요 명곡 모음',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX4o1oenSJRJd',
    images: [{ url: 'https://i.scdn.co/image/ab67706f00000002526040498d89ec622e9d3495' }],
    tracks: { total: 100 },
  },
  {
    id: '37i9dQZF1DWXRqgorJj26U',
    name: '🎸 록 클래식 & 밴드 명곡',
    description: '전설적인 록 & 밴드 트랙 모음집',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DWXRqgorJj26U',
    images: [{ url: 'https://i.scdn.co/image/ab67706f00000002526040498d89ec622e9d3495' }],
    tracks: { total: 80 },
  },
];

const STORAGE_KEY_SAVED_PLAYLISTS = 'beatsync_saved_playlists';

export function getSavedPlaylists(): SpotifyPlaylistItem[] {
  if (typeof window === 'undefined') return DEFAULT_PRESET_PLAYLISTS;
  const raw = localStorage.getItem(STORAGE_KEY_SAVED_PLAYLISTS);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {}
  }
  return DEFAULT_PRESET_PLAYLISTS;
}

export function addSavedPlaylist(playlist: { name: string; url: string }): SpotifyPlaylistItem[] {
  const current = getSavedPlaylists();
  const playlistId = extractPlaylistIdFromUrl(playlist.url) || `custom-${Date.now()}`;
  const newItem: SpotifyPlaylistItem = {
    id: playlistId,
    name: playlist.name.trim() || '내 플레이리스트',
    url: playlist.url.trim(),
  };

  const updated = [newItem, ...current.filter(p => p.url !== newItem.url)];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_SAVED_PLAYLISTS, JSON.stringify(updated));
  }
  return updated;
}

export function removeSavedPlaylist(id: string): SpotifyPlaylistItem[] {
  const current = getSavedPlaylists();
  const updated = current.filter(p => p.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_SAVED_PLAYLISTS, JSON.stringify(updated));
  }
  return updated;
}

export function extractPlaylistIdFromUrl(url: string): string | null {
  const match = String(url).match(/playlist[/:]([a-zA-Z0-9]+)/) || String(url).match(/^([a-zA-Z0-9]+)$/);
  return match ? match[1] : null;
}

export function clearSpotifySession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('beatsync_spotify_token');
  localStorage.removeItem('beatsync_spotify_refresh');
  localStorage.removeItem('beatsync_spotify_expires');
  localStorage.removeItem('beatsync_spotify_profile');
  localStorage.removeItem('beatsync_spotify_verifier');
  localStorage.removeItem('beatsync_spotify_client_id');
}
