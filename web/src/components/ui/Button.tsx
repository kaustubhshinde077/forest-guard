'use client';

import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export function buttonClass(
  variant: Variant = 'primary',
  size: Size = 'md',
  className?: string
) {
  const base =
    'group relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-sans font-semibold tracking-[-0.01em] transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bio focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060F]';

  const variants: Record<Variant, string> = {
    primary:
      'bg-bio text-[#05060F] hover:bg-[#5affc0] active:bg-[#32e098]',
    secondary:
      'border border-white/15 bg-white/[0.04] text-ice-100 backdrop-blur-md hover:border-bio/40 hover:bg-white/[0.07] hover:text-white',
    ghost: 'text-ice-300 hover:text-white font-medium',
    accent:
      'bg-bio text-[#05060F] hover:bg-[#5affc0] active:bg-[#32e098]',
    outline:
      'border border-aqua/30 text-aqua hover:border-aqua/60 hover:bg-aqua/10',
  };

  const sizes: Record<Size, string> = {
    sm: 'h-9 px-4 text-[13px] rounded-lg',
    md: 'h-11 px-5 text-[14px] rounded-xl',
    lg: 'h-12 px-6 text-[15px] rounded-xl',
  };

  return twMerge(clsx(base, variants[variant], sizes[size], className));
}

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  target?: string;
  rel?: string;
  ariaLabel?: string;
  title?: string;
}

export default function Button({
  children,
  href,
  variant = 'primary',
  size = 'md',
  className,
  iconLeft,
  iconRight,
  onClick,
  type = 'button',
  disabled,
  target,
  rel,
  ariaLabel,
  title,
}: ButtonProps) {
  const classes = buttonClass(variant, size, className);
  const isExternal = href ? /^https?:\/\//.test(href) : false;

  const inner = (
    <>
      {iconLeft && <span className="shrink-0">{iconLeft}</span>}
      <span>{children}</span>
      {iconRight && (
        <span className="shrink-0 transition-transform duration-150 ease-out group-hover:translate-x-[2px]">
          {iconRight}
        </span>
      )}
    </>
  );

  if (href) {
    if (isExternal || target === '_blank') {
      return (
        <a
          href={href}
          target={target || '_blank'}
          rel={rel || 'noopener noreferrer'}
          className={classes}
          aria-label={ariaLabel}
          title={title}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} aria-label={ariaLabel} title={title} onClick={onClick}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      aria-label={ariaLabel}
      title={title}
    >
      {inner}
    </button>
  );
}
