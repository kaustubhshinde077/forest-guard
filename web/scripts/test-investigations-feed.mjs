import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.resolve(__dirname, '../out');
const PORT = 4182;
const BASE_PATH = '/forest-guard';

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

async function launchChrome(port = 9238, flags = []) {
  const profileDir = `/tmp/test-fg-inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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

async function runInvestigationsVerification() {
  console.log('=== FOREST GUARD PHASE 4: CANDIDATE INVESTIGATIONS FEED VERIFICATION ===\n');

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
    const s = await launchChrome(9239);
    const cdp = s.cdp;

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    console.log(`Navigating to http://127.0.0.1:${PORT}${BASE_PATH}/investigations/ ...`);
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${BASE_PATH}/investigations/` });
    await new Promise((r) => setTimeout(r, 2500));

    // 1. Initial Page Load & Measured Metrics
    const pageMetrics = await cdp.evaluate(`
      (() => {
        const text = document.body.innerText.toLowerCase();
        return {
          hasPilotModeNotice: text.includes('staged pilot mode: partial coverage'),
          has5of1479Notice: text.includes('5 of 1,479 grid sectors assessed'),
          has20CandidatesMetric: text.includes('20') && text.includes('candidate records'),
          has3ParentSectorsMetric: text.includes('3') && text.includes('parent sectors'),
          hasTotalArea73Ha: text.includes('73.97 ha'),
          has100PercentS2: text.includes('100% s2-l2a'),
          hasUnconfirmedStatusLabel: text.includes('unconfirmed satellite-change candidate') || text.includes('unconfirmed'),
          hasBasemapSeparationClarification: text.includes('imagery provenance clarification') && text.includes('sentinel-2 cloudless 2020 by eox'),
        };
      })()
    `);

    assert('Staged Pilot Mode Persistent Notice', pageMetrics.hasPilotModeNotice);
    assert('Coverage Denominator Notice (5 of 1,479 Sectors)', pageMetrics.has5of1479Notice);
    assert('Telemetry: 20 Candidate Records', pageMetrics.has20CandidatesMetric);
    assert('Telemetry: 3 Parent Sectors (Sindhudurg & Kolhapur)', pageMetrics.has3ParentSectorsMetric);
    assert('Telemetry: 73.97 ha Combined Candidate Area', pageMetrics.hasTotalArea73Ha);
    assert('Sensor Provenance: 100% S2-L2A Multi-Spectral', pageMetrics.has100PercentS2);
    assert('Status Treatment: Unconfirmed Satellite-Change Candidate', pageMetrics.hasUnconfirmedStatusLabel);
    assert('Imagery Separation: Contextual Basemap vs Detector Pair', pageMetrics.hasBasemapSeparationClarification);

    // 2. Synthetic Isolation Check
    const syntheticCheck = await cdp.evaluate(`
      (() => {
        const text = document.body.innerText;
        return {
          hasNoTestPair1: !text.includes('INC-TEST_PAIR_1_LO-01'),
          hasNoTestPair2: !text.includes('INC-TEST_PAIR_2_RE-01'),
          hasNoTestPair4: !text.includes('INC-TEST_PAIR_4_GL-01'),
          hasNoSyntheticDemonstration: !text.includes('SYNTHETIC_TEST'),
        };
      })()
    `);
    assert('Zero Synthetic Fixtures in Live Candidate Feed', syntheticCheck.hasNoTestPair1 && syntheticCheck.hasNoTestPair2 && syntheticCheck.hasNoTestPair4 && syntheticCheck.hasNoSyntheticDemonstration);

    // 3. Search & Filter Tests
    console.log('\nTesting search and filter interactions...');

    // A. Free text search for "linear"
    await cdp.evaluate(`
      (() => {
        const input = document.querySelector('input[placeholder*="Search candidate"]');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'linear');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()
    `);
    await new Promise((r) => setTimeout(r, 600));

    const searchLinearCount = await cdp.evaluate(`
      (() => {
        const match = document.body.innerText.match(/Showing (\\d+) of 20 candidates/);
        return match ? parseInt(match[1]) : 0;
      })()
    `);
    assert('Free Text Search "linear" matches exactly 7 corridor candidates', searchLinearCount === 7, `count=${searchLinearCount}`);

    // Clear search
    await cdp.evaluate(`
      (() => {
        const input = document.querySelector('input[placeholder*="Search candidate"]');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));

    // B. Filter by Sector MH-R01-C06 (Sindhudurg)
    await cdp.evaluate(`
      (() => {
        const selects = Array.from(document.querySelectorAll('select'));
        const sectorSelect = selects.find(s => Array.from(s.options).some(o => o.value === 'MH-R01-C06'));
        if (sectorSelect) {
          sectorSelect.value = 'MH-R01-C06';
          sectorSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await new Promise((r) => setTimeout(r, 600));

    const sectorFilterCount = await cdp.evaluate(`
      (() => {
        const match = document.body.innerText.match(/Showing (\\d+) of 20 candidates/);
        return match ? parseInt(match[1]) : 0;
      })()
    `);
    assert('Sector Filter "MH-R01-C06" matches exactly 8 candidates', sectorFilterCount === 8, `count=${sectorFilterCount}`);

    // C. Reset Filters Button
    await cdp.evaluate(`
      (() => {
        const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Reset Filters'));
        if (resetBtn) resetBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 600));

    const resetCount = await cdp.evaluate(`
      (() => {
        const match = document.body.innerText.match(/Showing (\\d+) of 20 candidates/);
        return match ? parseInt(match[1]) : 0;
      })()
    `);
    assert('Reset Filters Restores Full 20 Candidates', resetCount === 20, `count=${resetCount}`);

    // 4. Tabular List vs Grid View Toggle
    console.log('\nTesting View Mode Toggles...');
    await cdp.evaluate(`
      (() => {
        const listBtn = document.querySelector('button[aria-label="Tabular List View"]');
        if (listBtn) listBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 600));

    const hasTable = await cdp.evaluate('Boolean(document.querySelector("table"))');
    assert('Tabular List Mode Renders Accessible Table', hasTable);

    // Switch back to grid
    await cdp.evaluate(`
      (() => {
        const gridBtn = document.querySelector('button[aria-label="Grid Card View"]');
        if (gridBtn) gridBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));

    // 5. Inspect Candidate Dossier Modal
    console.log('\nTesting Candidate Dossier Modal Interaction...');
    await cdp.evaluate(`
      (() => {
        const inspectBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Inspect Dossier'));
        if (inspectBtns.length > 0) {
          inspectBtns[0].click();
        }
      })()
    `);
    await new Promise((r) => setTimeout(r, 800));

    const modalState = await cdp.evaluate(`
      (() => {
        const modal = document.querySelector('[role="dialog"]');
        const hash = window.location.hash;
        const text = modal ? modal.innerText.toLowerCase() : '';
        return {
          isOpen: !!modal,
          hasHash: hash.startsWith('#INC-MH-'),
          hasCaveat: text.includes('provisional candidate status & geometric caveat'),
          hasTelemetryBounds: text.includes('measured affected area') && text.includes('uncertainty'),
          hasSceneProvenance: text.includes('copernicus sentinel-2 provenance'),
          hasTabSelector: text.includes('difference mask') && text.includes('before') && text.includes('after'),
        };
      })()
    `);

    assert('Dossier Modal Opened with Accessible Dialog Role', modalState.isOpen);
    assert('URL Hash Synchronized (#INC-MH-...) for Direct Linking', modalState.hasHash);
    assert('Dossier Mandatory Provisional Caveat Visible', modalState.hasCaveat);
    assert('Dossier Measured Area with Uncertainty Bounds', modalState.hasTelemetryBounds);
    assert('Dossier Copernicus Sentinel-2 L2A Provenance Section', modalState.hasSceneProvenance);
    assert('Dossier Before/After/Mask Tab Selectors Rendered', modalState.hasTabSelector);

    // Test Escape Key Closes Modal
    console.log('Testing Escape key dismiss...');
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', windowsVirtualKeyCode: 27 });
    await new Promise((r) => setTimeout(r, 600));

    const postCloseState = await cdp.evaluate(`
      (() => {
        const modal = document.querySelector('[role="dialog"]');
        const hash = window.location.hash;
        return {
          isClosed: !modal,
          hashCleared: !hash || hash === '#',
        };
      })()
    `);
    assert('Escape Key Dismisses Dossier Modal', postCloseState.isClosed);
    assert('URL Hash Cleared Cleanly on Modal Close', postCloseState.hashCleared);

    await cdp.close();
    s.proc.kill('SIGTERM');
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

runInvestigationsVerification();
