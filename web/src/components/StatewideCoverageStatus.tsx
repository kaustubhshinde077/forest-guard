'use client';

import React from 'react';
import { MapPin, AlertCircle, ShieldCheck, Clock, Layers, Activity } from 'lucide-react';

interface ZoneStatus {
  name: string;
  districts: string;
  totalTiles: number;
  monitoredTiles: number;
  status: 'pilot_benchmarked' | 'pending_batch';
}

const AGRO_CLIMATIC_ZONES: ZoneStatus[] = [
  { name: 'Western Ghats / Sahyadri', districts: 'Satara, Kolhapur, Pune, Nashik', totalTiles: 218, monitoredTiles: 1, status: 'pilot_benchmarked' },
  { name: 'Konkan Coastal Belt', districts: 'Sindhudurg, Ratnagiri, Raigad, Thane, Palghar', totalTiles: 194, monitoredTiles: 1, status: 'pilot_benchmarked' },
  { name: 'Vidarbha Eastern Belt', districts: 'Chandrapur, Gadchiroli, Gondia, Bhandara, Nagpur', totalTiles: 312, monitoredTiles: 1, status: 'pilot_benchmarked' },
  { name: 'Melghat / Satpura Highlands', districts: 'Amravati, Akola, Buldhana', totalTiles: 165, monitoredTiles: 1, status: 'pilot_benchmarked' },
  { name: 'Khandesh / Tapi Basin', districts: 'Nandurbar, Dhule, Jalgaon', totalTiles: 142, monitoredTiles: 0, status: 'pending_batch' },
  { name: 'Marathwada Plateau', districts: 'Nanded, Latur, Beed, Parbhani, Jalna, Osmanabad', totalTiles: 236, monitoredTiles: 0, status: 'pending_batch' },
  { name: 'Desh / Deccan Plateau', districts: 'Solapur, Sangli, Ahmednagar', totalTiles: 212, monitoredTiles: 0, status: 'pending_batch' },
];

export default function StatewideCoverageStatus() {
  const totalStatewideTiles = 1479;
  const totalMonitoredTiles = 4; // Empirical 4-sector benchmark
  const totalTerrestrialAreaKm2 = 297650.35;
  const monitoredAreaKm2 = 900.0; // 4 sectors x 225 km²

  return (
    <section className="border border-slate-800 bg-[#0a101d] rounded-lg p-6 space-y-6">
      {/* Scope Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Scope: Full Maharashtra Statewide Terrestrial Monitoring</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Statewide Geographic Grid & Pilot Verification Status
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Approved scope covers all 36 administrative districts via a deterministic 15 km × 15 km canonical grid (EPSG:7755).
          </p>
        </div>

        {/* Operational Warning Banner */}
        <div className="flex items-center space-x-2.5 px-3 py-2 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-mono shrink-0">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <span className="font-semibold">STAGED PILOT MODE</span>
            <p className="text-[11px] text-amber-200/80">Statewide monitoring has NOT completed. Automated schedules disabled.</p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div className="bg-[#0e1726] border border-slate-800/80 rounded p-3">
          <span className="text-slate-400 text-[11px]">Total Grid Sectors</span>
          <div className="text-lg font-bold text-white mt-1">1,479 <span className="text-xs font-normal text-slate-500">cells</span></div>
          <p className="text-[10px] text-slate-500 mt-0.5">15 km × 15 km fixed grid (EPSG:7755)</p>
        </div>

        <div className="bg-[#0e1726] border border-slate-800/80 rounded p-3">
          <span className="text-slate-400 text-[11px]">State Terrestrial Area</span>
          <div className="text-lg font-bold text-white mt-1">297,650 <span className="text-xs font-normal text-slate-500">km²</span></div>
          <p className="text-[10px] text-slate-500 mt-0.5">36-district boundary equal-area union</p>
        </div>

        <div className="bg-[#0e1726] border border-slate-800/80 rounded p-3">
          <span className="text-slate-400 text-[11px]">Daily Batch Allocation</span>
          <div className="text-lg font-bold text-white mt-1">70–71 <span className="text-xs font-normal text-slate-500">tiles/day</span></div>
          <p className="text-[10px] text-slate-500 mt-0.5">21-day cycle; multi-biome interleaving</p>
        </div>

        <div className="bg-[#0e1726] border border-slate-800/80 rounded p-3">
          <span className="text-slate-400 text-[11px]">Verified Pilot Coverage</span>
          <div className="text-lg font-bold text-amber-400 mt-1">4 / 1,479 <span className="text-xs font-normal text-slate-500">tiles (0.27%)</span></div>
          <p className="text-[10px] text-slate-500 mt-0.5">Koyna, Tillari, Tadoba, Melghat</p>
        </div>
      </div>

      {/* Agro-Climatic Zone Coverage Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 font-semibold flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>AGRO-CLIMATIC MONITORING ZONES</span>
          </span>
          <span className="text-slate-500 text-[11px]">7 Biomes • 36 Districts</span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded bg-[#0b1322]">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60 text-[11px]">
                <th className="py-2 px-3">Agro-Climatic Zone</th>
                <th className="py-2 px-3">Sample Districts</th>
                <th className="py-2 px-3 text-right">Total Sectors</th>
                <th className="py-2 px-3 text-right">Pilot Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-[11px]">
              {AGRO_CLIMATIC_ZONES.map((zone) => (
                <tr key={zone.name} className="hover:bg-slate-900/40">
                  <td className="py-2 px-3 text-white font-medium">{zone.name}</td>
                  <td className="py-2 px-3 text-slate-400">{zone.districts}</td>
                  <td className="py-2 px-3 text-right text-slate-300">{zone.totalTiles}</td>
                  <td className="py-2 px-3 text-right">
                    {zone.status === 'pilot_benchmarked' ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px]">
                        Benchmarked (1 tile)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                        Pending Scheduled Batch
                      </span>
                    )}
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
