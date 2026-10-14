import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  let body: { token?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: '잘못된 JSON 요청입니다.' }, { status: 400 });
  }

  const token = body?.token?.trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Spotify Access Token이 필요합니다.' }, { status: 400 });
  }

  try {
    // 1. Fetch current user profile
    const meRes = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const meStatus = meRes.status;
    let meData: any = null;
    try {
      meData = await meRes.json();
    } catch {}

    if (!meRes.ok) {
      console.warn('Spotify /v1/me failed with status:', meStatus, meData);
      return NextResponse.json(
        {
          ok: false,
          status: meStatus,
          error: meStatus === 403 ? 'FORBIDDEN_USERS_ACCESS' : 'PROFILE_FETCH_FAILED',
          message:
            meStatus === 403
              ? 'Spotify Developer Dashboard의 Users and Access에 계정이 등록되지 않았습니다.'
              : 'Spotify 프로필을 조회할 수 없습니다.',
          details: meData,
        },
        { status: 200 }
      );
    }

    // 2. Fetch current user's playlists
    let playlists: any[] = [];
    try {
      const plRes = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (plRes.ok) {
        const plData = await plRes.json();
        const items = Array.isArray(plData.items) ? plData.items.filter(Boolean) : [];
        playlists = items
          .map((p: any) => ({
            id: String(p.id || ''),
            name: String(p.name || 'Untitled Playlist'),
            description: String(p.description || ''),
            images: Array.isArray(p.images) ? p.images : [],
            tracks: { total: Number(p.tracks?.total || 0) },
            url: p.external_urls?.spotify || `https://open.spotify.com/playlist/${p.id}`,
          }))
          .filter((p: any) => p.id);
      } else {
        console.warn('Spotify /v1/me/playlists failed with status:', plRes.status);
      }
    } catch (e) {
      console.warn('Error fetching playlists in server API:', e);
    }

    // 3. Optional: Fetch Liked Songs count
    let likedTracksCount = 0;
    try {
      const tracksRes = await fetch('https://api.spotify.com/v1/me/tracks?limit=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tracksRes.ok) {
        const tracksData = await tracksRes.json();
        likedTracksCount = Number(tracksData.total || 0);
      }
    } catch {}

    const displayName =
      meData.display_name?.trim() ||
      (meData.email ? String(meData.email).split('@')[0] : '') ||
      meData.id ||
      'Spotify 사용자';

    const avatarUrl =
      Array.isArray(meData.images) && meData.images[0]?.url ? meData.images[0].url : '';

    return NextResponse.json({
      ok: true,
      profile: {
        id: meData.id || 'spotify-user',
        displayName,
        avatarUrl,
        images: Array.isArray(meData.images) ? meData.images : [],
        email: meData.email || '',
        product: meData.product || '',
        savedPlaylists: playlists,
        likedTracksCount,
        connectedAt: Date.now(),
        isOAuth: true,
      },
    });
  } catch (err: any) {
    console.error('Server error in /api/spotify/user-data:', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'SERVER_ERROR',
        message: err?.message || '스포티파이 사용자 정보를 가져오는데 실패했습니다.',
      },
      { status: 500 }
    );
  }
}
