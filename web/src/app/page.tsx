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
import buildStatistics from '@/data/statistics.json';

const GlobeHero = dynamic(() => import('@/components/home/GlobeHero'), {
  ssr: false,
  loading: () => (
    <div className="w-full min-[1100px]:h-[88svh] min-[1100px]:min-h-[640px] min-[1100px]:max-h-[960px] h-[40svh] min-h-[260px] bg-[#05060F] flex flex-col items-center justify-center text-xs font-mono text-slate-400 space-y-3">
      <div className="w-9 h-9 rounded-full border-2 border-teal-500/20 border-t-[#3DFFB0] animate-spin" />
      <span className="tracking-wider text-slate-300">INITIALIZING EARTH OBSERVATION ORBIT & MAHARASHTRA GRID...</span>
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

  // Select 3 unconfirmed candidates derived from genuine Sentinel-2 observations
  const previewCandidates = useMemo(() => {
    const targetIds = [
      'INC-MH-R07-C09-20261026-115',
      'INC-MH-R01-C10-20261026-77',
      'INC-MH-R01-C06-20261026-01',
    ];
    const matched = targetIds
      .map((id) => genuineCandidates.find((c) => c.incident_id === id))
      .filter((c): c is InvestigationReport => Boolean(c));

    if (matched.length === 3) return matched;
    return genuineCandidates.slice(0, 3);
  }, [genuineCandidates]);

  // Telemetry metrics derived strictly from authoritative JSON contracts at build time
  const totalGridSectors = monitoringState?.total_catalogue_tiles_monitored
    ? buildStatistics.total_sectors
    : buildStatistics.total_sectors;
  const evaluatedSectors = monitoringState?.last_run_summary?.sectors_evaluated ?? buildStatistics.evaluated_sectors;
  const terrestrialLandKm2 = monitoringState?.monitored_terrestrial_area_km2 ?? buildStatistics.monitored_area_km2;
  const candidateCount = genuineCandidates.length;

  return (
    <main className="min-h-screen bg-[#05060F] text-slate-100 flex flex-col">
      {/* 1. Full-Bleed 3D Earth Hero */}
      <section aria-label="3D Earth Satellite Observation Hero" className="w-full">
        <GlobeHero
          monitoringState={monitoringState}
          candidates={genuineCandidates}
          totalGridSectors={totalGridSectors}
          evaluatedSectors={evaluatedSectors}
          monitoredLandKm2={terrestrialLandKm2}
        />
      </section>

      {/* Below-the-fold content container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-24 w-full">
        {/* 2. Streamlined Statistics Strip (3 metrics, hairline dividers, Sora numerals) */}
        <section aria-label="Authoritative Monitoring Statistics">
          <div className="border-y border-white/[0.08] divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] grid grid-cols-1 sm:grid-cols-3 py-6">
            {/* Metric 1: Total Statewide Sectors */}
            <div className="py-4 sm:py-2 sm:px-8 first:sm:pl-0 space-y-2">
              <div className="text-[13px] font-sans font-medium text-slate-300">
                Total statewide sectors
              </div>
              <div className="text-[clamp(2rem,3.2vw,2.75rem)] font-heading font-bold text-white tracking-tight leading-[1.1] tabular-nums">
                {totalGridSectors.toLocaleString()}
              </div>
              <div className="text-xs font-sans text-slate-400">
                36 administrative districts · 15×15 km matrix (EPSG:7755)
              </div>
            </div>

            {/* Metric 2: Pilot Sectors Assessed */}
            <div className="py-4 sm:py-2 sm:px-8 space-y-2">
              <div className="text-[13px] font-sans font-medium text-slate-300">
                Pilot sectors assessed
              </div>
              <div className="text-[clamp(2rem,3.2vw,2.75rem)] font-heading font-bold text-[#3DFFB0] tracking-tight leading-[1.1] tabular-nums">
                {evaluatedSectors} sectors
              </div>
              <div className="text-xs font-sans text-slate-400">
                4 processed · 1 cloud-obscured
              </div>
            </div>

            {/* Metric 3: Monitored Land Area */}
            <div className="py-4 sm:py-2 sm:px-8 last:sm:pr-0 space-y-2">
              <div className="text-[13px] font-sans font-medium text-slate-300">
                Monitored land area
              </div>
              <div className="text-[clamp(2rem,3.2vw,2.75rem)] font-heading font-bold text-white tracking-tight leading-[1.1] tabular-nums">
                {terrestrialLandKm2.toFixed(2)} km²
              </div>
              <div className="text-xs font-sans text-slate-400">
                0.13% of 307,492.71 km² GIS-derived state-boundary area
              </div>
            </div>
          </div>
        </section>

        {/* 3. Three Recent Candidate Previews with Genuine Before/After Satellite Crops */}
        <section aria-label="Recent Candidate Investigations" className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-ice-400">
                <span className="w-1.5 h-1.5 rounded-full bg-bio"></span>
                <span>Unconfirmed candidate detections</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                Candidate Investigations
              </h2>
              <p className="text-sm font-sans text-slate-300">
                {candidateCount} unconfirmed candidate records recorded across pilot sectors. Unconfirmed change alerts awaiting independent ground-truth verification.
              </p>
            </div>

            <Link
              href="/investigations"
              className="inline-flex items-center space-x-2 text-xs font-sans font-semibold text-[#3DFFB0] hover:text-[#64ffc4] transition-colors self-start sm:self-auto group"
            >
              <span>View all {candidateCount} candidates</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {previewCandidates.map((candidate) => (
              <article
                key={candidate.incident_id}
                className="bg-[#0a0e1a]/80 backdrop-blur-sm border border-white/[0.08] hover:border-[#3DFFB0]/40 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-[#3DFFB0]/5 flex flex-col justify-between group"
              >
                <div>
                  {/* Genuine Side-by-Side Satellite Observation Crops */}
                  <div className="grid grid-cols-2 gap-1 p-2 bg-[#05060F]">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-950 border border-white/[0.05]">
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

                    <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-950 border border-white/[0.05]">
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
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ice-300">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ice-400" aria-hidden="true" />
                        <span>[UNCONFIRMED CANDIDATE]</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Sector {candidate.incident_id.split('-').slice(1, 4).join('-')}
                      </span>
                    </div>

                    <h3 className="text-base font-heading font-semibold text-white tracking-tight leading-snug line-clamp-2 group-hover:text-[#3DFFB0] transition-colors">
                      {candidate.report_title.replace('[UNCONFIRMED SATELLITE-CHANGE CANDIDATE] ', '')}
                    </h3>

                    <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-[#3DFFB0] shrink-0" />
                      <span>
                        {candidate.geographic_coordinates
                          ? `${candidate.geographic_coordinates[1].toFixed(4)}° N, ${candidate.geographic_coordinates[0].toFixed(4)}° E`
                          : 'Coordinates in dossier'}
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Candidate Area:</span>
                      <span className="text-white font-semibold" title="Perimeter-discretization engineering uncertainty at 10 m GSD">
                        {candidate.affected_area_hectares.toFixed(2)} ha <span className="text-slate-400 font-normal">±{candidate.measurement_uncertainty_hectares.toFixed(2)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Links */}
                <div className="p-5 pt-0 border-t border-white/[0.04] flex items-center justify-between gap-2">
                  <Link
                    href={`/explore?sector=${candidate.incident_id.split('-').slice(1, 4).join('-')}`}
                    className="text-xs font-mono text-slate-400 hover:text-white transition-colors"
                  >
                    View on Map
                  </Link>

                  <Link
                    href={`/investigations/${candidate.incident_id}/`}
                    className="inline-flex items-center space-x-1 text-xs font-sans font-medium text-[#3DFFB0] hover:text-[#64ffc4] transition-colors"
                  >
                    <span>Dossier & Slider</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 4. Three-Step Architecture Explanation of How Forest Guard Works */}
        <section aria-label="How Forest Guard Works" className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-slate-300">
              <Shield className="w-3.5 h-3.5 text-[#3DFFB0]" />
              <span>Autonomous Surveillance Architecture</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
              How Forest Guard Works
            </h2>
            <p className="text-sm font-sans text-slate-400 leading-relaxed">
              From raw multispectral satellite passes to verified environmental intelligence without commercial black-box APIs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-[#0a0e1a]/60 border border-white/[0.08] rounded-2xl p-7 space-y-4 hover:border-white/20 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Satellite className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Step 01 · Ingest
              </div>
              <h3 className="text-lg font-heading font-semibold text-white tracking-tight">
                Multispectral Satellite Ingest
              </h3>
              <p className="text-sm font-sans text-slate-400 leading-relaxed">
                Retrieve suitable Sentinel-2 observations for monitored sectors. Satellite revisit opportunities and cloud-free availability vary; Forest Guard is currently operating in staged pilot mode.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#0a0e1a]/60 border border-white/[0.08] rounded-2xl p-7 space-y-4 hover:border-white/20 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-[#3DFFB0]">
                <Eye className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Step 02 · Detect
              </div>
              <h3 className="text-lg font-heading font-semibold text-white tracking-tight">
                Classical Vision Differencing
              </h3>
              <p className="text-sm font-sans text-slate-400 leading-relaxed">
                OpenCV 5 CIE Lab chromatic delta and structural variance differencing isolate canopy loss from seasonal agricultural drying. Candidate components ≥1.0 ha trigger automated polygonization.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#0a0e1a]/60 border border-white/[0.08] rounded-2xl p-7 space-y-4 hover:border-white/20 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Step 03 · Investigate
              </div>
              <h3 className="text-lg font-heading font-semibold text-white tracking-tight">
                Ground-Truth Public Dossiers
              </h3>
              <p className="text-sm font-sans text-slate-400 leading-relaxed">
                Each candidate alert generates an evidence dossier with split before/after sliders, geospatial bounding boxes, administrative context, and retrieved contextual records from public environmental registries.
              </p>
            </div>
          </div>

          {/* Subpages Navigation Banner */}
          <div className="bg-gradient-to-r from-teal-950/20 via-[#0a0e1a] to-[#0a0e1a] border border-[#3DFFB0]/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-lg font-heading font-semibold text-white tracking-tight">
                Explore the Full Maharashtra Methodology & Cadence
              </h3>
              <p className="text-sm font-sans text-slate-400">
                Inspect the EPSG:7755 coordinate reference system, 7-stage vision pipeline, and sector health inventories.
              </p>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <Link
                href="/status"
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-sans text-xs font-medium shadow-md transition-all"
              >
                <span>Methodology & Status</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
