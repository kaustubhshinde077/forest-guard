import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { InvestigationReport } from '@/types/incident';
import CandidateDetailView from '@/components/investigations/CandidateDetailView';

interface PageProps {
  params: {
    id: string;
  };
}

/**
 * Generates canonical static routes for all 20 genuine Copernicus Sentinel-2 candidates.
 * Synthetic fixtures are strictly excluded.
 */
export async function generateStaticParams() {
  const incidentsPath = path.join(process.cwd(), 'public/data/incidents.json');
  if (!fs.existsSync(incidentsPath)) return [];

  try {
    const raw = fs.readFileSync(incidentsPath, 'utf-8');
    const incidents: InvestigationReport[] = JSON.parse(raw);

    return incidents
      .filter((inc) => !inc.is_synthetic_test && inc.incident_id)
      .map((inc) => ({
        id: inc.incident_id,
      }));
  } catch (err) {
    console.error('Failed to generate static params for candidates:', err);
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `[UNCONFIRMED CANDIDATE] ${params.id} — Forest Guard`,
    description: `Copernicus Sentinel-2 forest-change candidate investigation dossier for ${params.id}`,
  };
}

export default async function CandidateReportPage({ params }: PageProps) {
  const reportPath = path.join(process.cwd(), 'public/data/reports', `${params.id}.json`);
  let candidate: InvestigationReport | null = null;

  if (fs.existsSync(reportPath)) {
    try {
      candidate = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    } catch (e) {
      console.warn(`Could not parse report file for ${params.id}:`, e);
    }
  }

  if (!candidate) {
    // Fallback to incidents index
    const incidentsPath = path.join(process.cwd(), 'public/data/incidents.json');
    if (fs.existsSync(incidentsPath)) {
      try {
        const list: InvestigationReport[] = JSON.parse(fs.readFileSync(incidentsPath, 'utf-8'));
        candidate = list.find((c) => c.incident_id === params.id && !c.is_synthetic_test) || null;
      } catch (e) {}
    }
  }

  // Strictly enforce honesty: non-existent or synthetic records 404
  if (!candidate || candidate.is_synthetic_test) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      <CandidateDetailView candidate={candidate} />
    </div>
  );
}
