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
  type SpotifyPlaylistItem,
} from '@/lib/spotify';
import { useGame } from '@/lib/game';

interface SpotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlaylist?: (playlistUrl: string) => void;
}

export function SpotifyModal({ isOpen, onClose, onSelectPlaylist }: SpotifyModalProps) {
  const { addToast } = useGame();
  const [profile, setProfile] = useState<SpotifyProfile | null>(null);
  const [loadingOAuth, setLoadingOAuth] = useState(false);

  // Form State
  const [guestNickname, setGuestNickname] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['kpop', 'pop']);
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showManualClientId, setShowManualClientId] = useState(false);
  const [manualClientId, setManualClientId] = useState('');

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredProfile();
      setProfile(stored);
      if (stored) {
        setGuestNickname(stored.displayName);
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

  const handleSpotifyOAuthLogin = async () => {
    setLoadingOAuth(true);
    try {
      const res = await initiateSpotifyLogin(manualClientId.trim() || undefined);
      if (!res.ok) {
        addToast(res.error || 'Spotify 로그인 연결에 실패했습니다.', 'error');
        setLoadingOAuth(false);
      }
      // If ok, window.location.href redirects to Spotify authorize
    } catch {
      addToast('Spotify 로그인 창을 열 수 없습니다.', 'error');
      setLoadingOAuth(false);
    }
  };

  const handleGuestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guestNickname.trim();
    if (!trimmed) {
      addToast('닉네임을 입력해주세요.', 'warning');
      return;
    }
    const userProfile = simpleLogin(trimmed, selectedGenres);
    setProfile(userProfile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('beatsync-name', trimmed);
    }
    addToast(`환영합니다, ${userProfile.displayName}님! 프로필이 설정되었습니다.`, 'success');
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
    addToast('플레이리스트가 보관함에서 삭제되었습니다.', 'info');
  };

  const handleApplyPlaylistToGame = (playlist: SpotifyPlaylistItem) => {
    if (onSelectPlaylist) {
      onSelectPlaylist(playlist.url);
      addToast(`"${playlist.name}" 플레이리스트가 게임에 적용되었습니다!`, 'success');
      onClose();
    }
  };

  const handleLogout = () => {
    clearSpotifySession();
    setProfile(null);
    addToast('Spotify 연동이 해제되었습니다.', 'info');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="liquid-glass-card w-full max-w-lg p-5 sm:p-7 max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl border border-white/15">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xl font-bold shrink-0">
              <svg className="h-6 w-6 fill-current text-[#1ed760]" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.308c-.218.358-.684.472-1.042.254-2.855-1.745-6.449-2.14-10.683-1.173-.41.094-.82-.162-.914-.572-.094-.41.162-.82.572-.914 4.634-1.058 8.602-.61 11.813 1.363.358.218.472.684.254 1.042zm1.468-3.264c-.274.446-.86.589-1.306.315-3.268-2.008-8.25-2.592-12.116-1.418-.501.152-1.034-.134-1.186-.635-.152-.501.134-1.034.635-1.186 4.417-1.34 9.907-.687 13.658 1.618.446.274.589.86.315 1.306zm.126-3.41c-3.92-2.328-10.379-2.542-14.125-1.404-.6.183-1.238-.16-1.421-.76-.183-.6.16-1.238.76-1.421 4.305-1.307 11.434-1.055 15.946 1.623.539.32.716 1.018.396 1.557-.32.539-1.018.716-1.557.396z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Spotify 계정 연동</span>
                {profile?.isOAuth && (
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    공식 연동됨
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">내 보관함의 플레이리스트와 프로필을 BeatSync에서 원클릭으로 연동하세요</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        {profile ? (
          /* ==================================================== */
          /* LOGGED IN VIEW                                       */
          /* ==================================================== */
          <div className="space-y-5">
            {/* User Profile Card */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-sm">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="h-12 w-12 rounded-full object-cover border-2 border-emerald-400 shrink-0 shadow-md"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/30 border border-emerald-400/40 text-xl font-bold text-emerald-200 shrink-0">
                  {profile.displayName.slice(0, 1)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white truncate">{profile.displayName}</h3>
                  {profile.product && (
                    <span className="rounded-md bg-white/10 border border-white/20 px-1.5 py-0.5 text-[10px] font-mono uppercase text-slate-300">
                      {profile.product}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 truncate mt-0.5">
                  {profile.email ? profile.email : 'Spotify 계정이 성공적으로 연결되었습니다'}
                </p>
              </div>
            </div>

            {/* User Playlists (with 1-Click "Apply to Game" button) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>📂</span>
                  <span>내 Spotify 플레이리스트 ({profile.savedPlaylists?.length || 0})</span>
                </label>
                <span className="text-[11px] text-slate-400">클릭하여 게임 출제곡으로 적용</span>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {(profile.savedPlaylists || []).map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {p.images?.[0]?.url ? (
                        <img
                          src={p.images[0].url}
                          alt={p.name}
                          className="h-10 w-10 rounded-lg object-cover shrink-0 border border-white/15 shadow-sm"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-sm shrink-0">
                          🎵
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-[13px] font-bold text-white truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {p.tracks?.total ? `${p.tracks.total}곡` : '플레이리스트'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onSelectPlaylist && (
                        <button
                          type="button"
                          onClick={() => handleApplyPlaylistToGame(p)}
                          className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-2.5 py-1.5 text-[11px] transition-colors shadow-sm cursor-pointer"
                        >
                          출제 적용
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePlaylist(p.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="보관함에서 제거"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Playlist Link */}
              <form onSubmit={handleAddPlaylist} className="pt-1 flex gap-2">
                <input
                  value={newPlaylistName}
                  onChange={e => setNewPlaylistName(e.target.value)}
                  placeholder="플레이리스트 이름"
                  className="liquid-input w-1/3 px-3 py-2 text-xs"
                />
                <input
                  value={newPlaylistUrl}
                  onChange={e => setNewPlaylistUrl(e.target.value)}
                  placeholder="Spotify 플레이리스트 링크/ID"
                  className="liquid-input flex-1 px-3 py-2 text-xs"
                />
                <button type="submit" className="liquid-btn-secondary px-3.5 py-2 text-xs font-bold shrink-0">
                  추가
                </button>
              </form>
            </div>

            {/* Music Taste Selector */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <label className="block text-xs font-bold text-slate-200">
                🎧 즐겨 듣는 음악 장르 (랜덤 셔플 시 선호도 반영)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SPOTIFY_GENRE_OPTIONS.map(g => {
                  const active = selectedGenres.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGenre(g.id)}
                      className={`p-2 rounded-xl border text-left text-xs font-bold transition-all ${
                        active
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-sm'
                          : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="truncate">{g.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="liquid-btn-primary flex-1 py-3 text-xs sm:text-sm font-bold"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors"
              >
                연동 해제
              </button>
            </div>
          </div>
        ) : (
          /* ==================================================== */
          /* LOGGED OUT VIEW                                      */
          /* ==================================================== */
          <div className="space-y-5">
            {/* Primary Action: Official Spotify Direct Login */}
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent p-5 text-center space-y-3.5 shadow-lg">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-white">
                  내 Spotify 계정으로 직접 로그인
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                  공식 Spotify 계정으로 로그인하여 <strong>내 플레이리스트와 닉네임</strong>을 퀴즈에 바로 불러옵니다.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSpotifyOAuthLogin}
                disabled={loadingOAuth}
                className="w-full py-3.5 px-4 rounded-xl bg-[#1ed760] hover:bg-[#1db954] active:scale-[0.99] text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {loadingOAuth ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-slate-950" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Spotify 인증 창으로 이동 중…</span>
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.308c-.218.358-.684.472-1.042.254-2.855-1.745-6.449-2.14-10.683-1.173-.41.094-.82-.162-.914-.572-.094-.41.162-.82.572-.914 4.634-1.058 8.602-.61 11.813 1.363.358.218.472.684.254 1.042zm1.468-3.264c-.274.446-.86.589-1.306.315-3.268-2.008-8.25-2.592-12.116-1.418-.501.152-1.034-.134-1.186-.635-.152-.501.134-1.034.635-1.186 4.417-1.34 9.907-.687 13.658 1.618.446.274.589.86.315 1.306zm.126-3.41c-3.92-2.328-10.379-2.542-14.125-1.404-.6.183-1.238-.16-1.421-.76-.183-.6.16-1.238.76-1.421 4.305-1.307 11.434-1.055 15.946 1.623.539.32.716 1.018.396 1.557-.32.539-1.018.716-1.557.396z" />
                    </svg>
                    <span>Spotify 계정으로 로그인</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1">🔒 안전한 공식 OAuth</span>
                <span>•</span>
                <span className="flex items-center gap-1">🎵 내 플레이리스트 자동 연동</span>
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 absolute">
                또는 로그인 없이 게스트로 시작
              </span>
            </div>

            {/* Secondary Option: Guest Nickname */}
            <form onSubmit={handleGuestLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  👤 플레이어 닉네임
                </label>
                <div className="flex gap-2">
                  <input
                    value={guestNickname}
                    onChange={e => setGuestNickname(e.target.value)}
                    placeholder="예: 음악대장, 지민"
                    className="liquid-input flex-1 px-4 py-2.5 text-xs sm:text-sm font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={!guestNickname.trim()}
                    className="liquid-btn-secondary px-4 py-2.5 text-xs font-bold shrink-0 disabled:opacity-40"
                  >
                    게스트 시작
                  </button>
                </div>
              </div>

              {/* Developer Client ID Override (optional, subtle) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowManualClientId(prev => !prev)}
                  className="text-[11px] text-slate-500 hover:text-slate-400 transition-colors"
                >
                  {showManualClientId ? '▲ 개발자용 Client ID 직접 입력 닫기' : '▼ 다른 Client ID 직접 지정하기 (개발자용)'}
                </button>
                {showManualClientId && (
                  <div className="mt-2 p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <label className="block text-[11px] text-slate-400">Spotify Developer Client ID</label>
                    <input
                      value={manualClientId}
                      onChange={e => setManualClientId(e.target.value)}
                      placeholder="Client ID 입력 (기본값 환경변수 사용 시 비워두세요)"
                      className="liquid-input w-full px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
