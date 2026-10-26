export interface SourceCitation {
  source_id: string;
  title: string;
  url: string;
  publisher?: string;
  publication_date?: string;
  access_date: string;
  evidence_tier: string;
  is_live_retrieval: boolean;
  supports_claims: string[];
  conflicts_with?: string;
  snippet: string;
}

export interface TreeCountEstimate {
  is_supported: boolean;
  forest_type: string;
  canopy_density_trees_per_ha_min?: number;
  canopy_density_trees_per_ha_max?: number;
  estimated_affected_trees_min?: number;
  estimated_affected_trees_max?: number;
  density_source: string;
  source_url?: string;
  calculation_basis: string;
  limitations: string;
}

export interface DecisionTraceStep {
  step_number: number;
  step_type: string;
  decision_rationale: string;
  execution_mode: string;
  tool_name?: string;
  tool_inputs?: Record<string, any>;
  tool_outputs_summary?: string;
  findings_extracted: string[];
}

export interface InvestigationReport {
  incident_id: string;
  report_title: string;
  report_date: string;
  event_category: 'forest_loss' | 'forest_recovery' | 'unconfirmed_change';
  investigation_status: 'concluded_with_evidence' | 'insufficient_public_evidence' | 'disputed_accounts' | 'unconfirmed_candidate';
  is_synthetic_test: boolean;
  investigation_mode: 'live_web_research' | 'offline_simulated';
  geographic_coordinates: [number, number]; // [lon, lat]
  geographic_bounding_box?: [number, number, number, number];
  affected_area_hectares: number;
  measurement_uncertainty_hectares: number;
  observation_dates: [string, string];
  visual_geometry: string;
  aspect_ratio: number;
  heuristic_score?: number; // Uncalibrated heuristic contrast and geometry score (0.0 to 1.0)
  confidence_score: number; // Legacy alias for heuristic_score (not a calibrated probability)
  summary: string;
  detailed_findings: string;
  likely_causes_hypotheses: Array<{
    hypothesis: string;
    supporting_evidence: string;
  }>;
  linked_entities_or_projects: Array<{
    entity_name: string;
    role: string;
  }>;
  conflicting_accounts: string[];
  unresolved_questions_and_unknowns: string[];
  tree_count_estimate: TreeCountEstimate;
  citations: SourceCitation[];
  decision_trace: DecisionTraceStep[];
}
