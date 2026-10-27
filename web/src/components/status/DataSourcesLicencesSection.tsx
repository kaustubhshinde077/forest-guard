'use client';

import React from 'react';
import {
  Database,
  ExternalLink,
  ShieldCheck,
  Compass,
  FileText,
  Layers,
  MapPin,
  CheckCircle2
} from 'lucide-react';

const DATA_SOURCES = [
  {
    name: 'Copernicus Sentinel-2 Level-2A',
    provider: 'European Space Agency (ESA) / European Commission',
    licence: 'Copernicus Sentinel Data Legal Notice (Free, Full & Open Access)',
    licenceUrl: 'https://sentinels.copernicus.eu/documents/247904/695121/Sentinel_Data_Legal_Notice',
    role: 'Primary Change Detection Telemetry',
    resolution: '10m native ground resolution (Bands B04, B03, B02, B08)',
    endpoint: 'AWS Open Data Registry (s3://sentinel-cogs) & CDSE OData STAC',
    description:
      'Atmospherically coregistered Bottom-of-Atmosphere (BOA) surface reflectance. Ingested via direct open HTTPS range requests without proprietary keys or API tokens. Access and usage are governed by the official Copernicus Sentinel Data Legal Notice granting free, full, and open access for any lawful use (EU Regulation No 1159/2013). Source attribution: "Contains modified Copernicus Sentinel data [2023–2026]".'
  },
  {
    name: 'NASA GIBS Blue Marble (August 2004)',
    provider: 'NASA Earth Science Data and Information System (ESDIS)',
    licence: 'Public Domain (NASA Open Data Policy)',
    licenceUrl: 'https://www.earthdata.nasa.gov/engage/open-data-policy',
    role: 'Global Contextual Globe Background Texture',
    resolution: '500m global shaded relief and bathymetry composite',
    endpoint: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/...',
    description:
      'Historical August 2004 Blue Marble shaded relief and bathymetry composite. Used strictly as a global background texture on the hero globe, never presented as current or live imagery.'
  },
  {
    name: 'Sentinel-2 Cloudless 2020 by EOX',
    provider: 'EOX IT Services GmbH (Vienna, Austria)',
    licence: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 (CC BY-NC-SA 4.0)',
    licenceUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    role: 'Regional Overview Basemap Context',
    resolution: '10m cloudless viewing tiles (Zoom levels 0–14)',
    endpoint: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/...',
    description:
      'Contextual satellite viewing composite. Attribution: “Sentinel-2 cloudless - https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2020)”. Used strictly for spatial reference; non-commercial hackathon/educational evaluation only.'
  },
  {
    name: 'Census of India 2011 / Survey of India Boundary',
    provider: 'Survey of India / Open Government Data (OGD) Platform',
    licence: 'Open Government Data License - India (CC-BY 2.5 IN)',
    licenceUrl: 'https://data.gov.in/open-government-data-ogd-platform-india',
    role: 'Administrative Boundary & Terrestrial Land Mask',
    resolution: '36 administrative district boundary polygons',
    endpoint: 'National Spatial Data Infrastructure (NSDI) / data.gov.in',
    description:
      'Authoritative boundaries used for spatial clipping, coastal boundary filtering, and territorial district attribution.'
  },
  {
    name: 'Forest Survey of India (FSI ISFR 2021/2023)',
    provider: 'Ministry of Environment, Forest and Climate Change (MoEFCC)',
    licence: 'Government of India Public Disclosure',
    licenceUrl: 'https://fsi.nic.in/isfr-2021',
    role: 'Forest Priority Stratum Baseline',
    resolution: 'Statewide Forest Cover Baseline: 50,858 km² (16.53%)',
    endpoint: 'https://fsi.nic.in/isfr-2021 / isfr-2023',
    description:
      'Used to designate 676 forest-priority monitoring sectors and provide biometric stratum density context.'
  }
];

export default function DataSourcesLicencesSection() {
  return (
    <section id="sources" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1e293b]">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wide flex items-center space-x-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Public Data Sources, Licences & CRS Specifications</span>
          </h2>
          <p className="text-xs text-slate-400 font-sans">
            100% public, open-access, zero-cost data sources with verified legal licensing and rigorous coordinate reference mathematics.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero Proprietary APIs</span>
        </div>
      </div>

      {/* Imagery Separation Notice */}
      <div className="p-4 rounded-xl bg-[#0b121e] border border-slate-800 text-xs font-sans space-y-2">
        <div className="font-mono font-bold text-white text-xs uppercase tracking-wider flex items-center space-x-2">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Imagery Role Separation: Contextual Basemap vs. Change Detection</span>
        </div>
        <p className="text-slate-300 text-[11px] leading-relaxed">
          Forest Guard maintains strict separation between background contextual layers and actual empirical evidence:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-blue-400 font-bold block text-[10px] uppercase">
              A. Contextual Basemaps (Reference Only)
            </span>
            <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
              NASA GIBS Blue Marble (2004) and EOxCloudless (2020) provide geographic spatial context. 
              <strong>No change detection or canopy analysis is ever run on contextual basemaps.</strong>
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-emerald-400 font-bold block text-[10px] uppercase">
              B. Empirical Observation Pairs (Detector Inputs)
            </span>
            <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
              Every canopy loss or recovery candidate is computed strictly from coregistered, single-pass Copernicus Sentinel-2 Level-2A observation pairs with verified scene IDs and acquisition dates.
            </p>
          </div>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DATA_SOURCES.map((ds, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-[#080d16] border border-slate-800 space-y-2.5 font-sans hover:border-slate-700 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-white text-sm">{ds.name}</h3>
                <span className="text-[11px] font-mono text-emerald-400 block">{ds.provider}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-mono text-slate-400 shrink-0">
                {ds.role}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {ds.description}
            </p>

            <div className="pt-2 border-t border-slate-800/80 space-y-1.5 font-mono text-[10px] text-slate-400">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 shrink-0">Licence:</span>
                {ds.licenceUrl ? (
                  <a
                    href={ds.licenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 inline-flex items-center space-x-1 truncate"
                  >
                    <span className="truncate">{ds.licence}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                ) : (
                  <span className="text-slate-300">{ds.licence}</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Resolution:</span>
                <span className="text-slate-300">{ds.resolution}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Access Endpoint:</span>
                <span className="text-slate-400 truncate max-w-[200px]" title={ds.endpoint}>{ds.endpoint}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Coordinate Reference System (CRS) & Geometry Mathematics */}
      <div className="p-5 rounded-2xl bg-[#080d16] border border-slate-800 space-y-4 font-mono text-xs">
        <div className="font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>Coordinate Reference Systems (CRS) & Equal-Area Mathematics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-300 pt-1">
          <div className="p-3.5 rounded-xl bg-[#0b121e] border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Candidate Grid CRS</span>
            <span className="text-white font-bold text-xs mt-1 block">EPSG:7755</span>
            <p className="text-[10px] text-slate-400 font-sans mt-1 leading-relaxed">
              India National Lambert Conformal Conic (LCC). Origin: 24°N. Standard parallels: 12.472955°N and 35.1728044444444°N.
              Used for deterministic 15×15 km grid alignment without UTM 43N/44N seam distortions.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b121e] border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Geodesic Equal-Area CRS</span>
            <span className="text-emerald-400 font-bold text-xs mt-1 block">EPSG:6933 & ESRI:102008</span>
            <p className="text-[10px] text-slate-400 font-sans mt-1 leading-relaxed">
              WGS 84 / NSIDC EASE-Grid 2.0 Global (cylindrical equal-area) & South Asia Albers Equal Area Conic.
              Used for true polygon area integration and uncertainty quantification.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b121e] border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">State Boundary Denominator</span>
            <span className="text-emerald-400 font-bold text-xs mt-1 block">307,492.71 km² (Equal-Area Union)</span>
            <p className="text-[10px] text-slate-400 font-sans mt-1 leading-relaxed">
              Complete GIS-derived 36-district boundary union computed via equal-area projections (ESRI:102008 & EPSG:6933), aligned within 0.07% of Survey of India's published 307,713.00 km² area. Uncorrected EPSG:7755 Cartesian sum (297,650.35 km²) reflects ~3.2% conformal scale compression and is not an equal-area denominator.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
