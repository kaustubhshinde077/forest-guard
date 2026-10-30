'use client';

import React from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Satellite } from 'lucide-react';
import { Button, PageHero } from '@/components/ui';

interface StatusOverviewHeroProps {
  lastSuccessfulRun?: string;
  totalCatalogueSectors: number;
  evaluatedSectorsCount: number;
  intendedCadenceDays?: number;
}

/** Deterministic UTC stamp — identical on the build machine and in the browser. */
function formatRunStamp(iso?: string): { date: string; time: string } | null {
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

export default function StatusOverviewHero({
  lastSuccessfulRun,
  totalCatalogueSectors = 1479,
  evaluatedSectorsCount = 5,
  intendedCadenceDays = 21,
}: StatusOverviewHeroProps) {
  const run = formatRunStamp(lastSuccessfulRun);
  const remainingSectors = Math.max(0, totalCatalogueSectors - evaluatedSectorsCount);

  return (
    <PageHero
      eyebrow="Method & status"
      title={
        <>
          How Forest Guard <span className="text-gradient-aqua">works</span>
        </>
      }
      lead={
        <>
          Satellites watch the canopy. Classical computer vision compares two
          passes and isolates real change, and every candidate is researched into
          a public-evidence dossier. No proprietary indices, no black boxes, and
          nothing is called confirmed until it is checked on the ground.
        </>
      }
      actions={
        <>
          <Button
            href="/explore"
            size="lg"
            iconRight={<ArrowRight className="h-4 w-4" />}
          >
            Explore the sector network
          </Button>
          <Button
            href="/investigations"
            size="lg"
            variant="secondary"
            iconRight={<ArrowUpRight className="h-4 w-4" />}
          >
            Read the candidate dossiers
          </Button>
        </>
      }
      meta={[
        {
          label: 'Last successful run',
          value: run ? (
            <>
              <span className="text-ice-100">{run.date}</span>
              <span className="text-ice-500"> · </span>
              <span className="text-ice-300">{run.time}</span>
            </>
          ) : (
            <span className="text-ice-400">No completed run recorded</span>
          ),
        },
        {
          label: 'Sectors evaluated',
          value: (
            <>
              <span className="text-ice-100">
                {evaluatedSectorsCount.toLocaleString()}
              </span>
              <span className="text-ice-500"> of </span>
              <span className="text-ice-300">
                {totalCatalogueSectors.toLocaleString()}
              </span>
            </>
          ),
        },
        {
          label: 'Intended cadence',
          value: (
            <>
              <span className="text-ice-100">{intendedCadenceDays}</span>
              <span className="text-ice-300"> days</span>
            </>
          ),
        },
        {
          label: 'Grid',
          value: <span className="text-ice-300">15 × 15 km · EPSG:7755</span>,
        },
      ]}
    >
      <div className="mt-10 max-w-4xl space-y-9 sm:mt-12">
        {/* Staged-pilot coverage notice — calm, factual, amber */}
        <aside
          aria-label="Staged pilot coverage notice"
          className="relative overflow-hidden rounded-2xl border border-signal/25 bg-signal/[0.045] p-5 sm:p-6"
        >
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-signal/50 via-signal/25 to-transparent"
          />
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-signal/25 bg-signal/[0.08] text-signal-400">
              <Satellite className="h-4 w-4" strokeWidth={1.5} />
            </span>

            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <p className="eyebrow text-signal-400">
                  STAGED PILOT MODE — PARTIAL COVERAGE
                </p>
                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full bg-signal/50"
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal-400/80">
                  {evaluatedSectorsCount} of{' '}
                  {totalCatalogueSectors.toLocaleString()} sectors assessed
                </span>
              </div>

              <p className="text-[13.5px] leading-relaxed text-ice-300">
                Statewide {intendedCadenceDays}-day monitoring of all{' '}
                {totalCatalogueSectors.toLocaleString()} sectors is the target
                being engineered toward — not a claim about today. This baseline
                cycle assessed{' '}
                <strong className="font-medium text-ice-100">
                  {evaluatedSectorsCount} sectors
                </strong>
                ;{' '}
                <strong className="font-medium text-ice-100">
                  {remainingSectors.toLocaleString()} remain unassessed
                </strong>
                . A pass that fails a quality check, such as a cloud-obscured
                scene, earns{' '}
                <strong className="font-medium text-ice-100">
                  zero monitored-area credit
                </strong>
                . Every detection on this page is an{' '}
                <span className="font-medium text-signal-400">
                  [UNCONFIRMED SATELLITE-CHANGE CANDIDATE]
                </span>{' '}
                pending independent ground-truthing.
              </p>
            </div>
          </div>
        </aside>

        {/* Quiet scroll cue into the page */}
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ice-500">
          <span
            aria-hidden="true"
            className="h-px w-10 bg-gradient-to-r from-aqua/60 to-transparent"
          />
          <a
            href="#metrics"
            className="group inline-flex items-center gap-2 transition-colors hover:text-ice-100"
          >
            Start with the numbers
            <ArrowDown className="h-3.5 w-3.5 text-aqua/70 transition-transform duration-300 group-hover:translate-y-0.5" />
          </a>
        </div>
      </div>
    </PageHero>
  );
}
