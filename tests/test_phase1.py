import pytest
import os
import cv2
import numpy as np
from forestguard.data.fixtures import OfflineFixtureLoader
from forestguard.data.cdse import CopernicusClient

FIXTURES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/fixtures"))

def test_opencv5_environment():
    """Verify that OpenCV 5.x is active and functioning in the isolated venv."""
    assert cv2.__version__.startswith("5."), f"Expected OpenCV 5.x, got {cv2.__version__}"
    # Verify core algorithms execute without error
    mat = np.zeros((64, 64, 3), dtype=np.uint8)
    gray = cv2.cvtColor(mat, cv2.COLOR_BGR2GRAY)
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    assert lap.shape == (64, 64)

def test_fixture_loader_discovery():
    """Verify that all 4 benchmark test datasets are discovered and parsed."""
    loader = OfflineFixtureLoader(FIXTURES_DIR)
    fixtures = loader.list_fixtures()
    assert len(fixtures) == 4, f"Expected 4 test fixtures, found {len(fixtures)}"
    expected_keys = [
        "test_pair_1_loss_koyna",
        "test_pair_2_recovery_tilarinagar",
        "test_pair_3_shadow_seasonal_mahabaleshwar",
        "test_pair_4_global_benchmark_rondonia"
    ]
    for key in expected_keys:
        assert key in fixtures, f"Missing fixture: {key}"
        meta = fixtures[key]
        assert "bbox" in meta
        assert "documented_ground_truth" in meta
        assert "acquisition_date_before" in meta
        assert "acquisition_date_after" in meta

def test_fixture_image_loading():
    """Verify that fixture images load into valid OpenCV BGR image arrays."""
    loader = OfflineFixtureLoader(FIXTURES_DIR)
    img_before, img_after, meta = loader.load_pair("test_pair_1_loss_koyna")
    assert img_before is not None
    assert img_after is not None
    assert img_before.shape == (400, 400, 3)
    assert img_after.shape == (400, 400, 3)
    assert meta["documented_ground_truth"]["event_type"] == "linear_corridor_loss"

def test_copernicus_client_fallback_logic():
    """Verify that Copernicus client properly handles unconfigured state."""
    client = CopernicusClient(client_id=None, client_secret=None)
    assert not client.is_configured()
    with pytest.raises(ValueError, match="not configured"):
        client.authenticate()
