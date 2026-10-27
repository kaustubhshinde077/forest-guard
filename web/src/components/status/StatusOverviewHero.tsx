'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, ShieldCheck, ArrowRight, Layers, Compass, ExternalLink } from 'lucide-react';

interface StatusOverviewHeroProps {
  lastSuccessfulRun?: string;
  totalCatalogueSectors: number;
  evaluatedSectorsCount: number;
}

export default function StatusOverviewHero({
  lastSuccessfulRun,
  totalCatalogueSectors = 1479,
  evaluatedSectorsCount = 5,
}: StatusOverviewHeroProps) {
  const formattedDate = lastSuccessfulRun
    ? new Date(lastSuccessfulRun).toUTCString().replace('GMT', 'UTC')
    : 'Oct 26, 2026, 13:38 UTC';

  return (
    <div className="border border-[#1e293b] bg-[#080d16] rounded-2xl p-6 sm:p-8 relative overflow-hidden space-y-6">
      {/* Background ambient gradient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Tag & Status Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-slate-300 font-semibold uppercase tracking-wider">
            Operational Telemetry & System Status
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">Baseline Cycle #{'{1}'}</span>
        </div>

        {/* Persistent Staged Pilot Mode Badge */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 font-bold uppercase tracking-wider text-[11px] shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>STAGED PILOT MODE — PARTIAL COVERAGE</span>
        </div>
      </div>

      {/* Main Title & Description */}
      <div className="max-w-4xl space-y-3">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          System Operational Status & Classical Vision Methodology
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans">
          Forest Guard monitors Maharashtra’s terrestrial canopy using a canonical 15×15 km grid system ({totalCatalogueSectors.toLocaleString()} total sectors). 
          All change detection relies strictly on OpenCV 5 classical computer vision (<span className="text-emerald-300 font-mono">zero NDVI</span>) across coregistered 
          Copernicus Sentinel-2 Level-2A observation pairs.
        </p>
      </div>

      {/* Pilot Scope & Honesty Disclaimer Strip */}
      <div className="p-4 rounded-xl bg-[#0b121e] border border-amber-500/30 flex items-start space-x-3.5 text-xs font-sans">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-mono font-bold text-white text-xs block uppercase tracking-wider">
            Statewide Coverage Scope Notice
          </span>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Statewide 21-day monitoring across all 1,479 sectors is an empirical engineering target, <strong>not an assumed reality</strong>.
            Currently, {evaluatedSectorsCount} pilot sectors have been evaluated in this baseline run. Incomplete sectors (such as cloud-obscured passes) 
            receive zero monitored-area credit. Detections are labeled <span className="text-amber-400 font-mono font-bold">[UNCONFIRMED SATELLITE-CHANGE CANDIDATES]</span> awaiting independent ground-truthing.
          </p>
        </div>
      </div>

      {/* Quick Section Anchor Pills */}
      <div className="pt-2 flex flex-wrap items-center gap-2 font-mono text-xs">
        <span className="text-slate-500 text-[11px] mr-1">Jump to section:</span>
        <a
          href="#metrics"
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
        >
          Telemetry Overview
        </a>
        <a
          href="#inventory"
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
        >
          Sector Inventory (1,479)
        </a>
        <a
          href="#pipeline"
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
        >
          OpenCV 5 Pipeline
        </a>
        <a
          href="#cadence"
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
        >
          Safeguards & Failure Modes
        </a>
        <a
          href="#sources"
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
        >
          Sources, Licences & CRS
        </a>
      </div>
    </div>
  );
}
