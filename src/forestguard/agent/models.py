from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class InvestigationLead(BaseModel):
    lead_id: str
    query: str
    rationale: str
    lead_type: str = Field(description="'official_clearance', 'legal_dispute', 'news_report', 'scientific_context'")

class SourceCitation(BaseModel):
    source_id: str
    title: str
    url: str
    publisher: Optional[str] = None
    publication_date: Optional[str] = None
    access_date: str
    evidence_tier: str = Field(description="'primary_official_record', 'credible_news_report', 'scientific_assessment', 'simulated_test_record', 'unverified_lead'")
    geographic_scope: str = Field(default="regional_context", description="'site_specific' or 'regional_context'")
    source_type: str = Field(default="primary_official_record", description="'primary_official_record', 'secondary_third_party_registry', 'regional_news_media', 'civil_society_analysis'")
    is_live_retrieval: bool = Field(default=False, description="True if retrieved via live web/API; False if loaded from offline test database")
    supports_claims: List[str]
    conflicts_with: Optional[str] = None
    snippet: str

class TreeCountEstimate(BaseModel):
    is_supported: bool
    forest_type: str
    estimation_status: str = Field(default="provisional", description="'provisional', 'verified_plot_inventory', or 'unavailable'")
    diameter_threshold: str = Field(default="DBH >= 10 cm", description="Minimum diameter at breast height threshold")
    canopy_density_trees_per_ha_min: Optional[int] = None
    canopy_density_trees_per_ha_max: Optional[int] = None
    estimated_affected_trees_min: Optional[int] = None
    estimated_affected_trees_max: Optional[int] = None
    density_source: str
    source_url: Optional[str] = None
    doi: Optional[str] = None
    forest_stratum: Optional[str] = None
    calculation_basis: str
    limitations: str

class DecisionTraceStep(BaseModel):
    step_number: int
    step_type: str = Field(description="'vision_telemetry_intake', 'lead_formulation', 'tool_execution', 'evidence_analysis', 'report_generation'")
    decision_rationale: str
    execution_mode: str = Field(default="offline_simulated", description="'live_api' or 'offline_simulated'")
    tool_name: Optional[str] = None
    tool_inputs: Optional[Dict[str, Any]] = None
    tool_outputs_summary: Optional[str] = None
    findings_extracted: List[str] = Field(default_factory=list)

class InvestigationReport(BaseModel):
    incident_id: str
    report_title: str
    report_date: str
    event_category: str = Field(description="'forest_loss', 'forest_recovery', 'unconfirmed_change'")
    investigation_status: str = Field(description="'concluded_with_evidence', 'insufficient_public_evidence', 'disputed_accounts'")
    is_synthetic_test: bool = True
    investigation_mode: str = Field(default="offline_simulated", description="'live_web_research' or 'offline_simulated_evaluation'")
    
    # Vision telemetry
    geographic_coordinates: List[float] = Field(description="[longitude, latitude]")
    geographic_bounding_box: Optional[List[float]] = None
    affected_area_hectares: float
    measurement_uncertainty_hectares: float
    observation_dates: List[str] = Field(description="[before_date, after_date]")
    visual_geometry: str
    aspect_ratio: float
    heuristic_score: float = Field(default=0.0, description="Uncalibrated heuristic score (0.0 to 1.0). Not a calibrated probability.")
    confidence_score: float = Field(description="Legacy field name for heuristic_score (uncalibrated score).")
    
    # Evidence & findings
    summary: str
    detailed_findings: str
    likely_causes_hypotheses: List[Dict[str, str]]
    relevant_jurisdictional_authorities: List[Dict[str, str]] = Field(default_factory=list, description="Relevant jurisdictional or regulatory authorities; not responsible parties.")
    linked_entities_or_projects: List[Dict[str, str]] = Field(default_factory=list, description="Legacy alias for relevant_jurisdictional_authorities.")
    conflicting_accounts: List[str] = Field(default_factory=list)
    unresolved_questions_and_unknowns: List[str] = Field(default_factory=list)
    
    tree_count_estimate: TreeCountEstimate
    citations: List[SourceCitation] = Field(default_factory=list)
    decision_trace: List[DecisionTraceStep] = Field(default_factory=list)
