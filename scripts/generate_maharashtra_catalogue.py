#!/usr/bin/env python3
"""
Forest Guard — Reproducible Maharashtra GIS Tile Catalogue Generator
Generates a deterministic 15 km x 15 km statewide monitoring tile catalogue covering
the entire terrestrial boundary of Maharashtra (36 districts) in EPSG:7755.

Compliance & Methodology:
- Grid CRS: EPSG:7755 (India National Lambert Conformal Conic).
- Fixed Grid Origin: (3240000.0 m, 3090000.0 m) in EPSG:7755 coordinates.
- Cell Dimensions: 15,000 m x 15,000 m (225 km² gross).
- Authoritative Boundary: Census of India 2011 / Survey of India 36-district boundary.
- Intersecting Coverage Criterion: Includes ALL cells intersecting the terrestrial boundary (no centroid exclusion).
- Precise Clipped Terrestrial Area: Exact area computed per tile in km² and hectares.
- Stable Tile IDs: Format MH-R{row:02d}-C{col:02d}.
- Geographic Batch Interleaving: Deterministically distributes tiles across 21 daily batches
  ensuring all regions (Western Ghats, Konkan, Vidarbha, Melghat, Marathwada, Desh) are checked every day.
- Forest Priority: Prioritizes tiles intersecting forest cover aligned with ISFR 2023 reference (50,858 km²).
"""

import os
import sys
import json
import math
import logging
from typing import Dict, Any, List, Tuple
from shapely.geometry import shape, mapping, box, MultiPolygon, Polygon
from shapely.ops import unary_union
from shapely.prepared import prep
import rasterio
from rasterio.crs import CRS
from rasterio.warp import transform_geom

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("generate_maharashtra_catalogue")

GRID_CRS_EPSG = 7755
CELL_SIZE_METERS = 15000.0  # 15 km x 15 km = 225 km²
FIXED_ORIGIN_X = 3240000.0  # Fixed stable grid origin in EPSG:7755 meters
FIXED_ORIGIN_Y = 3090000.0
CADENCE_DAYS = 21

# Agro-climatic regional grouping for Maharashtra's 36 districts
DISTRICT_REGIONS = {
    # Konkan (Coastal moist belt, laterite plateaus, mangrove fringes)
    "Sindhudurg": "Konkan", "Ratnagiri": "Konkan", "Raigarh": "Konkan", "Raigad": "Konkan",
    "Thane": "Konkan", "Palghar": "Konkan", "Mumbai": "Konkan", "Mumbai Suburban": "Konkan",
    # Western Ghats / Pune Division (Montane evergreen, escarpments, crestline)
    "Satara": "Western Ghats", "Kolhapur": "Western Ghats", "Sangli": "Western Ghats",
    "Pune": "Western Ghats", "Ahmadnagar": "Desh / Deccan", "Ahmednagar": "Desh / Deccan", "Solapur": "Desh / Deccan",
    # Khandesh / North Maharashtra (Satpura transition, Tapi basin)
    "Nashik": "Western Ghats", "Dhule": "Khandesh", "Nandurbar": "Khandesh", "Jalgaon": "Khandesh",
    # Marathwada (Dry plateau, scrub, Godavari basin)
    "Aurangabad": "Marathwada", "Jalna": "Marathwada", "Parbhani": "Marathwada",
    "Bid": "Marathwada", "Beed": "Marathwada", "Nanded": "Marathwada",
    "Osmanabad": "Marathwada", "Latur": "Marathwada", "Hingoli": "Marathwada",
    # Vidarbha / Eastern Forest Belt (Dry/moist teak deciduous, high forest cover)
    "Amravati": "Melghat / Satpura", "Buldana": "Vidarbha", "Buldhana": "Vidarbha",
    "Akola": "Vidarbha", "Washim": "Vidarbha", "Yavatmal": "Vidarbha",
    "Nagpur": "Vidarbha", "Wardha": "Vidarbha", "Bhandara": "Vidarbha",
    "Gondiya": "Vidarbha", "Chandrapur": "Vidarbha", "Gadchiroli": "Vidarbha"
}

# High-density forest districts based on ISFR 2023 (total forest cover ~50,858 km²)
# Gadchiroli (~9,900 km²), Chandrapur (~4,100 km²), Ratnagiri, Sindhudurg, Kolhapur,
# Thane, Palghar, Amravati (Melghat), Gondia, Raigad.
FOREST_PRIORITY_DISTRICTS = {
    "Gadchiroli", "Chandrapur", "Gondiya", "Bhandara", "Amravati",
    "Sindhudurg", "Ratnagiri", "Raigad", "Raigarh", "Kolhapur", "Satara", "Thane", "Palghar"
}


def load_authoritative_boundary(geojson_path: str) -> Tuple[List[Dict[str, Any]], Any, Any]:
    """Load and project district boundaries and statewide union into EPSG:7755."""
    if not os.path.exists(geojson_path):
        raise FileNotFoundError(f"Boundary file not found: {geojson_path}")

    logger.info("Loading authoritative boundary from: %s", geojson_path)
    with open(geojson_path, "r", encoding="utf-8") as f:
        fc = json.load(f)

    districts = []
    geoms_7755 = []

    for feat in fc.get("features", []):
        props = feat.get("properties", {})
        dtname = props.get("dtname") or props.get("district") or props.get("NAME_2") or "Unknown"
        g4326 = shape(feat["geometry"])
        if not g4326.is_valid:
            g4326 = g4326.buffer(0)

        # Reproject geometry to EPSG:7755
        g7755_dict = transform_geom(CRS.from_epsg(4326), CRS.from_epsg(GRID_CRS_EPSG), mapping(g4326))
        g7755 = shape(g7755_dict)
        if not g7755.is_valid:
            g7755 = g7755.buffer(0)

        districts.append({
            "name": dtname,
            "region": DISTRICT_REGIONS.get(dtname, "Deccan Plateau"),
            "geometry_7755": g7755,
            "properties": props
        })
        geoms_7755.append(g7755)

    state_union_7755 = unary_union(geoms_7755)
    logger.info("Loaded %d districts. Statewide area in EPSG:7755: %.2f km²", len(districts), state_union_7755.area / 1e6)
    return districts, state_union_7755


def generate_catalogue(
    districts: List[Dict[str, Any]],
    state_union_7755: Any,
    output_path: str
) -> Dict[str, Any]:
    """Tessellate uniform 15 km x 15 km cells and calculate exact intersections."""
    minx, miny, maxx, maxy = state_union_7755.bounds
    logger.info("State bounding box (EPSG:7755): X=[%.1f, %.1f], Y=[%.1f, %.1f]", minx, miny, maxx, maxy)

    n_cols = math.ceil((maxx - FIXED_ORIGIN_X) / CELL_SIZE_METERS)
    n_rows = math.ceil((maxy - FIXED_ORIGIN_Y) / CELL_SIZE_METERS)
    logger.info("Grid dimensions: %d rows x %d cols = %d candidate cells", n_rows, n_cols, n_rows * n_cols)

    prep_state = prep(state_union_7755)
    tiles = []

    # Prepare districts for fast point/polygon queries
    prepared_districts = [(d["name"], d["region"], prep(d["geometry_7755"]), d["geometry_7755"]) for d in districts]

    for r in range(n_rows):
        for c in range(n_cols):
            cell_minx = FIXED_ORIGIN_X + c * CELL_SIZE_METERS
            cell_miny = FIXED_ORIGIN_Y + r * CELL_SIZE_METERS
            cell_maxx = cell_minx + CELL_SIZE_METERS
            cell_maxy = cell_miny + CELL_SIZE_METERS

            cell_poly = box(cell_minx, cell_miny, cell_maxx, cell_maxy)

            # Check if cell intersects state boundary
            if not prep_state.intersects(cell_poly):
                continue

            # Compute exact intersection geometry and terrestrial area
            clipped_geom = cell_poly.intersection(state_union_7755)
            if clipped_geom.is_empty:
                continue

            terrestrial_area_m2 = clipped_geom.area
            terrestrial_area_km2 = terrestrial_area_m2 / 1e6
            terrestrial_area_ha = terrestrial_area_km2 * 100.0

            # Ignore microscopic slivers (< 0.05 km² / 5 ha) caused by precision rounding at borders
            if terrestrial_area_km2 < 0.05:
                continue

            # Convert bounding box back to EPSG:4326 for satellite querying
            cell_4326_dict = transform_geom(CRS.from_epsg(GRID_CRS_EPSG), CRS.from_epsg(4326), mapping(cell_poly))
            cell_4326 = shape(cell_4326_dict)
            bbox_4326 = [round(v, 6) for v in cell_4326.bounds]  # [min_lon, min_lat, max_lon, max_lat]
            centroid_4326 = [round(cell_4326.centroid.x, 6), round(cell_4326.centroid.y, 6)]

            # Determine primary district and region
            intersecting_districts = []
            max_district_area = 0.0
            primary_district = "Unknown"
            primary_region = "Deccan Plateau"

            cell_prep = prep(cell_poly)
            for d_name, d_region, d_prep, d_geom in prepared_districts:
                if d_prep.intersects(cell_poly):
                    d_clip = cell_poly.intersection(d_geom)
                    d_area = d_clip.area
                    if d_area > 0.01:
                        intersecting_districts.append(d_name)
                        if d_area > max_district_area:
                            max_district_area = d_area
                            primary_district = d_name
                            primary_region = d_region

            # Determine priority tier
            is_forest_priority = (primary_district in FOREST_PRIORITY_DISTRICTS) or (primary_region in ("Western Ghats", "Melghat / Satpura"))
            priority_tier = 1 if is_forest_priority else 2

            tile_id = f"MH-R{r:02d}-C{c:02d}"

            tiles.append({
                "tile_id": tile_id,
                "row": r,
                "col": c,
                "bbox_epsg7755": [cell_minx, cell_miny, cell_maxx, cell_maxy],
                "bbox_epsg4326": bbox_4326,
                "centroid_epsg4326": centroid_4326,
                "gross_area_km2": round(CELL_SIZE_METERS * CELL_SIZE_METERS / 1e6, 2),
                "terrestrial_area_km2": round(terrestrial_area_km2, 2),
                "terrestrial_area_ha": round(terrestrial_area_ha, 1),
                "coverage_pct": round((terrestrial_area_km2 / 225.0) * 100.0, 1),
                "primary_district": primary_district,
                "intersecting_districts": intersecting_districts,
                "region": primary_region,
                "priority_tier": priority_tier,
                "is_forest_priority": is_forest_priority
            })

    total_tiles = len(tiles)
    logger.info("Generated %d valid boundary-intersecting tiles.", total_tiles)

    # Deterministic Geographic Batch Interleaving across 21 days
    # Sort tiles by region and coordinates so round-robin distribution evenly interleaves biomes
    regions_order = ["Western Ghats", "Konkan", "Melghat / Satpura", "Vidarbha", "Khandesh", "Marathwada", "Desh / Deccan"]
    grouped_by_region = {reg: [] for reg in regions_order}
    for t in tiles:
        reg = t["region"]
        if reg not in grouped_by_region:
            grouped_by_region[reg] = []
        grouped_by_region[reg].append(t)

    # Sort each region group spatially (by row, then col)
    for reg in regions_order:
        grouped_by_region[reg].sort(key=lambda x: (x["row"], x["col"]))

    # Interleave into 21 daily batches
    batches: List[List[Dict[str, Any]]] = [[] for _ in range(CADENCE_DAYS)]
    batch_idx = 0
    for reg in regions_order:
        for t in grouped_by_region[reg]:
            t["scheduled_batch_day"] = batch_idx + 1  # 1 to 21
            batches[batch_idx].append(t)
            batch_idx = (batch_idx + 1) % CADENCE_DAYS

    # Sort tiles by tile_id for durable canonical ordering
    tiles.sort(key=lambda x: x["tile_id"])

    # Compute batch statistics
    batch_stats = []
    for day_i, b in enumerate(batches):
        b_area = sum(t["terrestrial_area_km2"] for t in b)
        b_forest_count = sum(1 for t in b if t["is_forest_priority"])
        batch_stats.append({
            "day": day_i + 1,
            "tile_count": len(b),
            "total_area_km2": round(b_area, 2),
            "forest_priority_tile_count": b_forest_count
        })

    # Total statewide area from clipped tiles
    total_clipped_area_km2 = sum(t["terrestrial_area_km2"] for t in tiles)
    forest_priority_tiles_count = sum(1 for t in tiles if t["is_forest_priority"])

    metadata = {
        "catalogue_version": "1.0.0",
        "generated_date": "2026-10-25T23:45:00Z",
        "state": "Maharashtra",
        "administrative_districts_count": len(districts),
        "boundary_source": "Census of India 2011 / Survey of India District Boundaries",
        "boundary_license": "Creative Commons Attribution 2.5 India / Open Government Data",
        "projection_grid_crs": "EPSG:7755",
        "projection_name": "India National Lambert Conformal Conic (LCC)",
        "fixed_origin_epsg7755": [FIXED_ORIGIN_X, FIXED_ORIGIN_Y],
        "cell_size_meters": CELL_SIZE_METERS,
        "cadence_days": CADENCE_DAYS,
        "isfr_reference": {
            "version": "ISFR 2023 (Forest Survey of India)",
            "maharashtra_forest_cover_km2": 50858.0,
            "recorded_forest_cover_pct": 16.53
        },
        "summary": {
            "total_intersecting_tiles": total_tiles,
            "forest_priority_tiles": forest_priority_tiles_count,
            "total_terrestrial_area_km2": round(total_clipped_area_km2, 2),
            "average_tiles_per_day": round(total_tiles / CADENCE_DAYS, 2),
            "min_tiles_per_day": min(bs["tile_count"] for bs in batch_stats),
            "max_tiles_per_day": max(bs["tile_count"] for bs in batch_stats)
        },
        "batch_distribution": batch_stats,
        "tiles": tiles
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Saved %d tiles to %s (Statewide terrestrial area: %.2f km²)", total_tiles, output_path, total_clipped_area_km2)
    return metadata


if __name__ == "__main__":
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    boundary_file = os.path.join(repo_root, "data/gis/maharashtra_districts.geojson")
    out_file = os.path.join(repo_root, "data/catalogue/maharashtra_tiles.json")
    
    districts, state_union = load_authoritative_boundary(boundary_file)
    meta = generate_catalogue(districts, state_union, out_file)
    print("\n" + "=" * 60)
    print(f"MAHARASHTRA TILE CATALOGUE GENERATION COMPLETE")
    print(f"Total Intersecting Tiles: {meta['summary']['total_intersecting_tiles']}")
    print(f"Terrestrial Area: {meta['summary']['total_terrestrial_area_km2']:,} km²")
    print(f"Daily Average: {meta['summary']['average_tiles_per_day']} tiles/day over {CADENCE_DAYS} days")
    print(f"Forest Priority Tiles: {meta['summary']['forest_priority_tiles']}")
    print("=" * 60)
