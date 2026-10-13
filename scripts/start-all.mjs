import { spawn, exec } from 'node:child_process';
import { createServer } from 'node:net';

const wait = ms => new Promise(r => setTimeout(r, ms));
const isWin = process.platform === 'win32';

async function isPortFree(port) {
  return new Promise(resolve => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function waitForHttp(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 304) return true;
    } catch {}
    await wait(400);
  }
  return false;
}

console.log('\n======================================================');
console.log('       🎵 BeatSync (비트싱크) 원클릭 실행기 🎵');
console.log('      Spotify Free 지원 & 실시간 음악 퀴즈 게임');
console.log('======================================================\n');

// 1. Clean lingering processes on ports 3000 & 3001 if needed
const port3001Free = await isPortFree(3001);
const port3000Free = await isPortFree(3000);

if (!port3001Free || !port3000Free) {
  console.log('기존 실행 중인 포트(3000/3001) 프로세스를 정리합니다...');
  if (isWin) {
    await new Promise(resolve => {
      exec(
        'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3001,3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"',
        () => resolve()
      );
    });
    await wait(500);
  }
}

// 2. Start Backend
console.log('[1/2] 백엔드 서버(포트 3001) 시작 중...');
const backend = spawn(process.execPath, ['--watch', 'server/minimal.mjs'], {
  env: { ...process.env, PORT: '3001' },
  stdio: 'inherit',
});

backend.on('error', err => {
  console.error('백엔드 시작 오류:', err);
});

const backendReady = await waitForHttp('http://127.0.0.1:3001/health', 10000);
if (!backendReady) {
  console.error('❌ 백엔드 서버 시작에 실패했습니다.');
  try { backend.kill(); } catch {}
  process.exit(1);
}
console.log('  ✓ 백엔드 소켓 서버 준비 완료! (http://127.0.0.1:3001)');

// 3. Start Frontend
console.log('[2/2] 프론트엔드 웹 서버(포트 3000) 시작 중...');
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const frontend = spawn(npmCmd, ['--prefix', 'apps/web', 'run', 'dev', '--', '--hostname', '127.0.0.1', '--port', '3000'], {
  env: { ...process.env, NEXT_PUBLIC_GAME_URL: 'http://127.0.0.1:3001' },
  stdio: 'inherit',
  shell: isWin,
});

frontend.on('error', err => {
  console.error('프론트엔드 시작 오류:', err);
});

console.log('웹 페이지를 로딩하고 있습니다...');
const frontendReady = await waitForHttp('http://127.0.0.1:3000', 30000);

if (frontendReady) {
  console.log('  ✓ 프론트엔드 서버 준비 완료! (http://127.0.0.1:3000)');
  console.log('\n🚀 브라우저에서 BeatSync를 엽니다: http://127.0.0.1:3000\n');
  if (isWin) {
    exec('start http://127.0.0.1:3000');
  } else if (process.platform === 'darwin') {
    exec('open http://127.0.0.1:3000');
  } else {
    exec('xdg-open http://127.0.0.1:3000');
  }
} else {
  console.log('⚠️ 브라우저에서 수동으로 http://127.0.0.1:3000 에 접속해주세요.');
}

console.log('\n------------------------------------------------------');
console.log(' 게임을 종료하려면 이 창에서 Ctrl + C 를 누르세요.');
console.log('------------------------------------------------------\n');

function shutdown() {
  console.log('\n모든 서버를 종료하는 중...');
  try { backend.kill(); } catch {}
  try { frontend.kill(); } catch {}
  if (isWin) {
    exec('powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3001,3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"');
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
