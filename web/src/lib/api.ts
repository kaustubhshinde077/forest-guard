/**
 * Forest Guard — Legacy API compatibility wrapper
 * Delegates directly to the static data layer (web/src/lib/data.ts)
 * Zero dependency on running backend API servers.
 */

import { InvestigationReport } from '@/types/incident';
import { assetUrl, fetchLiveCandidates, fetchReportById } from './data';

export const getAssetUrl = assetUrl;

export async function fetchIncidents(): Promise<InvestigationReport[]> {
  return await fetchLiveCandidates();
}

export async function fetchIncidentById(id: string): Promise<InvestigationReport | null> {
  return await fetchReportById(id);
}
