'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleSpotifyCallback } from '@/lib/spotify';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Spotify 계정 인증 처리 중입니다…');
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      processedRef.current = true;
      setStatus('error');
      setMessage(`Spotify 인증이 취소되었거나 실패했습니다: ${error}`);
      return;
    }

    if (!code) {
      processedRef.current = true;
      setStatus('error');
      setMessage('인증 코드를 찾을 수 없습니다.');
      return;
    }

    processedRef.current = true;
    handleSpotifyCallback(code).then(res => {
      if (res.ok) {
        setStatus('success');
        setMessage(
          res.profile?.displayName
            ? `환영합니다, ${res.profile.displayName}님! Spotify 계정이 성공적으로 연동되었습니다.`
            : 'Spotify 계정이 성공적으로 연동되었습니다.'
        );
        setTimeout(() => {
          window.location.href = '/';
        }, 800);
      } else {
        setStatus('error');
        setMessage(res.error || 'Spotify 로그인 처리 중 문제가 발생했습니다.');
      }
    });
  }, [searchParams]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-12">
      <div className="liquid-glass-card w-full p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl animate-pulse">
              🎵
            </div>
            <h2 className="text-lg font-bold text-slate-100">Spotify 로그인 중…</h2>
            <p className="mt-2 text-xs text-slate-400">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl text-emerald-400">
              ✓
            </div>
            <h2 className="text-lg font-bold text-emerald-300">Spotify 연동 완료!</h2>
            <p className="mt-2 text-xs text-slate-300">{message}</p>
            <p className="mt-4 text-[11px] text-slate-500">잠시 후 게임 로비로 이동합니다…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-2xl text-rose-400">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-rose-300">Spotify 로그인 실패</h2>
            <p className="mt-2 text-xs text-rose-200/90 leading-relaxed">{message}</p>
            <button
              onClick={() => router.replace('/')}
              className="liquid-btn-secondary mt-6 w-full py-2.5 text-xs font-bold"
            >
              로비로 돌아가기
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-12">
        <div className="liquid-glass-card w-full p-8 text-center">
          <p className="text-xs text-slate-400">인증 처리 중…</p>
        </div>
      </main>
    }>
      <CallbackContent />
    </Suspense>
  );
}
