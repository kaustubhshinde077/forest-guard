'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  X,
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
  Database
} from 'lucide-react';
import { InvestigationReport } from '@/types/incident';
import { assetUrl } from '@/lib/data';

interface CandidateDossierModalProps {
  candidate: InvestigationReport | null;
  onClose: () => void;
}

export default function CandidateDossierModal({
  candidate,
  onClose,
}: CandidateDossierModalProps) {
  const [activeImageTab, setActiveImageTab] = useState<'overlay' | 'before' | 'after'>('overlay');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Trap focus & lock body scroll while modal is open
  useEffect(() => {
    if (candidate) {
      document.body.style.overflow = 'hidden';
      // Reset image errors when candidate changes
      setImageError({});
      setActiveImageTab('overlay');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [candidate]);

  if (!candidate) return null;

  const parentSectorId = candidate.incident_id.match(/MH-R\d+-C\d+/)?.[0] || 'Unknown Sector';
  const coordsStr = `${candidate.geographic_coordinates[1].toFixed(4)}° N, ${candidate.geographic_coordinates[0].toFixed(4)}° E`;

  const copyIdToClipboard = () => {
    navigator.clipboard.writeText(candidate.incident_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyCoordsToClipboard = () => {
    navigator.clipboard.writeText(`${candidate.geographic_coordinates[0]}, ${candidate.geographic_coordinates[1]}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Image URLs
  const overlayUrl = assetUrl(`/data/artifacts/${candidate.incident_id}/overlay.png`);
  const beforeUrl = assetUrl(`/data/artifacts/${candidate.incident_id}/before.png`);
  const afterUrl = assetUrl(`/data/artifacts/${candidate.incident_id}/after.png`);

  const currentImageUrl =
    activeImageTab === 'overlay' ? overlayUrl : activeImageTab === 'before' ? beforeUrl : afterUrl;

  const hasCurrentImageError = imageError[activeImageTab];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-title"
    >
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Container */}
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl bg-[#080d16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]"
      >
        {/* 1. Modal Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-800/80 bg-[#0b121e]">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/50 text-amber-300 font-mono text-[11px] font-bold tracking-wider uppercase">
                UNCONFIRMED SATELLITE-CHANGE CANDIDATE
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px]">
                Sector {parentSectorId}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[11px]">
                {candidate.visual_geometry.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <h2 id="dossier-title" className="text-lg sm:text-xl font-bold text-white tracking-tight font-sans">
              {candidate.report_title}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
              <div className="flex items-center space-x-1">
                <span>ID:</span>
                <span className="text-slate-200">{candidate.incident_id}</span>
                <button
                  onClick={copyIdToClipboard}
                  className="p-1 hover:text-white transition"
                  title="Copy Candidate ID"
                >
                  {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span className="text-slate-200">{coordsStr}</span>
                <button
                  onClick={copyCoordsToClipboard}
                  className="p-1 hover:text-white transition"
                  title="Copy Coordinates [Lon, Lat]"
                >
                  {copiedCoords ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label="Close dossier dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Modal Body Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* A. Mandatory Integrity Notice */}
          <div className="p-4 rounded-xl bg-[#0d1626] border border-amber-500/30 flex items-start space-x-3 text-slate-300">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-white font-mono text-xs">
                PROVISIONAL CANDIDATE STATUS & GEOMETRIC CAVEAT
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                This record represents a morphological difference component detected across Sentinel-2 Level-2A observation passes.
                It is <strong>not</strong> an independently verified finding of illegal deforestation. Detector scores reflect 
                uncalibrated radiometric contrast and geometric compactness, not legal conclusions or clearance probabilities.
              </p>
            </div>
          </div>

          {/* B. Observation Imagery & Morphological Difference Mask */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Copernicus Sentinel-2 10m Observation Pair & Difference Overlay</span>
              </h3>
              {/* Tab Selector */}
              <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg font-mono text-[11px]">
                <button
                  onClick={() => setActiveImageTab('overlay')}
                  className={`px-3 py-1 rounded transition ${
                    activeImageTab === 'overlay'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Difference Mask
                </button>
                <button
                  onClick={() => setActiveImageTab('before')}
                  className={`px-3 py-1 rounded transition ${
                    activeImageTab === 'before'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Before ({candidate.observation_dates[0]})
                </button>
                <button
                  onClick={() => setActiveImageTab('after')}
                  className={`px-3 py-1 rounded transition ${
                    activeImageTab === 'after'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  After ({candidate.observation_dates[1]})
                </button>
              </div>
            </div>

            {/* Image Display Frame */}
            <div className="relative w-full h-[320px] sm:h-[400px] bg-[#050810] border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
              {!hasCurrentImageError ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={currentImageUrl}
                  alt={`${candidate.incident_id} ${activeImageTab} observation preview`}
                  className="w-full h-full object-contain"
                  onError={() => {
                    setImageError((prev) => ({ ...prev, [activeImageTab]: true }));
                  }}
                />
              ) : (
                /* Honest Empty State for Missing Imagery */
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 text-slate-500 font-mono">
                  <Database className="w-8 h-8 text-slate-600" />
                  <span className="text-xs text-slate-400 font-semibold">
                    No {activeImageTab} imagery preview committed for this component
                  </span>
                  <p className="text-[10px] text-slate-500 max-w-sm">
                    In compliance with evidence honesty standards, full satellite scenes are not embedded in static builds. 
                    The underlying Sentinel-2 L2A scene IDs can be inspected directly via Copernicus Data Space.
                  </p>
                </div>
              )}

              {/* Top-Right Badge: Active Image Mode */}
              <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/75 backdrop-blur-sm border border-slate-800 font-mono text-[10px] text-slate-300">
                {activeImageTab === 'overlay' && 'OPENCV 5 MORPHOLOGICAL DIFFERENCE MASK'}
                {activeImageTab === 'before' && `BEFORE: ${candidate.observation_dates[0]} (L2A RGB)`}
                {activeImageTab === 'after' && `AFTER: ${candidate.observation_dates[1]} (L2A RGB)`}
              </div>
            </div>
          </div>

          {/* C. Telemetry Metrics Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="p-3 rounded-xl bg-[#0b121e] border border-slate-800/80">
              <span className="text-[10px] uppercase text-slate-400 block">Measured Affected Area</span>
              <span className="text-base font-bold text-white mt-0.5 block">
                {candidate.affected_area_hectares.toFixed(2)} ha
              </span>
              <span className="text-[10px] text-slate-500" title="Half-pixel perimeter quantization error at 10 m GSD. Engineering measurement uncertainty from raster boundary discretization.">
                ± {candidate.measurement_uncertainty_hectares.toFixed(2)} ha uncertainty (perimeter discretization)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0b121e] border border-slate-800/80">
              <span className="text-[10px] uppercase text-slate-400 block">Visual Geometry</span>
              <span className="text-base font-bold text-emerald-400 mt-0.5 block capitalize">
                {candidate.visual_geometry.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-slate-500">
                Aspect Ratio: {candidate.aspect_ratio ? candidate.aspect_ratio.toFixed(2) : 'N/A'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0b121e] border border-slate-800/80">
              <span className="text-[10px] uppercase text-slate-400 block">Observation Cadence</span>
              <span className="text-sm font-bold text-white mt-1 block">
                {candidate.observation_dates[0]}
              </span>
              <span className="text-[10px] text-slate-500">
                to {candidate.observation_dates[1]}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0b121e] border border-slate-800/80">
              <span className="text-[10px] uppercase text-slate-400 block">Heuristic Score</span>
              <span className="text-base font-bold text-amber-400 mt-0.5 block">
                {candidate.heuristic_score !== undefined ? candidate.heuristic_score.toFixed(2) : candidate.confidence_score.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500">
                Uncalibrated contrast metric (0–1)
              </span>
            </div>
          </div>

          {/* D. Spatial Bounds & Scene Provenance */}
          <div className="p-4 rounded-xl bg-[#0b121e] border border-slate-800 space-y-2 font-mono text-[11px]">
            <div className="font-bold text-white uppercase text-xs flex items-center space-x-2">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>SPATIAL BOUNDS & COPERNICUS SENTINEL-2 PROVENANCE</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px]">COORDINATE CENTROID (WGS 84):</span>
                <span className="text-white font-semibold">
                  Lat: {candidate.geographic_coordinates[1].toFixed(5)}° N, Lon: {candidate.geographic_coordinates[0].toFixed(5)}° E
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">APPROXIMATE BOUNDING BOX [W, S, E, N]:</span>
                <span className="text-white font-semibold">
                  {candidate.geographic_bounding_box
                    ? candidate.geographic_bounding_box.map((v) => v.toFixed(4)).join(', ')
                    : 'Not recorded in lightweight index'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block text-[10px]">SOURCE SENTINEL-2 L2A SCENE IDENTIFIERS:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {candidate.source_scene_ids && candidate.source_scene_ids.length > 0 ? (
                    candidate.source_scene_ids.map((sid, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                        {sid}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500">Copernicus Sentinel-2 Level-2A Multi-Spectral Passes</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* E. Summary & Detailed Analytical Findings */}
          <div className="space-y-3">
            <h3 className="font-mono font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <FileText className="w-4 h-4 text-forest-400" />
              <span>Summary & Vision Telemetry Analysis</span>
            </h3>
            <div className="p-4 rounded-xl bg-[#090f19] border border-slate-800 space-y-3 leading-relaxed text-xs">
              <p className="text-slate-200 font-sans">{candidate.summary}</p>
              {candidate.detailed_findings && (
                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                  {candidate.detailed_findings}
                </div>
              )}
            </div>
          </div>

          {/* F. Hypotheses vs Public Evidence (Agentic Vision Findings) */}
          {candidate.likely_causes_hypotheses && candidate.likely_causes_hypotheses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-mono font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Agentic Investigation Leads (Unconfirmed Hypotheses)</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500">Autonomous Parivesh Cross-Reference</span>
              </div>

              <div className="space-y-2">
                {candidate.likely_causes_hypotheses.map((lead, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#0a101b] border border-slate-800 space-y-1.5">
                    <div className="flex items-center space-x-2 text-amber-300 font-mono text-xs font-semibold">
                      <span>Hypothesis {idx + 1}:</span>
                      <span>{lead.hypothesis}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                      {lead.supporting_evidence}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* G. Public Record Citations */}
          {candidate.citations && candidate.citations.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-mono font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <ExternalLink className="w-4 h-4 text-forest-400" />
                <span>Contextual Public Records & Regional Inquiries ({candidate.citations.length})</span>
              </h3>
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-[10px] font-mono text-slate-400">
                <span className="text-amber-400 font-semibold block uppercase mb-0.5">Integrity Notice</span>
                Automated public registry search. Does not confirm statutory clearance status or ground-truth legality. Retrieved records provide regional contextual literature and potential investigative leads.
              </div>
              <div className="grid grid-cols-1 gap-2">
                {candidate.citations.map((cite, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#090f19] border border-slate-800/90 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">{cite.source_id}</span>
                        <span className="text-xs font-semibold text-white">{cite.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
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
                        title="Open Source Link"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0b121e] flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-slate-400">
            Sector Matrix: <span className="text-white font-semibold">{parentSectorId}</span>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href={`/explore?sector=${parentSectorId}`}
              className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs transition"
            >
              <span>View Parent Sector on Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold transition shadow-md"
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
