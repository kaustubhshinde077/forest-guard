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
} from 'lucide-react';
import { assetUrl, MonitoringState } from '@/lib/data';
import { InvestigationReport } from '@/types/incident';

interface GlobeHeroProps {
  monitoringState?: MonitoringState | null;
  candidates?: InvestigationReport[];
  totalGridSectors?: number;
  evaluatedSectors?: number;
  monitoredLandKm2?: number;
  basePath?: string;
}

export default function GlobeHero({
  monitoringState,
  candidates = [],
  totalGridSectors = 1479,
  evaluatedSectors = 5,
  monitoredLandKm2 = 390.86,
  basePath: propBasePath,
}: GlobeHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<Map | null>(null);

  const [webGLSupported, setWebGLSupported] = useState<boolean>(true);
  const [textureError, setTextureError] = useState<string | null>(null);
  const [globeReady, setGlobeReady] = useState<boolean>(false);

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
  const boundaryGeoJSONRef = useRef<any | null>(null);
  boundaryGeoJSONRef.current = boundaryGeoJSON;

  const [hudTelemetry, setHudTelemetry] = useState<{
    lng: string;
    lat: string;
    zoom: string;
  }>({
    lng: '76.800° E',
    lat: '19.300° N',
    zoom: '3.8',
  });

  const basePath = propBasePath || process.env.NEXT_PUBLIC_BASE_PATH || '';

  // 1. WebGL & Reduced Motion detection
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

  // 2. Boundary Layer Helper — Prominent Teal #3DFFB0
  const applyBoundaryLayers = useCallback((map: Map, geojson: any, animate: boolean) => {
    if (!map || !geojson) return;

    try {
      if (!map.getSource('maharashtra-boundary-src')) {
        map.addSource('maharashtra-boundary-src', {
          type: 'geojson',
          data: geojson,
        });

        // Visible bioluminescent teal area fill
        map.addLayer({
          id: 'maharashtra-boundary-fill',
          type: 'fill',
          source: 'maharashtra-boundary-src',
          paint: {
            'fill-color': '#3DFFB0',
            'fill-opacity': animate ? 0 : 0.22,
            'fill-opacity-transition': { duration: 1000 },
          },
        });

        // Soft restrained halo
        map.addLayer({
          id: 'maharashtra-boundary-glow',
          type: 'line',
          source: 'maharashtra-boundary-src',
          paint: {
            'line-color': '#3DFFB0',
            'line-width': 6.0,
            'line-blur': 4.0,
            'line-opacity': animate ? 0 : 0.75,
            'line-opacity-transition': { duration: 1000 },
          },
        });

        // Sharp core boundary stroke (2.5px solid #3DFFB0)
        map.addLayer({
          id: 'maharashtra-boundary-layer',
          type: 'line',
          source: 'maharashtra-boundary-src',
          paint: {
            'line-color': '#3DFFB0',
            'line-width': 2.5,
            'line-opacity': animate ? 0 : 1.0,
            'line-opacity-transition': { duration: 1000 },
          },
        });
      } else {
        (map.getSource('maharashtra-boundary-src') as any).setData(geojson);
        if (!animate) {
          if (map.getLayer('maharashtra-boundary-layer')) {
            map.setPaintProperty('maharashtra-boundary-layer', 'line-opacity', 1.0);
          }
          if (map.getLayer('maharashtra-boundary-glow')) {
            map.setPaintProperty('maharashtra-boundary-glow', 'line-opacity', 0.75);
          }
          if (map.getLayer('maharashtra-boundary-fill')) {
            map.setPaintProperty('maharashtra-boundary-fill', 'fill-opacity', 0.22);
          }
        }
      }
    } catch (e) {
      console.warn('Error applying boundary layers:', e);
    }
  }, []);

  // Fetch authoritative state boundary GeoJSON
  useEffect(() => {
    let mounted = true;
    fetch(assetUrl('/data/derived/maharashtra_boundary.geojson'))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        setBoundaryGeoJSON(data);
        const map = mapRef.current;
        if (map) {
          if (map.isStyleLoaded()) {
            applyBoundaryLayers(map, data, introState === 'playing' && !reducedMotion);
          } else {
            map.once('load', () => {
              applyBoundaryLayers(map, data, introState === 'playing' && !reducedMotion);
            });
          }
        }
      })
      .catch((err) => {
        console.warn('Could not load authoritative boundary GeoJSON:', err);
      });

    return () => {
      mounted = false;
    };
  }, [applyBoundaryLayers, introState, reducedMotion]);

  // 3. Layered Atmospheric Starfield Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let stars: Array<{
      x: number;
      y: number;
      radius: number;
      alpha: number;
      baseAlpha: number;
      twinkleSpeed: number;
      phase: number;
    }> = [];

    const resizeCanvas = () => {
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = rect?.width || window.innerWidth;
      canvas.height = rect?.height || 780;

      // Layered star distribution: small faint, medium, few bright
      const count = Math.floor((canvas.width * canvas.height) / 4500);
      stars = Array.from({ length: count }, (_, i) => {
        const isBright = i % 15 === 0;
        const isMedium = i % 4 === 0 && !isBright;
        const radius = isBright
          ? Math.random() * 0.6 + 1.2
          : isMedium
          ? Math.random() * 0.4 + 0.8
          : Math.random() * 0.3 + 0.4;
        const baseAlpha = isBright
          ? Math.random() * 0.3 + 0.6
          : isMedium
          ? Math.random() * 0.3 + 0.35
          : Math.random() * 0.25 + 0.15;

        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius,
          alpha: baseAlpha,
          baseAlpha,
          twinkleSpeed: (Math.random() * 0.02 + 0.008),
          phase: Math.random() * Math.PI * 2,
        };
      });

      // If reduced motion, render one static frame
      if (reducedMotion) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const s of stars) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(215, 230, 255, ${s.baseAlpha})`;
          ctx.fill();
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (!reducedMotion) {
      let t = 0;
      const render = () => {
        t += 0.05;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const s of stars) {
          const alphaDelta = Math.sin(t * s.twinkleSpeed * 10 + s.phase) * (s.baseAlpha * 0.35);
          const currentAlpha = Math.max(0.08, Math.min(0.95, s.baseAlpha + alphaDelta));

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(220, 235, 255, ${currentAlpha})`;
          ctx.fill();
        }
        animId = requestAnimationFrame(render);
      };
      render();
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [reducedMotion]);

  // 4. Skip Intro Callback
  const handleSkipIntro = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      sessionStorage.setItem('forestguard_intro_seen', 'true');
    } catch {}

    map.stop();
    map.flyTo({
      center: [76.8, 19.3],
      zoom: 3.85,
      pitch: 0,
      bearing: 0,
      duration: 600,
      essential: true,
    });

    const geo = boundaryGeoJSONRef.current;
    if (geo && !map.getLayer('maharashtra-boundary-layer')) {
      applyBoundaryLayers(map, geo, false);
    } else {
      if (map.getLayer('maharashtra-boundary-layer')) {
        map.setPaintProperty('maharashtra-boundary-layer', 'line-opacity', 1.0);
      }
      if (map.getLayer('maharashtra-boundary-glow')) {
        map.setPaintProperty('maharashtra-boundary-glow', 'line-opacity', 0.75);
      }
      if (map.getLayer('maharashtra-boundary-fill')) {
        map.setPaintProperty('maharashtra-boundary-fill', 'fill-opacity', 0.22);
      }
    }

    setIntroState('done');
  }, [applyBoundaryLayers]);

  // 5. Replay Intro Callback
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
      center: [45.0, 18.0],
      zoom: 2.15,
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
        map.setCenter([curCenter.lng + 0.05, curCenter.lat]);
        rotationRaf = requestAnimationFrame(orbitStep);
      } else {
        map.flyTo({
          center: [76.8, 19.3],
          zoom: 3.85,
          pitch: 0,
          bearing: 0,
          duration: 3500,
          essential: true,
        });

        setTimeout(() => {
          const geo = boundaryGeoJSONRef.current;
          if (geo && !map.getLayer('maharashtra-boundary-layer')) {
            applyBoundaryLayers(map, geo, false);
          } else {
            if (map.getLayer('maharashtra-boundary-layer')) {
              map.setPaintProperty('maharashtra-boundary-layer', 'line-opacity', 1.0);
            }
            if (map.getLayer('maharashtra-boundary-glow')) {
              map.setPaintProperty('maharashtra-boundary-glow', 'line-opacity', 0.75);
            }
            if (map.getLayer('maharashtra-boundary-fill')) {
              map.setPaintProperty('maharashtra-boundary-fill', 'fill-opacity', 0.22);
            }
          }
          setIntroState('done');
          try {
            sessionStorage.setItem('forestguard_intro_seen', 'true');
          } catch {}
        }, 3600);
      }
    };

    rotationRaf = requestAnimationFrame(orbitStep);
  }, [reducedMotion, applyBoundaryLayers]);

  // 6. MapLibre Globe Construction & Offset Management
  useEffect(() => {
    if (!webGLSupported || !mapContainerRef.current) return;

    let introSeen = false;
    try {
      introSeen = sessionStorage.getItem('forestguard_intro_seen') === 'true';
    } catch {}

    const shouldSkipAnimation = introSeen || reducedMotion;

    // Viewport coordinates:
    // Initial intro: center on Arabian Sea / Horn of Africa at zoom 2.15
    // Fly-in / returning: center on Maharashtra [76.8, 19.3] at zoom 3.85
    // India is prominent, Maharashtra unmistakable with teal boundary
    const initialCenter: [number, number] = shouldSkipAnimation ? [76.8, 19.3] : [45.0, 18.0];
    const initialZoom = shouldSkipAnimation ? 3.85 : 2.15;

    let map: Map;
    try {
      map = new Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          projection: { type: 'globe' },
          sky: {
            'sky-color': '#05060F',
            'horizon-color': '#09152b',
            'atmosphere-blend': 0.85,
          },
          sources: {
            'nasa-gibs-globe': {
              type: 'raster',
              tiles: [
                'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg',
              ],
              tileSize: 256,
              minzoom: 0,
              maxzoom: 8,
              attribution: 'NASA GIBS Blue Marble (August 2004, Shaded Relief and Bathymetry, Public Domain)',
            },
          },
          layers: [
            // Deep oceanic background so unloaded/polar facets never render dark void
            {
              id: 'globe-ocean-base',
              type: 'background',
              paint: {
                'background-color': '#081426',
              },
            },
            {
              id: 'nasa-gibs-globe-layer',
              type: 'raster',
              source: 'nasa-gibs-globe',
              minzoom: 0,
              maxzoom: 14,
              paint: {
                'raster-fade-duration': 300,
              },
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
    // Expose map globally for test suite and manifest verification
    if (typeof window !== 'undefined') {
      (window as any)._globeMap = map;
    }

    // Diagnostics
    map.on('error', (e) => {
      if (e?.error?.message?.includes('nasa-gibs')) {
        console.warn('NASA GIBS tile fetch issue:', e.error);
        setTextureError('NASA GIBS tile server connectivity issue');
      }
    });

    // Padding helper:
    // Below 1100px: Stacked layout (globe is in top container, padding is 0)
    // Desktop >= 1100px: Two-column layout (globe offset to right 56% with top clearance)
    const applyResponsivePadding = () => {
      if (!mapContainerRef.current) return;
      const w = window.innerWidth;
      if (w >= 1100) {
        // Desktop: offset globe into the right 56% with top clearance under nav
        const leftPadding = Math.floor(mapContainerRef.current.clientWidth * 0.44);
        map.setPadding({ left: leftPadding, top: 40, right: 0, bottom: 0 });
      } else {
        // Tablet / Mobile: globe centered in top block
        map.setPadding({ left: 0, top: 0, right: 0, bottom: 0 });
      }
    };

    applyResponsivePadding();

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

    // Stop auto-rotation if user interacts
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
      applyResponsivePadding();
      map.resize();

      const geo = boundaryGeoJSONRef.current;
      if (geo) {
        applyBoundaryLayers(map, geo, !shouldSkipAnimation);
      }

      if (shouldSkipAnimation) {
        setIntroState('done');
        updateHud();
      } else {
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
              zoom: 3.85,
              pitch: 0,
              bearing: 0,
              duration: 3500,
              essential: true,
            });

            setTimeout(() => {
              const currentGeo = boundaryGeoJSONRef.current;
              if (currentGeo && !map.getLayer('maharashtra-boundary-layer')) {
                applyBoundaryLayers(map, currentGeo, false);
              } else {
                if (map.getLayer('maharashtra-boundary-layer')) {
                  map.setPaintProperty('maharashtra-boundary-layer', 'line-opacity', 1.0);
                }
                if (map.getLayer('maharashtra-boundary-glow')) {
                  map.setPaintProperty('maharashtra-boundary-glow', 'line-opacity', 0.75);
                }
                if (map.getLayer('maharashtra-boundary-fill')) {
                  map.setPaintProperty('maharashtra-boundary-fill', 'fill-opacity', 0.22);
                }
              }
              setIntroState('done');
              try {
                sessionStorage.setItem('forestguard_intro_seen', 'true');
              } catch {}
            }, 3600);
          }
        };

        rotationRaf = requestAnimationFrame(orbitalSpin);
      }
    });

    // Mark globe ready when tiles render
    map.once('idle', () => {
      setGlobeReady(true);
    });

    // Ensure map canvas resizes accurately to container size
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        applyResponsivePadding();
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
      if (typeof window !== 'undefined') {
        delete (window as any)._globeMap;
      }
    };
  }, [webGLSupported, applyBoundaryLayers, reducedMotion]);

  // 7. Fallback SVG for Non-WebGL Sessions
  const fallbackSvgPath = useMemo(() => {
    if (!boundaryGeoJSON || !boundaryGeoJSON.features?.[0]?.geometry) return '';
    try {
      const geom = boundaryGeoJSON.features[0].geometry;
      const coords = geom.coordinates;
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
      className="relative w-full bg-[#05060F] overflow-hidden min-[1100px]:h-[88svh] min-[1100px]:min-h-[640px] min-[1100px]:max-h-[960px] flex flex-col justify-between"
    >
      {/* 1. Deep Space Starfield Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Atmospheric Nebula Glows (indigo & teal aura behind globe) */}
      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            'radial-gradient(circle at 75% 45%, rgba(30, 58, 138, 0.08) 0%, transparent 55%), radial-gradient(circle at 70% 50%, rgba(61, 255, 176, 0.05) 0%, transparent 45%)',
        }}
      />

      {/* Seamless bottom fade transition into page content on desktop */}
      <div className="hidden min-[1100px]:block absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#05060F] via-[#05060F]/80 to-transparent pointer-events-none z-[15]" />

      {/* 2. Top-Stacked Globe on Tablet/Mobile (< 1100px) OR Full-Bleed on Desktop (>= 1100px) */}
      <div className="relative w-full min-[1100px]:absolute min-[1100px]:inset-0 min-[1100px]:h-full h-[40svh] min-h-[260px] sm:min-h-[320px] max-h-[420px] z-10">
        {/* Soft celestial placeholder gradient while map tiles load */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
            globeReady ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            background:
              'radial-gradient(circle at center, rgba(14, 165, 233, 0.06) 0%, rgba(5, 6, 15, 0.8) 60%, transparent 100%)',
          }}
        />

        {webGLSupported ? (
          <div
            ref={mapContainerRef}
            className={`w-full h-full transition-opacity duration-700 ${
              globeReady ? 'opacity-100' : 'opacity-0'
            }`}
            tabIndex={0}
            aria-label="3D Globe representation of Earth and Maharashtra. Use mouse or keyboard navigation controls."
          />
        ) : (
          /* Accessible WebGL Fallback Mode */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#05060F] text-center space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>WebGL Fallback Mode Active</span>
            </div>
            {fallbackSvgPath && (
              <svg viewBox="0 0 480 340" className="w-48 h-36">
                <path
                  d={fallbackSvgPath}
                  fill="rgba(61, 255, 176, 0.12)"
                  stroke="#3DFFB0"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <p className="text-xs font-sans text-slate-300">
              Survey of India / Census 2011 Authoritative Boundary (307,492.71 km²)
            </p>
            <div className="pt-2">
              <Link
                href="/explore"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-all font-sans"
              >
                <span>Launch Accessible 1,479-Sector Table</span>
              </Link>
            </div>
          </div>
        )}

        {/* Minimal Monospace Telemetry Readout & Skip/Replay (Placed over globe on desktop, below on mobile) */}
        <div className="absolute bottom-3 right-6 sm:right-12 lg:right-16 z-20 flex items-center space-x-3 text-xs font-mono text-slate-400 bg-[#05060F]/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/[0.06]">
          <span>
            {hudTelemetry.lat} · {hudTelemetry.lng} · zoom {hudTelemetry.zoom}
          </span>
          <span className="text-white/20">|</span>
          {introState === 'playing' ? (
            <button
              onClick={handleSkipIntro}
              className="text-slate-400 hover:text-white inline-flex items-center space-x-1 transition-colors"
              title="Skip intro camera animation"
            >
              <SkipForward className="w-3 h-3 text-amber-400" />
              <span>Skip</span>
            </button>
          ) : (
            <button
              onClick={handleReplayIntro}
              className="text-slate-400 hover:text-white inline-flex items-center space-x-1 transition-colors"
              title="Replay intro animation"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Replay</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Editorial Column — Stacked below globe on mobile/tablet (< 1100px), Left Column on desktop (>= 1100px) */}
      <div className="relative pointer-events-none z-20 w-full min-[1100px]:w-[48%] px-6 sm:px-12 lg:px-16 pt-4 pb-8 min-[1100px]:pt-28 min-[1100px]:pb-12 flex flex-col justify-end">
        <div className="max-w-xl xl:max-w-2xl space-y-5 pointer-events-auto">
          {/* Eyebrow */}
          <div className="inline-flex items-center space-x-2 text-[12px] sm:text-[13px] font-sans font-medium tracking-wide text-[#3DFFB0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3DFFB0]"></span>
            <span>Earth observation · Maharashtra</span>
          </div>

          {/* Hero Headline */}
          <h1 className="font-heading font-bold text-white text-[clamp(1.75rem,7vw,2.25rem)] min-[1100px]:text-[clamp(2.25rem,3.25vw,3.5rem)] leading-[1.22] tracking-normal drop-shadow-lg [text-wrap:balance]">
            See what’s changing in Maharashtra’s forests.
          </h1>

          {/* Description */}
          <p className="font-sans text-slate-300 text-[15px] sm:text-[17px] leading-[1.6] max-w-lg">
            Comparing satellite observations across selected Maharashtra sectors to identify potential forest changes and investigate the evidence.
          </p>

          {/* Dual Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            {/* Primary CTA: Solid #3DFFB0, DM Sans 600 15px, 48px height, 12px radius, 24px padding, no glow */}
            <Link
              href="/explore"
              className="group h-12 px-6 rounded-xl bg-[#3DFFB0] hover:bg-[#5affc0] text-[#05060F] font-sans font-semibold text-[15px] inline-flex items-center justify-center space-x-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3DFFB0]"
            >
              <span>Explore Maharashtra</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-[3px]" />
            </Link>

            {/* Secondary CTA: Plain white text, 1px underline animates on hover, 48px target */}
            <Link
              href="/investigations"
              className="group h-12 px-4 text-white hover:text-slate-100 font-sans font-medium text-[15px] inline-flex items-center space-x-2 relative transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span className="relative">
                View investigations
                <span className="absolute left-4 right-4 -bottom-0.5 h-[1px] bg-white origin-left scale-x-0 transition-transform duration-200 group-hover:scale-x-100" />
              </span>
              <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-[3px]" />
            </Link>
          </div>

          {/* Discreet Pilot Notice (DM Sans ~13px, small amber dot as the only amber element) */}
          <div className="flex items-center space-x-2 text-[13px] font-sans text-slate-300 pt-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <span>
              Staged pilot: {evaluatedSectors} of {totalGridSectors.toLocaleString()} sectors assessed. All detections are unconfirmed candidates requiring ground-truth verification.
            </span>
          </div>

          {/* Bottom Attribution & Credit Line */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[12px] font-mono text-slate-400 pt-6 border-t border-white/[0.08] mt-6">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>NASA GIBS Blue Marble (August 2004, Shaded Relief & Bathymetry, Public Domain)</span>
              <span className="text-slate-600">·</span>
              <span>Survey of India / Census 2011 (OGD India)</span>
              <span className="text-slate-600">·</span>
              <span>Pilot evaluation: {evaluatedSectors} sectors assessed ({monitoredLandKm2.toFixed(2)} km² monitored land area)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
