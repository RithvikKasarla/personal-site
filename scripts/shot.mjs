// Screenshot the site in headless Chrome, scrolling so on-scroll reveals actually run.
//   node scripts/shot.mjs <url> <out-prefix> [--w 1440] [--h 900] [--mobile] [--scroll 0,900,1800] [--wait 2600]
//   node scripts/shot.mjs http://localhost:4321/ shots/hub --click "a[href='/work']" --at 300,2600
// Writes <out-prefix>-<n>.png, one per scroll position (or per --at time after --click).
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const [url, prefix, ...rest] = process.argv.slice(2);
if (!url || !prefix) {
  console.error('usage: node scripts/shot.mjs <url> <out-prefix> [--w] [--h] [--mobile] [--scroll] [--wait] [--click --at]');
  process.exit(1);
}
const flag = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? fallback : rest[i + 1];
};
const mobile = rest.includes('--mobile');
const width = Number(flag('w', mobile ? 390 : 1440));
const height = Number(flag('h', mobile ? 844 : 900));
const scrolls = flag('scroll', '0').split(',').map(Number);
const wait = Number(flag('wait', 2600));
const click = flag('click');
const at = flag('at', '300,2600').split(',').map(Number);

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const chrome = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  '--hide-scrollbars',
  `--window-size=${width},${height}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'shot-'))}`,
  'about:blank',
]);
const wsUrl = await new Promise((resolve, reject) => {
  chrome.stderr.on('data', (d) => {
    const m = String(d).match(/ws:\/\/\S+/);
    if (m) resolve(m[0]);
  });
  chrome.on('exit', () => reject(new Error('chrome exited')));
});

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
const listeners = [];
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else if (msg.method) listeners.forEach((l) => l(msg));
});
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
const once = (method) => new Promise((r) => listeners.push((m) => m.method === method && r(m)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const s = (method, params) => send(method, params, sessionId);
await s('Page.enable');
await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
if (mobile) await s('Emulation.setTouchEmulationEnabled', { enabled: true });

const errors = [];
listeners.push((m) => {
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description);
});
await s('Runtime.enable');

const loaded = once('Page.loadEventFired');
await s('Page.navigate', { url });
await loaded;
await sleep(wait);

mkdirSync(dirname(prefix), { recursive: true });
const snap = async (n) => {
  const { data } = await s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${prefix}-${n}.png`, Buffer.from(data, 'base64'));
};

if (click) {
  const t0 = Date.now();
  await s('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(click)}).click()` });
  for (const [n, ms] of at.entries()) {
    await sleep(Math.max(0, ms - (Date.now() - t0)));
    await snap(n);
  }
} else {
  for (const [n, y] of scrolls.entries()) {
    await s('Runtime.evaluate', { expression: `scrollTo(0, ${y})` });
    if (y) await sleep(1800);
    await snap(n);
  }
}

const { result } = await s('Runtime.evaluate', {
  expression: 'JSON.stringify({ path: location.pathname, scrollWidth: document.documentElement.scrollWidth, innerWidth })',
});
console.log(result.value, errors.length ? `errors: ${errors.join(' | ')}` : 'no errors');
ws.close();
chrome.kill();
process.exit(0);
