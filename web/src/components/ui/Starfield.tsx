'use client';

import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';

interface StarfieldProps {
  className?: string;
  /** Approximate number of stars; density scales with viewport area. */
  count?: number;
  twinkle?: boolean;
  color?: string;
}

/**
 * Canvas space backdrop. Reused on the hero and full-bleed page headers.
 * Cheap, DPR-aware, and static when the user prefers reduced motion.
 */
export default function Starfield({
  className,
  count,
  twinkle = true,
  color = '220, 235, 255',
}: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let stars: Array<{
      x: number;
      y: number;
      r: number;
      base: number;
      speed: number;
      phase: number;
    }> = [];
    let raf = 0;

    const build = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const w = rect?.width || window.innerWidth;
      const h = rect?.height || window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const total = count ?? Math.floor((w * h) / 5200);
      stars = Array.from({ length: total }, (_, i) => {
        const bright = i % 17 === 0;
        const medium = i % 5 === 0;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: bright ? Math.random() * 0.7 + 1.1 : medium ? Math.random() * 0.45 + 0.7 : Math.random() * 0.3 + 0.35,
          base: bright ? Math.random() * 0.3 + 0.6 : medium ? Math.random() * 0.3 + 0.32 : Math.random() * 0.22 + 0.12,
          speed: Math.random() * 1.2 + 0.3,
          phase: Math.random() * Math.PI * 2,
        };
      });

      if (reducedMotion) draw(0);
    };

    const draw = (t: number) => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const w = rect?.width || window.innerWidth;
      const h = rect?.height || window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        const alpha = reducedMotion
          ? s.base
          : Math.max(0.06, Math.min(0.95, s.base + Math.sin(t * 0.0016 * s.speed + s.phase) * s.base * 0.45));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${alpha})`;
        ctx.fill();
      }
    };

    build();
    window.addEventListener('resize', build);

    if (!reducedMotion && twinkle) {
      const loop = (t: number) => {
        draw(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener('resize', build);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [count, twinkle, color]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={clsx('pointer-events-none absolute inset-0 h-full w-full', className)}
    />
  );
}
