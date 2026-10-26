"""
Forest Guard — Terrestrial Land Mask Engine
Rasterizes authoritative Maharashtra terrestrial boundaries onto canonical EPSG:7755
sector grids, strictly excluding open sea, tidal estuaries, and offshore waters
from image alignment, color normalization, differencing, and area measurement.
"""

import os
import json
import logging
from typing import List, Tuple, Optional, Dict, Any

import numpy as np
from shapely.geometry import shape, box, mapping, MultiPolygon, Polygon
from shapely.ops import unary_union
from shapely.strtree import STRtree
import rasterio.features
from rasterio.transform import from_bounds
from rasterio.warp import transform_geom
from rasterio.crs import CRS

logger = logging.getLogger("forestguard.data.land_mask")

DEFAULT_GEOJSON_REL_PATH = "data/gis/maharashtra_districts.geojson"
GRID_CRS_EPSG = 7755


class LandMaskEngine:
    """
    Computes and caches rasterized terrestrial land masks for 15 km x 15 km sectors
    in EPSG:7755 canonical coordinates.
    """

    def __init__(self, geojson_path: Optional[str] = None):
        if geojson_path:
            self.geojson_path = geojson_path
        else:
            repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
            self.geojson_path = os.path.join(repo_root, DEFAULT_GEOJSON_REL_PATH)


        self._geoms_7755: List[Any] = []
        self._tree: Optional[STRtree] = None
        self._mask_cache: Dict[str, Tuple[np.ndarray, float]] = {}
        self._initialized = False

    def _ensure_initialized(self):
        """Lazy loads and indexes district polygons in EPSG:7755."""
        if self._initialized:
            return

        if not os.path.exists(self.geojson_path):
            raise FileNotFoundError(f"Maharashtra GIS boundary not found: {self.geojson_path}")

        logger.info("Initializing LandMaskEngine from %s", self.geojson_path)
        with open(self.geojson_path, "r", encoding="utf-8") as f:
            fc = json.load(f)

        src_crs = CRS.from_epsg(4326)
        tgt_crs = CRS.from_epsg(GRID_CRS_EPSG)

        for feat in fc.get("features", []):
            g4326 = shape(feat["geometry"])
            if not g4326.is_valid:
                g4326 = g4326.buffer(0)
            g7755_dict = transform_geom(src_crs, tgt_crs, mapping(g4326))
            g7755 = shape(g7755_dict)
            if not g7755.is_valid:
                g7755 = g7755.buffer(0)
            self._geoms_7755.append(g7755)

        self._tree = STRtree(self._geoms_7755)
        self._initialized = True
        logger.info("Indexed %d district geometries in EPSG:7755", len(self._geoms_7755))

    def get_sector_land_mask(
        self,
        bbox_epsg7755: List[float],
        out_shape: Tuple[int, int] = (1500, 1500),
        cache_key: Optional[str] = None
    ) -> Tuple[np.ndarray, float]:
        """
        Rasterizes the authoritative terrestrial boundary onto the sector's canonical target grid.
        Returns:
            mask: np.ndarray (out_shape, uint8) where 255 = terrestrial land, 0 = sea / ocean / outside
            land_fraction: float (0.0 to 1.0) proportion of pixels covered by land
        """
        if cache_key and cache_key in self._mask_cache:
            return self._mask_cache[cache_key]

        self._ensure_initialized()
        assert self._tree is not None

        xmin, ymin, xmax, ymax = bbox_epsg7755
        tile_box = box(xmin, ymin, xmax, ymax)
        cell_area = tile_box.area

        # Query spatial index for intersecting district polygons
        matching_indices = self._tree.query(tile_box)
        if len(matching_indices) == 0:
            # Completely outside Maharashtra (e.g. open ocean)
            empty_mask = np.zeros(out_shape, dtype=np.uint8)
            res = (empty_mask, 0.0)
            if cache_key:
                self._mask_cache[cache_key] = res
            return res

        # Intersect matching geometries with tile bounding box
        matched_geoms = [self._geoms_7755[i] for i in matching_indices]
        union_geom = unary_union(matched_geoms)
        inter = union_geom.intersection(tile_box)

        if inter.is_empty:
            empty_mask = np.zeros(out_shape, dtype=np.uint8)
            res = (empty_mask, 0.0)
            if cache_key:
                self._mask_cache[cache_key] = res
            return res

        # Interior tile check: if intersection covers virtually 100% of cell area
        if inter.area >= 0.999 * cell_area:
            full_mask = np.full(out_shape, 255, dtype=np.uint8)
            res = (full_mask, 1.0)
            if cache_key:
                self._mask_cache[cache_key] = res
            return res

        # Coastal or boundary tile: rasterize intersection polygon onto canonical grid
        transform = from_bounds(xmin, ymin, xmax, ymax, out_shape[1], out_shape[0])
        rasterized = rasterio.features.rasterize(
            [inter],
            out_shape=out_shape,
            transform=transform,
            fill=0,
            default_value=255,
            dtype=np.uint8
        )

        land_pixels = int(np.count_nonzero(rasterized))
        total_pixels = out_shape[0] * out_shape[1]
        land_fraction = land_pixels / float(total_pixels)

        res = (rasterized, land_fraction)
        if cache_key:
            self._mask_cache[cache_key] = res
        return res
