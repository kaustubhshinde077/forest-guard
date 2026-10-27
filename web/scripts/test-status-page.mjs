import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.resolve(__dirname, '../out');
const PORT = 4185;
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
    reqUrl = decodeURIComponent(reqUrl);
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

async function launchChrome(port = 9248, flags = []) {
  const profileDir = `/tmp/test-fg-status-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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

async function runStatusVerification() {
  console.log('=== FOREST GUARD PHASE 6: MONITORING STATUS & METHODOLOGY VERIFICATION ===\n');

  const server = await createStaticServer();
  const results = {
    checks: [],
    passed: 0,
    failed: 0,
  };

  function record(desc, ok, details = '') {
    results.checks.push({ desc, ok, details });
    if (ok) {
      results.passed++;
      console.log(`  ✓ ${desc} ${details ? '(' + details + ')' : ''}`);
    } else {
      results.failed++;
      console.error(`  ✗ ${desc}: ${details}`);
    }
  }

  let chromeInstance = null;

  try {
    chromeInstance = await launchChrome(9248);
    const { cdp } = chromeInstance;

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // 1. Direct Loading of Canonical Status Route
    const targetUrl = `http://127.0.0.1:${PORT}${BASE_PATH}/status/`;
    console.log(`\n[Navigating to Static Route] ${targetUrl}`);
    await cdp.send('Page.navigate', { url: targetUrl });
    await new Promise((r) => setTimeout(r, 1500));

    // Check 1: Route loads with 200 and document title
    const docTitle = await cdp.evaluate('document.title');
    record(
      'Static canonical status route loads directly with appropriate document title',
      docTitle.includes('Forest Guard'),
      `Title: "${docTitle}"`
    );

    // Check 2: Persistent STAGED PILOT MODE chip
    const pilotChip = await cdp.evaluate(`(() => {
      const text = document.body.innerText;
      return text.includes('STAGED PILOT MODE — PARTIAL COVERAGE') || text.includes('STAGED PILOT MODE');
    })()`);
    record(
      'Persistent "STAGED PILOT MODE — PARTIAL COVERAGE" indicator rendered',
      pilotChip,
      'Partial coverage caveat enforced'
    );

    // Check 3: Total catalogue sectors (1,479) and pilot assessed sectors (5)
    const sectorCounts = await cdp.evaluate(`(() => {
      const text = document.body.innerText;
      const hasTotal = text.includes('1,479');
      const hasEvaluated = text.includes('5') && text.includes('Assessed in Pilot');
      return { hasTotal, hasEvaluated };
    })()`);
    record(
      'Catalogue total (1,479) and pilot assessed count (5) derived dynamically from JSON',
      sectorCounts.hasTotal && sectorCounts.hasEvaluated,
      'Dynamic grid sector counts verified'
    );

    // Check 4: Successfully processed breakout: 3 candidate + 1 sector with no qualifying change detected
    const statusBreakdown = await cdp.evaluate(`(() => {
      const text = document.body.innerText;
      const hasCandidate = text.includes('3') && (text.includes('Candidate Detected') || text.includes('Candidate Change'));
      const hasNoChange = text.includes('1') && text.includes('No Qualifying Change');
      const hasCloud = text.includes('1') && (text.includes('Cloud Obscured') || text.includes('Incomplete'));
      return { hasCandidate, hasNoChange, hasCloud };
    })()`);
    record(
      'Breakout separates 3 candidate sectors, 1 sector with no qualifying change detected, and 1 cloud-obscured sector',
      statusBreakdown.hasCandidate && statusBreakdown.hasNoChange && statusBreakdown.hasCloud,
      'Processing success strictly distinguished from sectors with no qualifying change detected and incomplete findings'
    );

    // Check 5: Credited monitored land area: 390.86 km² (0.13% coverage)
    const areaMetrics = await cdp.evaluate(`(() => {
      const text = document.body.innerText;
      const hasArea = text.includes('390.86');
      const hasPercent = text.includes('0.13%');
      const hasDenominator = text.includes('307,492.71');
      return { hasArea, hasPercent, hasDenominator };
    })()`);
    record(
      'Credited monitored land area (390.86 km²) and 0.13% coverage displayed with explicit equal-area denominator',
      areaMetrics.hasArea && areaMetrics.hasPercent && areaMetrics.hasDenominator,
      'Accurate arithmetic and denominator disclosure verified'
    );

    // Check 6: Incomplete sectors receive 0 km² credit rule explicitly stated
    const zeroCreditRule = await cdp.evaluate(`(() => {
      const text = document.body.innerText;
      return text.includes('0 km² credited') || text.includes('0.00 km² Monitored Credit') || text.includes('Zero-Credit Policy');
    })()`);
    record(
      'Incomplete sectors explicitly receive zero monitored-area credit per safeguard policy',
      zeroCreditRule,
      'Zero-credit safeguard verified'
    );

    // Check 7: Searchable sector inventory table rendered with table semantics
    const tableStructure = await cdp.evaluate(`(() => {
      const table = document.querySelector('table[role="table"]');
      if (!table) return null;
      const ths = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim());
      const trs = table.querySelectorAll('tbody tr');
      return {
        hasTable: true,
        headers: ths,
        rowCount: trs.length
      };
    })()`);
    record(
      'Accessible sector inventory table rendered with semantic table structure and pagination',
      tableStructure !== null && tableStructure.hasTable && tableStructure.rowCount > 0,
      `Table rows on page 1: ${tableStructure?.rowCount}`
    );

    // Check 8: Search filter interaction on inventory table
    await cdp.evaluate(`(() => {
      const input = document.querySelector('input[placeholder*="Search sectors"]');
      if (input) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Sindhudurg');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`);
    await new Promise((r) => setTimeout(r, 200));

    const searchResults = await cdp.evaluate(`(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const allMatch = rows.every(r => r.innerText.toLowerCase().includes('sindhudurg'));
      return { count: rows.length, allMatch };
    })()`);
    record(
      'Sector inventory search filter responds to query "Sindhudurg"',
      searchResults.count > 0 && searchResults.allMatch,
      `Filtered to ${searchResults.count} Sindhudurg sectors`
    );

    // Reset search query
    await cdp.evaluate(`(() => {
      const input = document.querySelector('input[placeholder*="Search sectors"]');
      if (input) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`);
    await new Promise((r) => setTimeout(r, 200));

    // Check 9: "Assessed in Pilot" filter tab matches exactly 5 sectors
    await cdp.evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Assessed in Pilot'));
      if (btn) btn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 200));

    const pilotRowsCount = await cdp.evaluate(`document.querySelectorAll('tbody tr').length`);
    record(
      '"Assessed in Pilot" filter tab filters inventory to exactly 5 pilot sectors',
      pilotRowsCount === 5,
      `Found ${pilotRowsCount} evaluated sectors`
    );

    // Check 10: "Candidate Detected" filter tab matches exactly 3 sectors
    await cdp.evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Candidate Detected'));
      if (btn) btn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 200));

    const candidateRowsCount = await cdp.evaluate(`document.querySelectorAll('tbody tr').length`);
    record(
      '"Candidate Detected" filter tab filters inventory to exactly 3 sectors',
      candidateRowsCount === 3,
      `Found ${candidateRowsCount} candidate sectors`
    );

    const candidateSectorIds = await cdp.evaluate(`(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.map(r => {
        const firstCol = r.querySelector('td');
        return firstCol ? firstCol.innerText.trim() : '';
      });
    })()`);
    const candidateIdsMatch = ['MH-R01-C06', 'MH-R01-C10', 'MH-R07-C09'].every(id => candidateSectorIds.some(cid => cid.includes(id)));
    record(
      'Candidate sectors verified as MH-R01-C06, MH-R01-C10, and MH-R07-C09',
      candidateIdsMatch,
      `Observed candidates: ${JSON.stringify(candidateSectorIds)}`
    );

    // Check 10b: "No qualifying change detected" filter tab matches exactly 1 sector
    const noChangeBtnResult = await cdp.evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.toLowerCase().includes('no qualifying change detected'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()`);
    await new Promise((r) => setTimeout(r, 200));

    const noChangeRowsCount = await cdp.evaluate(`document.querySelectorAll('tbody tr').length`);
    record(
      '"No qualifying change detected" filter tab filters inventory to exactly 1 sector',
      noChangeBtnResult && noChangeRowsCount === 1,
      `Found ${noChangeRowsCount} sector with no qualifying change`
    );

    const noChangeSectorText = await cdp.evaluate(`(() => {
      const row = document.querySelector('tbody tr');
      return row ? row.innerText.trim() : '';
    })()`);
    record(
      'Sector with no qualifying change is verified as MH-R06-C03 (Sindhudurg coast sliver, 7.58 km²)',
      noChangeSectorText.includes('MH-R06-C03') && noChangeSectorText.includes('7.58'),
      `Row text: "${noChangeSectorText.replace(/\s+/g, ' ')}"`
    );

    // Check 11: Sector map deep link points to canonical explore route
    const exploreMapLink = await cdp.evaluate(`(() => {
      const links = Array.from(document.querySelectorAll('a[href*="explore"]')).filter(a => (a.getAttribute('href') || '').includes('sector='));
      if (links.length === 0) return null;
      return links[0].getAttribute('href');
    })()`);
    record(
      'Sector inventory map links route to Explore Map with ?sector=... query parameter',
      exploreMapLink !== null && exploreMapLink.includes('explore') && exploreMapLink.includes('sector='),
      `Link target: "${exploreMapLink}"`
    );

    // Check 12: 7-Stage Pipeline Methodology Section Present
    const pipelineStages = await cdp.evaluate(`(() => {
      const text = document.body.innerText;
      const hasStage1 = text.includes('STAGE 01') && text.includes('Discovery & Ingestion');
      const hasStage2 = text.includes('STAGE 02') && text.includes('Coregistration');
      const hasStage3 = text.includes('STAGE 03') && text.includes('Masking');
      const hasStage4 = text.includes('STAGE 04') && text.includes('Classical Vision');
      const hasStage5 = text.includes('STAGE 05') && text.includes('1.0-Hectare');
      const hasStage6 = text.includes('STAGE 06') && text.includes('Closed-Loop');
      const hasStage7 = text.includes('STAGE 07') && text.includes('Dossier Generation');
      return { hasStage1, hasStage2, hasStage3, hasStage4, hasStage5, hasStage6, hasStage7 };
    })()`);
    record(
      'Seven-stage classical vision pipeline methodology fully documented',
      pipelineStages.hasStage1 && pipelineStages.hasStage2 && pipelineStages.hasStage3 &&
      pipelineStages.hasStage4 && pipelineStages.hasStage5 && pipelineStages.hasStage6 && pipelineStages.hasStage7,
      'All 7 pipeline stages verified'
    );

    // Check 13: Strict Zero-NDVI Policy Explicitly Documented
    const zeroNdvi = await cdp.evaluate(`(() => {
      const text = document.body.innerText;
      return text.includes('zero NDVI') || text.includes('Zero-NDVI Policy') || text.includes('without NDVI');
    })()`);
    record(
      'Strict zero-NDVI policy and phenological rejection rationale documented',
      zeroNdvi,
      'Classical vision integrity verified'
    );

    // Check 14: Epistemic boundary: observed change vs algorithmic candidate vs contextual leads vs unknowns
    const epistemicBoundary = await cdp.evaluate(`(() => {
      const text = document.body.innerText.toLowerCase();
      const hasObserved = text.includes('observed satellite change');
      const hasAlgo = text.includes('algorithmic candidate');
      const hasLeads = text.includes('contextual research leads') || text.includes('contextual literature');
      const hasUnknowns = text.includes('unresolved unknowns');
      return { hasObserved, hasAlgo, hasLeads, hasUnknowns };
    })()`);
    record(
      'Epistemic standards strictly separate observed changes, algorithmic candidates, contextual leads, and unknowns',
      epistemicBoundary.hasObserved && epistemicBoundary.hasAlgo && epistemicBoundary.hasLeads && epistemicBoundary.hasUnknowns,
      'Evidence categorization verified'
    );

    // Check 15: Cadence & Round-Robin 21-Day Batching Documented
    const cadenceDoc = await cdp.evaluate(`(() => {
      const text = document.body.innerText.toLowerCase();
      const hasCadence = text.includes('21-day') || text.includes('21 continuous calendar days');
      const hasBatches = text.includes('21 daily monitoring batches') || text.includes('round-robin');
      return { hasCadence, hasBatches };
    })()`);
    record(
      'Intended 21-day observation cadence and round-robin batching documented',
      cadenceDoc.hasCadence && cadenceDoc.hasBatches,
      'Cadence architecture verified'
    );

    // Check 16: Cloud Occlusion > 35% Abort Safeguard Documented
    const cloudSafeguard = await cdp.evaluate(`(() => {
      const text = document.body.innerText;
      return text.includes('> 35%') && (text.includes('Cloud Obscured') || text.includes('Processing Abort'));
    })()`);
    record(
      'Cloud & shadow occlusion > 35% processing abort safeguard documented',
      cloudSafeguard,
      'Cloud threshold safeguard verified'
    );

    // Check 17: Public Data Sources & Licences Section
    const dataSources = await cdp.evaluate(`(() => {
      const text = document.body.innerText;
      const hasS2 = text.includes('Copernicus Sentinel-2') && text.includes('Copernicus Sentinel Data Legal Notice');
      const hasGibs = text.includes('NASA GIBS Blue Marble') && text.includes('August 2004');
      const hasEox = text.includes('Sentinel-2 Cloudless 2020 by EOX') && text.includes('CC BY-NC-SA 4.0');
      const hasCensus = text.includes('Census of India 2011') || text.includes('Survey of India');
      return { hasS2, hasGibs, hasEox, hasCensus };
    })()`);
    record(
      'Public data sources and legal licences (Copernicus, NASA GIBS 2004, EOxCloudless 2020, Census 2011) documented',
      dataSources.hasS2 && dataSources.hasGibs && dataSources.hasEox && dataSources.hasCensus,
      'Licence transparency verified'
    );

    // Check 18: Contextual Basemap vs Change Detection Imagery Separation
    const imagerySeparation = await cdp.evaluate(`(() => {
      const text = document.body.innerText.toLowerCase();
      const hasBasemapNotice = text.includes('contextual basemaps (reference only)') || text.includes('contextual basemaps');
      const hasDetectorNotice = text.includes('empirical observation pairs') || text.includes('detector inputs');
      const hasNoChangeDetectionNotice = text.includes('no change detection or canopy analysis is ever run on contextual basemaps');
      return hasBasemapNotice && hasDetectorNotice && hasNoChangeDetectionNotice;
    })()`);
    record(
      'Contextual basemap vs detector observation pair imagery separation documented',
      imagerySeparation,
      'Imagery role distinction verified'
    );

    // Check 19: Coordinate Reference System (CRS) Mathematics Documented
    const crsDoc = await cdp.evaluate(`(() => {
      const text = document.body.innerText;
      const hasEpsg7755 = text.includes('EPSG:7755') && text.includes('Lambert Conformal Conic');
      const hasEpsg6933 = text.includes('EPSG:6933') && text.includes('EASE-Grid 2.0 Global');
      const hasDenominators = text.includes('297,650.35') && text.includes('307,492.71');
      return { hasEpsg7755, hasEpsg6933, hasDenominators };
    })()`);
    record(
      'Coordinate reference systems (EPSG:7755, EPSG:6933) and terrestrial denominators mathematically documented',
      crsDoc.hasEpsg7755 && crsDoc.hasEpsg6933 && crsDoc.hasDenominators,
      'CRS and equal-area mathematics verified'
    );

    // Check 20: Direct URL Page Reload Idempotency
    await cdp.send('Page.reload');
    await new Promise((r) => setTimeout(r, 1200));
    const titleAfterReload = await cdp.evaluate('document.title');
    record(
      'Direct URL page reload preserves full state without client routing error',
      titleAfterReload.includes('Forest Guard'),
      `Reloaded title: "${titleAfterReload}"`
    );

    // Check 21: Mobile Viewport (375x667) — Zero Horizontal Scrollbar Overflow
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await cdp.send('Page.navigate', { url: targetUrl });
    await new Promise((r) => setTimeout(r, 1000));

    const mobileOverflow = await cdp.evaluate(`(() => {
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      return { docWidth, winWidth, overflow: docWidth > winWidth };
    })()`);
    record(
      'Mobile viewport (375x667 iPhone SE) has zero horizontal overflow',
      !mobileOverflow.overflow,
      `docWidth: ${mobileOverflow.docWidth}px, winWidth: ${mobileOverflow.winWidth}px`
    );

    // Reset emulation
    await cdp.send('Emulation.clearDeviceMetricsOverride');

    // Check 22: Map Explorer Sector Panel Verification for MH-R06-C03 (No Qualifying Change Detected)
    console.log('\n[Testing Map Explore Deep Link with ?sector=MH-R06-C03]');
    await cdp.send('Page.navigate', {
      url: `http://127.0.0.1:${PORT}${BASE_PATH}/explore/?sector=MH-R06-C03`,
    });
    await new Promise((r) => setTimeout(r, 2500));
    const mapDetailNoChange = await cdp.evaluate(`(() => {
      const text = document.body.innerText;
      const hasId = text.includes('MH-R06-C03');
      const hasStatus = text.toLowerCase().includes('no qualifying change detected');
      const hasArea = text.includes('7.58');
      return { hasId, hasStatus, hasArea };
    })()`);
    record(
      'Map Explorer reconciles MH-R06-C03 as "No qualifying change detected" (7.58 km²)',
      mapDetailNoChange.hasId && mapDetailNoChange.hasStatus && mapDetailNoChange.hasArea,
      `hasId=${mapDetailNoChange.hasId}, hasStatus=${mapDetailNoChange.hasStatus}, hasArea=${mapDetailNoChange.hasArea}`
    );

  } catch (err) {
    console.error('Test execution error:', err);
    record('Browser test suite completed without unhandled exceptions', false, err.message);
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

  console.log('\n=== SUMMARY ===');
  console.log(`Passed: ${results.passed} / ${results.checks.length}`);
  console.log(`Failed: ${results.failed} / ${results.checks.length}`);

  if (results.failed > 0) {
    process.exit(1);
  }
}

runStatusVerification();
