import './globals.css';
import type { Metadata, Viewport } from 'next';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';

export const metadata: Metadata = {
  title: {
    default: 'Forest Guard — Planetary canopy intelligence from orbit',
    template: '%s — Forest Guard',
  },
  description:
    'Forest Guard is an open satellite forest-loss monitoring platform for Maharashtra. Classical OpenCV vision, Copernicus Sentinel-2 observations and public-evidence investigation dossiers — no proprietary indices, no black boxes.',
  keywords: [
    'forest monitoring',
    'satellite forest loss',
    'Sentinel-2',
    'OpenCV',
    'Maharashtra',
    'deforestation',
    'earth observation',
  ],
  authors: [{ name: 'Kaustubh Shinde' }],
  openGraph: {
    title: 'Forest Guard — Planetary canopy intelligence from orbit',
    description:
      'Open satellite forest-loss monitoring for Maharashtra: classical vision, Sentinel-2 imagery, and evidence-led candidate investigations.',
    type: 'website',
    siteName: 'Forest Guard',
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#03050B',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth" id="top">
      <body className="min-h-screen bg-ink-950 font-sans text-ice-100 antialiased selection:bg-aqua/25 selection:text-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ice-100 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink-950"
        >
          Skip to content
        </a>

        <Navbar />

        <main id="main-content" className="flex-1">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
