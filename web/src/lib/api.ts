import { InvestigationReport } from '@/types/incident';
import fallbackIncidents from '@/data/incidents.json';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Prefix a relative asset or data path with the active Next.js basePath
 * to ensure all assets resolve correctly on GitHub Pages (e.g. /forest_guard/data/...)
 * or local dev root (e.g. /data/...)
 */
export function getAssetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${cleanPath}`;
}

export async function fetchIncidents(): Promise<InvestigationReport[]> {
  // 1. If explicit API_BASE_URL is provided (local development with FastAPI)
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (err) {
      console.warn('FastAPI endpoint unreachable; attempting static data feed:', err);
    }
  }

  // 2. Fetch from static data feed on GitHub Pages or static host
  try {
    const staticUrl = getAssetUrl('/data/incidents.json');
    const res = await fetch(staticUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-cache'
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Static data feed fetch failed; falling back to bundled data:', err);
  }

  // 3. Fallback to bundled incidents.json
  return fallbackIncidents as unknown as InvestigationReport[];
}

export async function fetchIncidentById(id: string): Promise<InvestigationReport | null> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');

  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/${encodeURIComponent(id)}`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn(`FastAPI fetch for ${id} failed; trying static report:`, err);
    }
  }

  // Try static individual report
  try {
    const reportUrl = getAssetUrl(`/data/reports/${safeId}.json`);
    const res = await fetch(reportUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-cache'
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Static report for ${safeId} not found:`, err);
  }

  // Fallback
  const fallback = (fallbackIncidents as unknown as InvestigationReport[]).find(i => i.incident_id === id);
  return fallback || null;
}
