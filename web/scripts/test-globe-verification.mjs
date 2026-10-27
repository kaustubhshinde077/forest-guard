import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.resolve(__dirname, '../out');
const PORT = 4178;
const BASE_PATH = '/forest-guard';

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

    // Strip BASE_PATH prefix
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

// 2. CDP Client Wrapper
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

  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
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
async function launchChrome(port = 9227, flags = []) {
  const profileDir = `/tmp/test-fg-chrome-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const defaultFlags = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    `--remote-debugging-port=${port}`,
    '--disable-web-security',
    '--window-size=1280,800',
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ];

  const chromeProc = spawn('google-chrome-stable', [...defaultFlags, ...flags]);

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
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }

  chromeProc.kill('SIGKILL');
  throw new Error(`Failed to initialize Chrome CDP on port ${port}`);
}

// 4. Main Verification Suite
async function runVerification() {
  console.log('=== FOREST GUARD PHASE 3: LIVE BROWSER VERIFICATION SUITE ===\n');

  const server = await createStaticServer();
  const results = {
    checks: [],
    passed: 0,
    failed: 0,
  };

  const assert = (name, condition, details = '') => {
    if (condition) {
      console.log(`  ✓ [PASS] ${name} ${details ? '(' + details + ')' : ''}`);
      results.checks.push({ name, status: 'PASS', details });
      results.passed++;
    } else {
      console.error(`  ✗ [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
      results.checks.push({ name, status: 'FAIL', details });
      results.failed++;
    }
  };

  try {
    // -------------------------------------------------------------
    // SCENARIO 1: Standard Desktop Run (1280x800, WebGL Active)
    // -------------------------------------------------------------
    console.log('\n--- Scenario 1: Standard Desktop Run (1280x800, WebGL Active) ---');
    const s1 = await launchChrome(9228, ['--enable-webgl', '--use-gl=angle']);
    const cdp1 = s1.cdp;

    await cdp1.send('Page.enable');
    await cdp1.send('Runtime.enable');
    await cdp1.send('Network.enable');

    const networkRequests = [];
    const consoleLogs = [];

    cdp1.on('Network.requestWillBeSent', (p) => {
      networkRequests.push(p.request.url);
    });

    cdp1.on('Runtime.consoleAPICalled', (p) => {
      const text = p.args.map((a) => a.value || '').join(' ');
      consoleLogs.push({ type: p.type, text });
    });

    console.log(`Navigating to http://127.0.0.1:${PORT}${BASE_PATH}/ ...`);
    await cdp1.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${BASE_PATH}/` });

    // Wait for hydration, map loading & async network requests
    for (let i = 0; i < 40; i++) {
      const hasGibs = networkRequests.some((url) => url.includes('gibs.earthdata.nasa.gov'));
      const hasBoundary = networkRequests.some((url) => url.includes('maharashtra_boundary.geojson'));
      if (hasGibs && hasBoundary) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    // 1. Texture & Data Loading Verification
    const requestedGibs = networkRequests.some((url) => url.includes('gibs.earthdata.nasa.gov'));
    const requestedBoundary = networkRequests.some((url) => url.includes('maharashtra_boundary.geojson'));
    const requestedState = networkRequests.some((url) => url.includes('monitoring_state.json'));
    const requestedIncidents = networkRequests.some((url) => url.includes('incidents.json'));

    assert('Authoritative Boundary GeoJSON Loaded', requestedBoundary, 'maharashtra_boundary.geojson');
    assert('Monitoring State JSON Loaded', requestedState, 'monitoring_state.json');
    assert('Live Incidents JSON Loaded', requestedIncidents, 'incidents.json');
    assert('NASA GIBS Tile Endpoint Configured & Requested', requestedGibs, 'gibs.earthdata.nasa.gov');

    // 2. Canvas & MapLibre Elements
    const mapElements = await cdp1.evaluate(`
      (() => {
        const mapCanvas = document.querySelector('.maplibregl-canvas');
        const starCanvas = document.querySelector('canvas:not(.maplibregl-canvas)');
        return {
          hasMapCanvas: !!mapCanvas,
          mapWidth: mapCanvas ? mapCanvas.width : 0,
          mapHeight: mapCanvas ? mapCanvas.height : 0,
          hasStarCanvas: !!starCanvas,
          starWidth: starCanvas ? starCanvas.width : 0,
          starHeight: starCanvas ? starCanvas.height : 0,
        };
      })()
    `);

    assert('MapLibre WebGL Canvas Rendered', mapElements.hasMapCanvas, `${mapElements.mapWidth}x${mapElements.mapHeight}px`);
    assert('Starfield Canvas Rendered', mapElements.hasStarCanvas, `${mapElements.starWidth}x${mapElements.starHeight}px`);

    // 3. Accurate NASA GIBS Metadata Verification (August 2004)
    const hudText = await cdp1.evaluate('document.body.innerText');
    const hasGibsHeader = hudText.includes('NASA GIBS BLUE MARBLE (AUG 2004 BACKGROUND)');
    const hasGibsAttribution = hudText.includes('NASA GIBS Blue Marble (August 2004, Shaded Relief and Bathymetry, Public Domain)');
    const hasSurveyOfIndia = hudText.includes('Survey of India / Census 2011 (OGD India)');
    const hasNoLiveImageryClaim = !hudText.toLowerCase().includes('live true-colour satellite');

    assert('HUD Header: NASA GIBS Blue Marble (Aug 2004 Background)', hasGibsHeader);
    assert('HUD Attribution: August 2004 Shaded Relief & Bathymetry', hasGibsAttribution);
    assert('HUD Attribution: Survey of India / Census 2011', hasSurveyOfIndia);
    assert('No False "Live True-Colour" Claim', hasNoLiveImageryClaim);

    // 4. Live Telemetry Verification from Real Data
    const hasGridMatrix = hudText.includes('1,479');
    const hasPilotEvaluated = hudText.includes('5 sectors') || hudText.includes('5\n sectors') || hudText.includes('4 processed + 1 occluded');
    const hasLandMonitored = hudText.includes('390.9') || hudText.includes('390.86');
    const hasCandidates = hudText.includes('20') && hudText.includes('Unconfirmed change alerts');

    assert('Telemetry: 1,479 Total Grid Matrix', hasGridMatrix);
    assert('Telemetry: 5 Pilot Evaluated (4 processed + 1 occluded)', hasPilotEvaluated);
    assert('Telemetry: 390.9 km² Terrestrial Land Monitored', hasLandMonitored);
    assert('Telemetry: 20 Unconfirmed Candidates with Alert Caveat', hasCandidates);

    // 5. User Agency: Skip Intro Test
    console.log('\nTesting "Skip Intro" button interaction...');
    const skipBtnPresent = await cdp1.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Skip Intro'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    assert('"Skip Intro" Button Present & Clicked', skipBtnPresent);

    await new Promise((r) => setTimeout(r, 600));

    const postSkip = await cdp1.evaluate(`
      (() => {
        const replayBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Replay Intro'));
        const sessionSeen = sessionStorage.getItem('forestguard_intro_seen');
        return {
          hasReplayBtn: !!replayBtn,
          sessionSeen: sessionSeen === 'true',
        };
      })()
    `);
    assert('Session Storage (forestguard_intro_seen) Set to true', postSkip.sessionSeen);
    assert('"Replay Intro" Button Appears Post-Skip', postSkip.hasReplayBtn);

    // 6. User Agency: Replay Intro Test
    console.log('Testing "Replay Intro" button interaction...');
    const replayClicked = await cdp1.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Replay Intro'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    assert('"Replay Intro" Button Clicked', replayClicked);

    await new Promise((r) => setTimeout(r, 1000));
    const isPlayingAgain = await cdp1.evaluate(`
      (() => {
        const skipBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Skip Intro'));
        return !!skipBtn;
      })()
    `);
    assert('Intro Replay Restarted ("Skip Intro" Active Again)', isPlayingAgain);

    // Re-skip to continue
    await cdp1.evaluate(`
      (() => {
        const skipBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Skip Intro'));
        if (skipBtn) skipBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));

    // 7. Navigation Test: "Explore Maharashtra" CTA
    console.log('Testing "Explore Maharashtra" navigation...');
    const exploreNav = await cdp1.evaluate(`
      (() => {
        const cta = Array.from(document.querySelectorAll('a')).find(a => a.innerText.includes('Explore Maharashtra'));
        if (!cta) return { found: false };
        const href = cta.getAttribute('href');
        cta.click();
        return { found: true, href };
      })()
    `);
    assert('"Explore Maharashtra" CTA Link Found', exploreNav.found, `href=${exploreNav.href}`);

    await new Promise((r) => setTimeout(r, 1200));
    const navUrl = await cdp1.evaluate('window.location.pathname');
    assert('Navigated Successfully to /forest-guard/explore/', navUrl.includes('/explore'), `path=${navUrl}`);

    await cdp1.close();
    s1.proc.kill('SIGTERM');

    // -------------------------------------------------------------
    // SCENARIO 2: WebGL Unavailable / Fallback Mode
    // -------------------------------------------------------------
    console.log('\n--- Scenario 2: WebGL Disabled / Hardware Failure Fallback ---');
    const s2 = await launchChrome(9229, ['--disable-webgl']);
    const cdp2 = s2.cdp;

    await cdp2.send('Page.enable');
    await cdp2.send('Runtime.enable');

    await cdp2.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${BASE_PATH}/` });
    await new Promise((r) => setTimeout(r, 2500));

    const fallbackCheck = await cdp2.evaluate(`
      (() => {
        const text = document.body.innerText;
        const svgPath = document.querySelector('svg path');
        const hasSvgD = svgPath ? svgPath.getAttribute('d')?.startsWith('M') : false;
        return {
          hasFallbackBanner: text.includes('WebGL Fallback Mode Active'),
          hasBoundarySvg: !!hasSvgD,
          hasAccessibleLink: text.includes('Launch Accessible') || text.includes('Accessible 1,479-Sector Table'),
        };
      })()
    `);

    assert('WebGL Fallback Mode Active Banner Rendered', fallbackCheck.hasFallbackBanner);
    assert('Authoritative Boundary SVG Path Rendered', fallbackCheck.hasBoundarySvg);
    assert('Accessible 1,479-Sector Table Navigation Visible', fallbackCheck.hasAccessibleLink);

    await cdp2.close();
    s2.proc.kill('SIGTERM');

    // -------------------------------------------------------------
    // SCENARIO 3: Mobile Viewport (375x667)
    // -------------------------------------------------------------
    console.log('\n--- Scenario 3: Mobile Viewport (375x667) ---');
    const s3 = await launchChrome(9230, ['--enable-webgl', '--window-size=375,667']);
    const cdp3 = s3.cdp;

    await cdp3.send('Page.enable');
    await cdp3.send('Runtime.enable');
    await cdp3.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true,
    });

    await cdp3.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${BASE_PATH}/` });
    await new Promise((r) => setTimeout(r, 2500));

    const mobileCheck = await cdp3.evaluate(`
      (() => {
        const sw = document.documentElement.scrollWidth;
        const cw = document.documentElement.clientWidth;
        const exploreLink = document.querySelector('a[href*="explore"]');
        return {
          scrollWidth: sw,
          clientWidth: cw,
          noOverflow: sw <= cw + 2,
          hasHeader: document.body.innerText.includes('EARTH OBSERVATION ORBIT'),
          hasCta: document.body.innerText.toLowerCase().includes('explore maharashtra') || !!exploreLink,
          bodySnippet: document.body.innerText.slice(0, 300),
          exploreHref: exploreLink ? exploreLink.getAttribute('href') : null
        };
      })()
    `);

    assert('Mobile Layout: No Horizontal Scrollbar Overflow', mobileCheck.noOverflow, `${mobileCheck.scrollWidth} <= ${mobileCheck.clientWidth}`);
    assert('Mobile Layout: Aerospace Pill Header Rendered', mobileCheck.hasHeader);
    assert('Mobile Layout: Explore Maharashtra CTA Present', mobileCheck.hasCta);

    await cdp3.close();
    s3.proc.kill('SIGTERM');

    // -------------------------------------------------------------
    // SCENARIO 4: Prefers-Reduced-Motion Emulation
    // -------------------------------------------------------------
    console.log('\n--- Scenario 4: prefers-reduced-motion Preference ---');
    const s4 = await launchChrome(9231, ['--enable-webgl']);
    const cdp4 = s4.cdp;

    await cdp4.send('Page.enable');
    await cdp4.send('Runtime.enable');
    await cdp4.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });

    await cdp4.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${BASE_PATH}/` });
    await new Promise((r) => setTimeout(r, 2500));

    const motionCheck = await cdp4.evaluate(`
      (() => {
        const replayBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Replay Intro'));
        const skipBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Skip Intro'));
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        return {
          mqMatches: mq,
          introSkipped: !!replayBtn || !skipBtn,
        };
      })()
    `);

    assert('Reduced-Motion Media Query Active', motionCheck.mqMatches);
    assert('Intro Auto-Skipped Under Reduced Motion (Replay Ready)', motionCheck.introSkipped);

    await cdp4.close();
    s4.proc.kill('SIGTERM');
  } catch (err) {
    console.error('Fatal test error:', err);
    assert('Test Suite Execution', false, err.message);
  } finally {
    server.close();
  }

  console.log('\n=============================================================');
  console.log(`TOTAL CHECKS: ${results.checks.length} | PASSED: ${results.passed} | FAILED: ${results.failed}`);
  console.log('=============================================================\n');

  process.exit(results.failed > 0 ? 1 : 0);
}

runVerification();
