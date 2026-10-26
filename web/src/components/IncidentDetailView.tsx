'use client';

import { useState } from 'react';
import { InvestigationReport } from '@/types/incident';
import { getAssetUrl } from '@/lib/api';
import ImageCompareSlider from '@/components/ImageCompareSlider';
import {
  ShieldAlert,
  Calendar,
  MapPin,
  Maximize2,
  TreePine,
  Link as LinkIcon,
  HelpCircle,
  AlertTriangle,
  GitCommit,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface IncidentDetailViewProps {
  incident: InvestigationReport;
  onClose?: () => void;
}

export default function IncidentDetailView({ incident }: IncidentDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'trace'>('overview');

  // Derive static imagery path with fallback to fixture folder
  let fixtureFolder = 'test_pair_1_loss_koyna';
  if (incident.incident_id.includes('PAIR_2')) {
    fixtureFolder = 'test_pair_2_recovery_tilarinagar';
  } else if (incident.incident_id.includes('PAIR_4')) {
    fixtureFolder = 'test_pair_4_global_benchmark_rondonia';
  }

  // Check if dedicated artifact exists or fallback to fixture
  const beforeImg = getAssetUrl(`/data/artifacts/${incident.incident_id}/before.png`);
  const afterImg = getAssetUrl(`/data/artifacts/${incident.incident_id}/after.png`);

  return (
    <div className="bg-[#0b121e] border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
      {/* Header bar */}
      <div className="p-6 border-b border-slate-800 bg-[#0d1624]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center space-x-2 font-mono text-xs">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {incident.incident_id}
            </span>
            <span className={`px-2 py-0.5 rounded uppercase font-semibold ${
              incident.event_category === 'forest_loss'
                ? 'bg-red-950/80 text-red-300 border border-red-800/60'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
            }`}>
              {incident.event_category.replace('_', ' ')}
            </span>
            {incident.is_synthetic_test ? (
              <span className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/50 font-bold">
                [SYNTHETIC TEST]
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-bold">
                [UNCONFIRMED SATELLITE-CHANGE CANDIDATE]
              </span>
            )}
            <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
              MODE: {incident.investigation_mode}
            </span>
          </div>
          <div className="text-xs font-mono text-slate-400">
            Report Date: {incident.report_date}
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          {incident.report_title}
        </h1>

        <p className="text-sm text-slate-300 mt-2 leading-relaxed">
          {incident.summary}
        </p>

        {/* Telemetry quick badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
            <div className="text-slate-400 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-forest-400" />
              <span>COORDINATES</span>
            </div>
            <div className="text-white font-semibold mt-1">
              {incident.geographic_coordinates[1].toFixed(4)}° N, {incident.geographic_coordinates[0].toFixed(4)}° E
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
            <div className="text-slate-400 flex items-center space-x-1">
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span>AFFECTED AREA</span>
            </div>
            <div className="text-white font-semibold mt-1">
              {incident.affected_area_hectares.toFixed(2)} ha <span className="text-slate-400 font-normal">(±{incident.measurement_uncertainty_hectares.toFixed(2)})</span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
            <div className="text-slate-400 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>WINDOW OF CHANGE</span>
            </div>
            <div className="text-white font-semibold mt-1">
              {incident.observation_dates[0]} → {incident.observation_dates[1]}
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
            <div className="text-slate-400 flex items-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
              <span>GEOMETRY PROFILE</span>
            </div>
            <div className="text-white font-semibold mt-1 uppercase">
              {incident.visual_geometry.replace('_', ' ')} (AR: {incident.aspect_ratio})
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-[#090f18] px-6 text-xs font-mono">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 border-b-2 font-semibold transition ${
            activeTab === 'overview'
              ? 'border-forest-400 text-forest-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          SATELLITE EVIDENCE & FINDINGS
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`py-3 px-4 border-b-2 font-semibold transition ${
            activeTab === 'evidence'
              ? 'border-forest-400 text-forest-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          PUBLIC SOURCES & CITATIONS ({incident.citations.length})
        </button>
        <button
          onClick={() => setActiveTab('trace')}
          className={`py-3 px-4 border-b-2 font-semibold transition ${
            activeTab === 'trace'
              ? 'border-forest-400 text-forest-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          DECISION TRACE ({incident.decision_trace.length} STEPS)
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Visual Slider */}
            <ImageCompareSlider
              beforeUrl={beforeImg}
              afterUrl={afterImg}
              beforeDate={incident.observation_dates[0]}
              afterDate={incident.observation_dates[1]}
              siteName={incident.report_title}
            />

            {/* Tree Impact Estimation Box */}
            <div className="p-4 rounded-lg bg-[#0e1726] border border-slate-800">
              <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 mb-2">
                <TreePine className="w-4 h-4" />
                <span className="font-semibold uppercase tracking-wider">TREE DENSITY IMPACT ASSESSMENT</span>
              </div>
              {incident.tree_count_estimate.is_supported ? (
                <div>
                  <div className="flex items-baseline space-x-3">
                    <span className="text-2xl font-bold text-white font-mono">
                      {incident.tree_count_estimate.estimated_affected_trees_min?.toLocaleString()} – {incident.tree_count_estimate.estimated_affected_trees_max?.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">potential affected mature stems (DBH ≥ 10 cm)</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-2 space-y-1">
                    <p><strong className="text-slate-200">Forest Stratum:</strong> {incident.tree_count_estimate.forest_type}</p>
                    <p><strong className="text-slate-200">Documented Density:</strong> {incident.tree_count_estimate.canopy_density_trees_per_ha_min} – {incident.tree_count_estimate.canopy_density_trees_per_ha_max} stems/ha</p>
                    <p><strong className="text-slate-200">Calculation Basis:</strong> {incident.tree_count_estimate.calculation_basis}</p>
                    <p className="text-slate-400 italic mt-1"><strong className="text-slate-300">Methodological Limitation:</strong> {incident.tree_count_estimate.limitations}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Tree count estimates omitted for this site: no defensible stratified density publications found.
                </p>
              )}
            </div>

            {/* Causes and Hypotheses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-[#0e1726] border border-slate-800">
                <h3 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-forest-400" />
                  <span>LIKELY CAUSE & WORKING HYPOTHESIS</span>
                </h3>
                {incident.likely_causes_hypotheses.map((c, i) => (
                  <div key={i} className="text-xs text-slate-300 space-y-1">
                    <div className="font-semibold text-white">{c.hypothesis}</div>
                    <div className="text-slate-400 leading-relaxed">{c.supporting_evidence}</div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-[#0e1726] border border-slate-800">
                <h3 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>CONFLICTING ACCOUNTS & DISPUTES</span>
                </h3>
                {incident.conflicting_accounts.length > 0 ? (
                  incident.conflicting_accounts.map((conf, i) => (
                    <p key={i} className="text-xs text-slate-300 leading-relaxed mb-2">
                      {conf}
                    </p>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No conflicting accounts indexed in public records.</p>
                )}
              </div>
            </div>

            {/* Unknowns & Limitations */}
            <div className="p-4 rounded-lg bg-[#0e1726] border border-slate-800">
              <h3 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>UNRESOLVED QUESTIONS & INVESTIGATION LIMITATIONS</span>
              </h3>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                {incident.unresolved_questions_and_unknowns.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
                <li>Visual detection confirms surface disturbance; underlying legal legality requires judicial or forest department gazette audit.</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 font-mono mb-2">
              All indexed public sources, regulatory filings, and gazettes associated with this incident:
            </div>
            {incident.citations.map((c) => (
              <div key={c.source_id} className="p-4 rounded-lg bg-[#0e1726] border border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-forest-400 font-semibold">
                    {c.source_id}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    c.evidence_tier === 'simulated_test_record'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                      : 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                  }`}>
                    {c.evidence_tier.toUpperCase()}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Publisher: {c.publisher || 'Unknown'} • Pub Date: {c.publication_date || 'N/A'}
                  </span>
                </div>

                <div className="text-sm font-semibold text-white">
                  {c.title}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950/60 p-2.5 rounded border border-slate-850">
                  &ldquo;{c.snippet}&rdquo;
                </p>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400 font-mono text-[11px]">
                    Supports: {c.supports_claims.join(', ')}
                  </span>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 text-forest-400 hover:text-forest-300 font-mono underline"
                  >
                    <span>View Record Link</span>
                    <LinkIcon className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'trace' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 font-mono mb-2">
              Full step-by-step audit trace from OpenCV 5 detection intake to report generation:
            </div>
            <div className="border-l-2 border-slate-800 ml-3 space-y-6">
              {incident.decision_trace.map((step) => (
                <div key={step.step_number} className="relative pl-6">
                  {/* Step bullet */}
                  <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-slate-900 border-2 border-forest-500 flex items-center justify-center text-[9px] font-mono font-bold text-forest-300">
                    {step.step_number}
                  </div>

                  <div className="p-3.5 rounded bg-[#0e1726] border border-slate-800 text-xs">
                    <div className="flex items-center justify-between font-mono mb-1">
                      <span className="text-forest-400 font-bold uppercase tracking-wider">
                        {step.step_type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {step.execution_mode}
                      </span>
                    </div>

                    <p className="text-slate-300 mb-2 font-medium">
                      {step.decision_rationale}
                    </p>

                    {step.tool_name && (
                      <div className="mb-2 text-[11px] font-mono bg-slate-950 p-2 rounded border border-slate-850">
                        <span className="text-slate-400">Tool Executed: </span>
                        <span className="text-amber-300 font-bold">{step.tool_name}</span>
                        {step.tool_inputs && (
                          <div className="text-slate-400 text-[10px] mt-1">
                            Inputs: {JSON.stringify(step.tool_inputs)}
                          </div>
                        )}
                      </div>
                    )}

                    {step.findings_extracted.length > 0 && (
                      <div className="text-[11px] text-slate-400 space-y-1">
                        <span className="font-mono text-slate-300 font-semibold">Findings Extracted:</span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {step.findings_extracted.map((f, fi) => (
                            <li key={fi}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
