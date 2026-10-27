'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Map, NavigationControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Search,
  Layers,
  MapPin,
  Table as TableIcon,
  Compass,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Eye,
  Info,
  Maximize2
} from 'lucide-react';
import { STATUS_META, SectorStatusCode } from '@/lib/status';
import { InvestigationReport } from '@/types/incident';
import { MonitoringState, assetUrl } from '@/lib/data';
import AccessibleSectorTable, { SectorSummary } from './AccessibleSectorTable';
import SectorDetailPanel from './SectorDetailPanel';

type BasemapStyleKey = 'eox-s2cloudless' | 'nasa-gibs' | 'carto-dark';

interface MapLibreExplorerProps {
  monitoringState: MonitoringState | null;
  candidates: InvestigationReport[];
}

export default function MapLibreExplorer({
  monitoringState,
  candidates,
}: MapLibreExplorerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  // View mode & WebGL detection
  const [viewMode, setViewMode] = useState<'map' | 'table'>('map');
  const [webGLSupported, setWebGLSupported] = useState<boolean>(true);

  // Basemap selection (default: genuine Sentinel-2 cloudless composite)
  const [basemapStyle, setBasemapStyle] = useState<BasemapStyleKey>('eox-s2cloudless');

  // GeoJSON datasets
  const [sectorsGeoJSON, setSectorsGeoJSON] = useState<any | null>(null);
  const [boundaryGeoJSON, setBoundaryGeoJSON] = useState<any | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SectorStatusCode>('all');
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);

  // Helper to update selected sector state and URL query parameter (?sector=)
  const selectSector = (id: string | null) => {
    setSelectedSectorId(id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (id) {
        url.searchParams.set('sector', id);
      } else {
        url.searchParams.delete('sector');
      }
      window.history.replaceState(null, '', url.toString());
    }
  };

  // Check for ?sector= query parameter on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paramSector = params.get('sector');
    if (paramSector) {
      setSelectedSectorId(paramSector);
    }
  }, []);

  // Fit camera bounds when a sector is selected
  useEffect(() => {
    if (!selectedSectorId || !mapRef.current || !sectorsGeoJSON) return;
    const feature = sectorsGeoJSON.features?.find(
      (f: any) => f.properties?.id === selectedSectorId
    );
    if (feature && feature.geometry && feature.geometry.coordinates) {
      const coords = feature.geometry.coordinates[0];
      if (Array.isArray(coords)) {
        let minX = 180, maxX = -180, minY = 90, maxY = -90;
        coords.forEach(([x, y]: [number, number]) => {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        });
        if (minX <= maxX && minY <= maxY) {
          mapRef.current.fitBounds(
            [[minX, minY], [maxX, maxY]],
            { padding: 100, maxZoom: 10.5, duration: 1600 }
          );
        }
      }
    }
  }, [selectedSectorId, sectorsGeoJSON]);
  const [hoveredSector, setHoveredSector] = useState<{
    id: string;
    district: string;
    region: string;
    status: SectorStatusCode;
    landAreaKm2: number;
    x: number;
    y: number;
  } | null>(null);

  // Layer visibility toggles
  const [showSectors, setShowSectors] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [showCandidateMarkers, setShowCandidateMarkers] = useState(true);
  const [showCandidateBboxes, setShowCandidateBboxes] = useState(true);

  // Check WebGL support on mount
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLSupported(false);
        setViewMode('table');
      }
    } catch (e) {
      setWebGLSupported(false);
      setViewMode('table');
    }
  }, []);

  // Fetch derived GeoJSON assets statically
  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch(assetUrl('/data/derived/maharashtra_sectors.geojson')).then((r) => r.json()),
      fetch(assetUrl('/data/derived/maharashtra_boundary.geojson')).then((r) => r.json()),
    ])
      .then(([sectors, boundary]) => {
        if (mounted) {
          setSectorsGeoJSON(sectors);
          setBoundaryGeoJSON(boundary);
        }
      })
      .catch((err) => {
        console.error('Failed to load derived map GeoJSON:', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Sectors list for search, table, and detail panel
  const sectorsList: SectorSummary[] = useMemo(() => {
    if (!sectorsGeoJSON || !sectorsGeoJSON.features) return [];
    return sectorsGeoJSON.features.map((f: any) => {
      const p = f.properties || {};
      return {
        id: p.id || '',
        district: p.d || 'Unknown',
        region: p.r || 'Deccan Plateau',
        landAreaKm2: p.a || 0,
        status: (p.s as SectorStatusCode) || 'unassessed',
        batchDay: p.b || 1,
        isForestPriority: Boolean(p.f),
      };
    });
  }, [sectorsGeoJSON]);

  // Candidate GeoJSON: Centroids & Approximate Bounding Box Extents
  const { candidatesCentroidsGeoJSON, candidatesBboxesGeoJSON } = useMemo(() => {
    const pointsFeatures: any[] = [];
    const bboxesFeatures: any[] = [];

    candidates.forEach((c) => {
      const sectorId = c.incident_id.match(/MH-R\d+-C\d+/)?.[0] || '';

      // Centroid marker feature
      pointsFeatures.push({
        type: 'Feature' as const,
        properties: {
          id: c.incident_id,
          title: c.report_title,
          area: c.affected_area_hectares,
          sectorId,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: c.geographic_coordinates,
        },
      });

      // Bounding box extent feature (if bbox exists)
      if (c.geographic_bounding_box && c.geographic_bounding_box.length === 4) {
        const [minX, minY, maxX, maxY] = c.geographic_bounding_box;
        bboxesFeatures.push({
          type: 'Feature' as const,
          properties: {
            id: c.incident_id,
            title: c.report_title,
            area: c.affected_area_hectares,
            sectorId,
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [[
              [minX, minY],
              [maxX, minY],
              [maxX, maxY],
              [minX, maxY],
              [minX, minY],
            ]],
          },
        });
      }
    });

    return {
      candidatesCentroidsGeoJSON: {
        type: 'FeatureCollection' as const,
        features: pointsFeatures,
      },
      candidatesBboxesGeoJSON: {
        type: 'FeatureCollection' as const,
        features: bboxesFeatures,
      },
    };
  }, [candidates]);

  // Selected sector details lookup
  const selectedSectorFeature = useMemo(() => {
    if (!selectedSectorId || !sectorsGeoJSON) return null;
    return sectorsGeoJSON.features.find((f: any) => f.properties?.id === selectedSectorId);
  }, [selectedSectorId, sectorsGeoJSON]);

  const selectedSectorCandidates = useMemo(() => {
    if (!selectedSectorId) return [];
    return candidates.filter((c) => c.incident_id.includes(selectedSectorId));
  }, [selectedSectorId, candidates]);

  // Count sectors by status
  const sectorStatusCounts = useMemo(() => {
    const counts = {
      candidateSectors: 0,
      clearSectors: 0,
      cloudSectors: 0,
      unassessedSectors: 0,
    };
    sectorsList.forEach((s) => {
      if (s.status === 'candidate') counts.candidateSectors++;
      else if (s.status === 'clear') counts.clearSectors++;
      else if (s.status === 'cloud_obscured') counts.cloudSectors++;
      else counts.unassessedSectors++;
    });
    return counts;
  }, [sectorsList]);

  // Initialize MapLibre Map
  useEffect(() => {
    if (viewMode !== 'map' || !webGLSupported || !mapContainerRef.current) return;
    if (mapRef.current) return;

    // Basemap tile definitions
    // 1. EOxCloudless: Sentinel-2 Cloudless RGB composite by EOX (10m resolution, CC-BY-NC-SA 4.0)
    // 2. NASA GIBS: VIIRS True Color daily global composite (Public Domain)
    // 3. CARTO Dark: Dark matter street basemap (CC-BY 3.0 / OpenStreetMap)
    const map = new Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'eox-s2cloudless-src': {
            type: 'raster',
            tiles: [
              'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
            ],
            tileSize: 256,
            maxzoom: 15,
            attribution:
              '<a href="https://cloudless.eox.at" target="_blank" rel="noopener">Sentinel-2 cloudless - https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2020)</a> (CC-BY-NC-SA 4.0)',
          },
          'nasa-gibs-src': {
            type: 'raster',
            tiles: [
              'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/2023-05-01/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
            ],
            tileSize: 256,
            maxzoom: 9,
            attribution:
              '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">NASA GIBS</a> / EOSDIS Public Domain',
          },
          'carto-dark-src': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
          },
        },
        layers: [
          {
            id: 'eox-s2cloudless-layer',
            type: 'raster',
            source: 'eox-s2cloudless-src',
            minzoom: 0,
            maxzoom: 16,
            layout: { visibility: 'visible' },
          },
          {
            id: 'nasa-gibs-layer',
            type: 'raster',
            source: 'nasa-gibs-src',
            minzoom: 0,
            maxzoom: 16,
            layout: { visibility: 'none' },
          },
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark-src',
            minzoom: 0,
            maxzoom: 19,
            layout: { visibility: 'none' },
          },
        ],
      },
      center: [76.2, 19.1], // Maharashtra geographic centroid
      zoom: 6.4,
      minZoom: 5.0,
      maxZoom: 14.5,
      maxBounds: [
        [70.0, 14.5],
        [82.5, 23.5],
      ],
    });

    map.addControl(new NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      // 1. Add Maharashtra Boundary Layer
      if (boundaryGeoJSON) {
        map.addSource('maharashtra-boundary-src', {
          type: 'geojson',
          data: boundaryGeoJSON,
        });

        map.addLayer({
          id: 'maharashtra-boundary-layer',
          type: 'line',
          source: 'maharashtra-boundary-src',
          paint: {
            'line-color': '#34d399',
            'line-width': 2.0,
            'line-opacity': 0.9,
          },
        });
      }

      // 2. Add Sectors Grid Layers
      if (sectorsGeoJSON) {
        map.addSource('sectors-src', {
          type: 'geojson',
          data: sectorsGeoJSON,
        });

        // Fill layer
        map.addLayer({
          id: 'sectors-fill',
          type: 'fill',
          source: 'sectors-src',
          paint: {
            'fill-color': [
              'match',
              ['get', 's'],
              'candidate',
              'rgba(245, 165, 36, 0.40)',
              'clear',
              'rgba(52, 211, 153, 0.30)',
              'cloud_obscured',
              'rgba(124, 138, 165, 0.35)',
              'failed',
              'rgba(229, 72, 77, 0.40)',
              'pending',
              'rgba(91, 101, 115, 0.15)',
              'rgba(0, 0, 0, 0)',
            ],
            'fill-opacity': 0.8,
          },
        });

        // Stroke layer
        map.addLayer({
          id: 'sectors-stroke',
          type: 'line',
          source: 'sectors-src',
          paint: {
            'line-color': [
              'match',
              ['get', 's'],
              'candidate',
              '#f5a524',
              'clear',
              '#34d399',
              'cloud_obscured',
              '#7c8aa5',
              'failed',
              '#e5484d',
              'rgba(255, 255, 255, 0.12)',
            ],
            'line-width': [
              'match',
              ['get', 's'],
              'candidate',
              1.8,
              'clear',
              1.5,
              'cloud_obscured',
              1.2,
              'failed',
              1.2,
              0.6,
            ],
          },
        });

        // Selected Sector Highlight
        map.addLayer({
          id: 'sector-selected-outline',
          type: 'line',
          source: 'sectors-src',
          filter: ['==', ['get', 'id'], ''],
          paint: {
            'line-color': '#38bdf8',
            'line-width': 2.8,
          },
        });
      }

      // 3. Add Candidate Bounding Box Approximate Extents Layer
      map.addSource('candidates-bboxes-src', {
        type: 'geojson',
        data: candidatesBboxesGeoJSON,
      });

      map.addLayer({
        id: 'candidates-bboxes-fill',
        type: 'fill',
        source: 'candidates-bboxes-src',
        paint: {
          'fill-color': 'rgba(245, 165, 36, 0.25)',
          'fill-opacity': 0.7,
        },
      });

      map.addLayer({
        id: 'candidates-bboxes-stroke',
        type: 'line',
        source: 'candidates-bboxes-src',
        paint: {
          'line-color': '#f5a524',
          'line-width': 1.5,
          'line-dasharray': [2, 1],
        },
      });

      // 4. Add Candidate Centroid Markers
      map.addSource('candidates-centroids-src', {
        type: 'geojson',
        data: candidatesCentroidsGeoJSON,
      });

      map.addLayer({
        id: 'candidates-centroids-pulse',
        type: 'circle',
        source: 'candidates-centroids-src',
        paint: {
          'circle-radius': 9,
          'circle-color': '#f5a524',
          'circle-opacity': 0.25,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#f5a524',
        },
      });

      map.addLayer({
        id: 'candidates-centroids-point',
        type: 'circle',
        source: 'candidates-centroids-src',
        paint: {
          'circle-radius': 4.5,
          'circle-color': '#fbbf24',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#78350f',
        },
      });

      // Sector Hover interaction
      map.on('mousemove', 'sectors-fill', (e) => {
        if (!e.features || e.features.length === 0) return;
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features[0];
        const p = f.properties || {};
        setHoveredSector({
          id: p.id || '',
          district: p.d || 'Unknown',
          region: p.r || 'Deccan Plateau',
          status: (p.s as SectorStatusCode) || 'unassessed',
          landAreaKm2: p.a || 0,
          x: e.point.x,
          y: e.point.y,
        });
      });

      map.on('mouseleave', 'sectors-fill', () => {
        map.getCanvas().style.cursor = '';
        setHoveredSector(null);
      });

      // Click to Select Sector
      map.on('click', 'sectors-fill', (e) => {
        if (!e.features || e.features.length === 0) return;
        const sId = e.features[0].properties?.id;
        if (sId) selectSector(sId);
      });

      map.on('click', 'candidates-centroids-point', (e) => {
        if (!e.features || e.features.length === 0) return;
        const sId = e.features[0].properties?.sectorId;
        if (sId) selectSector(sId);
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [viewMode, webGLSupported, sectorsGeoJSON, boundaryGeoJSON, candidatesCentroidsGeoJSON, candidatesBboxesGeoJSON]);

  // Update Basemap Layer Visibility
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
    try {
      const eoxVis = basemapStyle === 'eox-s2cloudless' ? 'visible' : 'none';
      const gibsVis = basemapStyle === 'nasa-gibs' ? 'visible' : 'none';
      const cartoVis = basemapStyle === 'carto-dark' ? 'visible' : 'none';

      if (mapRef.current.getLayer('eox-s2cloudless-layer')) {
        mapRef.current.setLayoutProperty('eox-s2cloudless-layer', 'visibility', eoxVis);
      }
      if (mapRef.current.getLayer('nasa-gibs-layer')) {
        mapRef.current.setLayoutProperty('nasa-gibs-layer', 'visibility', gibsVis);
      }
      if (mapRef.current.getLayer('carto-dark-layer')) {
        mapRef.current.setLayoutProperty('carto-dark-layer', 'visibility', cartoVis);
      }
    } catch (e) {}
  }, [basemapStyle]);

  // Update Selected Sector Outline
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
    try {
      if (mapRef.current.getLayer('sector-selected-outline')) {
        mapRef.current.setFilter('sector-selected-outline', [
          '==',
          ['get', 'id'],
          selectedSectorId || '',
        ]);
      }
    } catch (e) {}
  }, [selectedSectorId]);

  // Update Status Filter
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
    try {
      let filterExpr: any = null;
      if (statusFilter !== 'all') {
        filterExpr = ['==', ['get', 's'], statusFilter];
      }
      if (mapRef.current.getLayer('sectors-fill')) {
        mapRef.current.setFilter('sectors-fill', filterExpr);
      }
      if (mapRef.current.getLayer('sectors-stroke')) {
        mapRef.current.setFilter('sectors-stroke', filterExpr);
      }
    } catch (e) {}
  }, [statusFilter]);

  // Layer Visibility Toggles
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
    try {
      if (mapRef.current.getLayer('sectors-fill')) {
        mapRef.current.setLayoutProperty('sectors-fill', 'visibility', showSectors ? 'visible' : 'none');
      }
      if (mapRef.current.getLayer('sectors-stroke')) {
        mapRef.current.setLayoutProperty('sectors-stroke', 'visibility', showSectors ? 'visible' : 'none');
      }
      if (mapRef.current.getLayer('maharashtra-boundary-layer')) {
        mapRef.current.setLayoutProperty(
          'maharashtra-boundary-layer',
          'visibility',
          showBoundary ? 'visible' : 'none'
        );
      }
      if (mapRef.current.getLayer('candidates-centroids-pulse')) {
        mapRef.current.setLayoutProperty(
          'candidates-centroids-pulse',
          'visibility',
          showCandidateMarkers ? 'visible' : 'none'
        );
      }
      if (mapRef.current.getLayer('candidates-centroids-point')) {
        mapRef.current.setLayoutProperty(
          'candidates-centroids-point',
          'visibility',
          showCandidateMarkers ? 'visible' : 'none'
        );
      }
      if (mapRef.current.getLayer('candidates-bboxes-fill')) {
        mapRef.current.setLayoutProperty(
          'candidates-bboxes-fill',
          'visibility',
          showCandidateBboxes ? 'visible' : 'none'
        );
      }
      if (mapRef.current.getLayer('candidates-bboxes-stroke')) {
        mapRef.current.setLayoutProperty(
          'candidates-bboxes-stroke',
          'visibility',
          showCandidateBboxes ? 'visible' : 'none'
        );
      }
    } catch (e) {}
  }, [showSectors, showBoundary, showCandidateMarkers, showCandidateBboxes]);

  // Handle Search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim().toUpperCase();

    const matched = sectorsList.find(
      (s) => s.id.toUpperCase() === q || s.district.toUpperCase().includes(q)
    );

    if (matched) {
      selectSector(matched.id);
      if (mapRef.current && sectorsGeoJSON) {
        const feat = sectorsGeoJSON.features.find((f: any) => f.properties?.id === matched.id);
        if (feat && feat.geometry) {
          const coords = feat.geometry.coordinates[0];
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          coords.forEach(([lon, lat]: [number, number]) => {
            if (lon < minX) minX = lon;
            if (lat < minY) minY = lat;
            if (lon > maxX) maxX = lon;
            if (lat > maxY) maxY = lat;
          });
          mapRef.current.fitBounds([[minX, minY], [maxX, maxY]], {
            padding: 100,
            maxZoom: 10,
            duration: 1200,
          });
        }
      }
    }
  };

  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [76.2, 19.1],
        zoom: 6.4,
        duration: 1000,
      });
      selectSector(null);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-[#05070a] overflow-hidden flex flex-col font-sans">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Search & Filters */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Jump to Sector ID or District..."
              className="pl-8 pr-3 py-1.5 rounded-md bg-[#05070a]/90 backdrop-blur-md border border-[#1e293b] text-xs text-white placeholder-slate-400 font-mono focus:outline-none focus:border-emerald-500/70 shadow-lg w-56 sm:w-64"
            />
          </form>

          {/* Status Filter Buttons */}
          <div className="hidden sm:flex items-center space-x-1 p-1 rounded-md bg-[#05070a]/90 backdrop-blur-md border border-[#1e293b] font-mono text-[11px] shadow-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 rounded transition ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All (1,479)
            </button>
            <button
              onClick={() => setStatusFilter('candidate')}
              className={`px-2 py-0.5 rounded transition ${
                statusFilter === 'candidate'
                  ? 'bg-amber-950 text-amber-300 font-bold border border-amber-800'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              Candidates ({sectorStatusCounts.candidateSectors})
            </button>
            <button
              onClick={() => setStatusFilter('clear')}
              className={`px-2 py-0.5 rounded transition ${
                statusFilter === 'clear'
                  ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              No qualifying change detected ({sectorStatusCounts.clearSectors})
            </button>
            <button
              onClick={() => setStatusFilter('cloud_obscured')}
              className={`px-2 py-0.5 rounded transition ${
                statusFilter === 'cloud_obscured'
                  ? 'bg-slate-800 text-slate-200 font-bold border border-slate-600'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cloud ({sectorStatusCounts.cloudSectors})
            </button>
          </div>
        </div>

        {/* Right: Basemap Selector, Layer Toggles & Mode Switcher */}
        <div className="pointer-events-auto flex items-center space-x-2">
          {/* Basemap Switcher */}
          <div className="flex items-center space-x-1 p-1 rounded-md bg-[#05070a]/90 backdrop-blur-md border border-[#1e293b] text-[11px] font-mono shadow-lg text-slate-300">
            <span className="text-[10px] text-slate-500 uppercase px-1 hidden lg:inline">Basemap:</span>
            <button
              onClick={() => setBasemapStyle('eox-s2cloudless')}
              className={`px-2 py-0.5 rounded transition ${
                basemapStyle === 'eox-s2cloudless'
                  ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800'
                  : 'hover:text-white text-slate-400'
              }`}
              title="Sentinel-2 Cloudless RGB composite by EOX (10m resolution, CC-BY-NC-SA 4.0)"
            >
              Sentinel-2 (Primary)
            </button>
            <button
              onClick={() => setBasemapStyle('nasa-gibs')}
              className={`px-2 py-0.5 rounded transition ${
                basemapStyle === 'nasa-gibs'
                  ? 'bg-blue-950 text-blue-300 font-bold border border-blue-800'
                  : 'hover:text-white text-slate-400'
              }`}
              title="NASA GIBS VIIRS True Color daily composite (Public Domain)"
            >
              NASA GIBS
            </button>
            <button
              onClick={() => setBasemapStyle('carto-dark')}
              className={`px-2 py-0.5 rounded transition ${
                basemapStyle === 'carto-dark'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'hover:text-white text-slate-400'
              }`}
              title="CARTO Dark Matter (High-Contrast Reference)"
            >
              CARTO Dark
            </button>
          </div>

          {/* Layer toggles */}
          <div className="hidden xl:flex items-center space-x-1 p-1 rounded-md bg-[#05070a]/90 backdrop-blur-md border border-[#1e293b] text-[11px] font-mono shadow-lg text-slate-300">
            <button
              onClick={() => setShowSectors(!showSectors)}
              className={`px-1.5 py-0.5 rounded transition ${
                showSectors ? 'bg-slate-800 text-white font-semibold' : 'text-slate-500'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setShowCandidateMarkers(!showCandidateMarkers)}
              className={`px-1.5 py-0.5 rounded transition ${
                showCandidateMarkers ? 'bg-amber-950 text-amber-300 font-semibold' : 'text-slate-500'
              }`}
            >
              Markers
            </button>
            <button
              onClick={() => setShowCandidateBboxes(!showCandidateBboxes)}
              className={`px-1.5 py-0.5 rounded transition ${
                showCandidateBboxes ? 'bg-amber-950 text-amber-300 font-semibold' : 'text-slate-500'
              }`}
            >
              Extents
            </button>
            <button
              onClick={() => setShowBoundary(!showBoundary)}
              className={`px-1.5 py-0.5 rounded transition ${
                showBoundary ? 'bg-emerald-950 text-emerald-300 font-semibold' : 'text-slate-500'
              }`}
            >
              Border
            </button>
          </div>

          {/* Reset Zoom */}
          <button
            onClick={handleResetView}
            className="p-1.5 rounded-md bg-[#05070a]/90 backdrop-blur-md border border-[#1e293b] text-slate-300 hover:text-white transition shadow-lg"
            title="Reset to Maharashtra statewide view"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Table / Map Switcher */}
          <button
            onClick={() => setViewMode(viewMode === 'map' ? 'table' : 'map')}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-[#05070a]/90 backdrop-blur-md border border-[#1e293b] text-xs font-mono text-slate-200 hover:text-white transition shadow-lg"
            aria-label={`Switch to ${viewMode === 'map' ? 'accessible table' : 'interactive map'}`}
          >
            {viewMode === 'map' ? (
              <>
                <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Table View</span>
              </>
            ) : (
              <>
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Map View</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Map or Table Container */}
      <div className="flex-1 relative w-full h-full">
        {viewMode === 'map' ? (
          <div ref={mapContainerRef} className="w-full h-full" />
        ) : (
          <div className="w-full h-full overflow-y-auto p-4 sm:p-6 pt-16">
            {!webGLSupported && (
              <div className="mb-4 p-3 rounded-lg bg-amber-950/40 border border-amber-800 text-amber-200 text-xs font-mono flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  WebGL is not supported or hardware acceleration is disabled in your browser.
                  Displaying full accessible tabular view with complete sector inventory.
                </span>
              </div>
            )}
            <AccessibleSectorTable
              sectors={sectorsList}
              candidates={candidates}
              selectedSectorId={selectedSectorId}
              onSelectSector={(id) => selectSector(id)}
            />
          </div>
        )}

        {/* Hover Tooltip (Map View Only) */}
        {viewMode === 'map' && hoveredSector && (
          <div
            className="absolute z-30 pointer-events-none p-2 rounded-md bg-[#05070a]/95 backdrop-blur-md border border-[#1e293b] text-[11px] font-mono shadow-2xl space-y-0.5"
            style={{
              left: `${Math.min(hoveredSector.x + 15, window.innerWidth - 240)}px`,
              top: `${Math.min(hoveredSector.y + 15, window.innerHeight - 100)}px`,
            }}
          >
            <div className="flex items-center space-x-2 font-bold text-white">
              <span>{hoveredSector.id}</span>
              <span className={`px-1 rounded text-[9px] ${STATUS_META[hoveredSector.status]?.badgeClass}`}>
                {STATUS_META[hoveredSector.status]?.shortLabel}
              </span>
            </div>
            <div className="text-slate-400 text-[10px] font-sans">
              {hoveredSector.district} • {hoveredSector.landAreaKm2.toFixed(1)} km² land
            </div>
          </div>
        )}

        {/* Floating Legend (Map View Only) */}
        {viewMode === 'map' && (
          <div className="absolute bottom-4 left-4 z-20 p-3 rounded-lg bg-[#05070a]/95 backdrop-blur-md border border-[#1e293b] text-[11px] font-mono shadow-xl space-y-2 pointer-events-auto max-w-sm">
            <div className="flex items-center justify-between text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-[#1e293b] pb-1.5">
              <span>Geographic Status Legend</span>
              <span className="text-emerald-400">1,479 Sectors</span>
            </div>

            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/80 border border-amber-400" />
                  <span className="text-slate-200">Candidate Sectors</span>
                </div>
                <span className="text-amber-400 font-semibold">
                  3 sectors ({candidates.length} candidate events)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70 border border-emerald-400" />
                  <span className="text-slate-200">No Qualifying Change</span>
                </div>
                <span className="text-emerald-400 font-semibold">
                  1 sector (MH-R06-C03)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-500/70 border border-slate-400" />
                  <span className="text-slate-200">Cloud Occluded (Incomplete)</span>
                </div>
                <span className="text-slate-300 font-semibold">
                  1 sector (MH-R09-C15)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm border border-slate-700 bg-transparent" />
                  <span className="text-slate-400">Unassessed Pilot Grid</span>
                </div>
                <span className="text-slate-400">
                  {sectorStatusCounts.unassessedSectors} sectors
                </span>
              </div>

              <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-900 text-amber-300/90 text-[9px]">
                <span className="w-2.5 h-2.5 border border-dashed border-amber-400 bg-amber-500/20" />
                <span>Dashed Boxes: Approximate event extents (connected-component bboxes)</span>
              </div>
            </div>

            <div className="text-[9px] text-slate-500 pt-1 border-t border-[#1e293b] leading-tight font-sans">
              No vegetation indices (NDVI) used. Candidates require ground verification.
            </div>
          </div>
        )}

        {/* Imagery Disclaimer & Context Pill (Bottom-Right) */}
        {viewMode === 'map' && (
          <div className="absolute bottom-4 right-4 z-20 max-w-md p-2 rounded-md bg-[#05070a]/95 backdrop-blur-md border border-[#1e293b] text-[10px] font-mono text-slate-400 shadow-xl pointer-events-auto leading-relaxed">
            <div>
              <strong className="text-slate-200">Contextual Basemap:</strong>{' '}
              {basemapStyle === 'eox-s2cloudless'
                ? 'Sentinel-2 cloudless - https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2020, CC-BY-NC-SA 4.0)'
                : basemapStyle === 'nasa-gibs'
                ? 'NASA GIBS VIIRS True Color (Public Domain)'
                : 'CARTO Dark Matter (OpenStreetMap contributors)'}
            </div>
            <div className="text-slate-500 text-[9px] mt-0.5 font-sans">
              Basemap is for geographic spatial orientation only — not the observation pair used for change detection.
            </div>
          </div>
        )}
      </div>

      {/* Sector Detail Slide-over Panel */}
      {selectedSectorId && selectedSectorFeature && (
        <SectorDetailPanel
          sectorId={selectedSectorId}
          district={selectedSectorFeature.properties?.d || 'Unknown'}
          region={selectedSectorFeature.properties?.r || 'Deccan Plateau'}
          landAreaKm2={selectedSectorFeature.properties?.a || 0}
          status={(selectedSectorFeature.properties?.s as SectorStatusCode) || 'unassessed'}
          bbox={
            selectedSectorFeature.geometry
              ? [
                  Math.min(...selectedSectorFeature.geometry.coordinates[0].map((c: any) => c[0])),
                  Math.min(...selectedSectorFeature.geometry.coordinates[0].map((c: any) => c[1])),
                  Math.max(...selectedSectorFeature.geometry.coordinates[0].map((c: any) => c[0])),
                  Math.max(...selectedSectorFeature.geometry.coordinates[0].map((c: any) => c[1])),
                ]
              : undefined
          }
          tileState={monitoringState?.tiles?.[selectedSectorId]}
          sectorCandidates={selectedSectorCandidates}
          onClose={() => selectSector(null)}
        />
      )}
    </div>
  );
}
