import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.resolve(__dirname, '../out');
const SCREENSHOT_DIR = '/home/kaustubh/.gemini/antigravity/brain/542e92d3-7284-4d6b-8ff9-143904edbb5f/screenshots';
const PORT = 4198;
const BASE_PATH = '/forest-guard';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let reqUrl = (req.url || '/').split('?')[0];
  if (reqUrl.startsWith(BASE_PATH)) reqUrl = reqUrl.slice(BASE_PATH.length);
  if (!reqUrl || reqUrl === '/') reqUrl = '/index.html';
  let filePath = path.join(OUT_DIR, reqUrl);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) filePath += '.html';
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404 Not Found');
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(filePath).pipe(res);
});

class Cdp {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.reqId = 1;
    this.pending = new Map();
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((res, rej) => {
      this.ws.onopen = res;
      this.ws.onerror = rej;
    });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      }
    };
  }
  send(method, params = {}, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const id = this.reqId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (r) => { clearTimeout(timer); resolve(r); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function capture() {
  await new Promise((res) => server.listen(PORT, '127.0.0.1', res));
  console.log(`[Server] Serving on http://127.0.0.1:${PORT}${BASE_PATH}/`);

  const chrome = spawn('google-chrome-stable', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--disable-extensions',
    '--enable-webgl',
    '--remote-debugging-port=9315',
    '--window-size=1440,900',
    '--user-data-dir=/tmp/qa-all-routes',
    'about:blank',
  ]);

  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9315/json/list');
      if (res.ok) {
        const tabs = await res.json();
        const tab = tabs.find((t) => t.type === 'page');
        if (tab) {
          const cdp = new Cdp(tab.webSocketDebuggerUrl);
          await cdp.connect();
          await cdp.send('Page.enable');

          const routes = [
            { path: '/explore/', name: 'explore-desktop_1440.png', wait: 3500 },
            { path: '/investigations/', name: 'investigations-desktop_1440.png', wait: 2000 },
            { path: '/investigations/INC-MH-R07-C09-20261026-115/', name: 'dossier-desktop_1440.png', wait: 2000 },
            { path: '/status/', name: 'status-desktop_1440.png', wait: 2000 },
          ];

          for (const r of routes) {
            console.log(`Capturing Desktop: ${r.path}`);
            await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${BASE_PATH}${r.path}` });
            await new Promise((resolve) => setTimeout(resolve, r.wait));
            const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
            fs.writeFileSync(path.join(SCREENSHOT_DIR, r.name), Buffer.from(shot.data, 'base64'));
            console.log(`✓ Saved ${r.name}`);
          }

          // Mobile passes (375x667)
          await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: 375,
            height: 667,
            deviceScaleFactor: 2,
            mobile: true,
          });

          const mobileRoutes = [
            { path: '/explore/', name: 'explore-mobile_375.png', wait: 3500 },
            { path: '/investigations/', name: 'investigations-mobile_375.png', wait: 2000 },
            { path: '/investigations/INC-MH-R07-C09-20261026-115/', name: 'dossier-mobile_375.png', wait: 2000 },
            { path: '/status/', name: 'status-mobile_375.png', wait: 2000 },
          ];

          for (const r of mobileRoutes) {
            console.log(`Capturing Mobile: ${r.path}`);
            await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${BASE_PATH}${r.path}` });
            await new Promise((resolve) => setTimeout(resolve, r.wait));
            const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
            fs.writeFileSync(path.join(SCREENSHOT_DIR, r.name), Buffer.from(shot.data, 'base64'));
            console.log(`✓ Saved ${r.name}`);
          }

          chrome.kill('SIGKILL');
          server.close();
          console.log('\n[Done] All 8 representative route screenshots saved!');
          return;
        }
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  chrome.kill('SIGKILL');
  server.close();
  throw new Error('Failed to connect to Chrome');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
