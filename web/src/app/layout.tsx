import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Radio, Terminal, FileText, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Forest Guard — Autonomous Forest Change Detection & Investigation Platform',
  description: 'OpenCV 5 Classical Vision + Adaptive AI Autonomous Investigation Engine for Western Ghats & Global Biomes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className="min-h-screen flex flex-col bg-[#070b12] text-slate-100 antialiased font-sans">
        {/* Navigation Banner */}
        <header className="border-b border-slate-800 bg-[#0b101b]/95 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-forest-950 border border-forest-500/40 rounded flex items-center justify-center text-forest-400">
                <Shield className="w-5 h-5 text-forest-400" />
              </div>
              <div>
                <Link href="/" className="flex items-center space-x-2">
                  <span className="font-semibold text-lg tracking-tight text-white">FOREST GUARD</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-forest-900/80 text-forest-300 border border-forest-700/60 font-medium">
                    OpenCV 5 Core
                  </span>
                </Link>
                <p className="text-xs text-slate-400 hidden sm:block">Autonomous Satellite Change Detection & Ground-Truth Investigation</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-xs font-mono">
              <div className="flex items-center space-x-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-forest-400 animate-pulse"></span>
                <span>SYSTEM ONLINE</span>
              </div>
              <Link
                href="/#incidents"
                className="text-slate-300 hover:text-white transition px-2 py-1 rounded hover:bg-slate-800"
              >
                Incident Feed
              </Link>
              <Link
                href="/#methodology"
                className="text-slate-300 hover:text-white transition px-2 py-1 rounded hover:bg-slate-800"
              >
                Vision Spec
              </Link>
            </div>
          </div>
        </header>

        {/* Global Synthetic Data Disclaimer Banner */}
        <div className="bg-amber-950/40 border-b border-amber-800/40 px-4 py-2 text-center text-xs text-amber-200 font-mono">
          <span className="font-bold uppercase tracking-wider text-amber-300 mr-2">[DEMONSTRATION NOTICE]</span>
          Evaluation test incidents displayed are derived from mathematically scaled benchmark test fixtures. Simulated findings are explicitly isolated from genuine live satellite telemetry.
        </div>

        {/* Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800 bg-[#090d15] text-slate-400 text-xs py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <p className="font-medium text-slate-300">Forest Guard — OpenCV AI Competition 2026 Special Award</p>
              <p className="text-slate-400 mt-1">OpenCV 5 Classical Vision (No-NDVI) • Google Gemini Adaptive Reasoning • CDSE Sentinel-2 Integration</p>
            </div>
            <div className="flex items-center space-x-4 font-mono">
              <span>Python 3.12 + FastAPI</span>
              <span>•</span>
              <span>Next.js + TypeScript</span>
              <span>•</span>
              <span>Isolated Environment</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
