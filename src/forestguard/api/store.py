import os
import json
import logging
from typing import List, Dict, Any, Optional

from forestguard.agent.models import InvestigationReport
from forestguard.data.fixtures import OfflineFixtureLoader
from forestguard.vision.detector import NonNDVIChangeDetector
from forestguard.agent.investigator import AutonomousInvestigator

logger = logging.getLogger("forestguard.api.store")

class IncidentStore:
    """
    In-memory and file-backed incident store.
    Pre-populates demonstration incidents from benchmark test fixtures
    while keeping them explicitly marked as synthetic simulations.
    """
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.incidents_file = os.path.join(data_dir, "incidents.json")
        self._incidents: Dict[str, InvestigationReport] = {}
        os.makedirs(data_dir, exist_ok=True)
        self._load()

    def _load(self):
        if os.path.exists(self.incidents_file):
            try:
                with open(self.incidents_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        report = InvestigationReport.model_validate(item)
                        self._incidents[report.incident_id] = report
                logger.info(f"Loaded {len(self._incidents)} incidents from store.")
            except Exception as e:
                logger.error(f"Error loading incidents from {self.incidents_file}: {e}")

    def save(self):
        try:
            with open(self.incidents_file, "w", encoding="utf-8") as f:
                json.dump([r.model_dump() for r in self._incidents.values()], f, indent=2)
        except Exception as e:
            logger.error(f"Error saving incidents to {self.incidents_file}: {e}")

    def get_all(
        self,
        event_category: Optional[str] = None,
        investigation_status: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> List[InvestigationReport]:
        results = list(self._incidents.values())
        
        if event_category:
            results = [r for r in results if r.event_category.lower() == event_category.lower()]
            
        if investigation_status:
            results = [r for r in results if r.investigation_status.lower() == investigation_status.lower()]
            
        if search_query:
            q = search_query.lower()
            results = [
                r for r in results
                if q in r.report_title.lower() or q in r.summary.lower() or q in r.incident_id.lower()
            ]
            
        # Sort by report date descending
        results.sort(key=lambda x: x.report_date, reverse=True)
        return results

    def get_by_id(self, incident_id: str) -> Optional[InvestigationReport]:
        return self._incidents.get(incident_id)

    def add_or_update(self, report: InvestigationReport):
        self._incidents[report.incident_id] = report
        self.save()

    def populate_fixtures_if_empty(self, fixtures_dir: str):
        """Populate demonstration incidents from fixtures if store is empty."""
        if self._incidents:
            return

        loader = OfflineFixtureLoader(fixtures_dir)
        detector = NonNDVIChangeDetector(significance_threshold_ha=0.5)
        investigator = AutonomousInvestigator()

        fixtures = loader.list_fixtures()
        for fix_name, meta in sorted(fixtures.items()):
            b, a, _ = loader.load_pair(fix_name)
            bbox = meta.get("bbox")
            dates = [meta.get("acquisition_date_before"), meta.get("acquisition_date_after")]
            site_name = meta.get("name")
            
            det_res = detector.detect_changes(b, a, geo_bbox=bbox, acquisition_dates=tuple(dates))
            for reg in det_res.candidate_regions:
                inc_id = f"INC-{fix_name[:14].upper()}-{reg.region_id:02d}"
                report = investigator.investigate(
                    incident_id=inc_id,
                    region=reg,
                    observation_dates=dates,
                    site_context={"name": site_name},
                    is_synthetic_test=True
                )
                self._incidents[inc_id] = report

        self.save()
        logger.info(f"Populated {len(self._incidents)} demonstration incidents.")
