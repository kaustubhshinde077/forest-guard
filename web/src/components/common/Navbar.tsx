'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: 'Overview', href: '/' },
    { label: 'Map', href: '/explore' },
    { label: 'Investigations', href: '/investigations' },
    { label: 'Methodology', href: '/status' },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 h-16 transition-colors duration-200 ${
        isScrolled
          ? 'bg-[#05060F]/85 backdrop-blur-md border-b border-white/[0.06]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="w-full h-full px-6 sm:px-12 lg:px-16 flex items-center justify-between">
        {/* Wordmark: Forest Guard (Sora 600) + Small plain orbit-ring mark */}
        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center space-x-2.5 text-white hover:text-slate-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3DFFB0] rounded-lg py-1"
        >
          {/* Plain minimalist SVG orbit ring mark (no box, no shield, no glow) */}
          <svg
            className="w-4 h-4 text-[#3DFFB0]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M4.93 19.07 A10 10 0 0 1 19.07 4.93" />
            <path d="M19.07 19.07 A10 10 0 0 1 4.93 4.93" />
          </svg>
          <span className="font-heading font-semibold text-[17px] tracking-tight">
            Forest Guard
          </span>
        </Link>

        {/* Desktop Navigation Links (>= 900px, exactly 4 items, on one line) */}
        <nav
          aria-label="Primary navigation"
          className="hidden min-[900px]:flex items-center space-x-8"
        >
          {navLinks.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/' || pathname === '/forest-guard/' || pathname === '/forest-guard'
                : pathname?.includes(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-sans font-medium text-[14.5px] whitespace-nowrap transition-colors relative py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3DFFB0] rounded ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>{link.label}</span>
                {/* Subtle active/hover indicator */}
                <span
                  className={`absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#3DFFB0] transition-opacity duration-150 ${
                    isActive ? 'opacity-100' : 'opacity-0 hover:opacity-50'
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Mobile Hamburger Button (< 900px) */}
        <div className="flex min-[900px]:hidden items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="w-11 h-11 flex items-center justify-center text-slate-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3DFFB0] rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down / Full-Screen Navigation Overlay (< 900px) */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
          className="min-[900px]:hidden fixed inset-x-0 top-16 bottom-0 bg-[#05060F]/95 backdrop-blur-xl border-t border-white/[0.08] z-50 flex flex-col justify-between px-6 py-8"
        >
          <nav className="space-y-6">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/' || pathname === '/forest-guard/' || pathname === '/forest-guard'
                  : pathname?.includes(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block font-sans text-xl font-medium tracking-tight py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3DFFB0] rounded ${
                    isActive ? 'text-[#3DFFB0]' : 'text-slate-200 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Discreet Mobile Footer Status */}
          <div className="pt-6 border-t border-white/[0.08] text-xs font-mono text-slate-400">
            <span>Staged Pilot · Classical Vision Architecture</span>
          </div>
        </div>
      )}
    </header>
  );
}
