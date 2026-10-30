'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  ArrowLeftRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Search,
  SearchX,
  Trees,
  X,
} from 'lucide-react';
import { Reveal, SectionHeading, StatusPill } from '@/components/ui';
import { STATUS_META, SectorStatusCode } from '@/lib/status';

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

type FilterMode =
  | 'all'
  | 'assessed'
  | 'candidate'
  | 'clear'
  | 'cloud_obscured'
  | 'forest_priority';

type SortKey =
  | 'id'
  | 'district'
  | 'status'
  | 'landAreaKm2'
  | 'batchDay'
  | 'lastObservation';

type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;
const CELL_AREA_KM2 = 225;

const STATUS_RANK: Record<SectorStatusCode, number> = {
  candidate: 0,
  clear: 1,
  cloud_obscured: 2,
  failed: 3,
  overdue: 4,
  pending: 5,
  unassessed: 6,
};

const PILL_VARIANT: Record<
  SectorStatusCode,
  'candidate' | 'live' | 'info' | 'muted' | 'danger'
> = {
  candidate: 'candidate',
  clear: 'live',
  cloud_obscured: 'muted',
  failed: 'danger',
  overdue: 'candidate',
  pending: 'info',
  unassessed: 'muted',
};

const PILL_LABEL: Record<SectorStatusCode, string> = {
  candidate: 'Unconfirmed',
  clear: 'No change',
  cloud_obscured: 'Cloud obscured',
  failed: 'Failed',
  overdue: 'Overdue',
  pending: 'Pending',
  unassessed: 'Unassessed',
};

const LEGEND_DOT: Record<SectorStatusCode, string> = {
  candidate: 'bg-signal',
  clear: 'bg-bio',
  cloud_obscured: 'bg-ice-400',
  failed: 'bg-red-400',
  overdue: 'bg-signal/70',
  pending: 'bg-aqua',
  unassessed: 'bg-ice-500/60',
};

const LEGEND_LABEL: Record<SectorStatusCode, string> = {
  candidate: 'Unconfirmed candidate',
  clear: 'No qualifying change',
  cloud_obscured: 'Cloud obscured',
  failed: 'Retrieval failed',
  overdue: 'Overdue re-check',
  pending: 'Pending batch',
  unassessed: 'Unassessed',
};

/** Deterministic UTC day — same output during static export and in the browser. */
function formatUtcDay(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

interface SortHeaderProps {
  label: string;
  column: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}

function SortHeader({
  label,
  column,
  activeKey,
  dir,
  onSort,
  className,
}: SortHeaderProps) {
  const active = activeKey === column;
  const ariaSort = active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={clsx(
        'sticky top-0 z-20 border-b border-white/[0.08] bg-ink-850/95 px-4 py-3 backdrop-blur-sm',
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={clsx(
          'group/th inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[9.5px] font-medium uppercase tracking-[0.16em] transition-colors focus-visible:outline-none',
          active ? 'text-ice-100' : 'text-ice-400 hover:text-ice-100'
        )}
      >
        {label}
        {active ? (
          dir === 'asc' ? (
            <ArrowUp className="h-3 w-3 text-aqua" aria-hidden="true" />
          ) : (
            <ArrowDown className="h-3 w-3 text-aqua" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown
            className="h-3 w-3 text-ice-500 opacity-0 transition-opacity group-hover/th:opacity-100"
            aria-hidden="true"
          />
        )}
      </button>
    </th>
  );
}

export default function SectorInventoryTable({
  sectors,
}: SectorInventoryTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const statusCounts: Record<SectorStatusCode, number> = {
      candidate: 0,
      clear: 0,
      cloud_obscured: 0,
      failed: 0,
      overdue: 0,
      pending: 0,
      unassessed: 0,
    };

    let assessed = 0;
    let forestPriority = 0;

    for (const sector of sectors) {
      statusCounts[sector.status] = (statusCounts[sector.status] || 0) + 1;
      if (sector.status !== 'unassessed' && sector.status !== 'pending') {
        assessed++;
      }
      if (sector.isForestPriority) forestPriority++;
    }

    return {
      total: sectors.length,
      assessed,
      candidate: statusCounts.candidate,
      clear: statusCounts.clear,
      cloudObscured: statusCounts.cloud_obscured,
      forestPriority,
      statusCounts,
    };
  }, [sectors]);

  const filteredSectors = useMemo(() => {
    let list = sectors;

    if (filterMode === 'assessed') {
      list = list.filter(
        (s) => s.status !== 'unassessed' && s.status !== 'pending'
      );
    } else if (filterMode === 'candidate') {
      list = list.filter((s) => s.status === 'candidate');
    } else if (filterMode === 'clear') {
      list = list.filter((s) => s.status === 'clear');
    } else if (filterMode === 'cloud_obscured') {
      list = list.filter((s) => s.status === 'cloud_obscured');
    } else if (filterMode === 'forest_priority') {
      list = list.filter((s) => s.isForestPriority);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (s) =>
          s.id.toLowerCase().includes(query) ||
          s.district.toLowerCase().includes(query) ||
          s.region.toLowerCase().includes(query)
      );
    }

    const direction = sortDir === 'asc' ? 1 : -1;
    const byId = (a: SectorItem, b: SectorItem) => a.id.localeCompare(b.id);

    return list.slice().sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case 'id':
          comparison = byId(a, b);
          break;
        case 'district':
          comparison =
            a.district.localeCompare(b.district) || byId(a, b);
          break;
        case 'status':
          comparison =
            (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
            byId(a, b);
          break;
        case 'landAreaKm2':
          comparison = a.landAreaKm2 - b.landAreaKm2 || byId(a, b);
          break;
        case 'batchDay':
          comparison = a.batchDay - b.batchDay || byId(a, b);
          break;
        case 'lastObservation': {
          const aDate = a.lastMonitored || a.lastAttempt || '';
          const bDate = b.lastMonitored || b.lastAttempt || '';
          comparison = aDate.localeCompare(bDate) || byId(a, b);
          break;
        }
        default:
          comparison = byId(a, b);
      }

      return comparison * direction;
    });
  }, [sectors, filterMode, searchQuery, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSectors.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filteredSectors.slice(startIndex, startIndex + PAGE_SIZE);

  const hasActiveFilters = filterMode !== 'all' || searchQuery.trim().length > 0;

  const resetPage = () => setPage(1);

  const changeFilter = (mode: FilterMode) => {
    setFilterMode(mode);
    resetPage();
  };

  const changeSearch = (value: string) => {
    setSearchQuery(value);
    resetPage();
  };

  const changeSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    resetPage();
  };

  const resetAll = () => {
    setFilterMode('all');
    setSearchQuery('');
    setPage(1);
  };

  const filters: Array<{ mode: FilterMode; label: string; count: number }> = [
    { mode: 'all', label: 'All sectors', count: counts.total },
    { mode: 'assessed', label: 'Assessed in Pilot', count: counts.assessed },
    { mode: 'candidate', label: 'Candidate Detected', count: counts.candidate },
    { mode: 'clear', label: 'No qualifying change detected', count: counts.clear },
    {
      mode: 'cloud_obscured',
      label: 'Cloud Obscured',
      count: counts.cloudObscured,
    },
    {
      mode: 'forest_priority',
      label: 'Forest priority',
      count: counts.forestPriority,
    },
  ];

  const legendStatuses = (
    Object.keys(counts.statusCounts) as SectorStatusCode[]
  ).filter((status) => counts.statusCounts[status] > 0);

  const firstShown = filteredSectors.length === 0 ? 0 : startIndex + 1;
  const lastShown = Math.min(startIndex + PAGE_SIZE, filteredSectors.length);

  return (
    <section id="inventory" className="space-y-10">
      <SectionHeading
        eyebrow="Sector inventory"
        title="Every sector, and how far the pilot has reached"
        lead={
          <>
            The catalogue holds {counts.total.toLocaleString()} canonical 15 × 15
            km sectors across 36 districts. Only a handful have been assessed;
            everything else is honestly marked pending or unassessed. Search,
            filter and sort the full index below.
          </>
        }
        action={
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ice-500">
            <span>
              <span className="text-ice-100">
                {counts.total.toLocaleString()}
              </span>{' '}
              sectors
            </span>
            <span aria-hidden="true" className="h-3 w-px bg-white/10" />
            <span>
              <span className="text-ice-100">{counts.assessed}</span> assessed
            </span>
            <span aria-hidden="true" className="h-3 w-px bg-white/10" />
            <span>
              <span className="text-signal-400">{counts.candidate}</span>{' '}
              unconfirmed
            </span>
          </div>
        }
      />

      <Reveal>
        <div className="panel overflow-hidden rounded-3xl">
          {/* Command bar */}
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <label htmlFor="sector-inventory-search" className="sr-only">
                  Search sectors by ID, district or region
                </label>
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ice-500"
                  aria-hidden="true"
                />
                <input
                  id="sector-inventory-search"
                  type="text"
                  inputMode="search"
                  value={searchQuery}
                  onChange={(event) => changeSearch(event.target.value)}
                  placeholder="Search sectors by ID, district or region"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-11 w-full rounded-full border border-white/10 bg-white/[0.03] pl-10 pr-10 font-mono text-[12px] text-ice-100 transition-colors placeholder:text-ice-500 focus:border-aqua/40 focus:outline-none focus:ring-2 focus:ring-aqua/25"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => changeSearch('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ice-500 transition-colors hover:bg-white/[0.06] hover:text-ice-100"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <p
                  className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ice-400"
                  aria-live="polite"
                >
                  <span className="text-ice-100">
                    {filteredSectors.length.toLocaleString()}
                  </span>{' '}
                  matching sectors
                </p>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ice-400 transition-colors hover:border-aqua/40 hover:text-aqua"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    Reset
                  </button>
                ) : null}
              </div>
            </div>

            {/* Status / attribute filters */}
            <div
              role="group"
              aria-label="Filter sectors"
              className="flex flex-wrap items-center gap-1.5"
            >
              {filters.map((filter) => {
                const active = filterMode === filter.mode;
                return (
                  <button
                    key={filter.mode}
                    type="button"
                    onClick={() => changeFilter(filter.mode)}
                    aria-pressed={active}
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-[0.04em] transition-colors',
                      active
                        ? 'border-aqua/40 bg-aqua/[0.08] text-aqua'
                        : 'border-white/10 bg-white/[0.02] text-ice-400 hover:border-white/20 hover:text-ice-100'
                    )}
                  >
                    {filter.label}
                    <span
                      className={clsx(
                        'tabular-nums',
                        active ? 'text-aqua/70' : 'text-ice-500'
                      )}
                    >
                      {filter.count.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] pt-3">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ice-500">
                Legend
              </span>
              {legendStatuses.map((status) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.13em] text-ice-400"
                  title={STATUS_META[status]?.description}
                >
                  <span
                    className={clsx('h-1.5 w-1.5 rounded-full', LEGEND_DOT[status])}
                    aria-hidden="true"
                  />
                  {LEGEND_LABEL[status]}
                  <span className="text-ice-500 tabular-nums">
                    {counts.statusCounts[status].toLocaleString()}
                  </span>
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.13em] text-ice-400">
                <Trees className="h-3 w-3 text-bio/70" aria-hidden="true" />
                FSI priority sector
              </span>
            </div>
          </div>

          {/* Mobile scroll hint */}
          {filteredSectors.length > 0 ? (
            <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-5 pt-3 lg:hidden">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ice-500">
                Swipe horizontally for every column
              </p>
              <ArrowLeftRight
                className="h-3 w-3 shrink-0 text-ice-500"
                aria-hidden="true"
              />
            </div>
          ) : null}

          {/* Table / empty state */}
          <div className="max-h-[clamp(24rem,66vh,42rem)] overflow-auto overscroll-contain border-t border-white/[0.07]">
            {filteredSectors.length > 0 ? (
              <table role="table" className="w-full min-w-[860px] border-collapse text-left">
                <caption className="sr-only">
                  Maharashtra 15 × 15 km sector inventory. {filteredSectors.length}{' '}
                  matching sectors of {counts.total.toLocaleString()} catalogue
                  sectors, with district, region, batch day, terrestrial land
                  area, forest priority, monitoring status and last observation.
                </caption>
                <thead>
                  <tr>
                    <SortHeader
                      label="Sector"
                      column="id"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={changeSort}
                      className="pl-5"
                    />
                    <SortHeader
                      label="District / region"
                      column="district"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={changeSort}
                    />
                    <SortHeader
                      label="Status"
                      column="status"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={changeSort}
                    />
                    <SortHeader
                      label="Land area"
                      column="landAreaKm2"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={changeSort}
                    />
                    <SortHeader
                      label="Batch day"
                      column="batchDay"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={changeSort}
                    />
                    <SortHeader
                      label="Last observation"
                      column="lastObservation"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={changeSort}
                    />
                    <th
                      scope="col"
                      className="sticky top-0 z-20 border-b border-white/[0.08] bg-ink-850/95 px-5 py-3 text-right backdrop-blur-sm"
                    >
                      <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.16em] text-ice-400">
                        Explorer
                      </span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.055]">
                  {pageRows.map((sector) => {
                    const monitoredDay = formatUtcDay(sector.lastMonitored);
                    const attemptedDay = formatUtcDay(sector.lastAttempt);
                    const meta = STATUS_META[sector.status] ?? STATUS_META.unassessed;

                    return (
                      <tr
                        key={sector.id}
                        className="group transition-colors hover:bg-white/[0.025]"
                      >
                        <td
                          className="whitespace-nowrap px-4 py-3 pl-5 text-left font-mono text-[12px] font-medium text-ice-100"
                        >
                          <span className="flex items-center gap-2">
                            {sector.id}
                            {sector.isForestPriority ? (
                              <span
                                title="Forest Survey of India priority sector"
                                className="inline-flex items-center gap-1 rounded-full border border-bio/25 bg-bio/[0.06] px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-bio-400"
                              >
                                <Trees
                                  className="h-2.5 w-2.5"
                                  aria-hidden="true"
                                />
                                Forest
                              </span>
                            ) : null}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="block text-[12.5px] text-ice-100">
                            {sector.district}
                          </span>
                          <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.12em] text-ice-500">
                            {sector.region}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusPill
                            variant={PILL_VARIANT[sector.status]}
                            className="px-2 py-0.5 text-[9px]"
                          >
                            {PILL_LABEL[sector.status]}
                          </StatusPill>
                          {sector.reason ? (
                            <span
                              className="mt-1 block max-w-[14rem] truncate font-mono text-[10px] text-ice-500"
                              title={sector.reason}
                            >
                              {sector.reason}
                            </span>
                          ) : sector.status === 'candidate' ? (
                            <span className="mt-1 block font-mono text-[9.5px] uppercase tracking-[0.12em] text-signal-400/80">
                              Awaiting ground truth
                            </span>
                          ) : null}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="block font-mono text-[12px] text-ice-200">
                            {sector.landAreaKm2.toFixed(2)} km²
                          </span>
                          <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.12em] text-ice-500">
                            {((sector.landAreaKm2 / CELL_AREA_KM2) * 100).toFixed(
                              1
                            )}
                            % of cell
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 font-mono text-[11.5px] text-ice-400">
                          Day {sector.batchDay}{' '}
                          <span className="text-ice-500">of 21</span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {monitoredDay ? (
                            <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-ice-200">
                              <span
                                className="h-1 w-1 rounded-full bg-bio"
                                aria-hidden="true"
                              />
                              {monitoredDay}
                            </span>
                          ) : attemptedDay ? (
                            <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-ice-400">
                              <span
                                className="h-1 w-1 rounded-full bg-signal/70"
                                aria-hidden="true"
                              />
                              {attemptedDay}
                              <span className="font-sans text-[10.5px] text-ice-500">
                                (incomplete)
                              </span>
                            </span>
                          ) : (
                            <span className="font-mono text-[11px] text-ice-500">
                              Not yet assessed
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 pr-5 text-right">
                          <Link
                            href={`/explore?sector=${sector.id}`}
                            aria-label={`Open sector ${sector.id} in the explorer`}
                            title={`Open ${sector.id} in the sector explorer`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.13em] text-ice-300 transition-colors hover:border-aqua/40 hover:text-aqua"
                          >
                            Explore
                            <ArrowUpRight
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                          </Link>
                          <span className="sr-only">{meta.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div
                role="status"
                className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-ice-400">
                  <SearchX
                    className="h-5 w-5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </span>
                <p className="font-heading text-lg text-ice-100">
                  No sectors match this view
                </p>
                <p className="max-w-sm text-[12.5px] leading-relaxed text-ice-400">
                  {searchQuery.trim()
                    ? `Nothing in the catalogue matches “${searchQuery.trim()}”.`
                    : 'No sectors carry this status in the current data.'}{' '}
                  Try a sector ID such as MH-R01-C06, a district name, or reset
                  the filters.
                </p>
                <button
                  type="button"
                  onClick={resetAll}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-aqua/30 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-aqua transition-colors hover:bg-aqua/10"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Reset filters
                </button>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-white/[0.07] bg-white/[0.015] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ice-500">
              Showing{' '}
              <span className="text-ice-200">
                {firstShown.toLocaleString()}–{lastShown.toLocaleString()}
              </span>{' '}
              of{' '}
              <span className="text-ice-200">
                {filteredSectors.length.toLocaleString()}
              </span>{' '}
              matching · {counts.total.toLocaleString()} catalogue sectors ·{' '}
              {PAGE_SIZE} per page
            </p>

            <nav
              aria-label="Sector inventory pagination"
              className="flex items-center gap-1.5"
            >
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={currentPage <= 1}
                aria-label="First page"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-ice-300 transition-colors hover:border-aqua/40 hover:text-aqua disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronsLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Previous page"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-ice-300 transition-colors hover:border-aqua/40 hover:text-aqua disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              <span className="px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ice-500">
                Page <span className="text-ice-100">{currentPage}</span>
                <span aria-hidden="true"> / </span>
                <span className="sr-only">of</span> {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                aria-label="Next page"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-ice-300 transition-colors hover:border-aqua/40 hover:text-aqua disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={currentPage >= totalPages}
                aria-label="Last page"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-ice-300 transition-colors hover:border-aqua/40 hover:text-aqua disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronsRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
