import os
import json
from forestguard.data.fixtures import OfflineFixtureLoader
from forestguard.vision.detector import NonNDVIChangeDetector
from forestguard.agent.investigator import AutonomousInvestigator

def run_e2e():
    fixtures_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/fixtures"))
    loader = OfflineFixtureLoader(fixtures_dir)
    detector = NonNDVIChangeDetector(significance_threshold_ha=0.5)
    investigator = AutonomousInvestigator()

    print("=" * 85)
    print("FOREST GUARD — END-TO-END AGENTIC VISION INVESTIGATION DEMO")
    print("=" * 85)

    fixtures = loader.list_fixtures()
    for fix_name in sorted(fixtures.keys()):
        print(f"\n" + "-" * 85)
        print(f"PROCESSING SITE: {fix_name}")
        print("-" * 85)
        
        b, a, meta = loader.load_pair(fix_name)
        bbox = meta.get("bbox")
        dates = [meta.get("acquisition_date_before"), meta.get("acquisition_date_after")]
        site_name = meta.get("name")
        
        det_res = detector.detect_changes(b, a, geo_bbox=bbox, acquisition_dates=tuple(dates))
        print(f"[Vision Engine Output] Status: {det_res.status}, Loss Ha: {det_res.total_candidate_loss_ha}, Recovery Ha: {det_res.total_candidate_recovery_ha}")
        
        if not det_res.candidate_regions:
            print("  -> No qualifying incident detected (Negative control verified). No investigation dispatched.")
            continue
            
        for reg in det_res.candidate_regions:
            print(f"\n[Dispatching Autonomous Agent] Region {reg.region_id} ({reg.change_type}) - {reg.area_hectares} ha")
            inc_id = f"INC-{fix_name[:12].upper()}-{reg.region_id:02d}"
            report = investigator.investigate(
                incident_id=inc_id,
                region=reg,
                observation_dates=dates,
                site_context={"name": site_name},
                is_synthetic_test=True
            )
            
            print(f"  Report ID: {report.incident_id}")
            print(f"  Title: {report.report_title}")
            print(f"  Event Category: {report.event_category}")
            print(f"  Status: {report.investigation_status}")
            print(f"  Summary: {report.summary}")
            print(f"  Likely Cause: {report.likely_causes_hypotheses[0]['hypothesis']}")
            print(f"  Evidence Basis: {report.likely_causes_hypotheses[0]['supporting_evidence']}")
            if report.tree_count_estimate.is_supported:
                print(f"  Tree Impact Range: {report.tree_count_estimate.estimated_affected_trees_min} - {report.tree_count_estimate.estimated_affected_trees_max} trees ({report.tree_count_estimate.density_source})")
            print(f"  Citations ({len(report.citations)} sources):")
            for c in report.citations:
                print(f"    * [{c.evidence_tier}] {c.title} ({c.url})")
            print(f"  Decision Trace Steps: {len(report.decision_trace)} steps recorded.")
            for step in report.decision_trace:
                print(f"    Step {step.step_number} [{step.step_type}]: {step.decision_rationale}")

if __name__ == "__main__":
    run_e2e()
