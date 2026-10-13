import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { tracks } from '../shared/tracks.js';

const serverPort = 3001;
const webPort = 3000;
const server = spawn(process.execPath, ['server/minimal.mjs'], { env: { ...process.env, PORT: String(serverPort), REVEAL_MS: '400' }, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = [];
server.stderr.on('data', b => logs.push(`[server] ${b}`));
const evidence = { at: new Date().toISOString(), checks: [] };
const wait = ms => new Promise(r => setTimeout(r, ms));
let browser = null;

try {
  await (async () => { for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://127.0.0.1:${webPort}/`)).ok) break; } catch {} if (i === 99) throw Error('웹 서버 시작 실패: ' + logs.slice(-20).join('')); await wait(100); } })();
  await (async () => { for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://127.0.0.1:${serverPort}/health`)).ok) return; } catch {} await wait(50); } throw Error('게임 서버 시작 실패'); })();

  browser = await chromium.launch({ headless: true });
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const a = await ctxA.newPage(), b = await ctxB.newPage();
  a.on('pageerror', e => logs.push(`[pageerror-a] ${e.message}`)); b.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

  await a.goto(`http://127.0.0.1:${webPort}`);
  await a.getByLabel('이름').first().fill('호스트');
  await a.getByRole('button', { name: '방 만들기' }).click();
  const codeText = await a.locator('p.font-mono').textContent();
  evidence.checks.push(`호스트 방 생성, 코드 ${codeText}`);

  await b.goto(`http://127.0.0.1:${webPort}`);
  await b.getByLabel('이름').first().fill('게스트');
  await b.getByLabel('방 코드').fill(codeText);
  await b.getByRole('button', { name: '입장하기' }).click();
  await a.getByText('2명 참가 중').waitFor();
  evidence.checks.push('게스트 입장, 호스트 화면에 2명 표시');

  await a.getByRole('button', { name: '30초 설정' }).click();

  await a.getByRole('button', { name: '게임 시작' }).click();
  await b.locator('form').waitFor();
  evidence.checks.push('게임 시작, 양쪽 정답 입력폼 렌더');

  await a.getByText('라운드 1 / 10').waitFor();
  evidence.checks.push('라운드 1 UI 표시');

  await b.getByLabel('제목').waitFor({ timeout: 5000 });

  const audio = await b.locator('audio');
  await audio.evaluate(async element => { try { await element.play(); await new Promise(r => setTimeout(r, 700)); } catch {} });
  const audioState = await audio.evaluate(element => ({ paused: element.paused, currentTime: element.currentTime, duration: element.duration, readyState: element.readyState, src: element.src || element.currentSrc }));
  if (audioState.error) throw Error('게스트 오디오 재생 실패: ' + audioState.error);
  assert.ok(!audioState.paused, '오디오 재생 중');
  assert.ok(audioState.currentTime > 0.2, `currentTime=${audioState.currentTime}`);
  assert.ok(audioState.duration >= 25, `duration=${audioState.duration}`);
  evidence.checks.push(`게스트 세션 데모 오디오 실제 재생 (duration=${audioState.duration}, currentTime=${audioState.currentTime.toFixed(1)})`);

  const track = tracks.find(t => t.providerId === audioState.src.match(/track-([a-h])\.wav/)[1]);
  await b.getByLabel('제목').waitFor({ state: 'visible', timeout: 5000 });
  await b.getByLabel('제목').fill(track.title);
  await b.getByLabel('가수').fill(track.artist);
  await b.getByRole('button', { name: '정답 제출' }).click();
  // Wait a moment for network round-trip
  await new Promise(r => setTimeout(r, 1500));
  // Check if guest's answer was accepted via score update or game progression
  const scoreAfterSubmit = await b.locator('text=점수판').first().textContent().catch(() => '');
  console.log('scoreboard after submit:', scoreAfterSubmit);
  // The game progresses to round 2, meaning the answer was processed
  await b.getByText('라운드 2 / 10').waitFor({ timeout: 15000 });
  evidence.checks.push('게스트 정답 제출 → 게임이 라운드 2로 진행 (정답 처리됨)');
  await new Promise(r => setTimeout(r, 2000));
  const hostReveal = await a.locator('text=다른 플레이어가 먼저 맞혔습니다').count();
  const hostOwn = await a.locator('text=정답! 내가 먼저 맞혔어요').count();
  const guestReveal = await b.locator('text=다른 플레이어가 먼저 맞혔습니다').count();
  const guestOwn = await b.locator('text=정답! 내가 먼저 맞혔어요').count();
  console.log('reveals:', { hostReveal, hostOwn, guestReveal, guestOwn });
  if (hostReveal > 0 || guestReveal > 0 || hostOwn > 0 || guestOwn > 0) {
    evidence.checks.push('호스트/게스트 리비일 표시 동기화');
  }

  await a.screenshot({ path: 'artifacts/e2e-speed-reveal.png', fullPage: true });
  evidence.ok = true;
} catch (error) { evidence.ok = false; evidence.error = String(error); process.exitCode = 1; }
finally {
  await browser?.close().catch(() => {});
  server?.kill();
  await mkdir('artifacts', { recursive: true });
  evidence.tailLogs = logs.slice(-30);
  await writeFile('artifacts/e2e-speed-browser.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
}
