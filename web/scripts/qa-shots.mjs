#!/usr/bin/env node
/**
 * Lead-owned visual QA harness.
 * Usage:
 *   node scripts/qa-shots.mjs --base http://127.0.0.1:3000 --out /tmp/shots \
 *     --paths /,/explore,/investigations,/status,/about --w 1440 --h 900 --wait 4500
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : fallback;
}

const BASE = arg('base', 'http://127.0.0.1:3000').replace(/\/$/, '');
const OUT = arg('out', '/tmp/forestguard-shots');
const PATHS = arg('paths', '/').split(',').map((p) => p.trim() || '/');
const WIDTH = parseInt(arg('w', '1440'), 10);
const HEIGHT = parseInt(arg('h', '900'), 10);
const WAIT = parseInt(arg('wait', '4500'), 10);
const FULL = arg('full', '1') !== '0';
const SCROLL = arg('scroll', '1') !== '0';
const EVAL_AFTER = arg('js', '');

fs.mkdirSync(OUT, { recursive: true });

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
  send(method, params = {}, timeoutMs = 60000) {
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
  evaluate(expression) {
    return this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      .then((r) => r.result?.value);
  }
}

async function launch(port) {
  const profile = `/tmp/qa-profile-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
  const chrome = spawn('google-chrome-stable', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--disable-extensions',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    `--remote-debugging-port=${port}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);

  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) {
        const tabs = await res.json();
        const tab = tabs.find((t) => t.type === 'page' && !t.url.startsWith('chrome-extension://'));
        if (tab) {
          const cdp = new Cdp(tab.webSocketDebuggerUrl);
          await cdp.connect();
          return { chrome, cdp };
        }
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  chrome.kill('SIGKILL');
  throw new Error('Chrome failed to start');
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const port = 9333 + Math.floor(Math.random() * 400);
  const { chrome, cdp } = await launch(port);
  const results = [];

  try {
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: WIDTH,
      height: HEIGHT,
      deviceScaleFactor: 1,
      mobile: WIDTH < 600,
    });

    for (const route of PATHS) {
      const url = `${BASE}${route}`;
      const slug = route === '/' ? 'home' : route.replace(/^\//, '').replace(/[\/\[\]]/g, '-').replace(/-+$/, '');
      const errors = [];

      await cdp.send('Page.navigate', { url });
      await wait(WAIT);

      if (EVAL_AFTER) {
        await cdp.evaluate(`(async () => { ${EVAL_AFTER} })()`).catch((e) => console.error('evalAfter failed', e.message));
        await wait(1800);
      }

      const consoleErrors = await cdp.evaluate(`(() => window.__qaErrors || [])()`).catch(() => []);
      if (Array.isArray(consoleErrors)) errors.push(...consoleErrors);

      if (SCROLL) {
        await cdp.evaluate(`(async () => {
          const step = Math.round(window.innerHeight * 0.8);
          const max = document.documentElement.scrollHeight;
          for (let y = 0; y <= max; y += step) {
            window.scrollTo(0, y);
            await new Promise(r => setTimeout(r, 120));
          }
          window.scrollTo(0, 0);
        })()`);
        await wait(900);
      }

      const diag = await cdp.evaluate(`(() => {
        const m = window._globeMap;
        const c = m && m.getCanvas();
        return {
          webgl2: !!document.createElement('canvas').getContext('webgl2'),
          hasMap: !!m,
          mapLoaded: m ? m.loaded() : null,
          styleLoaded: m ? m.isStyleLoaded() : null,
          zoom: m ? m.getZoom() : null,
          containerOpacity: m ? getComputedStyle(m.getContainer()).opacity : null,
          canvasParentOpacity: c ? getComputedStyle(c.parentElement).opacity : null,
          canvasSize: c ? [c.width, c.height] : null,
          sourcesLoaded: (() => { try { return Object.fromEntries(Object.keys(m.getStyle().sources).map(k => [k, m.getSource(k)?.loaded?.() ?? null])); } catch(e) { return String(e); } })(),
        };
      })()`).catch((e) => ({ error: String(e) }));

      const layout = await cdp.evaluate(`(() => ({
        title: document.title,
        height: document.documentElement.scrollHeight,
        width: document.documentElement.scrollWidth,
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
        h1: document.querySelector('h1') ? document.querySelector('h1').textContent.trim().slice(0, 140) : null,
        navLinks: document.querySelectorAll('header nav a').length,
        canvas: document.querySelectorAll('canvas').length,
      }))()`);

      const metrics = await cdp.send('Page.getLayoutMetrics');
      const fullHeight = Math.min(metrics.cssContentSize.height, 20000);

      const shotParams = { format: 'png' };
      if (FULL) {
        shotParams.clip = {
          x: 0,
          y: 0,
          width: WIDTH,
          height: fullHeight,
          scale: 1,
        };
        shotParams.captureBeyondViewport = true;
      }

      const shot = await cdp.send('Page.captureScreenshot', shotParams);
      const file = path.join(OUT, `${slug}-${WIDTH}x${HEIGHT}.png`);
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));

      results.push({ route, url, layout, diag, file, errors });
      console.log(`[shot] ${route} -> ${file} (h=${fullHeight}, overflowX=${layout.overflowX}, h1=${layout.h1})`);
    }
  } finally {
    chrome.kill('SIGKILL');
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(results, null, 2));
  console.log('\n' + JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
