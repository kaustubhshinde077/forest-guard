import React from 'react';
import clsx from 'clsx';

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: 'left' | 'center';
  action?: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

export default function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'left',
  action,
  className,
  titleClassName,
}: SectionHeadingProps) {
  const centered = align === 'center';

  return (
    <div
      className={clsx(
        'flex flex-col gap-6',
        centered ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between',
        className
      )}
    >
      <div className={clsx('space-y-4', centered ? 'max-w-3xl items-center' : 'max-w-2xl')}>
        {eyebrow && (
          <div className={clsx('flex items-center gap-2.5', centered && 'justify-center')}>
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-aqua/60" />
            <span className="eyebrow eyebrow-aqua">{eyebrow}</span>
          </div>
        )}
        <h2
          className={clsx(
            'display-tight text-[clamp(1.65rem,3.4vw,2.75rem)] text-white',
            titleClassName
          )}
        >
          {title}
        </h2>
        {lead && <p className="lead text-[15px]">{lead}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
