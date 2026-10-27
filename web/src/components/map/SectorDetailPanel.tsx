'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { X, MapPin, Maximize2, Calendar, ShieldAlert, ArrowRight, Layers, AlertTriangle, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { STATUS_META, SectorStatusCode } from '@/lib/status';
import { InvestigationReport } from '@/types/incident';
import { assetUrl } from '@/lib/data';

interface SectorDetailPanelProps {
  sectorId: string;
  district: string;
  region: string;
  landAreaKm2: number;
  status: SectorStatusCode;
  bbox?: [number, number, number, number];
  tileState?: {
    status?: string;
    reason?: string;
    last_monitored?: string;
    last_attempt?: string;
    terrestrial_area_km2?: number;
  };
  sectorCandidates: InvestigationReport[];
  onClose: () => void;
}

export default function SectorDetailPanel({
  sectorId,
  district,
  region,
  landAreaKm2,
  status,
  bbox,
  tileState,
  sectorCandidates,
  onClose,
}: SectorDetailPanelProps) {
  // Listen for Esc key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const meta = STATUS_META[status] || STATUS_META.unassessed;
  const isAssessed = status !== 'unassessed' && status !== 'pending';

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-[440px] bg-[#070c16]/95 backdrop-blur-xl border-l border-[#1e293b] shadow-2xl flex flex-col font-sans text-xs transition-transform duration-300 ease-out"
      role="dialog"
      aria-labelledby="sector-panel-title"
      aria-modal="true"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#1e293b] flex items-center justify-between bg-[#0b121e]/80">
        <div className="flex items-center space-x-2 font-mono">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
          <h2 id="sector-panel-title" className="text-base font-bold text-white tracking-wider">
            {sectorId}
          </h2>
          <span className="text-[10px] text-slate-400 font-sans">
            ({district}, {region})
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
          aria-label="Close sector details panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Status Chip & Definition */}
        <div className="space-y-1.5 p-3 rounded-lg border border-[#1e293b] bg-[#0a101d]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400">Sector Status</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${meta.badgeClass}`}>
              {meta.shortLabel.toUpperCase()}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans mt-1">
            {meta.description}
          </p>
        </div>

        {/* Spatial Properties Grid */}
        <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px]">
          <div className="p-2.5 rounded bg-[#0b1322] border border-[#1e293b]">
            <span className="text-slate-500 text-[10px] uppercase">Terrestrial Land</span>
            <div className="text-white font-bold text-sm mt-0.5">{landAreaKm2.toFixed(2)} km²</div>
            <span className="text-[10px] text-slate-400 font-sans">
              {((landAreaKm2 / 225.0) * 100).toFixed(1)}% of 15×15 km cell
            </span>
          </div>

          <div className="p-2.5 rounded bg-[#0b1322] border border-[#1e293b]">
            <span className="text-slate-500 text-[10px] uppercase">Agro-Climatic Zone</span>
            <div className="text-white font-bold text-sm mt-0.5 truncate">{region}</div>
            <span className="text-[10px] text-slate-400 font-sans">{district} District</span>
          </div>
        </div>

        {/* Bounding Box & Coordinates */}
        {bbox && (
          <div className="p-2.5 rounded bg-[#0b1322] border border-[#1e293b] font-mono text-[11px] space-y-1">
            <div className="flex items-center space-x-1 text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] uppercase">Geographic Footprint (WGS84)</span>
            </div>
            <div className="text-slate-300 text-[11px]">
              Lon: [{bbox[0].toFixed(4)}°, {bbox[2].toFixed(4)}°E]
            </div>
            <div className="text-slate-300 text-[11px]">
              Lat: [{bbox[1].toFixed(4)}°, {bbox[3].toFixed(4)}°N]
            </div>
          </div>
        )}

        {/* Telemetry Observations (When assessed) */}
        {isAssessed ? (
          <div className="space-y-2 p-3 rounded-lg border border-[#1e293b] bg-[#0b1322]">
            <div className="flex items-center space-x-1.5 text-slate-300 font-mono font-semibold text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>SATELLITE OBSERVATION METADATA</span>
            </div>
            <div className="divide-y divide-[#1e293b] text-[11px] font-mono">
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Last Checked:</span>
                <span className="text-slate-200">
                  {tileState?.last_monitored
                    ? new Date(tileState.last_monitored).toLocaleDateString()
                    : 'Not recorded'}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Telemetry Engine:</span>
                <span className="text-emerald-400">OpenCV 5 Core (Zero NDVI)</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Observation Cadence:</span>
                <span className="text-slate-300">21-Day Geographically Interleaved</span>
              </div>
              {tileState?.reason && (
                <div className="py-1.5 flex flex-col space-y-1">
                  <span className="text-slate-400">Processing Note:</span>
                  <span className="text-amber-300 text-[10px]">{tileState.reason}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg border border-[#1e293b] bg-[#05070a] text-slate-400 text-[11px] space-y-1 font-sans">
            <span className="font-mono text-slate-300 uppercase text-[10px]">Pilot Status</span>
            <p className="leading-relaxed">
              No satellite observations have been ingested for this sector during the initial representative pilot.
              Scheduled for batch monitoring in the 21-day statewide cadence.
            </p>
          </div>
        )}

        {/* Candidate Detections in this sector */}
        {sectorCandidates.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between font-mono">
              <span className="text-amber-400 font-bold flex items-center space-x-1.5 text-xs">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>UNCONFIRMED SATELLITE-CHANGE CANDIDATES ({sectorCandidates.length} EVENTS)</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Map displays approximate event extents (connected-component bounding boxes). Pixel-accurate morphological difference masks are viewable in individual dossiers.
            </p>

            <div className="space-y-2">
              {sectorCandidates.map((c) => (
                <div
                  key={c.incident_id}
                  className="p-3 rounded border border-amber-900/50 bg-[#0d1624] space-y-2 hover:border-amber-600/70 transition"
                >
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="font-bold text-amber-300">{c.incident_id}</span>
                    <span className="text-slate-400">{c.report_date}</span>
                  </div>

                  <p className="text-[11px] text-white font-medium line-clamp-2 leading-snug">
                    {c.report_title}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                    <span className="flex items-center space-x-1">
                      <Maximize2 className="w-3 h-3 text-amber-400" />
                      <span className="text-white font-semibold">
                        {c.affected_area_hectares.toFixed(2)} ha
                      </span>
                    </span>
                    <Link
                      href={`/investigations#${c.incident_id}`}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 hover:underline text-[10px]"
                    >
                      <span>View Dossier</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Disclaimer */}
      <div className="p-3 border-t border-[#1e293b] bg-[#05070a] text-[10px] text-slate-500 font-mono flex items-center justify-between">
        <span>Press ESC to close</span>
        <span>EPSG:7755 Canonical Grid</span>
      </div>
    </aside>
  );
}
