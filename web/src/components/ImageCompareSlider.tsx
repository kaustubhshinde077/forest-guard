'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye, Sliders } from 'lucide-react';

interface ImageCompareSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeDate: string;
  afterDate: string;
  siteName: string;
}

export default function ImageCompareSlider({
  beforeUrl,
  afterUrl,
  beforeDate,
  afterDate,
  siteName,
}: ImageCompareSliderProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleSliderMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offset = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (offset / rect.width) * 100;
    setSliderPos(percentage);
  };

  return (
    <div className="bg-[#0e1623] border border-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 text-xs font-mono">
        <div className="flex items-center space-x-2 text-slate-300">
          <Sliders className="w-4 h-4 text-forest-400" />
          <span className="font-semibold text-white">OPENCV 5 SATELLITE COMPARISON SLIDER</span>
        </div>
        <div className="text-slate-400">
          Drag to inspect change boundary
        </div>
      </div>

      <div
        className="relative w-full aspect-square max-h-[440px] rounded overflow-hidden select-none cursor-ew-resize border border-slate-700/80 bg-black"
        onMouseMove={(e) => { if (e.buttons === 1) handleSliderMove(e); }}
        onClick={handleSliderMove}
        onTouchMove={handleSliderMove}
      >
        {/* 'After' Image (Base Layer) */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src={afterUrl}
            alt={`Recent observation: ${afterDate}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded text-xs font-mono border border-slate-700 text-slate-200">
            RECENT: {afterDate}
          </div>
        </div>

        {/* 'Before' Image (Top Layer clipped to slider position) */}
        <div
          className="absolute inset-0 w-full h-full overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          <img
            src={beforeUrl}
            alt={`Historical observation: ${beforeDate}`}
            className="absolute top-0 left-0 w-full h-full object-cover max-w-none"
            style={{ width: '100%', height: '100%' }}
          />
          <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded text-xs font-mono border border-slate-700 text-slate-200">
            HISTORICAL: {beforeDate}
          </div>
        </div>

        {/* Slider Handle Divider */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-forest-400 cursor-ew-resize shadow-[0_0_8px_rgba(52,211,153,0.8)]"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-forest-500 border-2 border-white flex items-center justify-center shadow-lg">
            <Sliders className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-3 text-xs text-slate-400 font-mono">
        <span>Sentinel-2 L2A (10m BOA Ground Resolution)</span>
        <span className="text-forest-400 font-semibold">{sliderPos.toFixed(0)}% Split View</span>
      </div>
    </div>
  );
}
