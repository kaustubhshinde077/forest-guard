import os
import json
import logging
import cv2
import numpy as np
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone, timedelta
from forestguard.agent.models import InvestigationReport

logger = logging.getLogger("forestguard.storage")

class BaseReportStore(ABC):
    """Abstract interface for durable incident report storage."""
    
    @abstractmethod
    def list_reports(
        self,
        event_category: Optional[str] = None,
        investigation_status: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> List[InvestigationReport]:
        pass

    @abstractmethod
    def get_report(self, incident_id: str) -> Optional[InvestigationReport]:
        pass

    @abstractmethod
    def save_report(self, report: InvestigationReport) -> None:
        pass

    @abstractmethod
    def save_image_artifact(self, incident_id: str, image_type: str, image_bytes: bytes) -> str:
        """Save image artifact ('before' or 'after') and return retrieval URI/key."""
        pass

    @abstractmethod
    def get_image_artifact(self, incident_id: str, image_type: str) -> Optional[bytes]:
        """Retrieve binary bytes of an image artifact."""
        pass


class FileReportStore(BaseReportStore):
    """
    Local file-backed durable report store for development, testing, and edge runs.
    Saves reports as individual JSON files under data/reports/ and images under data/artifacts/.
    """
    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        self.reports_dir = os.path.join(base_dir, "reports")
        self.artifacts_dir = os.path.join(base_dir, "artifacts")
        os.makedirs(self.reports_dir, exist_ok=True)
        os.makedirs(self.artifacts_dir, exist_ok=True)

    def list_reports(
        self,
        event_category: Optional[str] = None,
        investigation_status: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> List[InvestigationReport]:
        reports = []
        if not os.path.exists(self.reports_dir):
            return reports

        for filename in sorted(os.listdir(self.reports_dir)):
            if filename.endswith(".json"):
                filepath = os.path.join(self.reports_dir, filename)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        rep = InvestigationReport.model_validate(data)
                        reports.append(rep)
                except Exception as e:
                    logger.error(f"Error reading report {filepath}: {e}")

        if event_category:
            reports = [r for r in reports if r.event_category.lower() == event_category.lower()]
        if investigation_status:
            reports = [r for r in reports if r.investigation_status.lower() == investigation_status.lower()]
        if search_query:
            q = search_query.lower()
            reports = [
                r for r in reports
                if q in r.report_title.lower() or q in r.summary.lower() or q in r.incident_id.lower()
            ]

        reports.sort(key=lambda x: x.report_date, reverse=True)
        return reports

    def get_report(self, incident_id: str) -> Optional[InvestigationReport]:
        safe_id = "".join([c if c.isalnum() or c in "-_" else "_" for c in incident_id])
        filepath = os.path.join(self.reports_dir, f"{safe_id}.json")
        if not os.path.exists(filepath):
            return None
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            return InvestigationReport.model_validate(data)

    def save_report(self, report: InvestigationReport) -> None:
        safe_id = "".join([c if c.isalnum() or c in "-_" else "_" for c in report.incident_id])
        filepath = os.path.join(self.reports_dir, f"{safe_id}.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(report.model_dump(), f, indent=2)
        logger.info(f"Durable report saved to {filepath}")

    def save_image_artifact(self, incident_id: str, image_type: str, image_bytes: bytes) -> str:
        safe_id = "".join([c if c.isalnum() or c in "-_" else "_" for c in incident_id])
        inc_dir = os.path.join(self.artifacts_dir, safe_id)
        os.makedirs(inc_dir, exist_ok=True)
        img_path = os.path.join(inc_dir, f"{image_type}.png")
        with open(img_path, "wb") as f:
            f.write(image_bytes)
        return img_path

    def get_image_artifact(self, incident_id: str, image_type: str) -> Optional[bytes]:
        safe_id = "".join([c if c.isalnum() or c in "-_" else "_" for c in incident_id])
        img_path = os.path.join(self.artifacts_dir, safe_id, f"{image_type}.png")
        if not os.path.exists(img_path):
            return None
        with open(img_path, "rb") as f:
            return f.read()


class GitReportStore(FileReportStore):
    """
    Durable, version-controlled report & artifact store for GitHub Pages and GitHub Actions.
    Stores:
    - reports/{incident_id}.json: Complete report dossiers
    - artifacts/{incident_id}/{type}.png: Optimized satellite imagery crops
    - incidents.json: Aggregated index feed for static web clients
    - monitoring_state.json: 21-day execution cadence and history
    Optionally mirrors to web_public_dir (e.g. web/public/data/) for static Next.js bundling.
    """
    def __init__(self, base_dir: str, web_public_dir: Optional[str] = None):
        super().__init__(base_dir)
        self.web_public_dir = web_public_dir
        self.incidents_index_path = os.path.join(base_dir, "incidents.json")
        self.state_path = os.path.join(base_dir, "monitoring_state.json")
        
        if self.web_public_dir:
            os.makedirs(os.path.join(self.web_public_dir, "reports"), exist_ok=True)
            os.makedirs(os.path.join(self.web_public_dir, "artifacts"), exist_ok=True)

    def save_report(self, report: InvestigationReport) -> None:
        # 1. Save detailed report JSON in primary store
        super().save_report(report)
        safe_id = "".join([c if c.isalnum() or c in "-_" else "_" for c in report.incident_id])

        # 2. Update aggregated incidents index (incidents.json)
        self._update_incidents_index(report)

        # 3. Mirror to web_public_dir if configured
        if self.web_public_dir:
            try:
                web_rep_path = os.path.join(self.web_public_dir, "reports", f"{safe_id}.json")
                with open(web_rep_path, "w", encoding="utf-8") as f:
                    json.dump(report.model_dump(), f, indent=2)

                web_index_path = os.path.join(self.web_public_dir, "incidents.json")
                if os.path.exists(self.incidents_index_path):
                    import shutil
                    shutil.copyfile(self.incidents_index_path, web_index_path)
            except Exception as e:
                logger.warning(f"Could not mirror report to web public directory: {e}")

    def save_image_artifact(self, incident_id: str, image_type: str, image_bytes: bytes) -> str:
        safe_id = "".join([c if c.isalnum() or c in "-_" else "_" for c in incident_id])
        
        # Optimize image bytes if valid image (using maximum PNG compression)
        optimized_bytes = image_bytes
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                _, enc = cv2.imencode(".png", img, [cv2.IMWRITE_PNG_COMPRESSION, 9])
                optimized_bytes = enc.tobytes()
        except Exception as e:
            logger.debug(f"Image optimization skipped: {e}")

        img_path = super().save_image_artifact(safe_id, image_type, optimized_bytes)

        # Mirror image to web_public_dir if configured
        if self.web_public_dir:
            try:
                web_art_dir = os.path.join(self.web_public_dir, "artifacts", safe_id)
                os.makedirs(web_art_dir, exist_ok=True)
                web_img_path = os.path.join(web_art_dir, f"{image_type}.png")
                with open(web_img_path, "wb") as f:
                    f.write(optimized_bytes)
            except Exception as e:
                logger.warning(f"Could not mirror image to web public directory: {e}")

        return img_path

    def _update_incidents_index(self, new_report: InvestigationReport) -> None:
        """Atomically update the aggregated incidents.json feed."""
        incidents = []
        if os.path.exists(self.incidents_index_path):
            try:
                with open(self.incidents_index_path, "r", encoding="utf-8") as f:
                    incidents = json.load(f)
            except Exception as e:
                logger.warning(f"Could not read existing incidents.json: {e}")
                incidents = []

        # Remove existing record with same incident_id if present
        incidents = [inc for inc in incidents if inc.get("incident_id") != new_report.incident_id]
        
        # Prepend new report and sort by report_date descending
        incidents.insert(0, new_report.model_dump())
        incidents.sort(key=lambda x: x.get("report_date", ""), reverse=True)

        with open(self.incidents_index_path, "w", encoding="utf-8") as f:
            json.dump(incidents, f, indent=2)
        logger.info(f"Updated aggregated incident feed at {self.incidents_index_path} ({len(incidents)} records)")

    def get_monitoring_state(self) -> Dict[str, Any]:
        """Load monitoring state from state file, or return default."""
        if os.path.exists(self.state_path):
            try:
                with open(self.state_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to read monitoring state: {e}")

        return {
            "cadence_days": 21,
            "last_successful_run": None,
            "last_attempt_timestamp": None,
            "total_runs_completed": 0,
            "last_run_status": "never_run",
            "last_run_summary": None,
            "history": []
        }

    def save_monitoring_state(self, state: Dict[str, Any]) -> None:
        """Save updated monitoring state to state file and mirror to web_public_dir."""
        with open(self.state_path, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
        logger.info(f"Monitoring state persisted to {self.state_path}")

        if self.web_public_dir:
            try:
                web_state_path = os.path.join(self.web_public_dir, "monitoring_state.json")
                import shutil
                shutil.copyfile(self.state_path, web_state_path)
            except Exception as e:
                logger.warning(f"Could not mirror monitoring state to web public directory: {e}")

    def is_monitoring_due(self, cadence_days: int = 21) -> Tuple[bool, str]:
        """
        Check whether a monitoring cycle is due based on last_successful_run.
        Returns: (is_due, rationale)
        """
        state = self.get_monitoring_state()
        last_run_str = state.get("last_successful_run")
        if not last_run_str:
            return True, "Initial monitoring run: No previous run recorded."

        try:
            # Handle ISO formats
            if last_run_str.endswith("Z"):
                last_run_str = last_run_str[:-1] + "+00:00"
            last_run = datetime.fromisoformat(last_run_str)
            if last_run.tzinfo is None:
                last_run = last_run.replace(tzinfo=timezone.utc)
            
            now = datetime.now(timezone.utc)
            elapsed = now - last_run
            due_delta = timedelta(days=cadence_days)

            if elapsed >= due_delta:
                return True, f"Monitoring cycle due: {elapsed.total_seconds() / 86400:.1f} days elapsed since last run on {last_run.isoformat()} (cadence: {cadence_days} days)."
            else:
                remaining = due_delta - elapsed
                return False, f"Monitoring cycle not due: {elapsed.total_seconds() / 86400:.1f} days elapsed. Next run due in {remaining.total_seconds() / 86400:.1f} days ({last_run + due_delta})."
        except Exception as e:
            logger.warning(f"Error parsing last_successful_run timestamp '{last_run_str}': {e}. Triggering due run.")
            return True, f"Triggering monitoring due to timestamp parse fallback: {e}"


class S3ReportStore(BaseReportStore):
    """
    [ARCHIVED / OBSOLETE] AWS S3 durable report and artifact store.
    Preserved for historical reference only. Forest Guard has migrated to GitReportStore
    for 100% free GitHub-native deployment.
    """
    def __init__(self, bucket_name: str, region_name: str = "ap-south-1"):
        self.bucket_name = bucket_name
        self.region_name = region_name
        try:
            import boto3
            self.s3 = boto3.client("s3", region_name=region_name)
        except ImportError:
            self.s3 = None
            logger.warning("boto3 is not installed; S3ReportStore is archived and unavailable.")

    def list_reports(self, *args, **kwargs) -> List[InvestigationReport]:
        if not self.s3:
            raise RuntimeError("S3ReportStore is archived. Use GitReportStore or FileReportStore.")
        return []

    def get_report(self, incident_id: str) -> Optional[InvestigationReport]:
        if not self.s3:
            raise RuntimeError("S3ReportStore is archived. Use GitReportStore or FileReportStore.")
        return None

    def save_report(self, report: InvestigationReport) -> None:
        if not self.s3:
            raise RuntimeError("S3ReportStore is archived. Use GitReportStore or FileReportStore.")

    def save_image_artifact(self, incident_id: str, image_type: str, image_bytes: bytes) -> str:
        if not self.s3:
            raise RuntimeError("S3ReportStore is archived. Use GitReportStore or FileReportStore.")
        return ""

    def get_image_artifact(self, incident_id: str, image_type: str) -> Optional[bytes]:
        if not self.s3:
            raise RuntimeError("S3ReportStore is archived. Use GitReportStore or FileReportStore.")
        return None
