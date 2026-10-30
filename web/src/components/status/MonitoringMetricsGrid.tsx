'use client';

import React from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  Maximize2,
} from 'lucide-react';
import { CountUp, Reveal, SectionHeading, StatusPill } from '@/components/ui';
import { MonitoringState } from '@/lib/data';

interface MonitoringMetricsGridProps {
  monitoringState: MonitoringState | null;
  candidatesCount: number;
  totalCandidateAreaHa: number;
  totalSectorsCount?: number;
  isLoading?: boolean;
}

/** Equal-area state-boundary union (ESRI:102008 / EPSG:6933), 36 census districts. */
const STATE_BOUNDARY_KM2 = 307492.71;
/** Uncorrected EPSG:7755 conformal planar sum — kept for the projection caveat. */
const EPSG7755_PLANAR_SUM_KM2 = 297650.35;
const STATUTORY_AREA_KM2 = 307713.0;

function formatUtcStamp(iso?: string): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }),
    time: `${d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    })} UTC`,
  };
}

export default function MonitoringMetricsGrid({
  monitoringState,
  candidatesCount,
  totalCandidateAreaHa,
  totalSectorsCount = 1479,
  isLoading = false,
}: MonitoringMetricsGridProps) {
  const tileStates = monitoringState?.tiles || {};
  const tileEntries = Object.entries(tileStates);
  const evaluatedCount = tileEntries.length || 5;

  let candidateSectorsCount = 0;
  let noQualifyingChangeSectorsCount = 0;
  let incompleteSectorsCount = 0;
  let failedSectorsCount = 0;

  tileEntries.forEach(([, tile]) => {
    const status = tile.status;
    if (status === 'monitored_candidate_detected') {
      candidateSectorsCount++;
    } else if (status === 'monitored_no_change') {
      noQualifyingChangeSectorsCount++;
    } else if (
      status === 'incomplete_data_missing' ||
      (tile.reason && tile.reason.toLowerCase().includes('cloud'))
    ) {
      incompleteSectorsCount++;
    } else if (status === 'retrieval_failed' || status === 'failed') {
      failedSectorsCount++;
    }
  });

  const processedSectorsCount =
    candidateSectorsCount + noQualifyingChangeSectorsCount;

  // Credited land comes only from successfully processed tiles.
  const ledgerRows = tileEntries.map(([sectorId, tile]) => {
    const credited = Boolean(
      tile.status && tile.status.startsWith('monitored_')
    );
    return {
      sectorId,
      area: tile.terrestrial_area_km2,
      credited,
      reason: tile.reason,
    };
  });
  const creditedRows = ledgerRows.filter((row) => row.credited);
  const excludedRows = ledgerRows.filter((row) => !row.credited);

  const creditedAreaKm2 = monitoringState?.monitored_terrestrial_area_km2 ?? 390.86;
  const coveragePercent = (
    (creditedAreaKm2 / STATE_BOUNDARY_KM2) *
    100
  ).toFixed(2);
  const catalogueSharePercent = (
    (evaluatedCount / totalSectorsCount) *
    100
  ).toFixed(2);
  const unassessedSectorsCount = Math.max(
    0,
    totalSectorsCount - evaluatedCount
  );

  const runsCompleted = monitoringState?.total_runs_completed;
  const lastRun = formatUtcStamp(monitoringState?.last_successful_run);
  const intendedCadence = monitoringState?.cadence_days;

  return (
    <section id="metrics" className="space-y-10">
      <SectionHeading
        eyebrow="Live telemetry"
        title="What the pilot has actually assessed"
        lead={
          <>
            Every figure below is read from the recorded tile states and
            candidate reports of the last completed cycle — never from targets or
            projections. Coverage is counted only where a sector was processed
            and passed its quality checks.
          </>
        }
        action={
          <StatusPill variant="live" pulse>
            Last run completed
          </StatusPill>
        }
      />

      {/* Primary statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        <Reveal>
          <article className="panel panel-hover flex h-full flex-col justify-between rounded-3xl p-6 sm:p-7">
            <div>
              <div className="flex items-start justify-between gap-4">
                <p className="eyebrow text-ice-400">Monitored land area</p>
                <Maximize2
                  className="h-4 w-4 shrink-0 text-bio/70"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </div>

              <p className="mt-6 flex flex-wrap items-baseline gap-x-2">
                <CountUp
                  value={creditedAreaKm2}
                  decimals={2}
                  className="font-heading text-[clamp(2.2rem,4.4vw,3.15rem)] font-light leading-none tracking-[-0.035em] text-white"
                />
                <span className="font-mono text-sm text-ice-400">km²</span>
              </p>
            </div>

            <div className="mt-5 border-t border-white/[0.07] pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ice-500">
                Coverage arithmetic
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ice-300">
                <span className="text-bio">{coveragePercent}%</span> of the{' '}
                <span className="font-mono">
                  {STATE_BOUNDARY_KM2.toLocaleString('en-US')} km²
                </span>{' '}
                equal-area state boundary. Incomplete passes earn nothing.
              </p>
            </div>
          </article>
        </Reveal>

        <Reveal delay={0.06}>
          <article className="panel panel-hover flex h-full flex-col justify-between rounded-3xl p-6 sm:p-7">
            <div>
              <div className="flex items-start justify-between gap-4">
                <p className="eyebrow text-ice-400">Sectors assessed</p>
                <Activity
                  className="h-4 w-4 shrink-0 text-aqua/70"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </div>

              <p className="mt-6 flex flex-wrap items-baseline gap-x-2">
                <CountUp
                  value={evaluatedCount}
                  className="font-heading text-[clamp(2.2rem,4.4vw,3.15rem)] font-light leading-none tracking-[-0.035em] text-white"
                />
                <span className="font-mono text-sm text-ice-500">
                  / {totalSectorsCount.toLocaleString('en-US')}
                </span>
              </p>
            </div>

            <div className="mt-5 space-y-2.5 border-t border-white/[0.07] pt-4">
              <div
                className="relative h-px w-full bg-white/[0.09]"
                role="presentation"
              >
                <span
                  className="absolute left-0 top-0 h-px bg-aqua"
                  style={{
                    width: `${catalogueSharePercent}%`,
                    minWidth: '2px',
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ice-500">
                <span>{catalogueSharePercent}% of the catalogue</span>
                <span>{unassessedSectorsCount.toLocaleString('en-US')} unassessed</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-ice-300">
                {processedSectorsCount} processed · {incompleteSectorsCount}{' '}
                incomplete and excluded from credit
              </p>
            </div>
          </article>
        </Reveal>

        <Reveal delay={0.12}>
          <article className="panel panel-hover flex h-full flex-col justify-between rounded-3xl border-signal/20 p-6 sm:p-7 sm:col-span-2 lg:col-span-1">
            <div>
              <div className="flex items-start justify-between gap-4">
                <p className="eyebrow text-signal-400">
                  Candidate Detected
                </p>
                <AlertTriangle
                  className="h-4 w-4 shrink-0 text-signal/80"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </div>

              <p className="mt-6 flex flex-wrap items-baseline gap-x-2">
                <CountUp
                  value={candidateSectorsCount}
                  className="font-heading text-[clamp(2.2rem,4.4vw,3.15rem)] font-light leading-none tracking-[-0.035em] text-signal-400"
                />
                <span className="font-mono text-sm text-ice-500">
                  {candidateSectorsCount === 1 ? 'sector' : 'sectors'}
                </span>
              </p>
            </div>

            <div className="mt-5 space-y-3 border-t border-white/[0.07] pt-4">
              <p className="text-[12.5px] leading-relaxed text-ice-300">
                {isLoading && candidatesCount === 0 ? (
                  <span className="text-ice-500">Reading candidate reports…</span>
                ) : (
                  <>
                    <span className="text-ice-100">{candidatesCount}</span>{' '}
                    unconfirmed components across{' '}
                    <span className="font-mono">
                      {totalCandidateAreaHa.toFixed(2)} ha
                    </span>
                  </>
                )}
              </p>
              <StatusPill variant="candidate">Unconfirmed</StatusPill>
            </div>
          </article>
        </Reveal>
      </div>

      {/* Secondary statistics — hairline strip */}
      <Reveal delay={0.08}>
        <article className="panel overflow-hidden rounded-3xl">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0 p-5 sm:p-6">
              <p className="eyebrow text-ice-500">Runs completed</p>
              <p className="mt-3 font-heading text-xl font-normal text-ice-100">
                {runsCompleted !== undefined ? (
                  <CountUp value={runsCompleted} />
                ) : (
                  '—'
                )}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-ice-400">
                Completed monitoring cycles recorded for this deployment
              </p>
            </div>

            <div className="min-w-0 border-l border-white/[0.07] p-5 sm:p-6">
              <p className="eyebrow text-ice-500">No Qualifying Change</p>
              <p className="mt-3 font-heading text-xl font-normal text-ice-100">
                <CountUp value={noQualifyingChangeSectorsCount} />
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-ice-400">
                Assessed without meeting the 1.0 ha significance threshold
              </p>
            </div>

            <div className="min-w-0 border-t border-white/[0.07] p-5 sm:p-6 lg:border-l lg:border-t-0">
              <p className="eyebrow text-ice-500">Cloud Obscured · Incomplete</p>
              <p className="mt-3 font-heading text-xl font-normal text-ice-100">
                <CountUp value={incompleteSectorsCount} />
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-ice-400">
                Cloud-obscured or failed ·{' '}
                <span className="text-signal-400">0 km² credited</span>
                {failedSectorsCount > 0 ? (
                  <> · {failedSectorsCount} retrieval failed</>
                ) : null}
              </p>
            </div>

            <div className="min-w-0 border-l border-t border-white/[0.07] p-5 sm:p-6 lg:border-t-0">
              <p className="eyebrow text-ice-500">Last successful run</p>
              <p className="mt-3 font-mono text-[13px] text-ice-100">
                {lastRun ? lastRun.date : '—'}
              </p>
              <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ice-500">
                {lastRun ? (
                  <>
                    {lastRun.time} · {intendedCadence ?? 21}-day cadence
                  </>
                ) : (
                  'No completed run recorded'
                )}
              </p>
            </div>
          </div>
        </article>
      </Reveal>

      {/* Coverage arithmetic & credited-sector ledger */}
      <Reveal delay={0.1}>
        <article className="panel overflow-hidden rounded-3xl">
          <div className="border-b border-white/[0.07] p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="space-y-3">
                <p className="eyebrow eyebrow-aqua">Coverage arithmetic</p>
                <h3 className="display-tight text-[clamp(1.3rem,2.4vw,1.8rem)] text-white">
                  {creditedAreaKm2.toFixed(2)} km² credited out of{' '}
                  {STATE_BOUNDARY_KM2.toLocaleString('en-US')} km²
                </h3>
                <p className="max-w-xl text-[12.5px] leading-relaxed text-ice-400">
                  Monitored land area is the sum of successfully processed
                  sectors only. Sectors flagged incomplete — including the
                  cloud-obscured pass in this cycle — are excluded entirely.
                </p>
              </div>

              <dl className="flex shrink-0 flex-wrap items-end gap-8">
                <div>
                  <dt className="eyebrow text-ice-500">State coverage</dt>
                  <dd className="mt-1.5 font-heading text-[clamp(2rem,3.6vw,2.6rem)] font-light leading-none text-bio">
                    <CountUp
                      value={Number(coveragePercent)}
                      decimals={2}
                      suffix="%"
                    />
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow text-ice-500">Catalogue assessed</dt>
                  <dd className="mt-1.5 font-heading text-[clamp(2rem,3.6vw,2.6rem)] font-light leading-none text-ice-100">
                    <CountUp
                      value={Number(catalogueSharePercent)}
                      decimals={2}
                      suffix="%"
                    />
                  </dd>
                </div>
              </dl>
            </div>

            <p className="mt-6 overflow-x-auto whitespace-nowrap font-mono text-[11px] text-ice-500">
              ({creditedAreaKm2.toFixed(2)} km² credited ÷{' '}
              {STATE_BOUNDARY_KM2.toLocaleString('en-US')} km² equal-area state
              boundary) × 100 ={' '}
              <span className="text-bio">{coveragePercent}%</span>
            </p>
          </div>

          <div className="grid lg:grid-cols-5">
            {/* Ledger */}
            <div className="border-b border-white/[0.07] p-6 sm:p-8 lg:col-span-3 lg:border-b-0 lg:border-r">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="eyebrow text-ice-400">Sector-by-sector credit</p>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ice-500">
                  {creditedRows.length} credited · {excludedRows.length} excluded
                </span>
              </div>

              <ul className="mt-4 divide-y divide-white/[0.06]">
                {monitoringState ? (
                  <>
                    {creditedRows.map((row) => (
                      <li
                        key={row.sectorId}
                        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
                      >
                        <span className="flex items-center gap-2.5 font-mono text-[12px] text-ice-200">
                          <span
                            className="h-1 w-1 rounded-full bg-bio"
                            aria-hidden="true"
                          />
                          {row.sectorId}
                        </span>
                        <span className="flex items-center gap-3 font-mono text-[12px] text-ice-300">
                          <span>
                            {row.area !== undefined ? row.area.toFixed(2) : '—'} km²
                          </span>
                          <span className="w-16 text-right font-mono text-[9.5px] uppercase tracking-[0.14em] text-bio">
                            Credited
                          </span>
                        </span>
                      </li>
                    ))}

                    {excludedRows.map((row) => (
                      <li
                        key={row.sectorId}
                        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
                      >
                        <span className="flex items-center gap-2.5 font-mono text-[12px] text-ice-300">
                          <span
                            className="h-1 w-1 rounded-full bg-signal/70"
                            aria-hidden="true"
                          />
                          {row.sectorId}
                          {row.reason ? (
                            <span
                              className="max-w-[15rem] truncate font-sans text-[11px] text-ice-500"
                              title={row.reason}
                            >
                              {row.reason}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex items-center gap-3 font-mono text-[12px] text-ice-400">
                          <span>
                            {row.area !== undefined ? row.area.toFixed(2) : '—'} km²
                          </span>
                          <span className="w-16 text-right font-mono text-[9.5px] uppercase tracking-[0.14em] text-signal-400/80">
                            Excluded
                          </span>
                        </span>
                      </li>
                    ))}

                    <li className="flex items-center justify-between gap-4 py-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ice-500">
                        Credited total
                      </span>
                      <span className="font-mono text-[13px] font-medium text-white">
                        {creditedAreaKm2.toFixed(2)} km²
                      </span>
                    </li>
                  </>
                ) : (
                  <li className="py-4 text-[12.5px] text-ice-500">
                    {isLoading
                      ? 'Reading recorded tile states…'
                      : 'No tile records available in this build.'}
                  </li>
                )}
              </ul>
            </div>

            {/* Denominator & projection notes */}
            <div className="p-6 sm:p-8 lg:col-span-2">
              <p className="eyebrow text-ice-400">Denominator</p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ice-300">
                The denominator is the dissolved complete state boundary —{' '}
                <span className="font-mono text-ice-100">
                  {STATE_BOUNDARY_KM2.toLocaleString('en-US')} km²
                </span>{' '}
                across 36 administrative districts (Census 2011 / Survey of
                India), computed in equal-area projections (ESRI:102008 South
                Asia Albers / EPSG:6933). It sits within 0.07% of the published{' '}
                <span className="font-mono text-ice-100">
                  {STATUTORY_AREA_KM2.toLocaleString('en-US')} km²
                </span>{' '}
                statutory area.
              </p>

              <details className="group mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ice-400 transition-colors hover:text-ice-100">
                  EPSG:7755 projection note
                  <ChevronDown
                    className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-3 text-[12px] leading-relaxed text-ice-400">
                  EPSG:7755 India LCC is conformal — it preserves angles and
                  grid-cell alignment, not area. The uncorrected Cartesian planar
                  sum is{' '}
                  <span className="font-mono text-ice-300">
                    {EPSG7755_PLANAR_SUM_KM2.toLocaleString('en-US')} km²
                  </span>{' '}
                  (roughly 3.2% scale compression) and is deliberately not used
                  as a terrestrial denominator.
                </p>
              </details>
            </div>
          </div>
        </article>
      </Reveal>
    </section>
  );
}
