#!/usr/bin/env node
/**
 * Forest Guard — Build-Time Sector Layer Derivation Script
 * 
 * Responsibilities:
 * 1. Reads the canonical 15 km x 15 km Maharashtra GIS tile catalogue (1,479 sectors).
 * 2. Reads the durable monitoring_state.json to join real observation statuses.
 * 3. Emits compact, simplified GeoJSON to web/public/data/derived/maharashtra_sectors.geojson.
 * 4. Measures output size against the performance budget (< 400 KB uncompressed).
 */

const fs = require('fs');
const path = require('path');

// Target paths
const REPO_ROOT = path.resolve(__dirname, '../../');
const CATALOGUE_PATH = path.join(REPO_ROOT, 'data/catalogue/maharashtra_tiles.json');
const STATE_PATH = path.join(REPO_ROOT, 'data/public/monitoring_state.json');
const OUT_DIR = path.join(__dirname, '../public/data/derived');
const OUT_SECTORS_PATH = path.join(OUT_DIR, 'maharashtra_sectors.geojson');

// Ensure output dir exists
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

if (!fs.existsSync(CATALOGUE_PATH)) {
  console.error(`[derive-sectors] ERROR: Catalogue not found at ${CATALOGUE_PATH}`);
  process.exit(1);
}

const catalogue = JSON.parse(fs.readFileSync(CATALOGUE_PATH, 'utf-8'));
let monitoringState = { tiles: {} };
if (fs.existsSync(STATE_PATH)) {
  try {
    monitoringState = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  } catch (e) {
    console.warn(`[derive-sectors] Warning: Failed to parse monitoring state: ${e.message}`);
  }
}

const tileStates = monitoringState.tiles || {};
const tiles = catalogue.tiles || [];
console.log(`[derive-sectors] Loaded ${tiles.length} catalogue sectors and ${Object.keys(tileStates).length} recorded tile states.`);

const roundCoord = (val) => Math.round(val * 10000) / 10000;

const features = tiles.map((tile) => {
  const [minLon, minLat, maxLon, maxLat] = tile.bbox_epsg4326;
  const tState = tileStates[tile.tile_id];

  // Derive status
  let statusCode = 'unassessed';
  if (tState) {
    const rawStatus = tState.status;
    if (rawStatus === 'monitored_candidate_detected') {
      statusCode = 'candidate';
    } else if (rawStatus === 'monitored_no_change') {
      statusCode = 'clear';
    } else if (rawStatus === 'incomplete_data_missing') {
      const reason = (tState.reason || '').toLowerCase();
      if (reason.includes('cloud') || reason.includes('occlusion')) {
        statusCode = 'cloud_obscured';
      } else {
        statusCode = 'failed';
      }
    } else if (rawStatus === 'retrieval_failed') {
      statusCode = 'failed';
    }
  } else if (tile.scheduled_batch_day === 1) {
    // Scheduled in current active batch, awaiting execution
    statusCode = 'pending';
  } else {
    statusCode = 'unassessed';
  }

  // 4-decimal-place polygon coordinates
  const p1 = [roundCoord(minLon), roundCoord(minLat)];
  const p2 = [roundCoord(maxLon), roundCoord(minLat)];
  const p3 = [roundCoord(maxLon), roundCoord(maxLat)];
  const p4 = [roundCoord(minLon), roundCoord(maxLat)];

  return {
    type: 'Feature',
    id: tile.tile_id,
    properties: {
      id: tile.tile_id,
      d: tile.primary_district,
      r: tile.region,
      b: tile.scheduled_batch_day,
      a: Math.round(tile.terrestrial_area_km2 * 100) / 100,
      f: tile.is_forest_priority ? 1 : 0,
      s: statusCode
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[p1, p2, p3, p4, p1]]
    }
  };
});

const geojson = {
  type: 'FeatureCollection',
  features
};

const jsonStr = JSON.stringify(geojson);
fs.writeFileSync(OUT_SECTORS_PATH, jsonStr, 'utf-8');

const bytes = Buffer.byteLength(jsonStr, 'utf-8');
const kb = (bytes / 1024).toFixed(1);
const budgetKb = 400;

console.log(`[derive-sectors] Successfully wrote ${features.length} sectors to ${OUT_SECTORS_PATH}`);
console.log(`[derive-sectors] Output Size: ${kb} KB (Budget: < ${budgetKb} KB) -> ${bytes <= budgetKb * 1024 ? 'PASSED (Within Budget)' : 'EXCEEDED'}`);
