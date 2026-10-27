/**
 * Forest Guard — Typed Sector Status Resolution Module
 * 
 * Strict Data Precedence:
 * 1. candidate (amber #f5a524): Valid change candidate detected (>= 1.0 ha)
 * 2. clear (emerald #34d399): Successfully monitored within 21-day cadence, zero qualifying loss
 * 3. cloud_obscured (slate-blue #7c8aa5): Cloud/shadow occlusion > 35%, marked incomplete
 * 4. failed (red #e5484d): Data retrieval or processing failure
 * 5. overdue (dashed outline): Last verified observation > 21 days ago
 * 6. pending (grey #5b6573): Catalogued sector in scheduled daily batch, not yet monitored
 * 7. unassessed (very dim outline): Not yet assessed in the monitoring cycle
 * 
 * Non-negotiable honesty rules:
 * - Green (#34d399) appears ONLY for 'clear', and ONLY where real data explicitly confirms it.
 * - Never imply all of Maharashtra is monitored.
 * - Detector scores are never shown as probabilities.
 */

export type SectorStatusCode =
  | 'candidate'
  | 'clear'
  | 'cloud_obscured'
  | 'failed'
  | 'overdue'
  | 'pending'
  | 'unassessed';

export interface StatusMeta {
  code: SectorStatusCode;
  label: string;
  shortLabel: string;
  color: string;
  bgSubtle: string;
  borderClass: string;
  textClass: string;
  badgeClass: string;
  mapFillColor: string;
  mapOutlineColor: string;
  description: string;
}

export const STATUS_META: Record<SectorStatusCode, StatusMeta> = {
  candidate: {
    code: 'candidate',
    label: 'UNCONFIRMED SATELLITE-CHANGE CANDIDATE',
    shortLabel: 'Candidate',
    color: '#f5a524',
    bgSubtle: 'rgba(245, 165, 36, 0.12)',
    borderClass: 'border-amber-500/60',
    textClass: 'text-amber-400',
    badgeClass: 'bg-amber-950/70 text-amber-300 border border-amber-800/60',
    mapFillColor: 'rgba(245, 165, 36, 0.45)',
    mapOutlineColor: '#f5a524',
    description: 'Qualifying change detected (≥ 1.0 ha) awaiting independent field ground-truthing.'
  },
  clear: {
    code: 'clear',
    label: 'NO QUALIFYING CHANGE DETECTED',
    shortLabel: 'No Qualifying Change Detected',
    color: '#34d399',
    bgSubtle: 'rgba(52, 211, 153, 0.12)',
    borderClass: 'border-emerald-500/60',
    textClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60',
    mapFillColor: 'rgba(52, 211, 153, 0.35)',
    mapOutlineColor: '#34d399',
    description: 'Assessed within 21 days; no canopy change met the ≥ 1.0 ha significance threshold.'
  },
  cloud_obscured: {
    code: 'cloud_obscured',
    label: 'CLOUD OBSCURED (INCOMPLETE)',
    shortLabel: 'Cloud Obscured',
    color: '#7c8aa5',
    bgSubtle: 'rgba(124, 138, 165, 0.12)',
    borderClass: 'border-slate-500/60',
    textClass: 'text-slate-300',
    badgeClass: 'bg-slate-900/80 text-slate-300 border border-slate-700/60',
    mapFillColor: 'rgba(124, 138, 165, 0.35)',
    mapOutlineColor: '#7c8aa5',
    description: 'Cloud/shadow occlusion > 35%. Marked incomplete per safeguard policy; zero monitored credit.'
  },
  failed: {
    code: 'failed',
    label: 'RETRIEVAL FAILED',
    shortLabel: 'Failed',
    color: '#e5484d',
    bgSubtle: 'rgba(229, 72, 77, 0.12)',
    borderClass: 'border-red-500/60',
    textClass: 'text-red-400',
    badgeClass: 'bg-red-950/70 text-red-300 border border-red-800/60',
    mapFillColor: 'rgba(229, 72, 77, 0.40)',
    mapOutlineColor: '#e5484d',
    description: 'Data acquisition or raster processing failed. Preserved as incomplete.'
  },
  overdue: {
    code: 'overdue',
    label: 'OVERDUE FOR RE-CHECK',
    shortLabel: 'Overdue',
    color: '#f5a524',
    bgSubtle: 'rgba(245, 165, 36, 0.08)',
    borderClass: 'border-dashed border-amber-600/70',
    textClass: 'text-amber-300',
    badgeClass: 'bg-amber-950/40 text-amber-300 border border-dashed border-amber-800/50',
    mapFillColor: 'rgba(245, 165, 36, 0.20)',
    mapOutlineColor: '#f5a524',
    description: 'Exceeded 21-day cadence interval since last verified observation.'
  },
  pending: {
    code: 'pending',
    label: 'PENDING SCHEDULED BATCH',
    shortLabel: 'Pending',
    color: '#5b6573',
    bgSubtle: 'rgba(91, 101, 115, 0.12)',
    borderClass: 'border-slate-700/60',
    textClass: 'text-slate-400',
    badgeClass: 'bg-slate-900/60 text-slate-400 border border-slate-800/60',
    mapFillColor: 'rgba(91, 101, 115, 0.15)',
    mapOutlineColor: '#5b6573',
    description: 'Catalogued sector in scheduled daily batch awaiting monitoring run.'
  },
  unassessed: {
    code: 'unassessed',
    label: 'UNASSESSED',
    shortLabel: 'Unassessed',
    color: 'rgba(255, 255, 255, 0.20)',
    bgSubtle: 'transparent',
    borderClass: 'border-white/10',
    textClass: 'text-slate-500',
    badgeClass: 'bg-transparent text-slate-500 border border-white/10',
    mapFillColor: 'transparent',
    mapOutlineColor: 'rgba(255, 255, 255, 0.08)',
    description: 'No satellite observation ingested yet during current pilot deployment.'
  }
};

export interface TileRecord {
  status?: string;
  reason?: string;
  last_monitored?: string;
  last_attempt?: string;
  terrestrial_area_km2?: number;
}

/**
 * Resolves the canonical status of a sector from real data records.
 */
export function resolveSectorStatus(
  tileId: string,
  tileRecord?: TileRecord,
  scheduledBatchDay?: number,
  nowIso: string = new Date().toISOString()
): SectorStatusCode {
  if (!tileRecord) {
    if (scheduledBatchDay === 1) {
      return 'pending';
    }
    return 'unassessed';
  }

  const raw = tileRecord.status;
  if (raw === 'monitored_candidate_detected') {
    return 'candidate';
  }

  if (raw === 'monitored_no_change') {
    // Check overdue (> 21 days)
    if (tileRecord.last_monitored) {
      const last = new Date(tileRecord.last_monitored).getTime();
      const now = new Date(nowIso).getTime();
      const daysElapsed = (now - last) / (1000 * 60 * 60 * 24);
      if (daysElapsed > 21) {
        return 'overdue';
      }
    }
    return 'clear';
  }

  if (raw === 'incomplete_data_missing') {
    const reason = (tileRecord.reason || '').toLowerCase();
    if (reason.includes('cloud') || reason.includes('occlusion')) {
      return 'cloud_obscured';
    }
    return 'failed';
  }

  if (raw === 'retrieval_failed') {
    return 'failed';
  }

  return 'unassessed';
}

/**
 * Computes live status breakdown counts across the catalogue.
 */
export function computeStatusBreakdown(
  totalCatalogued: number,
  tileStates: Record<string, TileRecord>,
  scheduledBatchMap?: Record<string, number>
): Record<SectorStatusCode, number> {
  const counts: Record<SectorStatusCode, number> = {
    candidate: 0,
    clear: 0,
    cloud_obscured: 0,
    failed: 0,
    overdue: 0,
    pending: 0,
    unassessed: 0
  };

  const accountedTiles = new Set<string>();

  for (const [tileId, record] of Object.entries(tileStates)) {
    const code = resolveSectorStatus(tileId, record);
    counts[code] = (counts[code] || 0) + 1;
    accountedTiles.add(tileId);
  }

  const remaining = Math.max(0, totalCatalogued - accountedTiles.size);
  // Any scheduled batch 1 tiles not yet checked are pending
  if (scheduledBatchMap) {
    let pendingCount = 0;
    for (const [tileId, bDay] of Object.entries(scheduledBatchMap)) {
      if (!accountedTiles.has(tileId) && bDay === 1) {
        pendingCount++;
        accountedTiles.add(tileId);
      }
    }
    counts.pending = pendingCount;
    counts.unassessed = Math.max(0, totalCatalogued - accountedTiles.size);
  } else {
    counts.unassessed = remaining;
  }

  return counts;
}
