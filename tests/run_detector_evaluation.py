import os
import json
from forestguard.data.fixtures import OfflineFixtureLoader
from forestguard.vision.detector import NonNDVIChangeDetector

def main():
    fixtures_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/fixtures"))
    loader = OfflineFixtureLoader(fixtures_dir)
    fixtures = loader.list_fixtures()
    detector = NonNDVIChangeDetector(min_area_pixels=20, resolution_m_per_pixel=10.0, significance_threshold_ha=0.5)

    print("=" * 85)
    print("FOREST GUARD — OPENCV 5 NON-NDVI DETECTOR EVALUATION REPORT")
    print("=" * 85)

    results = {}

    for fixture_name in sorted(fixtures.keys()):
        print(f"\nEvaluating fixture: {fixture_name}")
        img_before, img_after, meta = loader.load_pair(fixture_name)
        bbox = meta.get("bbox")
        dates = (meta.get("acquisition_date_before"), meta.get("acquisition_date_after"))
        gt = meta.get("documented_ground_truth", {})

        det_res = detector.detect_changes(img_before, img_after, geo_bbox=bbox, acquisition_dates=dates)

        print(f"  Alignment: {det_res.alignment_method} (Metric: {det_res.alignment_error:.4f})")
        print(f"  Cloud/Shadow Masked: {det_res.cloud_shadow_mask_coverage_pct:.2f}%")
        print(f"  Quality Warnings: {det_res.quality_warnings}")
        print(f"  Detected Status: {det_res.status}")
        print(f"  Candidate Regions Detected: {len(det_res.candidate_regions)}")
        print(f"  Total Loss Ha: {det_res.total_candidate_loss_ha} ha (Ground Truth Target: {gt.get('expected_area_ha')} ha)")
        print(f"  Total Recovery Ha: {det_res.total_candidate_recovery_ha} ha")

        for reg in det_res.candidate_regions:
            print(f"    -> Region {reg.region_id}: Type={reg.change_type}, Area={reg.area_hectares}ha (+/-{reg.uncertainty_hectares}), "
                  f"Geom={reg.geometry_classification} (Aspect={reg.aspect_ratio}, Compact={reg.compactness}), "
                  f"Conf={reg.confidence_score}, GeoCentroid={reg.estimated_geo_centroid}")

        results[fixture_name] = {
            "status": det_res.status,
            "detected_loss_ha": det_res.total_candidate_loss_ha,
            "detected_recovery_ha": det_res.total_candidate_recovery_ha,
            "ground_truth_target_ha": gt.get("expected_area_ha"),
            "ground_truth_type": gt.get("event_type"),
            "regions_count": len(det_res.candidate_regions),
            "cloud_mask_pct": det_res.cloud_shadow_mask_coverage_pct
        }

    print("\n" + "=" * 85)
    print("EVALUATION SUMMARY TABLE:")
    print("=" * 85)
    print(f"{'Fixture Name':<42} | {'Target Type':<20} | {'Expected Ha':<11} | {'Measured Ha':<11} | {'Status'}")
    print("-" * 105)
    for name, r in results.items():
        meas = r['detected_loss_ha'] if 'loss' in r['ground_truth_type'] else r['detected_recovery_ha']
        print(f"{name:<42} | {r['ground_truth_type']:<20} | {str(r['ground_truth_target_ha']):<11} | {str(meas):<11} | {r['status']}")

if __name__ == "__main__":
    main()
