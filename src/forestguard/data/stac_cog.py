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
        datetime_range: str = "2023-01-01T00:00:00Z/2023-05-31T23:59:59Z",
        days_interval: int = 21
    ) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
        """
        Searches STAC for two distinct genuine Sentinel-2 Level-2A observations
        with different calendar dates and low cloud cover.
        Returns: (feature_before, feature_after) or None.
        """
        # Query up to 10 recent low-cloud scenes within datetime partition
        query = {
            "collections": ["sentinel-2-l2a"],
            "bbox": bbox,
            "datetime": datetime_range,
            "query": {
                "eo:cloud_cover": {"lt": max_cloud_cover_pct}
            },
            "sortby": [{"field": "properties.datetime", "direction": "desc"}],
            "limit": 10
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

        # Select two features with strictly different calendar dates (avoid same-date adjacent MGRS)
        after_feat = features[0]
        after_date = after_feat["properties"]["datetime"][:10]

        before_feat = None
        for cand in features[1:]:
            cand_date = cand["properties"]["datetime"][:10]
            if cand_date != after_date:
                before_feat = cand
                break

        if before_feat is None:
            logger.warning("All available STAC scenes share the same calendar date. Rejecting as temporal pair.")
            return None

        # Return chronological order (before, after)
        dt_b = before_feat["properties"]["datetime"]
        dt_a = after_feat["properties"]["datetime"]
        if dt_b > dt_a:
            before_feat, after_feat = after_feat, before_feat

        return before_feat, after_feat

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
