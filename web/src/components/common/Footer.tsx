import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowUp, Github } from 'lucide-react';
import Button from '@/components/ui/Button';

function OrbitMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="4.2"
        stroke="currentColor"
        strokeWidth="1.1"
        opacity="0.9"
        transform="rotate(-28 12 12)"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="9.2"
        ry="3.6"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.38"
        transform="rotate(34 12 12)"
      />
    </svg>
  );
}

const productLinks = [
  { label: 'Overview', href: '/' },
  { label: 'Map', href: '/explore' },
  { label: 'Investigations', href: '/investigations' },
  { label: 'Methodology', href: '/status' },
];

const sources = [
  'Copernicus Sentinel-2 L2A — ESA / EU',
  'NASA GIBS Blue Marble — public domain',
  'Survey of India & Natural Earth boundaries',
  'Forest Survey of India canopy baselines',
  'MoEFCC PARIVESH clearance registry',
];

export default function Footer() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-white/[0.07] bg-ink-950">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="starfield absolute inset-0 opacity-30" />
        <div className="absolute -top-40 left-1/2 h-[420px] w-[80%] -translate-x-1/2 rounded-full bg-aqua/[0.05] blur-[130px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-aqua/25 to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-10">
        {/* Closing CTA */}
        <div className="flex flex-col gap-6 border-b border-white/[0.07] py-14 sm:flex-row sm:items-center sm:justify-between sm:py-16">
          <div className="max-w-xl space-y-3">
            <p className="eyebrow eyebrow-aqua">Open planetary monitoring</p>
            <h2 className="display-tight text-[clamp(1.6rem,3vw,2.4rem)] text-white">
              The forest, under a new kind of watch.
            </h2>
            <p className="lead text-[14.5px]">
              Explore the sector grid, follow a candidate dossier, or read how the
              vision pipeline works end to end.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              href="/explore"
              size="md"
              iconRight={<ArrowUpRight className="h-4 w-4" />}
            >
              Open the map
            </Button>
            <Button href="/status" variant="secondary" size="md">
              Read the methodology
            </Button>
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-1 gap-10 py-14 md:grid-cols-12 md:gap-8">
          <div className="space-y-4 md:col-span-4">
            <Link href="/" className="group inline-flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-aqua/20 bg-aqua/[0.06]">
                <OrbitMark className="h-[18px] w-[18px] text-aqua transition-transform duration-700 group-hover:rotate-45" />
              </span>
              <span className="font-heading text-[15px] font-semibold tracking-[-0.02em] text-white">
                Forest Guard
              </span>
            </Link>
            <p className="max-w-sm text-[13.5px] leading-relaxed text-ice-400">
              An open satellite canopy-monitoring platform that pairs classical
              OpenCV vision with agentic public-evidence research — no proprietary
              indices, no paid cloud, no black boxes.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-signal/25 bg-signal/[0.05] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-signal-400">
                <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                Staged pilot
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-bio/25 bg-bio/[0.05] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-bio-400">
                <span className="h-1.5 w-1.5 rounded-full bg-bio" />
                Open source
              </span>
            </div>
            <div className="pt-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-ice-500">
              15 × 15 km sector grid · EPSG:7755
              <br />
              21-day intended cadence · 10 m GSD
            </div>
          </div>

          <div className="space-y-4 md:col-span-2">
            <h3 className="eyebrow text-ice-400">Platform</h3>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="link-underline text-[13.5px] text-ice-300 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4 md:col-span-3">
            <h3 className="eyebrow text-ice-400">Data & attribution</h3>
            <ul className="space-y-2.5">
              {sources.map((source) => (
                <li
                  key={source}
                  className="flex gap-2 text-[12.5px] leading-relaxed text-ice-400"
                >
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-aqua/50" />
                  {source}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4 md:col-span-3">
            <h3 className="eyebrow text-ice-400">Integrity</h3>
            <p className="text-[12.5px] leading-relaxed text-ice-400">
              Detections are published as{' '}
              <span className="text-signal-400">
                unconfirmed satellite-change candidates
              </span>{' '}
              until independent ground-truth verification. Synthetic test
              fixtures are never served as live evidence.
            </p>
            <p className="text-[12.5px] leading-relaxed text-ice-400">
              Static GitHub Pages export. No secrets in the client, no runtime
              server dependencies.
            </p>
            <a
              href="https://github.com/kaustubhshinde077/forest-guard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ice-300 transition-colors hover:border-aqua/30 hover:text-white"
            >
              <Github className="h-3 w-3" />
              Source repository
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Giant ghost wordmark */}
        <div className="relative select-none overflow-hidden" aria-hidden="true">
          <div className="flex justify-center">
            <span className="text-stroke whitespace-nowrap font-heading text-[clamp(3.2rem,12vw,11rem)] font-semibold leading-[0.8] tracking-[-0.04em]">
              FOREST GUARD
            </span>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-4 border-t border-white/[0.07] py-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ice-500">
            © 2026 Forest Guard Contributors · Built for STEM2Connect AI
            Hackathon 2026 & OpenCV AI Competition 2026
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ice-500">
            <span className="hidden sm:inline">Static export · GitHub Pages</span>
            <span className="hidden h-3 w-px bg-white/10 sm:inline" />
            <a
              href="#top"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-ice-200"
            >
              Back to top
              <ArrowUp className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
