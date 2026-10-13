'use client';

import { useState, useEffect } from 'react';
import {
  getStoredProfile,
  simpleLogin,
  clearSpotifySession,
  addSavedPlaylist,
  removeSavedPlaylist,
  updateProfileGenres,
  initiateSpotifyLogin,
  SPOTIFY_GENRE_OPTIONS,
  type SpotifyProfile,
} from '@/lib/spotify';
import { useGame } from '@/lib/game';

interface SpotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPlaylistPicker?: () => void;
}

export function SpotifyModal({ isOpen, onClose, onOpenPlaylistPicker }: SpotifyModalProps) {
  const { addToast } = useGame();
  const [profile, setProfile] = useState<SpotifyProfile | null>(null);

  // Form State
  const [nickname, setNickname] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['kpop', 'pop']);
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Advanced Developer OAuth
  const [advClientId, setAdvClientId] = useState('');

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredProfile();
      setProfile(stored);
      if (stored) {
        setNickname(stored.displayName);
        setSelectedGenres(stored.genres || ['kpop', 'pop']);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleGenre = (genreId: string) => {
    setSelectedGenres(prev => {
      const next = prev.includes(genreId) ? prev.filter(g => g !== genreId) : [...prev, genreId];
      if (profile) {
        const updated = updateProfileGenres(next);
        setProfile(updated);
      }
      return next;
    });
  };

  const handleSimpleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      addToast('닉네임 또는 Spotify 이름을 입력해주세요.', 'warning');
      return;
    }
    const userProfile = simpleLogin(trimmed, selectedGenres);
    setProfile(userProfile);
    addToast(`환영합니다, ${userProfile.displayName}님! Spotify 맞춤 연동이 완료되었습니다.`, 'success');
    onClose();
  };

  const handleAddPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistUrl.trim()) return;
    const updated = addSavedPlaylist({
      name: newPlaylistName.trim() || '내 플레이리스트',
      url: newPlaylistUrl.trim(),
    });
    setProfile(updated);
    setNewPlaylistUrl('');
    setNewPlaylistName('');
    addToast('플레이리스트가 보관함에 추가되었습니다!', 'success');
  };

  const handleRemovePlaylist = (id: string) => {
    const updated = removeSavedPlaylist(id);
    setProfile(updated);
    addToast('플레이리스트가 삭제되었습니다.', 'info');
  };

  const handleLogout = () => {
    clearSpotifySession();
    setProfile(null);
    addToast('Spotify 연동이 해제되었습니다.', 'info');
  };

  const handleAdvOAuth = async () => {
    if (!advClientId.trim()) {
      addToast('Client ID를 입력해주세요.', 'warning');
      return;
    }
    const res = await initiateSpotifyLogin(advClientId.trim());
    if (!res.ok) {
      addToast(res.error || '로그인 시작 실패', 'error');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="liquid-glass-card w-full max-w-lg p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-xl font-bold">
              🟢
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">Spotify 계정 연동</h2>
              <p className="text-xs text-slate-400">내 플레이리스트 보관 및 내 취향 맞춤 랜덤 셔플</p>
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

        {/* Content */}
        <div className="mt-5 space-y-5">
          {profile ? (
            /* Logged In View */
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/30 text-2xl font-bold text-emerald-300 shrink-0">
                  🎵
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100 truncate">{profile.displayName}</h3>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      연동됨
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    선호 장르 {profile.genres.length}개 선택됨 · 플레이리스트 {profile.savedPlaylists?.length || 0}개 등록
                  </p>
                </div>
              </div>

              {/* Music Taste Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  🎧 내 음악 취향 (랜덤 셔플 시 우선 출제)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SPOTIFY_GENRE_OPTIONS.map(g => {
                    const active = selectedGenres.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGenre(g.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                          active
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-sm'
                            : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="truncate">{g.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Saved Playlists */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300">
                    📂 내 보관함 플레이리스트 ({profile.savedPlaylists?.length || 0})
                  </label>
                  {onOpenPlaylistPicker && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenPlaylistPicker();
                      }}
                      className="text-xs text-emerald-400 hover:underline font-bold"
                    >
                      로비에서 선택하기 →
                    </button>
                  )}
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {(profile.savedPlaylists || []).map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                    >
                      <span className="font-bold text-slate-300 truncate mr-2">{p.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePlaylist(p.id)}
                        className="text-slate-500 hover:text-rose-400 text-xs shrink-0"
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new playlist */}
                <form onSubmit={handleAddPlaylist} className="mt-2.5 flex gap-2">
                  <input
                    value={newPlaylistName}
                    onChange={e => setNewPlaylistName(e.target.value)}
                    placeholder="이름 (예: 내 애청곡)"
                    className="liquid-input w-1/3 px-3 py-1.5 text-xs"
                  />
                  <input
                    value={newPlaylistUrl}
                    onChange={e => setNewPlaylistUrl(e.target.value)}
                    placeholder="Spotify 플레이리스트 URL 입력"
                    className="liquid-input flex-1 px-3 py-1.5 text-xs"
                  />
                  <button type="submit" className="liquid-btn-secondary px-3 py-1.5 text-xs font-bold">
                    추가
                  </button>
                </form>
              </div>

              {/* Bottom Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="liquid-btn-primary flex-1 py-2.5 text-xs font-bold"
                >
                  확인 완료
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors"
                >
                  연동 해제
                </button>
              </div>
            </div>
          ) : (
            /* Logged Out View - 100% No API Key / No Client ID */
            <form onSubmit={handleSimpleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Spotify 사용자 이름 또는 닉네임
                </label>
                <input
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="예: 홍길동, 지민, NewJeansLover"
                  className="liquid-input w-full px-4 py-2.5 text-xs sm:text-sm font-semibold"
                  autoFocus
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  게임 로비 및 음악 퀴즈에서 표시될 내 Spotify 프로필 이름입니다.
                </p>
              </div>

              {/* Favorite Music Genres */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  🎧 즐겨 듣는 음악 취향 (랜덤 셔플 시 우선 출제)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SPOTIFY_GENRE_OPTIONS.map(g => {
                    const active = selectedGenres.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGenre(g.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                          active
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-sm'
                            : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="truncate">{g.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-3.5 text-xs text-slate-300 space-y-1">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <span>✨</span>
                  <span>연동 시 즉시 활성화되는 기능:</span>
                </div>
                <p className="text-slate-400">
                  • <strong>완벽한 맞춤 랜덤 셔플</strong>: 선택한 취향 장르를 반영하여 매 라운드 선별 출제<br />
                  • <strong>내 플레이리스트 1-클릭 불러오기</strong>: 즐겨찾는 플레이리스트를 언제든 클릭 한 번으로 적용
                </p>
              </div>

              <button
                type="submit"
                disabled={!nickname.trim()}
                className="liquid-btn-primary w-full py-3.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <span>🟢</span>
                <span>Spotify 계정 연동하기</span>
              </button>

              {/* Collapsed Advanced Developer Options (Hidden from normal users) */}
              <details className="pt-2 border-t border-slate-800/80">
                <summary className="text-[11px] text-slate-500 hover:text-slate-400 cursor-pointer select-none">
                  ⚙️ 개발자용 공식 Spotify API OAuth 직접 연동 (선택 사항)
                </summary>
                <div className="mt-2.5 space-y-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                  <label className="block text-[11px] text-slate-400">Spotify Developer Client ID</label>
                  <div className="flex gap-2">
                    <input
                      value={advClientId}
                      onChange={e => setAdvClientId(e.target.value)}
                      placeholder="Spotify Client ID 입력"
                      className="liquid-input flex-1 px-3 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAdvOAuth}
                      className="liquid-btn-secondary px-3 py-1.5 text-xs font-bold"
                    >
                      OAuth 연결
                    </button>
                  </div>
                </div>
              </details>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
