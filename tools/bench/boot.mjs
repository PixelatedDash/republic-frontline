// Boot time: navigation -> sprites built and the "tap to begin" screen ready.
//   node tools/bench/boot.mjs [--throttle 4] [--runs 3]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const a = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((x) => x.trim().split(/\s+/)));
const throttle = Number(a.throttle || 1), runs = Number(a.runs || 3);
const port = 8990 + Math.floor(Math.random() * 9);
const server = spawn(process.execPath, ['tools/serve.mjs', String(port)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
try {
  const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const out = [];
  for (let i = 0; i < runs; i++) {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3 });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
    const t0 = Date.now();
    await page.goto(`http://localhost:${port}/`);
    await page.waitForFunction(() => globalThis.__rf?.screen?.ready, null, { timeout: 300000, polling: 50 });
    out.push(Date.now() - t0);
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify({ throttle: `${throttle}x`, bootMs: out, median: out.sort((x, y) => x - y)[Math.floor(out.length / 2)] }));
} finally { server.kill(); }
