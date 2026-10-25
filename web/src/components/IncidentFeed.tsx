'use client';

import { useState } from 'react';
import { InvestigationReport } from '@/types/incident';
import { Search, Filter, ShieldAlert, ArrowRight, MapPin, Calendar, Maximize2 } from 'lucide-react';

interface IncidentFeedProps {
  incidents: InvestigationReport[];
  selectedId?: string;
  onSelectIncident: (id: string) => void;
}

export default function IncidentFeed({
  incidents,
  selectedId,
  onSelectIncident,
}: IncidentFeedProps) {
  const [filterCategory, setFilterCategory] = useState<'all' | 'forest_loss' | 'forest_recovery'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = incidents.filter((inc) => {
    if (filterCategory !== 'all' && inc.event_category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inc.report_title.toLowerCase().includes(q) ||
        inc.summary.toLowerCase().includes(q) ||
        inc.incident_id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-[#0b121e] border border-slate-800 rounded-lg p-4 space-y-4">
      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incidents by location, title, or ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded text-xs text-white placeholder-slate-400 focus:outline-none focus:border-forest-500 font-mono"
          />
        </div>

        <div className="flex items-center space-x-1.5 text-xs font-mono">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded transition ${
              filterCategory === 'all'
                ? 'bg-slate-700 text-white font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            ALL ({incidents.length})
          </button>
          <button
            onClick={() => setFilterCategory('forest_loss')}
            className={`px-3 py-1.5 rounded transition ${
              filterCategory === 'forest_loss'
                ? 'bg-red-950 text-red-300 font-bold border border-red-800'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            LOSS
          </button>
          <button
            onClick={() => setFilterCategory('forest_recovery')}
            className={`px-3 py-1.5 rounded transition ${
              filterCategory === 'forest_recovery'
                ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            RECOVERY
          </button>
        </div>
      </div>

      {/* Incident List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 font-mono">
            No incidents found matching current filters.
          </div>
        ) : (
          filtered.map((inc) => {
            const isSelected = inc.incident_id === selectedId;
            const isLoss = inc.event_category === 'forest_loss';

            return (
              <div
                key={inc.incident_id}
                onClick={() => onSelectIncident(inc.incident_id)}
                className={`p-4 rounded-lg cursor-pointer transition border ${
                  isSelected
                    ? 'bg-[#121c2c] border-forest-400 ring-1 ring-forest-400/40'
                    : 'bg-[#0d1624] border-slate-800 hover:border-slate-700 hover:bg-[#101928]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2 font-mono text-[11px]">
                    <span className="font-bold text-slate-300">{inc.incident_id}</span>
                    <span className={`px-1.5 py-0.2 rounded uppercase text-[10px] font-semibold ${
                      isLoss
                        ? 'bg-red-950 text-red-300 border border-red-800/60'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                    }`}>
                      {inc.event_category.replace('_', ' ')}
                    </span>
                    {inc.is_synthetic_test ? (
                      <span className="text-[10px] bg-amber-950/70 text-amber-300 px-1 rounded border border-amber-800/40 font-bold">
                        [SYNTHETIC TEST]
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-1 rounded border border-emerald-800/50 font-bold">
                        [GENUINE SATELLITE]
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{inc.report_date}</span>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-white tracking-tight">
                  {inc.report_title}
                </h3>

                <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                  {inc.summary}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2.5 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-forest-400" />
                      <span>{inc.geographic_coordinates[1].toFixed(2)}° N, {inc.geographic_coordinates[0].toFixed(2)}° E</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Maximize2 className="w-3 h-3 text-amber-400" />
                      <span className="text-white font-medium">{inc.affected_area_hectares.toFixed(2)} ha</span>
                    </span>
                  </div>

                  <span className="text-forest-400 font-semibold flex items-center space-x-1 hover:underline">
                    <span>Inspect Dossier</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
