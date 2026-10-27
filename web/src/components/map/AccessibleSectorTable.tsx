'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, ShieldAlert, ArrowRight, Eye, CheckCircle2, CloudRain, AlertTriangle } from 'lucide-react';
import { STATUS_META, SectorStatusCode } from '@/lib/status';
import { InvestigationReport } from '@/types/incident';

export interface SectorSummary {
  id: string;
  district: string;
  region: string;
  landAreaKm2: number;
  status: SectorStatusCode;
  batchDay?: number;
  isForestPriority?: boolean;
}

interface AccessibleSectorTableProps {
  sectors: SectorSummary[];
  candidates: InvestigationReport[];
  selectedSectorId: string | null;
  onSelectSector: (id: string) => void;
}

export default function AccessibleSectorTable({
  sectors,
  candidates,
  selectedSectorId,
  onSelectSector,
}: AccessibleSectorTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SectorStatusCode>('all');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Map candidate counts by sector ID
  const candidateCountBySector = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of candidates) {
      // Find sector ID in incident_id: e.g. INC-MH-R01-C06-...
      const match = c.incident_id.match(/MH-R\d+-C\d+/);
      const sectorId = match ? match[0] : '';
      if (sectorId) {
        map.set(sectorId, (map.get(sectorId) || 0) + 1);
      }
    }
    return map;
  }, [candidates]);

  // Filter sectors
  const filteredSectors = useMemo(() => {
    return sectors.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.id.toLowerCase().includes(q) ||
          s.district.toLowerCase().includes(q) ||
          s.region.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sectors, statusFilter, search]);

  const totalPages = Math.ceil(filteredSectors.length / pageSize) || 1;
  const paginatedSectors = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSectors.slice(start, start + pageSize);
  }, [filteredSectors, page, pageSize]);

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Search and Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#0b121e] border border-[#1e293b] p-3 rounded-lg">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Sector ID (e.g. MH-R01-C06) or District (e.g. Sindhudurg)..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#05070a] border border-[#1e293b] rounded text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500/60"
            aria-label="Filter sectors by ID or district"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
          <button
            onClick={() => { setStatusFilter('all'); setPage(1); }}
            className={`px-2.5 py-1 rounded transition border ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white border-slate-700 font-bold'
                : 'bg-[#05070a] text-slate-400 border-[#1e293b] hover:text-white'
            }`}
          >
            ALL ({sectors.length})
          </button>
          <button
            onClick={() => { setStatusFilter('candidate'); setPage(1); }}
            className={`px-2.5 py-1 rounded transition border ${
              statusFilter === 'candidate'
                ? 'bg-amber-950 text-amber-300 border-amber-800 font-bold'
                : 'bg-[#05070a] text-slate-400 border-[#1e293b] hover:text-amber-300'
            }`}
          >
            CANDIDATE
          </button>
          <button
            onClick={() => { setStatusFilter('clear'); setPage(1); }}
            className={`px-2.5 py-1 rounded transition border ${
              statusFilter === 'clear'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800 font-bold'
                : 'bg-[#05070a] text-slate-400 border-[#1e293b] hover:text-emerald-300'
            }`}
          >
            NO QUALIFYING CHANGE DETECTED
          </button>
          <button
            onClick={() => { setStatusFilter('cloud_obscured'); setPage(1); }}
            className={`px-2.5 py-1 rounded transition border ${
              statusFilter === 'cloud_obscured'
                ? 'bg-slate-800 text-slate-200 border-slate-600 font-bold'
                : 'bg-[#05070a] text-slate-400 border-[#1e293b] hover:text-slate-300'
            }`}
          >
            CLOUD
          </button>
          <button
            onClick={() => { setStatusFilter('unassessed'); setPage(1); }}
            className={`px-2.5 py-1 rounded transition border ${
              statusFilter === 'unassessed'
                ? 'bg-slate-900 text-slate-300 border-slate-700 font-bold'
                : 'bg-[#05070a] text-slate-500 border-[#1e293b] hover:text-slate-300'
            }`}
          >
            UNASSESSED
          </button>
        </div>
      </div>

      {/* Accessible Table */}
      <div className="overflow-x-auto border border-[#1e293b] rounded-lg bg-[#05070a]">
        <table className="w-full text-left font-mono" role="table" aria-label="Maharashtra Monitoring Sectors">
          <thead>
            <tr className="border-b border-[#1e293b] bg-[#0b121e] text-slate-400 text-[11px]">
              <th scope="col" className="py-2.5 px-3">Sector ID</th>
              <th scope="col" className="py-2.5 px-3">District</th>
              <th scope="col" className="py-2.5 px-3">Region</th>
              <th scope="col" className="py-2.5 px-3 text-right">Land Area</th>
              <th scope="col" className="py-2.5 px-3">Monitoring Status</th>
              <th scope="col" className="py-2.5 px-3 text-center">Candidates</th>
              <th scope="col" className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]/60 text-[11px]">
            {paginatedSectors.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                  No sectors match current search and status filters.
                </td>
              </tr>
            ) : (
              paginatedSectors.map((sector) => {
                const meta = STATUS_META[sector.status] || STATUS_META.unassessed;
                const isSelected = sector.id === selectedSectorId;
                const cCount = candidateCountBySector.get(sector.id) || 0;

                return (
                  <tr
                    key={sector.id}
                    onClick={() => onSelectSector(sector.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectSector(sector.id);
                      }
                    }}
                    tabIndex={0}
                    role="row"
                    aria-selected={isSelected}
                    className={`cursor-pointer transition focus:outline-none focus:bg-[#0e1726] ${
                      isSelected
                        ? 'bg-[#0f1d32] border-l-2 border-emerald-400'
                        : 'hover:bg-[#0b121e]'
                    }`}
                  >
                    <td className="py-2 px-3 text-white font-bold">{sector.id}</td>
                    <td className="py-2 px-3 text-slate-300 font-sans">{sector.district}</td>
                    <td className="py-2 px-3 text-slate-400 font-sans">{sector.region}</td>
                    <td className="py-2 px-3 text-right text-slate-300">
                      {sector.landAreaKm2.toFixed(1)} km²
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${meta.badgeClass}`}>
                        {meta.shortLabel}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {cCount > 0 ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 font-bold">
                          {cCount} event{cCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSector(sector.id);
                        }}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] transition"
                        aria-label={`Inspect sector ${sector.id}`}
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2 text-slate-400 font-mono text-[11px]">
        <div>
          Showing {paginatedSectors.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(page * pageSize, filteredSectors.length)} of {filteredSectors.length} sectors
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2.5 py-1 rounded bg-[#0b121e] border border-[#1e293b] text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-2.5 py-1 rounded bg-[#0b121e] border border-[#1e293b] text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
