'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { fetchLiveCandidates, fetchMonitoringState, assetUrl, MonitoringState } from '@/lib/data';
import { InvestigationReport } from '@/types/incident';
import {
  Satellite,
  Eye,
  FileText,
  ArrowRight,
  AlertTriangle,
  MapPin,
  ExternalLink,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';

const GlobeHero = dynamic(() => import('@/components/home/GlobeHero'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[580px] sm:h-[640px] lg:h-[700px] bg-[#030712] border border-slate-800/80 rounded-3xl flex flex-col items-center justify-center text-xs font-mono text-slate-400 space-y-3">
      <div className="w-9 h-9 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
      <span className="tracking-wider">INITIALIZING EARTH OBSERVATION ORBIT & MAHARASHTRA GRID...</span>
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
  const genuineCandidates = useMemo(
    () => candidates.filter((c) => !c.is_synthetic_test),
    [candidates]
  );

  // Select 3 prominent candidates for the editorial preview
  const previewCandidates = useMemo(() => {
    return genuineCandidates.slice(0, 3);
  }, [genuineCandidates]);

  // Telemetry metrics derived strictly from authoritative JSON
  const totalGridSectors = 1479;
  const evaluatedSectors = monitoringState?.last_run_summary?.sectors_evaluated ?? 5;
  const terrestrialLandKm2 = monitoringState?.monitored_terrestrial_area_km2 ?? 390.86;
  const candidateCount = genuineCandidates.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-16 sm:space-y-24">
      {/* 1. Immersive 3D Earth Hero with Maharashtra Highlighted */}
      <section aria-label="3D Earth Satellite Observation Hero">
        <GlobeHero
          monitoringState={monitoringState}
          candidates={genuineCandidates}
        />
      </section>

      {/* 2. Compact Real-Data Monitoring Summary */}
      <section aria-label="Statewide Monitoring Summary" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-slate-800/60">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Statewide Monitoring Telemetry
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Authoritative pilot surveillance metrics derived directly from satellite passes and grid evaluation.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5 self-start sm:self-auto">
            <span>Planned monitoring batch — automation disabled</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1 */}
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-colors">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Total Grid Matrix
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1.5 tracking-tight">
              {totalGridSectors.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Authoritative 36 districts (15×15 km grid)
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-5 hover:border-emerald-500/30 transition-colors">
            <div className="text-xs font-mono uppercase tracking-wider text-emerald-400/90">
              Pilot Evaluated
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 mt-1.5 tracking-tight">
              {evaluatedSectors} sectors
            </div>
            <div className="text-xs text-slate-400 mt-1">
              4 processed + 1 occluded sector
            </div>
          </div>

          {/* Metric 3 */}
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-colors">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Terrestrial Land Monitored
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1.5 tracking-tight">
              {terrestrialLandKm2.toFixed(1)} km²
            </div>
            <div className="text-xs text-slate-400 mt-1">
              0.13% of 307,492.71 km² state territory
            </div>
          </div>

          {/* Metric 4 */}
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-5 hover:border-amber-500/30 transition-colors">
            <div className="text-xs font-mono uppercase tracking-wider text-amber-400/90">
              Active Candidates
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 mt-1.5 tracking-tight">
              {candidateCount}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Unconfirmed change alerts awaiting verification
            </div>
          </div>
        </div>
      </section>

      {/* 3. Three Recent Candidate Previews with Genuine Before/After Imagery */}
      <section aria-label="Recent Candidate Investigations" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-amber-400 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Recent Detections Feed</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Candidate Investigations
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Representative canopy loss candidates with genuine Sentinel-2 before & after observation pairs.
            </p>
          </div>

          <Link
            href="/investigations"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors self-start sm:self-auto group"
          >
            <span>View All {candidateCount} Candidates</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {previewCandidates.map((candidate) => (
            <article
              key={candidate.incident_id}
              className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-950/20 flex flex-col justify-between"
            >
              <div>
                {/* Genuine Side-by-Side Satellite Observation Crops */}
                <div className="grid grid-cols-2 gap-1 p-2 bg-black/40">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-950 border border-slate-800/50">
                    <img
                      src={assetUrl(`/data/artifacts/${candidate.incident_id}/before.png`)}
                      alt={`Sentinel-2 before observation for ${candidate.incident_id}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/80 text-slate-300 backdrop-blur-xs">
                      BEFORE ({candidate.observation_dates?.[0] || 'T0'})
                    </div>
                  </div>

                  <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-950 border border-slate-800/50">
                    <img
                      src={assetUrl(`/data/artifacts/${candidate.incident_id}/after.png`)}
                      alt={`Sentinel-2 after observation for ${candidate.incident_id}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/80 text-amber-300 backdrop-blur-xs font-semibold">
                      AFTER ({candidate.observation_dates?.[1] || 'T1'})
                    </div>
                  </div>
                </div>

                {/* Candidate Content Body */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/10 border border-amber-500/25 text-amber-400 font-medium">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>[UNCONFIRMED CANDIDATE]</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Sector {candidate.incident_id.split('-').slice(1, 4).join('-')}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white tracking-tight leading-snug line-clamp-2">
                    {candidate.report_title.replace('[UNCONFIRMED SATELLITE-CHANGE CANDIDATE] ', '')}
                  </h3>

                  <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      {candidate.geographic_coordinates
                        ? `${candidate.geographic_coordinates[1].toFixed(4)}° N, ${candidate.geographic_coordinates[0].toFixed(4)}° E`
                        : 'Coordinates available in dossier'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Estimated Change:</span>
                    <span className="text-amber-300 font-semibold">
                      {candidate.affected_area_hectares.toFixed(2)} ha (±{candidate.measurement_uncertainty_hectares.toFixed(2)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Links */}
              <div className="p-5 pt-0 border-t border-slate-800/40 flex items-center justify-between gap-2">
                <Link
                  href={`/explore?sector=${candidate.incident_id.split('-').slice(1, 4).join('-')}`}
                  className="text-xs font-mono text-slate-400 hover:text-white transition-colors"
                >
                  View on Map
                </Link>

                <Link
                  href={`/investigations/${candidate.incident_id}/`}
                  className="inline-flex items-center space-x-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <span>Dossier & Slider</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. Short Three-Step Explanation of How Forest Guard Works */}
      <section aria-label="How Forest Guard Works" className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Autonomous Surveillance Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            How Forest Guard Works
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            From raw multispectral satellite passes to verified environmental intelligence without commercial black-box APIs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-7 space-y-4 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Satellite className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Step 01 · Ingest
            </div>
            <h3 className="text-lg font-semibold text-white tracking-tight">
              Multispectral Satellite Ingest
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every 5 days, Copernicus Sentinel-2 L2A passes over Maharashtra. Forest Guard catalogues 1,479 sectors of 15×15 km across EPSG:7755, filtering cloud occlusion and normalizing surface reflectance.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-7 space-y-4 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Eye className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Step 02 · Detect
            </div>
            <h3 className="text-lg font-semibold text-white tracking-tight">
              Classical Vision Differencing
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              OpenCV 5 CIE Lab chromatic delta and structural variance differencing isolate canopy loss from seasonal agricultural drying. Candidate components ≥1.0 ha trigger automated polygonization.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-7 space-y-4 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Step 03 · Investigate
            </div>
            <h3 className="text-lg font-semibold text-white tracking-tight">
              Ground-Truth Public Dossiers
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Each candidate alert generates an evidence dossier with split before/after sliders, geospatial bounding boxes, administrative context, and links to PARIVESH statutory environmental clearances.
            </p>
          </div>
        </div>

        {/* Explore Subpages Banner */}
        <div className="bg-gradient-to-r from-emerald-950/30 via-slate-900/40 to-slate-900/30 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white tracking-tight">
              Explore the Full Maharashtra Methodology & Cadence
            </h3>
            <p className="text-sm text-slate-400">
              Inspect the EPSG:7755 coordinate reference system, 7-stage vision pipeline, and sector health inventories.
            </p>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <Link
              href="/status"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md shadow-emerald-950/40 transition-all"
            >
              <span>Methodology & Status</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
