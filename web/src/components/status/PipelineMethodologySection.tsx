'use client';

import React, { useState } from 'react';
import {
  Satellite,
  Crosshair,
  Layers,
  Cpu,
  Maximize2,
  FileSearch,
  FileCheck2,
  ChevronDown,
  ShieldCheck,
  ScanEye,
  type LucideIcon,
} from 'lucide-react';
import { Reveal, SectionHeading, StatusPill } from '@/components/ui';

type Tone = 'aqua' | 'bio' | 'signal';

interface Stage {
  step: string;
  title: string;
  summary: string;
  tech: string;
  details: string[];
  icon: LucideIcon;
  tone: Tone;
}

const TONE: Record<Tone, { icon: string; node: string; dot: string; bar: string }> = {
  aqua: {
    icon: 'border-aqua/25 bg-aqua/[0.07] text-aqua',
    node: 'border-aqua/30 text-aqua shadow-[0_0_24px_-12px_rgba(111,227,255,0.6)]',
    dot: 'bg-aqua',
    bar: 'via-aqua/50',
  },
  bio: {
    icon: 'border-bio/25 bg-bio/[0.06] text-bio-400',
    node: 'border-bio/30 text-bio-400 shadow-[0_0_24px_-12px_rgba(61,255,176,0.6)]',
    dot: 'bg-bio',
    bar: 'via-bio/50',
  },
  signal: {
    icon: 'border-signal/25 bg-signal/[0.06] text-signal-400',
    node: 'border-signal/30 text-signal-400 shadow-[0_0_24px_-12px_rgba(255,180,84,0.55)]',
    dot: 'bg-signal',
    bar: 'via-signal/50',
  },
};

const ACT_INDEX: Record<Tone, number> = { aqua: 0, bio: 1, signal: 2 };

const STAGES: Stage[] = [
  {
    step: '01',
    title: 'Satellite Observation Discovery & Ingestion',
    summary:
      'Finds the right Sentinel-2 scene pair for each sector and streams it straight from open cloud storage — no proprietary API, no credentials.',
    tech: 'Copernicus Sentinel-2 Level-2A • AWS Open Data S3 • CDSE OData STAC',
    icon: Satellite,
    tone: 'aqua',
    details: [
      'Queries Sentinel-2 Level-2A Bottom-of-Atmosphere (BOA) surface reflectance tiles with native 10 m spatial resolution across bands B04 (Red), B03 (Green), B02 (Blue), and B08 (NIR).',
      'Locks strictly to canonical MGRS tile identifiers per sector (e.g. 43PCT, 43QCU) to eliminate cross-granule misalignment offsets.',
      'Streams cloud-optimised GeoTIFFs (COGs) via direct open HTTPS byte-range requests without requiring cloud credentials or proprietary APIs.',
      'Maintains deterministic sector-to-MGRS spatial indexing across Maharashtra’s 1,479 canonical sectors.',
    ],
  },
  {
    step: '02',
    title: 'Temporal Coregistration & Sub-Pixel Alignment',
    summary:
      'Locks the two observation dates together pixel for pixel, so a difference between frames means change on the ground — not a shifted sensor.',
    tech: 'OpenCV 5 ECC Coregistration • ORB Feature Descriptors • Hamming Bit Verification',
    icon: Crosshair,
    tone: 'aqua',
    details: [
      'Performs sub-pixel image registration on 5-to-21-day observation pairs to ensure exact pixel-to-pixel correspondence and eliminate artificial edge deltas.',
      'Employs Enhanced Correlation Coefficient (ECC) optimisation under the Euclidean transform model.',
      'Computes Oriented FAST and Rotated BRIEF (ORB) feature descriptors with brute-force Hamming distance verification.',
      'Enforces a strict registration threshold: pairs with average Hamming distance > 18 bits are rejected as unreliably coregistered to prevent boundary false alarms.',
    ],
  },
  {
    step: '03',
    title: 'Terrestrial Boundary, Cloud & Shadow Masking',
    summary:
      'Strips out clouds, cloud shadows, water and everything outside the sector’s authoritative land boundary before any comparison begins.',
    tech: 'Sentinel-2 SCL Masking • Census 2011 Vector Clipping • Terrestrial Land Filter',
    icon: Layers,
    tone: 'aqua',
    details: [
      'Constructs binary operational masks isolating terrestrial forest canopy from maritime water, tidal flats, cloud tops, and topographic cloud shadows.',
      'Ingests the Sentinel-2 Scene Classification Layer (SCL) to mask high/medium probability clouds, thin cirrus, and cloud shadows.',
      'Clips raster calculations strictly within authoritative Survey of India / Census 2011 terrestrial boundary polygons.',
      'Strict quality safeguard: if cloud and shadow occlusion exceeds 35% of the terrestrial sector area, execution immediately aborts and flags the sector cloud_obscured with zero monitored credit.',
    ],
  },
  {
    step: '04',
    title: 'OpenCV 5 Classical Vision (Strict Zero-NDVI Policy)',
    summary:
      'Compares the two scenes with classical OpenCV maths — chromatic balance and micro-texture — instead of a single vegetation index.',
    tech: 'CIE L*a*b* Chromatic Delta • Reinhard Color Transfer • Laplacian Texture Variance',
    icon: Cpu,
    tone: 'bio',
    details: [
      'Executes deterministic classical computer vision in native OpenCV 5 without NDVI, EVI, NBR, or machine-learning probability hallucination.',
      'Transforms RGB imagery into CIE L*a*b* colour space, isolating the a* chromatic axis to detect true green-to-barren soil transitions.',
      'Normalises illumination using Reinhard statistical colour transfer, neutralising differences in solar elevation and seasonal atmospheric haze.',
      'Computes second-order Laplacian convolution (kernel size 3×3) to evaluate high-frequency spatial texture variance, distinguishing true canopy clearing from uniform seasonal grass senescence.',
    ],
  },
  {
    step: '05',
    title: 'Candidate-Area Integration & 1.0-Hectare Trigger',
    summary:
      'Keeps only contiguous change patches of 1.0 hectare or more, then computes their true ground area on an equal-area projection.',
    tech: 'Morphological Erosion/Dilation • Connected Component Labeling • Snyder LCC Equal-Area',
    icon: Maximize2,
    tone: 'bio',
    details: [
      'Extracts contiguous canopy change patches and computes geodesic ground areas using Snyder’s Lambert Conformal Conic integration.',
      'Applies morphological opening (3×3 elliptical structuring element) to suppress single-pixel agricultural noise.',
      'Executes two-pass 8-connectivity connected component labelling to delineate individual candidate change boundaries.',
      'Enforces a significance threshold: only contiguous change components measuring ≥ 1.0 ha are retained for dossier investigation; sub-hectare artefacts are suppressed.',
    ],
  },
  {
    step: '06',
    title: 'Closed-Loop Contextual Research & Investigation Trace',
    summary:
      'Reads the shape of each surviving patch, then searches public clearance, gazette and news records for context around it.',
    tech: 'Autonomous Lead Generation • PARIVESH & OGD India Gazette Search • Audit Trail',
    icon: FileSearch,
    tone: 'signal',
    details: [
      'Triggers automated contextual research driven by the geometric morphology of detected candidate patches.',
      'Classifies patch morphology (linear corridors, irregular clearings, compact blocks) to formulate targeted investigative queries.',
      'Retrieves public environmental records from the Ministry of Environment, Forest and Climate Change (PARIVESH portal), Open Government Data (OGD), and regional journalism.',
      'Epistemic boundary: retrieved literature is classified strictly as contextual background. No incident-specific legal authorisation or statutory clearance is claimed without direct coordinate-level proof.',
    ],
  },
  {
    step: '07',
    title: 'Dossier Generation, Publication & Evidence Honesty',
    summary:
      'Publishes an honest candidate dossier — full observation provenance, an uncalibrated score and a before/after viewer. Never a confirmation.',
    tech: 'Static Dossier Export • Uncalibrated Heuristic Scoring • WAI-ARIA Slider Delivery',
    icon: FileCheck2,
    tone: 'signal',
    details: [
      'Compiles individual candidate investigation reports into static HTML/JSON dossiers with complete observation provenance and visual verification assets.',
      'Mandatory labelling: all records carry the prominent label [UNCONFIRMED SATELLITE-CHANGE CANDIDATE].',
      'Detector scores are presented strictly as uncalibrated contrast metrics (0.00–1.00), never as probabilities of illegal logging.',
      'Renders interactive Before/After observation split sliders with honest empty states when observation crops are uncommitted.',
    ],
  },
];

const ZERO_NDVI_SIGNALS = [
  {
    symbol: 'Δa*',
    name: 'Chromatic shift',
    detail:
      'Green-to-exposed-soil transitions isolated on the CIE L*a*b* a* axis — real colour change, not a ratio.',
  },
  {
    symbol: '∇²',
    name: 'Laplacian texture variance',
    detail:
      'A 3×3 second-order convolution separates canopy structure loss from uniform seasonal browning.',
  },
  {
    symbol: '8-conn',
    name: 'Contiguous geometry',
    detail:
      'Two-pass 8-connectivity components of ≥ 1.0 ha are the only shapes allowed to become candidates.',
  },
];

const EVIDENCE_CATEGORIES: Array<{
  index: string;
  label: string;
  text: string;
  tone: Tone | 'ice';
}> = [
  {
    index: '01',
    label: 'Observed satellite change',
    text: 'Empirical 10 m pixel radiometric reflectance delta between coregistered Sentinel-2 observation passes.',
    tone: 'bio',
  },
  {
    index: '02',
    label: 'Algorithmic candidate',
    text: 'Contiguous patch ≥ 1.0 ha identified by classical morphological vision. Unconfirmed until ground-truthed.',
    tone: 'signal',
  },
  {
    index: '03',
    label: 'Contextual research leads',
    text: 'Retrieved public records, news, or gazettes providing regional context. Not coordinate-level legal proof.',
    tone: 'aqua',
  },
  {
    index: '04',
    label: 'Unresolved unknowns',
    text: 'Knowledge gaps requiring on-site forest division physical inspection (e.g. agricultural cycle vs clearing).',
    tone: 'ice',
  },
];

const EVIDENCE_TONE: Record<Tone | 'ice', { text: string; badge: string }> = {
  aqua: { text: 'text-aqua', badge: 'border-aqua/25 bg-aqua/[0.06]' },
  bio: { text: 'text-bio-400', badge: 'border-bio/25 bg-bio/[0.06]' },
  signal: { text: 'text-signal-400', badge: 'border-signal/25 bg-signal/[0.06]' },
  ice: { text: 'text-ice-300', badge: 'border-white/10 bg-white/[0.03]' },
};

function StageCard({ stage, defaultOpen }: { stage: Stage; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = stage.icon;
  const tone = TONE[stage.tone];
  const panelId = `pipeline-stage-${stage.step}-spec`;

  return (
    <article className="group relative overflow-hidden rounded-2xl panel panel-hover p-5 sm:p-6">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-px transition-opacity duration-500 ${
          open ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
        } bg-gradient-to-b from-transparent ${tone.bar} to-transparent`}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tone.icon}`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-ice-500">
              Stage {stage.step} <span className="text-ice-500/60">/ 07</span>
            </p>
            <h3 className="font-heading text-[15px] font-medium leading-snug tracking-[-0.01em] text-white sm:text-[16.5px]">
              {stage.title}
            </h3>
          </div>
        </div>
        <span aria-hidden="true" className="hidden shrink-0 items-center gap-1.5 sm:flex">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1 w-1 rounded-full ${i === ACT_INDEX[stage.tone] ? tone.dot : 'bg-white/15'}`}
            />
          ))}
        </span>
      </div>

      <p className="mt-3.5 text-[13px] leading-relaxed text-ice-300 sm:text-[13.5px]">
        {stage.summary}
      </p>

      <div className="mt-4 rounded-xl border border-white/[0.06] bg-ink-950/50 px-3.5 py-2.5">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-ice-500">
          Under the hood
        </p>
        <p className="mt-1 font-mono text-[10px] leading-relaxed tracking-[0.01em] text-ice-400">
          {stage.tech}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full py-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-ice-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/60"
      >
        <span>{open ? 'Hide specification' : 'Read specification'}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={panelId}
          className="anim-rise mt-3 space-y-2.5 border-t border-white/[0.06] pt-3.5"
        >
          {stage.details.map((detail, i) => (
            <div key={i} className="flex gap-2.5">
              <span
                aria-hidden="true"
                className={`mt-[7px] h-1 w-1 shrink-0 rounded-full ${tone.dot}`}
              />
              <p className="text-[12px] leading-relaxed text-ice-400 sm:text-[12.5px]">
                {detail}
              </p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function ZeroNdviCard() {
  return (
    <div className="relative overflow-hidden rounded-3xl panel p-6 sm:p-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-bio/[0.06] blur-[80px]"
      />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow eyebrow-aqua">Strict zero-NDVI policy</p>
          <StatusPill variant="live">Enforced everywhere</StatusPill>
        </div>

        <h3 className="display-tight mt-4 text-[clamp(1.45rem,2.4vw,1.95rem)] text-white">
          No NDVI. No index.
          <br />
          No black box.
        </h3>

        <p className="mt-3 text-[13px] leading-relaxed text-ice-300 sm:text-[13.5px]">
          Most forest-loss tools threshold a single vegetation index. Forest Guard
          computes none of it. A candidate has to earn its place through three
          independent classical-vision signals, with every step deterministic and
          reproducible.
        </p>

        <div className="mt-5 rounded-2xl border border-white/[0.07] bg-ink-950/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-ice-500">
              The index we refuse
            </span>
            <span className="rounded-full border border-signal/25 bg-signal/[0.06] px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.16em] text-signal-400">
              Not computed
            </span>
          </div>
          <p className="mt-2.5 font-mono text-[12.5px] text-ice-500 line-through decoration-signal/50 decoration-1">
            NDVI = (NIR − RED) / (NIR + RED)
          </p>
        </div>

        <ul className="mt-5 space-y-3.5">
          {ZERO_NDVI_SIGNALS.map((signal) => (
            <li key={signal.symbol} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 min-w-[2.4rem] shrink-0 items-center justify-center rounded-lg border border-aqua/20 bg-aqua/[0.05] px-1.5 font-mono text-[10px] text-aqua">
                {signal.symbol}
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium text-white">{signal.name}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ice-400">
                  {signal.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.07]">
          {[
            ['Stages', '7'],
            ['NDVI indices', '0'],
            ['Min. change', '1.0 ha'],
            ['Pixel', '10 m'],
          ].map(([label, value]) => (
            <div key={label} className="bg-ink-900/90 px-3 py-2.5">
              <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-ice-500">
                {label}
              </p>
              <p className="mt-0.5 font-mono text-[12px] text-ice-100">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PipelineMethodologySection() {
  return (
    <section
      id="pipeline"
      aria-labelledby="pipeline-heading"
      className="relative isolate overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-aqua/20 to-transparent" />
        <div className="absolute -top-24 right-[8%] h-72 w-72 rounded-full bg-aqua/[0.05] blur-[110px]" />
        <div className="absolute bottom-0 left-[4%] h-64 w-64 rounded-full bg-bio/[0.04] blur-[120px]" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-8 sm:py-24 lg:px-10">
        <Reveal>
          <div id="pipeline-heading">
            <SectionHeading
              eyebrow="Methodology · classical vision"
              title="Seven stages from orbit to a candidate dossier."
              lead="A deterministic OpenCV 5 pipeline transforms raw Copernicus Sentinel-2 Level-2A imagery into verifiable candidate dossiers. No vegetation index, no machine-learning probability — just colour, texture, geometry and provenance."
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill variant="info">7-stage pipeline</StatusPill>
                  <StatusPill variant="live">Zero NDVI</StatusPill>
                </div>
              }
            />
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-2.5 border-y border-white/[0.07] py-3">
            {[
              ['bg-aqua', 'Acquire & prepare', '01–03'],
              ['bg-bio', 'Detect & measure', '04–05'],
              ['bg-signal', 'Research & publish', '06–07'],
            ].map(([dot, label, range]) => (
              <span key={label} className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
                <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ice-400">
                  {label}
                </span>
                <span className="font-mono text-[9.5px] text-ice-500/70">{range}</span>
              </span>
            ))}
          </div>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-14">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal delay={0.05}>
              <ZeroNdviCard />
            </Reveal>

            <Reveal delay={0.12}>
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-ink-900/50 px-4 py-3.5">
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-ice-400"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <p className="text-[11.5px] leading-relaxed text-ice-400">
                  Detector scores are uncalibrated contrast metrics, never probabilities.
                  Every output remains an unconfirmed candidate until independently
                  ground-truthed.
                </p>
              </div>
            </Reveal>
          </div>

          <div className="relative">
            {/* connective rail */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-6 left-[1.25rem] top-6 w-px bg-gradient-to-b from-aqua/45 via-white/10 to-signal/35 sm:left-[1.375rem]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-6 left-[1.25rem] top-6 w-px bg-gradient-to-b from-transparent via-aqua/60 to-transparent anim-pulse-soft sm:left-[1.375rem]"
            />

            <Reveal>
              <ol className="relative space-y-4 sm:space-y-5">
                {STAGES.map((stage, i) => (
                  <li key={stage.step} className="relative pl-14 sm:pl-16">
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 top-4 flex h-10 w-10 items-center justify-center rounded-full border bg-ink-900 font-mono text-[10px] sm:top-5 sm:h-11 sm:w-11 sm:text-[11px] ${TONE[stage.tone].node}`}
                    >
                      {stage.step}
                    </span>
                    <StageCard stage={stage} defaultOpen={i === 0} />
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>

        <Reveal delay={0.05}>
          <div className="mt-16 overflow-hidden rounded-3xl panel p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl space-y-2">
                <p className="eyebrow eyebrow-aqua">Epistemic integrity</p>
                <h3 className="display-tight text-[clamp(1.3rem,2.2vw,1.75rem)] text-white">
                  Four separate categories of evidence.
                </h3>
                <p className="text-[13px] leading-relaxed text-ice-400">
                  Forest Guard maintains strict separation between four distinct
                  categories of evidence — they are never collapsed into a single
                  certainty, and unresolved gaps stay visible.
                </p>
              </div>
              <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ice-400 sm:inline-flex">
                <ScanEye className="h-3.5 w-3.5 text-aqua" strokeWidth={1.5} aria-hidden="true" />
                Never merged
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {EVIDENCE_CATEGORIES.map((category) => {
                const tone = EVIDENCE_TONE[category.tone];
                return (
                  <div
                    key={category.index}
                    className="rounded-2xl border border-white/[0.07] bg-ink-900/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[9px] tracking-[0.18em] text-ice-500">
                        {category.index}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] ${tone.badge} ${tone.text}`}
                      >
                        evidence
                      </span>
                    </div>
                    <p
                      className={`mt-3 font-heading text-[13.5px] font-medium leading-snug ${tone.text}`}
                    >
                      {category.label}
                    </p>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-ice-400">
                      {category.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
