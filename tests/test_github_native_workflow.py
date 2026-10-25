import os
import shutil
import tempfile
import json
from datetime import datetime, timezone, timedelta
import pytest

from forestguard.storage import GitReportStore
from forestguard.agent.models import InvestigationReport, TreeCountEstimate
from forestguard.workflow_runner import run_pipeline


def test_git_report_store_incidents_index_and_mirroring():
    """Verify that GitReportStore manages incidents.json and mirrors artifacts to web_public_dir."""
    temp_dir = tempfile.mkdtemp()
    temp_web_dir = tempfile.mkdtemp()
    try:
        store = GitReportStore(base_dir=temp_dir, web_public_dir=temp_web_dir)

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
            incident_id="INC-GH-TEST-001",
            report_title="[SYNTHETIC TEST] GitHub-Native Storage Verification",
            report_date="2026-10-25",
            event_category="forest_loss",
            investigation_status="concluded_with_evidence",
            is_synthetic_test=True,
            investigation_mode="offline_simulated",
            geographic_coordinates=[73.71, 17.41],
            affected_area_hectares=3.5,
            measurement_uncertainty_hectares=0.5,
            observation_dates=["2023-01-01", "2023-02-01"],
            visual_geometry="linear_corridor",
            aspect_ratio=4.2,
            confidence_score=0.95,
            summary="Testing GitHub Pages static report indexing.",
            detailed_findings="Findings text.",
            likely_causes_hypotheses=[{"hypothesis": "Road corridor", "supporting_evidence": "Test"}],
            linked_entities_or_projects=[],
            tree_count_estimate=tree_est,
            citations=[],
            decision_trace=[]
        )

        # 1. Save report and image artifact
        store.save_report(report)
        dummy_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRtestbytes"
        store.save_image_artifact("INC-GH-TEST-001", "before", dummy_png)

        # 2. Verify incidents.json was generated in base_dir
        index_file = os.path.join(temp_dir, "incidents.json")
        assert os.path.exists(index_file)
        with open(index_file) as f:
            feed = json.load(f)
        assert len(feed) == 1
        assert feed[0]["incident_id"] == "INC-GH-TEST-001"
        assert feed[0]["affected_area_hectares"] == 3.5

        # 3. Verify mirroring to web_public_dir
        web_index = os.path.join(temp_web_dir, "incidents.json")
        web_report = os.path.join(temp_web_dir, "reports", "INC-GH-TEST-001.json")
        web_img = os.path.join(temp_web_dir, "artifacts", "INC-GH-TEST-001", "before.png")

        assert os.path.exists(web_index)
        assert os.path.exists(web_report)
        assert os.path.exists(web_img)

        # 4. Save second report and verify ordering
        report2 = report.model_copy(update={
            "incident_id": "INC-GH-TEST-002",
            "report_date": "2026-10-26",
            "report_title": "[SYNTHETIC TEST] Newer Incident"
        })
        store.save_report(report2)

        with open(index_file) as f:
            updated_feed = json.load(f)
        assert len(updated_feed) == 2
        # Descending date sort: 2026-10-26 must be first
        assert updated_feed[0]["incident_id"] == "INC-GH-TEST-002"
        assert updated_feed[1]["incident_id"] == "INC-GH-TEST-001"
    finally:
        shutil.rmtree(temp_dir)
        shutil.rmtree(temp_web_dir)


def test_monitoring_state_and_due_time_guard():
    """Verify 21-day due-time evaluation and state history tracking."""
    temp_dir = tempfile.mkdtemp()
    try:
        store = GitReportStore(base_dir=temp_dir)

        # Initial state: never run -> must be due
        is_due, rationale = store.is_monitoring_due(cadence_days=21)
        assert is_due is True
        assert "Initial monitoring run" in rationale

        # Record a run 5 days ago
        recent_run = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
        store.save_monitoring_state({
            "cadence_days": 21,
            "last_successful_run": recent_run,
            "last_attempt_timestamp": recent_run,
            "total_runs_completed": 1,
            "last_run_status": "success",
            "history": []
        })

        # Check: 5 days < 21 days -> NOT DUE
        is_due, rationale = store.is_monitoring_due(cadence_days=21)
        assert is_due is False
        assert "not due" in rationale.lower()

        # Record a run 22 days ago
        old_run = (datetime.now(timezone.utc) - timedelta(days=22)).isoformat()
        store.save_monitoring_state({
            "cadence_days": 21,
            "last_successful_run": old_run,
            "last_attempt_timestamp": old_run,
            "total_runs_completed": 1,
            "last_run_status": "success",
            "history": []
        })

        # Check: 22 days >= 21 days -> DUE
        is_due, rationale = store.is_monitoring_due(cadence_days=21)
        assert is_due is True
        assert "due" in rationale.lower()
    finally:
        shutil.rmtree(temp_dir)


def test_workflow_runner_due_time_skipping_and_force():
    """Verify that workflow_runner skips execution when not due and forces execution when requested."""
    temp_data = tempfile.mkdtemp()
    temp_web = tempfile.mkdtemp()
    try:
        store = GitReportStore(base_dir=temp_data, web_public_dir=temp_web)

        # Set last run to 2 hours ago
        recent_run = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        store.save_monitoring_state({
            "cadence_days": 21,
            "last_successful_run": recent_run,
            "last_attempt_timestamp": recent_run,
            "total_runs_completed": 1,
            "last_run_status": "success",
            "history": []
        })

        # 1. Normal run (not forced): Must skip execution and record check
        ret_skip = run_pipeline(
            cadence_days=21,
            force=False,
            allow_synthetic=True,
            data_dir=temp_data,
            web_dir=temp_web
        )
        assert ret_skip == 0

        # Verify state shows scheduled check was recorded without incrementing total runs
        state = store.get_monitoring_state()
        assert state["total_runs_completed"] == 1
        assert len(state["history"]) == 1
        assert state["history"][0]["action"] == "scheduled_check"
        assert state["history"][0]["status"] == "skipped_not_due"

        # 2. Forced run: Must execute immediately despite recent run
        ret_force = run_pipeline(
            cadence_days=21,
            force=True,
            allow_synthetic=True,
            data_dir=temp_data,
            web_dir=temp_web
        )
        assert ret_force == 0

        # Verify state updated with full run
        state_after = store.get_monitoring_state()
        assert state_after["total_runs_completed"] == 2
        assert state_after["history"][0]["action"] == "full_monitoring_cycle"
        assert state_after["history"][0]["forced"] is True

        # Verify incidents.json was generated
        assert os.path.exists(os.path.join(temp_data, "incidents.json"))
        assert os.path.exists(os.path.join(temp_web, "incidents.json"))
    finally:
        shutil.rmtree(temp_data)
        shutil.rmtree(temp_web)
