import pytest
import os
import json
from fastapi.testclient import TestClient

from forestguard.api.main import app
from forestguard.api.store import IncidentStore

client = TestClient(app)

def test_api_status_endpoint():
    """Verify system status reports operational mode and credential awareness."""
    resp = client.get("/api/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "operational"
    assert data["total_incidents_recorded"] >= 3
    assert "notice" in data

def test_api_list_incidents():
    """Verify incidents listing with sorting and category filters."""
    # List all
    resp = client.get("/api/incidents")
    assert resp.status_code == 200
    all_incidents = resp.json()
    assert len(all_incidents) >= 3

    # Verify all test incidents carry synthetic and simulation labels
    for inc in all_incidents:
        assert inc["is_synthetic_test"] is True
        assert "[SYNTHETIC TEST]" in inc["report_title"]
        assert inc["investigation_mode"] in ["offline_simulated", "live_web_research"]

    # Filter by category: forest_loss
    resp_loss = client.get("/api/incidents?category=forest_loss")
    assert resp_loss.status_code == 200
    loss_incidents = resp_loss.json()
    assert all(inc["event_category"] == "forest_loss" for inc in loss_incidents)

    # Filter by category: forest_recovery
    resp_rec = client.get("/api/incidents?category=forest_recovery")
    assert resp_rec.status_code == 200
    rec_incidents = resp_rec.json()
    assert all(inc["event_category"] == "forest_recovery" for inc in rec_incidents)

def test_api_get_individual_incident():
    """Verify detailed incident dossier retrieval and 404 behavior."""
    resp_list = client.get("/api/incidents")
    inc_id = resp_list.json()[0]["incident_id"]

    resp = client.get(f"/api/incidents/{inc_id}")
    assert resp.status_code == 200
    inc = resp.json()
    assert inc["incident_id"] == inc_id
    assert "decision_trace" in inc
    assert "citations" in inc
    assert "tree_count_estimate" in inc

    # Non-existent ID returns 404
    resp_404 = client.get("/api/incidents/INC-DOES-NOT-EXIST")
    assert resp_404.status_code == 404

def test_api_fixture_image_serving():
    """Verify that before and after satellite png crops are served with correct headers."""
    resp_before = client.get("/api/fixtures/test_pair_1_loss_koyna/image/before")
    assert resp_before.status_code == 200
    assert resp_before.headers["content-type"] == "image/png"

    resp_after = client.get("/api/fixtures/test_pair_1_loss_koyna/image/after")
    assert resp_after.status_code == 200
    assert resp_after.headers["content-type"] == "image/png"

    # Invalid image type returns 400
    resp_bad = client.get("/api/fixtures/test_pair_1_loss_koyna/image/invalid_type")
    assert resp_bad.status_code == 400
