'use client';

import React from 'react';
import {
  Clock,
  ShieldAlert,
  CloudOff,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  FileWarning,
  SlidersHorizontal,
  Layers
} from 'lucide-react';

const SAFEGUARD_RULES = [
  {
    condition: 'Cloud & Shadow Occlusion > 35%',
    action: 'Immediate Processing Abort & Marked Cloud Obscured',
    credit: '0.00 km² Monitored Credit',
    creditStatus: 'denied',
    description:
      'If the combined SCL high/medium cloud and cloud shadow area exceeds 35% of the sector’s terrestrial land, the processing cycle aborts immediately. The sector is labeled [CLOUD OBSCURED (INCOMPLETE)] and retains incomplete status until clear imagery is acquired.',
  },
  {
    condition: 'Sub-Pixel Misregistration (Hamming Distance > 18 Bits)',
    action: 'Alignment Rejection & Pair Discarded',
    credit: '0.00 km² Monitored Credit',
    creditStatus: 'denied',
    description:
      'When OpenCV ECC coregistration and ORB keypoint matching fail to achieve sub-pixel spatial locking (Hamming distance > 18 bits), the observation pair is discarded. This prevents artificial difference edges caused by misaligned roads and topographic ridges.',
  },
  {
    condition: 'API Rate Limiting / Download Timeout',
    action: 'Retry with Exponential Backoff; Marked Failed on Expiry',
    credit: '0.00 km² Monitored Credit',
    creditStatus: 'denied',
    description:
      'If AWS S3 COG range requests or CDSE STAC queries fail due to network timeouts or upstream throttling, the system retries with exponential jitter. If unfulfilled, the sector is recorded as [RETRIEVAL FAILED] and scheduled for subsequent passes without credit.',
  },
  {
    condition: 'Contiguous Change Area < 1.0 Hectare',
    action: 'Sub-Hectare Noise Filtered; No Qualifying Change Detected',
    credit: '100% Terrestrial Land Area Credited',
    creditStatus: 'granted',
    description:
      'If all detected morphological delta components measure below the 1.0 ha significance threshold, the sector is classified as [NO QUALIFYING CHANGE DETECTED]. The sector receives full terrestrial monitoring credit for the current 21-day cadence cycle.',
  },
  {
    condition: 'Contiguous Change Area ≥ 1.0 Hectare',
    action: 'Candidate Dossier Generated & Flagged for Ground-Truthing',
    credit: '100% Terrestrial Land Area Credited',
    creditStatus: 'granted',
    description:
      'Contiguous change regions meeting or exceeding 1.0 ha trigger connected component analysis, bounding box extraction, and autonomous contextual research. The sector receives monitored credit and publishes unconfirmed candidate dossiers.',
  },
];

export default function CadenceSafeguardsSection() {
  return (
    <section id="cadence" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1e293b]">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wide flex items-center space-x-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Cadence, Quality & Failure Safeguards</span>
          </h2>
          <p className="text-xs text-slate-400 font-sans">
            Formal operating safeguards governing observation frequency, data quality thresholds, and zero-credit incomplete policies.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-amber-400">
          <ShieldAlert className="w-4 h-4" />
          <span>Strict Zero-Credit Policy</span>
        </div>
      </div>

      {/* Cadence Mechanics Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
        <div className="p-5 rounded-2xl bg-[#080d16] border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 font-mono font-bold text-white uppercase tracking-wider text-xs">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Intended 21-Day Observation Cadence</span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">
            Maharashtra’s 1,479 canonical sectors are allocated across 21 daily monitoring batches (9 batches of 71 sectors, 12 batches of 70 sectors; average 70.43 sectors/day).
          </p>
          <div className="space-y-1.5 font-mono text-[11px] text-slate-400 pt-1">
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-500">Allocation Strategy:</span>
              <span className="text-white">Geographically Interleaved Round-Robin</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-500">Agro-Climatic Zones / Batch:</span>
              <span className="text-white">≥ 4 Distinct Biomes per Day</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-500">Forest-Priority Sectors / Batch:</span>
              <span className="text-white">29 to 36 Priority Cells</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Statewide Target Duration:</span>
              <span className="text-emerald-400 font-bold">21 Continuous Calendar Days</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#080d16] border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 font-mono font-bold text-white uppercase tracking-wider text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Operational Pilot Reality & Status</span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">
            In accordance with system honesty rules, statewide 21-day continuous coverage has <strong>not yet been demonstrated in production</strong>.
          </p>
          <div className="space-y-2 pt-1 font-sans text-xs text-slate-300">
            <p className="leading-relaxed">
              Automated cron workflows are currently disabled to prevent unmonitored cloud execution.
              All reported detections originate from the verified baseline pilot run across 5 sectors (Batch 1).
            </p>
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 text-[11px] font-mono text-amber-300">
              <span className="font-bold block uppercase mb-0.5">Execution Policy:</span>
              Sectors that fail or encounter excessive cloud cover are preserved as incomplete and receive 0.00 km² monitored credit.
            </div>
          </div>
        </div>
      </div>

      {/* Safeguards & Failure Modes Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#080d16]">
        <div className="p-4 bg-[#0b121e] border-b border-slate-800 font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Failure Modes & Monitored-Credit Safeguard Matrix</span>
        </div>

        <div className="divide-y divide-slate-800">
          {SAFEGUARD_RULES.map((rule, idx) => (
            <div key={idx} className="p-4 sm:p-5 font-sans space-y-2 hover:bg-slate-900/30 transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-white">
                  {rule.condition}
                </span>
                <div className="flex items-center space-x-2">
                  <span
                    className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      rule.creditStatus === 'granted'
                        ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                        : 'bg-red-950/80 border-red-800 text-red-300'
                    }`}
                  >
                    {rule.credit}
                  </span>
                </div>
              </div>

              <div className="text-xs font-mono text-emerald-400">
                Action: {rule.action}
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {rule.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
