'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  fetchMonitoringState,
  fetchLiveCandidates,
  fetchSectorsGeoJSON,
  MonitoringState,
} from '@/lib/data';
import { resolveSectorStatus, SectorStatusCode } from '@/lib/status';
import { InvestigationReport } from '@/types/incident';
import StatusOverviewHero from '@/components/status/StatusOverviewHero';
import MonitoringMetricsGrid from '@/components/status/MonitoringMetricsGrid';
import SectorInventoryTable, { SectorItem } from '@/components/status/SectorInventoryTable';
import PipelineMethodologySection from '@/components/status/PipelineMethodologySection';
import CadenceSafeguardsSection from '@/components/status/CadenceSafeguardsSection';
import DataSourcesLicencesSection from '@/components/status/DataSourcesLicencesSection';

export default function StatusPage() {
  const [monitoringState, setMonitoringState] = useState<MonitoringState | null>(null);
  const [candidates, setCandidates] = useState<InvestigationReport[]>([]);
  const [sectorsGeoJSON, setSectorsGeoJSON] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchMonitoringState(),
      fetchLiveCandidates(),
      fetchSectorsGeoJSON(),
    ])
      .then(([mState, cList, sGeo]) => {
        if (mounted) {
          setMonitoringState(mState);
          setCandidates(cList);
          setSectorsGeoJSON(sGeo);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load status page data:', err);
        if (mounted) {
          setDataError('Failed to load operational telemetry and sector inventory data.');
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Compute structured SectorItem list across all 1,479 sectors
  const sectorItems: SectorItem[] = useMemo(() => {
    if (!sectorsGeoJSON || !sectorsGeoJSON.features) return [];
    const tileStates = monitoringState?.tiles || {};

    return sectorsGeoJSON.features.map((f: any) => {
      const p = f.properties || {};
      const id: string = p.id || '';
      const tileRecord = tileStates[id];
      const status: SectorStatusCode = resolveSectorStatus(id, tileRecord, p.b);

      return {
        id,
        district: p.d || 'Unknown',
        region: p.r || 'Deccan Plateau',
        batchDay: p.b || 1,
        landAreaKm2: p.a || 0,
        isForestPriority: Boolean(p.f),
        status,
        lastMonitored: tileRecord?.last_monitored,
        lastAttempt: tileRecord?.last_attempt,
        reason: tileRecord?.reason,
      };
    });
  }, [sectorsGeoJSON, monitoringState]);

  // Total affected area in hectares from genuine candidate reports
  const totalCandidateAreaHa = useMemo(() => {
    return candidates.reduce((sum, c) => sum + (c.affected_area_hectares || 0), 0);
  }, [candidates]);

  return (
    <div className="min-h-screen bg-ink-950 font-sans text-ice-100 pb-20">
      {/* 1. Page Header & Scope Notice Hero (Full Bleed) */}
      <StatusOverviewHero
        lastSuccessfulRun={monitoringState?.last_successful_run}
        totalCatalogueSectors={sectorItems.length || 1479}
        evaluatedSectorsCount={Object.keys(monitoringState?.tiles || {}).length || 5}
      />

      {dataError && !sectorsGeoJSON && (
        <div role="alert" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="panel rounded-3xl p-6 sm:p-8 border border-red-500/30 bg-red-500/[0.04] text-center space-y-3">
            <p className="text-red-400 font-bold uppercase tracking-wider text-xs font-mono">Telemetry Data Contract Failure</p>
            <p className="text-ice-300 text-sm">{dataError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 transition text-xs font-mono"
            >
              Retry Loading Telemetry
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* 2. Operational Monitoring Metrics & Coverage Transparency */}
        <MonitoringMetricsGrid
          monitoringState={monitoringState}
          candidatesCount={candidates.length}
          totalCandidateAreaHa={totalCandidateAreaHa}
          totalSectorsCount={sectorItems.length || 1479}
        />

        {/* 3. Searchable 1,479-Sector Inventory Table */}
        <SectorInventoryTable sectors={sectorItems} />

        {/* 4. 7-Stage OpenCV 5 Classical Vision Pipeline */}
        <PipelineMethodologySection />

        {/* 5. Intended 21-Day Cadence & Strict Safeguard Rules */}
        <CadenceSafeguardsSection />

        {/* 6. Public Data Sources, Legal Licences & CRS Mathematics */}
        <DataSourcesLicencesSection />
      </div>
    </div>
  );
}
