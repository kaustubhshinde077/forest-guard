'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { fetchIncidents } from '@/lib/api';
import { InvestigationReport } from '@/types/incident';
import IncidentFeed from '@/components/IncidentFeed';
import IncidentDetailView from '@/components/IncidentDetailView';
import StatewideCoverageStatus from '@/components/StatewideCoverageStatus';
import { Shield, Eye, Database, Terminal, Cpu, CheckCircle, RefreshCw } from 'lucide-react';


const InteractiveMap = dynamic(() => import('@/components/InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[480px] bg-[#080d16] border border-slate-800 rounded-lg flex items-center justify-center text-xs font-mono text-slate-400">
      Loading Western Ghats Geospatial Map Layer...
    </div>
  ),
});

export default function Home() {
  const [incidents, setIncidents] = useState<InvestigationReport[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchIncidents();
    setIncidents(data);
    if (data.length > 0 && !selectedIncidentId) {
      setSelectedIncidentId(data[0].incident_id);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedIncident = incidents.find((inc) => inc.incident_id === selectedIncidentId) || incidents[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Overview */}
      <div className="border border-slate-800 bg-[#0b121e] rounded-lg p-6">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-forest-950 border border-forest-800 text-forest-300 text-xs font-mono mb-3">
            <Cpu className="w-3.5 h-3.5" />
            <span>OpenCV AI Competition 2026 — Agentic Vision Special Award</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Autonomous Forest Change Detection & Investigation Platform
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Forest Guard monitors Copernicus Sentinel-2 satellite imagery across Maharashtra&apos;s 36 administrative districts, 
            detects structural canopy change using pure OpenCV 5 classical vision (strictly without NDVI), 
            and dispatches Google Gemini to investigate official gazettes, clearances, and public records.
          </p>
        </div>

        {/* Operational Architecture Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs font-mono">
          <div className="flex items-start space-x-2.5">
            <CheckCircle className="w-4 h-4 text-forest-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-white font-semibold">OpenCV 5 Core Vision</span>
              <p className="text-slate-400 text-[11px] mt-0.5">CIE Lab chromatic delta (a*) + Laplacian texture variance. No NDVI vegetation indices.</p>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <CheckCircle className="w-4 h-4 text-forest-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-white font-semibold">Closed-Loop Agentic Research</span>
              <p className="text-slate-400 text-[11px] mt-0.5">Vision geometry dictates research targets (linear corridors trigger Parivesh infrastructure queries).</p>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <CheckCircle className="w-4 h-4 text-forest-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-white font-semibold">Evidence Integrity & Audit Trails</span>
              <p className="text-slate-400 text-[11px] mt-0.5">Full decision trace per incident. FSI stem density bounds. Explicit synthetic test isolation.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statewide Coverage & Pilot Status */}
      <StatewideCoverageStatus />

      {/* Main Grid: Interactive Map + Incident Feed */}
      <section id="incidents" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <InteractiveMap
            incidents={incidents}
            selectedId={selectedIncidentId}
            onSelectIncident={setSelectedIncidentId}
          />

          {/* Active Incident Dossier */}
          {selectedIncident && (
            <IncidentDetailView incident={selectedIncident} />
          )}
        </div>

        {/* Feed Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <Database className="w-4 h-4 text-forest-400" />
              <span>INCIDENT AUDIT FEED</span>
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 transition"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Sync API</span>
              </button>
              <span className="text-xs font-mono text-slate-400">{incidents.length} Records</span>
            </div>
          </div>

          <IncidentFeed
            incidents={incidents}
            selectedId={selectedIncidentId}
            onSelectIncident={setSelectedIncidentId}
          />
        </div>
      </section>

      {/* Vision Specification & Methodology Explainer */}
      <section id="methodology" className="border border-slate-800 bg-[#090f19] rounded-lg p-6 space-y-4">
        <div className="flex items-center space-x-2 text-xs font-mono text-forest-400 font-semibold uppercase">
          <Terminal className="w-4 h-4" />
          <span>TECHNICAL SPECIFICATION & OPENCV 5 PIPELINE INTEGRITY</span>
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">
          How Forest Guard Detects & Quantifies Without Spectral Indices
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed">
          <div className="space-y-2">
            <h3 className="font-semibold text-white font-mono">1. Sub-pixel Registration & Reinhard Illumination Normalization</h3>
            <p>
              Scenes are coregistered using ORB homography with sub-pixel Enhanced Correlation Coefficient (ECC) optimization. 
              Before differencing, Reinhard statistical color transfer in CIE Lab space matches channel means and standard deviations, 
              effectively canceling broad seasonal lighting and atmospheric differences without distorting local clearing edges.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-white font-mono">2. Structural Chromatic & Textural Differencing</h3>
            <p>
              In CIE Lab space, channel a* directly captures greenness (&lt;128) versus soil redness/brown (&gt;128). 
              Changes are extracted via directional shift along a* modulated by Euclidean distance (ΔE) and high-frequency Laplacian 
              canopy roughness variance. Connected components are quantified in discrete pixels (10m ground resolution = 0.01 ha/px).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
