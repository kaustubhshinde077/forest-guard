'use client';

import { useEffect, useRef } from 'react';
import { InvestigationReport } from '@/types/incident';

interface InteractiveMapProps {
  incidents: InvestigationReport[];
  selectedId?: string;
  onSelectIncident: (id: string) => void;
}

export default function InteractiveMap({
  incidents,
  selectedId,
  onSelectIncident,
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) {
      console.warn('Leaflet script not yet loaded.');
      return;
    }

    if (!mapInstanceRef.current) {
      // Initialize map focused on Maharashtra Western Ghats
      const map = L.map(mapContainerRef.current, {
        center: [17.0, 73.8],
        zoom: 7,
        zoomControl: true,
      });

      // Dark technical basemap
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer: any) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add markers for all incidents
    incidents.forEach((inc) => {
      const [lon, lat] = inc.geographic_coordinates;
      const isSelected = inc.incident_id === selectedId;
      const isLoss = inc.event_category === 'forest_loss';

      const color = isLoss ? '#ef4444' : '#10b981';
      const marker = L.circleMarker([lat, lon], {
        radius: isSelected ? 10 : 7,
        fillColor: color,
        color: isSelected ? '#ffffff' : color,
        weight: isSelected ? 2.5 : 1.5,
        opacity: 1,
        fillOpacity: 0.85,
      }).addTo(map);

      marker.bindPopup(`
        <div style="color: #0f172a; font-family: monospace; font-size: 11px;">
          <strong>${inc.report_title}</strong><br/>
          <span>Coordinates: ${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E</span><br/>
          <span>Area: ${inc.affected_area_hectares} ha</span><br/>
          <span>Category: ${inc.event_category}</span>
        </div>
      `);

      marker.on('click', () => {
        onSelectIncident(inc.incident_id);
      });
    });

  }, [incidents, selectedId, onSelectIncident]);

  return (
    <div className="relative w-full h-[480px] rounded-lg overflow-hidden border border-slate-800 bg-[#080d16]">
      <div ref={mapContainerRef} className="w-full h-full z-10" />
      <div className="absolute top-3 left-3 z-20 bg-slate-950/90 backdrop-blur px-3 py-1.5 rounded border border-slate-700 text-xs font-mono text-slate-300">
        WESTERN GHATS & BENCHMARK INCIDENT MAP
      </div>
      <div className="absolute bottom-3 right-3 z-20 bg-slate-950/90 backdrop-blur p-2.5 rounded border border-slate-800 text-[11px] font-mono flex items-center space-x-4">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-crimson-500"></span>
          <span className="text-slate-300">Forest Loss</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-forest-400"></span>
          <span className="text-slate-300">Forest Recovery</span>
        </div>
      </div>
    </div>
  );
}
