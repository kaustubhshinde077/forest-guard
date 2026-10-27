/**
 * Forest Guard — Typed Static Data Layer
 * 
 * Responsibilities:
 * 1. Single assetUrl() helper handling Next.js basePath (/forest-guard).
 * 2. Zero production dependency on running APIs or localhost servers.
 * 3. Enforces strict honesty rules:
 *    - Synthetic fixtures are never loaded as live events.
 *    - Malformed records are safely skipped and reported in dataIssues.
 *    - All counts and metrics are derived strictly from real JSON files.
 */

import { InvestigationReport } from '@/types/incident';
import { SectorStatusCode, TileRecord, resolveSectorStatus, computeStatusBreakdown } from './status';

export interface MonitoringState {
  cadence_days: number;
  last_successful_run: string;
  last_attempt_timestamp: string;
  total_runs_completed: number;
  last_run_status: string;
  last_run_summary: {
    cycle_start_time?: string;
    cadence_days?: number;
    significance_threshold_ha?: number;
    sectors_evaluated?: number;
    changes_detected_count?: number;
    investigations_conducted_count?: number;
    reports_published?: Array<{
      sector_id?: string;
      incident_id: string;
      title: string;
      area_ha: number;
      event_category: string;
      investigation_status: string;
      is_synthetic_test: boolean;
    }>;
    failed_sectors?: Array<{
      sector_id: string;
      name?: string;
      status: string;
      published: boolean;
      reason: string;
    }>;
  };
  tiles: Record<string, TileRecord>;
  monitored_terrestrial_area_km2: number;
  total_catalogue_tiles_monitored: number;
  current_batch_day: number;
}

export interface DataFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface DataIssuesLog {
  skippedMalformedIncidents: Array<{ id?: string; reason: string }>;
  fetchErrors: string[];
}

export const globalDataIssues: DataIssuesLog = {
  skippedMalformedIncidents: [],
  fetchErrors: []
};

/**
 * Single canonical assetUrl helper.
 * Applies NEXT_PUBLIC_BASE_PATH (e.g. /forest-guard) to data, image and route URLs.
 */
export function assetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${cleanBase}${cleanPath}`;
}

/**
 * Fetches durable monitoring state from static JSON.
 */
export async function fetchMonitoringState(): Promise<MonitoringState | null> {
  try {
    const url = assetUrl('/data/monitoring_state.json');
    const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err: any) {
    const msg = `Failed to fetch monitoring_state.json: ${err.message}`;
    console.warn(msg);
    globalDataIssues.fetchErrors.push(msg);
    return null;
  }
}

/**
 * Fetches verified live candidates.
 * Enforces honesty rules:
 * - Drops any synthetic records (is_synthetic_test === true).
 * - Skips malformed records and logs them.
 */
export async function fetchLiveCandidates(): Promise<InvestigationReport[]> {
  try {
    const url = assetUrl('/data/incidents.json');
    const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const rawList = await res.json();
    if (!Array.isArray(rawList)) {
      throw new Error('incidents.json is not an array');
    }

    const verified: InvestigationReport[] = [];
    for (const item of rawList) {
      // Reject synthetic test fixtures from live candidate feed
      if (item.is_synthetic_test) {
        continue;
      }

      // Validate essential fields
      if (!item.incident_id || !item.geographic_coordinates || item.affected_area_hectares === undefined) {
        globalDataIssues.skippedMalformedIncidents.push({
          id: item.incident_id || 'unknown',
          reason: 'Missing incident_id, geographic_coordinates, or affected_area_hectares'
        });
        continue;
      }

      verified.push(item as InvestigationReport);
    }

    return verified;
  } catch (err: any) {
    const msg = `Failed to fetch incidents.json: ${err.message}`;
    console.warn(msg);
    globalDataIssues.fetchErrors.push(msg);
    return [];
  }
}

/**
 * Fetches individual report by ID.
 */
export async function fetchReportById(incidentId: string): Promise<InvestigationReport | null> {
  const safeId = incidentId.replace(/[^a-zA-Z0-9_-]/g, '_');
  try {
    const url = assetUrl(`/data/reports/${safeId}.json`);
    const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err: any) {
    console.warn(`Failed to fetch report ${safeId}: ${err.message}`);
    return null;
  }
}

/**
 * Fetches derived simplified sectors GeoJSON for MapLibre rendering.
 */
export async function fetchSectorsGeoJSON(): Promise<any | null> {
  try {
    const url = assetUrl('/data/derived/maharashtra_sectors.geojson');
    const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err: any) {
    console.warn(`Failed to fetch derived sectors GeoJSON: ${err.message}`);
    return null;
  }
}

/**
 * Fetches simplified state boundary GeoJSON.
 */
export async function fetchBoundaryGeoJSON(): Promise<any | null> {
  try {
    const url = assetUrl('/data/derived/maharashtra_boundary.geojson');
    const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err: any) {
    console.warn(`Failed to fetch derived boundary GeoJSON: ${err.message}`);
    return null;
  }
}
