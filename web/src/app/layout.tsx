import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/common/Navbar';

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
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="min-h-screen flex flex-col bg-[#05060F] text-slate-100 antialiased font-sans selection:bg-teal-950 selection:text-teal-200">
        {/* Transparent Slim Navigation Bar */}
        <Navbar />

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
                  <svg
                    className="w-4 h-4 text-[#3DFFB0]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M4.93 19.07 A10 10 0 0 1 19.07 4.93" />
                    <path d="M19.07 19.07 A10 10 0 0 1 4.93 4.93" />
                  </svg>
                  <span className="font-heading font-semibold text-slate-200 tracking-wider">Forest Guard</span>
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
