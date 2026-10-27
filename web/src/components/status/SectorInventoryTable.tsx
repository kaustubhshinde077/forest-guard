'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Trees,
  Layers,
  ArrowRight
} from 'lucide-react';
import { STATUS_META, SectorStatusCode } from '@/lib/status';
import { assetUrl } from '@/lib/data';

export interface SectorItem {
  id: string;
  district: string;
  region: string;
  batchDay: number;
  landAreaKm2: number;
  isForestPriority: boolean;
  status: SectorStatusCode;
  lastMonitored?: string;
  lastAttempt?: string;
  reason?: string;
}

interface SectorInventoryTableProps {
  sectors: SectorItem[];
}

export default function SectorInventoryTable({ sectors }: SectorInventoryTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<
    'all' | 'evaluated' | 'candidate' | 'clear' | 'cloud_obscured' | 'forest_priority'
  >('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filter sectors based on search query and selected filterMode
  const filteredSectors = useMemo(() => {
    let list = sectors;

    // Filter by mode
    if (filterMode === 'evaluated') {
      list = list.filter((s) => s.status !== 'unassessed' && s.status !== 'pending');
    } else if (filterMode === 'candidate') {
      list = list.filter((s) => s.status === 'candidate');
    } else if (filterMode === 'clear') {
      list = list.filter((s) => s.status === 'clear');
    } else if (filterMode === 'cloud_obscured') {
      list = list.filter((s) => s.status === 'cloud_obscured');
    } else if (filterMode === 'forest_priority') {
      list = list.filter((s) => s.isForestPriority);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.district.toLowerCase().includes(q) ||
          s.region.toLowerCase().includes(q)
      );
    }

    // Sort: evaluated sectors first, then by ID
    return list.slice().sort((a, b) => {
      const aEval = a.status !== 'unassessed' && a.status !== 'pending';
      const bEval = b.status !== 'unassessed' && b.status !== 'pending';
      if (aEval && !bEval) return -1;
      if (!aEval && bEval) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [sectors, filterMode, searchQuery]);

  const totalPages = Math.ceil(filteredSectors.length / pageSize) || 1;
  const paginatedSectors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSectors.slice(start, start + pageSize);
  }, [filteredSectors, currentPage, pageSize]);

  const handleFilterChange = (
    mode: 'all' | 'evaluated' | 'candidate' | 'clear' | 'cloud_obscured' | 'forest_priority'
  ) => {
    setFilterMode(mode);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Counts for tabs
  const evaluatedCount = useMemo(
    () => sectors.filter((s) => s.status !== 'unassessed' && s.status !== 'pending').length,
    [sectors]
  );
  const candidateCount = useMemo(
    () => sectors.filter((s) => s.status === 'candidate').length,
    [sectors]
  );
  const clearCount = useMemo(
    () => sectors.filter((s) => s.status === 'clear').length,
    [sectors]
  );
  const cloudCount = useMemo(
    () => sectors.filter((s) => s.status === 'cloud_obscured').length,
    [sectors]
  );
  const forestCount = useMemo(
    () => sectors.filter((s) => s.isForestPriority).length,
    [sectors]
  );

  return (
    <section id="inventory" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1e293b]">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wide flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Maharashtra Sector Grid Inventory</span>
          </h2>
          <p className="text-xs text-slate-400 font-sans">
            Searchable index of all {sectors.length.toLocaleString()} canonical 15×15 km monitoring sectors with verified status and map deep links.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Showing <span className="text-white font-bold">{filteredSectors.length}</span> matching sectors
        </div>
      </div>

      {/* Controls: Search Bar & Filter Tabs */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search sectors by ID (e.g. MH-R01-C06), district (e.g. Sindhudurg), or region..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080d16] border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterMode === 'all'
                ? 'bg-emerald-950 border-emerald-500/60 text-emerald-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Sectors ({sectors.length.toLocaleString()})
          </button>

          <button
            onClick={() => handleFilterChange('evaluated')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterMode === 'evaluated'
                ? 'bg-blue-950 border-blue-500/60 text-blue-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Assessed in Pilot ({evaluatedCount})
          </button>

          <button
            onClick={() => handleFilterChange('candidate')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterMode === 'candidate'
                ? 'bg-amber-950 border-amber-500/60 text-amber-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Candidate Detected ({candidateCount})
          </button>

          <button
            onClick={() => handleFilterChange('clear')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterMode === 'clear'
                ? 'bg-emerald-950 border-emerald-500/60 text-emerald-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            No qualifying change detected ({clearCount})
          </button>

          <button
            onClick={() => handleFilterChange('cloud_obscured')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterMode === 'cloud_obscured'
                ? 'bg-slate-800 border-slate-600 text-slate-200 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Cloud Obscured ({cloudCount})
          </button>

          <button
            onClick={() => handleFilterChange('forest_priority')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterMode === 'forest_priority'
                ? 'bg-forest-950 border-forest-500/60 text-forest-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Forest Priority ({forestCount})
          </button>
        </div>
      </div>

      {/* Accessible Table Container */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#080d16] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse" role="table">
            <caption className="sr-only">
              Maharashtra 15×15 km canonical sector monitoring inventory
            </caption>
            <thead>
              <tr className="bg-[#0b121e] border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                <th scope="col" className="px-4 py-3 font-semibold">Sector ID</th>
                <th scope="col" className="px-4 py-3 font-semibold">District / Agro-Climatic Zone</th>
                <th scope="col" className="px-4 py-3 font-semibold">Monitoring Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Terrestrial Land Area</th>
                <th scope="col" className="px-4 py-3 font-semibold">Cadence Batch</th>
                <th scope="col" className="px-4 py-3 font-semibold">Last Observation</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Map Explorer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedSectors.length > 0 ? (
                paginatedSectors.map((sector) => {
                  const meta = STATUS_META[sector.status] || STATUS_META.unassessed;
                  const isAssessed = sector.status !== 'unassessed' && sector.status !== 'pending';

                  return (
                    <tr
                      key={sector.id}
                      className="hover:bg-slate-900/40 transition group"
                    >
                      {/* Sector ID */}
                      <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span>{sector.id}</span>
                          {sector.isForestPriority && (
                            <span
                              title="FSI Priority Forest Sector"
                              className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-[10px] text-emerald-400 flex items-center space-x-1"
                            >
                              <Trees className="w-2.5 h-2.5" />
                              <span className="text-[9px]">Forest</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* District & Region */}
                      <td className="px-4 py-3 text-slate-300 font-sans text-xs">
                        <span className="font-semibold text-white">{sector.district}</span>
                        <span className="text-slate-500 block text-[11px] font-mono">{sector.region}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${meta.badgeClass}`}
                        >
                          {meta.shortLabel.toUpperCase()}
                        </span>
                        {sector.reason && (
                          <span className="block text-[10px] text-slate-500 font-mono mt-0.5 max-w-xs truncate" title={sector.reason}>
                            {sector.reason}
                          </span>
                        )}
                      </td>

                      {/* Terrestrial Land Area */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-200">
                        <span className="font-semibold">{sector.landAreaKm2.toFixed(2)} km²</span>
                        <span className="text-slate-500 text-[10px] block">
                          {((sector.landAreaKm2 / 225.0) * 100).toFixed(1)}% terrestrial
                        </span>
                      </td>

                      {/* Batch Day */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-400 text-xs">
                        Day {sector.batchDay} of 21
                      </td>

                      {/* Last Observation */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {sector.lastMonitored ? (
                          <span className="text-emerald-400 font-semibold">
                            {new Date(sector.lastMonitored).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        ) : sector.lastAttempt ? (
                          <span className="text-slate-400">
                            {new Date(sector.lastAttempt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })} (Incomplete)
                          </span>
                        ) : (
                          <span className="text-slate-600">Not yet assessed</span>
                        )}
                      </td>

                      {/* Map Link Action */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <Link
                          href={`/explore?sector=${sector.id}`}
                          className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900 group-hover:bg-emerald-950 border border-slate-800 group-hover:border-emerald-700/60 text-slate-300 group-hover:text-emerald-300 text-xs font-semibold transition"
                          title={`Open ${sector.id} in Satellite Map Explorer`}
                        >
                          <span>Explore</span>
                          <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-mono text-xs">
                    No sectors match the query &ldquo;{searchQuery}&rdquo;. Try another filter or search term.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800 bg-[#0b121e] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div>
            Showing <span className="text-white font-bold">{Math.min(filteredSectors.length, (currentPage - 1) * pageSize + 1)}</span> to{' '}
            <span className="text-white font-bold">{Math.min(filteredSectors.length, currentPage * pageSize)}</span> of{' '}
            <span className="text-white font-bold">{filteredSectors.length.toLocaleString()}</span> sectors
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 text-slate-300 hover:text-white transition"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-slate-300">
              Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 text-slate-300 hover:text-white transition"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
