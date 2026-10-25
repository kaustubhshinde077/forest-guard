import pytest
import os
import shutil
import tempfile
import cv2
import numpy as np

from forestguard.storage import FileReportStore
from forestguard.orchestrator import MonitoringOrchestrator
from forestguard.agent.models import InvestigationReport, TreeCountEstimate

def test_file_report_store_durability_across_restarts():
    """Verify that reports and image artifacts persist and reload after service restart."""
    temp_dir = tempfile.mkdtemp()
    try:
        # 1. Initialize store instance A
        store_a = FileReportStore(temp_dir)
        
        # Create a mock report
        tree_est = TreeCountEstimate(
            is_supported=True,
            forest_type="Western Ghats Moist Deciduous",
            canopy_density_trees_per_ha_min=240,
            canopy_density_trees_per_ha_max=450,
            estimated_affected_trees_min=1000,
            estimated_affected_trees_max=1800,
            density_source="FSI",
            calculation_basis="Area * Density",
            limitations="None"
        )
        report = InvestigationReport(
            incident_id="INC-PERSIST-001",
            report_title="[SYNTHETIC TEST] Durability Test Incident",
            report_date="2026-10-25",
            event_category="forest_loss",
            investigation_status="concluded_with_evidence",
            is_synthetic_test=True,
            investigation_mode="offline_simulated",
            geographic_coordinates=[73.71, 17.41],
            affected_area_hectares=4.16,
            measurement_uncertainty_hectares=0.72,
            observation_dates=["2023-02-14", "2023-05-25"],
            visual_geometry="linear_corridor",
            aspect_ratio=9.66,
            confidence_score=0.97,
            summary="Testing storage persistence across process boundaries.",
            detailed_findings="Findings text.",
            likely_causes_hypotheses=[{"hypothesis": "Road widening", "supporting_evidence": "Test"}],
            linked_entities_or_projects=[],
            tree_count_estimate=tree_est,
            citations=[],
            decision_trace=[]
        )
        
        store_a.save_report(report)
        dummy_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRtest"
        store_a.save_image_artifact("INC-PERSIST-001", "before", dummy_png)
        
        # Simulate service restart: Destroy store_a and recreate store_b pointing to same directory
        del store_a
        store_b = FileReportStore(temp_dir)
        
        # Verify reports survived process termination
        reloaded = store_b.get_report("INC-PERSIST-001")
        assert reloaded is not None
        assert reloaded.incident_id == "INC-PERSIST-001"
        assert reloaded.affected_area_hectares == 4.16
        assert reloaded.tree_count_estimate.canopy_density_trees_per_ha_min == 240
        
        # Verify image artifact survived
        reloaded_img = store_b.get_image_artifact("INC-PERSIST-001", "before")
        assert reloaded_img == dummy_png
        
        # Verify listing
        all_reps = store_b.list_reports()
        assert len(all_reps) == 1
    finally:
        shutil.rmtree(temp_dir)

def test_complete_monitoring_orchestration_cycle():
    """Verify that MonitoringOrchestrator executes the complete 21-day cycle end-to-end."""
    temp_dir = tempfile.mkdtemp()
    try:
        store = FileReportStore(temp_dir)
        fixtures_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/fixtures"))
        
        orchestrator = MonitoringOrchestrator(
            report_store=store,
            cadence_days=21,
            significance_threshold_ha=1.0,
            fixtures_dir=fixtures_dir
        )
        
        # Execute cycle in forced offline mode
        summary = orchestrator.run_scheduled_monitoring_cycle(force_offline_fixtures=True)
        
        assert summary["cadence_days"] == 21
        assert summary["sectors_evaluated"] == 4
        # Changes detected on Koyna, Tillari, and Rondonia (Mahabaleshwar negative control rejected)
        assert summary["changes_detected_count"] >= 3
        # Reports published only for qualifying events (Koyna 4.16ha, Tillari 6.5ha, Rondonia 18.4ha)
        assert summary["investigations_conducted_count"] == 3
        
        # Verify that reports are physically present in durable storage
        persisted_reports = store.list_reports()
        assert len(persisted_reports) == 3
        for rep in persisted_reports:
            assert rep.affected_area_hectares >= 1.0
            assert rep.is_synthetic_test is True
            # Verify that both before and after image artifacts were generated and persisted
            b_bytes = store.get_image_artifact(rep.incident_id, "before")
            a_bytes = store.get_image_artifact(rep.incident_id, "after")
            assert b_bytes is not None and len(b_bytes) > 0
            assert a_bytes is not None and len(a_bytes) > 0
    finally:
        shutil.rmtree(temp_dir)

def test_production_monitoring_refuses_synthetic_fallback():
    """Verify that production monitoring refuses synthetic fallback and leaves incidents unpublished."""
    temp_dir = tempfile.mkdtemp()
    try:
        store = FileReportStore(temp_dir)
        orchestrator = MonitoringOrchestrator(
            report_store=store,
            cadence_days=21,
            significance_threshold_ha=1.0,
            allow_synthetic_fallback=False
        )

        # In production mode without live credentials, retrieval must fail and NOT publish
        summary = orchestrator.run_scheduled_monitoring_cycle(force_offline_fixtures=False)

        assert summary["sectors_evaluated"] == 4
        assert summary["investigations_conducted_count"] == 0
        assert len(summary["reports_published"]) == 0
        assert len(summary["failed_sectors"]) == 4

        for failed in summary["failed_sectors"]:
            assert failed["status"] == "retrieval_failed"
            assert failed["published"] is False
            assert "synthetic fallback prohibited" in failed["reason"].lower() or "not configured" in failed["reason"].lower()

        # Durable store must contain 0 reports
        assert len(store.list_reports()) == 0
    finally:
        shutil.rmtree(temp_dir)

def test_genuine_satellite_orchestration_end_to_end_and_api_retrieval():
    """
    Validate the complete end-to-end pipeline with genuine satellite data:
    Invocation -> Retrieval -> OpenCV 5 non-NDVI analysis -> Significance filter ->
    Adaptive Investigation -> Durable Storage -> FastAPI REST API Retrieval.
    """
    temp_dir = tempfile.mkdtemp()
    try:
        store = FileReportStore(temp_dir)
        genuine_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../data/genuine/sentinel2_rondonia_real")
        )
        assert os.path.isdir(genuine_dir), "Genuine Sentinel-2 dataset directory must exist"

        genuine_sector = [{
            "sector_id": "SEC-GENUINE-S2-RONDONIA",
            "name": "Jamari Buffer, Rondonia (Genuine Sentinel-2 Acquisition)",
            "bbox": [-63.50, -9.28, -63.46, -9.24],
            "genuine_data_dir": genuine_dir
        }]

        orchestrator = MonitoringOrchestrator(
            report_store=store,
            cadence_days=21,
            significance_threshold_ha=1.0,
            allow_synthetic_fallback=False # Strict production mode
        )

        # 1. Execute scheduled monitoring cycle on genuine satellite sector
        summary = orchestrator.run_scheduled_monitoring_cycle(
            sectors=genuine_sector,
            force_offline_fixtures=False
        )

        assert summary["sectors_evaluated"] == 1
        assert summary["changes_detected_count"] > 0
        assert summary["investigations_conducted_count"] > 0
        assert len(summary["reports_published"]) > 0

        first_pub = summary["reports_published"][0]
        inc_id = first_pub["incident_id"]
        assert first_pub["is_synthetic_test"] is False
        assert "[SYNTHETIC TEST]" not in first_pub["title"]

        # 2. Verify durable storage persistence
        persisted = store.get_report(inc_id)
        assert persisted is not None
        assert persisted.is_synthetic_test is False
        assert persisted.affected_area_hectares >= 1.0
        assert persisted.tree_count_estimate.is_supported is True

        b_png = store.get_image_artifact(inc_id, "before")
        a_png = store.get_image_artifact(inc_id, "after")
        assert b_png is not None and len(b_png) > 1000
        assert a_png is not None and len(a_png) > 1000

        # 3. Verify API retrieval through FastAPI backend
        from fastapi.testclient import TestClient
        import forestguard.api.main as api_main

        orig_store = api_main.store
        try:
            api_main.set_store(store)
            client = TestClient(api_main.app)

            resp_list = client.get("/api/incidents")
            assert resp_list.status_code == 200
            inc_list = resp_list.json()
            matching = [item for item in inc_list if item["incident_id"] == inc_id]
            assert len(matching) == 1
            assert matching[0]["is_synthetic_test"] is False

            # Dossier retrieval
            resp_detail = client.get(f"/api/incidents/{inc_id}")
            assert resp_detail.status_code == 200
            detail = resp_detail.json()
            assert detail["incident_id"] == inc_id
            assert detail["is_synthetic_test"] is False
            assert len(detail["decision_trace"]) >= 4

            # Image stream retrieval
            resp_img_b = client.get(f"/api/incidents/{inc_id}/image/before")
            assert resp_img_b.status_code == 200
            assert resp_img_b.headers["content-type"] == "image/png"

            resp_img_a = client.get(f"/api/incidents/{inc_id}/image/after")
            assert resp_img_a.status_code == 200
            assert resp_img_a.headers["content-type"] == "image/png"
        finally:
            api_main.set_store(orig_store)
    finally:
        shutil.rmtree(temp_dir)
