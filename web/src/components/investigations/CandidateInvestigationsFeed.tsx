'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
  Layers,
  MapPin,
  Calendar,
  AlertTriangle,
  FileSearch,
  Grid,
  List,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Info,
  Shield,
  ArrowRight,
  Eye,
  Database
} from 'lucide-react';
import { InvestigationReport } from '@/types/incident';
import { assetUrl } from '@/lib/data';
import CandidateDossierModal from './CandidateDossierModal';

interface CandidateInvestigationsFeedProps {
  candidates: InvestigationReport[];
}

type SortOption = 'area-desc' | 'area-asc' | 'date-desc' | 'date-asc' | 'score-desc' | 'id-asc';
type ViewMode = 'grid' | 'list';

export default function CandidateInvestigationsFeed({
  candidates,
}: CandidateInvestigationsFeedProps) {
  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [geometryFilter, setGeometryFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('area-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Active Dossier Modal
  const [selectedCandidate, setSelectedCandidate] = useState<InvestigationReport | null>(null);

  // Synchronize with URL hash on mount or change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#', '');
    if (hash && hash.startsWith('INC-')) {
      const match = candidates.find((c) => c.incident_id === hash);
      if (match) {
        setSelectedCandidate(match);
      }
    }
  }, [candidates]);

  const handleSelectCandidate = (candidate: InvestigationReport) => {
    setSelectedCandidate(candidate);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${candidate.incident_id}`);
    }
  };

  const handleCloseModal = () => {
    setSelectedCandidate(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // Derive available filter values directly from the authentic data
  const { sectorOptions, geometryOptions, dateOptions, stats } = useMemo(() => {
    const sectors = new Map<string, { count: number; name: string }>();
    const geoms = new Map<string, number>();
    const dates = new Map<string, number>();
    let totalArea = 0;

    candidates.forEach((c) => {
      const secId = c.incident_id.match(/MH-R\d+-C\d+/)?.[0] || 'Unknown';
      let secName = 'Maharashtra';
      if (secId === 'MH-R01-C06') secName = 'Sindhudurg (Konkan)';
      if (secId === 'MH-R01-C10') secName = 'Kolhapur (Western Ghats)';
      if (secId === 'MH-R07-C09') secName = 'Kolhapur (Western Ghats)';

      const curSec = sectors.get(secId) || { count: 0, name: secName };
      curSec.count++;
      sectors.set(secId, curSec);

      const geom = c.visual_geometry || 'unclassified';
      geoms.set(geom, (geoms.get(geom) || 0) + 1);

      const beforeDate = Array.isArray(c.observation_dates) && c.observation_dates[0] ? c.observation_dates[0] : 'Unknown';
      const afterDate = Array.isArray(c.observation_dates) && c.observation_dates[1] ? c.observation_dates[1] : 'Unknown';
      const dateKey = `${beforeDate} → ${afterDate}`;
      dates.set(dateKey, (dates.get(dateKey) || 0) + 1);

      totalArea += c.affected_area_hectares || 0;
    });

    return {
      sectorOptions: Array.from(sectors.entries()).map(([id, info]) => ({
        id,
        name: info.name,
        count: info.count,
      })),
      geometryOptions: Array.from(geoms.entries()).map(([geom, count]) => ({
        geom,
        count,
      })),
      dateOptions: Array.from(dates.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([dateStr, count]) => ({
          dateStr,
          count,
        })),
      stats: {
        totalCandidates: candidates.length,
        totalSectors: sectors.size,
        totalAreaHa: totalArea,
      },
    };
  }, [candidates]);

  // Filter & Sort Logic
  const filteredAndSortedCandidates = useMemo(() => {
    return candidates
      .filter((c) => {
        // Drop any synthetic demonstration fixtures
        if (c.is_synthetic_test) return false;

        // Search Query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const secId = c.incident_id.match(/MH-R\d+-C\d+/)?.[0]?.toLowerCase() || '';
          const matchTitle = c.report_title?.toLowerCase().includes(q);
          const matchSummary = c.summary?.toLowerCase().includes(q);
          const matchId = c.incident_id?.toLowerCase().includes(q);
          const matchGeom = c.visual_geometry?.toLowerCase().includes(q);
          if (!matchTitle && !matchSummary && !matchId && !matchGeom && !secId.includes(q)) {
            return false;
          }
        }

        // Sector Filter
        if (sectorFilter !== 'all') {
          const secId = c.incident_id.match(/MH-R\d+-C\d+/)?.[0];
          if (secId !== sectorFilter) return false;
        }

        // Geometry Filter
        if (geometryFilter !== 'all' && c.visual_geometry !== geometryFilter) {
          return false;
        }

        // Area Filter
        if (areaFilter !== 'all') {
          const area = c.affected_area_hectares;
          if (areaFilter === 'small' && area >= 2.0) return false;
          if (areaFilter === 'medium' && (area < 2.0 || area > 5.0)) return false;
          if (areaFilter === 'large' && area <= 5.0) return false;
        }

        // Date Filter
        if (dateFilter !== 'all') {
          const beforeDate = Array.isArray(c.observation_dates) && c.observation_dates[0] ? c.observation_dates[0] : 'Unknown';
          const afterDate = Array.isArray(c.observation_dates) && c.observation_dates[1] ? c.observation_dates[1] : 'Unknown';
          const dateKey = `${beforeDate} → ${afterDate}`;
          if (dateKey !== dateFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'area-desc') return b.affected_area_hectares - a.affected_area_hectares;
        if (sortBy === 'area-asc') return a.affected_area_hectares - b.affected_area_hectares;
        if (sortBy === 'date-desc') return b.observation_dates[1].localeCompare(a.observation_dates[1]);
        if (sortBy === 'date-asc') return a.observation_dates[1].localeCompare(b.observation_dates[1]);
        if (sortBy === 'score-desc') {
          const scoreA = a.heuristic_score ?? a.confidence_score ?? 0;
          const scoreB = b.heuristic_score ?? b.confidence_score ?? 0;
          return scoreB - scoreA;
        }
        if (sortBy === 'id-asc') return a.incident_id.localeCompare(b.incident_id);
        return 0;
      });
  }, [candidates, searchQuery, sectorFilter, geometryFilter, areaFilter, dateFilter, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSectorFilter('all');
    setGeometryFilter('all');
    setAreaFilter('all');
    setDateFilter('all');
    setSortBy('area-desc');
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    sectorFilter !== 'all' ||
    geometryFilter !== 'all' ||
    areaFilter !== 'all' ||
    dateFilter !== 'all';

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Page Header & Persistent Pilot Notice */}
      <div className="border border-slate-800 bg-[#080d16] rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-forest-950/80 border border-forest-800 text-forest-300 font-mono text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>STAGED PILOT MODE: PARTIAL COVERAGE</span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs">
              5 of 1,479 Grid Sectors Assessed
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 font-mono text-xs">
              20 Unconfirmed Candidates in 3 Sectors
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Autonomous Satellite Change Investigation Feed
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed font-sans max-w-3xl">
            Detailed investigation dossiers for unconfirmed forest-change candidates detected across Copernicus Sentinel-2
            Level-2A multispectral passes. Detections are extracted using classical OpenCV 5 CIE Lab chromatic delta and 
            structural Laplacian roughness variance strictly without NDVI, then autonomously cross-referenced against public gazettes.
          </p>

          {/* Contextual Basemap Separation Clarification */}
          <div className="p-3.5 rounded-xl bg-[#0b121e] border border-slate-800/80 flex items-start space-x-3 text-xs text-slate-400 font-mono">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="text-white font-semibold">Imagery Provenance Clarification:</span> Contextual satellite
              basemaps (Sentinel-2 Cloudless 2020 by EOX) used on overview maps are for spatial orientation only. 
              Change detection evidence is computed strictly from the specific Copernicus observation pairs listed on each candidate card.
            </div>
          </div>
        </div>

        {/* Live Measured Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 font-mono">
          <div className="p-3 rounded-xl bg-[#0b121e] border border-slate-800/80">
            <span className="text-[10px] uppercase text-slate-400 block tracking-wider">Candidate Records</span>
            <span className="text-xl font-bold text-white mt-0.5 block">{stats.totalCandidates}</span>
            <span className="text-[10px] text-slate-500">Unconfirmed detection events</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0b121e] border border-slate-800/80">
            <span className="text-[10px] uppercase text-slate-400 block tracking-wider">Parent Sectors</span>
            <span className="text-xl font-bold text-emerald-400 mt-0.5 block">{stats.totalSectors}</span>
            <span className="text-[10px] text-slate-500">Sindhudurg & Kolhapur</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0b121e] border border-slate-800/80">
            <span className="text-[10px] uppercase text-slate-400 block tracking-wider">Total Candidate Area</span>
            <span className="text-xl font-bold text-amber-400 mt-0.5 block">{stats.totalAreaHa.toFixed(2)} ha</span>
            <span className="text-[10px] text-slate-500">Connected-component sum</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0b121e] border border-slate-800/80">
            <span className="text-[10px] uppercase text-slate-400 block tracking-wider">Sensor Provenance</span>
            <span className="text-xl font-bold text-white mt-0.5 block">100% S2-L2A</span>
            <span className="text-[10px] text-slate-500">Zero synthetic live records</span>
          </div>
        </div>
      </div>

      {/* 2. Search, Filter, Sort & View Controls */}
      <div className="bg-[#0b121e] border border-slate-800 rounded-2xl p-5 space-y-4">
        {/* Top Search & View Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Free Text Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate ID, sector, district, geometry, or summary..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-mono"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
                aria-label="Sort candidates by"
              >
                <option value="area-desc" className="bg-slate-900 text-white">Area: Largest First</option>
                <option value="area-asc" className="bg-slate-900 text-white">Area: Smallest First</option>
                <option value="date-desc" className="bg-slate-900 text-white">Observation: Newest First</option>
                <option value="date-asc" className="bg-slate-900 text-white">Observation: Oldest First</option>
                <option value="score-desc" className="bg-slate-900 text-white">Heuristic Contrast Score</option>
                <option value="id-asc" className="bg-slate-900 text-white">Candidate ID (A–Z)</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 font-mono text-xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid Card View"
                aria-label="Grid Card View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Tabular List View"
                aria-label="Tabular List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 text-xs font-mono border-t border-slate-800/80">
          {/* Parent Sector Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 text-[11px] shrink-0">Sector:</span>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Sectors ({candidates.length})</option>
              {sectorOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.id} — {opt.name} ({opt.count})
                </option>
              ))}
            </select>
          </div>

          {/* Visual Geometry Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 text-[11px] shrink-0">Shape:</span>
            <select
              value={geometryFilter}
              onChange={(e) => setGeometryFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer capitalize"
            >
              <option value="all">All Geometries ({candidates.length})</option>
              {geometryOptions.map((opt) => (
                <option key={opt.geom} value={opt.geom}>
                  {opt.geom.replace('_', ' ')} ({opt.count})
                </option>
              ))}
            </select>
          </div>

          {/* Area Range Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 text-[11px] shrink-0">Area:</span>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Sizes ({candidates.length})</option>
              <option value="small">&lt; 2.0 ha (Small clusters)</option>
              <option value="medium">2.0 – 5.0 ha (Medium corridors)</option>
              <option value="large">&gt; 5.0 ha (Large footprints)</option>
            </select>
          </div>

          {/* Observation Date Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 text-[11px] shrink-0">Passes:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Observation Pairs ({candidates.length})</option>
              {dateOptions.map((opt) => (
                <option key={opt.dateStr} value={opt.dateStr}>
                  {opt.dateStr} ({opt.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Bar */}
        <div className="flex items-center justify-between pt-2 text-[11px] font-mono text-slate-400">
          <div>
            Showing <span className="text-white font-bold">{filteredAndSortedCandidates.length}</span> of{' '}
            <span className="text-white font-bold">{candidates.length}</span> candidates
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center space-x-1.5 text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Candidates Content (Grid vs List View) */}
      {filteredAndSortedCandidates.length === 0 ? (
        /* Empty Search / Filter State */
        <div className="p-12 rounded-2xl bg-[#090f19] border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white font-mono">No matching candidate records found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No unconfirmed change records match the selected sector, shape, or search criteria.
          </p>
          <button
            onClick={resetFilters}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.incident_id}
              candidate={candidate}
              onInspect={() => handleSelectCandidate(candidate)}
            />
          ))}
        </div>
      ) : (
        /* Tabular List View */
        <div className="border border-slate-800 rounded-2xl bg-[#080d16] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs text-slate-300">
              <thead className="bg-[#0b121e] border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Candidate ID & Sector</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Measured Area</th>
                  <th className="p-3.5">Shape</th>
                  <th className="p-3.5">Observation Dates</th>
                  <th className="p-3.5">Heuristic</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredAndSortedCandidates.map((c) => {
                  const secId = c.incident_id.match(/MH-R\d+-C\d+/)?.[0] || 'Unknown';
                  return (
                    <tr key={c.incident_id} className="hover:bg-slate-900/60 transition group">
                      <td className="p-3.5">
                        <div className="font-bold text-white group-hover:text-emerald-400 transition">
                          {c.incident_id}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Sector: {secId}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                          UNCONFIRMED
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="text-white font-bold">{c.affected_area_hectares.toFixed(2)} ha</span>
                        <span className="text-slate-500 text-[10px] block">
                          ± {c.measurement_uncertainty_hectares.toFixed(2)} ha
                        </span>
                      </td>

                      <td className="p-3.5 capitalize">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                          {c.visual_geometry.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="p-3.5 text-[11px]">
                        <div>{c.observation_dates[0]}</div>
                        <div className="text-slate-500">to {c.observation_dates[1]}</div>
                      </td>

                      <td className="p-3.5">
                        <span className="text-amber-400 font-bold">
                          {c.heuristic_score !== undefined ? c.heuristic_score.toFixed(2) : c.confidence_score.toFixed(2)}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleSelectCandidate(c)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold transition"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Active Dossier Modal Dialog */}
      <CandidateDossierModal
        candidate={selectedCandidate}
        onClose={handleCloseModal}
      />
    </div>
  );
}

/**
 * Individual Candidate Card Component
 */
function CandidateCard({
  candidate,
  onInspect,
}: {
  candidate: InvestigationReport;
  onInspect: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const parentSectorId = candidate.incident_id.match(/MH-R\d+-C\d+/)?.[0] || 'Unknown';
  const overlayUrl = assetUrl(`/data/artifacts/${candidate.incident_id}/overlay.png`);

  return (
    <div className="flex flex-col justify-between bg-[#080d16] border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition shadow-xl group">
      <div>
        {/* Thumbnail Preview or Honest Empty State */}
        <div className="relative w-full h-44 bg-[#050810] border-b border-slate-800 overflow-hidden flex items-center justify-center">
          {!imageError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={overlayUrl}
              alt={`${candidate.incident_id} difference mask preview`}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center space-y-1.5 font-mono text-slate-500">
              <Database className="w-6 h-6 text-slate-600" />
              <span className="text-[11px] text-slate-400 font-semibold">
                No Difference Overlay Committed
              </span>
              <span className="text-[9px] text-slate-600">
                L2A scene IDs preserved in dossier
              </span>
            </div>
          )}

          {/* Top Overlays */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-slate-800 font-mono text-[10px] text-emerald-400 font-semibold">
              Sector {parentSectorId}
            </span>
          </div>

          <div className="absolute top-2.5 right-2.5">
            <span className="px-2 py-0.5 rounded bg-amber-950/80 backdrop-blur-sm border border-amber-500/50 font-mono text-[10px] font-bold text-amber-300 uppercase tracking-wider">
              UNCONFIRMED
            </span>
          </div>

          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-slate-800 font-mono text-[10px] text-slate-300">
            {candidate.visual_geometry.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-3">
          {/* Header ID */}
          <div>
            <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider">
              Candidate Incident ID
            </span>
            <h3 className="text-sm font-mono font-bold text-white group-hover:text-emerald-400 transition truncate">
              {candidate.incident_id}
            </h3>
          </div>

          {/* Area & Heuristic Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
            <div className="p-2.5 rounded-xl bg-[#0b121e] border border-slate-800/80">
              <span className="text-[10px] uppercase text-slate-500 block">Affected Area</span>
              <span className="text-sm font-bold text-white mt-0.5 block">
                {candidate.affected_area_hectares.toFixed(2)} ha
              </span>
              <span className="text-[9px] text-slate-500">
                ± {candidate.measurement_uncertainty_hectares.toFixed(2)} ha
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#0b121e] border border-slate-800/80">
              <span className="text-[10px] uppercase text-slate-500 block">Heuristic Score</span>
              <span className="text-sm font-bold text-amber-400 mt-0.5 block">
                {candidate.heuristic_score !== undefined ? candidate.heuristic_score.toFixed(2) : candidate.confidence_score.toFixed(2)}
              </span>
              <span className="text-[9px] text-slate-500">Contrast metric (0–1)</span>
            </div>
          </div>

          {/* Observation Dates & Coordinates */}
          <div className="space-y-1.5 text-[11px] font-mono text-slate-400 pt-1">
            <div className="flex items-center space-x-1.5 truncate">
              <Calendar className="w-3.5 h-3.5 text-forest-400 shrink-0" />
              <span>Passes: {candidate.observation_dates[0]} → {candidate.observation_dates[1]}</span>
            </div>

            <div className="flex items-center space-x-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{candidate.geographic_coordinates[1].toFixed(4)}° N, {candidate.geographic_coordinates[0].toFixed(4)}° E</span>
            </div>
          </div>

          {/* Summary Excerpt */}
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 pt-1 font-sans">
            {candidate.summary}
          </p>
        </div>
      </div>

      {/* Card Footer Action */}
      <div className="p-4 border-t border-slate-800/80 bg-[#0b121e] flex items-center justify-between">
        <span className="text-[10px] font-mono text-slate-500">
          {candidate.citations?.length || 0} Retrieved Citations
        </span>

        <button
          onClick={onInspect}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold shadow-md shadow-emerald-950/40 transition"
        >
          <span>Inspect Dossier</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
