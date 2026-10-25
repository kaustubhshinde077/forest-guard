"""
Forest Guard — Target Grid Mosaicing & Cross-MGRS Reprojection Engine
Handles Sentinel-2 Level-2A observation discovery, same-date rejection, cross-MGRS
granule compositing, and reprojection onto a stable canonical EPSG:7755 grid.

Safeguards Implemented:
1. Rejects identical before/after acquisition dates as invalid temporal change pairs.
2. Reprojects all contributing granules into the sector's fixed EPSG:7755 grid transform.
3. Seamlessly mosaics adjacent granules for sectors straddling MGRS tile boundaries.
4. Evaluates valid data coverage and rejects observations with inadequate spatial overlap (<80%).
5. Tracks source STAC item IDs, MGRS IDs, timestamps, and cloud cover metadata.
"""

import math
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

import rasterio
from rasterio.transform import from_bounds
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.crs import CRS
from rasterio.windows import from_bounds as win_from_bounds

logger = logging.getLogger("forestguard.data.mosaic")

TARGET_CRS_EPSG = 7755
TARGET_RESOLUTION_M = 10.0
TARGET_PIXELS_DIM = 1500  # 15,000 m / 10 m/px = 1,500 pixels


class IngestionError(Exception):
    """Base exception for satellite ingestion failures."""
    pass


class SameDateObservationError(IngestionError):
    """Raised when before and after observations share the identical acquisition date."""
    pass


class InadequateSpatialOverlapError(IngestionError):
    """Raised when valid data coverage across the target grid is insufficient."""
    pass


def compute_target_grid_spec(bbox_epsg7755: List[float]) -> Tuple[CRS, Any, Tuple[int, int]]:
    """
    Compute canonical CRS, affine transform, and pixel shape for a 15 km x 15 km sector.
    bbox_epsg7755: [minx, miny, maxx, maxy] in linear meters.
    """
    minx, miny, maxx, maxy = bbox_epsg7755
    target_crs = CRS.from_epsg(TARGET_CRS_EPSG)
    target_transform = from_bounds(minx, miny, maxx, maxy, TARGET_PIXELS_DIM, TARGET_PIXELS_DIM)
    target_shape = (TARGET_PIXELS_DIM, TARGET_PIXELS_DIM)
    return target_crs, target_transform, target_shape


def validate_temporal_pair(date_before: str, date_after: str) -> None:
    """Ensure observation dates represent a genuine temporal change pair."""
    d_before = date_before[:10]
    d_after = date_after[:10]
    if d_before == d_after:
        raise SameDateObservationError(
            f"Invalid temporal change pair: before date ({d_before}) and after date ({d_after}) "
            "are identical calendar dates. Same-date adjacent granules cannot form a temporal change pair."
        )


def reproject_and_mosaic_granules(
    granules: List[Dict[str, Any]],
    target_bbox_epsg7755: List[float],
    min_valid_coverage_pct: float = 80.0
) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
    """
    Reproject and composite one or more Sentinel-2 granules onto the fixed canonical EPSG:7755 grid.
    
    granules: List of dicts, each with:
      - 'url' or 'data': COG HTTP url or (3, H, W) numpy array
      - 'src_crs': rasterio CRS or EPSG integer
      - 'src_transform': rasterio Affine transform (if passing in-memory array)
      - 'mgrs_tile': MGRS identifier (e.g. '43PDT')
      - 'stac_id': Source STAC product ID
      - 'datetime': Acquisition timestamp
      - 'cloud_cover': Cloud cover percentage
      
    Returns:
      (target_bgr, valid_mask, ingestion_metadata)
    """
    target_crs, target_transform, (tgt_h, tgt_w) = compute_target_grid_spec(target_bbox_epsg7755)

    # Initialize destination raster (3 channels: BGR) and valid-data coverage mask
    target_bgr = np.zeros((tgt_h, tgt_w, 3), dtype=np.uint8)
    valid_mask = np.zeros((tgt_h, tgt_w), dtype=bool)

    contributing_mgrs = []
    contributing_stac_ids = []
    acquisition_times = []
    cloud_covers = []

    env = rasterio.Env(
        GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
        CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
        VSI_CACHE=True,
        GDAL_HTTP_MERGE_CONSECUTIVE_RANGES=True
    )

    with env:
        for gran in granules:
            mgrs_id = gran.get("mgrs_tile", "UNKNOWN")
            stac_id = gran.get("stac_id", "UNKNOWN")
            contributing_mgrs.append(mgrs_id)
            contributing_stac_ids.append(stac_id)
            if "datetime" in gran:
                acquisition_times.append(gran["datetime"])
            if "cloud_cover" in gran:
                cloud_covers.append(float(gran["cloud_cover"]))

            # Granule provided as in-memory array (used in unit tests and fixtures)
            if "data" in gran:
                src_data = gran["data"]  # (3, H, W) or (H, W, 3)
                if src_data.ndim == 3 and src_data.shape[2] == 3:
                    # HWC to CHW
                    src_chw = np.transpose(src_data, (2, 0, 1))
                else:
                    src_chw = src_data

                src_crs = gran["src_crs"]
                if isinstance(src_crs, int):
                    src_crs = CRS.from_epsg(src_crs)
                src_transform = gran["src_transform"]

                # Destination buffer for this granule
                gran_dst = np.zeros((3, tgt_h, tgt_w), dtype=np.uint8)

                reproject(
                    src_chw,
                    gran_dst,
                    src_transform=src_transform,
                    src_crs=src_crs,
                    dst_transform=target_transform,
                    dst_crs=target_crs,
                    resampling=Resampling.bilinear
                )

                # Identify valid pixels from this granule
                gran_valid = (gran_dst[0] > 0) | (gran_dst[1] > 0) | (gran_dst[2] > 0)

                # Composite into target raster (preserve existing or average overlap)
                target_chw = np.transpose(target_bgr, (2, 0, 1))
                overlap = valid_mask & gran_valid
                new_pixels = gran_valid & (~valid_mask)

                # Assign new pixels
                for b in range(3):
                    target_chw[b][new_pixels] = gran_dst[b][new_pixels]
                    # Blend overlap
                    if np.any(overlap):
                        target_chw[b][overlap] = ((target_chw[b][overlap].astype(np.uint16) + gran_dst[b][overlap].astype(np.uint16)) // 2).astype(np.uint8)

                target_bgr = np.transpose(target_chw, (1, 2, 0))
                valid_mask = valid_mask | gran_valid

            # Granule provided as COG URL
            elif "url" in gran:
                url = gran["url"]
                with rasterio.open(url) as src:
                    gran_dst = np.zeros((3, tgt_h, tgt_w), dtype=np.uint8)

                    # Compute window in source dataset corresponding to target bbox
                    min_lon, min_lat, max_lon, max_lat = transform_bounds(
                        target_crs, CRS.from_epsg(4326), *target_bbox_epsg7755
                    )
                    bounds_utm = transform_bounds(CRS.from_epsg(4326), src.crs, min_lon, min_lat, max_lon, max_lat)
                    win = win_from_bounds(*bounds_utm, transform=src.transform)

                    col_off = int(max(0, math.floor(win.col_off)))
                    row_off = int(max(0, math.floor(win.row_off)))
                    width = int(min(src.width - col_off, math.ceil(win.width)))
                    height = int(min(src.height - row_off, math.ceil(win.height)))

                    if width <= 0 or height <= 0:
                        continue

                    exact_win = rasterio.windows.Window(col_off, row_off, width, height)
                    src_rgb = src.read(window=exact_win)
                    win_transform = rasterio.windows.transform(exact_win, src.transform)

                    reproject(
                        src_rgb,
                        gran_dst,
                        src_transform=win_transform,
                        src_crs=src.crs,
                        dst_transform=target_transform,
                        dst_crs=target_crs,
                        resampling=Resampling.bilinear
                    )

                    gran_valid = (gran_dst[0] > 0) | (gran_dst[1] > 0) | (gran_dst[2] > 0)

                    # Convert RGB to BGR for target_bgr
                    gran_bgr_hwc = np.transpose(gran_dst[[2, 1, 0]], (1, 2, 0))

                    new_pixels = gran_valid & (~valid_mask)
                    overlap = valid_mask & gran_valid

                    target_bgr[new_pixels] = gran_bgr_hwc[new_pixels]
                    if np.any(overlap):
                        target_bgr[overlap] = ((target_bgr[overlap].astype(np.uint16) + gran_bgr_hwc[overlap].astype(np.uint16)) // 2).astype(np.uint8)

                    valid_mask = valid_mask | gran_valid

    # Compute coverage percentage
    valid_pixels = np.count_nonzero(valid_mask)
    total_pixels = tgt_h * tgt_w
    coverage_pct = round((valid_pixels / total_pixels) * 100.0, 2)

    metadata = {
        "target_crs": "EPSG:7755",
        "target_resolution_m": TARGET_RESOLUTION_M,
        "target_dimensions": [tgt_h, tgt_w],
        "contributing_mgrs_tiles": list(set(contributing_mgrs)),
        "contributing_stac_ids": contributing_stac_ids,
        "acquisition_timestamps": acquisition_times,
        "mean_cloud_cover_pct": round(float(np.mean(cloud_covers)), 2) if cloud_covers else 0.0,
        "valid_data_coverage_pct": coverage_pct,
        "is_mosaic": len(contributing_mgrs) > 1
    }

    if coverage_pct < min_valid_coverage_pct:
        raise InadequateSpatialOverlapError(
            f"Valid data coverage across canonical target grid is {coverage_pct:.1f}%, "
            f"which is below required threshold ({min_valid_coverage_pct:.1f}%). Observation marked incomplete."
        )

    return target_bgr, valid_mask, metadata
