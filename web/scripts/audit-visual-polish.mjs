import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.resolve(__dirname, '../out');
const SCREENSHOT_DIR = '/home/kaustubh/.gemini/antigravity/brain/542e92d3-7284-4d6b-8ff9-143904edbb5f/screenshots';
const PORT = 4190;
const BASE_PATH = '/forest-guard';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// 1. Static HTTP Server for Next.js out/ directory
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

    reqUrl = decodeURIComponent(reqUrl);
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

// 2. Minimal WebSocket CDP Client using Node 22 built-in WebSocket
class CdpSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.reqId = 1;
    this.pending = new Map();
    this.eventListeners = new Map();
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
      } else if (msg.method) {
        const listeners = this.eventListeners.get(msg.method) || [];
        listeners.forEach((fn) => fn(msg.params));
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

  on(method, cb) {
    if (!this.eventListeners.has(method)) {
      this.eventListeners.set(method, []);
    }
    this.eventListeners.get(method).push(cb);
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

// 3. Launch Chrome instance
async function launchChrome(port = 9248, flags = []) {
  const profileDir = `/tmp/test-fg-visual-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const defaultFlags = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--disable-extensions',
    `--remote-debugging-port=${port}`,
    '--disable-web-security',
    '--window-size=1280,800',
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
  ];

  const chromeProc = spawn('google-chrome-stable', [...defaultFlags, ...flags, 'about:blank']);

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) {
        const tabs = await res.json();
        const pageTab = tabs.find((t) => t.type === 'page' && !t.url.startsWith('chrome-extension://'));
        if (pageTab) {
          const cdp = new CdpSession(pageTab.webSocketDebuggerUrl);
          await cdp.connect();
          return { proc: chromeProc, cdp, profileDir };
        }
      }
    } catch (err) {
      if (i % 10 === 0) console.log(`[CDP connect attempt ${i}]`, err.message);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  chromeProc.kill('SIGKILL');
  throw new Error(`Failed to initialize Chrome CDP on port ${port}`);
}

async function runVisualAudit() {
  console.log('=== FOREST GUARD PHASE 7: VISUAL POLISH & RESPONSIVENESS AUDIT ===\n');
  const server = await createStaticServer();

  const VIEWPORTS = [
    { name: 'desktop_1440', width: 1440, height: 900, isMobile: false },
    { name: 'desktop_1280', width: 1280, height: 800, isMobile: false },
    { name: 'tablet_768', width: 768, height: 1024, isMobile: false },
    { name: 'mobile_375', width: 375, height: 667, isMobile: true },
  ];

  const PAGES = [
    {
      id: 'overview',
      name: 'Mission Overview & 3D Globe',
      path: '/',
      waitMs: 3000,
    },
    {
      id: 'explore',
      name: '1,479-Sector Satellite Map Explorer',
      path: '/explore/',
      waitMs: 3500,
    },
    {
      id: 'investigations',
      name: 'Candidate Investigations Feed',
      path: '/investigations/',
      waitMs: 2500,
    },
    {
      id: 'dossier',
      name: 'Investigation Dossier & Split Slider',
      path: '/investigations/INC-MH-R07-C09-20261026-115/',
      waitMs: 2500,
    },
    {
      id: 'status',
      name: 'Monitoring Status & Methodology',
      path: '/status/',
      waitMs: 2500,
    },
  ];

  const auditResults = {
    screenshots: [],
    overflowChecks: [],
    consoleErrors: [],
    passed: 0,
    failed: 0,
  };

  function record(name, pass, detail) {
    if (pass) {
      console.log(`  ✓ [PASS] ${name} ${detail ? `(${detail})` : ''}`);
      auditResults.passed++;
    } else {
      console.error(`  ✗ [FAIL] ${name} ${detail ? `(${detail})` : ''}`);
      auditResults.failed++;
    }
  }

  let chromeInstance = null;

  try {
    chromeInstance = await launchChrome(9248);
    const cdp = chromeInstance.cdp;

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    const consoleLogs = [];
    cdp.on('Runtime.consoleAPICalled', (p) => {
      const text = p.args.map((a) => a.value || '').join(' ');
      if (p.type === 'error' && text.trim()) {
        consoleLogs.push({ type: 'error', text });
      }
    });

    for (const vp of VIEWPORTS) {
      console.log(`\n--- Auditing Viewport: ${vp.name} (${vp.width}x${vp.height}${vp.isMobile ? ', mobile emulation' : ''}) ---`);

      // Set viewport device metrics
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.isMobile ? 2 : 1,
        mobile: vp.isMobile,
      });

      for (const page of PAGES) {
        const fullUrl = `http://127.0.0.1:${PORT}${BASE_PATH}${page.path}`;
        await cdp.send('Page.navigate', { url: fullUrl });

        // Wait for hydration & async components
        await new Promise((r) => setTimeout(r, page.waitMs));

        // 1. Verify zero horizontal overflow
        const overflow = await cdp.evaluate(`(() => {
          const docWidth = document.documentElement.scrollWidth;
          const winWidth = window.innerWidth;
          return {
            docWidth,
            winWidth,
            hasOverflow: docWidth > winWidth + 2,
            title: document.title,
          };
        })()`);

        record(
          `${page.name} [${vp.name}]: No Horizontal Scroll Overflow`,
          !overflow.hasOverflow,
          `${overflow.docWidth}px <= ${overflow.winWidth}px`
        );

        // 2. Capture screenshot
        const screenshotData = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          quality: 90,
          clip: {
            x: 0,
            y: 0,
            width: vp.width,
            height: vp.height,
            scale: 1,
          },
        });

        const filename = `${page.id}-${vp.name}.png`;
        const filepath = path.join(SCREENSHOT_DIR, filename);
        fs.writeFileSync(filepath, Buffer.from(screenshotData.data, 'base64'));
        auditResults.screenshots.push({ page: page.id, viewport: vp.name, filepath });
      }
    }

    // Check for critical console errors
    const criticalErrors = consoleLogs.filter(
      (log) => !log.text.includes('Failed to load resource') // Ignore 404s for favicon or analytics
    );
    record(
      'Clean Browser Execution: Zero Critical Console Script Errors',
      criticalErrors.length === 0,
      `Errors found: ${criticalErrors.length}`
    );

  } catch (err) {
    console.error('Visual audit execution error:', err);
    record('Visual audit completed without fatal errors', false, err.message);
  } finally {
    if (chromeInstance) {
      await chromeInstance.cdp.close();
      chromeInstance.proc.kill('SIGKILL');
      try {
        fs.rmSync(chromeInstance.profileDir, { recursive: true, force: true });
      } catch {}
    }
    server.close();
  }

  console.log('\n=== VISUAL AUDIT SUMMARY ===');
  console.log(`Passed: ${auditResults.passed} / ${auditResults.passed + auditResults.failed}`);
  console.log(`Failed: ${auditResults.failed} / ${auditResults.passed + auditResults.failed}`);
  console.log(`Screenshots Captured: ${auditResults.screenshots.length} in ${SCREENSHOT_DIR}`);

  if (auditResults.failed > 0) {
    process.exit(1);
  }
}

runVisualAudit();
