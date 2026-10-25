import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from forestguard.agent.models import InvestigationReport
from forestguard.storage import BaseReportStore, FileReportStore, S3ReportStore

app = FastAPI(
    title="Forest Guard API",
    description="Autonomous Forest Change Detection & Investigation Platform REST API",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data"))
env_data_dir = os.getenv("FORESTGUARD_DATA_DIR")
if env_data_dir and os.path.exists(env_data_dir):
    DATA_DIR = os.path.abspath(env_data_dir)
else:
    DATA_DIR = DEFAULT_DATA_DIR

env_fixtures_dir = os.getenv("FORESTGUARD_FIXTURES_DIR")
if env_fixtures_dir and os.path.exists(env_fixtures_dir):
    FIXTURES_DIR = os.path.abspath(env_fixtures_dir)
else:
    FIXTURES_DIR = os.path.join(DATA_DIR, "fixtures")

store: BaseReportStore = FileReportStore(base_dir=DATA_DIR)
# If store has no reports, populate from bundled data/incidents.json
existing = store.list_reports()
if not existing:
    inc_json = os.path.join(DATA_DIR, "incidents.json")
    if os.path.exists(inc_json):
        import json
        with open(inc_json, "r", encoding="utf-8") as f:
            records = json.load(f)
            for rec in records:
                rep = InvestigationReport.model_validate(rec)
                store.save_report(rep)

def set_store(new_store: BaseReportStore):
    """Override active report store (e.g. for testing)."""
    global store
    store = new_store

class SystemStatusResponse(BaseModel):
    status: str
    version: str
    storage_type: str
    total_incidents_recorded: int
    live_copernicus_configured: bool
    live_gemini_configured: bool
    live_tavily_configured: bool
    notice: str

@app.get("/api/status", response_model=SystemStatusResponse)
def get_system_status():
    cdse_ready = bool(os.getenv("CDSE_CLIENT_ID") and os.getenv("CDSE_CLIENT_ID") != "your_cdse_client_id_here")
    gemini_ready = bool(os.getenv("GEMINI_API_KEY") and os.getenv("GEMINI_API_KEY") != "your_gemini_api_key_here")
    tavily_ready = bool(os.getenv("TAVILY_API_KEY") and os.getenv("TAVILY_API_KEY") != "your_tavily_api_key_here")

    storage_type = "git_public_store" if hasattr(store, "incidents_index_path") else "local_file_store"
    incidents = store.list_reports()

    return SystemStatusResponse(
        status="operational",
        version="1.1.0",
        storage_type=storage_type,
        total_incidents_recorded=len(incidents),
        live_copernicus_configured=cdse_ready,
        live_gemini_configured=gemini_ready,
        live_tavily_configured=tavily_ready,
        notice="Synthetic test incidents are clearly labeled with '[SYNTHETIC TEST]'."
    )

@app.get("/api/incidents", response_model=List[InvestigationReport])
def list_incidents(
    category: Optional[str] = Query(None, description="Filter by event category: 'forest_loss' or 'forest_recovery'"),
    status: Optional[str] = Query(None, description="Filter by investigation status"),
    search: Optional[str] = Query(None, description="Search query matching title or summary")
):
    """Retrieve list of incident reports from durable storage with optional filters."""
    return store.list_reports(event_category=category, investigation_status=status, search_query=search)

@app.get("/api/incidents/{incident_id}", response_model=InvestigationReport)
def get_incident(incident_id: str):
    """Retrieve complete dossier for an individual incident from durable storage."""
    incident = store.get_report(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    return incident

@app.get("/api/fixtures/{fixture_name}/image/{image_type}")
def get_fixture_image(fixture_name: str, image_type: str):
    """Serve before/after imagery for an incident site."""
    if image_type not in ["before", "after"]:
        raise HTTPException(status_code=400, detail="image_type must be 'before' or 'after'")

    pair_dir = os.path.join(FIXTURES_DIR, fixture_name)
    img_path = os.path.join(pair_dir, f"{image_type}.png")

    if not os.path.exists(img_path):
        raise HTTPException(status_code=404, detail=f"Image not found at {img_path}")

    return FileResponse(img_path, media_type="image/png")

@app.get("/api/incidents/{incident_id}/artifacts/{image_type}")
def get_incident_artifact(incident_id: str, image_type: str):
    """Retrieve binary PNG image artifact ('before' or 'after') from durable storage."""
    if image_type not in ["before", "after"]:
        raise HTTPException(status_code=400, detail="image_type must be 'before' or 'after'")

    raw_bytes = store.get_image_artifact(incident_id, image_type)
    if not raw_bytes:
        raise HTTPException(status_code=404, detail=f"Artifact '{image_type}' for '{incident_id}' not found.")

    return Response(content=raw_bytes, media_type="image/png")

@app.get("/api/incidents/{incident_id}/image/{image_type}")
def get_incident_image(incident_id: str, image_type: str):
    """Alias for get_incident_artifact."""
    return get_incident_artifact(incident_id, image_type)

# Handler entrypoint for AWS Lambda via Mangum
try:
    from mangum import Mangum
    handler = Mangum(app)
except ImportError:
    handler = None
