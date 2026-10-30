import React from 'react';
import clsx from 'clsx';

type Variant = 'candidate' | 'live' | 'info' | 'muted' | 'danger';

interface StatusPillProps {
  children: React.ReactNode;
  variant?: Variant;
  dot?: boolean;
  className?: string;
  pulse?: boolean;
}

const variantStyles: Record<Variant, { wrap: string; dot: string }> = {
  candidate: {
    wrap: 'border-signal/30 bg-signal/[0.08] text-signal-400',
    dot: 'bg-signal',
  },
  live: {
    wrap: 'border-bio/30 bg-bio/[0.07] text-bio-400',
    dot: 'bg-bio',
  },
  info: {
    wrap: 'border-aqua/25 bg-aqua/[0.07] text-aqua',
    dot: 'bg-aqua',
  },
  muted: {
    wrap: 'border-white/10 bg-white/[0.035] text-ice-400',
    dot: 'bg-ice-500',
  },
  danger: {
    wrap: 'border-red-400/30 bg-red-400/[0.07] text-red-300',
    dot: 'bg-red-400',
  },
};

export default function StatusPill({
  children,
  variant = 'muted',
  dot = true,
  className,
  pulse = false,
}: StatusPillProps) {
  const v = variantStyles[variant];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase leading-none tracking-[0.14em]',
        v.wrap,
        className
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulse && (
            <span
              className={clsx(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
                v.dot
              )}
            />
          )}
          <span className={clsx('relative inline-flex h-1.5 w-1.5 rounded-full', v.dot)} />
        </span>
      )}
      {children}
    </span>
  );
}
