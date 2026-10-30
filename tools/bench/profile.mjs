// CPU profile of the bench scene: top self-time functions.
//   node tools/bench/profile.mjs [--throttle 4] [--seconds 6]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const a = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((x) => x.trim().split(/\s+/)));
const throttle = Number(a.throttle || 4), seconds = Number(a.seconds || 6);
const port = 8890 + Math.floor(Math.random() * 100);
const server = spawn(process.execPath, ['tools/serve.mjs', String(port)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
try {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3 });
  const cdp = await page.context().newCDPSession(page);
  await page.goto(`http://localhost:${port}/?bench=1&seconds=600`);
  await page.waitForFunction(() => globalThis.__bench?.t > 4, null, { timeout: 120000 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.start');
  await new Promise((r) => setTimeout(r, seconds * 1000));
  const { profile } = await cdp.send('Profiler.stop');
  await browser.close();
  const self = new Map();
  const dt = profile.timeDeltas;
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.samples.forEach((id, i) => {
    const n = byId.get(id);
    const f = n.callFrame;
    const key = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber + 1}`;
    self.set(key, (self.get(key) || 0) + (dt[i] || 0));
  });
  const total = [...self.values()].reduce((x, y) => x + y, 0);
  [...self.entries()].sort((x, y) => y[1] - x[1]).slice(0, 25).forEach(([k, v]) => console.log(`${(v / total * 100).toFixed(1).padStart(5)}%  ${k}`));
} finally { server.kill(); }
