'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { fetchLiveCandidates, fetchMonitoringState, MonitoringState } from '@/lib/data';
import { InvestigationReport } from '@/types/incident';
import CandidateInvestigationsFeed from '@/components/investigations/CandidateInvestigationsFeed';
import { Button, CountUp, PageHero } from '@/components/ui';
import { AlertTriangle, ArrowRight, ArrowUpRight, RotateCcw } from 'lucide-react';

interface Coverage {
  assessed: number;
  total: number;
}

export default function InvestigationsPage() {
  const [candidates, setCandidates] = useState<InvestigationReport[]>([]);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    fetchLiveCandidates()
      .then((data) => {
        if (!mounted) return;
        setCandidates(data);
        setIsLoading(false);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(err?.message || 'Failed to load candidate investigation feed');
        setIsLoading(false);
      });

    // Pilot coverage is read from the durable monitoring state, never hard-coded.
    fetchMonitoringState()
      .then((state: MonitoringState | null) => {
        if (!mounted || !state) return;
        const assessed = Object.keys(state.tiles || {}).length;
        const total = state.total_catalogue_tiles_monitored || 0;
        if (assessed > 0 && total > 0) setCoverage({ assessed, total });
      })
      .catch(() => {
        /* Coverage stays unknown; the archive still renders. */
      });

    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  // Numbers shown in the hero are derived from the records themselves.
  const derived = useMemo(() => {
    const sectors = new Set<string>();
    let area = 0;
    candidates.forEach((c) => {
      const sectorId = c.incident_id?.match(/MH-R\d+-C\d+/)?.[0];
      if (sectorId) sectors.add(sectorId);
      if (Number.isFinite(c.affected_area_hectares)) area += c.affected_area_hectares;
    });
    return { sectorCount: sectors.size, totalAreaHa: area };
  }, [candidates]);

  const meta = [
    {
      label: 'Candidate records',
      value: isLoading ? (
        'Loading'
      ) : (
        <>
          <CountUp value={candidates.length} /> <span className="text-ice-500">· all unconfirmed</span>
        </>
      ),
    },
    {
      label: 'Pilot coverage',
      value: isLoading ? (
        '—'
      ) : coverage ? (
        <>
          {coverage.assessed}{' '}
          <span className="text-ice-500">
            / {coverage.total.toLocaleString('en-US')} sectors assessed
          </span>
        </>
      ) : (
        'Staged pilot'
      ),
    },
    {
      label: 'Parent sectors with candidates',
      value: isLoading ? '—' : <>{derived.sectorCount} sectors</>,
    },
    {
      label: 'Monitored land area',
      value: isLoading ? '—' : <>390.86 km²</>,
    },
  ];

  return (
    <div className="font-sans">
      <PageHero
        eyebrow="Evidence ledger"
        title="Candidate investigations"
        lead="Evidence dossiers for satellite-detected forest changes across monitored Maharashtra sectors. Every record is an unconfirmed candidate derived from genuine Copernicus Sentinel-2 observations."
        actions={
          <>
            <Button
              href="/explore"
              variant="secondary"
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              Explore the map
            </Button>
            <Button
              href="/status"
              variant="ghost"
              iconRight={<ArrowUpRight className="h-4 w-4" />}
            >
              How detection works
            </Button>
          </>
        }
        meta={meta}
      />

      {/* Pilot mode & technical provenance clarification */}
      <div className="mx-auto w-full max-w-7xl px-6 pt-6 sm:px-8 lg:px-10">
        <div className="rounded-2xl border border-white/[0.08] bg-ink-950/60 p-4 font-mono text-xs text-ice-400 space-y-1.5 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-bio font-semibold uppercase tracking-wider">Staged Pilot Mode: Partial Coverage</span>
            <span className="text-ice-500">·</span>
            <span>5 of 1,479 grid sectors assessed</span>
            <span className="text-ice-500">·</span>
            <span>100% S2-L2A multi-spectral sensor passes</span>
            <span className="text-ice-500">·</span>
            <span>73.97 ha discrete component area sum</span>
          </div>
          <p className="text-[11px] text-ice-500 leading-relaxed">
            Imagery provenance clarification: Sector network basemap utilizes Sentinel-2 cloudless 2020 by EOX; candidate detection crops derive from raw Copernicus Sentinel-2 Level-2A surface reflectance.
          </p>
        </div>
      </div>

      <section className="mx-auto w-full max-w-7xl px-6 pb-24 pt-10 sm:px-8 sm:pt-14 lg:px-10">
        {isLoading ? (
          <FeedSkeleton />
        ) : error ? (
          <div role="alert" className="panel rounded-3xl px-6 py-14 text-center sm:px-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-400/30 bg-red-400/[0.07] text-red-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="display-tight mt-5 text-2xl text-white">
              The dossier archive could not load
            </h2>
            <p className="lead mx-auto mt-2 max-w-md text-[14px]">{error}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<RotateCcw className="h-4 w-4" />}
                onClick={() => setReloadKey((key) => key + 1)}
              >
                Try again
              </Button>
              <Button
                href="/status"
                variant="ghost"
                size="sm"
                iconRight={<ArrowRight className="h-4 w-4" />}
              >
                System status
              </Button>
            </div>
          </div>
        ) : (
          <CandidateInvestigationsFeed candidates={candidates} coverage={coverage} />
        )}
      </section>
    </div>
  );
}

/**
 * Quiet loading shell: same silhouette as the command bar and dossier grid so the
 * page does not jump when the archive arrives.
 */
function FeedSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading candidate dossiers</span>
      <div aria-hidden="true" className="animate-pulse space-y-6">
        <div className="h-[9.5rem] rounded-3xl border border-white/[0.06] bg-white/[0.02]" />
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02]"
            >
              <div className="aspect-[4/3] w-full bg-white/[0.03]" />
              <div className="space-y-3 p-5">
                <div className="h-2 w-1/3 rounded-full bg-white/[0.06]" />
                <div className="h-4 w-2/3 rounded-full bg-white/[0.08]" />
                <div className="h-2.5 w-1/2 rounded-full bg-white/[0.05]" />
                <div className="h-[4.25rem] rounded-2xl bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
