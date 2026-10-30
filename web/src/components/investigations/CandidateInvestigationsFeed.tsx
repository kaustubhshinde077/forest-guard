'use client';

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  ArrowUpRight,
  ChevronDown,
  Database,
  Layers,
  LayoutGrid,
  List,
  RotateCcw,
  Satellite,
  Search,
  X,
} from 'lucide-react';
import { InvestigationReport } from '@/types/incident';
import { assetUrl } from '@/lib/data';
import { Button, Reveal, SectionHeading } from '@/components/ui';
import CandidateDossierModal from './CandidateDossierModal';

interface CandidateInvestigationsFeedProps {
  candidates: InvestigationReport[];
  /** Pilot coverage read from monitoring_state.json; shown as context, never as a claim. */
  coverage?: { assessed: number; total: number } | null;
}

type SortOption = 'area-desc' | 'area-asc' | 'date-desc' | 'date-asc' | 'score-desc' | 'id-asc';
type ViewMode = 'grid' | 'list';

/* ------------------------------------------------------------------ */
/*  Display helpers — all values derived from the records themselves   */
/* ------------------------------------------------------------------ */

const SECTOR_PLACES: Record<string, string> = {
  'MH-R01-C06': 'Sindhudurg (Konkan)',
  'MH-R01-C10': 'Kolhapur (Western Ghats)',
  'MH-R07-C09': 'Kolhapur (Western Ghats)',
};

const GEOMETRY_LABELS: Record<string, string> = {
  compact_block: 'Compact block',
  irregular_patch: 'Irregular patch',
  linear_corridor: 'Linear corridor',
  diffuse_noise: 'Diffuse noise',
};

const AREA_LABELS: Record<string, string> = {
  small: 'Under 2 ha',
  medium: '2 – 5 ha',
  large: 'Over 5 ha',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function sectorIdOf(incidentId: string): string {
  return incidentId?.match(/MH-R\d+-C\d+/)?.[0] || 'Unknown sector';
}

function sectorPlaceOf(incidentId: string): string {
  return SECTOR_PLACES[sectorIdOf(incidentId)] || 'Maharashtra';
}

function geometryLabel(value?: string): string {
  if (!value) return 'Unclassified';
  return GEOMETRY_LABELS[value] || value.replace(/_/g, ' ');
}

function shortDate(value?: string): string {
  if (!value) return 'Unknown';
  const parts = value.split('-');
  const day = Number(parts[2]);
  const month = MONTHS[Number(parts[1]) - 1];
  if (!month || Number.isNaN(day)) return value;
  return `${day} ${month}`;
}

function eventLabel(category: InvestigationReport['event_category']): string {
  if (category === 'forest_loss') return 'Forest loss';
  if (category === 'forest_recovery') return 'Forest recovery';
  return 'Change';
}

function ObservationChip({ before, after }: { before: string; after: string }) {
  return (
    <span className="relative inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-950/70 px-2.5 py-1 font-mono text-[9px] uppercase leading-none tracking-[0.14em] text-ice-200 backdrop-blur-md">
      <span className="h-1 w-1 shrink-0 rounded-full bg-aqua" aria-hidden="true" />
      <span className="relative block">
        <span className="block transition-opacity duration-500 group-hover:opacity-0">
          Before · {before}
        </span>
        <span className="absolute inset-0 block opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          After · {after}
        </span>
      </span>
    </span>
  );
}

function UnconfirmedBadge({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[9px] uppercase leading-none tracking-[0.14em] text-ice-300',
        className
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ice-400" aria-hidden="true" />
      Candidate (unconfirmed)
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Feed                                                              */
/* ------------------------------------------------------------------ */

export default function CandidateInvestigationsFeed({
  candidates,
  coverage = null,
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

      const beforeDate =
        Array.isArray(c.observation_dates) && c.observation_dates[0] ? c.observation_dates[0] : 'Unknown';
      const afterDate =
        Array.isArray(c.observation_dates) && c.observation_dates[1] ? c.observation_dates[1] : 'Unknown';
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
          const beforeDate =
            Array.isArray(c.observation_dates) && c.observation_dates[0] ? c.observation_dates[0] : 'Unknown';
          const afterDate =
            Array.isArray(c.observation_dates) && c.observation_dates[1] ? c.observation_dates[1] : 'Unknown';
          const dateKey = `${beforeDate} → ${afterDate}`;
          if (dateKey !== dateFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'area-desc') return b.affected_area_hectares - a.affected_area_hectares;
        if (sortBy === 'area-asc') return a.affected_area_hectares - b.affected_area_hectares;
        if (sortBy === 'date-desc')
          return (b.observation_dates?.[1] || '').localeCompare(a.observation_dates?.[1] || '');
        if (sortBy === 'date-asc')
          return (a.observation_dates?.[1] || '').localeCompare(b.observation_dates?.[1] || '');
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

  // Removable chips describing the current filter state
  const activeChips: Array<{ key: string; label: string; onClear: () => void }> = [];
  if (searchQuery.trim()) {
    activeChips.push({
      key: 'search',
      label: `“${searchQuery.trim()}”`,
      onClear: () => setSearchQuery(''),
    });
  }
  if (sectorFilter !== 'all') {
    activeChips.push({
      key: 'sector',
      label: sectorFilter,
      onClear: () => setSectorFilter('all'),
    });
  }
  if (geometryFilter !== 'all') {
    activeChips.push({
      key: 'geometry',
      label: geometryLabel(geometryFilter),
      onClear: () => setGeometryFilter('all'),
    });
  }
  if (areaFilter !== 'all') {
    activeChips.push({
      key: 'area',
      label: AREA_LABELS[areaFilter] || areaFilter,
      onClear: () => setAreaFilter('all'),
    });
  }
  if (dateFilter !== 'all') {
    activeChips.push({
      key: 'date',
      label: dateFilter,
      onClear: () => setDateFilter('all'),
    });
  }

  const coverageLabel = coverage
    ? `${coverage.assessed} of ${coverage.total.toLocaleString('en-US')}`
    : 'a pilot subset of the 1,479';

  return (
    <div className="font-sans">
      {/* ---------------------------------------------------------- */}
      {/*  1. Command bar                                            */}
      {/* ---------------------------------------------------------- */}
      <Reveal>
        <div className="panel sheen rounded-3xl p-3.5 sm:p-5">
          {/* Search · sort · view */}
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ice-500"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setSearchQuery('');
                }}
                placeholder="Search candidate dossiers, sectors, or shapes"
                aria-label="Search candidate dossiers"
                className="h-11 w-full rounded-full border border-white/[0.08] bg-ink-950/60 pl-11 pr-24 font-sans text-[13px] text-ice-100 placeholder:text-ice-500 transition focus:border-aqua/40 focus:outline-none focus:ring-2 focus:ring-aqua/25"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 inline-flex h-7 -translate-y-1/2 items-center gap-1 rounded-full px-2.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ice-400 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Clear search"
                >
                  Clear
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 lg:w-60 lg:flex-none">
                <ArrowUpDown
                  className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ice-500"
                  aria-hidden="true"
                />
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  aria-label="Sort dossiers"
                  className="h-11 w-full cursor-pointer appearance-none rounded-full border border-white/[0.08] bg-ink-950/60 pl-9 pr-9 font-mono text-[10.5px] text-ice-300 transition hover:border-white/15 focus:border-aqua/40 focus:outline-none focus:ring-2 focus:ring-aqua/25"
                >
                  <option value="area-desc">Area · largest first</option>
                  <option value="area-asc">Area · smallest first</option>
                  <option value="date-desc">Observation · newest first</option>
                  <option value="date-asc">Observation · oldest first</option>
                  <option value="score-desc">Detector score · highest</option>
                  <option value="id-asc">Candidate ID · A–Z</option>
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ice-500"
                  aria-hidden="true"
                />
              </div>

              <div
                className="flex shrink-0 items-center gap-1 rounded-full border border-white/[0.08] bg-ink-950/60 p-1"
                role="group"
                aria-label="View mode"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  aria-label="Grid Card View"
                  className={clsx(
                    'flex h-7 w-7 items-center justify-center rounded-full transition',
                    viewMode === 'grid'
                      ? 'bg-aqua/15 text-aqua'
                      : 'text-ice-500 hover:text-ice-100'
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  aria-label="Tabular List View"
                  className={clsx(
                    'flex h-7 w-7 items-center justify-center rounded-full transition',
                    viewMode === 'list'
                      ? 'bg-aqua/15 text-aqua'
                      : 'text-ice-500 hover:text-ice-100'
                  )}
                >
                  <List className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Shape chips · sector · size · passes */}
          <div className="mt-3.5 grid gap-3 border-t border-white/[0.06] pt-3.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] xl:items-center">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="eyebrow mr-1 text-ice-500">Shape</span>
              <FilterChip
                active={geometryFilter === 'all'}
                label="All"
                count={stats.totalCandidates}
                onClick={() => setGeometryFilter('all')}
              />
              {geometryOptions.map((option) => (
                <FilterChip
                  key={option.geom}
                  active={geometryFilter === option.geom}
                  label={geometryLabel(option.geom)}
                  count={option.count}
                  onClick={() => setGeometryFilter(option.geom)}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <FilterSelect
                value={sectorFilter}
                onChange={setSectorFilter}
                ariaLabel="Filter by sector"
              >
                <option value="all">All sectors ({stats.totalCandidates})</option>
                {sectorOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.id} — {option.name} ({option.count})
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect value={areaFilter} onChange={setAreaFilter} ariaLabel="Filter by area">
                <option value="all">Any size</option>
                <option value="small">Under 2 ha</option>
                <option value="medium">2 – 5 ha</option>
                <option value="large">Over 5 ha</option>
              </FilterSelect>

              <FilterSelect
                value={dateFilter}
                onChange={setDateFilter}
                ariaLabel="Filter by observation pair"
              >
                <option value="all">Any observation pair</option>
                {dateOptions.map((option) => (
                  <option key={option.dateStr} value={option.dateStr}>
                    {option.dateStr} ({option.count})
                  </option>
                ))}
              </FilterSelect>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ---------------------------------------------------------- */}
      {/*  2. Result count + active filter state                      */}
      {/* ---------------------------------------------------------- */}
      <div className="mt-5 flex flex-col gap-3 px-0.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[12px] text-ice-400">
            Showing <strong className="font-heading text-[14px] font-semibold text-ice-100 tabular-nums">{filteredAndSortedCandidates.length}</strong> of {stats.totalCandidates} candidates
          </span>
          {hasActiveFilters && (
            <span className="ml-1 font-mono text-[9px] uppercase tracking-[0.16em] text-ice-500">
              filtered
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onClear}
              className="group/chip inline-flex h-7 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] pl-2.5 pr-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ice-400 transition hover:border-white/20 hover:text-ice-100"
              aria-label={`Remove ${chip.label} filter`}
            >
              <span className="max-w-[11rem] truncate">{chip.label}</span>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/5 transition group-hover/chip:bg-white/10">
                <X className="h-2.5 w-2.5" aria-hidden="true" />
              </span>
            </button>
          ))}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 font-mono text-[10px] tracking-[0.08em] text-aqua transition hover:bg-aqua/10"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/*  3. Dossier index                                          */}
      {/* ---------------------------------------------------------- */}
      {filteredAndSortedCandidates.length === 0 ? (
        <EmptyState
          hasRecords={stats.totalCandidates > 0}
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
        />
      ) : viewMode === 'grid' ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {filteredAndSortedCandidates.map((candidate, index) => (
            <Reveal
              key={candidate.incident_id}
              delay={Math.min(index, 8) * 0.035}
              y={18}
              amount={0.08}
              className="h-full"
            >
              <CandidateCard
                candidate={candidate}
                onInspect={() => handleSelectCandidate(candidate)}
              />
            </Reveal>
          ))}
        </div>
      ) : (
        <DossierList
          candidates={filteredAndSortedCandidates}
          onInspect={handleSelectCandidate}
        />
      )}

      {/* ---------------------------------------------------------- */}
      {/*  4. Interpretation notes                                   */}
      {/* ---------------------------------------------------------- */}
      <Reveal className="mt-16 block sm:mt-20">
        <SectionHeading
          eyebrow="Interpretation notes"
          title="Unconfirmed by design."
          lead="Read the archive the way the detector does: as signals worth investigating, not as verdicts."
          action={
            <Button
              href="/status"
              variant="ghost"
              size="sm"
              iconRight={<ArrowUpRight className="h-4 w-4" />}
            >
              Read the method
            </Button>
          }
        />

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          <NoteCard
            icon={<AlertTriangle className="h-4 w-4 text-signal" />}
            title="Unconfirmed by design"
          >
            Every record is a{' '}
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-signal-400">
              [UNCONFIRMED SATELLITE-CHANGE CANDIDATE]
            </span>
            . A detected change is a candidate for investigation — never a verified finding of
            deforestation.
          </NoteCard>

          <NoteCard icon={<Layers className="h-4 w-4 text-aqua" />} title="Staged pilot coverage">
            {coverageLabel} grid sectors have been assessed so far, and all {stats.totalCandidates}{' '}
            records sit in {stats.totalSectors} parent sectors. Absence of a record is not absence of
            forest loss.
          </NoteCard>

          <NoteCard icon={<Satellite className="h-4 w-4 text-aqua" />} title="Sentinel-2 evidence">
            Evidence is the Copernicus Sentinel-2 L2A observation pair listed on each dossier,
            measured with classical OpenCV 5 vision and zero NDVI. Overview basemaps are for spatial
            orientation only.
          </NoteCard>
        </div>
      </Reveal>

      {/* Active dossier */}
      <CandidateDossierModal candidate={selectedCandidate} onClose={handleCloseModal} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small local primitives                                            */
/* ------------------------------------------------------------------ */

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-mono text-[9px] uppercase tracking-[0.1em] transition',
        active
          ? 'border-aqua/40 bg-aqua/10 text-aqua'
          : 'border-white/[0.07] bg-white/[0.02] text-ice-400 hover:border-white/15 hover:text-ice-100'
      )}
    >
      {label}
      <span className={clsx('tabular-nums', active ? 'text-aqua/60' : 'text-ice-500')}>{count}</span>
    </button>
  );
}

function FilterSelect({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className="h-10 w-full cursor-pointer appearance-none rounded-full border border-white/[0.08] bg-ink-950/60 pl-3.5 pr-8 font-mono text-[10px] text-ice-300 transition hover:border-white/15 focus:border-aqua/40 focus:outline-none focus:ring-2 focus:ring-aqua/25"
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ice-500"
        aria-hidden="true"
      />
    </div>
  );
}

function NoteCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-ink-800/50 p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03]">
          {icon}
        </span>
        <h3 className="font-heading text-[13.5px] text-ice-100">{title}</h3>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ice-400">{children}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Grid card                                                         */
/* ------------------------------------------------------------------ */

function CandidateCard({
  candidate,
  onInspect,
}: {
  candidate: InvestigationReport;
  onInspect: () => void;
}) {
  const [beforeFailed, setBeforeFailed] = useState(false);
  const [afterFailed, setAfterFailed] = useState(false);

  const sectorId = sectorIdOf(candidate.incident_id);
  const place = sectorPlaceOf(candidate.incident_id);
  const before = shortDate(candidate.observation_dates?.[0]);
  const after = shortDate(candidate.observation_dates?.[1]);
  const geometry = geometryLabel(candidate.visual_geometry);
  const citations = candidate.citations?.length ?? 0;
  const beforeUrl = assetUrl(`/data/artifacts/${candidate.incident_id}/before.png`);
  const afterUrl = assetUrl(`/data/artifacts/${candidate.incident_id}/after.png`);

  return (
    <article className="group panel panel-hover relative flex h-full flex-col overflow-hidden">
      {/* Before / after imagery */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-950">
        {!beforeFailed ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={beforeUrl}
              alt={`Sentinel-2 before imagery for ${candidate.incident_id} on ${
                candidate.observation_dates?.[0] ?? 'an unrecorded date'
              }`}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1100ms] ease-expo-out group-hover:scale-[1.045]"
              onError={() => setBeforeFailed(true)}
            />
            {!afterFailed && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={afterUrl}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full scale-[1.045] object-cover opacity-0 transition-opacity duration-700 ease-swift group-hover:opacity-100"
                onError={() => setAfterFailed(true)}
              />
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 px-6 text-center">
            <Database className="h-6 w-6 text-ice-500" aria-hidden="true" />
            <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ice-400">
              Imagery not committed
            </p>
            <p className="text-[10.5px] leading-relaxed text-ice-500">
              L2A scene IDs are preserved in the dossier.
            </p>
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-ink-950/25"
          aria-hidden="true"
        />

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-950/70 px-2.5 py-1 font-mono text-[9px] uppercase leading-none tracking-[0.14em] text-ice-200 backdrop-blur-md">
            <Satellite className="h-3 w-3 text-aqua" aria-hidden="true" />
            {sectorId}
          </span>
          <UnconfirmedBadge className="bg-ink-950/70 backdrop-blur-md" />
        </div>

        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
          <ObservationChip before={before} after={after} />
          <span className="rounded-full border border-white/10 bg-ink-950/70 px-2.5 py-1 font-mono text-[9px] uppercase leading-none tracking-[0.14em] text-ice-200 backdrop-blur-md">
            {geometry}
          </span>
        </div>
      </div>

      {/* Dossier body */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow text-ice-500">{eventLabel(candidate.event_category)} candidate</p>
            <h3 className="mt-1.5 truncate font-heading text-[1.05rem] font-normal tracking-[-0.02em] text-white">
              {place}
            </h3>
            <p className="mt-1 truncate font-mono text-[10px] tracking-[0.04em] text-ice-500">
              {candidate.incident_id}
            </p>
          </div>
          <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-ice-400 transition-all duration-300 group-hover:border-aqua/40 group-hover:bg-aqua/10 group-hover:text-aqua">
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        <dl className="grid grid-cols-2 divide-x divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-950/40">
          <div className="px-3.5 py-3">
            <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-ice-500">
              Measured area
            </dt>
            <dd className="mt-1 font-mono text-[13px] text-ice-100">
              {candidate.affected_area_hectares.toFixed(2)}
              <span className="ml-1 text-[10px] text-ice-500">ha</span>
            </dd>
            <dd className="mt-0.5 font-mono text-[9.5px] text-ice-500">
              ± {candidate.measurement_uncertainty_hectares.toFixed(2)} ha
            </dd>
          </div>
          <div className="px-3.5 py-3">
            <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-ice-500">
              Observation pair
            </dt>
            <dd className="mt-1 font-mono text-[12px] text-ice-100">
              {before} <span className="text-ice-500">→</span> {after}
            </dd>
            <dd className="mt-0.5 font-mono text-[9.5px] text-ice-500">Sentinel-2 L2A</dd>
          </div>
        </dl>

        <p className="line-clamp-2 text-[12.5px] leading-relaxed text-ice-300">{candidate.summary}</p>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ice-500">
            {citations} public {citations === 1 ? 'citation' : 'citations'}
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ice-400 transition-colors duration-300 group-hover:text-aqua">
            Inspect Dossier
            <ArrowRight
              className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>

      {/* Whole-card affordance (keeps the article's semantics intact) */}
      <button
        type="button"
        onClick={onInspect}
        aria-label={`Inspect Dossier ${candidate.incident_id}: unconfirmed candidate in ${place}`}
        className="absolute inset-0 z-20 rounded-[1.25rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
      >
        <span className="sr-only">Inspect Dossier</span>
      </button>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  List view                                                         */
/* ------------------------------------------------------------------ */

function DossierList({
  candidates,
  onInspect,
}: {
  candidates: InvestigationReport[];
  onInspect: (candidate: InvestigationReport) => void;
}) {
  return (
    <div className="panel mt-5 overflow-x-auto rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <span className="eyebrow text-ice-500">Dossier index</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ice-500">
          {candidates.length} {candidates.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <table className="w-full text-left font-sans border-collapse">
        <caption className="sr-only">Candidate investigation dossiers list</caption>
        <thead>
          <tr className="border-b border-white/[0.06] text-[10.5px] font-mono uppercase tracking-[0.12em] text-ice-400">
            <th scope="col" className="px-5 py-3.5">Candidate / Sector</th>
            <th scope="col" className="px-4 py-3.5">Measured Area</th>
            <th scope="col" className="px-4 py-3.5">Observation Pass</th>
            <th scope="col" className="px-4 py-3.5 hidden lg:table-cell">Geometry</th>
            <th scope="col" className="px-4 py-3.5">Status</th>
            <th scope="col" className="px-5 py-3.5 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {candidates.map((candidate) => {
            const sectorId = sectorIdOf(candidate.incident_id);
            const place = sectorPlaceOf(candidate.incident_id);
            const before = shortDate(candidate.observation_dates?.[0]);
            const after = shortDate(candidate.observation_dates?.[1]);
            const geometry = geometryLabel(candidate.visual_geometry);

            return (
              <tr
                key={candidate.incident_id}
                onClick={() => onInspect(candidate)}
                className="group cursor-pointer transition-colors hover:bg-white/[0.03]"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <ListThumb candidate={candidate} />
                    <div className="min-w-0">
                      <p className="font-heading text-[14px] text-ice-100 group-hover:text-aqua transition-colors truncate">
                        {place}
                      </p>
                      <p className="font-mono text-[10px] tracking-[0.04em] text-ice-500 truncate">
                        {candidate.incident_id} · <span className="text-ice-400">{sectorId}</span>
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 font-mono text-[12px] text-ice-100 tabular-nums whitespace-nowrap">
                  {candidate.affected_area_hectares.toFixed(2)} ha
                  <span className="block text-[9.5px] text-ice-500">
                    ± {candidate.measurement_uncertainty_hectares.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3.5 font-mono text-[12px] text-ice-200 whitespace-nowrap">
                  {before} <span className="text-ice-500">→</span> {after}
                  <span className="block text-[9.5px] text-ice-500">Sentinel-2 L2A</span>
                </td>
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ice-400">
                    {geometry}
                  </span>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <UnconfirmedBadge />
                </td>
                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspect(candidate);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[9.5px] tracking-[0.08em] text-ice-300 transition-colors group-hover:border-aqua/40 group-hover:bg-aqua/10 group-hover:text-aqua"
                  >
                    Inspect Dossier
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ListThumb({ candidate }: { candidate: InvestigationReport }) {
  const [failed, setFailed] = useState(false);
  const beforeUrl = assetUrl(`/data/artifacts/${candidate.incident_id}/before.png`);

  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-ink-950">
      {!failed ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={beforeUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-ice-500">
          <Satellite className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                       */
/* ------------------------------------------------------------------ */

function EmptyState({
  hasRecords,
  hasActiveFilters,
  onReset,
}: {
  hasRecords: boolean;
  hasActiveFilters: boolean;
  onReset: () => void;
}) {
  return (
    <div className="mt-5 panel rounded-3xl px-6 py-16 text-center sm:py-20">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-ink-900 text-ice-400">
        <Search className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-6 font-heading text-xl font-normal tracking-[-0.02em] text-white">
        {hasRecords && hasActiveFilters
          ? 'No dossiers match this query'
          : 'No candidate dossiers archived yet'}
      </h3>
      <p className="lead mx-auto mt-2 max-w-md text-[13.5px]">
        {hasRecords && hasActiveFilters
          ? 'Try a different sector, shape or observation window. Every record in this archive is an unconfirmed satellite-change candidate.'
          : 'The archive is empty right now. Candidate dossiers appear here once the staged pilot publishes a detection.'}
      </p>
      {hasRecords && hasActiveFilters && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={onReset}
          >
            Reset filters
          </Button>
        </div>
      )}
    </div>
  );
}
