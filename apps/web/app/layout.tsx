import type { Metadata } from 'next';
import './globals.css';
import { GlassEffectProvider } from '@/components/glass-effect';
import { ToastContainer } from '@/components/toast-container';

export const metadata: Metadata = {
  title: 'BeatSync (비트싱크) · 실시간 음악 퀴즈 & 타임라인 파티 게임',
  description: 'Spotify 무료 계정 지원 실시간 음악 퀴즈 & 발매연도 타임라인 파티 게임',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </head>
      <body data-theme="liquid-glass" data-mode="dark" data-liquid-motion="full" className="antialiased" suppressHydrationWarning>
        <GlassEffectProvider />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('beatsync-theme-mode');
                  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var mode = (saved === 'light' || saved === 'dark') ? saved : (prefersDark ? 'dark' : 'light');
                  document.body.dataset.mode = mode;
                  document.body.dataset.theme = 'liquid-glass';
                  document.body.dataset.liquidMotion = 'full';
                } catch(e) {}
              })();
            `,
          }}
        />
        {/* Ambient Liquid Scene (Original gradient mesh + particles) */}
        <div className="liquid-scene" aria-hidden="true">
          <div className="liquid-scene-gradient" />
          <div className="liquid-particles">
            <div className="liquid-particle" style={{ left: '12%', width: '4px', height: '4px', animationDuration: '14s', animationDelay: '0s' }} />
            <div className="liquid-particle" style={{ left: '28%', width: '6px', height: '6px', animationDuration: '22s', animationDelay: '2s' }} />
            <div className="liquid-particle" style={{ left: '46%', width: '3px', height: '3px', animationDuration: '17s', animationDelay: '5s' }} />
            <div className="liquid-particle" style={{ left: '68%', width: '5px', height: '5px', animationDuration: '19s', animationDelay: '1s' }} />
            <div className="liquid-particle" style={{ left: '85%', width: '4px', height: '4px', animationDuration: '24s', animationDelay: '4s' }} />
          </div>
        </div>
        <div className="relative z-10">
          <ToastContainer />
          {children}
        </div>
      </body>
    </html>
  );
}
