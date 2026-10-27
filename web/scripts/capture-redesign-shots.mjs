import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.resolve(__dirname, '../out');
const SCREENSHOT_DIR = '/home/kaustubh/.gemini/antigravity/brain/542e92d3-7284-4d6b-8ff9-143904edbb5f/screenshots';
const PORT = 4192;
const BASE_PATH = '/forest-guard';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function createStaticServer() {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.geojson': 'application/geo+json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
  };

  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    if (reqUrl.startsWith(BASE_PATH)) reqUrl = reqUrl.slice(BASE_PATH.length);
    if (!reqUrl || reqUrl === '/') reqUrl = '/index.html';
    let filePath = path.join(OUT_DIR, reqUrl);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath) && !path.extname(filePath) && fs.existsSync(filePath + '.html')) filePath = filePath + '.html';
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end(); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

class CdpSession {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.reqId = 1; this.pending = new Map(); }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((r) => { this.ws.onopen = r; });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.reqId++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.text);
    return res.result ? res.result.value : undefined;
  }
}

async function capture() {
  const server = await createStaticServer();

  // 1. Desktop 1440x900 - Fresh Session (intro orbit)
  console.log('Capturing Desktop 1440x900 Fresh Session (intro)...');
  const chrome1 = spawn('google-chrome-stable', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--remote-debugging-port=9235',
    '--window-size=1440,900',
    `--user-data-dir=/tmp/test-fresh-${Date.now()}`,
    'about:blank'
  ]);
  await new Promise(r => setTimeout(r, 1200));
  const res1 = await fetch('http://127.0.0.1:9235/json/list');
  const tabs1 = await res1.json();
  const cdp1 = new CdpSession(tabs1.find(t => t.type === 'page').webSocketDebuggerUrl);
  await cdp1.connect();
  await cdp1.send('Page.enable');
  await cdp1.send('Runtime.enable');
  await cdp1.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${BASE_PATH}/` });

  // Wait 2.0s for initial orbit view
  await new Promise(r => setTimeout(r, 2000));
  const shotFresh = await cdp1.send('Page.captureScreenshot', { format: 'png' });
  const freshPath = path.join(SCREENSHOT_DIR, 'overview-desktop_1440_intro_globe.png');
  fs.writeFileSync(freshPath, Buffer.from(shotFresh.data, 'base64'));
  console.log('Saved', freshPath);

  // Wait for fly-in to complete (total 4.5s more)
  await new Promise(r => setTimeout(r, 4500));
  const shotFlown = await cdp1.send('Page.captureScreenshot', { format: 'png' });
  const flownPath = path.join(SCREENSHOT_DIR, 'overview-desktop_1440_maharashtra_flyin.png');
  fs.writeFileSync(flownPath, Buffer.from(shotFlown.data, 'base64'));
  // Also update standard overview-desktop_1440.png
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'overview-desktop_1440.png'), Buffer.from(shotFlown.data, 'base64'));
  console.log('Saved', flownPath);

  await cdp1.ws.close();
  chrome1.kill();

  // 2. Desktop 1440x900 - Returning Session (intro already seen)
  console.log('Capturing Desktop 1440x900 Returning Session...');
  const chrome2 = spawn('google-chrome-stable', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--remote-debugging-port=9236',
    '--window-size=1440,900',
    `--user-data-dir=/tmp/test-return-${Date.now()}`,
    'about:blank'
  ]);
  await new Promise(r => setTimeout(r, 1200));
  const res2 = await fetch('http://127.0.0.1:9236/json/list');
  const tabs2 = await res2.json();
  const cdp2 = new CdpSession(tabs2.find(t => t.type === 'page').webSocketDebuggerUrl);
  await cdp2.connect();
  await cdp2.send('Page.enable');
  await cdp2.send('Runtime.enable');
  // Set sessionStorage seen before navigation
  await cdp2.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${BASE_PATH}/` });
  await cdp2.evaluate('sessionStorage.setItem("forestguard_intro_seen", "true")');
  await cdp2.send('Page.reload');
  await new Promise(r => setTimeout(r, 3000));

  const shotReturn = await cdp2.send('Page.captureScreenshot', { format: 'png' });
  const returnPath = path.join(SCREENSHOT_DIR, 'overview-desktop_1440_returning_session.png');
  fs.writeFileSync(returnPath, Buffer.from(shotReturn.data, 'base64'));
  console.log('Saved', returnPath);

  await cdp2.ws.close();
  chrome2.kill();

  // 3. Mobile Viewport 375x667
  console.log('Capturing Mobile 375x667...');
  const chrome3 = spawn('google-chrome-stable', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--remote-debugging-port=9237',
    '--window-size=375,667',
    `--user-data-dir=/tmp/test-mob-${Date.now()}`,
    'about:blank'
  ]);
  await new Promise(r => setTimeout(r, 1200));
  const res3 = await fetch('http://127.0.0.1:9237/json/list');
  const tabs3 = await res3.json();
  const cdp3 = new CdpSession(tabs3.find(t => t.type === 'page').webSocketDebuggerUrl);
  await cdp3.connect();
  await cdp3.send('Page.enable');
  await cdp3.send('Runtime.enable');
  await cdp3.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 667, deviceScaleFactor: 2, mobile: true });
  await cdp3.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${BASE_PATH}/` });
  await new Promise(r => setTimeout(r, 3500));

  const shotMob = await cdp3.send('Page.captureScreenshot', { format: 'png' });
  const mobPath = path.join(SCREENSHOT_DIR, 'overview-mobile_375.png');
  fs.writeFileSync(mobPath, Buffer.from(shotMob.data, 'base64'));
  console.log('Saved', mobPath);

  await cdp3.ws.close();
  chrome3.kill();
  server.close();

  console.log('All verification screenshots captured successfully!');
}

capture().catch(console.error);
