#!/usr/bin/env python3
"""
Forest Guard — Automated 21-Day Monitoring Workflow Runner
Engineered for GitHub Actions and GitHub Pages deployment without any AWS dependencies.

Responsibilities:
1. Evaluates 21-day due-time guard based on durable version-controlled monitoring state.
2. Supports manual triggers (--force) to run immediately.
3. Retrieves genuine satellite observations (direct CDSE open API or open STAC/COG).
4. Runs OpenCV 5 non-NDVI change detector.
5. Dispatches autonomous Gemini/Tavily investigation for qualifying events (>= 1.0 ha).
6. Persists reports, compressed image crops, and aggregated incidents.json via GitReportStore.
7. Tracks state and history in monitoring_state.json.
8. Strictly separates genuine and synthetic records.
"""
import os
import sys
import json
import logging
import argparse
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("forestguard.workflow_runner")

# Load local .env credentials if present (ignored by git)
env_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env"))
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                if k in ("GEMINI_API_KEY", "GEMINI_MODEL", "TAVILY_API_KEY", "CDSE_CLIENT_ID", "CDSE_CLIENT_SECRET"):
                    os.environ.setdefault(k, v.strip().strip('"').strip("'"))

from forestguard.storage import GitReportStore
from forestguard.orchestrator import MonitoringOrchestrator


def get_default_sectors(repo_root: str) -> List[Dict[str, Any]]:
    """Return monitored sectors including genuine satellite datasets and CDSE areas."""
    genuine_rondonia_dir = os.path.join(repo_root, "data/genuine/sentinel2_rondonia_real")
    
    sectors = []
    # 1. Genuine Sentinel-2 verification sector (Orbitally acquired Level-2A TCI)
    if os.path.isdir(genuine_rondonia_dir):
        sectors.append({
            "sector_id": "SEC-GENUINE-S2-RONDONIA",
            "name": "Jamari Buffer, Rondônia (Genuine Sentinel-2 Acquisition)",
            "bbox": [-63.50, -9.28, -63.46, -9.24],
            "genuine_data_dir": genuine_rondonia_dir
        })

    # 2. Operational sectors for Copernicus CDSE queries
    sectors.extend([
        {
            "sector_id": "SEC-KOYNA-01",
            "name": "Koyna Wildlife Sanctuary Buffer, Satara (Western Ghats)",
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
        }
    ])
    return sectors


def run_pipeline(
    cadence_days: int = 21,
    force: bool = False,
    allow_synthetic: bool = False,
    check_only: bool = False,
    data_dir: Optional[str] = None,
    web_dir: Optional[str] = None
) -> int:
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    target_data_dir = data_dir or os.path.join(repo_root, "data/public")
    target_web_dir = web_dir or os.path.join(repo_root, "web/public/data")

    os.makedirs(target_data_dir, exist_ok=True)
    os.makedirs(target_web_dir, exist_ok=True)

    logger.info("=" * 70)
    logger.info("FOREST GUARD: GITHUB-NATIVE MONITORING WORKFLOW RUNNER")
    logger.info(f"Target Data Directory: {target_data_dir}")
    logger.info(f"Target Web Public Dir: {target_web_dir}")
    logger.info(f"Monitoring Cadence:    {cadence_days} days")
    logger.info(f"Force Run Override:    {force}")
    logger.info(f"Allow Synthetic Mode:  {allow_synthetic}")
    logger.info("=" * 70)

    store = GitReportStore(base_dir=target_data_dir, web_public_dir=target_web_dir)
    is_due, rationale = store.is_monitoring_due(cadence_days=cadence_days)
    logger.info(f"Due-Time Evaluation: {rationale}")

    if check_only:
        print(f"Status: {'DUE' if is_due else 'NOT_DUE'}")
        print(f"Rationale: {rationale}")
        return 0

    now_iso = datetime.now(timezone.utc).isoformat()
    state = store.get_monitoring_state()
    state["cadence_days"] = cadence_days
    state["last_attempt_timestamp"] = now_iso

    # Due-time guard check
    if not is_due and not force:
        logger.info("Monitoring cycle is not due yet. Recording scheduled check and exiting cleanly.")
        history_entry = {
            "timestamp": now_iso,
            "action": "scheduled_check",
            "status": "skipped_not_due",
            "rationale": rationale
        }
        state.setdefault("history", []).insert(0, history_entry)
        state["history"] = state["history"][:50] # Keep recent 50 entries
        store.save_monitoring_state(state)
        return 0

    # Execute Monitoring Cycle
    logger.info("Proceeding with full satellite monitoring and investigation cycle...")
    orchestrator = MonitoringOrchestrator(
        report_store=store,
        cadence_days=cadence_days,
        significance_threshold_ha=1.0,
        allow_synthetic_fallback=allow_synthetic
    )

    sectors = get_default_sectors(repo_root)
    summary = orchestrator.run_scheduled_monitoring_cycle(
        sectors=sectors,
        force_offline_fixtures=allow_synthetic
    )

    # Update state
    state["last_successful_run"] = now_iso
    state["total_runs_completed"] = state.get("total_runs_completed", 0) + 1
    state["last_run_summary"] = summary

    if summary["investigations_conducted_count"] > 0:
        state["last_run_status"] = "completed_changes_detected"
    elif summary["changes_detected_count"] == 0:
        state["last_run_status"] = "completed_no_qualifying_changes"
    else:
        state["last_run_status"] = "completed_below_threshold"

    history_entry = {
        "timestamp": now_iso,
        "action": "full_monitoring_cycle",
        "forced": force,
        "status": state["last_run_status"],
        "sectors_evaluated": summary["sectors_evaluated"],
        "changes_detected": summary["changes_detected_count"],
        "investigations_conducted": summary["investigations_conducted_count"],
        "reports_published": [r["incident_id"] for r in summary["reports_published"]],
        "failed_sectors": summary["failed_sectors"]
    }
    state.setdefault("history", []).insert(0, history_entry)
    state["history"] = state["history"][:50]
    store.save_monitoring_state(state)

    logger.info("=" * 70)
    logger.info(f"CYCLE COMPLETE: Status={state['last_run_status']}")
    logger.info(f"Changes Detected:        {summary['changes_detected_count']}")
    logger.info(f"Investigations Conducted: {summary['investigations_conducted_count']}")
    logger.info(f"Reports Published:       {len(summary['reports_published'])}")
    logger.info(f"Failed / Cloud Sectors:  {len(summary['failed_sectors'])}")
    logger.info("=" * 70)

    return 0


def main():
    parser = argparse.ArgumentParser(description="Forest Guard GitHub-Native 21-Day Workflow Runner")
    parser.add_argument("--cadence-days", type=int, default=21, help="Cadence interval in days (default: 21)")
    parser.add_argument("--force", action="store_true", help="Force run immediately (bypass due-time guard)")
    parser.add_argument("--allow-synthetic", action="store_true", help="Allow synthetic fallback fixtures (for testing only)")
    parser.add_argument("--check-only", action="store_true", help="Check if monitoring is due without running")
    parser.add_argument("--data-dir", type=str, default=None, help="Path to persistent data directory")
    parser.add_argument("--web-dir", type=str, default=None, help="Path to web public data directory")

    args = parser.parse_args()
    sys.exit(run_pipeline(
        cadence_days=args.cadence_days,
        force=args.force,
        allow_synthetic=args.allow_synthetic,
        check_only=args.check_only,
        data_dir=args.data_dir,
        web_dir=args.web_dir
    ))


if __name__ == "__main__":
    main()
