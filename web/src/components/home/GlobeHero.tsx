'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  RotateCcw,
  SkipForward,
  ArrowRight,
  AlertTriangle,
  Globe2
} from 'lucide-react';
import { assetUrl, MonitoringState } from '@/lib/data';
import { InvestigationReport } from '@/types/incident';

interface GlobeHeroProps {
  monitoringState?: MonitoringState | null;
  candidates?: InvestigationReport[];
  basePath?: string;
}

export default function GlobeHero({
  monitoringState,
  candidates = [],
  basePath: propBasePath,
}: GlobeHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<Map | null>(null);

  const [webGLSupported, setWebGLSupported] = useState<boolean>(true);
  const [textureError, setTextureError] = useState<string | null>(null);
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
    lng: '76.800° E',
    lat: '19.300° N',
    zoom: '4.5',
  });

  const basePath = propBasePath || process.env.NEXT_PUBLIC_BASE_PATH || '';

  // 1. Check WebGL and Reduced Motion preferences
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handleMotionChange);

    try {
      const testCanvas = document.createElement('canvas');
      const hasWebGL2 = Boolean(window.WebGL2RenderingContext && testCanvas.getContext('webgl2'));
      const hasWebGL1 = Boolean(
        window.WebGLRenderingContext &&
          (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl'))
      );
      if (!hasWebGL2 && !hasWebGL1) {
        setWebGLSupported(false);
      }
    } catch {
      setWebGLSupported(false);
    }

    return () => mq.removeEventListener('change', handleMotionChange);
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
        console.warn('Could not load authoritative boundary GeoJSON:', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // 3. Subtle background starfield canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let stars: Array<{ x: number; y: number; radius: number; alpha: number; speed: number }> = [];

    const resizeCanvas = () => {
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = rect?.width || window.innerWidth;
      canvas.height = rect?.height || 680;

      const numStars = Math.floor((canvas.width * canvas.height) / 5000);
      stars = Array.from({ length: numStars }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.1 + 0.3,
        alpha: Math.random() * 0.7 + 0.15,
        speed: (Math.random() - 0.5) * 0.006,
      }));
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.alpha += s.speed;
        if (s.alpha > 0.85 || s.alpha < 0.15) s.speed = -s.speed;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210, 230, 255, ${Math.max(0, Math.min(1, s.alpha))})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animId);
    };
  }, [reducedMotion]);

  // 4. Apply Boundary Layer Helper
  const applyBoundaryLayers = useCallback((map: Map, geojson: any, animate: boolean) => {
    if (!map || !geojson || !map.isStyleLoaded()) return;

    if (!map.getSource('maharashtra-boundary-src')) {
      map.addSource('maharashtra-boundary-src', {
        type: 'geojson',
        data: geojson,
      });

      // Subtle emerald area fill
      map.addLayer({
        id: 'maharashtra-boundary-fill',
        type: 'fill',
        source: 'maharashtra-boundary-src',
        paint: {
          'fill-color': '#10b981',
          'fill-opacity': animate ? 0 : 0.10,
          'fill-opacity-transition': { duration: 1000 },
        },
      });

      // Emerald glow halo
      map.addLayer({
        id: 'maharashtra-boundary-glow',
        type: 'line',
        source: 'maharashtra-boundary-src',
        paint: {
          'line-color': '#10b981',
          'line-width': 4.5,
          'line-blur': 3.0,
          'line-opacity': animate ? 0 : 0.55,
          'line-opacity-transition': { duration: 1000 },
        },
      });

      // Sharp core boundary stroke
      map.addLayer({
        id: 'maharashtra-boundary-layer',
        type: 'line',
        source: 'maharashtra-boundary-src',
        paint: {
          'line-color': '#34d399',
          'line-width': 2.2,
          'line-opacity': animate ? 0 : 0.95,
          'line-opacity-transition': { duration: 1000 },
        },
      });
    } else {
      (map.getSource('maharashtra-boundary-src') as any).setData(geojson);
    }
  }, []);

  // Sync boundary when GeoJSON arrives
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
    map.flyTo({
      center: [76.8, 19.3],
      zoom: 4.5,
      pitch: 0,
      bearing: 0,
      duration: 800,
      essential: true,
    });

    if (map.getLayer('maharashtra-boundary-layer')) {
      map.setPaintProperty('maharashtra-boundary-layer', 'line-opacity', 0.95);
    }
    if (map.getLayer('maharashtra-boundary-glow')) {
      map.setPaintProperty('maharashtra-boundary-glow', 'line-opacity', 0.55);
    }
    if (map.getLayer('maharashtra-boundary-fill')) {
      map.setPaintProperty('maharashtra-boundary-fill', 'fill-opacity', 0.10);
    }

    setIntroState('done');
  }, []);

  // 6. Replay Intro Callback
  const handleReplayIntro = useCallback(() => {
    const map = mapRef.current;
    if (!map || reducedMotion) return;

    setIntroState('playing');

    if (map.getLayer('maharashtra-boundary-layer')) {
      map.setPaintProperty('maharashtra-boundary-layer', 'line-opacity', 0);
    }
    if (map.getLayer('maharashtra-boundary-glow')) {
      map.setPaintProperty('maharashtra-boundary-glow', 'line-opacity', 0);
    }
    if (map.getLayer('maharashtra-boundary-fill')) {
      map.setPaintProperty('maharashtra-boundary-fill', 'fill-opacity', 0);
    }

    map.stop();
    map.jumpTo({
      center: [55.0, 20.0],
      zoom: 2.2,
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
        map.setCenter([curCenter.lng + 0.06, curCenter.lat]);
        rotationRaf = requestAnimationFrame(orbitStep);
      } else {
        map.flyTo({
          center: [76.8, 19.3],
          zoom: 4.5,
          pitch: 0,
          bearing: 0,
          duration: 3800,
          essential: true,
        });

        setTimeout(() => {
          if (map.getLayer('maharashtra-boundary-layer')) {
            map.setPaintProperty('maharashtra-boundary-layer', 'line-opacity', 0.95);
          }
          if (map.getLayer('maharashtra-boundary-glow')) {
            map.setPaintProperty('maharashtra-boundary-glow', 'line-opacity', 0.55);
          }
          if (map.getLayer('maharashtra-boundary-fill')) {
            map.setPaintProperty('maharashtra-boundary-fill', 'fill-opacity', 0.10);
          }
          setIntroState('done');
          try {
            sessionStorage.setItem('forestguard_intro_seen', 'true');
          } catch {}
        }, 3900);
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

    // Viewport coordinates:
    // Initial intro: center on Indian Ocean / Arabia at zoom 2.2 for a large, stunning 3D Earth
    // Fly-in / returning: center on Maharashtra [76.8, 19.3] at zoom 4.5
    // At zoom 4.5, the curved spherical horizon of Earth and Arabian Sea are clearly visible
    const initialCenter: [number, number] = shouldSkipAnimation ? [76.8, 19.3] : [55.0, 20.0];
    const initialZoom = shouldSkipAnimation ? 4.5 : 2.2;

    let map: Map;
    try {
      map = new Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          projection: { type: 'globe' },
          sky: {
            'sky-color': '#030712',
            'horizon-color': '#0b1d33',
            'atmosphere-blend': 0.8,
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
        maxZoom: 10.0,
        renderWorldCopies: false,
        attributionControl: false,
        pixelRatio: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2),
      });
    } catch (err: any) {
      console.warn('MapLibre Globe Initialization failed, using vector fallback:', err);
      setTextureError(err?.message || 'WebGL initialization error');
      setWebGLSupported(false);
      return;
    }

    mapRef.current = map;

    // Source error diagnostics
    map.on('error', (e) => {
      if (e?.error?.message?.includes('nasa-gibs')) {
        console.warn('NASA GIBS tile fetch issue:', e.error);
        setTextureError('NASA GIBS tile server connectivity issue');
      }
    });

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
      map.resize();

      if (boundaryGeoJSON) {
        applyBoundaryLayers(map, boundaryGeoJSON, !shouldSkipAnimation);
      }

      if (shouldSkipAnimation) {
        setIntroState('done');
        updateHud();
        return;
      }

      // Initial orbital rotation beat (~2.2s)
      const startOrbitTime = performance.now();
      const orbitDuration = 2200;

      const orbitalSpin = (now: number) => {
        if (userHasInteracted) return;

        const elapsed = now - startOrbitTime;
        if (elapsed < orbitDuration) {
          const curCenter = map.getCenter();
          map.setCenter([curCenter.lng + 0.05, curCenter.lat]);
          rotationRaf = requestAnimationFrame(orbitalSpin);
        } else {
          // Cinematic flyTo Maharashtra
          map.flyTo({
            center: [76.8, 19.3],
            zoom: 4.5,
            pitch: 0,
            bearing: 0,
            duration: 3800,
            essential: true,
          });

          setTimeout(() => {
            if (map.getLayer('maharashtra-boundary-layer')) {
              map.setPaintProperty('maharashtra-boundary-layer', 'line-opacity', 0.95);
            }
            if (map.getLayer('maharashtra-boundary-glow')) {
              map.setPaintProperty('maharashtra-boundary-glow', 'line-opacity', 0.55);
            }
            if (map.getLayer('maharashtra-boundary-fill')) {
              map.setPaintProperty('maharashtra-boundary-fill', 'fill-opacity', 0.10);
            }
            setIntroState('done');
            try {
              sessionStorage.setItem('forestguard_intro_seen', 'true');
            } catch {}
          }, 3900);
        }
      };

      rotationRaf = requestAnimationFrame(orbitalSpin);
    });

    // Ensure map canvas resizes accurately to container size
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (rotationRaf) cancelAnimationFrame(rotationRaf);
      resizeObserver.disconnect();
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
      className="relative w-full h-[580px] sm:h-[640px] lg:h-[700px] rounded-3xl overflow-hidden border border-slate-800/80 bg-[#030712] shadow-2xl shadow-black/90 flex flex-col justify-between"
    >
      {/* 1. Deep space starfield background canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Atmospheric radial rim illumination */}
      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            'radial-gradient(circle at 65% 50%, rgba(16, 185, 129, 0.07) 0%, rgba(14, 165, 233, 0.04) 35%, transparent 70%)',
        }}
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
        <div className="absolute inset-0 z-10 flex flex-col lg:flex-row items-center justify-between p-6 sm:p-12 bg-[#050b16] gap-8">
          <div className="max-w-md space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>WebGL Fallback Mode Active</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
              Maharashtra Satellite Canopy Surveillance
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              3D globe hardware projection is unavailable in this browser session. Displaying authoritative Survey of India / Census 2011 vector boundaries.
              {textureError && <span className="block text-xs text-amber-400/80 mt-1">Diagnostic note: {textureError}</span>}
            </p>

            <div className="space-y-2 pt-3 font-mono text-xs">
              <div className="text-slate-400">
                Authoritative Boundary Area: <span className="text-white font-semibold">307,492.71 km²</span>
              </div>
              <div className="text-slate-400">
                Total Sector Grid: <span className="text-white font-semibold">1,479 Sectors (EPSG:7755)</span>
              </div>
              <div className="text-slate-400">
                Pilot Evaluated: <span className="text-emerald-400 font-semibold">5 Sectors (390.86 km² terrestrial)</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/explore"
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-lg shadow-emerald-950/50 transition-all"
              >
                <span>Launch Accessible 1,479-Sector Table</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Real Boundary Vector Preview */}
          <div className="relative w-full max-w-md h-[300px] bg-[#02050c] border border-slate-800 rounded-2xl p-6 flex items-center justify-center">
            {fallbackSvgPath ? (
              <svg viewBox="0 0 480 340" className="w-full h-full">
                <path
                  d={fallbackSvgPath}
                  fill="rgba(52, 211, 153, 0.12)"
                  stroke="#34d399"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <div className="text-xs font-mono text-slate-500">Loading Boundary Geometry...</div>
            )}
            <div className="absolute bottom-3 right-4 text-[10px] font-mono text-slate-500">
              Survey of India / Census 2011 (OGD India)
            </div>
          </div>
        </div>
      )}

      {/* 3. Refined Hero Header & Telemetry Controls */}
      <div className="relative pointer-events-none z-20 flex flex-col justify-between p-6 sm:p-10 h-full">
        {/* Top Controls Strip: Orbit Label & Skip/Replay */}
        <div className="flex items-start justify-between gap-4">
          {/* Mission Tag */}
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs font-mono text-emerald-400 pointer-events-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold tracking-wider">EARTH OBSERVATION ORBIT</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 hidden sm:inline">NASA GIBS BLUE MARBLE (AUG 2004 BACKGROUND)</span>
          </div>

          {/* Controls: Telemetry readout + Skip/Replay */}
          <div className="flex items-center space-x-2.5 pointer-events-auto">
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-xs font-mono text-slate-300">
              <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>3D GLOBE</span>
              <span className="text-slate-600">·</span>
              <span>{hudTelemetry.lat}, {hudTelemetry.lng}</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400">ZOOM {hudTelemetry.zoom}</span>
            </div>

            {introState === 'playing' ? (
              <button
                onClick={handleSkipIntro}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white font-mono text-xs transition backdrop-blur-md shadow-md"
                title="Skip camera flyTo directly to Maharashtra"
              >
                <SkipForward className="w-3.5 h-3.5 text-amber-400" />
                <span>Skip Intro</span>
              </button>
            ) : (
              <button
                onClick={handleReplayIntro}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-mono text-xs transition backdrop-blur-md"
                title="Replay cinematic orbital zoom"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Replay Intro</span>
              </button>
            )}
          </div>
        </div>

        {/* Hero Editorial Copy Overlay (Confident, spacious, non-blocking) */}
        <div className="max-w-xl space-y-5 pt-8 pointer-events-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Sentinel-2 Satellite Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.12] drop-shadow-md">
            See what’s changing in Maharashtra’s forests.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed drop-shadow">
            Autonomous satellite canopy surveillance across 307,493 km² using European Space Agency Sentinel-2 passes, automated change detection, and verifiable ground-truth dossiers.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/explore"
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/60 transition-all hover:translate-y-[-1px]"
            >
              <span>Explore Maharashtra</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/investigations"
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700 text-slate-200 hover:text-white text-sm font-medium backdrop-blur-md transition-all hover:translate-y-[-1px]"
            >
              <span>View Investigations</span>
            </Link>
          </div>
        </div>

        {/* Minimal Baseline Attribution Footnote */}
        <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400/90 pt-6 px-1">
          <div className="flex items-center space-x-2">
            <span>Globe Background Texture: NASA GIBS Blue Marble (August 2004, Shaded Relief and Bathymetry, Public Domain)</span>
            <span>•</span>
            <span>Boundary: Survey of India / Census 2011 (OGD India)</span>
          </div>
          <div className="hidden sm:block text-slate-400">
            Pilot Mode: 5 of 1,479 sectors assessed
          </div>
        </div>
      </div>
    </div>
  );
}
