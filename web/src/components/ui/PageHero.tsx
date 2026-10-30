import React from 'react';
import clsx from 'clsx';
import Starfield from './Starfield';

interface PageHeroProps {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: Array<{ label: string; value: React.ReactNode }>;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Shared sub-page hero. Keeps every route visually anchored to the same
 * space-observation language without duplicating background layers.
 */
export default function PageHero({
  eyebrow,
  title,
  lead,
  actions,
  meta,
  children,
  className,
}: PageHeroProps) {
  return (
    <section
      className={clsx(
        'relative isolate overflow-hidden border-b border-white/[0.06] bg-ink-950',
        className
      )}
    >
      {/* Ambient space layers */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Starfield className="opacity-60" count={140} />
        <div className="absolute inset-0 aurora-bg opacity-80" />
        <div className="absolute inset-0 grid-faint opacity-50" />
        <div className="absolute left-1/2 top-0 h-px w-[80%] -translate-x-1/2 bg-gradient-to-r from-transparent via-aqua/25 to-transparent" />
        <div className="absolute -top-40 right-[8%] h-[420px] w-[420px] rounded-full bg-aqua/[0.07] blur-[120px]" />
        <div className="absolute -bottom-52 left-[4%] h-[380px] w-[380px] rounded-full bg-bio/[0.05] blur-[120px]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950 to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-6 pb-14 pt-28 sm:px-8 lg:px-10 lg:pb-20 lg:pt-36">
        <div className="max-w-4xl space-y-6">
          {eyebrow && (
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aqua opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aqua" />
              </span>
              <span className="eyebrow text-ice-400">{eyebrow}</span>
            </div>
          )}

          <h1 className="display text-[clamp(2.1rem,5vw,4.25rem)] text-white">{title}</h1>

          {lead && <p className="lead max-w-2xl text-[15px] sm:text-base">{lead}</p>}

          {actions && <div className="flex flex-wrap items-center gap-3 pt-1">{actions}</div>}

          {meta && meta.length > 0 && (
            <dl className="flex flex-wrap gap-x-8 gap-y-4 border-t border-white/[0.07] pt-6">
              {meta.map((item) => (
                <div key={item.label} className="space-y-1">
                  <dt className="eyebrow text-ice-500">{item.label}</dt>
                  <dd className="font-mono text-[13px] text-ice-200">{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {children}
      </div>
    </section>
  );
}
