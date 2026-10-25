# Forest Guard 🌲🛡️

> **Autonomous Satellite Monitoring, Classical OpenCV 5 Vision & Agentic Investigation Platform**  
> *Developed for STEM2Connect AI Hackathon 2026 & OpenCV AI Competition 2026 (Agentic Vision Special Award)*  
> **100% Free, Zero-Cloud-Cost Architecture on GitHub Pages & GitHub Actions**

[![Manual Pilot Workflow](https://img.shields.io/badge/GitHub%20Actions-Manual%20Pilot%20Only-yellow)](https://github.com/kaustubhshinde077/forest-guard/actions/workflows/monitor.yml)
[![Live Dashboard](https://img.shields.io/badge/Live%20Dashboard-GitHub%20Pages-emerald)](https://kaustubhshinde077.github.io/forest-guard/)
[![OpenCV 5](https://img.shields.io/badge/OpenCV-5.0.0.93%20Headless-blue)](https://opencv.org/)
[![Model](https://img.shields.io/badge/AI%20Agent-Google%20Gemini%20%2B%20Tavily-purple)](https://aistudio.google.com/)
[![Test Suite](https://img.shields.io/badge/Test%20Suite-39%20Passing-brightgreen)](https://github.com/kaustubhshinde077/forest-guard)


---

## 🛰️ Project Overview

**Forest Guard** is an end-to-end autonomous environmental intelligence platform designed to monitor protected biosphere corridors (including Maharashtra's Western Ghats and global tropical benchmarks).

Unlike standard monitoring tools that rely on spectral vegetation indices (NDVI/EVI), Forest Guard operates on **pure classical computer vision in OpenCV 5** combined with a **closed-loop autonomous investigative research agent (Google Gemini + Tavily)** to research statutory forest clearances, gazettes, and environmental litigation for detected candidate changes.

---

## 🏗️ 100% Free GitHub-Native Architecture

Forest Guard runs completely free without requiring an AWS account, cloud billing, or paid servers:

```
[Copernicus Sentinel-2 / AWS Open Data COGs]
                     │  (Open HTTPS byte-range reads)
                     ▼
[GitHub Actions: Manual Pilot Workflow Runner (Dispatch)]
  ├── Evaluates 21-day due-time guard & batch schedule (1-21)
  ├── Executes OpenCV 5 non-NDVI detection & geometric profiling
  ├── Dispatches closed-loop Gemini & Tavily investigative agent (>= 1.0 ha)
  └── Writes reports, compressed PNG crops, and incidents.json via GitReportStore
                     │
                     ▼
[Git Version-Controlled Storage (data/public/ & web/public/data/)]
                     │  (Automated commit & push)
                     ▼
[Next.js + TypeScript Static Export]
                     │
                     ▼
[GitHub Pages Global CDN Hosting] ────► Public Technical Dashboard
```

---

## 🔬 Core Innovations

### 1. Pure OpenCV 5 Classical Vision (Strictly Non-NDVI)
- **Zero Spectral Indices:** Completely prohibits NDVI, ExG, and vegetation indices.
- **CIE Lab Chromatic & Euclidean Differencing:** Isolates chlorophyll absorption loss via $a^*$ chromatic shift and $\Delta E$ Euclidean distance in perceptual color space.
- **Laplacian Texture Filtering:** Multi-scale kernel variance rejects seasonal pasture browning and agricultural phenology.
- **Coregistration & Alignment:** Sub-pixel ORB feature matching and Homography transform with Mean Hamming Descriptor Distance verification.
- **Discrete Pixel Measurement:** Raster pixel-count area calculation via `cv2.connectedComponentsWithStats` ($10\text{ m/px}$ Sentinel-2 ground sampling).

### 2. Closed-Loop Agentic Investigation (Gemini + Tavily)
- **Geometry-Driven Leads:** Visual morphology steers investigation strategy:
  - *Linear Corridors* $\to$ Public Works road construction, corridor diversions, and statutory clearance searches.
  - *Compact Blocks* $\to$ Mechanized clearcutting, PRODES deforestation reference layers, agricultural expansion.
- **Evidence Integrity:** Sources classified by geographic scope (`regional_context` vs `incident_facts`) and source tier. Regulatory entities are labeled as jurisdictional authorities with statutory non-perpetrator disclaimers.
- **Provisional Tree Density Baseline:** Peer-reviewed RAINFOR Amazonian plot syntheses (Malhi et al. 2004; ter Steege et al. 2013) with $\text{DBH} \ge 10\text{ cm}$ threshold.

---

## 🚀 Quickstart & Local Development

### Prerequisites
- Python 3.12+
- Node.js 18+ (Node 20 recommended)
- Git

### Running Locally (Zero Cloud Setup)
```bash
# Clone the repository
git clone https://github.com/kaustubhshinde077/forest-guard.git
cd forest-guard

# Start local full-stack development environment (FastAPI + Next.js)
./start-local.sh
```
- **Frontend Dashboard:** `http://localhost:3000`
- **Backend REST API:** `http://localhost:8000/docs`

### Running the Automated Test Suite
```bash
# Run all 39 unit, regression, and spatial validation tests
PYTHONPATH=src .venv/bin/pytest tests/
```

### Running the Workflow Runner (Manual Pilot Mode)
> [!NOTE]
> Automated recurring cron schedules are intentionally disabled in `.github/workflows/monitor.yml`.
> The workflow runs strictly via manual `workflow_dispatch` trigger or manual CLI execution.

```bash
# Run a specific interleaved daily batch (1 to 21) with a bounded tile limit (e.g. 5 tiles)
PYTHONPATH=src .venv/bin/python3 -m forestguard.workflow_runner --batch-day 1 --max-tiles 5

# Force run for testing / evaluation
PYTHONPATH=src .venv/bin/python3 -m forestguard.workflow_runner --batch-day 1 --max-tiles 5 --force
```

---

## 🔬 Evidence Provenance & Verification Taxonomy

Forest Guard maintains strict separation between test simulations, genuine satellite benchmarks, and live candidates:

1. **Synthetic Unit Tests:** Offline programmatic NumPy arrays (`tests/test_safeguards_and_validation.py::test_synthetic_canopy_clearing_unit_test`) used strictly to verify algorithm mechanics (Reinhard color transfer, delta a* extraction, and morphological contours). Labeled as synthetic unit tests and never cited as real-world true positives.
2. **Empirical Satellite Benchmarks:** Genuine Sentinel-2 Level-2A observations evaluated across 4 geographically diverse biomes (`data/benchmarks/maharashtra_4sector_benchmark.json`: Koyna, Tillari, Tadoba, Melghat) via open COG HTTP range requests, validating that unchanged teak and ravine canopies yield 0.00 ha false loss.
3. **Live Satellite Change Candidates:** Field detections that meet the $\ge 1.0\text{ ha}$ threshold are labeled prominently as `[UNCONFIRMED SATELLITE-CHANGE CANDIDATE]`. They undergo automated research through Gemini and Tavily and are never characterized as confirmed deforestation without official gazettes or regulatory filings.

---

## 🔒 Security & Evidence Integrity Guarantees

1. **Zero Secret Leakage:** `.env` is strictly excluded via `.gitignore`. API credentials (`GEMINI_API_KEY`, `TAVILY_API_KEY`) are stored exclusively in GitHub Actions Repository Secrets and never committed or exposed.
2. **Synthetic Data Separation:** Procedural test fixtures are explicitly labeled with `[SYNTHETIC TEST]` and `is_synthetic_test: true`. Production monitoring refuses synthetic fallback.
3. **Draft Report Isolation:** Unverified candidate changes remain marked `insufficient_public_evidence` and are never published as confirmed deforestation.

---

## 👥 Authors & License

Developed by **Kaustubh Shinde** for the **STEM2Connect AI Hackathon 2026** and **OpenCV AI Competition 2026**.  
Licensed under the Apache-2.0 License.
