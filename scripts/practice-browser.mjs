import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
const evidence = { at: new Date().toISOString(), checks: [], errors: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', error => evidence.errors.push(error.message));
  await page.goto('http://127.0.0.1:3000');
  await page.getByRole('button', { name: '미리듣기 재생' }).click();
  await page.waitForFunction(() => { const a = document.querySelector('audio'); return a && !a.paused && a.currentTime > 0.5 && a.readyState >= 2; });
  evidence.checks.push({ playback: await page.locator('audio').evaluate(a => ({ currentTime: a.currentTime, duration: a.duration, paused: a.paused, readyState: a.readyState })) });
  await page.getByLabel('이 곡의 제목은?').fill('틀린 제목');
  await page.getByRole('button', { name: '정답 제출' }).click();
  await page.getByRole('status').filter({ hasText: '다시 들어보세요' }).waitFor();
  assert.equal(await page.locator('audio').evaluate(a => a.paused), false);
  evidence.checks.push('Incorrect answer rendered; playback continues');
  await page.getByLabel('이 곡의 제목은?').fill('새벽 고요');
  await page.getByRole('button', { name: '정답 제출' }).click();
  await page.getByRole('status').filter({ hasText: '정답입니다!' }).waitFor();
  await page.waitForFunction(() => document.querySelector('audio').paused);
  evidence.checks.push('Correct answer rendered; playback paused');
  await page.screenshot({ path: 'artifacts/practice-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/practice-mobile.png', fullPage: true });
  evidence.checks.push('390px mobile viewport: no horizontal overflow');
  assert.deepEqual(evidence.errors, []);
  evidence.ok = true;
} catch (error) { evidence.ok = false; evidence.error = String(error); process.exitCode = 1; }
finally { await browser.close(); await writeFile('artifacts/practice-browser.json', JSON.stringify(evidence, null, 2)); console.log(JSON.stringify(evidence, null, 2)); }
