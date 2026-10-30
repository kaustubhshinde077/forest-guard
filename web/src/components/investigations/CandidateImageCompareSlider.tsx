'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Sliders, Eye, AlertTriangle, Database } from 'lucide-react';

interface CandidateImageCompareSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeDate: string;
  afterDate: string;
  sceneIds?: string[];
  incidentId?: string;
}

export default function CandidateImageCompareSlider({
  beforeUrl,
  afterUrl,
  beforeDate,
  afterDate,
  sceneIds = [],
  incidentId,
}: CandidateImageCompareSliderProps) {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [beforeError, setBeforeError] = useState<boolean>(false);
  const [afterError, setAfterError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Update position from mouse/touch clientX
  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement> | KeyboardEvent) => {
    if (e.defaultPrevented) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setSliderPos((prev) => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setSliderPos((prev) => Math.min(100, prev + 5));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSliderPos(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSliderPos(100);
    }
  };

  // Attach native keydown listener to container for maximum keyboard compatibility
  const setSliderRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (node) {
      const listener = (e: KeyboardEvent) => {
        const key = e.key || (e as any).code;
        if (key === 'ArrowLeft' || key === 'ArrowDown') {
          if (typeof e.preventDefault === 'function') e.preventDefault();
          setSliderPos((prev) => {
            const next = Math.max(0, prev - 5);
            node.setAttribute('aria-valuenow', String(Math.round(next)));
            return next;
          });
        } else if (key === 'ArrowRight' || key === 'ArrowUp') {
          if (typeof e.preventDefault === 'function') e.preventDefault();
          setSliderPos((prev) => {
            const next = Math.min(100, prev + 5);
            node.setAttribute('aria-valuenow', String(Math.round(next)));
            return next;
          });
        } else if (key === 'Home') {
          if (typeof e.preventDefault === 'function') e.preventDefault();
          setSliderPos(0);
          node.setAttribute('aria-valuenow', '0');
        } else if (key === 'End') {
          if (typeof e.preventDefault === 'function') e.preventDefault();
          setSliderPos(100);
          node.setAttribute('aria-valuenow', '100');
        }
      };
      node.addEventListener('keydown', listener);
    }
  }, []);

  // Honest Empty State if either image failed or is missing
  if (beforeError || afterError || !beforeUrl || !afterUrl) {
    return (
      <div className="bg-[#080d16] border border-slate-800 rounded-2xl p-6 text-center space-y-3 font-mono">
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <Database className="w-6 h-6 text-slate-500" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Paired Observation Crops Unavailable for Interactive Split Slider
          </h4>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
            In accordance with evidence honesty standards, Forest Guard does not synthesize or substitute stock satellite imagery. 
            The observation timestamps and Copernicus Sentinel-2 L2A scene IDs remain verifiable in the provenance section below.
          </p>
        </div>
        {beforeUrl && !beforeError && (
          <div className="pt-2 text-[10px] text-emerald-400">
            Historical crop ({beforeDate}) is archived and inspectable separately.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#080d16] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 font-sans">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center space-x-2 text-slate-300">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white uppercase tracking-wider">
            Sentinel-2 10m Ground Observation Slider
          </span>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center space-x-2">
          <span>Drag or use arrow keys</span>
          <span>•</span>
          <span className="text-emerald-400 font-bold">{sliderPos.toFixed(0)}% Split</span>
        </div>
      </div>

      {/* Interactive Slider Frame — Preserves native image aspect ratio */}
      <div
        ref={setSliderRef}
        role="slider"
        aria-valuenow={Math.round(sliderPos)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Before and after satellite comparison slider"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-full rounded-xl overflow-hidden select-none cursor-ew-resize border border-slate-800 bg-[#05070a] shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
          incidentId?.includes('MH-R07-C09')
            ? 'aspect-[880/1586] max-h-[540px] max-w-[340px] sm:max-w-[380px] mx-auto'
            : 'aspect-square max-h-[480px] max-w-[480px] mx-auto'
        }`}
      >
        {/* Layer 1: After / Recent Image (Bottom Layer) */}
        <div className="absolute inset-0 w-full h-full bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={afterUrl}
            alt={`Recent Sentinel-2 pass on ${afterDate}`}
            className="w-full h-full object-contain pointer-events-none"
            onError={() => setAfterError(true)}
          />
          {/* Recent Label */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded bg-black/80 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-emerald-300 font-semibold shadow-md pointer-events-none">
            RECENT: {afterDate} (L2A)
          </div>
        </div>

        {/* Layer 2: Before / Historical Image (Top Layer, clipped via CSS clip-path) */}
        <div
          className="absolute inset-0 w-full h-full pointer-events-none bg-black"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeUrl}
            alt={`Historical Sentinel-2 pass on ${beforeDate}`}
            className="w-full h-full object-contain pointer-events-none"
            onError={() => setBeforeError(true)}
          />
          {/* Historical Label */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-black/80 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-slate-300 font-semibold shadow-md pointer-events-none">
            HISTORICAL: {beforeDate} (L2A)
          </div>
        </div>

        {/* Slider Divider Line & Thumb */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 pointer-events-none shadow-[0_0_12px_rgba(52,211,153,0.9)]"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#0b121e] border-2 border-emerald-400 flex items-center justify-center shadow-2xl">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Slider Footer Information */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
        <div className="flex items-center space-x-2">
          <span className="text-slate-300 font-semibold">Sensor:</span>
          <span>Copernicus Sentinel-2 Level-2A (10m Native Ground Resolution)</span>
        </div>
        <div>
          <span>Coregistered via Sub-pixel ECC Optimization</span>
        </div>
      </div>
    </div>
  );
}
