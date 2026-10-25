import pytest
import os
import json

from forestguard.data.fixtures import OfflineFixtureLoader
from forestguard.vision.detector import NonNDVIChangeDetector
from forestguard.agent.investigator import AutonomousInvestigator
from forestguard.agent.tools import MockSearchProvider, RegionalTreeDensityDB
from forestguard.agent.llm import MockRuleBasedProvider

FIXTURES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/fixtures"))

def test_adaptive_investigation_lead_formulation():
    """Verify that different visual geometries produce different investigative leads."""
    investigator = AutonomousInvestigator(
        llm_provider=MockRuleBasedProvider(),
        search_provider=MockSearchProvider()
    )
    loader = OfflineFixtureLoader(FIXTURES_DIR)
    detector = NonNDVIChangeDetector()

    # 1. Koyna Linear Corridor
    b1, a1, meta1 = loader.load_pair("test_pair_1_loss_koyna")
    res1 = detector.detect_changes(b1, a1, geo_bbox=meta1.get("bbox"))
    reg1 = res1.candidate_regions[0]
    leads1 = investigator._formulate_adaptive_leads(reg1, "Koyna Buffer", [73.71, 17.41], ["2023-02-14", "2023-05-25"])
    assert any("road" in lead.query.lower() or "highway" in lead.query.lower() for lead in leads1)
    assert any("corridor" in lead.rationale.lower() for lead in leads1)

    # 2. Rondonia Compact Clearcut
    b4, a4, meta4 = loader.load_pair("test_pair_4_global_benchmark_rondonia")
    res4 = detector.detect_changes(b4, a4, geo_bbox=meta4.get("bbox"))
    reg4 = res4.candidate_regions[0]
    leads4 = investigator._formulate_adaptive_leads(reg4, "Rondonia", [-63.5, -9.25], ["2023-07-18", "2023-09-26"])
    assert any("clearcut" in lead.query.lower() or "prodes" in lead.query.lower() for lead in leads4)
    assert not any("road" in lead.query.lower() for lead in leads4)

def test_full_investigation_report_generation():
    """Verify end-to-end report generation with trace, citations, and tree density estimation."""
    investigator = AutonomousInvestigator(
        llm_provider=MockRuleBasedProvider(),
        search_provider=MockSearchProvider()
    )
    loader = OfflineFixtureLoader(FIXTURES_DIR)
    detector = NonNDVIChangeDetector()

    b1, a1, meta1 = loader.load_pair("test_pair_1_loss_koyna")
    res1 = detector.detect_changes(b1, a1, geo_bbox=meta1.get("bbox"))
    reg1 = res1.candidate_regions[0]

    report = investigator.investigate(
        incident_id="INC-TEST-001",
        region=reg1,
        observation_dates=["2023-02-14", "2023-05-25"],
        site_context={"name": "Koyna Buffer Ridge"},
        is_synthetic_test=True
    )

    assert report.incident_id == "INC-TEST-001"
    assert report.is_synthetic_test is True
    assert "[SYNTHETIC TEST]" in report.report_title
    assert report.event_category == "forest_loss"
    assert report.investigation_mode == "offline_simulated"
    assert len(report.citations) >= 1
    # Verify that all offline mock citations carry is_live_retrieval=False
    for c in report.citations:
        assert c.is_live_retrieval is False
        assert "[SIMULATED TEST RECORD]" in c.title
    assert len(report.decision_trace) >= 4
    assert report.decision_trace[0].step_type == "vision_telemetry_intake"

    # Verify Tree Count Estimate bounds (FSI moist deciduous density: 240-450 stems/ha)
    assert report.tree_count_estimate.is_supported is True
    assert report.tree_count_estimate.canopy_density_trees_per_ha_min == 240
    assert report.tree_count_estimate.canopy_density_trees_per_ha_max == 450
    assert report.tree_count_estimate.estimated_affected_trees_min > 0
    assert report.tree_count_estimate.estimated_affected_trees_max > report.tree_count_estimate.estimated_affected_trees_min

def test_recovery_investigation_lead():
    """Verify Tillari recovery produces afforestation leads."""
    investigator = AutonomousInvestigator(
        llm_provider=MockRuleBasedProvider(),
        search_provider=MockSearchProvider()
    )
    loader = OfflineFixtureLoader(FIXTURES_DIR)
    detector = NonNDVIChangeDetector()

    b2, a2, meta2 = loader.load_pair("test_pair_2_recovery_tilarinagar")
    res2 = detector.detect_changes(b2, a2, geo_bbox=meta2.get("bbox"))
    reg2 = res2.candidate_regions[0]

    report = investigator.investigate(
        incident_id="INC-TEST-002",
        region=reg2,
        observation_dates=["2021-03-10", "2024-03-15"],
        site_context={"name": "Tillari Conservation Reserve"},
        is_synthetic_test=True
    )

    assert report.event_category == "forest_recovery"
    assert any("afforestation" in cause["hypothesis"].lower() for cause in report.likely_causes_hypotheses)
