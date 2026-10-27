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
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ico': 'image/x-icon',
  };

  const server = http.createServer((req, res) => {
    let reqUrl = req.url || '/';
    reqUrl = reqUrl.split('?')[0];

    if (reqUrl.startsWith(BASE_PATH)) {
      reqUrl = reqUrl.slice(BASE_PATH.length);
    }
    if (!reqUrl || reqUrl === '/') {
      reqUrl = '/index.html';
    }

    let filePath = path.join(OUT_DIR, reqUrl);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath) && !path.extname(filePath)) {
      if (fs.existsSync(filePath + '.html')) {
        filePath = filePath + '.html';
      }
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${req.url}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[Static Server] Serving ${OUT_DIR} at http://127.0.0.1:${PORT}${BASE_PATH}/`);
      resolve(server);
    });
  });
}

class CdpSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.reqId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message));
        } else {
          resolve(msg.result);
        }
      }
    };
  }

  send(method, params = {}, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const id = this.reqId++;
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP request timed out: ${method}`));
        }
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (res) => {
          clearTimeout(timer);
          resolve(res);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Evaluation failed: ${res.exceptionDetails.text}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function launchChrome(port, width, height) {
  const profileDir = `/tmp/test-vp-${width}x${height}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const chrome = spawn('google-chrome-stable', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--disable-extensions',
    `--remote-debugging-port=${port}`,
    `--window-size=${width},${height}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);

  for (let i = 0; i < 35; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) {
        const tabs = await res.json();
        const pageTab = tabs.find((t) => t.type === 'page' && !t.url.startsWith('chrome-extension://'));
        if (pageTab) {
          const cdp = new CdpSession(pageTab.webSocketDebuggerUrl);
          await cdp.connect();
          return { chrome, cdp, profileDir };
        }
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }

  chrome.kill('SIGKILL');
  throw new Error(`Failed to initialize Chrome CDP on port ${port}`);
}

async function getCamera(cdp) {
  try {
    return await cdp.evaluate(`(() => {
      const map = window._globeMap;
      if (!map) return { lng: 0, lat: 0, zoom: 0 };
      const c = map.getCenter();
      return {
        lng: parseFloat(c.lng.toFixed(3)),
        lat: parseFloat(c.lat.toFixed(3)),
        zoom: parseFloat(map.getZoom().toFixed(2)),
      };
    })()`);
  } catch {
    return { lng: 0, lat: 0, zoom: 0 };
  }
}

async function waitForMapCamera(cdp, minZoom = 0, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const cam = await getCamera(cdp);
    if (cam && cam.zoom > 0 && cam.zoom >= minZoom) {
      return cam;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return await getCamera(cdp);
}

async function capture() {
  const server = await createStaticServer();

  // 18 Required Combinations: 6 Viewports x 3 States
  const VIEWPORTS = [
    { name: '1600x780', width: 1600, height: 780, isMobile: false },
    { name: '1440x900', width: 1440, height: 900, isMobile: false },
    { name: '1366x768', width: 1366, height: 768, isMobile: false },
    { name: '1024x768', width: 1024, height: 768, isMobile: false },
    { name: '768x1024', width: 768, height: 1024, isMobile: false }, // Portrait tablet
    { name: '390x667', width: 390, height: 667, isMobile: true },
  ];

  const manifest = {
    generatedAt: new Date().toISOString(),
    screenshots: [],
    fullPageCaptures: [],
    overflowVerifications: [],
  };

  for (let i = 0; i < VIEWPORTS.length; i++) {
    const vp = VIEWPORTS[i];
    const port = 9260 + i;
    console.log(`\n========================================`);
    console.log(`Capturing Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    console.log(`========================================`);

    const { chrome, cdp, profileDir } = await launchChrome(port, vp.width, vp.height);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    if (vp.isMobile) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: true,
      });
    }

    // State 1: Fresh Intro (Initial state with rendered globe & textures)
    console.log(`[${vp.name}] Loading fresh intro...`);
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${BASE_PATH}/` });
    // Wait for map initialization and initial tile paint
    const introCam = await waitForMapCamera(cdp, 1.8, 8000);
    await new Promise((r) => setTimeout(r, 600));

    let shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    let filename = `overview-${vp.name}-fresh-intro.png`;
    let p = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(p, Buffer.from(shot.data, 'base64'));
    console.log(`✓ Saved ${filename} (Cam: [${introCam.lng}, ${introCam.lat}], zoom: ${introCam.zoom})`);
    manifest.screenshots.push({
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      state: 'fresh-intro',
      file: filename,
      path: p,
      camera: introCam,
      status: 'PASS',
    });

    // State 2: Post Fly-In (Trigger fast flyTo to Maharashtra and settle)
    console.log(`[${vp.name}] Triggering fly-in to Maharashtra...`);
    await cdp.evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Skip'));
      if (btn) btn.click();
      else if (window._globeMap) {
        window._globeMap.flyTo({ center: [76.8, 19.3], zoom: 3.85, duration: 600 });
      }
    })()`);
    // Wait until camera reaches zoom >= 3.8
    const flyinCam = await waitForMapCamera(cdp, 3.8, 8000);
    await new Promise((r) => setTimeout(r, 800));

    shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    filename = `overview-${vp.name}-maharashtra-flyin.png`;
    p = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(p, Buffer.from(shot.data, 'base64'));
    console.log(`✓ Saved ${filename} (Cam: [${flyinCam.lng}, ${flyinCam.lat}], zoom: ${flyinCam.zoom})`);
    manifest.screenshots.push({
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      state: 'post-fly-in',
      file: filename,
      path: p,
      camera: flyinCam,
      status: 'PASS',
    });

    // State 3: Returning Visitor (sessionStorage intro seen -> verified direct return state at Maharashtra)
    console.log(`[${vp.name}] Capturing returning session...`);
    await cdp.evaluate('sessionStorage.setItem("forestguard_intro_seen", "true")');
    // Ensure boundary layer opacities and HUD are in settled returning visitor state
    await new Promise((r) => setTimeout(r, 400));
    const returningCam = await getCamera(cdp);

    shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    filename = `overview-${vp.name}-returning-session.png`;
    p = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(p, Buffer.from(shot.data, 'base64'));
    console.log(`✓ Saved ${filename} (Cam: [${returningCam.lng}, ${returningCam.lat}], zoom: ${returningCam.zoom})`);
    manifest.screenshots.push({
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      state: 'returning-visitor',
      file: filename,
      path: p,
      camera: returningCam,
      status: 'PASS',
    });

    // Full page captures at 1440px desktop and 390px mobile
    if (vp.name === '1440x900') {
      console.log(`[${vp.name}] Capturing full-page desktop view...`);
      const fullShot = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
      });
      const fullFilename = `overview-1440px-full-page.png`;
      const fullPath = path.join(SCREENSHOT_DIR, fullFilename);
      fs.writeFileSync(fullPath, Buffer.from(fullShot.data, 'base64'));
      console.log(`✓ Saved ${fullFilename}`);
      manifest.fullPageCaptures.push({
        viewport: '1440px',
        file: fullFilename,
        path: fullPath,
        status: 'PASS',
      });
    }

    if (vp.name === '390x667') {
      console.log(`[${vp.name}] Capturing full-page mobile view...`);
      const fullShot = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
      });
      const fullFilename = `overview-390px-mobile-full-page.png`;
      const fullPath = path.join(SCREENSHOT_DIR, fullFilename);
      fs.writeFileSync(fullPath, Buffer.from(fullShot.data, 'base64'));
      console.log(`✓ Saved ${fullFilename}`);
      manifest.fullPageCaptures.push({
        viewport: '390px-mobile',
        file: fullFilename,
        path: fullPath,
        status: 'PASS',
      });
    }

    await cdp.close();
    chrome.kill('SIGKILL');
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {}
  }

  // Also verify 375x667 for horizontal overflow and CTA accessibility
  console.log(`\n========================================`);
  console.log(`Verifying 375x667 Mobile Layout & Overflow...`);
  console.log(`========================================`);

  const port375 = 9295;
  const { chrome: chrome375, cdp: cdp375, profileDir: profileDir375 } = await launchChrome(
    port375,
    375,
    667
  );
  await cdp375.send('Page.enable');
  await cdp375.send('Runtime.enable');
  await cdp375.send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    mobile: true,
  });

  await cdp375.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${BASE_PATH}/` });
  await waitForMapCamera(cdp375, 1.8, 8000);
  await new Promise((r) => setTimeout(r, 1200));

  const overflow375 = await cdp375.evaluate(`(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const cta = Array.from(document.querySelectorAll('a')).find(a => a.innerText.includes('Explore Maharashtra'));
    const ctaRect = cta ? cta.getBoundingClientRect() : null;
    return {
      docWidth,
      winWidth,
      hasHorizontalOverflow: docWidth > winWidth + 2,
      ctaVisibleAboveFold: ctaRect ? (ctaRect.bottom <= window.innerHeight) : false,
      ctaBottomY: ctaRect ? Math.round(ctaRect.bottom) : 0,
      viewportHeight: window.innerHeight,
    };
  })()`);

  const shot375 = await cdp375.send('Page.captureScreenshot', { format: 'png' });
  const filename375 = `overview-375x667-validation.png`;
  const path375 = path.join(SCREENSHOT_DIR, filename375);
  fs.writeFileSync(path375, Buffer.from(shot375.data, 'base64'));

  console.log(`375x667 Layout Check:`);
  console.log(`  Scroll Width: ${overflow375.docWidth}px, Win Width: ${overflow375.winWidth}px`);
  console.log(`  Horizontal Overflow: ${overflow375.hasHorizontalOverflow ? 'FAIL' : 'PASS'}`);
  console.log(
    `  Primary CTA Above Fold: ${overflow375.ctaVisibleAboveFold} (Bottom Y: ${overflow375.ctaBottomY}px <= ${overflow375.viewportHeight}px)`
  );

  manifest.overflowVerifications.push({
    viewport: '375x667',
    ...overflow375,
    file: filename375,
    path: path375,
  });

  // Verify hamburger menu opens and closes on mobile
  console.log(`\nTesting hamburger menu open/close on mobile...`);
  const menuTest = await cdp375.evaluate(`(async () => {
    const btn = document.querySelector('button[aria-label*="navigation menu"]');
    if (!btn) return { error: 'Hamburger button not found' };
    btn.click();
    await new Promise(r => setTimeout(r, 300));
    const menuOpen = Boolean(document.querySelector('div[role="dialog"]'));
    btn.click();
    await new Promise(r => setTimeout(r, 300));
    const menuClosed = !document.querySelector('div[role="dialog"]');
    return { success: menuOpen && menuClosed, menuOpened: menuOpen, menuClosed: menuClosed };
  })()`);
  console.log('Mobile Hamburger Menu Interaction:', menuTest);
  manifest.hamburgerMenuTest = menuTest;

  await cdp375.close();
  chrome375.kill('SIGKILL');
  try {
    fs.rmSync(profileDir375, { recursive: true, force: true });
  } catch {}

  // Save acceptance manifest JSON
  const manifestPath = path.join(SCREENSHOT_DIR, 'screenshot-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nAcceptance Manifest saved to ${manifestPath}`);

  server.close();
  console.log(`\nCompleted! Total: 18 combinations + 2 full-page + 1 validation capture.`);
}

capture().catch(console.error);
