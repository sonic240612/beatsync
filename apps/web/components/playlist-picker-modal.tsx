'use client';

import { useState, useEffect } from 'react';
import {
  getStoredToken,
  getSavedPlaylists,
  addSavedPlaylist,
  fetchUserPlaylists,
  type SpotifyPlaylistItem,
} from '@/lib/spotify';
import { useGame } from '@/lib/game';

interface PlaylistPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlaylist: (playlistUrl: string, playlistName: string) => void;
}

export function PlaylistPickerModal({ isOpen, onClose, onSelectPlaylist }: PlaylistPickerModalProps) {
  const { addToast } = useGame();
  const [playlists, setPlaylists] = useState<SpotifyPlaylistItem[]>([]);
  const [search, setSearch] = useState('');
  const [directUrl, setDirectUrl] = useState('');
  const [directName, setDirectName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPlaylists();
    }
  }, [isOpen]);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const localList = getSavedPlaylists();
      const token = getStoredToken();
      if (token) {
        const remote = await fetchUserPlaylists(token);
        // Merge without duplicate urls
        const urls = new Set(localList.map(p => p.url));
        const merged = [...localList];
        for (const r of remote) {
          if (!urls.has(r.url)) {
            merged.push(r);
          }
        }
        setPlaylists(merged);
      } else {
        setPlaylists(localList);
      }
    } catch {
      setPlaylists(getSavedPlaylists());
    } finally {
      setLoading(false);
    }
  };

  const handleAddDirect = (e: React.FormEvent) => {
    e.preventDefault();
    const url = directUrl.trim();
    if (!url) return;
    const name = directName.trim() || '내 플레이리스트';
    addSavedPlaylist({ name, url });
    onSelectPlaylist(url, name);
    addToast(`"${name}" 플레이리스트가 적용되었습니다!`, 'success');
    onClose();
  };

  if (!isOpen) return null;

  const filtered = playlists.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="liquid-glass-card w-full max-w-2xl p-6 sm:p-7 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">
              📂
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">Spotify 플레이리스트 선택</h2>
              <p className="text-xs text-slate-400">플레이리스트를 클릭하면 즉시 게임 음악으로 설정됩니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Add Directly & Search Bar */}
        <div className="mt-4 space-y-2.5">
          <form onSubmit={handleAddDirect} className="flex gap-2 p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <input
              value={directName}
              onChange={e => setDirectName(e.target.value)}
              placeholder="이름 (선택)"
              className="liquid-input w-28 sm:w-36 px-3 py-1.5 text-xs"
            />
            <input
              value={directUrl}
              onChange={e => setDirectUrl(e.target.value)}
              placeholder="새 Spotify 플레이리스트 URL 입력 후 바로 적용"
              className="liquid-input flex-1 px-3 py-1.5 text-xs"
            />
            <button type="submit" disabled={!directUrl.trim()} className="liquid-btn-primary px-3 py-1.5 text-xs font-bold disabled:opacity-40">
              적용
            </button>
          </form>

          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="목록에서 플레이리스트 이름 검색…"
              className="liquid-input flex-1 px-3.5 py-2 text-xs"
            />
            <button
              type="button"
              onClick={loadPlaylists}
              disabled={loading}
              className="liquid-btn-secondary px-3 py-2 text-xs"
              title="새로고침"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Playlists List */}
        <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <div className="mb-2 text-2xl animate-spin">⏳</div>
              플레이리스트 목록을 불러오는 중입니다…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              {search ? '검색 결과가 없습니다.' : '등록된 플레이리스트가 없습니다. 위에서 URL을 입력해보세요!'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filtered.map(p => {
                const cover = p.images?.[0]?.url;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectPlaylist(p.url, p.name);
                      onClose();
                    }}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-emerald-500/10 hover:border-emerald-400/50 transition-all text-left group cursor-pointer"
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt={p.name}
                        className="h-12 w-12 rounded-xl object-cover shrink-0 shadow-md group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-lg shrink-0 text-slate-400">
                        🎵
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 transition-colors truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {p.description || (p.tracks?.total ? `${p.tracks.total}곡 수록` : '공개 플레이리스트')}
                      </div>
                    </div>
                    <span className="text-slate-600 group-hover:text-emerald-400 text-xs shrink-0 font-bold">
                      선택 →
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
