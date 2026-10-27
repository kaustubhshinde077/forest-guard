'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Map, NavigationControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Compass,
  RotateCcw,
  SkipForward,
  ArrowRight,
  Shield,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Info,
  Maximize2
} from 'lucide-react';
import { assetUrl, MonitoringState } from '@/lib/data';
import { InvestigationReport } from '@/types/incident';

interface GlobeHeroProps {
  monitoringState: MonitoringState | null;
  candidates: InvestigationReport[];
}

// Key coordinate markers across Maharashtra for restrained aerospace HUD annotations
const REGIONAL_ANNOTATIONS = [
  { name: 'MUMBAI (18.98° N, 72.83° E)', coordinates: [72.8777, 19.0760] as [number, number], role: 'State Capital & Port' },
  { name: 'NAGPUR (21.15° N, 79.09° E)', coordinates: [79.0882, 21.1458] as [number, number], role: 'Eastern Vidarbha Hub' },
  { name: 'PUNE (18.52° N, 73.86° E)', coordinates: [73.8567, 18.5204] as [number, number], role: 'Western Ghats Sector' },
  { name: 'KOLHAPUR (15.74° N, 74.25° E)', coordinates: [74.2494, 15.7402] as [number, number], role: 'Pilot Candidate Sector MH-R01-C10' },
  { name: 'SINDHUDURG (15.72° N, 73.76° E)', coordinates: [73.7582, 15.7171] as [number, number], role: 'Pilot Candidate Sector MH-R01-C06' },
];

/**
 * Animated Counter Component
 * Interpolates numeric value with easeOutCubic over ~1.6s.
 * Snaps immediately if prefers-reduced-motion is enabled.
 */
function AnimatedCounter({
  value,
  decimals = 0,
  reducedMotion = false,
}: {
  value: number;
  decimals?: number;
  reducedMotion?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

    let start: number | null = null;
    const duration = 1600;
    let rafId: number;

    const step = (now: number) => {
      if (!start) start = now;
      const progress = Math.min((now - start) / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = ease * value;
      setDisplayValue(current);

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, decimals, reducedMotion]);

  if (decimals > 0) {
    return <span>{displayValue.toFixed(decimals)}</span>;
  }
  return <span>{Math.round(displayValue).toLocaleString()}</span>;
}

export default function GlobeHero({
  monitoringState,
  candidates,
}: GlobeHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<Map | null>(null);

  const [webGLSupported, setWebGLSupported] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const [introState, setIntroState] = useState<'playing' | 'done'>(() => {
    if (typeof window === 'undefined') return 'playing';
    try {
      if (sessionStorage.getItem('forestguard_intro_seen') === 'true') return 'done';
    } catch {}
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'done';
    return 'playing';
  });
  const [boundaryGeoJSON, setBoundaryGeoJSON] = useState<any | null>(null);
  const [hudTelemetry, setHudTelemetry] = useState<{
    lng: string;
    lat: string;
    zoom: string;
  }>({
    lng: '76.200° E',
    lat: '19.100° N',
    zoom: '6.2',
  });

  const [showAnnotations, setShowAnnotations] = useState<boolean>(false);

  // Derive counts dynamically from real datasets
  const totalGridSectors = 1479; // Census 2011 + EPSG:7755 Maharashtra matrix
  const evaluatedSectors = monitoringState?.last_run_summary?.sectors_evaluated ?? 5;
  const terrestrialLandKm2 = monitoringState?.monitored_terrestrial_area_km2 ?? 390.86;
  const candidateEventsCount = candidates.filter(c => !c.is_synthetic_test).length;

  // 1. Check WebGL and Reduced Motion preferences on mount
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);

    try {
      const testCanvas = document.createElement('canvas');
      const hasWebGL2 = Boolean(window.WebGL2RenderingContext && testCanvas.getContext('webgl2'));
      const hasWebGL1 = Boolean(window.WebGLRenderingContext && (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')));
      if (!hasWebGL2 && !hasWebGL1) {
        setWebGLSupported(false);
      }
    } catch {
      setWebGLSupported(false);
    }
  }, []);

  // 2. Fetch authoritative state boundary GeoJSON
  useEffect(() => {
    let mounted = true;
    fetch(assetUrl('/data/derived/maharashtra_boundary.geojson'))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (mounted) setBoundaryGeoJSON(data);
      })
      .catch((err) => {
        console.warn('Could not load maharashtra_boundary.geojson:', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // 3. Lightweight Starfield Background Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = true;

    const resizeCanvas = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Generate ~250 subtle stars
    const starCount = 250;
    const stars: Array<{
      x: number;
      y: number;
      radius: number;
      baseAlpha: number;
      speed: number;
      phase: number;
    }> = [];

    const rect = containerRef.current?.getBoundingClientRect() || { width: 1200, height: 680 };
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        radius: Math.random() * 1.2 + 0.3,
        baseAlpha: Math.random() * 0.55 + 0.15,
        speed: Math.random() * 0.002 + 0.001,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let startTime = performance.now();
    const render = (now: number) => {
      if (!isVisible || document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const elapsed = now - startTime;
      ctx.clearRect(0, 0, rect.width, rect.height);

      for (const star of stars) {
        const twinkle = Math.sin(elapsed * star.speed + star.phase);
        const alpha = Math.max(0.05, Math.min(0.85, star.baseAlpha + twinkle * 0.25));
        ctx.fillStyle = `rgba(220, 235, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      observer.disconnect();
    };
  }, [reducedMotion]);

  // 4. Helper to inject boundary layers into MapLibre
  const applyBoundaryLayers = useCallback((map: Map, geojson: any, animate: boolean) => {
    if (!map || !geojson || !map.isStyleLoaded()) return;

    if (!map.getSource('maharashtra-boundary-src')) {
      map.addSource('maharashtra-boundary-src', {
        type: 'geojson',
        data: geojson,
      });

      map.addLayer({
        id: 'maharashtra-boundary-fill',
        type: 'fill',
        source: 'maharashtra-boundary-src',
        paint: {
          'fill-color': '#34d399',
          'fill-opacity': animate ? 0 : 0.08,
          'fill-opacity-transition': { duration: 1200 },
        },
      });

      map.addLayer({
        id: 'maharashtra-boundary-layer',
        type: 'line',
        source: 'maharashtra-boundary-src',
        paint: {
          'line-color': '#34d399',
          'line-width': 2.2,
          'line-opacity': animate ? 0 : 0.95,
          'line-opacity-transition': { duration: 1200 },
        },
      });
    } else {
      (map.getSource('maharashtra-boundary-src') as any).setData(geojson);
    }
  }, []);

  // Update boundary when GeoJSON loads
  useEffect(() => {
    const map = mapRef.current;
    if (map && boundaryGeoJSON && map.isStyleLoaded()) {
      applyBoundaryLayers(map, boundaryGeoJSON, introState === 'playing' && !reducedMotion);
    }
  }, [boundaryGeoJSON, applyBoundaryLayers, introState, reducedMotion]);

  // 5. Skip Intro Callback
  const handleSkipIntro = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      sessionStorage.setItem('forestguard_intro_seen', 'true');
    } catch {}

    map.stop();
    map.jumpTo({
      center: [76.2, 19.1],
      zoom: 6.2,
      pitch: 0,
      bearing: 0,
    });

    if (map.getLayer('maharashtra-boundary-layer')) {
      map.setPaintProperty('maharashtra-boundary-layer', 'line-opacity', 0.95);
    }
    if (map.getLayer('maharashtra-boundary-fill')) {
      map.setPaintProperty('maharashtra-boundary-fill', 'fill-opacity', 0.08);
    }

    setIntroState('done');
    setShowAnnotations(true);
  }, []);

  // 6. Replay Intro Callback
  const handleReplayIntro = useCallback(() => {
    const map = mapRef.current;
    if (!map || reducedMotion) return;

    setIntroState('playing');
    setShowAnnotations(false);

    if (map.getLayer('maharashtra-boundary-layer')) {
      map.setPaintProperty('maharashtra-boundary-layer', 'line-opacity', 0);
    }
    if (map.getLayer('maharashtra-boundary-fill')) {
      map.setPaintProperty('maharashtra-boundary-fill', 'fill-opacity', 0);
    }

    map.stop();
    map.jumpTo({
      center: [45.0, 20.0],
      zoom: 1.8,
      pitch: 0,
      bearing: 0,
    });

    let rotationRaf: number;
    const startRotTime = performance.now();
    const rotDuration = 2200;

    const orbitStep = (now: number) => {
      const elapsed = now - startRotTime;
      if (elapsed < rotDuration) {
        const curCenter = map.getCenter();
        map.setCenter([curCenter.lng + 0.08, curCenter.lat]);
        rotationRaf = requestAnimationFrame(orbitStep);
      } else {
        map.flyTo({
          center: [76.2, 19.1],
          zoom: 6.2,
          pitch: 0,
          bearing: 0,
          duration: 4400,
          essential: true,
        });

        setTimeout(() => {
          if (map.getLayer('maharashtra-boundary-layer')) {
            map.setPaintProperty('maharashtra-boundary-layer', 'line-opacity', 0.95);
          }
          if (map.getLayer('maharashtra-boundary-fill')) {
            map.setPaintProperty('maharashtra-boundary-fill', 'fill-opacity', 0.08);
          }
          setIntroState('done');
          setShowAnnotations(true);
          try {
            sessionStorage.setItem('forestguard_intro_seen', 'true');
          } catch {}
        }, 4500);
      }
    };

    rotationRaf = requestAnimationFrame(orbitStep);
  }, [reducedMotion]);

  // 7. MapLibre Globe Construction
  useEffect(() => {
    if (!webGLSupported || !mapContainerRef.current) return;

    let introSeen = false;
    try {
      introSeen = sessionStorage.getItem('forestguard_intro_seen') === 'true';
    } catch {}

    const shouldSkipAnimation = introSeen || reducedMotion;

    const initialCenter: [number, number] = shouldSkipAnimation ? [76.2, 19.1] : [45.0, 20.0];
    const initialZoom = shouldSkipAnimation ? 6.2 : 1.8;

    let map: Map;
    try {
      map = new Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          projection: { type: 'globe' },
          sky: {
            'sky-color': '#05070a',
            'horizon-color': '#0c1a2e',
            'atmosphere-blend': 0.85,
          },
          sources: {
            'nasa-gibs-globe': {
              type: 'raster',
              tiles: [
                'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg',
              ],
              tileSize: 256,
              maxzoom: 8,
              attribution: 'NASA GIBS Blue Marble (August 2004, Shaded Relief and Bathymetry) (Public Domain)',
            },
          },
          layers: [
            {
              id: 'nasa-gibs-globe-layer',
              type: 'raster',
              source: 'nasa-gibs-globe',
              minzoom: 0,
              maxzoom: 14,
            },
          ],
        },
        center: initialCenter,
        zoom: initialZoom,
        minZoom: 1.2,
        maxZoom: 11.0,
        renderWorldCopies: false,
        attributionControl: false,
        pixelRatio: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2),
      });
    } catch (err) {
      console.warn('MapLibre GPU Initialization failed, rendering SVG fallback:', err);
      setWebGLSupported(false);
      return;
    }

    mapRef.current = map;

    map.addControl(new NavigationControl({ showCompass: true }), 'top-right');

    const updateHud = () => {
      const c = map.getCenter();
      const z = map.getZoom();
      const lngDir = c.lng >= 0 ? 'E' : 'W';
      const latDir = c.lat >= 0 ? 'N' : 'S';
      setHudTelemetry({
        lng: `${Math.abs(c.lng).toFixed(3)}° ${lngDir}`,
        lat: `${Math.abs(c.lat).toFixed(3)}° ${latDir}`,
        zoom: z.toFixed(1),
      });
    };

    map.on('move', updateHud);

    // Stop auto-rotation if user touches, drags, or zooms
    let userHasInteracted = false;
    let rotationRaf: number | null = null;

    const onUserInput = () => {
      if (!userHasInteracted) {
        userHasInteracted = true;
        if (rotationRaf) cancelAnimationFrame(rotationRaf);
      }
    };

    map.on('mousedown', onUserInput);
    map.on('wheel', onUserInput);
    map.on('touchstart', onUserInput);

    map.on('load', () => {
      if (boundaryGeoJSON) {
        applyBoundaryLayers(map, boundaryGeoJSON, !shouldSkipAnimation);
      }

      if (shouldSkipAnimation) {
        setIntroState('done');
        setShowAnnotations(true);
        updateHud();
        return;
      }

      // Initial orbital rotation beat (~2.4s)
      const startOrbitTime = performance.now();
      const orbitDuration = 2400;

      const orbitalSpin = (now: number) => {
        if (userHasInteracted) return;

        const elapsed = now - startOrbitTime;
        if (elapsed < orbitDuration) {
          const curCenter = map.getCenter();
          map.setCenter([curCenter.lng + 0.07, curCenter.lat]);
          rotationRaf = requestAnimationFrame(orbitalSpin);
        } else {
          // Cinematic flyTo Maharashtra
          map.flyTo({
            center: [76.2, 19.1],
            zoom: 6.2,
            pitch: 0,
            bearing: 0,
            duration: 4200,
            essential: true,
          });

          setTimeout(() => {
            if (map.getLayer('maharashtra-boundary-layer')) {
              map.setPaintProperty('maharashtra-boundary-layer', 'line-opacity', 0.95);
            }
            if (map.getLayer('maharashtra-boundary-fill')) {
              map.setPaintProperty('maharashtra-boundary-fill', 'fill-opacity', 0.08);
            }
            setIntroState('done');
            setShowAnnotations(true);
            try {
              sessionStorage.setItem('forestguard_intro_seen', 'true');
            } catch {}
          }, 4300);
        }
      };

      rotationRaf = requestAnimationFrame(orbitalSpin);
    });

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && mapRef.current) {
        mapRef.current.stop();
      }
    });
    if (mapContainerRef.current) {
      observer.observe(mapContainerRef.current);
    }

    return () => {
      if (rotationRaf) cancelAnimationFrame(rotationRaf);
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [webGLSupported, applyBoundaryLayers, reducedMotion]);

  // 8. Generate SVG Path for WebGL Fallback from real boundary GeoJSON
  const fallbackSvgPath = useMemo(() => {
    if (!boundaryGeoJSON || !boundaryGeoJSON.features?.[0]?.geometry) return '';
    try {
      const geom = boundaryGeoJSON.features[0].geometry;
      const coords = geom.coordinates; // MultiPolygon
      const minX = 72.655, maxX = 80.898;
      const minY = 15.606, maxY = 22.034;
      const w = 480, h = 340, pad = 15;

      let d = '';
      for (const poly of coords) {
        for (const ring of poly) {
          ring.forEach(([lon, lat]: [number, number], idx: number) => {
            const px = pad + ((lon - minX) / (maxX - minX)) * (w - 2 * pad);
            const py = pad + ((maxY - lat) / (maxY - minY)) * (h - 2 * pad);
            if (idx === 0) {
              d += `M ${px.toFixed(1)} ${py.toFixed(1)} `;
            } else {
              d += `L ${px.toFixed(1)} ${py.toFixed(1)} `;
            }
          });
          d += 'Z ';
        }
      }
      return d;
    } catch {
      return '';
    }
  }, [boundaryGeoJSON]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-[#05070a] shadow-2xl shadow-black/80 flex flex-col justify-between"
      style={{ minHeight: '660px' }}
    >
      {/* 1. Starfield background canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0"
        style={{ width: '100%', height: '100%' }}
      />

      {/* 2. MapLibre Globe Container or Accessible WebGL Fallback */}
      {webGLSupported ? (
        <div
          ref={mapContainerRef}
          className="absolute inset-0 z-10 w-full h-full"
          tabIndex={0}
          aria-label="3D Globe representation of Earth and Maharashtra. Use mouse or keyboard navigation controls."
        />
      ) : (
        /* Accessible High-Contrast SVG Fallback with real boundary */
        <div className="absolute inset-0 z-10 flex flex-col lg:flex-row items-center justify-between p-6 sm:p-10 bg-[#070b14] gap-6">
          <div className="max-w-md space-y-4">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>WebGL Fallback Mode Active</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
              MAHARASHTRA STATEWIDE CANOPY SURVEILLANCE
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Hardware WebGL 3D projection is unavailable in this environment. Showing authoritative Survey of India / Census 2011 vector boundary.
            </p>

            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-mono text-slate-400">
                Authoritative Boundary Area: <span className="text-white font-bold">307,492.71 km²</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Total Sector Grid: <span className="text-white font-bold">1,479 Sectors (EPSG:7755)</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Pilot Evaluated: <span className="text-emerald-400 font-bold">5 Sectors (390.86 km² terrestrial)</span>
              </div>
            </div>

            <Link
              href="/explore"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold shadow-lg shadow-emerald-950/50 transition"
            >
              <span>Launch Accessible 1,479-Sector Table</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Real Boundary Vector Preview */}
          <div className="relative w-full max-w-md h-[280px] bg-[#050810] border border-slate-800 rounded-xl p-4 flex items-center justify-center">
            {fallbackSvgPath ? (
              <svg viewBox="0 0 480 340" className="w-full h-full">
                <path
                  d={fallbackSvgPath}
                  fill="rgba(52, 211, 153, 0.12)"
                  stroke="#34d399"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <div className="text-xs font-mono text-slate-500">Loading Boundary Geometry...</div>
            )}
            <div className="absolute bottom-2 right-3 text-[9px] font-mono text-slate-500">
              Survey of India / Census 2011 (OGD India)
            </div>
          </div>
        </div>
      )}

      {/* 3. Restrained Aerospace HUD Overlays */}
      <div className="relative pointer-events-none z-20 flex flex-col justify-between p-4 sm:p-6 min-h-[660px]">
        {/* Top Bar: Mission Label & Skip / Replay Controls */}
        <div className="flex items-start justify-between">
          {/* Mission Indicator */}
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-[#0b121e]/90 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-emerald-400 pointer-events-auto">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold tracking-wider">EARTH OBSERVATION ORBIT</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">NASA GIBS BLUE MARBLE (AUG 2004 BACKGROUND)</span>
            </div>

            <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-2 pl-1">
              <span>PROJECTION: GLOBE 3D</span>
              <span>•</span>
              <span className="text-slate-300">{hudTelemetry.lat}, {hudTelemetry.lng}</span>
              <span>•</span>
              <span>ZOOM {hudTelemetry.zoom}</span>
            </div>
          </div>

          {/* Interactive Controls (Skip / Replay / Explore) */}
          <div className="flex items-center space-x-2 pointer-events-auto">
            {introState === 'playing' ? (
              <button
                onClick={handleSkipIntro}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white font-mono text-xs transition backdrop-blur-sm shadow-md"
                title="Skip camera flyTo directly to Maharashtra"
              >
                <SkipForward className="w-3.5 h-3.5 text-amber-400" />
                <span>Skip Intro</span>
              </button>
            ) : (
              <button
                onClick={handleReplayIntro}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-mono text-xs transition backdrop-blur-sm"
                title="Replay cinematic orbital zoom"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Replay Intro</span>
              </button>
            )}

            <Link
              href="/explore"
              className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold shadow-lg shadow-emerald-950/60 transition"
            >
              <span>Explore Maharashtra</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Floating Monospace Regional Nodes (Illuminated when Maharashtra is reached) */}
        {showAnnotations && (
          <div className="hidden lg:block pointer-events-none self-end max-w-sm space-y-1.5 mr-2 my-auto">
            <div className="text-[10px] font-mono text-slate-400 tracking-wider uppercase mb-1">
              Authoritative Reference Nodes:
            </div>
            {REGIONAL_ANNOTATIONS.slice(0, 4).map((node, i) => (
              <div
                key={i}
                className="flex items-center justify-between space-x-2 px-2.5 py-1.5 rounded bg-[#090e17]/90 border border-slate-800/90 backdrop-blur-sm text-[10px] font-mono text-slate-300"
              >
                <div className="flex items-center space-x-2 truncate">
                  <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">{node.name}</span>
                </div>
                <span className="text-slate-500 text-[9px] shrink-0">{node.role}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Bar: Mission Overview Callout & Telemetry Counters */}
        <div className="space-y-3 pt-6">
          {/* Mission Statement Banner */}
          <div className="max-w-2xl bg-[#090f19]/90 backdrop-blur-md border border-slate-800/90 rounded-xl p-4 sm:p-5 pointer-events-auto">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Forest Guard — Autonomous Canopy Surveillance</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Statewide Satellite Forest Canopy Surveillance
            </h1>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Monitoring Copernicus Sentinel-2 multispectral passes over Maharashtra&apos;s 307,492.71 km² territory. 
              Canopy changes are detected via pure classical OpenCV 5 CIE Lab chromatic delta and structural variance without NDVI, 
              then autonomously cross-referenced against official gazettes and clearance records.
            </p>
          </div>

          {/* Live Animated Telemetry Counters Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pointer-events-auto">
            {/* Metric 1 */}
            <div className="bg-[#090e17]/90 backdrop-blur-md border border-slate-800/90 rounded-xl p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Grid Matrix
              </div>
              <div className="text-lg sm:text-xl font-mono font-bold text-white mt-0.5">
                <AnimatedCounter value={totalGridSectors} reducedMotion={reducedMotion} />
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                Authoritative 36 districts
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-[#090e17]/90 backdrop-blur-md border border-slate-800/90 rounded-xl p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Pilot Assessed
              </div>
              <div className="text-lg sm:text-xl font-mono font-bold text-emerald-400 mt-0.5">
                <AnimatedCounter value={evaluatedSectors} reducedMotion={reducedMotion} />{' '}
                <span className="text-xs text-slate-400 font-normal">sectors</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                4 processed + 1 occluded
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-[#090e17]/90 backdrop-blur-md border border-slate-800/90 rounded-xl p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Land Monitored
              </div>
              <div className="text-lg sm:text-xl font-mono font-bold text-white mt-0.5">
                <AnimatedCounter value={terrestrialLandKm2} decimals={1} reducedMotion={reducedMotion} />{' '}
                <span className="text-xs text-slate-400 font-normal">km²</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                0.13% of state territory
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-[#090e17]/90 backdrop-blur-md border border-slate-800/90 rounded-xl p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Active Candidates
              </div>
              <div className="text-lg sm:text-xl font-mono font-bold text-amber-400 mt-0.5">
                <AnimatedCounter value={candidateEventsCount} reducedMotion={reducedMotion} />{' '}
                <span className="text-xs text-slate-400 font-normal">events</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                Unconfirmed change alerts
              </div>
            </div>
          </div>

          {/* Attributions HUD line */}
          <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 pt-1 px-1">
            <div className="flex items-center space-x-3">
              <span>Globe Background Texture: NASA GIBS Blue Marble (August 2004, Shaded Relief and Bathymetry, Public Domain)</span>
              <span>•</span>
              <span>Boundary: Survey of India / Census 2011 (OGD India)</span>
            </div>
            <div className="text-slate-400">
              Pilot Mode: 5 of 1,479 sectors assessed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
