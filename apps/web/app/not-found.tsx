import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="text-5xl">🔍</div>
      <h2 className="text-2xl font-black">페이지를 찾을 수 없습니다</h2>
      <p className="text-xs text-slate-400">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
      <Link href="/" className="liquid-btn-primary px-6 py-2.5 text-xs font-bold inline-block">
        메인 로비로 이동
      </Link>
    </div>
  );
}
