'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowUpRight } from 'lucide-react';

const navLinks = [
  { label: 'Overview', href: '/' },
  { label: 'Map', href: '/explore' },
  { label: 'Investigations', href: '/investigations' },
  { label: 'Methodology', href: '/status' },
];

function OrbitMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="4.2"
        stroke="currentColor"
        strokeWidth="1.1"
        opacity="0.9"
        transform="rotate(-28 12 12)"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="9.2"
        ry="3.6"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.38"
        transform="rotate(34 12 12)"
      />
    </svg>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const cleanPath = (pathname || '/').replace(/^\/forest-guard/, '') || '/';

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(y / max, 1) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (href: string) =>
    href === '/' ? cleanPath === '/' : cleanPath.startsWith(href);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* scroll progress */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[2px] origin-left bg-gradient-to-r from-aqua via-aqua to-bio transition-opacity duration-500"
        style={{ transform: `scaleX(${progress})`, opacity: scrolled ? 1 : 0 }}
      />

      <div
        className={`relative border-b transition-all duration-300 ease-out ${
          scrolled
            ? 'border-white/[0.08] bg-ink-950/85 backdrop-blur-md'
            : 'border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 sm:px-8 lg:px-10">
          {/* Wordmark: Forest Guard (Sora 600) */}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            aria-label="Forest Guard home"
            className="group flex shrink-0 items-center gap-2.5 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bio/60"
          >
            <OrbitMark className="h-5 w-5 text-bio transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-45" />
            <span className="flex flex-col leading-none">
              <span className="font-heading text-base font-semibold tracking-tight text-white">
                Forest Guard
              </span>
              <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-ice-400">
                Earth observation
              </span>
            </span>
          </Link>

          {/* Desktop Navigation (>= 900px) */}
          <nav
            aria-label="Primary"
            className="hidden items-center gap-8 min-[900px]:flex"
          >
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative py-1 font-sans text-[15px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bio/60 rounded ${
                    active
                      ? 'text-white after:absolute after:-bottom-1.5 after:left-0 after:right-0 after:h-[1.5px] after:bg-bio'
                      : 'text-ice-300 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile hamburger (< 900px) */}
          <div className="flex shrink-0 items-center min-[900px]:hidden">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-ice-200 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bio/60"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation drawer (< 900px) */}
      <div
        id="mobile-nav"
        role={open ? 'dialog' : undefined}
        aria-modal={open ? 'true' : undefined}
        aria-label="Mobile Navigation Menu"
        className={`fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-white/[0.08] bg-ink-950/95 backdrop-blur-2xl transition-all duration-300 ease-out min-[900px]:hidden ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
      >
        <div className="relative flex min-h-full flex-col justify-between px-6 pb-10 pt-8 sm:px-8">
          <nav aria-label="Mobile" className="flex flex-col">
            {navLinks.map((link, i) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between border-b border-white/[0.07] py-4 font-sans text-lg font-medium transition-colors ${
                    active ? 'text-bio' : 'text-ice-100 hover:text-white'
                  }`}
                >
                  <span className="flex items-baseline gap-4">
                    <span className="font-mono text-xs text-ice-500">
                      0{i + 1}
                    </span>
                    <span>{link.label}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 opacity-50" />
                </Link>
              );
            })}
          </nav>

          <div className="space-y-3 pt-8 border-t border-white/[0.08]">
            <p className="font-mono text-[11px] leading-relaxed text-ice-400">
              Staged pilot · 5 of 1,479 sectors assessed. All detections are
              unconfirmed candidates.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
