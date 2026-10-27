import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Radio, Terminal, ExternalLink, AlertTriangle, Layers, Activity, FileSpreadsheet, Database } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Forest Guard — Cinematic Earth Observation & Change Verification Platform',
  description: 'Autonomous Copernicus Sentinel-2 change detection across Maharashtra using OpenCV 5 classical vision (strict zero-NDVI architecture).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#05070a] text-slate-100 antialiased font-sans selection:bg-emerald-950 selection:text-emerald-200">
        {/* Top Mission Control Bar */}
        <header className="border-b border-[#1e293b] bg-[#05070a]/95 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand / Wordmark */}
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="w-9 h-9 bg-emerald-950/60 border border-emerald-500/30 rounded-md flex items-center justify-center text-emerald-400 group-hover:border-emerald-400/60 transition-colors shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex items-center space-x-2.5">
                  <span className="font-bold text-base tracking-wider text-white">FOREST GUARD</span>
                  <div className="h-4 w-[1px] bg-slate-800" />
                  <span className="text-[10px] tracking-widest uppercase font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                    EARTH OBSERVATION
                  </span>
                </div>
              </Link>
            </div>

            {/* Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1 text-xs font-mono">
              <Link
                href="/"
                className="text-slate-300 hover:text-white px-3 py-1.5 rounded hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-800"
              >
                Overview
              </Link>
              <Link
                href="/explore"
                className="text-slate-300 hover:text-white px-3 py-1.5 rounded hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-800"
              >
                Explore Map
              </Link>
              <Link
                href="/investigations"
                className="text-slate-300 hover:text-white px-3 py-1.5 rounded hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-800"
              >
                Investigations
              </Link>
              <Link
                href="/status"
                className="text-slate-300 hover:text-white px-3 py-1.5 rounded hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-800"
              >
                Status & Methodology
              </Link>
              <Link
                href="/status#sources"
                className="text-slate-300 hover:text-white px-3 py-1.5 rounded hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-800"
              >
                Data Sources
              </Link>
            </nav>

            {/* Status Indicators & Pilot Mode Chip */}
            <div className="flex items-center space-x-3 text-xs font-mono">
              {/* Persistent Pilot Mode Chip */}
              <div
                className="flex items-center space-x-2 px-2.5 py-1 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                title="Pilot mode: partial coverage assessment across 1,479 Maharashtra 15km sectors"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="font-semibold tracking-tight text-[11px]">Pilot mode: partial coverage</span>
              </div>

              {/* Engine State Indicator */}
              <div className="hidden xl:flex items-center space-x-1.5 px-2 py-1 rounded bg-slate-900/90 border border-slate-800 text-slate-400 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-slate-300">OpenCV 5 Core</span>
              </div>
            </div>
          </div>

          {/* Mobile & Tablet Quick-Navigation Strip */}
          <nav
            aria-label="Mobile navigation"
            className="flex lg:hidden border-t border-slate-800/80 px-4 py-2 overflow-x-auto space-x-2 text-xs font-mono bg-[#070d18]"
          >
            <Link
              href="/"
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap text-[11px]"
            >
              Overview
            </Link>
            <Link
              href="/explore"
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap text-[11px]"
            >
              Explore Map
            </Link>
            <Link
              href="/investigations"
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap text-[11px]"
            >
              Investigations
            </Link>
            <Link
              href="/status"
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap text-[11px]"
            >
              Status & Method
            </Link>
            <Link
              href="/status#sources"
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap text-[11px]"
            >
              Data Sources
            </Link>
          </nav>
        </header>

        {/* Global Honesty / Verification Notice Bar */}
        <div className="bg-[#0c1322] border-b border-[#1e293b] px-4 py-1.5 text-center text-xs text-slate-300 font-mono flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 leading-relaxed">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-center">
            <strong className="text-amber-300 uppercase tracking-wide">Verification Notice:</strong> All detections are{' '}
            <span className="text-amber-200 font-semibold">[UNCONFIRMED SATELLITE-CHANGE CANDIDATE]</span>. Pure classical computer vision diffs requiring independent ground verification. Zero NDVI.
          </span>
        </div>

        {/* Main Content Area */}
        <main className="flex-1">
          {children}
        </main>

        {/* Cinematic Mission Control Footer */}
        <footer className="border-t border-[#1e293b] bg-[#05070a] text-slate-400 text-xs py-10 mt-16 font-sans">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Col 1: System Identification */}
              <div className="space-y-3 md:col-span-1">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-200 tracking-wider">FOREST GUARD</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Autonomous Earth-observation & change verification system. Built for the OpenCV AI Competition 2026 Special Award Entry.
                </p>
                <div className="font-mono text-[11px] text-slate-400 space-y-1">
                  <div>Grid: 1,479 sectors (15×15 km)</div>
                  <div>CRS: EPSG:7755 (Maharashtra LCC)</div>
                  <div>Pipeline: OpenCV 5 Classical Vision</div>
                </div>
              </div>

              {/* Col 2: Navigation & Views */}
              <div className="space-y-3">
                <h4 className="text-slate-200 font-semibold uppercase tracking-wider text-[11px] font-mono">Platform Views</h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <Link href="/" className="hover:text-emerald-400 transition-colors">Overview & Telemetry</Link>
                  </li>
                  <li>
                    <Link href="/explore" className="hover:text-emerald-400 transition-colors">Explore Sector Grid Map</Link>
                  </li>
                  <li>
                    <Link href="/investigations" className="hover:text-emerald-400 transition-colors">Candidate Investigation Dossiers</Link>
                  </li>
                  <li>
                    <Link href="/status" className="hover:text-emerald-400 transition-colors">Monitoring Cadence & Method</Link>
                  </li>
                  <li>
                    <Link href="/status#sources" className="hover:text-emerald-400 transition-colors">Data Sources & STAC Feeds</Link>
                  </li>
                </ul>
              </div>

              {/* Col 3: Data Sources & Attribution */}
              <div className="space-y-3 md:col-span-1">
                <h4 className="text-slate-200 font-semibold uppercase tracking-wider text-[11px] font-mono">Satellite & Spatial Data</h4>
                <ul className="space-y-1.5 text-[11px] text-slate-400">
                  <li>• Copernicus Sentinel-2 L2A (European Space Agency / European Union) via CDSE STAC</li>
                  <li>• NASA GIBS Global Imagery Browse Services</li>
                  <li>• Survey of India & Natural Earth (Administrative boundaries)</li>
                  <li>• Forest Survey of India (FSI) Forest Canopy Density baselines</li>
                  <li>• Ministry of Environment, Forest & Climate Change (MoEFCC) PARIVESH</li>
                </ul>
              </div>

              {/* Col 4: Integrity & Licensing */}
              <div className="space-y-3 md:col-span-1">
                <h4 className="text-slate-200 font-semibold uppercase tracking-wider text-[11px] font-mono">Integrity & Licenses</h4>
                <div className="text-[11px] text-slate-400 space-y-2 leading-relaxed">
                  <p>
                    Data published under Open Government Data (OGD) India & Creative Commons CC-BY-4.0.
                  </p>
                  <p>
                    Platform code released under MIT License. Zero proprietary dependencies. Zero AWS or paid cloud lock-in.
                  </p>
                  <p className="text-[10px] text-slate-400 border-t border-slate-900 pt-2 font-mono">
                    Deterministic reproducibility verified via GitHub Actions.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-6 border-t border-[#1e293b]/70 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-400 font-mono">
              <div>
                © 2026 Forest Guard Contributors • Classical Computer Vision + Public Domain Satellite Telemetry
              </div>
              <div className="flex items-center space-x-4">
                <span>Static GitHub Pages Export</span>
                <span>•</span>
                <span>Base Path: /forest-guard/</span>
                <span>•</span>
                <span>Zero Secrets in Client</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
