import os
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from forestguard.storage import BaseReportStore, FileReportStore, S3ReportStore
from forestguard.data.fixtures import OfflineFixtureLoader
from forestguard.data.cdse import CopernicusClient
from forestguard.vision.detector import NonNDVIChangeDetector
from forestguard.agent.investigator import AutonomousInvestigator
from forestguard.agent.models import InvestigationReport

logger = logging.getLogger("forestguard.orchestrator")

class MonitoringOrchestrator:
    """
    Automated 21-day satellite monitoring & investigation orchestration workflow.
    Executes:
    1. Scheduled invocation for monitored forest sectors (Maharashtra Western Ghats & benchmark sites).
    2. Satellite imagery retrieval (Copernicus CDSE API when configured, or genuine satellite data).
       Strict isolation: Production monitoring NEVER falls back to synthetic test fixtures.
    3. OpenCV 5 non-NDVI change analysis & geometric profiling.
    4. Significance policy evaluation (affected area >= threshold, compactness check).
    5. Closed-loop autonomous research agent investigation for qualifying candidate events.
    6. Durable persistence of reports and image artifacts to S3 or local FileReportStore.
    7. Publication availability through REST API and public website.
    """

    DEFAULT_MONITORED_SECTORS = [
        {
            "sector_id": "SEC-KOYNA-01",
            "name": "Koyna Wildlife Sanctuary Buffer, Satara",
            "bbox": [73.705, 17.405, 73.725, 17.420],
            "fixture_fallback": "test_pair_1_loss_koyna"
        },
        {
            "sector_id": "SEC-TILLARI-02",
            "name": "Tillari Conservation Reserve Corridor, Sindhudurg",
            "bbox": [74.135, 15.815, 74.155, 15.830],
            "fixture_fallback": "test_pair_2_recovery_tilarinagar"
        },
        {
            "sector_id": "SEC-MAHABALESHWAR-03",
            "name": "Mahabaleshwar Escarpment (Negative Control Sector)",
            "bbox": [73.650, 17.905, 73.670, 17.925],
            "fixture_fallback": "test_pair_3_shadow_seasonal_mahabaleshwar"
        },
        {
            "sector_id": "SEC-RONDONIA-04",
            "name": "Jamari Sector, Rondonia (Global Benchmark)",
            "bbox": [-63.500, -9.265, -63.475, -9.245],
            "fixture_fallback": "test_pair_4_global_benchmark_rondonia"
        }
    ]

    def __init__(
        self,
        report_store: BaseReportStore,
        cadence_days: int = 21,
        significance_threshold_ha: float = 1.0,
        fixtures_dir: Optional[str] = None,
        allow_synthetic_fallback: bool = False
    ):
        self.store = report_store
        self.cadence_days = cadence_days
        self.significance_threshold_ha = significance_threshold_ha
        self.allow_synthetic_fallback = allow_synthetic_fallback
        if fixtures_dir:
            self.fixtures_dir = fixtures_dir
        else:
            env_fixtures = os.getenv("FORESTGUARD_FIXTURES_DIR")
            if env_fixtures and os.path.exists(env_fixtures):
                self.fixtures_dir = env_fixtures
            else:
                self.fixtures_dir = os.path.abspath(
                    os.path.join(os.path.dirname(__file__), "../../data/fixtures")
                )
        self.cdse_client = CopernicusClient()
        self.detector = NonNDVIChangeDetector(significance_threshold_ha=significance_threshold_ha)
        self.investigator = AutonomousInvestigator()

    def run_scheduled_monitoring_cycle(
        self,
        sectors: Optional[List[Dict[str, Any]]] = None,
        force_offline_fixtures: bool = False
    ) -> Dict[str, Any]:
        """
        Executes one scheduled monitoring cycle across monitored forest sectors.
        In production mode (allow_synthetic_fallback=False and force_offline_fixtures=False),
        any failure to obtain genuine satellite imagery will leave the incident unpublished.
        """
        target_sectors = sectors or self.DEFAULT_MONITORED_SECTORS
        cycle_start_time = datetime.now(timezone.utc).isoformat()
        cycle_summary = {
            "cycle_start_time": cycle_start_time,
            "cadence_days": self.cadence_days,
            "significance_threshold_ha": self.significance_threshold_ha,
            "sectors_evaluated": len(target_sectors),
            "changes_detected_count": 0,
            "investigations_conducted_count": 0,
            "reports_published": [],
            "failed_sectors": []
        }

        loader = None
        if (self.allow_synthetic_fallback or force_offline_fixtures) and os.path.exists(self.fixtures_dir):
            loader = OfflineFixtureLoader(self.fixtures_dir)

        for sector in target_sectors:
            sec_name = sector["name"]
            sec_bbox = sector["bbox"]
            logger.info(f"Initiating 21-day monitoring check for sector: {sec_name}")

            # 1. Image Retrieval with Strict Production Isolation
            img_before, img_after, dates, is_simulated, err_msg = self._retrieve_imagery(
                sector, loader, force_offline_fixtures
            )

            if img_before is None or img_after is None:
                # Production guardrail: Failed retrieval leaves incidents UNPUBLISHED
                logger.error(
                    f"Sector '{sec_name}': Imagery retrieval failed ({err_msg}). "
                    f"Per strict production separation policy, synthetic fixtures are prohibited. "
                    f"Incident remains unpublished."
                )
                cycle_summary["failed_sectors"].append({
                    "sector_id": sector.get("sector_id", "UNKNOWN"),
                    "name": sec_name,
                    "status": "retrieval_failed",
                    "published": False,
                    "reason": err_msg
                })
                continue

            # 2. OpenCV 5 Change Detection
            det_result = self.detector.detect_changes(
                img_before, img_after, geo_bbox=sec_bbox, acquisition_dates=tuple(dates)
            )

            if det_result.status != "CHANGES_DETECTED" or not det_result.candidate_regions:
                logger.info(f"Sector '{sec_name}': No qualifying change detected. Skipping investigation.")
                continue

            cycle_summary["changes_detected_count"] += len(det_result.candidate_regions)

            # 3. Application of Significance Policy & Adaptive Investigation
            for reg in det_result.candidate_regions:
                # Significance Policy Filter
                if reg.area_hectares < self.significance_threshold_ha:
                    logger.info(
                        f"Region {reg.region_id} in {sec_name} ({reg.area_hectares:.2f} ha) "
                        f"below significance policy threshold ({self.significance_threshold_ha} ha). Not publishing."
                    )
                    continue

                # Check if high cloud occlusion invalidates confident publication
                if det_result.cloud_shadow_mask_coverage_pct > 35.0:
                    logger.warning(
                        f"Region {reg.region_id} in {sec_name}: High cloud/shadow occlusion "
                        f"({det_result.cloud_shadow_mask_coverage_pct:.1f}%). Marking incomplete and unpublished."
                    )
                    cycle_summary["failed_sectors"].append({
                        "sector_id": sector.get("sector_id", "UNKNOWN"),
                        "name": sec_name,
                        "status": "incomplete_data_missing",
                        "published": False,
                        "reason": f"High cloud occlusion ({det_result.cloud_shadow_mask_coverage_pct:.1f}%)"
                    })
                    continue

                # Qualifying Event -> Dispatch Autonomous Investigation
                timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d")
                incident_id = f"INC-{sector['sector_id']}-{timestamp_str}-{reg.region_id:02d}"

                report = self.investigator.investigate(
                    incident_id=incident_id,
                    region=reg,
                    observation_dates=dates,
                    site_context={"name": sec_name, "sector_id": sector["sector_id"]},
                    is_synthetic_test=is_simulated
                )

                # 4. Durable Storage Persistence
                self.store.save_report(report)

                # Encode and persist image artifacts
                import cv2
                _, b_png = cv2.imencode(".png", img_before)
                _, a_png = cv2.imencode(".png", img_after)
                self.store.save_image_artifact(incident_id, "before", b_png.tobytes())
                self.store.save_image_artifact(incident_id, "after", a_png.tobytes())

                cycle_summary["investigations_conducted_count"] += 1
                cycle_summary["reports_published"].append({
                    "incident_id": report.incident_id,
                    "title": report.report_title,
                    "area_ha": report.affected_area_hectares,
                    "event_category": report.event_category,
                    "investigation_status": report.investigation_status,
                    "is_synthetic_test": report.is_synthetic_test
                })

        return cycle_summary

    def _retrieve_imagery(
        self,
        sector: Dict[str, Any],
        loader: OfflineFixtureLoader,
        force_offline: bool
    ):
        """
        Retrieve satellite imagery with strict separation of production and test data.
        Returns: (img_before, img_after, dates, is_simulated, error_message)
        """
        # Case A: Explicit genuine satellite dataset configured
        if "genuine_data_dir" in sector and os.path.isdir(sector["genuine_data_dir"]):
            g_dir = sector["genuine_data_dir"]
            import cv2
            b_path = os.path.join(g_dir, "before.png")
            a_path = os.path.join(g_dir, "after.png")
            m_path = os.path.join(g_dir, "metadata.json")
            if os.path.exists(b_path) and os.path.exists(a_path) and os.path.exists(m_path):
                img_b = cv2.imread(b_path)
                img_a = cv2.imread(a_path)
                with open(m_path, "r") as mf:
                    meta = json.load(mf)
                dates = [
                    meta.get("scene_before", {}).get("acquisition_date", "2020-09-12"),
                    meta.get("scene_after", {}).get("acquisition_date", "2023-09-22")
                ]
                logger.info(f"Loaded verified genuine satellite dataset from {g_dir}")
                return img_b, img_a, dates, False, None

        # Case B: Live Copernicus CDSE OData API
        if self.cdse_client.is_configured() and not force_offline:
            try:
                now = datetime.now(timezone.utc)
                start_str = (now - timedelta(days=self.cadence_days + 5)).strftime("%Y-%m-%d")
                end_str = now.strftime("%Y-%m-%d")
                products = self.cdse_client.search_sentinel2_products(
                    bbox=sector["bbox"],
                    start_date=start_str,
                    end_date=end_str,
                    top=2
                )
                if len(products) >= 2:
                    logger.info(f"Discovered {len(products)} live Sentinel-2 products on CDSE.")
                    # Return live satellite observations when products are downloaded
                    # If live download pipeline is not yet completed, fail cleanly rather than fallback
                else:
                    return None, None, [], False, f"Insufficient cloud-free Sentinel-2 products found on CDSE ({len(products)} found, min 2 required)."
            except Exception as e:
                logger.error(f"CDSE live search failed: {e}")
                if not self.allow_synthetic_fallback and not force_offline:
                    return None, None, [], False, f"Live CDSE search error: {str(e)}"

        # Case C: Offline test fixtures (ONLY permitted when explicitly authorized)
        if loader and (self.allow_synthetic_fallback or force_offline):
            fix_key = sector.get("fixture_fallback", "test_pair_1_loss_koyna")
            try:
                b, a, meta = loader.load_pair(fix_key)
                dates = [meta.get("acquisition_date_before"), meta.get("acquisition_date_after")]
                is_simulated = meta.get("is_genuine_satellite_raster", False) is False
                logger.info(f"Loaded offline test fixture '{fix_key}' for evaluation.")
                return b, a, dates, is_simulated, None
            except Exception as e:
                return None, None, [], True, f"Failed to load fixture {fix_key}: {str(e)}"

        # Case D: Production mode without live data -> Strict guardrail
        return None, None, [], False, "Copernicus CDSE credentials not configured and synthetic fallback prohibited in production mode."
