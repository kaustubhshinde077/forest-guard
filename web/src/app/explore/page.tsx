'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchMonitoringState, fetchLiveCandidates, MonitoringState } from '@/lib/data';
import { InvestigationReport } from '@/types/incident';

// Dynamically import MapLibreExplorer with SSR disabled so non-map bundles stay small
const MapLibreExplorer = dynamic(
  () => import('@/components/map/MapLibreExplorer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[calc(100vh-64px)] mt-16 bg-[#05070a] flex flex-col items-center justify-center font-mono text-xs text-slate-400 space-y-3">
        <div className="w-6 h-6 border-2 border-emerald-500/40 border-t-emerald-400 rounded-full animate-spin" />
        <div className="text-slate-300 font-semibold tracking-wider">
          INITIALIZING GEOSPATIAL CORE & SECTOR GRID...
        </div>
        <div className="text-[11px] text-slate-500">
          Loading 1,479 canonical sectors (EPSG:7755) and telemetry state
        </div>
      </div>
    ),
  }
);

export default function ExplorePage() {
  const [monitoringState, setMonitoringState] = useState<MonitoringState | null>(null);
  const [candidates, setCandidates] = useState<InvestigationReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchMonitoringState(), fetchLiveCandidates()]).then(([state, liveCandidates]) => {
      if (mounted) {
        setMonitoringState(state);
        setCandidates(liveCandidates);
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="w-full h-[calc(100vh-64px)] mt-16 bg-[#05070a] overflow-hidden">
      <MapLibreExplorer
        monitoringState={monitoringState}
        candidates={candidates}
      />
    </div>
  );
}
