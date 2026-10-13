import { NextResponse } from 'next/server';
import { tracks } from '@/shared/tracks.js';

import { matches, getKoreanDisplay } from '@/lib/rules';

export async function POST(request: Request) {
  let body: { answer?: string; trackId?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '올바른 JSON 요청이 필요합니다.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || typeof body.answer !== 'string' || body.answer.length > 100) {
    return NextResponse.json({ error: '정답은 100자 이내로 입력해주세요.' }, { status: 400 });
  }

  const guess = body.answer.trim();
  const trackId = body.trackId;
  const track = tracks.find(t => t.id === trackId) || tracks[0];

  if (!track) {
    return NextResponse.json({ error: '곡을 찾을 수 없습니다.' }, { status: 404 });
  }

  const isTitleMatch = matches(guess, track.title, track.aliases?.title, { isArtist: false });
  const isArtistMatch = matches(guess, track.artist, track.aliases?.artist, { isArtist: true });

  const correct = isTitleMatch || isArtistMatch;
  const displayTitle = getKoreanDisplay(track.title, track.aliases?.title);
  const displayArtist = getKoreanDisplay(track.artist, track.aliases?.artist);

  return NextResponse.json({
    correct,
    message: correct
      ? `🎉 정답입니다! [${displayTitle}] - ${displayArtist} (${track.year}년)`
      : '아직 정답이 아닙니다. 곡을 다시 듣고 제목 또는 가수를 맞춰보세요!',
    track: correct ? track : null,
  });
}
