'use client';

import React, { useEffect, useState } from 'react';
import { fetchLiveCandidates } from '@/lib/data';
import { InvestigationReport } from '@/types/incident';
import CandidateInvestigationsFeed from '@/components/investigations/CandidateInvestigationsFeed';
import { FileSearch } from 'lucide-react';

export default function InvestigationsPage() {
  const [candidates, setCandidates] = useState<InvestigationReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchLiveCandidates()
      .then((data) => {
        if (mounted) {
          setCandidates(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load candidate investigation feed');
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {isLoading ? (
        <div className="w-full h-96 bg-[#080d16] border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-xs font-mono text-slate-400 space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          <span>LOADING SATELLITE CHANGE CANDIDATE DOSSIERS...</span>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-red-950/40 border border-red-800 text-center space-y-2">
          <h2 className="text-sm font-mono font-bold text-red-300">Data Fetch Failure</h2>
          <p className="text-xs font-mono text-slate-400">{error}</p>
        </div>
      ) : (
        <CandidateInvestigationsFeed candidates={candidates} />
      )}
    </div>
  );
}
