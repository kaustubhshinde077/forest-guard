'use client';

import React from 'react';
import {
  Cpu,
  Layers,
  Sparkles,
  Sliders,
  Maximize2,
  Search,
  FileCheck2,
  AlertTriangle,
  Compass,
  Database,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

const PIPELINE_STAGES = [
  {
    step: '01',
    title: 'Satellite Observation Discovery & Ingestion',
    tech: 'Copernicus Sentinel-2 Level-2A • AWS Open Data S3 • CDSE OData STAC',
    icon: Compass,
    iconColor: 'text-blue-400',
    description:
      'Queries Sentinel-2 Level-2A Bottom-of-Atmosphere (BOA) surface reflectance tiles with native 10m spatial resolution across bands B04 (Red), B03 (Green), B02 (Blue), and B08 (NIR).',
    details: [
      'Locks strictly to canonical MGRS tile identifiers per sector (e.g. 43PCT, 43QCU) to eliminate cross-granule misalignment offsets.',
      'Streams cloud-optimized GeoTIFFs (COGs) via direct open HTTPS byte-range HTTP GETs without requiring cloud credentials or proprietary APIs.',
      'Maintains deterministic sector-to-MGRS spatial indexing across Maharashtra’s 1,479 canonical sectors.'
    ]
  },
  {
    step: '02',
    title: 'Temporal Coregistration & Sub-Pixel Alignment',
    tech: 'OpenCV 5 ECC Coregistration • ORB Feature Descriptors • Hamming Bit Verification',
    icon: Sliders,
    iconColor: 'text-emerald-400',
    description:
      'Performs sub-pixel image registration on 5-to-21-day observation pairs to ensure exact pixel-to-pixel correspondence and eliminate artificial edge deltas.',
    details: [
      'Employs Enhanced Correlation Coefficient (ECC) optimization under Euclidean transform model.',
      'Computes Oriented FAST and Rotated BRIEF (ORB) feature descriptors with brute-force Hamming distance verification.',
      'Enforces strict registration threshold: pairs with average Hamming distance > 18 bits are rejected as unreliably coregistered to prevent boundary false alarms.'
    ]
  },
  {
    step: '03',
    title: 'Terrestrial Boundary, Cloud & Shadow Masking',
    tech: 'Sentinel-2 SCL Masking • Census 2011 Vector Clipping • Terrestrial Land Filter',
    icon: Layers,
    iconColor: 'text-amber-400',
    description:
      'Constructs binary operational masks isolating terrestrial forest canopy from maritime water, tidal flats, cloud tops, and topographic cloud shadows.',
    details: [
      'Ingests Sentinel-2 Scene Classification Layer (SCL) to mask high/medium probability clouds, thin cirrus, and cloud shadows.',
      'Clips raster calculations strictly within authoritative Survey of India / Census 2011 terrestrial boundary polygons.',
      'Strict Quality Safeguard: If cloud and shadow occlusion exceeds 35% of the terrestrial sector area, execution immediately aborts and flags the sector cloud_obscured with zero monitored credit.'
    ]
  },
  {
    step: '04',
    title: 'OpenCV 5 Classical Vision (Strict Zero-NDVI Policy)',
    tech: 'CIE L*a*b* Chromatic Delta • Reinhard Color Transfer • Laplacian Texture Variance',
    icon: Cpu,
    iconColor: 'text-emerald-400',
    description:
      'Executes deterministic classical computer vision in native OpenCV 5 without NDVI, EVI, NBR, or machine learning probability hallucination.',
    details: [
      'Transforms RGB imagery into CIE L*a*b* color space, isolating the a* chromatic axis to detect true green-to-barren soil transitions.',
      'Normalizes illumination using Reinhard statistical color transfer, neutralizing differences in solar elevation and seasonal atmospheric haze.',
      'Computes second-order Laplacian convolution (kernel size 3×3) to evaluate high-frequency spatial texture variance, distinguishing true canopy clearing from uniform seasonal grass senescence.'
    ]
  },
  {
    step: '05',
    title: 'Candidate-Area Integration & 1.0-Hectare Trigger',
    tech: 'Morphological Erosion/Dilation • Connected Component Labeling • Snyder LCC Equal-Area',
    icon: Maximize2,
    iconColor: 'text-amber-400',
    description:
      'Extracts contiguous canopy change patches and computes geodesic ground areas using Snyder’s Lambert Conformal Conic integration.',
    details: [
      'Applies morphological opening (3×3 elliptical structuring element) to suppress single-pixel agricultural noise.',
      'Executes two-pass 8-connectivity connected component labeling to delineate individual candidate change boundaries.',
      'Enforces significance threshold: Only contiguous change components measuring ≥ 1.0 ha are retained for dossier investigation; sub-hectare artifacts are suppressed.'
    ]
  },
  {
    step: '06',
    title: 'Closed-Loop Contextual Research & Investigation Trace',
    tech: 'Autonomous Lead Generation • PARIVESH & OGD India Gazette Search • Audit Trail',
    icon: Search,
    iconColor: 'text-blue-400',
    description:
      'Triggers automated contextual research driven by the geometric morphology of detected candidate patches.',
    details: [
      'Classifies patch morphology (linear corridors, irregular clearings, compact blocks) to formulate targeted investigative queries.',
      'Retrieves public environmental records from the Ministry of Environment, Forest and Climate Change (PARIVESH portal), Open Government Data (OGD), and regional journalism.',
      'Epistemic Boundary: Retrieved literature is classified strictly as contextual background. No incident-specific legal authorization or statutory clearance is claimed without direct coordinate-level proof.'
    ]
  },
  {
    step: '07',
    title: 'Dossier Generation, Publication & Evidence Honesty',
    tech: 'Static Dossier Export • Uncalibrated Heuristic Scoring • WAI-ARIA Slider Delivery',
    icon: FileCheck2,
    iconColor: 'text-emerald-400',
    description:
      'Compiles individual candidate investigation reports into static HTML/JSON dossiers with complete observation provenance and visual verification assets.',
    details: [
      'Mandatory Labeling: All records carry the prominent label [UNCONFIRMED SATELLITE-CHANGE CANDIDATE].',
      'Detector scores are presented strictly as uncalibrated contrast metrics (0.00–1.00), never as probabilities of illegal logging.',
      'Renders interactive Before/After observation split sliders with honest empty states when observation crops are uncommitted.'
    ]
  }
];

export default function PipelineMethodologySection() {
  return (
    <section id="pipeline" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1e293b]">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wide flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>OpenCV 5 Classical Vision Pipeline</span>
          </h2>
          <p className="text-xs text-slate-400 font-sans">
            Seven-stage deterministic pipeline transforming raw Copernicus Sentinel-2 Level-2A imagery into verifiable candidate dossiers.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Strict Zero-NDVI Policy</span>
        </div>
      </div>

      {/* Epistemic Boundary Notice */}
      <div className="p-4 rounded-xl bg-[#0b121e] border border-slate-800 text-xs font-sans space-y-2">
        <div className="font-mono font-bold text-white text-xs uppercase tracking-wider flex items-center space-x-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Epistemic Integrity & Evidence Categorization Standards</span>
        </div>
        <p className="text-slate-300 text-[11px] leading-relaxed">
          Forest Guard maintains strict separation between four distinct categories of evidence:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-xs font-mono">
          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
            <span className="text-emerald-400 font-bold block text-[10px] uppercase">1. Observed Satellite Change</span>
            <span className="text-slate-300 text-[11px]">Empirical 10m pixel radiometric reflectance delta between coregistered Sentinel-2 observation passes.</span>
          </div>
          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
            <span className="text-amber-400 font-bold block text-[10px] uppercase">2. Algorithmic Candidate</span>
            <span className="text-slate-300 text-[11px]">Contiguous patch ≥ 1.0 ha identified by classical morphological vision. Unconfirmed until ground-truthed.</span>
          </div>
          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
            <span className="text-blue-400 font-bold block text-[10px] uppercase">3. Contextual Research Leads</span>
            <span className="text-slate-300 text-[11px]">Retrieved public records, news, or gazettes providing regional context. Not coordinate-level legal proof.</span>
          </div>
          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 font-bold block text-[10px] uppercase">4. Unresolved Unknowns</span>
            <span className="text-slate-300 text-[11px]">Knowledge gaps requiring on-site forest division physical inspection (e.g. agricultural cycle vs clearing).</span>
          </div>
        </div>
      </div>

      {/* 7-Stage Walkthrough List */}
      <div className="space-y-4">
        {PIPELINE_STAGES.map((st) => {
          const Icon = st.icon;
          return (
            <div
              key={st.step}
              className="p-5 rounded-2xl bg-[#080d16] border border-slate-800 space-y-3 font-sans transition hover:border-slate-700"
            >
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs font-extrabold text-emerald-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                    STAGE {st.step}
                  </span>
                  <h3 className="font-bold text-white text-sm sm:text-base tracking-tight flex items-center space-x-2">
                    <Icon className={`w-4 h-4 ${st.iconColor}`} />
                    <span>{st.title}</span>
                  </h3>
                </div>
                <div className="font-mono text-[11px] text-slate-400 sm:text-right">
                  {st.tech}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {st.description}
              </p>

              {/* Bullet points */}
              <ul className="space-y-1.5 pt-1 text-xs font-mono text-slate-400 border-t border-slate-800/80">
                {st.details.map((dt, idx) => (
                  <li key={idx} className="flex items-start space-x-2 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300 text-[11px] font-sans">{dt}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
