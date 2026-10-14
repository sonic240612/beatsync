'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-12">
      <div className="liquid-glass-card w-full p-8 text-center">
        <p className="text-xs text-slate-400">메인 화면으로 이동 중입니다…</p>
      </div>
    </main>
  );
}
