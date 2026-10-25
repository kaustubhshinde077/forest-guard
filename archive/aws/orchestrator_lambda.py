import os
import json
import logging
from forestguard.storage import S3ReportStore, FileReportStore
from forestguard.orchestrator import MonitoringOrchestrator

logger = logging.getLogger("forestguard.orchestrator.lambda")

def handler(event, context):
    """
    AWS Lambda handler invoked by Amazon EventBridge every 21 days (or manually via test event).
    Executes a complete monitoring, detection, investigation, and publication cycle.
    """
    s3_bucket = os.getenv("FORESTGUARD_S3_BUCKET")
    cadence_days = int(os.getenv("CADENCE_DAYS", "21"))
    significance_ha = float(os.getenv("SIGNIFICANCE_THRESHOLD_HA", "1.0"))

    if s3_bucket:
        store = S3ReportStore(bucket_name=s3_bucket)
    else:
        data_dir = os.getenv("FORESTGUARD_DATA_DIR", "/tmp/forestguard_data")
        store = FileReportStore(base_dir=data_dir)

    orchestrator = MonitoringOrchestrator(
        report_store=store,
        cadence_days=cadence_days,
        significance_threshold_ha=significance_ha
    )

    # Allow event payload to override settings or force offline test mode
    force_offline = event.get("force_offline_fixtures", False)
    summary = orchestrator.run_scheduled_monitoring_cycle(force_offline_fixtures=force_offline)

    return {
        "statusCode": 200,
        "body": json.dumps(summary)
    }
