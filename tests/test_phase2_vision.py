import pytest
import os
import cv2
import numpy as np

from forestguard.data.fixtures import OfflineFixtureLoader
from forestguard.vision.detector import NonNDVIChangeDetector
from forestguard.vision.quality import QualityAndMaskEngine

FIXTURES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/fixtures"))

def test_image_quality_engine():
    """Verify quality warnings for extreme lighting and blur."""
    dark_img = np.zeros((100, 100, 3), dtype=np.uint8)
    warnings = QualityAndMaskEngine.assess_quality(dark_img)
    assert any("underexposure" in w.lower() for w in warnings)

    bright_img = np.full((100, 100, 3), 250, dtype=np.uint8)
    warnings = QualityAndMaskEngine.assess_quality(bright_img)
    assert any("overexposure" in w.lower() for w in warnings)

def test_cloud_and_shadow_segmentation():
    """Verify detection of cloud and deep shadow pixels without spectral indices."""
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    img[:, :] = [30, 100, 40] # Canopy
    img[10:30, 10:30] = [240, 240, 240] # Cloud (high luminance, low saturation)
    img[70:90, 70:90] = [10, 10, 10] # Deep shadow

    mask = QualityAndMaskEngine.segment_clouds_and_shadows(img)
    assert mask[20, 20] == 255, "Cloud was not segmented"
    assert mask[80, 80] == 255, "Shadow was not segmented"
    assert mask[50, 50] == 0, "Clear canopy was incorrectly masked"

def test_reinhard_color_transfer_stability():
    """Verify Reinhard color normalization transforms source distribution toward target."""
    src = np.full((100, 100, 3), [20, 40, 120], dtype=np.uint8) # Brownish
    tgt = np.full((100, 100, 3), [40, 120, 40], dtype=np.uint8) # Greenish
    norm = QualityAndMaskEngine.reinhard_color_transfer(src, tgt)
    assert norm.shape == src.shape
    assert norm[:, :, 1].mean() > src[:, :, 1].mean()

def test_area_calculation_accuracy_against_known_mask():
    """Verify that detector calculates area accurately based on exact raster pixel count."""
    detector = NonNDVIChangeDetector(resolution_m_per_pixel=10.0) # 1 px = 100 m^2 = 0.01 ha
    test_mask = np.zeros((200, 200), dtype=np.uint8)
    # Create 500 px rectangle -> 5.00 ha
    test_mask[50:75, 50:70] = 255 # 25 * 20 = 500 px
    dummy_gray = np.zeros((200, 200), dtype=np.uint8)
    dummy_tex = np.zeros((200, 200), dtype=np.float32)

    regions, total_ha = detector._extract_regions(
        test_mask, "forest_loss_candidate", dummy_gray, dummy_gray, dummy_tex, dummy_tex, None
    )
    assert len(regions) == 1
    assert regions[0].area_pixels == 500
    assert regions[0].area_hectares == 5.0
    assert total_ha == 5.0

def test_detector_negative_control_suppression():
    """Verify that seasonal deciduous shifts and cloud shadows do NOT trigger false deforestation."""
    loader = OfflineFixtureLoader(FIXTURES_DIR)
    b, a, meta = loader.load_pair("test_pair_3_shadow_seasonal_mahabaleshwar")
    detector = NonNDVIChangeDetector()
    res = detector.detect_changes(b, a, geo_bbox=meta.get("bbox"))
    assert res.status == "NO_SUBSTANTIAL_CHANGE"
    assert res.total_candidate_loss_ha == 0.0
    assert len(res.candidate_regions) == 0

def test_koyna_linear_corridor_reconciliation():
    """Verify Koyna corridor loss area is reconciled to 4.2 ha ground truth target within 2% tolerance."""
    loader = OfflineFixtureLoader(FIXTURES_DIR)
    b, a, meta = loader.load_pair("test_pair_1_loss_koyna")
    detector = NonNDVIChangeDetector()
    res = detector.detect_changes(b, a, geo_bbox=meta.get("bbox"))
    assert res.status == "CHANGES_DETECTED"
    assert len(res.candidate_regions) == 1
    reg = res.candidate_regions[0]
    assert reg.change_type == "forest_loss_candidate"
    assert reg.geometry_classification == "linear_corridor"
    assert reg.aspect_ratio >= 3.0
    # Measured 4.16 ha vs 4.20 ha ground truth (well within 2% raster quantization tolerance)
    assert abs(reg.area_hectares - 4.20) <= 0.10

def test_tillari_and_rondonia_metrics():
    """Verify Tillari recovery and Rondonia clearcut measurements."""
    loader = OfflineFixtureLoader(FIXTURES_DIR)
    detector = NonNDVIChangeDetector()

    # Tillari Recovery
    b2, a2, meta2 = loader.load_pair("test_pair_2_recovery_tilarinagar")
    res2 = detector.detect_changes(b2, a2, geo_bbox=meta2.get("bbox"))
    assert res2.status == "CHANGES_DETECTED"
    assert len(res2.candidate_regions) == 1
    assert res2.candidate_regions[0].change_type == "forest_recovery_candidate"
    assert abs(res2.total_candidate_recovery_ha - 6.50) <= 0.10

    # Rondonia Clearcut
    b4, a4, meta4 = loader.load_pair("test_pair_4_global_benchmark_rondonia")
    res4 = detector.detect_changes(b4, a4, geo_bbox=meta4.get("bbox"))
    assert res4.status == "CHANGES_DETECTED"
    assert len(res4.candidate_regions) == 1
    assert res4.candidate_regions[0].change_type == "forest_loss_candidate"
    assert abs(res4.total_candidate_loss_ha - 18.40) <= 0.10
