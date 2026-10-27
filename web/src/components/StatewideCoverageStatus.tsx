'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Layers, Activity } from 'lucide-react';
import { fetchMonitoringState, MonitoringState } from '@/lib/data';

interface ZoneStatus {
  name: string;
  districts: string;
  totalTiles: number;
}

const AGRO_CLIMATIC_ZONES: ZoneStatus[] = [
  { name: 'Western Ghats / Sahyadri', districts: 'Satara, Kolhapur, Pune, Nashik', totalTiles: 218 },
  { name: 'Konkan Coastal Belt', districts: 'Sindhudurg, Ratnagiri, Raigad, Thane, Palghar', totalTiles: 194 },
  { name: 'Vidarbha Eastern Belt', districts: 'Chandrapur, Gadchiroli, Gondia, Bhandara, Nagpur', totalTiles: 312 },
  { name: 'Melghat / Satpura Highlands', districts: 'Amravati, Akola, Buldhana', totalTiles: 165 },
  { name: 'Khandesh / Tapi Basin', districts: 'Nandurbar, Dhule, Jalgaon', totalTiles: 142 },
  { name: 'Marathwada Plateau', districts: 'Nanded, Latur, Beed, Parbhani, Jalna, Osmanabad', totalTiles: 236 },
  { name: 'Desh / Deccan Plateau', districts: 'Solapur, Sangli, Ahmednagar', totalTiles: 212 },
];

export default function StatewideCoverageStatus() {
  const [monitoringState, setMonitoringState] = useState<MonitoringState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchMonitoringState().then((state) => {
      if (mounted) {
        setMonitoringState(state);
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const totalStatewideTiles = 1479;
  // Authoritative Maharashtra terrestrial boundary area in equal-area projection
  // ESRI:102008 (South Asia Albers Equal Area Conic) & EPSG:6933: 307,492.71 km²
  // Survey of India / Census 2011 official published area: 307,713 km²
  // (EPSG:7755 LCC is conformal, giving 297,650.36 km² due to -3.2% scale compression)
  const totalTerrestrialAreaKm2 = 307492.71;

  const tileStates = monitoringState?.tiles || {};
  const evaluatedCount = Object.keys(tileStates).length;

  let candidateCount = 0;
  let noChangeCount = 0;
  let incompleteCount = 0;

  Object.values(tileStates).forEach((tile) => {
    if (tile.status === 'monitored_candidate_detected') {
      candidateCount += 1;
    } else if (tile.status === 'monitored_no_change') {
      noChangeCount += 1;
    } else {
      incompleteCount += 1;
    }
  });

  const processedCount = candidateCount + noChangeCount;
  const monitoredTerrestrialKm2 = monitoringState?.monitored_terrestrial_area_km2 ?? 390.86;
  const areaCoveragePercent = ((monitoredTerrestrialKm2 / totalTerrestrialAreaKm2) * 100).toFixed(2);
  const sectorCoveragePercent = ((evaluatedCount / totalStatewideTiles) * 100).toFixed(2);

  return (
    <section className="border border-[#1e293b] bg-[#0a101d] rounded-lg p-6 space-y-6">
      {/* Scope Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Scope: Full Maharashtra Statewide Terrestrial Monitoring</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Statewide Geographic Grid & Pilot Verification Status
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic 15 km × 15 km canonical grid (EPSG:7755) covering 307,492.71 km² terrestrial area across all 36 administrative districts.
          </p>
        </div>

        {/* Operational Warning Banner */}
        <div className="flex items-center space-x-2.5 px-3 py-2 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-mono shrink-0">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <span className="font-semibold uppercase tracking-wide">STAGED PILOT MODE</span>
            <p className="text-[11px] text-amber-200/80">Statewide monitoring has NOT completed. Automated schedules disabled.</p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div className="bg-[#0e1726] border border-[#1e293b] rounded p-3">
          <span className="text-slate-400 text-[11px]">Total Grid Sectors</span>
          <div className="text-lg font-bold text-white mt-1">
            {totalStatewideTiles.toLocaleString()} <span className="text-xs font-normal text-slate-400">cells</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">15 km × 15 km fixed grid (EPSG:7755)</p>
        </div>

        <div className="bg-[#0e1726] border border-[#1e293b] rounded p-3">
          <span className="text-slate-400 text-[11px]">Sectors Evaluated</span>
          <div className="text-lg font-bold text-white mt-1">
            {isLoading ? '...' : `${evaluatedCount} / ${totalStatewideTiles}`}
            <span className="text-xs font-normal text-slate-400 ml-1">({sectorCoveragePercent}%)</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {processedCount} processed ({candidateCount} candidate, {noChangeCount} no qualifying change), {incompleteCount} incomplete
          </p>
        </div>

        <div className="bg-[#0e1726] border border-[#1e293b] rounded p-3">
          <span className="text-slate-400 text-[11px]">Monitored Land Area</span>
          <div className="text-lg font-bold text-white mt-1">
            {isLoading ? '...' : `${monitoredTerrestrialKm2.toLocaleString()} km²`}
            <span className="text-xs font-normal text-amber-400 ml-1">({areaCoveragePercent}%)</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Denominator: 307,492.71 km² complete GIS 36-district boundary union (Survey of India: 307,713 km²)
          </p>
        </div>

        <div className="bg-[#0e1726] border border-[#1e293b] rounded p-3">
          <span className="text-slate-400 text-[11px]">Target Observation Cadence</span>
          <div className="text-lg font-bold text-emerald-400 mt-1">
            {monitoringState?.cadence_days || 21} <span className="text-xs font-normal text-slate-400">days</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Geographically interleaved daily batches</p>
        </div>
      </div>

      {/* Agro-Climatic Zone Coverage Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 font-semibold flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>AGRO-CLIMATIC MONITORING ZONES</span>
          </span>
          <span className="text-slate-400 text-[11px]">7 Biomes • 36 Districts • 1,479 Sectors Total</span>
        </div>

        <div className="overflow-x-auto border border-[#1e293b] rounded bg-[#0b1322]">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1e293b] text-slate-400 bg-slate-900/60 text-[11px]">
                <th className="py-2 px-3">Agro-Climatic Zone</th>
                <th className="py-2 px-3">Sample Districts</th>
                <th className="py-2 px-3 text-right">Total Sectors</th>
                <th className="py-2 px-3 text-right">Pilot Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/60 text-[11px]">
              {AGRO_CLIMATIC_ZONES.map((zone) => (
                <tr key={zone.name} className="hover:bg-slate-900/40">
                  <td className="py-2 px-3 text-white font-medium">{zone.name}</td>
                  <td className="py-2 px-3 text-slate-400">{zone.districts}</td>
                  <td className="py-2 px-3 text-right text-slate-300">{zone.totalTiles}</td>
                  <td className="py-2 px-3 text-right">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
                      Scheduled in 21-day cycle
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
