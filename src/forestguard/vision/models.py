from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class DetectedRegion(BaseModel):
    region_id: int
    change_type: str = Field(description="'forest_loss_candidate', 'forest_recovery_candidate', or 'ambiguous_change'")
    area_pixels: int
    area_hectares: float
    uncertainty_hectares: float
    bounding_box_pixels: List[int] = Field(description="[x, y, width, height]")
    centroid_pixels: List[float] = Field(description="[center_x, center_y]")
    estimated_geo_centroid: Optional[List[float]] = Field(default=None, description="[longitude, latitude]")
    estimated_geo_bbox: Optional[List[float]] = Field(default=None, description="[min_lon, min_lat, max_lon, max_lat]")
    aspect_ratio: float = Field(description="Major axis / minor axis length")
    perimeter_pixels: float
    compactness: float = Field(description="4 * pi * Area / (Perimeter^2) -> 1.0 is circle, << 1.0 is corridor/elongated")
    geometry_classification: str = Field(description="'linear_corridor', 'compact_block', 'irregular_patch', or 'diffuse_noise'")
    mean_texture_variance_before: float
    mean_texture_variance_after: float
    texture_variance_delta: float
    mean_luminance_delta: float
    heuristic_score: float = Field(default=0.0, description="Uncalibrated heuristic score (0.0 to 1.0) combining cluster size, geometry, and texture contrast. Not a calibrated statistical probability.")
    confidence_score: float = Field(description="Legacy alias for heuristic_score. Uncalibrated score, not a probability.")
    detection_caveats: List[str] = Field(default_factory=list)

class DetectionResult(BaseModel):
    status: str
    alignment_method: str
    alignment_metric_name: str = Field(default="mean_hamming_descriptor_distance", description="Name of the geometric alignment metric")
    alignment_metric_value: float = Field(default=0.0, description="Measured alignment metric value")
    alignment_metric_unit: str = Field(default="bits (0-256)", description="Units for the alignment metric")
    alignment_error: float = Field(default=0.0, description="Deprecated alias for alignment_metric_value")
    quality_warnings: List[str] = Field(default_factory=list)
    cloud_shadow_mask_coverage_pct: float
    candidate_regions: List[DetectedRegion] = Field(default_factory=list)
    total_candidate_loss_ha: float = 0.0
    total_candidate_recovery_ha: float = 0.0
    metadata_summary: Dict[str, Any] = Field(default_factory=dict)
