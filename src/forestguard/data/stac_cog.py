"""
Open STAC & Cloud-Optimized GeoTIFF (COG) Retrieval Client
Provides genuine Sentinel-2 Level-2A imagery retrieval via open AWS Open Data STAC
and HTTP range requests. Zero AWS credentials, zero paid infrastructure.
"""

import os
import math
import time
import json
import logging
import urllib.request
from typing import Dict, Any, List, Optional, Tuple

import numpy as np
import rasterio
from rasterio.windows import from_bounds
from rasterio.warp import transform_bounds
from rasterio.crs import CRS

logger = logging.getLogger("forestguard.data.stac_cog")

STAC_SEARCH_URL = "https://earth-search.aws.element84.com/v1/search"


class OpenSTACCogClient:
    """
    Open public data client querying Element84 Earth Search STAC
    and reading Sentinel-2 L2A TCI Cloud-Optimized GeoTIFFs over HTTP.
    """

    def __init__(self, search_url: str = STAC_SEARCH_URL, timeout_seconds: int = 25):
        self.search_url = search_url
        self.timeout_seconds = timeout_seconds

    def search_temporal_pair(
        self,
        bbox: List[float],
        max_cloud_cover_pct: float = 15.0,
        datetime_range: Optional[str] = None,
        lookback_days: int = 90,
        min_interval_days: int = 5,
        max_interval_days: int = 60
    ) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
        """
        Searches STAC for the latest genuine Sentinel-2 Level-2A observation pair
        relative to the current monitoring cycle, strictly on the SAME MGRS footprint.
        
        Policy:
        1. Defaults to searching recent observations (past lookback_days from run date).
        2. Filters for low cloud cover (< max_cloud_cover_pct).
        3. Groups candidate scenes by MGRS tile identifier to avoid cross-MGRS projection seams.
        4. Selects the most recent cloud-free observation as 'after'.
        5. Selects a compatible earlier observation on the same MGRS footprint (interval >= min_interval_days) as 'before'.
        6. Rejects same-calendar-date observations.
        """
        from datetime import datetime, timezone, timedelta

        if datetime_range is None:
            now = datetime.now(timezone.utc)
            start_dt = (now - timedelta(days=lookback_days)).strftime("%Y-%m-%dT00:00:00Z")
            end_dt = now.strftime("%Y-%m-%dT23:59:59Z")
            datetime_range = f"{start_dt}/{end_dt}"

        # Query up to 15 recent low-cloud scenes within the date window
        query = {
            "collections": ["sentinel-2-l2a"],
            "bbox": bbox,
            "datetime": datetime_range,
            "query": {
                "eo:cloud_cover": {"lt": max_cloud_cover_pct}
            },
            "sortby": [{"field": "properties.datetime", "direction": "desc"}],
            "limit": 15
        }

        try:
            req = urllib.request.Request(
                self.search_url,
                data=json.dumps(query).encode("utf-8"),
                headers={"Content-Type": "application/json", "User-Agent": "ForestGuard/1.0"}
            )
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                features = data.get("features", [])
        except Exception as e:
            logger.warning(f"STAC search request failed: {e}")
            return None

        if len(features) < 2:
            logger.info(f"Insufficient low-cloud STAC scenes found ({len(features)} found, min 2 needed).")
            return None

        # Group scenes by MGRS tile identifier to preserve identical spatial footprint
        by_mgrs: Dict[str, List[Dict[str, Any]]] = {}
        for f in features:
            f_id = f.get("id", "")
            parts = f_id.split("_")
            mgrs = parts[1] if len(parts) >= 2 and len(parts[1]) == 5 else "unknown"
            by_mgrs.setdefault(mgrs, []).append(f)

        # Select the MGRS group containing the latest observation
        sorted_mgrs = sorted(
            by_mgrs.keys(),
            key=lambda m: by_mgrs[m][0]["properties"]["datetime"],
            reverse=True
        )

        for mgrs in sorted_mgrs:
            mgrs_feats = by_mgrs[mgrs]
            if len(mgrs_feats) < 2:
                continue

            after_cand = mgrs_feats[0]
            after_date_str = after_cand["properties"]["datetime"][:10]
            try:
                dt_after = datetime.fromisoformat(after_cand["properties"]["datetime"].replace("Z", "+00:00"))
            except Exception:
                continue

            for before_cand in mgrs_feats[1:]:
                before_date_str = before_cand["properties"]["datetime"][:10]
                if before_date_str == after_date_str:
                    continue  # strictly reject same calendar date

                try:
                    dt_before = datetime.fromisoformat(before_cand["properties"]["datetime"].replace("Z", "+00:00"))
                except Exception:
                    continue

                diff_days = abs((dt_after - dt_before).days)
                if min_interval_days <= diff_days <= max_interval_days:
                    # Found valid compatible temporal pair on the same MGRS footprint
                    # Ensure chronological order (before, after)
                    if dt_before > dt_after:
                        before_cand, after_cand = after_cand, before_cand
                    return before_cand, after_cand

        logger.info("No compatible temporal pair meeting interval policy (5-60 days) on the same MGRS tile.")
        return None

    def fetch_window(self, feature: Dict[str, Any], bbox_4326: List[float]) -> Tuple[Optional[np.ndarray], float, int]:
        """
        Reads a 15 km x 15 km COG window via HTTP Range requests.
        Returns: (bgr_image, fetch_seconds, estimated_bytes)
        """
        assets = feature.get("assets", {})
        # S2 L2A visual band in Earth Search STAC is under 'visual' or 'thumbnail'
        tci_url = None
        for key in ["visual", "tci", "image", "visual-cog"]:
            if key in assets and "href" in assets[key]:
                tci_url = assets[key]["href"]
                break

        if not tci_url:
            logger.error(f"No suitable visual COG asset in feature {feature.get('id')}")
            return None, 0.0, 0

        t0 = time.time()
        env = rasterio.Env(
            GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
            CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
            VSI_CACHE=True,
            GDAL_HTTP_MERGE_CONSECUTIVE_RANGES=True
        )
        try:
            with env:
                with rasterio.open(tci_url) as src:
                    bounds_utm = transform_bounds(CRS.from_epsg(4326), src.crs, *bbox_4326)
                    win = from_bounds(*bounds_utm, transform=src.transform)
                    col_off = int(max(0, math.floor(win.col_off)))
                    row_off = int(max(0, math.floor(win.row_off)))
                    width = int(min(src.width - col_off, math.ceil(win.width)))
                    height = int(min(src.height - row_off, math.ceil(win.height)))

                    if width <= 0 or height <= 0:
                        logger.error(f"Calculated raster window dimension non-positive: {width}x{height}")
                        return None, 0.0, 0

                    exact_win = rasterio.windows.Window(col_off, row_off, width, height)
                    rgb = src.read(window=exact_win)
                    t_fetch = time.time() - t0

                    # Convert RGB (CHW) to BGR (HWC)
                    rgb_hwc = np.transpose(rgb, (1, 2, 0))
                    bgr = rgb_hwc[:, :, [2, 1, 0]]
                    estimated_bytes = int(width * height * 3 * 0.45)
                    return bgr, t_fetch, estimated_bytes
        except Exception as e:
            logger.error(f"Failed to fetch COG window from {tci_url}: {e}")
            return None, time.time() - t0, 0
