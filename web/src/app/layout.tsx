import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Forest Guard — Satellite Forest-Loss Monitoring for Maharashtra',
  description: 'Open-source satellite canopy monitoring across Maharashtra using Copernicus Sentinel-2 multispectral passes, classical computer vision, and public evidence dossiers.',
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
      <body className="min-h-screen flex flex-col bg-[#030712] text-slate-100 antialiased font-sans selection:bg-emerald-950 selection:text-emerald-200">
        {/* Global Navigation Header */}
        <header className="border-b border-slate-800/70 bg-[#030712]/90 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand / Wordmark */}
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 group-hover:border-emerald-400/60 group-hover:bg-emerald-500/20 transition-all shadow-[0_0_16px_rgba(16,185,129,0.15)]">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base tracking-wide text-white font-sans">FOREST GUARD</span>
                </div>
              </Link>
            </div>

            {/* Exactly Four Main Navigation Items */}
            <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
              <Link
                href="/"
                className="text-slate-300 hover:text-white px-3.5 py-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                Overview
              </Link>
              <Link
                href="/explore"
                className="text-slate-300 hover:text-white px-3.5 py-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                Explore Map
              </Link>
              <Link
                href="/investigations"
                className="text-slate-300 hover:text-white px-3.5 py-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                Investigations
              </Link>
              <Link
                href="/status"
                className="text-slate-300 hover:text-white px-3.5 py-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                Status & Methodology
              </Link>
            </nav>

            {/* Right Side: Compact Pilot Indicator + Open Map CTA */}
            <div className="flex items-center space-x-3 text-xs">
              <div
                className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs"
                title="Staged pilot: 5 of 1,479 Maharashtra sectors assessed"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="font-medium tracking-tight">Pilot: 5 Sectors Assessed</span>
              </div>

              <Link
                href="/explore"
                className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-950/40 transition-all"
              >
                <span>Open Map</span>
              </Link>
            </div>
          </div>

          {/* Mobile Navigation Bar */}
          <nav
            aria-label="Mobile navigation"
            className="flex md:hidden border-t border-slate-800/80 px-4 py-2 overflow-x-auto space-x-2 text-xs font-medium bg-[#050b16]"
          >
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap"
            >
              Overview
            </Link>
            <Link
              href="/explore"
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap"
            >
              Explore Map
            </Link>
            <Link
              href="/investigations"
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap"
            >
              Investigations
            </Link>
            <Link
              href="/status"
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap"
            >
              Status & Methodology
            </Link>
          </nav>
        </header>

        {/* Global Staged Pilot Verification Notice */}
        <div className="bg-[#050b16] border-b border-slate-800/80 px-4 py-2 text-center text-xs text-slate-300 font-sans flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
            <AlertTriangle className="w-3 h-3" /> Staged Pilot
          </span>
          <span className="text-slate-300">
            5 of 1,479 sectors assessed (390.86 km² terrestrial area) · All detections are unconfirmed satellite-change candidates requiring independent ground-truth verification.
          </span>
        </div>

        {/* Main Content Area */}
        <main className="flex-1">
          {children}
        </main>

        {/* Restrained Editorial Footer */}
        <footer className="border-t border-slate-800/80 bg-[#02050c] text-slate-400 text-xs py-12 mt-20 font-sans">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Col 1: Project Identity */}
              <div className="space-y-3 md:col-span-1">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-200 tracking-wider">FOREST GUARD</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Open-source satellite canopy change verification for Maharashtra. Built for the OpenCV AI Competition 2026 Special Award Entry.
                </p>
                <div className="font-mono text-[11px] text-slate-400 space-y-1 pt-1">
                  <div>Grid: 1,479 sectors (15×15 km)</div>
                  <div>CRS: EPSG:7755 (Maharashtra LCC)</div>
                  <div>Vision Pipeline: OpenCV 5 Core</div>
                </div>
              </div>

              {/* Col 2: Platform Views */}
              <div className="space-y-3">
                <h4 className="text-slate-200 font-semibold uppercase tracking-wider text-[11px] font-mono">Platform Views</h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <Link href="/" className="hover:text-emerald-400 transition-colors">Overview</Link>
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
                <h4 className="text-slate-200 font-semibold uppercase tracking-wider text-[11px] font-mono">Spatial Data & Attributions</h4>
                <ul className="space-y-2 text-[11px] text-slate-400">
                  <li>• Copernicus Sentinel-2 L2A (European Space Agency / European Union)</li>
                  <li>• NASA GIBS Blue Marble (August 2004, Shaded Relief & Bathymetry, Public Domain)</li>
                  <li>• Survey of India & Natural Earth (Administrative boundaries)</li>
                  <li>• Forest Survey of India (FSI) Canopy Density baselines</li>
                  <li>• Ministry of Environment, Forest & Climate Change (MoEFCC) PARIVESH</li>
                </ul>
              </div>

              {/* Col 4: Integrity & Licensing */}
              <div className="space-y-3 md:col-span-1">
                <h4 className="text-slate-200 font-semibold uppercase tracking-wider text-[11px] font-mono">Integrity & Licenses</h4>
                <div className="text-[11px] text-slate-400 space-y-2.5 leading-relaxed">
                  <p>
                    Data published under Open Government Data (OGD) India & Creative Commons CC-BY-4.0.
                  </p>
                  <p>
                    Source code released under the MIT License. Zero proprietary dependencies. Zero paid cloud infrastructure.
                  </p>
                  <p className="text-[10px] text-slate-400 border-t border-slate-800 pt-2 font-mono">
                    Deterministic reproducibility verified via GitHub Actions.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-8 border-t border-slate-800/70 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-400 font-mono">
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
