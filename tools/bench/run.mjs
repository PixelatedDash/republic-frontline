// Performance benchmark (spec §19): headless Chromium via Playwright, the
// `?bench=1` scene (~250 droids, ~400 projectiles, ~1500 particles), 4x CPU
// throttling, 30 s of frame times -> p50 / p95 / p99 + dynamic quality.
//   node tools/bench/run.mjs [--throttle 4] [--seconds 30] [--width 844 --height 390 --dpr 3] [--level mustafar-2] [--gpu 1]
// Default = headless shell with software raster (SwiftShader), a harsh
// worst case; --gpu 1 = full Chromium on the host GPU (closer to a phone,
// whose canvas is GPU-accelerated).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const a = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((x) => x.trim().split(/\s+/)));
const throttle = Number(a.throttle || 4), seconds = Number(a.seconds || 30);
const width = Number(a.width || 844), height = Number(a.height || 390), dpr = Number(a.dpr || 3);
const level = a.level || 'mustafar-2';
const gpu = !!Number(a.gpu || 0);
const port = 8790 + Math.floor(Math.random() * 100);

const server = spawn(process.execPath, ['tools/serve.mjs', String(port)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const pct = (arr, p) => { const s = [...arr].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };
try {
  const browser = await chromium.launch(gpu ? { channel: 'chromium', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] } : {});
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const cdp = await page.context().newCDPSession(page);
  // boot (sprite generation) unthrottled, then throttle for the measurement
  await page.goto(`http://localhost:${port}/?bench=1&seconds=${seconds}&level=${level}`);
  await page.waitForFunction(() => globalThis.__bench, null, { timeout: 120000 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  const t0 = Date.now();
  await page.waitForFunction(() => globalThis.__bench?.done, null, { timeout: (seconds + 60) * 1000 * Math.max(1, throttle), polling: 1000 });
  const b = await page.evaluate(() => globalThis.__bench);
  await browser.close();
  const t = b.times;
  const avg = (k) => Math.round(b.counts.reduce((s, c) => s + c[k], 0) / Math.max(1, b.counts.length));
  const qChanges = b.quality.reduce((acc, q, i) => (i === 0 || q !== b.quality[i - 1] ? [...acc, `${q}@${Math.round(i * 30 / 60)}s`] : acc), []);
  const res = {
    viewport: `${width}x${height}@${dpr}`, throttle: `${throttle}x`, raster: gpu ? 'gpu' : 'software', level, frames: t.length, wallSeconds: Math.round((Date.now() - t0) / 1000),
    p50: +pct(t, 50).toFixed(1), p95: +pct(t, 95).toFixed(1), p99: +pct(t, 99).toFixed(1), fps: +(1000 / (t.reduce((x, y) => x + y, 0) / t.length)).toFixed(1),
    avgEnemies: avg('enemies'), avgProjectiles: avg('projectiles'), avgParticles: avg('particles'),
    quality: qChanges.join(' -> '), errors,
  };
  console.log(JSON.stringify(res, null, 2));
} finally {
  server.kill();
}
