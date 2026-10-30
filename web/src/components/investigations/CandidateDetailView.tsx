'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Layers,
  ShieldAlert,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Info,
  Maximize2,
  FileText,
  Compass,
  ArrowRight,
  Database,
  TreeDeciduous,
  Activity,
  Terminal,
  Share2
} from 'lucide-react';
import { InvestigationReport } from '@/types/incident';
import { assetUrl } from '@/lib/data';
import CandidateImageCompareSlider from './CandidateImageCompareSlider';

interface CandidateDetailViewProps {
  candidate: InvestigationReport;
}

export default function CandidateDetailView({ candidate }: CandidateDetailViewProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [overlayError, setOverlayError] = useState(false);

  const parentSectorId = candidate.incident_id.match(/MH-R\d+-C\d+/)?.[0] || 'Unknown';
  const coordsStr = `${candidate.geographic_coordinates[1].toFixed(5)}° N, ${candidate.geographic_coordinates[0].toFixed(5)}° E`;

  // Image URLs
  const overlayUrl = assetUrl(`/data/artifacts/${candidate.incident_id}/overlay.png`);
  const beforeUrl = assetUrl(`/data/artifacts/${candidate.incident_id}/before.png`);
  const afterUrl = assetUrl(`/data/artifacts/${candidate.incident_id}/after.png`);

  const copyIdToClipboard = () => {
    navigator.clipboard.writeText(candidate.incident_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyLinkToClipboard = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="space-y-8 font-sans max-w-7xl mx-auto">
      {/* 1. Breadcrumbs & Top Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-slate-400">
          <Link href="/investigations" className="hover:text-white transition">
            Investigations
          </Link>
          <span>/</span>
          <span className="text-slate-300">{parentSectorId}</span>
          <span>/</span>
          <span className="text-bio font-bold">{candidate.incident_id}</span>
        </nav>

        <div className="flex items-center space-x-3">
          <Link
            href="/investigations"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Feed</span>
          </Link>

          <Link
            href={`/explore?sector=${parentSectorId}`}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-semibold transition"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>View Parent Sector on Map</span>
          </Link>
        </div>
      </div>

      {/* 2. Candidate Hero Header */}
      <div className="border border-slate-800 bg-[#080d16] rounded-2xl p-6 sm:p-8 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono text-xs font-bold tracking-wider uppercase">
            UNCONFIRMED SATELLITE-CHANGE CANDIDATE
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs">
            Sector Matrix: {parentSectorId}
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono text-xs capitalize">
            Geometry: {candidate.visual_geometry.replace('_', ' ')}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {candidate.report_title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
          <div className="flex items-center space-x-1.5">
            <span>Candidate ID:</span>
            <span className="text-white font-bold">{candidate.incident_id}</span>
            <button
              onClick={copyIdToClipboard}
              className="p-1 hover:text-white transition text-slate-400"
              title="Copy ID"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <span>•</span>

          <div className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-white">{coordsStr}</span>
          </div>

          <span>•</span>

          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-forest-400" />
            <span>Report Date: {candidate.report_date}</span>
          </div>

          <button
            onClick={copyLinkToClipboard}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition ml-auto"
            title="Copy Direct Report Link"
          >
            <Share2 className="w-3 h-3 text-emerald-400" />
            <span>{copiedLink ? 'Link Copied!' : 'Share Dossier'}</span>
          </button>
        </div>

        {/* Mandatory Integrity Caveat Banner */}
        <div className="p-4 rounded-xl bg-[#0b121e] border border-amber-500/30 flex items-start space-x-3 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 font-sans">
            <div className="font-bold text-white font-mono text-xs">
              MANDATORY PROVISIONAL STATUS & LEGAL DISCLAIMER
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              This detection represents an unconfirmed structural canopy change identified by OpenCV 5 computer vision across 
              Copernicus Sentinel-2 observation pairs. It is <strong>not</strong> an established finding of unauthorized clearing, illegal logging,
              or regulatory non-compliance. Detector contrast scores are uncalibrated geometric heuristics and must not be interpreted as legal proof.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Core Telemetry Matrix Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-4 rounded-2xl bg-[#080d16] border border-slate-800">
          <span className="text-[10px] uppercase text-slate-400 block tracking-wider">Affected Area</span>
          <span className="text-xl font-bold text-white mt-1 block">
            {candidate.affected_area_hectares.toFixed(2)} ha
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block" title="Half-pixel perimeter quantization error at 10 m Ground Sampling Distance (GSD). Engineering measurement uncertainty from raster boundary discretization, not a statistical confidence interval.">
            ± {candidate.measurement_uncertainty_hectares.toFixed(2)} ha (perimeter discretization)
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d16] border border-slate-800">
          <span className="text-[10px] uppercase text-slate-400 block tracking-wider">Visual Geometry</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block capitalize">
            {candidate.visual_geometry.replace('_', ' ')}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Aspect Ratio: {candidate.aspect_ratio ? candidate.aspect_ratio.toFixed(2) : 'N/A'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d16] border border-slate-800">
          <span className="text-[10px] uppercase text-slate-400 block tracking-wider">Observation Pair</span>
          <span className="text-sm font-bold text-white mt-1 block">
            {candidate.observation_dates[0]}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            to {candidate.observation_dates[1]} (Sentinel-2)
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d16] border border-slate-800">
          <span className="text-[10px] uppercase text-slate-400 block tracking-wider">Heuristic Contrast</span>
          <span className="text-xl font-bold text-amber-400 mt-1 block">
            {candidate.heuristic_score !== undefined ? candidate.heuristic_score.toFixed(2) : candidate.confidence_score.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Uncalibrated metric (0.00–1.00)
          </span>
        </div>
      </div>

      {/* 4. Core Visual Evidence: Before/After Split Slider & Difference Mask */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Interactive Comparison Slider */}
        <div className="lg:col-span-7 space-y-4">
          <CandidateImageCompareSlider
            beforeUrl={beforeUrl}
            afterUrl={afterUrl}
            beforeDate={candidate.observation_dates[0]}
            afterDate={candidate.observation_dates[1]}
            sceneIds={candidate.source_scene_ids}
            incidentId={candidate.incident_id}
          />
        </div>

        {/* Right Column: Morphological Difference Mask & Geometric Overlay */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#080d16] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 font-sans">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2 text-slate-300">
                <Layers className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white uppercase tracking-wider">
                  OpenCV 5 Morphological Difference Mask
                </span>
              </div>
              <span className="text-[10px] text-amber-400 font-semibold">a* Chromatic + Laplacian</span>
            </div>

            <div className="relative w-full aspect-square sm:aspect-[16/10] max-h-[360px] rounded-xl overflow-hidden bg-[#050810] border border-slate-800 flex items-center justify-center">
              {!overlayError ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={overlayUrl}
                  alt={`${candidate.incident_id} difference mask`}
                  className="w-full h-full object-contain"
                  onError={() => setOverlayError(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 text-slate-500 font-mono">
                  <Database className="w-8 h-8 text-slate-600" />
                  <span className="text-xs text-slate-400 font-semibold">
                    Difference mask not committed in static bundle
                  </span>
                  <span className="text-[10px] text-slate-600">
                    Calculated from 10m L2A raster pixels
                  </span>
                </div>
              )}

              <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded bg-black/80 backdrop-blur-md border border-slate-800 font-mono text-[10px] text-slate-300">
                CONNECTED COMPONENT MASK
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 leading-relaxed pt-1">
              Chromatic delta in CIE Lab space modulated by high-frequency Laplacian canopy roughness variance. 
              Sea pixels and tidal zones excluded via terrestrial boundary raster masking.
            </div>
          </div>
        </div>
      </div>

      {/* 5. Spatial Coordinates & Copernicus Scene Provenance */}
      <div className="p-6 rounded-2xl bg-[#080d16] border border-slate-800 space-y-4 font-mono text-xs">
        <div className="font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>Spatial Bounds & Copernicus Sentinel-2 L2A Provenance</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-slate-300 pt-1">
          <div className="p-3.5 rounded-xl bg-[#0b121e] border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase block">Centroid Coordinates (WGS 84)</span>
            <span className="text-white font-semibold text-xs mt-1 block">
              Latitude: {candidate.geographic_coordinates[1].toFixed(5)}° N
            </span>
            <span className="text-white font-semibold text-xs block">
              Longitude: {candidate.geographic_coordinates[0].toFixed(5)}° E
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b121e] border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase block">Bounding Box Extent [W, S, E, N]</span>
            <span className="text-white font-semibold text-xs mt-1 block">
              {candidate.geographic_bounding_box
                ? candidate.geographic_bounding_box.map((v) => v.toFixed(4)).join(', ')
                : 'Not recorded in lightweight index'}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Approximate extent</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b121e] border border-slate-800/80 sm:col-span-2 lg:col-span-1">
            <span className="text-[10px] text-slate-500 uppercase block">Parent Sector Grid Cell</span>
            <span className="text-emerald-400 font-bold text-xs mt-1 block">
              {parentSectorId}
            </span>
            <Link
              href={`/explore?sector=${parentSectorId}`}
              className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1 mt-1 transition"
            >
              <span>View Parent Sector on Map</span>
              <ArrowRight className="w-3 h-3 text-emerald-400" />
            </Link>
          </div>

          <div className="sm:col-span-2 lg:col-span-3 p-3.5 rounded-xl bg-[#0b121e] border border-slate-800/80 space-y-2">
            <span className="text-[10px] text-slate-500 uppercase block">Copernicus Sentinel-2 Level-2A Scene Identifiers</span>
            <div className="flex flex-wrap gap-2">
              {candidate.source_scene_ids && candidate.source_scene_ids.length > 0 ? (
                candidate.source_scene_ids.map((sid, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-200">
                    {sid}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-xs">Copernicus Sentinel-2 Level-2A Multi-Spectral Surface Reflectance</span>
              )}
            </div>
            {candidate.source_scene_ids?.some((s) => s.includes('20261020')) && candidate.observation_dates[0] === '2026-10-10' && (
              <div className="mt-2 p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10.5px] font-mono text-amber-300">
                <span className="font-semibold block mb-0.5">Observation Provenance Note:</span>
                Stored query window begins 2026-10-10; Copernicus scene ID confirms optical pass acquisition on 2026-10-20. Preserved unedited per data integrity contract.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Summary & Analytical Vision Telemetry */}
      <div className="p-6 rounded-2xl bg-[#080d16] border border-slate-800 space-y-4">
        <div className="font-mono font-bold text-white uppercase tracking-wider text-xs flex items-center space-x-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Summary & Computer Vision Telemetry</span>
        </div>

        <div className="space-y-3 text-xs leading-relaxed">
          <p className="text-slate-200 font-sans text-sm">{candidate.summary}</p>
          {candidate.detailed_findings && (
            <div className="p-4 rounded-xl bg-[#0b121e] border border-slate-800/80 text-[11px] font-mono text-slate-300 leading-relaxed">
              {candidate.detailed_findings}
            </div>
          )}
        </div>
      </div>

      {/* 7. Closed-Loop Gemini Agentic Research (Hypotheses vs Citations) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Investigative Leads & Hypotheses */}
        <div className="p-6 rounded-2xl bg-[#080d16] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-mono font-bold text-white uppercase tracking-wider text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Working Hypotheses (Provisional, Unverified Leads)</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Autonomous Web Retrieval</span>
          </div>

          <div className="space-y-3">
            {candidate.likely_causes_hypotheses && candidate.likely_causes_hypotheses.length > 0 ? (
              candidate.likely_causes_hypotheses.map((lead, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#0b121e] border border-slate-800/80 space-y-2">
                  <div className="flex items-center space-x-2 text-amber-300 font-mono text-xs font-bold">
                    <span>Hypothesis {idx + 1}:</span>
                    <span>{lead.hypothesis}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {lead.supporting_evidence}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-xs font-mono text-slate-500 p-4">
                No specific development hypotheses established for this candidate.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Retrieved Public Gazette Citations */}
        <div className="p-6 rounded-2xl bg-[#080d16] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-mono font-bold text-white uppercase tracking-wider text-xs flex items-center space-x-2">
              <ExternalLink className="w-4 h-4 text-emerald-400" />
              <span>Contextual Public Records & Regional Inquiries ({candidate.citations?.length || 0})</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Autonomous Retrieval</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] font-mono text-slate-400 leading-relaxed">
            <span className="text-amber-400 font-bold uppercase block text-[10px] mb-0.5">Contextual Evidence Notice</span>
            Automated public registry search. Does not confirm statutory clearance status or ground-truth legality. Retrieved records provide regional contextual literature and potential investigative leads.
          </div>

          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {candidate.citations && candidate.citations.length > 0 ? (
              candidate.citations.map((cite, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#0b121e] border border-slate-800/80 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">{cite.source_id}</span>
                      <span className="text-xs font-semibold text-white font-sans">{cite.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono leading-relaxed line-clamp-2">
                      {cite.snippet}
                    </p>
                    <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-500">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] text-slate-400">
                        {cite.evidence_tier === 'official_clearance' ? 'Contextual Public Record' : 'Contextual Background'}
                      </span>
                      <span>•</span>
                      <span>Accessed: {cite.access_date}</span>
                    </div>
                  </div>
                  {cite.url && (
                    <a
                      href={cite.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition shrink-0"
                      title="Open Official Record"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="text-xs font-mono text-slate-500 p-4">
                No public gazette records retrieved.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 8. FSI Stem Density Estimate & Unresolved Questions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tree Count Estimate Bounds */}
        <div className="p-6 rounded-2xl bg-[#080d16] border border-slate-800 space-y-3 font-mono text-xs">
          <div className="font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <TreeDeciduous className="w-4 h-4 text-forest-400" />
            <span>FSI Forest Stratum & Stem Density Assessment</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0b121e] border border-slate-800/80 space-y-3 text-slate-300 leading-relaxed">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80 text-[11px]">
              <span className="text-slate-400">Forest Stratum:</span>
              <span className="text-white font-bold">{candidate.tree_count_estimate?.forest_type || 'Unclassified Forest Stratum'}</span>
            </div>

            {candidate.tree_count_estimate?.is_supported && candidate.tree_count_estimate?.canopy_density_trees_per_ha_min != null ? (
              <>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Canopy Density Range:</span>
                  <span className="text-white font-semibold">
                    {candidate.tree_count_estimate.canopy_density_trees_per_ha_min} – {candidate.tree_count_estimate.canopy_density_trees_per_ha_max} stems/ha
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Estimated Tree Impact Range:</span>
                  <span className="text-emerald-400 font-bold">
                    {candidate.tree_count_estimate.estimated_affected_trees_min} – {candidate.tree_count_estimate.estimated_affected_trees_max} trees
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-2 py-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Stem Density Range:</span>
                  <span className="text-amber-400 font-semibold">
                    Omitted (Unsupported without division plot inventory)
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Tree Impact Estimate:</span>
                  <span className="text-slate-400 font-mono">
                    Provisional / Not Calculated
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#080d16] border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                  <span className="text-white font-semibold block mb-0.5">Estimation Limitation:</span>
                  {candidate.tree_count_estimate?.limitations || 'Tree-count estimates are omitted to prevent unsupported speculation.'}
                </div>
              </div>
            )}

            <div className="pt-1 text-[10px] text-slate-500 border-t border-slate-800/80">
              Reference: {candidate.tree_count_estimate?.density_source && candidate.tree_count_estimate.density_source !== 'None available'
                ? candidate.tree_count_estimate.density_source
                : 'Forest Survey of India (FSI) State of Forest Report (ISFR 2021)'}. 
              Regional biometric stratum averages (typically 150–350 stems/ha in moist deciduous zones) cannot be imputed to discrete polygon detections without territorial division inventory.
            </div>
          </div>
        </div>

        {/* Unresolved Questions & Unknowns */}
        <div className="p-6 rounded-2xl bg-[#080d16] border border-slate-800 space-y-3 font-mono text-xs">
          <div className="font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Unresolved Questions & Knowledge Gaps</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0b121e] border border-slate-800/80 space-y-2 text-slate-300 leading-relaxed">
            {candidate.unresolved_questions_and_unknowns && candidate.unresolved_questions_and_unknowns.length > 0 ? (
              <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-300">
                {candidate.unresolved_questions_and_unknowns.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-slate-400">
                Ground inspection by territorial forest division is required to verify actual canopy loss versus seasonal agricultural preparation.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 9. Autonomous Decision Trace */}
      {candidate.decision_trace && candidate.decision_trace.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#080d16] border border-slate-800 space-y-4 font-mono text-xs">
          <div className="font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Autonomous Investigative Decision Trace ({candidate.decision_trace.length} Steps)</span>
          </div>

          <div className="space-y-2.5">
            {candidate.decision_trace.map((step) => (
              <div key={step.step_number} className="p-3.5 rounded-xl bg-[#0b121e] border border-slate-800/80 flex items-start space-x-3">
                <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs font-mono">
                  Step {step.step_number}
                </span>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white uppercase text-[11px]">{step.step_type.replace('_', ' ')}</span>
                    <span className="text-[10px] text-slate-500">[{step.execution_mode}]</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    {step.decision_rationale}
                  </p>
                  {step.findings_extracted && step.findings_extracted.length > 0 && (
                    <div className="pt-1 text-[10px] text-slate-300">
                      Findings: {step.findings_extracted.join(' • ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. Footer Navigation Bar */}
      <div className="p-6 rounded-2xl bg-[#080d16] border border-slate-800 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <Link
          href="/investigations"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Candidate Feed</span>
        </Link>

        <Link
          href={`/explore?sector=${parentSectorId}`}
          className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition shadow-lg shadow-emerald-950/50"
        >
          <span>Explore Parent Sector {parentSectorId} on Map</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
