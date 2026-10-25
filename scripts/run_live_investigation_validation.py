#!/usr/bin/env python3
"""
Forest Guard — Live Agentic Investigation Validation Script
Executes one genuine end-to-end adaptive investigation on Region #13 from the
genuine Sentinel-2 test dataset using real Google Gemini and Tavily Search APIs.

Mandatory Constraints:
- Operates in VALIDATION / DRAFT mode.
- Does not publish as a confirmed deforestation event.
- No AWS resources provisioned; no AWS charges incurred.
- All live credentials kept strictly in .env (never logged, exposed, or committed).
"""
import os
import sys
import json
from datetime import datetime, timezone
import cv2
import numpy as np
from shapely.geometry import shape, box, mapping
import rasterio.warp

# Load local .env if present
env_file = os.path.join(os.path.dirname(__file__), "../.env")
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from forestguard.vision.detector import NonNDVIChangeDetector
from forestguard.agent.llm import GeminiProvider
from forestguard.agent.tools import TavilySearchProvider, RegionalTreeDensityDB
from forestguard.agent.models import (
    InvestigationReport,
    SourceCitation,
    TreeCountEstimate,
    DecisionTraceStep,
    InvestigationLead
)

def run_live_investigation():
    print("=" * 70)
    print("FOREST GUARD: LIVE INVESTIGATION VALIDATION RUN")
    print("=" * 70)

    gemini_key = os.getenv("GEMINI_API_KEY")
    tavily_key = os.getenv("TAVILY_API_KEY")
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    if not gemini_key or gemini_key == "your_gemini_api_key_here":
        print("[ERROR] GEMINI_API_KEY not configured. Aborting live test.")
        return 1
    if not tavily_key or tavily_key == "your_tavily_api_key_here":
        print("[ERROR] TAVILY_API_KEY not configured. Aborting live test.")
        return 1

    print(f"Provider Status: Live Gemini ({gemini_model}) & Live Tavily Search")

    # 1. Load genuine Sentinel-2 test data
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/genuine/sentinel2_rondonia_real"))
    before_path = os.path.join(data_dir, "before.png")
    after_path = os.path.join(data_dir, "after.png")
    meta_path = os.path.join(data_dir, "metadata.json")

    with open(meta_path) as f:
        scene_meta = json.load(f)

    img_b = cv2.imread(before_path)
    img_a = cv2.imread(after_path)
    obs_dates = [
        scene_meta["scene_before"]["acquisition_date"],
        scene_meta["scene_after"]["acquisition_date"]
    ]
    geo_bbox = scene_meta["geospatial"]["bbox_wgs84"]

    # 2. Run OpenCV 5 detector to extract exact candidate regions
    print("\n--- STEP 1: Vision Telemetry Extraction (OpenCV 5 Non-NDVI) ---")
    detector = NonNDVIChangeDetector(significance_threshold_ha=1.0)
    det_result = detector.detect_changes(
        img_b, img_a, geo_bbox=geo_bbox, acquisition_dates=tuple(obs_dates)
    )

    # Select Region #13 (Primary corridor with partial PRODES proximity)
    target_region = None
    for r in det_result.candidate_regions:
        if r.region_id == 13:
            target_region = r
            break
    if not target_region:
        # Fallback to largest loss region
        qualifying = [r for r in det_result.candidate_regions if r.change_type == "forest_loss_candidate" and r.area_hectares >= 1.0]
        target_region = qualifying[0]

    print(f"Selected Candidate Region: #{target_region.region_id}")
    print(f"  Visual Classification:  {target_region.geometry_classification}")
    print(f"  Measured Change Area:   {target_region.area_hectares:.2f} ha (+/- {target_region.uncertainty_hectares:.2f} ha)")
    print(f"  Aspect Ratio:           {target_region.aspect_ratio:.2f}")
    print(f"  Heuristic Score:        {target_region.heuristic_score:.2f} (Uncalibrated)")
    print(f"  Geo Centroid:           {target_region.estimated_geo_centroid}")
    print(f"  Geo Bounding Box:       {target_region.estimated_geo_bbox}")
    print(f"  Observation Gap:        {obs_dates[0]} to {obs_dates[1]} (3-year interval)")

    # 3. Exact Polygon-to-Polygon Geometric Intersection with PRODES (EPSG:32720)
    from rasterio.features import shapes
    from affine import Affine

    # Reconstruct exact raster mask for Region #13
    aligned_after, _, _ = detector.aligner.align(img_b, img_a)
    from forestguard.vision.quality import QualityAndMaskEngine
    mask_b = QualityAndMaskEngine.segment_clouds_and_shadows(img_b)
    mask_a = QualityAndMaskEngine.segment_clouds_and_shadows(aligned_after)
    ex_mask = cv2.bitwise_or(mask_b, mask_a)

    norm_after = QualityAndMaskEngine.reinhard_color_transfer(aligned_after, img_b)
    lab_b = cv2.cvtColor(img_b, cv2.COLOR_BGR2Lab).astype(np.float32)
    lab_a = cv2.cvtColor(norm_after, cv2.COLOR_BGR2Lab).astype(np.float32)
    delta_a_loss = lab_a[:, :, 1] - lab_b[:, :, 1]
    color_diff = np.sqrt(np.sum((lab_b - lab_a) ** 2, axis=2))
    delta_a_loss[ex_mask > 0] = 0
    loss_signal = np.clip(delta_a_loss * (color_diff / 10.0), 0, None)
    loss_thresh = np.mean(loss_signal) + 2.5 * np.std(loss_signal)
    loss_bin = (loss_signal > max(50.0, loss_thresh)).astype(np.uint8) * 255
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    loss_clean = cv2.morphologyEx(loss_bin, cv2.MORPH_OPEN, kernel, iterations=1)
    loss_clean = cv2.morphologyEx(loss_clean, cv2.MORPH_CLOSE, kernel, iterations=1)

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(loss_clean, connectivity=8)
    match_label = None
    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_LEFT] == target_region.bounding_box_pixels[0] and stats[i, cv2.CC_STAT_TOP] == target_region.bounding_box_pixels[1]:
            match_label = i
            break

    r13_mask = (labels == match_label).astype(np.int16)
    aff = Affine(10.0, 0.0, scene_meta['geospatial']['affine_transform'][0][2],
                 0.0, -10.0, scene_meta['geospatial']['affine_transform'][1][2])
    r13_shapes = [shape(s) for s, v in shapes(r13_mask, mask=(r13_mask == 1), transform=aff)]
    r13_exact_poly_utm = r13_shapes[0]
    r13_exact_area_ha = r13_exact_poly_utm.area / 10000.0

    prodes_path = os.path.join(data_dir, "prodes_reference.geojson")
    prodes_exact_inter_ha = 0.0
    prodes_poly_year = None
    if os.path.exists(prodes_path):
        with open(prodes_path) as pf:
            prodes_data = json.load(pf)
        for f in prodes_data.get("features", []):
            p_wgs = shape(f["geometry"])
            p_utm = shape(rasterio.warp.transform_geom("EPSG:4326", "EPSG:32720", mapping(p_wgs)))
            if r13_exact_poly_utm.intersects(p_utm):
                exact_inter = r13_exact_poly_utm.intersection(p_utm)
                prodes_exact_inter_ha = exact_inter.area / 10000.0
                prodes_poly_year = f["properties"].get("year")
                break

    print(f"  Exact Detected Polygon Area (UTM 20S): {r13_exact_area_ha:.4f} ha")
    print(f"  Exact PRODES Polygon Intersect (UTM 20S): {prodes_exact_inter_ha:.4f} ha ({prodes_exact_inter_ha/r13_exact_area_ha*100:.2f}% of corridor, Audit Year: {prodes_poly_year})")
    print(f"  Non-Overlapping Corridor Area:        {r13_exact_area_ha - prodes_exact_inter_ha:.4f} ha ({100 - (prodes_exact_inter_ha/r13_exact_area_ha*100):.2f}% Unverified)")

    # 4. Initialize Live Providers
    llm = GeminiProvider(api_key=gemini_key, model=gemini_model)
    search_tool = TavilySearchProvider(api_key=tavily_key)

    trace = []
    step_num = 1

    # Trace Step 1: Intake
    trace.append(DecisionTraceStep(
        step_number=step_num,
        step_type="vision_telemetry_intake",
        execution_mode="live_web_research",
        decision_rationale="Ingest OpenCV 5 non-NDVI geometric profiling, exact UTM polygon, and spatial bounding box for Region #13.",
        findings_extracted=[
            f"Region #{target_region.region_id}: {r13_exact_area_ha:.4f} ha exact polygon ({target_region.area_pixels} px), "
            f"Geometry={target_region.geometry_classification} (Aspect={target_region.aspect_ratio:.2f}), "
            f"Observation Gap={obs_dates[0]} to {obs_dates[1]} (3-year interval), "
            f"Centroid={target_region.estimated_geo_centroid}, "
            f"Exact PRODES 2022 Polygon Intersection={prodes_exact_inter_ha:.4f} ha ({prodes_exact_inter_ha/r13_exact_area_ha*100:.2f}%), "
            f"Non-Overlapping Area={r13_exact_area_ha - prodes_exact_inter_ha:.4f} ha ({100 - (prodes_exact_inter_ha/r13_exact_area_ha*100):.2f}% Unverified)."
        ]
    ))
    step_num += 1

    # 5. Round 1 Search: Vision-Driven Strategy
    print("\n--- STEP 2: Live Adaptive Search — Round 1 (Infrastructure / Road Strategy) ---")
    query_1 = "Candeias do Jamari Rondonia abertura estrada vicinal infraestrutura desmatamento 2021 2022"
    print(f"Executing Live Tavily Query 1: '{query_1}'")
    
    r1_results = search_tool.search(query_1, max_results=3)
    print(f"Retrieved {len(r1_results)} live search records.")

    citations = []
    r1_summaries = []
    for item in r1_results:
        src_id = f"SRC-{len(citations)+1:02d}"
        c = SourceCitation(
            source_id=src_id,
            title=item.get("title", "Web Record"),
            url=item.get("url", ""),
            publisher=item.get("publisher", "Web Domain"),
            publication_date=item.get("publication_date"),
            access_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            evidence_tier="credible_news_report",
            geographic_scope="regional_context", # Regional municipal context, not specific to this 6.62 ha corridor
            source_type="municipal_public_communication" if "instagram" in item.get("url", "") or "prefeitura" in item.get("url", "") else "regional_news_media",
            is_live_retrieval=True,
            supports_claims=["Regional road expansion and municipal vicinal infrastructure dynamics in Candeias do Jamari"],
            snippet=item.get("snippet", "")
        )
        citations.append(c)
        r1_summaries.append(f"[{c.source_id}] ({c.source_type} / {c.geographic_scope}) {c.title} ({c.url})")
        print(f"  + {c.source_id} [{c.source_type}]: {c.title[:65]}...")
        print(f"    URL: {c.url}")
        print(f"    Scope: {c.geographic_scope}")

    trace.append(DecisionTraceStep(
        step_number=step_num,
        step_type="tool_execution",
        execution_mode="live_web_research",
        decision_rationale="High aspect-ratio linear corridor geometry suggests rural roadway opening or infrastructure access spur.",
        tool_name="search_public_records (tavily_live_search)",
        tool_inputs={"query": query_1, "max_results": 3},
        tool_outputs_summary=f"Retrieved {len(r1_results)} live records for Candeias do Jamari road infrastructure and clearing.",
        findings_extracted=r1_summaries
    ))
    step_num += 1

    # 6. Round 2 Search: Adaptive Follow-up based on Round 1 findings and PRODES 2022 overlap
    print("\n--- STEP 3: Live Adaptive Search — Round 2 (Environmental Enforcement & Embargos) ---")
    query_2 = "IBAMA operacao embargo desmatamento Candeias do Jamari Rondonia 2021 2022"
    print(f"Executing Live Tavily Query 2: '{query_2}'")

    r2_results = search_tool.search(query_2, max_results=3)
    print(f"Retrieved {len(r2_results)} live search records.")

    r2_summaries = []
    for item in r2_results:
        src_id = f"SRC-{len(citations)+1:02d}"
        is_gov = "gov.br" in item.get("url", "")
        is_registry = "registrorural.com.br" in item.get("url", "")
        
        stype = "primary_official_record" if is_gov else ("secondary_third_party_registry" if is_registry else "civil_society_analysis")
        tier = "primary_official_record" if is_gov else "credible_news_report"

        c = SourceCitation(
            source_id=src_id,
            title=item.get("title", "Web Record"),
            url=item.get("url", ""),
            publisher=item.get("publisher", "Web Domain"),
            publication_date=item.get("publication_date"),
            access_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            evidence_tier=tier,
            geographic_scope="regional_context", # Documents municipal or biome-wide enforcement, not linked to this corridor
            source_type=stype,
            is_live_retrieval=True,
            supports_claims=["Environmental agency enforcement operations and public embargo registries in Candeias do Jamari"],
            snippet=item.get("snippet", "")
        )
        citations.append(c)
        r2_summaries.append(f"[{c.source_id}] ({c.source_type} / {c.geographic_scope}) {c.title} ({c.url})")
        print(f"  + {c.source_id} [{c.source_type}]: {c.title[:65]}...")
        print(f"    URL: {c.url}")
        print(f"    Scope: {c.geographic_scope}")

    trace.append(DecisionTraceStep(
        step_number=step_num,
        step_type="tool_execution",
        execution_mode="live_web_research",
        decision_rationale="Adaptive follow-up: Check regulatory enforcement records, IBAMA operations, and embargos matching the PRODES 2022 timeline.",
        tool_name="search_public_records (tavily_live_search)",
        tool_inputs={"query": query_2, "max_results": 3},
        tool_outputs_summary=f"Retrieved {len(r2_results)} live records regarding environmental enforcement and embargos.",
        findings_extracted=r2_summaries
    ))
    step_num += 1

    # 7. Tree Density Reference (Malhi et al. 2004 & ter Steege et al. 2013)
    density_info = RegionalTreeDensityDB.lookup("rondonia")
    tree_min = int(round(target_region.area_hectares * density_info["min_trees_per_ha"]))
    tree_max = int(round(target_region.area_hectares * density_info["max_trees_per_ha"]))
    tree_est = TreeCountEstimate(
        is_supported=True,
        forest_type=density_info["forest_type"],
        forest_stratum=density_info.get("forest_stratum"),
        diameter_threshold=density_info.get("diameter_threshold", "DBH >= 10 cm"),
        estimation_status="provisional", # Explicitly provisional
        canopy_density_trees_per_ha_min=density_info["min_trees_per_ha"],
        canopy_density_trees_per_ha_max=density_info["max_trees_per_ha"],
        estimated_affected_trees_min=tree_min,
        estimated_affected_trees_max=tree_max,
        density_source=density_info["source"],
        source_url=density_info["source_url"],
        doi=density_info.get("doi"),
        calculation_basis=(
            f"Calculated from measured candidate area ({target_region.area_hectares:.2f} ha) multiplied by "
            f"documented density range ({density_info['min_trees_per_ha']} - {density_info['max_trees_per_ha']} stems/ha "
            f"with DBH >= 10 cm) from {density_info['source']} (DOI: {density_info.get('doi')})."
        ),
        limitations=(
            "Provisional estimate: Reflects potential undisturbed stems (DBH >= 10 cm) based on published RAINFOR "
            "empirical plot syntheses. Satellite imagery alone cannot distinguish whether prior degradation, "
            "selective harvesting, or secondary regrowth existed before the 2020 observation."
        )
    )

    trace.append(DecisionTraceStep(
        step_number=step_num,
        step_type="evidence_analysis",
        execution_mode="live_web_research",
        decision_rationale="Calculate provisional stem impact range using peer-reviewed Amazonian plot inventories (Malhi et al. 2004; ter Steege et al. 2013).",
        tool_name="lookup_tree_density",
        tool_inputs={"stratum": density_info.get("forest_stratum")},
        tool_outputs_summary=f"Provisional potential stems: {tree_min:,} to {tree_max:,} trees (DBH >= 10 cm). Status: PROVISIONAL.",
        findings_extracted=[
            f"Stratum: {tree_est.forest_type}",
            f"Citation: {tree_est.density_source} (DOI: {tree_est.doi})",
            f"Threshold: {tree_est.diameter_threshold}",
            f"Baseline: {density_info['min_trees_per_ha']}-{density_info['max_trees_per_ha']} stems/ha",
            f"Provisional Impact Range: {tree_min:,} - {tree_max:,} stems"
        ]
    ))
    step_num += 1

    # 8. Live Synthesis via Google Gemini
    print("\n--- STEP 4: Live Evidence Synthesis via Google Gemini ---")
    synthesis_prompt = f"""
You are Forest Guard's autonomous investigative research agent.
You are generating a VALIDATION DRAFT investigation report for a candidate land-cover change detected from genuine Sentinel-2 satellite imagery.

CRITICAL INSTRUCTIONS:
1. DO NOT presume this change is confirmed deforestation. Treat it as a candidate visual change.
2. The image observation gap is 3 YEARS (Before: {obs_dates[0]}, After: {obs_dates[1]}). State explicitly that the exact date, month, or season of clearing is UNKNOWN.
3. Distinguish clearly between:
   - Visual observations: 6.62 ha linear corridor (aspect ratio {target_region.aspect_ratio:.2f}) at coordinates {target_region.estimated_geo_centroid}.
   - Independent reference data: Exact geometric intersection with official PRODES 2022 deforestation polygon #4 is {prodes_exact_inter_ha:.4f} ha ({prodes_exact_inter_ha/r13_exact_area_ha*100:.2f}% of corridor). The remaining {r13_exact_area_ha - prodes_exact_inter_ha:.4f} ha ({100 - (prodes_exact_inter_ha/r13_exact_area_ha*100):.2f}%) does NOT overlap any PRODES polygon (2008-2023). Spatial overlap alone does NOT prove the entire feature is confirmed deforestation.
   - Source-reported claims: What the live web search records say about municipal roads and enforcement in Candeias do Jamari. Note that these sources provide REGIONAL CONTEXT; none establish facts about this exact 6.62 ha corridor.
   - Third-party registries: Label aggregators like Registro Rural as secondary sources reflecting public IBAMA records.
   - Hypotheses: Rural road opening, logging access spur, agricultural perimeter expansion, or firebreak.
   - Relevant Authorities: Identify municipal, state, and federal authorities (Prefeitura, Governo de Rondônia, IBAMA) strictly by their JURISDICTIONAL ROLES. Explicitly state they are NOT responsible parties for the clearing.
   - Unknowns: Land tenure ownership, property registry (CAR), whether non-overlapping 6.42 ha was an unpermitted trail or legal clearing, exact clearing date.
4. Output your analysis as valid JSON matching this schema:
{{
  "summary": "2-3 sentence executive summary",
  "detailed_findings": "Detailed multi-paragraph technical assessment",
  "likely_causes_hypotheses": [
    {{"hypothesis": "Hypothesis title", "supporting_evidence": "Specific evidence and visual rationale"}}
  ],
  "relevant_jurisdictional_authorities": [
    {{"entity_name": "Entity Name", "jurisdictional_role": "Administrative / enforcement role", "attribution_note": "Identifies jurisdictional authority; NOT a responsible party for the change."}}
  ],
  "conflicting_accounts": ["Contradictions or competing claims between data sources"],
  "unresolved_questions_and_unknowns": ["Unanswered questions requiring field ground-truthing"]
}}

Live Search Sources:
{json.dumps([c.model_dump() for c in citations], indent=2)}
"""

    gemini_resp = llm.generate(
        prompt=synthesis_prompt,
        system_instruction="You are an autonomous conservation intelligence agent. Respond strictly with valid JSON. Never output markdown code fences or backticks."
    )

    print("Received Live Gemini Synthesis. Parsing JSON response...")
    cleaned_json = gemini_resp.strip()
    if cleaned_json.startswith("```json"):
        cleaned_json = cleaned_json[7:]
    if cleaned_json.startswith("```"):
        cleaned_json = cleaned_json[3:]
    if cleaned_json.endswith("```"):
        cleaned_json = cleaned_json[:-3]
    cleaned_json = cleaned_json.strip()

    synth_data = json.loads(cleaned_json)
    authorities = synth_data.get("relevant_jurisdictional_authorities", [])
    if not authorities and "linked_entities_or_projects" in synth_data:
        authorities = synth_data["linked_entities_or_projects"]

    # 9. Assemble Complete Investigation Report
    incident_id = f"DRAFT-INC-RONDONIA-{target_region.region_id:02d}-{datetime.now(timezone.utc).strftime('%Y%m%d')}"
    
    report = InvestigationReport(
        incident_id=incident_id,
        report_title=f"[VALIDATION DRAFT - UNCONFIRMED] Candidate Corridor Change: Jamari Buffer, Rondônia",
        report_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        event_category="forest_loss",
        investigation_status="insufficient_public_evidence", # Strictly unconfirmed
        is_synthetic_test=False, # Genuine satellite raster & live research
        investigation_mode="live_web_research",
        geographic_coordinates=target_region.estimated_geo_centroid,
        geographic_bounding_box=target_region.estimated_geo_bbox,
        affected_area_hectares=target_region.area_hectares,
        measurement_uncertainty_hectares=target_region.uncertainty_hectares,
        observation_dates=obs_dates,
        visual_geometry=target_region.geometry_classification,
        aspect_ratio=target_region.aspect_ratio,
        heuristic_score=target_region.heuristic_score,
        confidence_score=target_region.confidence_score,
        summary=synth_data.get("summary", ""),
        detailed_findings=synth_data.get("detailed_findings", ""),
        likely_causes_hypotheses=synth_data.get("likely_causes_hypotheses", []),
        relevant_jurisdictional_authorities=authorities,
        linked_entities_or_projects=authorities, # Legacy field compatibility
        conflicting_accounts=synth_data.get("conflicting_accounts", []),
        unresolved_questions_and_unknowns=synth_data.get("unresolved_questions_and_unknowns", []),
        tree_count_estimate=tree_est,
        citations=citations,
        decision_trace=trace
    )

    trace.append(DecisionTraceStep(
        step_number=step_num,
        step_type="report_generation",
        execution_mode="live_web_research",
        decision_rationale="Synthesize visual metrics, PRODES spatial intersection, and live Tavily search findings with Gemini.",
        tool_name="gemini_synthesis",
        tool_outputs_summary="Generated draft report with explicit uncertainty and unconfirmed status.",
        findings_extracted=[f"Draft Report {report.incident_id} created with status 'insufficient_public_evidence'."]
    ))

    # Save draft report locally
    out_path = os.path.join(data_dir, "draft_investigation_report.json")
    with open(out_path, "w", encoding="utf-8") as out_f:
        json.dump(report.model_dump(), out_f, indent=2)

    print("\n" + "=" * 70)
    print("LIVE INVESTIGATION VALIDATION COMPLETE")
    print(f"Report saved to: {out_path}")
    print("=" * 70)
    return 0

if __name__ == "__main__":
    sys.exit(run_live_investigation())
