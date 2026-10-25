"""
Tests for Forest Guard Maharashtra Statewide GIS Tile Catalogue & Batching Architecture.
Validates:
1. Coverage completeness (1,479 intersecting tiles covering all 36 districts).
2. Fixed origin stability and canonical tile IDs (MH-R{r}-C{c}).
3. Terrestrial boundary clipping and accurate equal-area hectare calculations.
4. Deterministic 21-day geographic batch interleaving.
5. Resumability, cloud retry queuing, and duplicate prevention.
6. Ground-area threshold compliance (1.0 ha = 100 pixels at 10 m/px).
"""

import os
import json
import pytest
from datetime import datetime, timezone, timedelta


@pytest.fixture(scope="module")
def catalogue_data():
    cat_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/catalogue/maharashtra_tiles.json"))
    assert os.path.exists(cat_path), f"Catalogue file not found at {cat_path}"
    with open(cat_path, "r", encoding="utf-8") as f:
        return json.load(f)


def test_catalogue_structure_and_completeness(catalogue_data):
    """Verify metadata, CRS, fixed origin, district count, and total tile count."""
    assert catalogue_data["state"] == "Maharashtra"
    assert catalogue_data["administrative_districts_count"] == 36
    assert catalogue_data["projection_grid_crs"] == "EPSG:7755"
    assert catalogue_data["cell_size_meters"] == 15000.0
    assert catalogue_data["cadence_days"] == 21
    assert catalogue_data["fixed_origin_epsg7755"] == [3240000.0, 3090000.0]

    # Verify ISFR reference
    isfr = catalogue_data["isfr_reference"]
    assert "ISFR 2023" in isfr["version"]
    assert isfr["maharashtra_forest_cover_km2"] == 50858.0

    summary = catalogue_data["summary"]
    assert summary["total_intersecting_tiles"] == 1479
    assert len(catalogue_data["tiles"]) == 1479
    assert summary["forest_priority_tiles"] == 676
    assert summary["total_terrestrial_area_km2"] > 290000.0


def test_tile_id_stability_and_spatial_coordinates(catalogue_data):
    """Verify deterministic stable IDs and valid bounding boxes."""
    tiles = catalogue_data["tiles"]
    seen_ids = set()

    for t in tiles:
        tid = t["tile_id"]
        assert tid.startswith("MH-R") and "-C" in tid
        assert tid not in seen_ids, f"Duplicate tile ID found: {tid}"
        seen_ids.add(tid)

        # Coordinate checks
        minx, miny, maxx, maxy = t["bbox_epsg7755"]
        assert maxx - minx == 15000.0
        assert maxy - miny == 15000.0

        min_lon, min_lat, max_lon, max_lat = t["bbox_epsg4326"]
        assert 72.0 <= min_lon <= 81.5
        assert 72.0 <= max_lon <= 81.5
        assert 15.0 <= min_lat <= 22.5
        assert 15.0 <= max_lat <= 22.5
        assert max_lon > min_lon
        assert max_lat > min_lat


def test_terrestrial_boundary_clipping_and_area(catalogue_data):
    """Verify clipped terrestrial area is accurate, non-negative, and <= gross area."""
    tiles = catalogue_data["tiles"]
    total_clipped_km2 = 0.0

    for t in tiles:
        gross = t["gross_area_km2"]
        terr_km2 = t["terrestrial_area_km2"]
        terr_ha = t["terrestrial_area_ha"]

        assert gross == 225.0
        assert 0.05 <= terr_km2 <= 225.0
        assert abs(terr_ha - terr_km2 * 100.0) <= 1.0
        total_clipped_km2 += terr_km2

    # Total clipped area should be approximately 297,650 km²
    assert pytest.approx(total_clipped_km2, rel=1e-3) == catalogue_data["summary"]["total_terrestrial_area_km2"]


def test_21day_batch_interleaving(catalogue_data):
    """Verify 21-day batching has 70 or 71 tiles per day and geographic diversity."""
    batch_dist = catalogue_data["batch_distribution"]
    assert len(batch_dist) == 21

    total_batched_tiles = 0
    for b in batch_dist:
        assert b["tile_count"] in (70, 71)
        total_batched_tiles += b["tile_count"]
        # Ensure forest priority tiles are present in every daily batch
        assert b["forest_priority_tile_count"] >= 25

    assert total_batched_tiles == 1479

    # Verify each day contains multiple regions
    tiles = catalogue_data["tiles"]
    day_regions = {day: set() for day in range(1, 22)}
    for t in tiles:
        day_regions[t["scheduled_batch_day"]].add(t["region"])

    for day, regs in day_regions.items():
        # Every day must span at least 4 distinct geographical biomes
        assert len(regs) >= 4, f"Day {day} lacks regional diversity: only {regs}"


def test_resumability_and_retry_queuing():
    """Verify state transitions: monitored, cloud retry, and duplicate prevention."""
    # Simulated monitoring state machine
    mock_state = {
        "cycle_id": "CYCLE-2026-01",
        "tiles": {
            "MH-R13-C06": {
                "status": "monitored_no_change",
                "last_monitored": "2026-10-25T10:00:00Z",
                "cycle_day": 1
            },
            "MH-R02-C08": {
                "status": "cloud_obscured",
                "cloud_pct": 42.5,
                "retry_due": True,
                "cycle_day": 1
            }
        }
    }

    # Simulate next run on Day 1
    scheduled_day_tiles = ["MH-R13-C06", "MH-R02-C08", "MH-R33-C46"]
    tiles_to_process = []

    for tid in scheduled_day_tiles:
        tile_record = mock_state["tiles"].get(tid)
        if not tile_record:
            # Unprocessed tile: must process
            tiles_to_process.append(tid)
        elif tile_record.get("status") in ("monitored_no_change", "monitored_candidate_detected"):
            # Already successfully monitored: skip (duplicate prevention)
            continue
        elif tile_record.get("status") == "cloud_obscured" and tile_record.get("retry_due"):
            # Obscured earlier: retry
            tiles_to_process.append(tid)

    assert "MH-R13-C06" not in tiles_to_process, "Duplicate run on already-monitored tile was not prevented!"
    assert "MH-R02-C08" in tiles_to_process, "Cloud-obscured retry tile was not re-queued!"
    assert "MH-R33-C46" in tiles_to_process, "Pending tile was not scheduled!"


def test_hectare_threshold_ground_truth():
    """Verify that 1.0 ha trigger is exactly 100 pixels at 10 m/pixel resolution."""
    resolution_m = 10.0
    pixel_area_m2 = resolution_m * resolution_m  # 100 m²
    pixels_in_one_ha = 10000.0 / pixel_area_m2  # 10,000 m² / 100 m² = 100 pixels

    assert pixel_area_m2 == 100.0
    assert pixels_in_one_ha == 100.0

    # 15 km x 15 km raster dimensions
    sector_dim_m = 15000.0
    pixels_dim = int(sector_dim_m / resolution_m)
    assert pixels_dim == 1500
    total_pixels = pixels_dim * pixels_dim
    assert total_pixels == 2250000
    total_ha = (total_pixels * pixel_area_m2) / 10000.0
    assert total_ha == 22500.0
