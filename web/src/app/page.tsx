'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { fetchLiveCandidates, fetchMonitoringState, assetUrl, MonitoringState } from '@/lib/data';
import { InvestigationReport } from '@/types/incident';
import StatewideCoverageStatus from '@/components/StatewideCoverageStatus';
import {
  Cpu,
  CheckCircle,
  Eye,
  ArrowRight,
  AlertTriangle,
  Layers,
  Terminal,
  Shield,
  Maximize2,
  Calendar,
  MapPin,
  ExternalLink
} from 'lucide-react';

const GlobeHero = dynamic(() => import('@/components/home/GlobeHero'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[660px] bg-[#05070a] border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-xs font-mono text-slate-400 space-y-3">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
      <span>INITIALIZING EARTH OBSERVATION ORBIT & MAHARASHTRA GRID...</span>
    </div>
  ),
});

export default function Home() {
  const [candidates, setCandidates] = useState<InvestigationReport[]>([]);
  const [monitoringState, setMonitoringState] = useState<MonitoringState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchLiveCandidates(), fetchMonitoringState()])
      .then(([candidatesData, stateData]) => {
        if (!mounted) return;
        setCandidates(candidatesData);
        setMonitoringState(stateData);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load home page data:', err);
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Filter genuine non-synthetic candidates only
  const genuineCandidates = candidates.filter((c) => !c.is_synthetic_test);
  const previewCandidates = genuineCandidates.slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Cinematic Earth Observation Globe Hero */}
      <GlobeHero
        monitoringState={monitoringState}
        candidates={genuineCandidates}
      />

      {/* 2. Operational Architecture Badges */}
      <div className="border border-slate-800 bg-[#0b121e] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-slate-800/80 gap-3">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-forest-950 border border-forest-800 text-forest-300 text-xs font-mono">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>OpenCV AI Competition 2026 — Agentic Vision Special Award Entry</span>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href="/explore"
              className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-300 text-xs font-mono font-semibold transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Explore 1,479-Sector Map</span>
            </Link>
            <Link
              href="/status"
              className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition"
            >
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Methodology & Cadence</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="flex items-start space-x-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-white font-semibold">OpenCV 5 Classical Vision</span>
              <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed font-sans">
                CIE L*a*b* directional chromatic delta + Laplacian canopy roughness variance. Strict zero-NDVI architecture eliminates false positives from seasonal green-up.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-white font-semibold">Closed-Loop Agentic Research</span>
              <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed font-sans">
                Vision geometry dictates research targets (linear corridors trigger Parivesh infrastructure queries; clearing cores trigger gazette searches).
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-white font-semibold">Evidence Integrity & Audit Trails</span>
              <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed font-sans">
                Every candidate is an unconfirmed satellite finding awaiting ground verification. Synthetic test fixtures strictly excluded from live telemetry.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Statewide Coverage & Pilot Status Matrix */}
      <StatewideCoverageStatus />

      {/* 4. Candidate Investigations Spotlight Section */}
      <section id="candidates" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e293b]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wide">
                Unconfirmed Satellite-Change Candidates (Pilot Feed)
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Autonomous detections (&ge; 1.0 ha) across Western Ghats pilot sectors with Snyder LCC uncertainty metrics.
            </p>
          </div>

          <Link
            href="/investigations"
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-amber-950/70 hover:bg-amber-900 border border-amber-600/60 text-amber-300 font-mono text-xs font-semibold transition"
          >
            <span>View All {genuineCandidates.length} Candidates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Candidate Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {previewCandidates.map((candidate) => {
            const [lon, lat] = candidate.geographic_coordinates;
            const uncertainty = candidate.measurement_uncertainty_hectares || 0.25;
            const lowerBound = Math.max(0, candidate.affected_area_hectares - uncertainty);
            const upperBound = candidate.affected_area_hectares + uncertainty;
            const parentSectorId = candidate.incident_id.match(/MH-R\d+-C\d+/)?.[0] || 'MH-R07-C09';
            const district = parentSectorId === 'MH-R01-C06' ? 'Sindhudurg' : 'Kolhapur';
            const beforeImg = assetUrl(`/data/artifacts/${candidate.incident_id}/before.png`);
            const afterImg = assetUrl(`/data/artifacts/${candidate.incident_id}/after.png`);

            return (
              <div
                key={candidate.incident_id}
                className="rounded-xl border border-slate-800 bg-[#080d16] p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition"
              >
                {/* Header Strip */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60">
                      [UNCONFIRMED CANDIDATE]
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {parentSectorId}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold font-mono text-white truncate" title={candidate.incident_id}>
                    {candidate.incident_id}
                  </h3>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{district}</span>
                    </span>
                    <span className="text-slate-500 capitalize">{candidate.visual_geometry.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Satellite Observation Thumbnail Pair */}
                <div className="grid grid-cols-2 gap-2 my-1">
                  <div className="relative rounded overflow-hidden border border-slate-800 bg-slate-900 aspect-square">
                    <img
                      src={beforeImg}
                      alt={`Historical observation for ${candidate.incident_id}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-slate-300">
                      Before
                    </span>
                  </div>

                  <div className="relative rounded overflow-hidden border border-slate-800 bg-slate-900 aspect-square">
                    <img
                      src={afterImg}
                      alt={`Recent observation for ${candidate.incident_id}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-emerald-300">
                      After
                    </span>
                  </div>
                </div>

                {/* Telemetry Strip */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase">Candidate Area:</span>
                    <span className="text-amber-400 font-bold">
                      {candidate.affected_area_hectares.toFixed(2)} ha
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>Uncertainty Bounds:</span>
                    <span>{lowerBound.toFixed(2)}–{upperBound.toFixed(2)} ha</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>Coordinates:</span>
                    <span>{lat.toFixed(4)}° N, {lon.toFixed(4)}° E</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs font-mono">
                  <Link
                    href={`/explore?sector=${parentSectorId}`}
                    className="text-[11px] text-slate-400 hover:text-emerald-300 transition"
                  >
                    View on Map
                  </Link>

                  <Link
                    href={`/investigations/${candidate.incident_id}`}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white text-[11px] font-semibold transition"
                  >
                    <span>Dossier & Slider</span>
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Feed Link Banner */}
        <div className="p-4 rounded-xl bg-[#0b121e] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2 text-slate-300">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              All {genuineCandidates.length} candidate reports feature interactive WAI-ARIA before/after sliders, OpenCV masks, and closed-loop research audit traces.
            </span>
          </div>

          <Link
            href="/investigations"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition shrink-0 shadow-md"
          >
            Launch Investigations Platform
          </Link>
        </div>
      </section>

      {/* 5. Vision Specification & Methodology Explainer */}
      <section id="methodology" className="border border-slate-800 bg-[#090f19] rounded-xl p-6 space-y-4">
        <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 font-semibold uppercase">
          <Terminal className="w-4 h-4" />
          <span>TECHNICAL SPECIFICATION & OPENCV 5 PIPELINE INTEGRITY</span>
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">
          How Forest Guard Detects & Quantifies Without Spectral Indices
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed font-sans">
          <div className="space-y-2">
            <h3 className="font-semibold text-white font-mono text-xs uppercase tracking-wide text-emerald-400">
              1. Sub-pixel Registration & Reinhard Illumination Normalization
            </h3>
            <p>
              Scenes are coregistered using ORB homography with sub-pixel Enhanced Correlation Coefficient (ECC) optimization. 
              Before differencing, Reinhard statistical color transfer in CIE L*a*b* space matches channel means and standard deviations, 
              effectively canceling broad seasonal lighting and atmospheric differences without distorting local clearing edges.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-white font-mono text-xs uppercase tracking-wide text-emerald-400">
              2. Structural Chromatic & Textural Differencing (Zero-NDVI)
            </h3>
            <p>
              In CIE L*a*b* space, channel a* directly captures greenness (&lt; 128) versus soil redness/brown (&gt; 128). 
              Changes are extracted via directional shift along a* modulated by Euclidean chromatic delta and high-frequency Laplacian 
              canopy roughness variance. Connected components are scale-corrected using Snyder (1987) Lambert Conformal Conic point scale factor equations.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
